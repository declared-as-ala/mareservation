# 🐳 Ma Reservation — Docker Deployment

This project is configured for containerized deployment using **Docker** and **Docker Compose**.

## Quick Start — Local Development

### Prerequisites
- Docker & Docker Compose installed
- 4GB+ RAM available

### 1. Clone & Setup
```bash
git clone https://github.com/declared-as-ala/mareservation.git
cd mareservation
cp .env.example .env
```

### 2. Configure .env
Edit `.env` and set required variables:
```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
MONGO_URI=mongodb://admin:changeme@mongodb:27017/mareservation?authSource=admin
JWT_SECRET=dev-secret-at-least-32-chars-long
REFRESH_SECRET=dev-refresh-secret-at-least-32-chars
```

### 3. Start Services
```bash
docker-compose up -d
```

Services are now available:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/v1
- **MongoDB**: localhost:27017 (admin/changeme)

### 4. Verify
```bash
# Check all services are running
docker-compose ps

# View logs
docker-compose logs -f

# Test backend health
curl http://localhost:5000/api/v1/health

# Test frontend
curl http://localhost:3000
```

---

## Production Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed VPS deployment instructions.

### Quick Summary
1. SSH into VPS, install Docker
2. Clone repository
3. Create `.env` with production secrets
4. Run `docker-compose up -d`
5. Setup reverse proxy (Nginx/Caddy)
6. Configure SSL (Let's Encrypt)

---

## Architecture

```
┌──────────────────────────────────────┐
│         Docker Compose Network       │
│  (mareservation-network - bridge)    │
└──────────────────────────────────────┘
         │              │              │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │          │   │          │   │          │
┌───┴──┐  ┌────┴──┐  ┌───────┴──┐
│      │  │       │  │          │
│ MONGO│  │BACKEND│  │ FRONTEND │
│ 27017│  │  5000 │  │   3000   │
│      │  │       │  │          │
└──────┘  └───────┘  └──────────┘
   (db)  (API)      (UI)
```

---

## Files & Structure

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Multi-container orchestration (MongoDB, backend, frontend) |
| `Dockerfile` | Next.js frontend build & serve |
| `backend/Dockerfile` | Express backend build & serve |
| `backend/scripts/seed.js` | MongoDB initialization (runs on first container start) |
| `.env.example` | Environment variable template |
| `DEPLOYMENT.md` | Production deployment guide |

---

## Environment Variables

### Required
- `NEXT_PUBLIC_API_URL` — Frontend's API endpoint
- `NODE_ENV` — `development` or `production`
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — Auth token secret (min 32 chars)
- `REFRESH_SECRET` — Refresh token secret (min 32 chars)

### Optional
- `RESEND_API_KEY` — Email service
- `KONNECT_API_KEY` — Payment gateway
- `FRONTEND_URL` — For CORS

See `.env.example` for all options.

---

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs backend --tail 100

# Since 30 minutes ago
docker-compose logs --since 30m
```

### Restart Services
```bash
# All
docker-compose restart

# Specific
docker-compose restart backend
docker-compose restart frontend
```

### Stop (keep data)
```bash
docker-compose stop
```

### Stop & Remove Containers (keep volumes/data)
```bash
docker-compose down
```

### Full cleanup (⚠️ removes data!)
```bash
docker-compose down -v
```

### Rebuild After Code Changes
```bash
docker-compose build
docker-compose up -d
```

### Rebuild without cache
```bash
docker-compose build --no-cache
docker-compose up -d
```

---

## Persistent Data

### MongoDB Data
Stored in `mongodb_data` Docker volume. Persists across:
- Container restarts
- `docker-compose down` (without `-v`)

### Seed on First Run
`backend/scripts/seed.js` runs automatically when the MongoDB container first starts:
- Creates indexes
- Seeds categories, tags, and admin user
- Initializes default settings

To reseed:
```bash
docker-compose down -v  # Remove volume
docker-compose up -d     # Fresh start with new seed
```

---

## Troubleshooting

### Backend can't connect to MongoDB
```bash
# Check MongoDB is healthy
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Verify MONGO_URI in .env matches docker-compose setup
```

### Frontend won't load API
```bash
# Check NEXT_PUBLIC_API_URL is set correctly
docker-compose config | grep -A 20 frontend

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d
```

### Port already in use
```bash
# Find what's using port 5000
lsof -i :5000

# Change port in docker-compose.yml
# Or stop the conflicting service
```

### Container exited unexpectedly
```bash
# Check exit code and logs
docker-compose ps

# View detailed logs
docker-compose logs backend

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

---

## Security Notes

- **Never commit `.env`** — uses gitignored file
- **Generate strong secrets** — `openssl rand -base64 64`
- **Change MongoDB credentials** — update both docker-compose.yml and .env
- **Enable reverse proxy** — use Nginx/Caddy for production
- **Use HTTPS** — Let's Encrypt with Caddy/Certbot

---

## Database Management

### Access MongoDB
```bash
docker-compose exec mongodb mongosh \
  -u admin \
  -p changeme \
  --authenticationDatabase admin \
  mareservation
```

### Backup
```bash
docker-compose exec mongodb mongodump \
  --archive=/backup/mongo-$(date +%Y%m%d).archive \
  -u admin \
  -p changeme \
  --authenticationDatabase admin
```

### Restore
```bash
docker-compose exec mongodb mongorestore \
  --archive=/backup/mongo-20260101.archive \
  -u admin \
  -p changeme \
  --authenticationDatabase admin
```

---

## Performance Tips

1. **Volume mounts** — Use named volumes over bind mounts for better performance
2. **Layer caching** — Rebuild only what changed using Docker layer caching
3. **Multi-stage builds** — Frontend Dockerfile uses multi-stage to reduce image size
4. **Resource limits** — Set memory/CPU limits in docker-compose.yml if needed:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 1G
   ```

---

## Updates & Maintenance

### Update Code
```bash
git pull
docker-compose build
docker-compose up -d
```

### Cleanup Unused Images
```bash
docker image prune
```

### Monitor Disk Usage
```bash
docker system df
docker volume ls
```

---

## Next Steps

1. Read **[DEPLOYMENT.md](./DEPLOYMENT.md)** for production setup
2. Configure environment variables
3. Test locally with `docker-compose up`
4. Push to your VPS
5. Setup reverse proxy & HTTPS
6. Enable monitoring & backups

---

**Questions?** Check the main README.md or DEPLOYMENT.md for more details.
