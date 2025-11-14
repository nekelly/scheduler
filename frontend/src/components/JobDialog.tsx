import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { Job, CreateJobInput } from '../types/Job';
import cronstrue from 'cronstrue';

interface JobDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (job: CreateJobInput) => Promise<void>;
  job?: Job | null;
}

const JobDialog: React.FC<JobDialogProps> = ({ open, onClose, onSave, job }) => {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [schedule, setSchedule] = useState('');
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [error, setError] = useState<string>('');
  const [cronDescription, setCronDescription] = useState<string>('');

  useEffect(() => {
    if (job) {
      setName(job.name);
      setCommand(job.command);
      setSchedule(job.schedule);
      setStatus(job.status);
    } else {
      setName('');
      setCommand('');
      setSchedule('');
      setStatus('active');
    }
    setError('');
    setCronDescription('');
  }, [job, open]);

  useEffect(() => {
    if (schedule) {
      try {
        const description = cronstrue.toString(schedule);
        setCronDescription(description);
        setError('');
      } catch (e) {
        setCronDescription('');
      }
    } else {
      setCronDescription('');
    }
  }, [schedule]);

  const handleSave = async () => {
    if (!name.trim() || !command.trim() || !schedule.trim()) {
      setError('All fields are required');
      return;
    }

    try {
      await onSave({
        name,
        command,
        schedule,
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save job');
    }
  };

  const commonSchedules = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at midnight', value: '0 0 * * *' },
    { label: 'Every day at 9am', value: '0 9 * * *' },
    { label: 'Every Monday at 9am', value: '0 9 * * 1' },
    { label: 'Every week (Sunday midnight)', value: '0 0 * * 0' },
    { label: 'Every month (1st at midnight)', value: '0 0 1 * *' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{job ? 'Edit Job' : 'Create New Job'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Job Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Daily Backup"
          />

          <TextField
            label="Command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            fullWidth
            required
            multiline
            rows={3}
            placeholder='e.g., echo "Hello World"'
            helperText="Shell command to execute"
          />

          <TextField
            label="Cron Schedule"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            fullWidth
            required
            placeholder="* * * * *"
            helperText={cronDescription || 'Format: minute hour day month weekday'}
          />

          <FormControl fullWidth>
            <InputLabel>Quick Select</InputLabel>
            <Select
              value=""
              onChange={(e) => setSchedule(e.target.value)}
              label="Quick Select"
            >
              <MenuItem value="">
                <em>Custom</em>
              </MenuItem>
              {commonSchedules.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label} ({item.value})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'paused')}
              label="Status"
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="paused">Paused</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Cron Format:</strong> minute (0-59) hour (0-23) day (1-31) month (1-12)
              weekday (0-6)
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Examples:</strong>
              <br />* * * * * = Every minute
              <br />0 * * * * = Every hour
              <br />0 0 * * * = Every day at midnight
              <br />*/5 * * * * = Every 5 minutes
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {job ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobDialog;
