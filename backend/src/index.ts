import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jobRoutes from './routes/jobRoutes';
import schedulerService from './services/schedulerService';
import pool from './database/connection';

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/jobs', jobRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    scheduledJobs: schedulerService.getScheduledJobCount()
  });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database connection and scheduler
async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    await pool.query('SELECT 1');
    console.log('Database connection successful');

    // Initialize scheduler
    await schedulerService.initialize();

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API: http://localhost:${PORT}/api/jobs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

startServer();
