import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Job, JobLog } from '../types/Job';
import { jobsApi } from '../services/api';

interface JobLogsDialogProps {
  open: boolean;
  onClose: () => void;
  job: Job | null;
}

const JobLogsDialog: React.FC<JobLogsDialogProps> = ({ open, onClose, job }) => {
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open && job) {
      loadLogs();
    }
  }, [open, job]);

  const loadLogs = async () => {
    if (!job) return;

    setLoading(true);
    setError('');

    try {
      const data = await jobsApi.getJobLogs(job.id, 50);
      setLogs(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Execution History: {job?.name}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : logs.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              No execution history found
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Executed At</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Execution Time</strong></TableCell>
                  <TableCell><strong>Output</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(log.executed_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.status}
                        color={log.status === 'success' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatExecutionTime(log.execution_time)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          bgcolor: log.status === 'failed' ? 'error.50' : 'grey.100',
                          p: 1,
                          borderRadius: 0.5,
                        }}
                      >
                        {log.status === 'success'
                          ? log.output || 'No output'
                          : log.error_message || 'Unknown error'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobLogsDialog;
