# ⚡ Quick Deployment Checklist

Follow this checklist to deploy Ma Reservation to your VPS in ~15 minutes.

---

## 🔐 Pre-Deployment (Generate Secrets)

Run on your local machine:
```bash
openssl rand -base64 64  # Copy this for JWT_SECRET
openssl rand -base64 64  # Copy this for REFRESH_SECRET
```

---

## 🖥️ VPS Deployment

### 1. SSH into VPS
```bash
ssh root@145.223.118.9
# Enter password: 14#mFVoY3b7K9IAP3bV
```

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 3. Clone Repository
```bash
cd /app
git clone https://github.com/declared-as-ala/mareservation.git
cd mareservation
```

### 4. Configure Environment
```bash
cp .env.example .env
nano .env  # Edit the file
```

**Required changes in .env:**
```env
# Change MongoDB password (replace "changeme")
MONGO_URI=mongodb://admin:YOUR_STRONG_PASSWORD@mongodb:27017/mareservation?authSource=admin

# Paste your generated secrets
JWT_SECRET=paste-the-64-char-secret-here
REFRESH_SECRET=paste-the-64-char-secret-here

# Your domain (or IP if no domain)
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
FRONTEND_URL=https://yourdomain.com

# Email API key
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Payment gateway
KONNECT_API_KEY=your-api-key
KONNECT_SECRET_KEY=your-secret-key
```

### 5. Update docker-compose.yml MongoDB Password
```bash
nano docker-compose.yml
```

Find and change:
```yaml
MONGO_INITDB_ROOT_PASSWORD: changeme  # ← change this
```

To:
```yaml
MONGO_INITDB_ROOT_PASSWORD: YOUR_STRONG_PASSWORD  # ← same as .env
```

### 6. Start Containers
```bash
docker-compose build
docker-compose up -d
```

### 7. Verify Services
```bash
docker-compose ps        # Should show 3 services UP
curl http://localhost:5000/api/v1/health  # Should return {"status":"ok"}
curl http://localhost:3000  # Should return HTML
```

### 8. Setup Reverse Proxy (Choose One)

#### Option A: Caddy (Recommended — Auto HTTPS)
```bash
apt install -y caddy

cat > /etc/caddy/Caddyfile << 'EOF'
yourdomain.com {
    reverse_proxy /api/v1/* localhost:5000
    reverse_proxy localhost:3000
}
EOF

systemctl start caddy
systemctl enable caddy
```

#### Option B: Nginx
```bash
apt install -y nginx certbot python3-certbot-nginx

cat > /etc/nginx/sites-available/mareservation << 'EOF'
upstream backend {
    server localhost:5000;
}
upstream frontend {
    server localhost:3000;
}
server {
    listen 80;
    server_name yourdomain.com;
    location /api/v1 {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
EOF

ln -s /etc/nginx/sites-available/mareservation /etc/nginx/sites-enabled/
nginx -t
systemctl start nginx
systemctl enable nginx

# SSL
certbot --nginx -d yourdomain.com
```

### 9. Verify Production Access
```bash
# Test from your local machine
curl https://yourdomain.com/api/v1/health
curl https://yourdomain.com
```

---

## ✅ Post-Deployment Verification

- [ ] MongoDB is running: `docker-compose ps | grep mongodb`
- [ ] Backend is running: `docker-compose ps | grep backend`
- [ ] Frontend is running: `docker-compose ps | grep frontend`
- [ ] Health check works: `curl http://localhost:5000/api/v1/health`
- [ ] Frontend loads: `curl http://localhost:3000` (returns HTML)
- [ ] Reverse proxy configured
- [ ] HTTPS working: `curl https://yourdomain.com` (no errors)
- [ ] Database seeded: Check logs for seed completion

### Check Logs
```bash
# View recent logs
docker-compose logs --tail 50

# Follow logs live
docker-compose logs -f

# Specific service
docker-compose logs backend
```

---

## 🔧 Common Issues

### MongoDB password mismatch
```bash
# Error: auth failed
# Solution: .env MONGO_URI must match docker-compose.yml password
```

### Port 80/443 in use
```bash
# Kill process or check firewall
lsof -i :80
lsof -i :443
```

### Reverse proxy not working
```bash
# Check services are running
docker-compose ps

# Test direct backend
curl http://localhost:5000/api/v1/health

# Check reverse proxy config
nginx -t  # or caddy validate
```

### Frontend can't reach API
```bash
# Check NEXT_PUBLIC_API_URL in .env
# Must be the full production URL
# Rebuild if changed: docker-compose build frontend && docker-compose up -d
```

---

## 📊 Monitoring

### View Logs
```bash
docker-compose logs -f backend      # Live backend logs
docker-compose logs -f frontend     # Live frontend logs
docker-compose logs -f mongodb      # Live database logs
```

### Check Health
```bash
# Every 30 seconds
watch -n 30 'curl -s http://localhost:5000/api/v1/health'
```

### Database Connection
```bash
docker-compose exec mongodb mongosh \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --eval "db.categories.countDocuments()"
```

---

## 🚀 Daily Operations

### Restart Services
```bash
docker-compose restart
```

### View Latest Logs
```bash
docker-compose logs --tail 100 --follow
```

### Update Code
```bash
git pull
docker-compose build
docker-compose up -d
```

### Backup Database
```bash
docker-compose exec mongodb mongodump \
  --archive=/backup/mongo-$(date +%Y%m%d).archive \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin
```

---

## 🔐 Security Reminders

- [ ] Do NOT share `.env` file
- [ ] Do NOT commit `.env` to git
- [ ] Change MongoDB credentials from defaults
- [ ] Use HTTPS in production (not HTTP)
- [ ] Firewall: Only allow 22, 80, 443
- [ ] Keep Docker images updated
- [ ] Regular database backups
- [ ] Monitor logs for errors

---

## 📱 Test Scenarios

### Scenario 1: Login
1. Open https://yourdomain.com
2. Click "Connexion"
3. Enter admin@mareservation.tn / admin123
4. Should redirect to dashboard

### Scenario 2: Create Venue
1. Login as admin
2. Go to admin panel
3. Create new venue
4. Verify it appears in database

### Scenario 3: Reservation
1. Login as user
2. Browse venues
3. Select table/room
4. Make reservation
5. Check confirmation email

---

## 🆘 Need Help?

**Check these files:**
1. `README.DOCKER.md` — Docker reference
2. `DEPLOYMENT.md` — Detailed deployment guide
3. `DEPLOYMENT_READY.md` — Full architecture summary

**Common commands:**
```bash
docker-compose ps              # View status
docker-compose logs -f         # View logs
docker-compose restart         # Restart services
docker-compose down            # Stop containers
docker system prune            # Clean unused images
```

---

**Estimated time: 15 minutes**  
**Status: Ready for production deployment** ✅
