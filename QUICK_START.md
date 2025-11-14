# Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- Ports 3000, 3001, and 3306 available on your machine

## Starting the Application

### Option 1: Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Option 2: Using Make

```bash
# Build and start
make build
make up

# View logs
make logs

# Stop services
make down

# Clean everything (including volumes)
make clean
```

## Accessing the Application

Once all services are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/jobs
- **Health Check**: http://localhost:3001/health

## Local Development (Without Docker)

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Database

Make sure MySQL is running locally and create the database:

```sql
CREATE DATABASE scheduler_db;
```

Then run the init script from `database/init.sql`.

## Using the Application

### Creating a Job

1. Click the "Create Job" button
2. Fill in the form:
   - **Name**: Descriptive name for your job
   - **Command**: Shell command to execute (e.g., `echo "Hello World"`)
   - **Schedule**: Cron expression or use the quick select dropdown
   - **Status**: Active or Paused

### Cron Expression Examples

- `* * * * *` - Every minute
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 0 * * *` - Every day at midnight
- `0 9 * * 1` - Every Monday at 9 AM

### Managing Jobs

- **Edit**: Click the edit icon to modify a job
- **Pause/Resume**: Toggle job execution
- **View Logs**: See execution history and output
- **Delete**: Remove a job permanently

## Troubleshooting

### Services not starting

```bash
# Check service status
docker-compose ps

# View logs for specific service
docker-compose logs mysql
docker-compose logs backend
docker-compose logs frontend
```

### Database connection issues

Wait for MySQL to be fully initialized (can take 30-60 seconds on first run):

```bash
# Check MySQL health
docker-compose logs mysql | grep "ready for connections"
```

### Port conflicts

If ports are already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3001:3001"  # Change left number (host port)
```

## Environment Variables

Copy `.env` file and modify if needed:

```bash
# Database
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=scheduler_db
MYSQL_USER=scheduler_user
MYSQL_PASSWORD=scheduler_pass

# Backend
BACKEND_PORT=3001

# Frontend
REACT_APP_API_URL=http://localhost:3001
```

## Stopping the Application

```bash
# Stop services (keeps data)
docker-compose down

# Stop and remove volumes (deletes all data)
docker-compose down -v
```
