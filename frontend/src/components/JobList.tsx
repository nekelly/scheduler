import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { Job } from '../types/Job';
import { formatDistanceToNow } from '../utils/dateUtils';
import cronstrue from 'cronstrue';

interface JobListProps {
  jobs: Job[];
  onEdit: (job: Job) => void;
  onDelete: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onViewLogs: (job: Job) => void;
}

const JobList: React.FC<JobListProps> = ({
  jobs,
  onEdit,
  onDelete,
  onPause,
  onResume,
  onViewLogs,
}) => {
  const getCronDescription = (schedule: string): string => {
    try {
      return cronstrue.toString(schedule);
    } catch {
      return schedule;
    }
  };

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (jobs.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
          bgcolor: 'grey.50',
          borderRadius: 1,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No jobs found. Create your first job to get started!
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>Name</strong></TableCell>
            <TableCell><strong>Command</strong></TableCell>
            <TableCell><strong>Schedule</strong></TableCell>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell><strong>Last Run</strong></TableCell>
            <TableCell><strong>Next Run</strong></TableCell>
            <TableCell align="right"><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {job.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    maxWidth: 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                    bgcolor: 'grey.100',
                    px: 1,
                    py: 0.5,
                    borderRadius: 0.5,
                  }}
                >
                  {job.command}
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title={job.schedule}>
                  <Typography variant="body2">
                    {getCronDescription(job.schedule)}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Chip
                  label={job.status}
                  color={job.status === 'active' ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(job.last_run)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(job.next_run)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(job)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {job.status === 'active' ? (
                    <Tooltip title="Pause">
                      <IconButton
                        size="small"
                        onClick={() => onPause(job.id)}
                        color="warning"
                      >
                        <PauseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Resume">
                      <IconButton
                        size="small"
                        onClick={() => onResume(job.id)}
                        color="success"
                      >
                        <PlayIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}

                  <Tooltip title="View Logs">
                    <IconButton
                      size="small"
                      onClick={() => onViewLogs(job)}
                      color="info"
                    >
                      <HistoryIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(job.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default JobList;
