import express from 'express';
import jobController from '../controllers/jobController';

const router = express.Router();

// Get all jobs
router.get('/', jobController.getAllJobs.bind(jobController));

// Get job by ID
router.get('/:id', jobController.getJobById.bind(jobController));

// Create new job
router.post('/', jobController.createJob.bind(jobController));

// Update job
router.put('/:id', jobController.updateJob.bind(jobController));

// Delete job
router.delete('/:id', jobController.deleteJob.bind(jobController));

// Pause job
router.patch('/:id/pause', jobController.pauseJob.bind(jobController));

// Resume job
router.patch('/:id/resume', jobController.resumeJob.bind(jobController));

// Get job logs
router.get('/:id/logs', jobController.getJobLogs.bind(jobController));

// Manual cleanup of old logs (admin endpoint)
router.post('/logs/cleanup', jobController.cleanupLogs.bind(jobController));

export default router;
