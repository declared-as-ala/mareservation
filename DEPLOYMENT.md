# 🚀 Ma Reservation — VPS Deployment Guide

This guide walks through deploying Ma Reservation to a VPS using **Docker** and **MongoDB** (self-hosted, not Atlas).

---

## Prerequisites

- **VPS Server**: Ubuntu 20.04+ or similar Linux distribution
- **SSH Access**: Root or sudo-capable user
- **Domain Name** (optional): For HTTPS setup
- **DNS**: Pointing to your VPS IP

---

## 🔐 Security First

> ⚠️ **CRITICAL**: Never commit `.env` or credentials to Git. Always use environment variables.

1. Generate strong secrets:
   ```bash
   openssl rand -base64 64  # JWT_SECRET
   openssl rand -base64 64  # REFRESH_SECRET
   ```

2. Use `.env` file (gitignored) with sensitive values — never in code.

---

## Step 1: Prepare VPS

### 1.1 SSH into your VPS
```bash
ssh root@<your-vps-ip>
# Enter password when prompted
```

### 1.2 Install Docker & Docker Compose
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 1.3 Create App Directory
```bash
mkdir -p /app/mareservation
cd /app/mareservation
```

---

## Step 2: Clone Repository

### 2.1 Clone from GitHub
```bash
git clone https://github.com/declared-as-ala/mareservation.git .
cd /app/mareservation
```

### 2.2 Verify Structure
```bash
ls -la
# Should show: docker-compose.yml, Dockerfile, backend/, package.json, etc.
```

---

## Step 3: Configure Environment

### 3.1 Create .env file
```bash
cp .env.example .env
nano .env  # or use your editor
```

### 3.2 Required Variables (update these)
```env
# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1

# Backend
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
MONGO_URI=mongodb://admin:YOUR_STRONG_PASSWORD@mongodb:27017/mareservation?authSource=admin
JWT_SECRET=YOUR_64_CHAR_GENERATED_SECRET
REFRESH_SECRET=YOUR_64_CHAR_GENERATED_SECRET

# Email (Resend recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxx
KONNECT_API_KEY=your-konnect-api-key
KONNECT_SECRET_KEY=your-konnect-secret-key
```

### 3.3 Change MongoDB Credentials
Edit docker-compose.yml and change:
```yaml
MONGO_INITDB_ROOT_USERNAME: admin  # ← change from admin
MONGO_INITDB_ROOT_PASSWORD: changeme  # ← change from changeme
```

And update .env:
```env
MONGO_URI=mongodb://YOUR_USERNAME:YOUR_PASSWORD@mongodb:27017/mareservation?authSource=admin
```

---

## Step 4: Build & Start Containers

### 4.1 Build Images
```bash
docker-compose build
# This will build backend and frontend images
# Takes 3–5 minutes on first run
```

### 4.2 Start Services
```bash
docker-compose up -d
# -d = detached (background)

# Verify services are running
docker-compose ps
```

### 4.3 Check Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

---

## Step 5: Verify Deployment

### 5.1 Check Backend Health
```bash
curl http://localhost:5000/api/v1/health
# Should return: {"status":"ok"} or similar
```

### 5.2 Check Frontend
```bash
curl http://localhost:3000
# Should return HTML
```

### 5.3 Check MongoDB
```bash
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
# Should show: { ok: 1 }
```

---

## Step 6: Setup Reverse Proxy (Nginx/Caddy)

### Option A: Nginx
```bash
apt install -y nginx

# Create config
cat > /etc/nginx/sites-available/mareservation.conf << 'EOF'
upstream backend {
    server localhost:5000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # API routes → backend
    location /api/v1 {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Everything else → frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable config
ln -s /etc/nginx/sites-available/mareservation.conf /etc/nginx/sites-enabled/

# Test config
nginx -t

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

### Option B: Caddy (easier, auto HTTPS)
```bash
apt install -y caddy

# Create Caddyfile
cat > /etc/caddy/Caddyfile << 'EOF'
yourdomain.com {
    encode gzip

    # API routes
    @api path /api/v1/*
    reverse_proxy @api localhost:5000

    # Frontend (with rewrites for SPA)
    reverse_proxy localhost:3000
}
EOF

# Start Caddy
systemctl start caddy
systemctl enable caddy
```

---

## Step 7: SSL Certificate (Let's Encrypt)

### If using Caddy
Caddy automatically handles SSL — no extra steps needed.

### If using Nginx
```bash
apt install -y certbot python3-certbot-nginx

certbot --nginx -d yourdomain.com

# Auto-renewal
systemctl enable certbot.timer
```

---

## Step 8: Persistence & Backups

### 8.1 MongoDB Data Backup
```bash
# Backup
docker-compose exec mongodb mongodump --archive=/backup/mongo-$(date +%Y%m%d).archive

# Restore
docker-compose exec mongodb mongorestore --archive=/backup/mongo-20260101.archive
```

### 8.2 Docker Volumes
MongoDB data is stored in `mongodb_data` volume (persistent across restarts):
```bash
docker volume ls
docker volume inspect mareservation_mongodb_data
```

---

## Step 9: Monitoring & Logs

### 9.1 View Logs
```bash
# Real-time logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend --tail 100

# Tail by timestamp
docker-compose logs --since 30m
```

### 9.2 Health Check
```bash
# Simple health endpoint
curl http://localhost:5000/api/v1/health

# Check all containers
docker-compose ps
```

---

## Step 10: Troubleshooting

### 10.1 Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# - MONGO_URI incorrect
# - PORT already in use
# - JWT_SECRET missing or < 32 chars

# Fix and restart
docker-compose restart backend
```

### 10.2 Frontend won't load
```bash
# Check NEXT_PUBLIC_API_URL is set correctly
docker-compose logs frontend

# Rebuild if needed
docker-compose build --no-cache frontend
docker-compose up -d
```

### 10.3 MongoDB won't start
```bash
# Check seed script output
docker-compose logs mongodb

# Recreate volume if corrupted
docker-compose down
docker volume rm mareservation_mongodb_data
docker-compose up -d
# (Will re-seed)
```

---

## Step 11: Updates & Maintenance

### 11.1 Update Code
```bash
cd /app/mareservation
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d
```

### 11.2 Clean Up
```bash
# Stop containers (keep data)
docker-compose stop

# Stop and remove (keep data)
docker-compose down

# Clean unused images/volumes
docker system prune
```

---

## Step 12: Production Checklist

- [ ] `.env` is in `.gitignore`
- [ ] All secrets are strong (64-char base64)
- [ ] `NEXT_PUBLIC_API_URL` points to production API
- [ ] `FRONTEND_URL` is set correctly
- [ ] MongoDB credentials changed from defaults
- [ ] Reverse proxy (Nginx/Caddy) configured
- [ ] SSL certificate installed
- [ ] Firewall allows ports 80, 443
- [ ] Backup strategy in place
- [ ] Monitoring/alerting configured
- [ ] Email service (Resend/SMTP) tested
- [ ] Payment gateway (Konnect) configured and tested

---

## Environment Variables Reference

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL (exposed to frontend) |
| `NODE_ENV` | ✅ | `production` or `development` |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Min 32 characters, generate with openssl |
| `REFRESH_SECRET` | ✅ | Min 32 characters, generate with openssl |
| `FRONTEND_URL` | ✅ | Frontend URL for CORS |
| `RESEND_API_KEY` | ✅ | Email service API key |
| `KONNECT_API_KEY` | ✅ | Payment gateway API key |
| `KONNECT_SECRET_KEY` | ✅ | Payment gateway secret |

---

## Support & Issues

For issues, check:
1. Docker logs: `docker-compose logs -f`
2. Environment variables: `docker-compose config`
3. Backend health: `curl http://localhost:5000/api/v1/health`
4. MongoDB connection: `docker-compose exec mongodb mongosh`

---

## Next Steps

- Set up automated backups (cron + S3)
- Configure monitoring (Sentry, NewRelic, etc.)
- Enable rate limiting on API
- Setup CI/CD for automatic deployments (GitHub Actions)
- Configure email templates (Resend)

---

**Deployed successfully!** 🎉
