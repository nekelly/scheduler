import axios from 'axios';
import { Job, CreateJobInput, UpdateJobInput, JobLog } from '../types/Job';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const jobsApi = {
  getAllJobs: async (): Promise<Job[]> => {
    const response = await api.get<Job[]>('/jobs');
    return response.data;
  },

  getJobById: async (id: number): Promise<Job> => {
    const response = await api.get<Job>(`/jobs/${id}`);
    return response.data;
  },

  createJob: async (input: CreateJobInput): Promise<Job> => {
    const response = await api.post<Job>('/jobs', input);
    return response.data;
  },

  updateJob: async (id: number, input: UpdateJobInput): Promise<Job> => {
    const response = await api.put<Job>(`/jobs/${id}`, input);
    return response.data;
  },

  deleteJob: async (id: number): Promise<void> => {
    await api.delete(`/jobs/${id}`);
  },

  pauseJob: async (id: number): Promise<Job> => {
    const response = await api.patch<Job>(`/jobs/${id}/pause`);
    return response.data;
  },

  resumeJob: async (id: number): Promise<Job> => {
    const response = await api.patch<Job>(`/jobs/${id}/resume`);
    return response.data;
  },

  getJobLogs: async (id: number, limit?: number): Promise<JobLog[]> => {
    const response = await api.get<JobLog[]>(`/jobs/${id}/logs`, {
      params: { limit },
    });
    return response.data;
  },
};

export default api;
