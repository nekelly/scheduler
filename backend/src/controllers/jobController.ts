import { Request, Response } from 'express';
import jobService from '../services/jobService';
import schedulerService from '../services/schedulerService';

export class JobController {
  async getAllJobs(_req: Request, res: Response): Promise<void> {
    try {
      const jobs = await jobService.getAllJobs();
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getJobById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const job = await jobService.getJobById(id);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createJob(req: Request, res: Response): Promise<void> {
    try {
      const { name, command, schedule, status } = req.body;

      // Validation
      if (!name || !command || !schedule) {
        res.status(400).json({ error: 'Name, command, and schedule are required' });
        return;
      }

      const job = await jobService.createJob({
        name,
        command,
        schedule,
        status: status || 'active'
      });

      // Schedule the job if it's active
      if (job.status === 'active') {
        await schedulerService.refreshJob(job.id);
      }

      res.status(201).json(job);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateJob(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { name, command, schedule, status } = req.body;

      const job = await jobService.updateJob(id, {
        name,
        command,
        schedule,
        status
      });

      // Refresh the job schedule
      await schedulerService.refreshJob(id);

      res.json(job);
    } catch (error: any) {
      const statusCode = error.message === 'Job not found' ? 404 : 400;
      res.status(statusCode).json({ error: error.message });
    }
  }

  async deleteJob(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      // Unschedule the job first
      schedulerService.unscheduleJob(id);

      // Delete from database
      await jobService.deleteJob(id);

      res.status(204).send();
    } catch (error: any) {
      const statusCode = error.message === 'Job not found' ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }

  async pauseJob(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const job = await jobService.pauseJob(id);

      // Unschedule the job
      schedulerService.unscheduleJob(id);

      res.json(job);
    } catch (error: any) {
      const statusCode = error.message === 'Job not found' ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }

  async resumeJob(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const job = await jobService.resumeJob(id);

      // Schedule the job
      await schedulerService.refreshJob(id);

      res.json(job);
    } catch (error: any) {
      const statusCode = error.message === 'Job not found' ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }

  async getJobLogs(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;

      const logs = await jobService.getJobLogs(id, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async cleanupLogs(_req: Request, res: Response): Promise<void> {
    try {
      const deletedCount = await jobService.cleanupAllOldLogs();
      res.json({
        message: 'Log cleanup completed',
        deletedCount,
        retentionLimit: parseInt(process.env.LOG_RETENTION_COUNT || '100')
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new JobController();
