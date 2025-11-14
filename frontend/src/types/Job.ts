export interface Job {
  id: number;
  name: string;
  command: string;
  schedule: string;
  status: 'active' | 'paused';
  created_at: string;
  updated_at: string;
  last_run: string | null;
  next_run: string | null;
}

export interface CreateJobInput {
  name: string;
  command: string;
  schedule: string;
  status?: 'active' | 'paused';
}

export interface UpdateJobInput {
  name?: string;
  command?: string;
  schedule?: string;
  status?: 'active' | 'paused';
}

export interface JobLog {
  id: number;
  job_id: number;
  executed_at: string;
  status: 'success' | 'failed';
  output: string | null;
  error_message: string | null;
  execution_time: number;
}
