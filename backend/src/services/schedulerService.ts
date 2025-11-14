import cron from 'node-cron';
import parser from 'cron-parser';
import jobService from './jobService';
import { Job } from '../models/Job';
import ExecutorFactory from './executors/executorFactory';

class SchedulerService {
  private scheduledJobs: Map<number, cron.ScheduledTask> = new Map();

  async initialize(): Promise<void> {
    console.log('Initializing scheduler service...');
    await this.loadActiveJobs();
    console.log(`Loaded ${this.scheduledJobs.size} active jobs`);
  }

  async loadActiveJobs(): Promise<void> {
    try {
      const jobs = await jobService.getActiveJobs();
      jobs.forEach(job => {
        this.scheduleJob(job);
      });
    } catch (error) {
      console.error('Error loading active jobs:', error);
    }
  }

  scheduleJob(job: Job): void {
    // Remove existing schedule if any
    this.unscheduleJob(job.id);

    // Only schedule if job is active
    if (job.status !== 'active') {
      return;
    }

    try {
      // Validate cron expression
      if (!cron.validate(job.schedule)) {
        console.error(`Invalid cron expression for job ${job.id}: ${job.schedule}`);
        return;
      }

      // Schedule the job
      const task = cron.schedule(job.schedule, async () => {
        await this.executeJob(job);
      });

      this.scheduledJobs.set(job.id, task);
      console.log(`Scheduled job ${job.id} (${job.name}) with schedule: ${job.schedule}`);
    } catch (error) {
      console.error(`Error scheduling job ${job.id}:`, error);
    }
  }

  async executeJob(job: Job): Promise<void> {
    const executionMode = process.env.EXECUTION_MODE || 'local';
    console.log(`Executing job ${job.id} (${job.name}) [mode: ${executionMode}]: ${job.command}`);
    const startTime = Date.now();
    const executedAt = new Date();

    try {
      // Execute the command using the configured executor
      const executor = ExecutorFactory.createExecutor();
      const { stdout, stderr, exitCode } = await executor.executeCommand(job.command, 300000);

      const executionTime = Date.now() - startTime;
      const output = stdout || stderr || 'Command executed successfully';

      // Check if command failed
      if (exitCode !== 0) {
        throw new Error(`Command exited with code ${exitCode}: ${stderr || stdout}`);
      }

      // Calculate next run time
      const interval = parser.parseExpression(job.schedule);
      const nextRun = interval.next().toDate();

      // Update job run times
      await jobService.updateJobRunTime(job.id, executedAt, nextRun);

      // Log execution
      await jobService.createJobLog(
        job.id,
        'success',
        output,
        null,
        executionTime
      );

      console.log(`Job ${job.id} completed successfully in ${executionTime}ms`);
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';

      // Calculate next run time even if execution failed
      try {
        const interval = parser.parseExpression(job.schedule);
        const nextRun = interval.next().toDate();
        await jobService.updateJobRunTime(job.id, executedAt, nextRun);
      } catch (parseError) {
        console.error(`Error parsing cron expression for job ${job.id}:`, parseError);
      }

      // Log execution failure
      await jobService.createJobLog(
        job.id,
        'failed',
        null,
        errorMessage,
        executionTime
      );

      console.error(`Job ${job.id} failed:`, errorMessage);
    }
  }

  unscheduleJob(jobId: number): void {
    const task = this.scheduledJobs.get(jobId);
    if (task) {
      task.stop();
      this.scheduledJobs.delete(jobId);
      console.log(`Unscheduled job ${jobId}`);
    }
  }

  async refreshJob(jobId: number): Promise<void> {
    const job = await jobService.getJobById(jobId);
    if (job) {
      this.scheduleJob(job);
    } else {
      this.unscheduleJob(jobId);
    }
  }

  async refreshAllJobs(): Promise<void> {
    // Clear all existing schedules
    this.scheduledJobs.forEach(task => task.stop());
    this.scheduledJobs.clear();

    // Reload all active jobs
    await this.loadActiveJobs();
  }

  getScheduledJobCount(): number {
    return this.scheduledJobs.size;
  }
}

export default new SchedulerService();
