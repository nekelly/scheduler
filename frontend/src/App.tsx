import React, { useState, useEffect } from 'react';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Job, CreateJobInput } from './types/Job';
import { jobsApi } from './services/api';
import JobList from './components/JobList';
import JobDialog from './components/JobDialog';
import JobLogsDialog from './components/JobLogsDialog';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  useEffect(() => {
    loadJobs();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const data = await jobsApi.getAllJobs();
      setJobs(data);
    } catch (error: any) {
      showSnackbar('Failed to load jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning'
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDialog = (job?: Job) => {
    setSelectedJob(job || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedJob(null);
  };

  const handleSaveJob = async (input: CreateJobInput) => {
    try {
      if (selectedJob) {
        await jobsApi.updateJob(selectedJob.id, input);
        showSnackbar('Job updated successfully', 'success');
      } else {
        await jobsApi.createJob(input);
        showSnackbar('Job created successfully', 'success');
      }
      await loadJobs();
      handleCloseDialog();
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteClick = (id: number) => {
    setJobToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (jobToDelete === null) return;

    try {
      await jobsApi.deleteJob(jobToDelete);
      showSnackbar('Job deleted successfully', 'success');
      await loadJobs();
    } catch (error: any) {
      showSnackbar('Failed to delete job', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setJobToDelete(null);
  };

  const handlePauseJob = async (id: number) => {
    try {
      await jobsApi.pauseJob(id);
      showSnackbar('Job paused', 'success');
      await loadJobs();
    } catch (error: any) {
      showSnackbar('Failed to pause job', 'error');
    }
  };

  const handleResumeJob = async (id: number) => {
    try {
      await jobsApi.resumeJob(id);
      showSnackbar('Job resumed', 'success');
      await loadJobs();
    } catch (error: any) {
      showSnackbar('Failed to resume job', 'error');
    }
  };

  const handleViewLogs = (job: Job) => {
    setSelectedJob(job);
    setLogsDialogOpen(true);
  };

  const handleCloseLogsDialog = () => {
    setLogsDialogOpen(false);
    setSelectedJob(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Job Scheduler
            </Typography>
            <IconButton color="inherit" onClick={loadJobs}>
              <RefreshIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Scheduled Jobs
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Create Job
            </Button>
          </Box>

          <JobList
            jobs={jobs}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteClick}
            onPause={handlePauseJob}
            onResume={handleResumeJob}
            onViewLogs={handleViewLogs}
          />

          <JobDialog
            open={dialogOpen}
            onClose={handleCloseDialog}
            onSave={handleSaveJob}
            job={selectedJob}
          />

          <JobLogsDialog
            open={logsDialogOpen}
            onClose={handleCloseLogsDialog}
            job={selectedJob}
          />

          <Dialog
            open={deleteDialogOpen}
            onClose={handleDeleteCancel}
          >
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete this job? This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDeleteCancel}>Cancel</Button>
              <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity={snackbar.severity}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
