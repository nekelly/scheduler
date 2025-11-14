import pool from '../database/connection';
import { Job, CreateJobInput, UpdateJobInput, JobLog } from '../models/Job';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import parser from 'cron-parser';

export class JobService {
  async getAllJobs(): Promise<Job[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM jobs ORDER BY created_at DESC'
    );
    return rows as Job[];
  }

  async getJobById(id: number): Promise<Job | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM jobs WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as Job) : null;
  }

  async getActiveJobs(): Promise<Job[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM jobs WHERE status = 'active'"
    );
    return rows as Job[];
  }

  async createJob(input: CreateJobInput): Promise<Job> {
    // Validate cron expression
    try {
      const interval = parser.parseExpression(input.schedule);
      const nextRun = interval.next().toDate();

      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO jobs (name, command, schedule, status, next_run) VALUES (?, ?, ?, ?, ?)',
        [input.name, input.command, input.schedule, input.status || 'active', nextRun]
      );

      const job = await this.getJobById(result.insertId);
      if (!job) {
        throw new Error('Failed to create job');
      }
      return job;
    } catch (error) {
      throw new Error(`Invalid cron expression: ${input.schedule}`);
    }
  }

  async updateJob(id: number, input: UpdateJobInput): Promise<Job> {
    const job = await this.getJobById(id);
    if (!job) {
      throw new Error('Job not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }

    if (input.command !== undefined) {
      updates.push('command = ?');
      values.push(input.command);
    }

    if (input.schedule !== undefined) {
      // Validate cron expression
      try {
        const interval = parser.parseExpression(input.schedule);
        const nextRun = interval.next().toDate();
        updates.push('schedule = ?', 'next_run = ?');
        values.push(input.schedule, nextRun);
      } catch (error) {
        throw new Error(`Invalid cron expression: ${input.schedule}`);
      }
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }

    if (updates.length === 0) {
      return job;
    }

    values.push(id);
    await pool.query(
      `UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updatedJob = await this.getJobById(id);
    if (!updatedJob) {
      throw new Error('Failed to update job');
    }
    return updatedJob;
  }

  async deleteJob(id: number): Promise<void> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM jobs WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      throw new Error('Job not found');
    }
  }

  async pauseJob(id: number): Promise<Job> {
    return this.updateJob(id, { status: 'paused' });
  }

  async resumeJob(id: number): Promise<Job> {
    return this.updateJob(id, { status: 'active' });
  }

  async updateJobRunTime(id: number, lastRun: Date, nextRun: Date): Promise<void> {
    await pool.query(
      'UPDATE jobs SET last_run = ?, next_run = ? WHERE id = ?',
      [lastRun, nextRun, id]
    );
  }

  async createJobLog(
    jobId: number,
    status: 'success' | 'failed',
    output: string | null,
    errorMessage: string | null,
    executionTime: number
  ): Promise<void> {
    // Insert new log entry
    await pool.query(
      'INSERT INTO job_logs (job_id, status, output, error_message, execution_time) VALUES (?, ?, ?, ?, ?)',
      [jobId, status, output, errorMessage, executionTime]
    );

    // Clean up old logs to maintain retention limit
    await this.cleanupOldLogs(jobId);
  }

  async cleanupOldLogs(jobId: number): Promise<void> {
    const retentionLimit = parseInt(process.env.LOG_RETENTION_COUNT || '100');

    // Delete logs beyond the retention limit for this job
    await pool.query(
      `DELETE FROM job_logs
       WHERE job_id = ?
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM job_logs
           WHERE job_id = ?
           ORDER BY executed_at DESC
           LIMIT ?
         ) AS recent_logs
       )`,
      [jobId, jobId, retentionLimit]
    );
  }

  async cleanupAllOldLogs(): Promise<number> {
    const retentionLimit = parseInt(process.env.LOG_RETENTION_COUNT || '100');

    // Get all unique job IDs
    const [jobs] = await pool.query<RowDataPacket[]>('SELECT DISTINCT job_id FROM job_logs');

    let totalDeleted = 0;
    for (const job of jobs) {
      const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM job_logs
         WHERE job_id = ?
         AND id NOT IN (
           SELECT id FROM (
             SELECT id FROM job_logs
             WHERE job_id = ?
             ORDER BY executed_at DESC
             LIMIT ?
           ) AS recent_logs
         )`,
        [job.job_id, job.job_id, retentionLimit]
      );
      totalDeleted += result.affectedRows;
    }

    return totalDeleted;
  }

  async getJobLogs(jobId: number, limit: number = 50): Promise<JobLog[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM job_logs WHERE job_id = ? ORDER BY executed_at DESC LIMIT ?',
      [jobId, limit]
    );
    return rows as JobLog[];
  }
}

export default new JobService();
