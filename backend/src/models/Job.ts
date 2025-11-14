export interface Job {
  id: number;
  name: string;
  command: string;
  schedule: string;
  status: 'active' | 'paused';
  created_at: Date;
  updated_at: Date;
  last_run: Date | null;
  next_run: Date | null;
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
  executed_at: Date;
  status: 'success' | 'failed';
  output: string | null;
  error_message: string | null;
  execution_time: number;
}
