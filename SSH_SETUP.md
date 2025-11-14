# SSH Setup Guide for Host Command Execution

This guide explains how to configure the scheduler to execute jobs on the host OS via SSH.

## Overview

The scheduler supports two execution modes:
- **`local`** (default): Commands run inside the backend container
- **`ssh`**: Commands run on the host OS via SSH connection

## Prerequisites

1. SSH server running on the host
2. Dedicated user account for job execution
3. SSH key pair for authentication

---

## Step 1: Create SSH User on Host

Create a dedicated user for running scheduled jobs:

### Linux/Mac:
```bash
# Create user
sudo useradd -m -s /bin/bash jobrunner

# Set password (if using password auth - not recommended)
sudo passwd jobrunner

# OR set up for key-only auth (recommended)
sudo mkdir -p /home/jobrunner/.ssh
sudo chmod 700 /home/jobrunner/.ssh
```

### Windows:
```powershell
# Install OpenSSH Server (if not already installed)
Add-WindowsCapability -Online -Name OpenSSH.Server

# Start and enable SSH service
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'

# Create user
New-LocalUser -Name "jobrunner" -Description "Scheduler job runner" -NoPassword

# Add to appropriate group
Add-LocalGroupMember -Group "Users" -Member "jobrunner"
```

---

## Step 2: Generate SSH Keys

Generate SSH key pair for the scheduler:

```bash
# On your machine (not in container)
cd /path/to/scheduler
mkdir -p ssh-keys

# Generate key pair
ssh-keygen -t rsa -b 4096 -f ssh-keys/id_rsa -N "" -C "scheduler-jobrunner"

# This creates:
# - ssh-keys/id_rsa (private key)
# - ssh-keys/id_rsa.pub (public key)
```

---

## Step 3: Install Public Key on Host

Copy the public key to the jobrunner user's authorized_keys:

### Linux/Mac:
```bash
# Copy public key to host
sudo mkdir -p /home/jobrunner/.ssh
sudo cat ssh-keys/id_rsa.pub | sudo tee -a /home/jobrunner/.ssh/authorized_keys

# Set proper permissions
sudo chmod 600 /home/jobrunner/.ssh/authorized_keys
sudo chown -R jobrunner:jobrunner /home/jobrunner/.ssh
```

### Windows:
```powershell
# Copy public key to authorized_keys
$authorizedKeysPath = "C:\Users\jobrunner\.ssh\authorized_keys"
New-Item -ItemType Directory -Path "C:\Users\jobrunner\.ssh" -Force
Get-Content ssh-keys\id_rsa.pub | Add-Content $authorizedKeysPath

# Set permissions
icacls $authorizedKeysPath /inheritance:r
icacls $authorizedKeysPath /grant "jobrunner:R"
```

---

## Step 4: Test SSH Connection

Test the SSH connection from your machine:

```bash
# Test connection
ssh -i ssh-keys/id_rsa jobrunner@localhost echo "Connection successful"

# Should output: "Connection successful"
```

**Troubleshooting:**
- Ensure SSH service is running: `sudo systemctl status sshd` (Linux) or `Get-Service sshd` (Windows)
- Check SSH logs: `sudo tail -f /var/log/auth.log` (Linux) or Event Viewer (Windows)
- Verify permissions on `.ssh` directory and `authorized_keys` file
- Ensure private key permissions: `chmod 600 ssh-keys/id_rsa`

---

## Step 5: Configure Scheduler for SSH Mode

Update the `.env` file:

```bash
# Job Execution Configuration
EXECUTION_MODE=ssh
SSH_HOST=host.docker.internal  # Docker's host gateway
SSH_PORT=22
SSH_USER=jobrunner
# SSH_PRIVATE_KEY_PATH is set in docker-compose (don't change)
```

**Important Notes:**
- On Docker Desktop (Windows/Mac): Use `host.docker.internal`
- On Linux with Docker: May need to use actual host IP or configure `host-gateway`

---

## Step 6: Set Correct Permissions

Ensure SSH keys have proper permissions:

```bash
chmod 700 ssh-keys
chmod 600 ssh-keys/id_rsa
chmod 644 ssh-keys/id_rsa.pub
```

---

## Step 7: Start the Scheduler

Rebuild and start the containers:

```bash
docker-compose down
docker-compose build backend
docker-compose up -d
```

Check logs to verify SSH mode:

```bash
docker-compose logs -f backend

# Look for:
# "Executing job X (Job Name) [mode: ssh]: command..."
```

---

## Security Considerations

### 1. Restrict SSH User Permissions

Limit what the jobrunner user can do:

```bash
# Linux: Use sudoers to allow specific commands only
sudo visudo -f /etc/sudoers.d/jobrunner
# Add: jobrunner ALL=(ALL) NOPASSWD: /path/to/specific/command
```

### 2. Use SSH Key Restrictions

Add command restrictions to `authorized_keys`:

```bash
# Edit: /home/jobrunner/.ssh/authorized_keys
# Add before the key:
command="/usr/local/bin/job-wrapper.sh" ssh-rsa AAAAB3...
```

Then create `/usr/local/bin/job-wrapper.sh`:
```bash
#!/bin/bash
# Whitelist allowed commands
case "$SSH_ORIGINAL_COMMAND" in
  "echo"*)
    $SSH_ORIGINAL_COMMAND
    ;;
  "/usr/bin/backup.sh")
    $SSH_ORIGINAL_COMMAND
    ;;
  *)
    echo "Command not allowed"
    exit 1
    ;;
esac
```

### 3. Monitor SSH Access

Enable SSH logging and monitor for suspicious activity:

```bash
# Linux
sudo tail -f /var/log/auth.log | grep jobrunner

# Windows
# Check Event Viewer -> Windows Logs -> Security
```

### 4. Use Firewall Rules

Restrict SSH access to localhost only if the scheduler runs on the same machine:

```bash
# Linux (iptables)
sudo iptables -A INPUT -p tcp --dport 22 -s 127.0.0.1 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j DROP

# Linux (ufw)
sudo ufw allow from 127.0.0.1 to any port 22

# Windows
New-NetFirewallRule -Name "SSH-Local" -DisplayName "SSH Local Only" `
  -Direction Inbound -LocalPort 22 -Protocol TCP `
  -RemoteAddress 127.0.0.1 -Action Allow
```

---

## Testing

Create a test job in the UI:

```
Name: Test SSH Execution
Command: hostname && whoami && pwd
Schedule: * * * * * (every minute)
Status: Active
```

Check the logs to verify:
1. Command runs on host (not in container)
2. User is `jobrunner`
3. Working directory is jobrunner's home

---

## Switching Back to Local Mode

To run jobs in the container again:

```bash
# Update .env
EXECUTION_MODE=local

# Restart
docker-compose restart backend
```

---

## Troubleshooting

### "Connection refused" error
- SSH server not running on host
- Check: `sudo systemctl status sshd` or `Get-Service sshd`
- Start: `sudo systemctl start sshd` or `Start-Service sshd`

### "Permission denied (publickey)" error
- Public key not in authorized_keys
- Wrong permissions on ~/.ssh or authorized_keys
- Private key not readable by container

### "Host key verification failed" error
- First connection from container
- Solution: Set `StrictHostKeyChecking=no` in SSH config (dev only!)

### Commands run but in wrong location
- Check user home directory: `ssh jobrunner@localhost pwd`
- Specify absolute paths in commands

### Docker on Linux can't reach host
```bash
# Add to docker-compose.yml backend service:
extra_hosts:
  - "host.docker.internal:host-gateway"
```

---

## Advanced: Password Authentication (Not Recommended)

If you must use password authentication:

1. Update `.env`:
```bash
EXECUTION_MODE=ssh
SSH_HOST=host.docker.internal
SSH_PASSWORD=your_password
```

2. Remove SSH key mount from docker-compose.yml

**Warning:** Storing passwords in environment variables is insecure. Use SSH keys instead.

---

## Questions?

For issues or questions, check:
- SSH server logs
- Container logs: `docker-compose logs backend`
- Test SSH manually: `docker exec scheduler-backend ssh -i /root/.ssh/id_rsa jobrunner@host.docker.internal echo test`
