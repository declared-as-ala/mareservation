# 🚀 GitHub Actions CI/CD Setup

Complete guide to setup automatic deployment from GitHub to your VPS.

---

## 📋 Prerequisites

- GitHub account with access to the repository
- VPS with root SSH access
- SSH key pair generated

---

## Step 1: Setup GitHub Repository Secrets

Go to GitHub repository → Settings → Secrets and variables → Actions

**Create these secrets:**

### 1. `VPS_HOST`
```
145.223.118.9
```

### 2. `VPS_PASSWORD`
Paste your VPS root password:
```
14#mFVoY3b7K9IAP3bV
```

---

## Step 2: Setup VPS (One-Time)

Run the setup script on your VPS:

```bash
# Option A: Direct from GitHub
curl -fsSL https://raw.githubusercontent.com/declared-as-ala/mareservation/main/scripts/setup-vps.sh | bash

# Option B: Manual setup
ssh root@145.223.118.9

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /app/mareservation
cd /app/mareservation

# Clone repository
git clone https://github.com/declared-as-ala/mareservation.git .

# Create and configure .env
cp .env.example .env
nano .env  # Add your secrets

# Done! GitHub Actions will handle deployment
```

---

## Step 3: Verify Setup

Test the GitHub Actions workflow:

1. Go to GitHub repository → Actions
2. Click "Deploy to VPS" workflow
3. Click "Run workflow" → "Run workflow"
4. Watch the deployment logs in real-time

Or push a change to trigger automatically:

```bash
git add .
git commit -m "test: trigger deployment"
git push origin main
```

---

## 🔄 How It Works

### On Every Push to Main

1. **GitHub Actions triggers** → Checks out code
2. **SSH into VPS** → Uses your SSH key
3. **Pull latest code** → `git pull origin main`
4. **Build Docker images** → `docker-compose build`
5. **Start services** → `docker-compose up -d`
6. **Verify deployment** → Checks health endpoints
7. **Report status** → Success/failure notification

---

## 📊 Workflow Steps

The workflow file (`.github/workflows/deploy.yml`) does:

```yaml
1. Checkout code from GitHub
   ↓
2. Setup SSH connection to VPS
   ↓
3. Pull latest code on VPS
   ↓
4. Build Docker images
   ↓
5. Start containers
   ↓
6. Verify services are running
   ↓
✅ Done!
```

---

## 🧪 Testing

### Test 1: Manual GitHub Actions Run

```bash
# Go to GitHub repository → Actions
# Click "Deploy to VPS" → "Run workflow"
# Watch real-time logs
```

### Test 2: Push Trigger

```bash
git add .
git commit -m "test: trigger deployment"
git push origin main

# Then check Actions tab on GitHub
```

### Test 3: Verify on VPS

```bash
ssh root@145.223.118.9
cd /app/mareservation
docker-compose ps          # Should show all services UP
docker-compose logs        # Check for errors
curl http://localhost:5000/api/v1/health  # Test API
```

---

## 🔐 Security Best Practices

✅ **Do:**
- Use a dedicated SSH key for deployments
- Keep private key in GitHub secrets only
- Rotate SSH keys periodically
- Limit VPS firewall rules
- Use HTTPS for all communications

❌ **Don't:**
- Commit private keys to GitHub
- Use root user password authentication
- Share SSH keys via email/chat
- Disable SSH verification

---

## 🚨 Troubleshooting

### SSH Connection Failed

```bash
# Check VPS_PASSWORD secret is correct in GitHub
# Settings → Secrets and variables → Actions → VPS_PASSWORD
```

### Docker Build Fails

```bash
# SSH to VPS and check manually
ssh root@145.223.118.9
cd /app/mareservation
docker-compose build

# Check logs
docker-compose logs
```

### Services Won't Start

```bash
# Check .env exists and is valid
nano /app/mareservation/.env

# Check logs
docker-compose logs -f

# Restart
docker-compose restart
```

### GitHub Actions Secrets Not Found

```bash
# Verify secrets exist in GitHub
# Settings → Secrets and variables → Actions
# Check names: VPS_HOST, VPS_SSH_KEY
```

---

## 📝 Common Tasks

### Manually Deploy (if needed)

```bash
# SSH to VPS
ssh root@145.223.118.9
cd /app/mareservation

# Pull, build, restart
git pull origin main
docker-compose build
docker-compose up -d
docker-compose logs -f
```

### View Deployment Logs

```bash
# On GitHub: Actions tab → latest workflow run
# On VPS: 
ssh root@145.223.118.9
cd /app/mareservation
docker-compose logs -f backend   # Last 50 lines
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Rollback to Previous Version

```bash
# SSH to VPS
ssh root@145.223.118.9
cd /app/mareservation

# Show git history
git log --oneline

# Checkout previous commit
git checkout abc123def  # Replace with commit hash

# Restart services
docker-compose build
docker-compose up -d
```

### Update .env Secrets

```bash
# SSH to VPS
ssh root@145.223.118.9
nano /app/mareservation/.env

# After saving, restart services:
cd /app/mareservation
docker-compose restart
```

---

## 🔔 GitHub Actions Status Notifications

### Email Notifications
- GitHub automatically emails you on workflow failure
- Settings → Notifications → Actions

### Slack Notifications (Optional)
Add to your workflow to notify Slack:

```yaml
- name: 📧 Slack Notification
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "❌ Deployment failed"
      }
```

---

## 📚 Next Steps

1. ✅ Generate SSH key
2. ✅ Add to VPS authorized_keys
3. ✅ Add GitHub secrets (VPS_HOST, VPS_SSH_KEY)
4. ✅ Run setup script on VPS
5. ✅ Test with manual workflow run
6. ✅ Push to main branch to trigger automatic deployment
7. ✅ Monitor logs and verify services running

---

## 🎯 Summary

After setup, every time you:

```bash
git add .
git commit -m "your changes"
git push origin main
```

GitHub Actions will:
1. Build your Docker images
2. SSH to your VPS
3. Deploy the new version
4. Verify everything is running
5. Notify you of success/failure

**Fully automated CI/CD pipeline!** 🚀

---

**Need help?** Check the troubleshooting section above or run:
```bash
# View latest workflow logs
curl https://api.github.com/repos/declared-as-ala/mareservation/actions/runs | jq '.'
```
