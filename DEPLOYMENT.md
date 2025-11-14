# Deployment Guide - Ubuntu Server

This guide explains how to deploy the Job Scheduler application to an Ubuntu server.

## Prerequisites

- Ubuntu Server 20.04 LTS or newer
- Root or sudo access
- Domain name (optional, for HTTPS)
- At least 2GB RAM, 10GB disk space

---

## Option 1: Docker Deployment (Recommended)

### Step 1: Install Docker and Docker Compose

```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add your user to docker group (logout/login required after)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Clone/Upload the Application

**Option A: Using Git**
```bash
# Install git if not already installed
sudo apt install -y git

# Clone repository
cd /opt
sudo git clone <your-repo-url> scheduler
sudo chown -R $USER:$USER /opt/scheduler
cd /opt/scheduler
```

**Option B: Using SCP/SFTP**
```bash
# From your local machine
scp -r scheduler/ user@server-ip:/opt/

# On server
cd /opt/scheduler
```

### Step 3: Configure Environment Variables

```bash
# Create/edit .env file
nano .env
```

**Production Configuration:**
```bash
# Database Configuration
MYSQL_ROOT_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
MYSQL_DATABASE=scheduler_db
MYSQL_USER=scheduler_user
MYSQL_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
MYSQL_HOST=mysql
MYSQL_PORT=3306

# Backend Configuration
BACKEND_PORT=3001
NODE_ENV=production
LOG_RETENTION_COUNT=100

# Job Execution Configuration
EXECUTION_MODE=ssh  # Use SSH to run jobs on host
SSH_HOST=host.docker.internal
SSH_PORT=22
SSH_USER=jobrunner
SSH_PRIVATE_KEY_PATH=/root/.ssh/id_rsa

# Frontend Configuration
REACT_APP_API_URL=http://YOUR_SERVER_IP:3001
```

**Important:** Replace `YOUR_SERVER_IP` with your actual server IP or domain name.

### Step 4: Set Up SSH for Host Job Execution (Optional but Recommended)

If you want jobs to run on the host OS:

```bash
# Create dedicated user for running jobs
sudo useradd -m -s /bin/bash jobrunner

# Generate SSH keys
mkdir -p ssh-keys
ssh-keygen -t rsa -b 4096 -f ssh-keys/id_rsa -N ""

# Install public key
sudo mkdir -p /home/jobrunner/.ssh
sudo cat ssh-keys/id_rsa.pub | sudo tee /home/jobrunner/.ssh/authorized_keys
sudo chmod 700 /home/jobrunner/.ssh
sudo chmod 600 /home/jobrunner/.ssh/authorized_keys
sudo chown -R jobrunner:jobrunner /home/jobrunner/.ssh

# Test SSH connection
ssh -i ssh-keys/id_rsa jobrunner@localhost echo "SSH works"

# Ensure SSH server is running
sudo systemctl enable ssh
sudo systemctl start ssh
```

See [SSH_SETUP.md](SSH_SETUP.md) for detailed configuration.

### Step 5: Configure Firewall

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application ports
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 3001/tcp  # Backend API

# Enable firewall
sudo ufw enable
sudo ufw status
```

### Step 6: Build and Start the Application

```bash
cd /opt/scheduler

# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 7: Verify Deployment

```bash
# Test backend API
curl http://localhost:3001/health

# Test frontend
curl http://localhost:3000

# Check from external machine
curl http://YOUR_SERVER_IP:3001/health
```

Access the application:
- Frontend: `http://YOUR_SERVER_IP:3000`
- Backend API: `http://YOUR_SERVER_IP:3001`

---

## Option 2: Native Deployment (Without Docker)

### Step 1: Install Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL Server
sudo apt install -y mysql-server

# Install Nginx (for reverse proxy)
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 2: Set Up MySQL Database

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p

# In MySQL prompt:
CREATE DATABASE scheduler_db;
CREATE USER 'scheduler_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON scheduler_db.* TO 'scheduler_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema
sudo mysql -u root -p scheduler_db < /opt/scheduler/database/init.sql
```

### Step 3: Configure Backend

```bash
cd /opt/scheduler/backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=scheduler_user
MYSQL_PASSWORD=your_strong_password
MYSQL_DATABASE=scheduler_db

BACKEND_PORT=3001
NODE_ENV=production
LOG_RETENTION_COUNT=100

EXECUTION_MODE=local
EOF

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/index.js --name scheduler-backend
pm2 save
pm2 startup
```

### Step 4: Configure Frontend

```bash
cd /opt/scheduler/frontend

# Install dependencies
npm install

# Build production bundle
REACT_APP_API_URL=http://YOUR_SERVER_IP:3001 npm run build

# The build folder is now ready to serve
```

### Step 5: Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/scheduler

# Add configuration:
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Frontend
    location / {
        root /opt/scheduler/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend health check
    location /health {
        proxy_pass http://localhost:3001/health;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/scheduler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Verify Native Deployment

```bash
# Check backend
pm2 status
curl http://localhost:3001/health

# Check frontend
curl http://localhost

# Access from browser
http://YOUR_SERVER_IP
```

---

## SSL/HTTPS Setup with Let's Encrypt

### Using Certbot (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (Nginx plugin)
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Manual SSL Configuration

```bash
# Update Nginx config
sudo nano /etc/nginx/sites-available/scheduler

# Add SSL configuration:
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # ... rest of configuration
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Reverse Proxy Setup (Docker + Nginx)

If using Docker but want Nginx in front:

```bash
# Install Nginx on host
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/scheduler

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable and restart
sudo ln -s /etc/nginx/sites-available/scheduler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Automatic Startup

### Docker Deployment

```bash
# Services already set to restart: unless-stopped

# Enable Docker to start on boot
sudo systemctl enable docker

# Verify
sudo systemctl is-enabled docker
```

### Native Deployment

```bash
# PM2 already configured with pm2 startup

# Ensure Nginx starts on boot
sudo systemctl enable nginx

# Ensure MySQL starts on boot
sudo systemctl enable mysql
```

---

## Monitoring and Maintenance

### View Logs

**Docker:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

**Native:**
```bash
# Backend logs
pm2 logs scheduler-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### Restart Services

**Docker:**
```bash
docker-compose restart
docker-compose restart backend
```

**Native:**
```bash
pm2 restart scheduler-backend
sudo systemctl restart nginx
sudo systemctl restart mysql
```

### Update Application

**Docker:**
```bash
cd /opt/scheduler
git pull  # or upload new files
docker-compose down
docker-compose build
docker-compose up -d
```

**Native:**
```bash
cd /opt/scheduler
git pull  # or upload new files

# Backend
cd backend
npm install
npm run build
pm2 restart scheduler-backend

# Frontend
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

## Backup Strategy

### Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-scheduler-db.sh

#!/bin/bash
BACKUP_DIR="/var/backups/scheduler"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker exec scheduler-mysql mysqldump \
  -u scheduler_user -pscheduler_pass scheduler_db \
  > $BACKUP_DIR/scheduler_db_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

# Make executable
sudo chmod +x /usr/local/bin/backup-scheduler-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-scheduler-db.sh
```

### Application Backup

```bash
# Backup application files
tar -czf /var/backups/scheduler-app-$(date +%Y%m%d).tar.gz /opt/scheduler

# Exclude node_modules and build artifacts
tar -czf /var/backups/scheduler-app-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='build' \
  /opt/scheduler
```

---

## Troubleshooting

### Application won't start

```bash
# Check Docker logs
docker-compose logs

# Check disk space
df -h

# Check memory
free -h

# Check ports in use
sudo netstat -tulpn | grep -E ':(3000|3001|3306)'
```

### Can't connect from external network

```bash
# Check firewall
sudo ufw status

# Check if ports are listening
sudo netstat -tulpn | grep -E ':(3000|3001)'

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t
```

### Database connection issues

```bash
# Check MySQL is running
docker-compose ps mysql
# or
sudo systemctl status mysql

# Test connection
docker exec scheduler-mysql mysql -u scheduler_user -p -e "SHOW DATABASES;"

# Check logs
docker-compose logs mysql
```

### Jobs not executing

```bash
# Check backend logs
docker-compose logs backend | grep "Executing job"

# Check execution mode
docker exec scheduler-backend printenv EXECUTION_MODE

# For SSH mode, test SSH connection
docker exec scheduler-backend ssh -i /root/.ssh/id_rsa jobrunner@host.docker.internal echo "test"
```

---

## Security Checklist

- [ ] Changed default database passwords
- [ ] Configured firewall (ufw)
- [ ] Set up SSH key authentication (disable password auth)
- [ ] Configured SSL/HTTPS
- [ ] Set up automatic security updates
- [ ] Configured backup strategy
- [ ] Limited jobrunner user permissions
- [ ] Reviewed and restricted open ports
- [ ] Set up monitoring/alerting
- [ ] Configured log rotation

---

## Performance Tuning

### For High-Frequency Jobs

```yaml
# docker-compose.yml - add resource limits
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### MySQL Optimization

```bash
# Edit MySQL config
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Add:
[mysqld]
innodb_buffer_pool_size = 1G
max_connections = 200
query_cache_size = 64M
```

---

## Questions or Issues?

- Check logs first: `docker-compose logs -f`
- Review [README.md](README.md) for configuration
- See [SSH_SETUP.md](SSH_SETUP.md) for SSH issues
- Check GitHub issues or create a new one

Happy deploying! 🚀
