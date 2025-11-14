# Job Scheduler Application

A cron-like job scheduler with a React frontend and MySQL backend.

## Features

- Schedule commands to run at regular intervals using cron expressions
- Add, update, pause, and delete jobs through a web interface
- Material Design 3 UI components
- Docker Compose for easy deployment

## Tech Stack

- **Frontend**: React with Material UI 3
- **Backend**: Node.js/Express with TypeScript
- **Database**: MySQL 8.x
- **Job Scheduling**: node-cron
- **Containerization**: Docker & Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)

### Quick Start (Local Development)

### Running with Docker Compose

```bash
# Start all services
docker-compose up --build

# Stop all services
docker-compose down
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Production Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed instructions on deploying to:
- Ubuntu Server (Docker or Native)
- SSL/HTTPS setup with Let's Encrypt
- Nginx reverse proxy configuration
- Backup and monitoring strategies

### Local Development

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## API Endpoints

### Job Management
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create a new job
- `PUT /api/jobs/:id` - Update a job
- `DELETE /api/jobs/:id` - Delete a job
- `PATCH /api/jobs/:id/pause` - Pause a job
- `PATCH /api/jobs/:id/resume` - Resume a job

### Job Logs
- `GET /api/jobs/:id/logs` - Get execution logs for a job
- `POST /api/jobs/logs/cleanup` - Manually trigger log cleanup (admin)

## Database Schema

### jobs table
- `id` - Primary key
- `name` - Job name
- `command` - Shell command to execute
- `schedule` - Cron expression
- `status` - Job status (active/paused)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `last_run` - Last execution timestamp
- `next_run` - Next scheduled execution

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and adjust values as needed:
```bash
cp .env.example .env
```

#### Port Configuration
- `BACKEND_PORT` - Backend API server port (default: `3001`)
- `PORT` - Frontend development server port (default: `3000`)
- `REACT_APP_API_URL` - Backend API URL for frontend (default: `http://localhost:3001`)
- `MYSQL_PORT` - MySQL database port (default: `3306`)

#### Job Execution
- `EXECUTION_MODE` - Where to execute jobs (default: `local`)
  - `local`: Run commands inside the backend container (isolated)
  - `ssh`: Run commands on the host OS via SSH (full host access)
- `SSH_HOST` - SSH server address (default: `host.docker.internal`)
- `SSH_PORT` - SSH port (default: `22`)
- `SSH_USER` - SSH username (default: `jobrunner`)
- `SSH_PRIVATE_KEY_PATH` - Path to SSH private key in container

#### Log Retention
- `LOG_RETENTION_COUNT` - Number of log entries to keep per job (default: 100)
  - Older logs are automatically deleted when new logs are created
  - Each job maintains its own retention limit independently

### Execution Modes

The scheduler supports two execution modes:

1. **Local Mode** (default): Commands execute inside the backend Docker container
   - ✅ Secure and isolated
   - ❌ Limited to container environment
   - No additional setup required

2. **SSH Mode**: Commands execute on the host OS via SSH
   - ✅ Full host OS access
   - ✅ Can run any host commands
   - ❌ Requires SSH setup
   - See [SSH_SETUP.md](SSH_SETUP.md) for detailed configuration

### Log Retention

The application automatically manages log retention to prevent unbounded database growth:

- **Automatic Cleanup**: When a new log entry is created, logs older than the retention limit are automatically deleted
- **Per-Job Retention**: Each job independently maintains its last N executions (default: 100)
- **Manual Cleanup**: Use `POST /api/jobs/logs/cleanup` to manually trigger cleanup for all jobs

Example:
```bash
# Set retention to 50 logs per job
LOG_RETENTION_COUNT=50

# Manual cleanup via API
curl -X POST http://localhost:3001/api/jobs/logs/cleanup
```

## License

MIT
