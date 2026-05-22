# 🚀 Ma Reservation — Deployment Index

Complete guide to all deployment-related files and documentation.

---

## 📂 File Structure

```
mareservation/
├── 🐳 Docker Files
│   ├── docker-compose.yml          Complete Docker orchestration (MongoDB, Backend, Frontend)
│   ├── Dockerfile                  Next.js frontend build (multi-stage)
│   ├── backend/Dockerfile          Express backend build
│   └── .dockerignore              Build context optimization
│
├── 🔧 Configuration & Seeding
│   ├── .env.example                Environment variables template (copy to .env)
│   └── backend/scripts/seed.js     MongoDB initialization script (auto-runs on first start)
│
├── 📚 Documentation (READ IN THIS ORDER)
│   ├── 1️⃣  QUICK_DEPLOY.md         ⏱️ 15-min deployment checklist
│   ├── 2️⃣  README.DOCKER.md        Docker quick reference for developers
│   ├── 3️⃣  DEPLOYMENT.md           📖 Full 40+ section production guide
│   ├── 4️⃣  DEPLOYMENT_READY.md     Architecture & feature summary
│   └── 5️⃣  DEPLOYMENT_INDEX.md     This file — master index
│
└── 📁 Project Files
    ├── CLAUDE.md                   Project context for AI
    ├── backend/CLAUDE.md          Backend-specific context
    └── [frontend code...]         React/Next.js application
```

---

## 📖 Documentation Guide

### ⚡ **QUICK_DEPLOY.md** — START HERE
**Read this first if you want to deploy in 15 minutes.**

Contains:
- Pre-deployment secret generation
- Step-by-step VPS commands
- Environment configuration checklist
- Quick verification tests
- Common troubleshooting

**Time: 5-10 minutes**

### 🐳 **README.DOCKER.md** — For Developers
**Read if working with Docker locally or understanding the setup.**

Contains:
- Local development quickstart
- Architecture overview with diagram
- Common Docker commands reference
- Troubleshooting guide
- Performance tips
- Security notes

**Time: 8-10 minutes**

### 📖 **DEPLOYMENT.md** — Full Production Guide
**Read for comprehensive production deployment.**

Contains:
- Detailed VPS setup (Ubuntu 20.04+)
- Docker & Docker Compose installation
- Code deployment from GitHub
- Environment variable configuration
- Service verification
- Reverse proxy setup (Nginx & Caddy)
- SSL/TLS certificate installation
- Persistence & backup strategies
- Health monitoring & logs
- Comprehensive troubleshooting
- Production checklist

**Time: 20-30 minutes (reference guide)**

### 📊 **DEPLOYMENT_READY.md** — Architecture Summary
**Read to understand what's been prepared.**

Contains:
- Overview of all deployment components
- Service configuration details
- Testing procedures
- Security checklist
- Common operations reference
- Files summary
- Service ports & URLs

**Time: 5-10 minutes**

### 📑 **DEPLOYMENT_INDEX.md** — This File
**Navigation guide for all deployment docs.**

---

## 🎯 Quick Navigation

### I want to...

**Deploy to production right now**
→ Read **QUICK_DEPLOY.md** (15 min)

**Set up Docker for local development**
→ Read **README.DOCKER.md** (10 min)

**Understand the full architecture**
→ Read **DEPLOYMENT_READY.md** (5 min)

**Detailed production setup**
→ Read **DEPLOYMENT.md** (30 min reference)

**Troubleshoot an issue**
→ See troubleshooting sections in DEPLOYMENT.md or README.DOCKER.md

**Backup/restore database**
→ See sections in DEPLOYMENT.md

**Monitor running services**
→ See monitoring section in README.DOCKER.md

**Update code in production**
→ Run: `git pull && docker-compose build && docker-compose up -d`

---

## 🐳 What's Inside

### docker-compose.yml (Complete Multi-Container Setup)
Orchestrates 3 services:

**MongoDB 7.0-alpine**
- Port: 27017
- Authentication: MONGO_USER / MONGO_PASSWORD
- Seeding: Automatic via seed.js
- Storage: Named volume `mongodb_data`
- Health checks: Enabled

**Express Backend**
- Port: 5000 (inside container)
- Environment: NODE_ENV, MONGO_URI, JWT_SECRET, etc.
- Dependencies: Waits for MongoDB health check
- Restart: Always

**Next.js Frontend**
- Port: 3000
- Multi-stage build (optimized image size)
- Environment: NEXT_PUBLIC_API_URL build arg
- Restart: Always

**Network**: Bridge network `mareservation-network` (service discovery)

### Dockerfile (Next.js Frontend)
- Node.js 20-alpine runtime
- Multi-stage build (builder stage + production stage)
- Builds Next.js application
- Serves on port 3000
- Production-ready with minimal dependencies

### backend/Dockerfile (Express Backend)
- Node.js 20-alpine runtime
- Installs dependencies
- Compiles TypeScript
- Serves on port 5000
- Production-ready

### .env.example (Environment Template)
Complete template covering:
- Frontend configuration (NEXT_PUBLIC_API_URL)
- Backend configuration (NODE_ENV, PORT, MONGO_URI)
- Authentication (JWT_SECRET, REFRESH_SECRET)
- Email service (Resend or SMTP)
- Payment gateway (Konnect Tunisia)
- Optional services (Cloudinary, S3, OpenRouter, Twilio)

### backend/scripts/seed.js (Database Initialization)
Runs automatically on first MongoDB container start:
- Creates database indexes for performance
- Seeds 6 categories (Café, Restaurant, Hôtel, Cinéma, Coworking, Événement)
- Seeds 7 amenity tags
- Creates admin user (admin@mareservation.tn / admin123)
- Initializes app settings

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Generate strong JWT_SECRET: `openssl rand -base64 64`
- [ ] Generate strong REFRESH_SECRET: `openssl rand -base64 64`
- [ ] Domain name registered and pointing to VPS IP
- [ ] VPS provisioned with Ubuntu 20.04+ LTS
- [ ] SSH access to VPS confirmed
- [ ] Have Resend API key (or SMTP configured)
- [ ] Have Konnect payment gateway credentials
- [ ] Read QUICK_DEPLOY.md or DEPLOYMENT.md
- [ ] Backup plan in place

---

## 🚀 Typical Deployment Flow

1. **Prepare** (5 min)
   - Generate secrets with openssl
   - Ensure VPS is ready
   - Domain points to VPS IP

2. **Setup** (5 min)
   - SSH into VPS
   - Install Docker
   - Clone repository

3. **Configure** (5 min)
   - Copy .env.example → .env
   - Edit .env with secrets & domain
   - Update docker-compose.yml password

4. **Deploy** (3 min)
   - Build: `docker-compose build`
   - Start: `docker-compose up -d`

5. **Verify** (2 min)
   - Check containers: `docker-compose ps`
   - Test health: `curl http://localhost:5000/api/v1/health`
   - Test frontend: `curl http://localhost:3000`

6. **Proxy & SSL** (5 min)
   - Install Caddy or Nginx
   - Configure reverse proxy
   - Get SSL certificate (Caddy auto, or Let's Encrypt for Nginx)

7. **Monitor** (ongoing)
   - Check logs: `docker-compose logs -f`
   - Monitor health endpoint
   - Setup backups

**Total time: ~30 minutes** (first deployment)

---

## 🔧 Key Commands Reference

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View status
docker-compose ps

# View logs
docker-compose logs -f                 # All services
docker-compose logs -f backend         # Specific service
docker-compose logs backend --tail 50  # Last 50 lines

# Stop (keep data)
docker-compose stop

# Restart services
docker-compose restart

# Access MongoDB
docker-compose exec mongodb mongosh \
  -u admin -p changeme \
  --authenticationDatabase admin

# Backup database
docker-compose exec mongodb mongodump \
  --archive=/backup/mongo-$(date +%Y%m%d).archive \
  -u admin -p changeme \
  --authenticationDatabase admin

# Stop & remove containers (keep volumes)
docker-compose down

# Full cleanup (⚠️ removes data)
docker-compose down -v
```

---

## 🔐 Security Best Practices

1. **Secrets Management**
   - Generate strong secrets with `openssl rand -base64 64`
   - Never commit `.env` to git (.gitignore active)
   - Use different secrets for each environment

2. **Network Security**
   - Firewall: Only allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
   - Use HTTPS in production (not HTTP)
   - Change MongoDB credentials from defaults

3. **Access Control**
   - SSH key authentication preferred over password
   - Regular security updates for OS & Docker
   - Monitor logs for suspicious activity

4. **Data Protection**
   - Regular automated backups
   - Test restore procedures monthly
   - Encrypt backups if stored externally

---

## 📊 Service Ports & URLs

| Service | Local URL | Port | Production |
|---------|-----------|------|------------|
| Frontend | http://localhost:3000 | 3000 | https://yourdomain.com |
| Backend API | http://localhost:5000 | 5000 | https://api.yourdomain.com/api/v1 |
| MongoDB | localhost:27017 | 27017 | Internal (not exposed) |
| Health Check | http://localhost:5000/api/v1/health | 5000 | https://yourdomain.com/api/v1/health |

---

## 🆘 Getting Help

### Issue Type → Documentation

**Setup & Installation** → DEPLOYMENT.md (Step 1-3)
**Docker Problems** → README.DOCKER.md (Troubleshooting)
**Deployment Issues** → DEPLOYMENT.md (Troubleshooting)
**Database Issues** → DEPLOYMENT.md (Persistence & Backups)
**SSL/HTTPS Issues** → DEPLOYMENT.md (Step 7)
**General Reference** → README.DOCKER.md (Common Commands)

---

## 📋 File Sizes & Build Times

| Component | Size | Build Time |
|-----------|------|-----------|
| Backend image | ~500MB | 2-3 min |
| Frontend image | ~400MB | 3-4 min |
| MongoDB volume | ~50MB | - |
| Total first build | ~900MB | 5-7 min |

*Times vary based on internet speed and CPU*

---

## 🔄 Version Info

- **Docker Compose**: 3.8 (format version)
- **Node.js**: 20-alpine (LTS)
- **MongoDB**: 7.0-alpine (latest stable)
- **Next.js**: 16.1.6
- **Express**: 4.18.2
- **Prepared**: 2026-05-22

---

## ✨ What's Next

1. **Review** QUICK_DEPLOY.md
2. **Generate** secrets with openssl
3. **SSH** into VPS
4. **Follow** QUICK_DEPLOY.md step-by-step
5. **Monitor** with `docker-compose logs -f`
6. **Test** all endpoints
7. **Setup** backups

---

**Status: ✅ Ready for Production Deployment**

For questions or issues, refer to the appropriate documentation section above.
