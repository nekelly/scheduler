-- Create the jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    command TEXT NOT NULL,
    schedule VARCHAR(100) NOT NULL,
    status ENUM('active', 'paused') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_run TIMESTAMP NULL,
    next_run TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_next_run (next_run)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create the job_logs table for execution history
CREATE TABLE IF NOT EXISTS job_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('success', 'failed') NOT NULL,
    output TEXT,
    error_message TEXT,
    execution_time INT DEFAULT 0,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    INDEX idx_job_id (job_id),
    INDEX idx_executed_at (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample jobs for demonstration
INSERT INTO jobs (name, command, schedule, status) VALUES
    ('Daily Backup', 'echo "Running daily backup..."', '0 2 * * *', 'active'),
    ('Hourly Cleanup', 'echo "Running cleanup task..."', '0 * * * *', 'active'),
    ('Weekly Report', 'echo "Generating weekly report..."', '0 9 * * 1', 'paused');
