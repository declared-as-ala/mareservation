# MaTable - Full-Stack Setup Guide

This guide will help you set up and run the complete MaTable application with frontend, backend, and database.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- npm, yarn, or pnpm

## Quick Start with Docker

The easiest way to run the entire application is using Docker Compose:

```bash
# Clone the repository (if not already done)
cd MaTable

# Start all services (frontend, backend, database)
docker-compose up -d

# Seed the database with initial data
docker-compose exec backend npm run seed

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001
# MongoDB: localhost:27017
```

## Manual Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB (if not using Docker)
# Or use MongoDB Atlas connection string

# Start development server
npm run dev

# Seed database (in a separate terminal)
npm run seed
```

### 2. Frontend Setup

```bash
# From project root
npm install

# Create .env file
cp .env.example .env
# Edit .env with API URL (default: http://localhost:3001)

# Start development server
npm run dev
```

### 3. Database Setup

The application uses MongoDB. You can either:

**Option A: Use Docker (Recommended)**
```bash
docker-compose up mongodb -d
```

**Option B: Install MongoDB locally**
- Download from https://www.mongodb.com/try/download/community
- Start MongoDB service
- Update `MONGODB_URI` in backend `.env`

**Option C: Use MongoDB Atlas**
- Create a free cluster at https://www.mongodb.com/cloud/atlas
- Get connection string
- Update `MONGODB_URI` in backend `.env`

## Environment Variables

### Backend (.env)

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://mongodb:27017/matable
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001
```

## API Endpoints

### Venues
- `GET /api/venues` - List all venues (filters: type, city, hasEvent)
- `GET /api/venues/:id` - Get venue details with tables and events

### Tables
- `GET /api/tables/venue/:venueId` - Get tables for a venue (optional: dateTime query)
- `POST /api/tables/:id/reserve` - Reserve a table (requires auth)

### Events
- `GET /api/events` - List events (filters: city, type, venueId)
- `GET /api/events/:id` - Get event details

### Reservations
- `GET /api/reservations` - Get user's reservations (requires auth)
- `GET /api/reservations/:id` - Get reservation details (requires auth)
- `PATCH /api/reservations/:id/cancel` - Cancel reservation (requires auth)

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

## Test Credentials

After seeding the database, you can use:

- **Customer**: `customer@test.com` / `password123`
- **Owner**: `owner@test.com` / `password123`

## Development Workflow

1. **Start MongoDB** (if not using Docker):
   ```bash
   # macOS/Linux
   mongod

   # Windows
   # Start MongoDB service from Services
   ```

2. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Frontend** (in a new terminal):
   ```bash
   npm run dev
   ```

4. **Seed Database** (first time only):
   ```bash
   cd backend
   npm run seed
   ```

## Building for Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
npm run build
# Output in dist/ directory
```

## Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up -d --build

# Access backend container
docker-compose exec backend sh

# Access MongoDB
docker-compose exec mongodb mongosh
```

## Troubleshooting

### Backend won't start
- Check if MongoDB is running
- Verify `MONGODB_URI` in `.env`
- Check if port 3001 is available

### Frontend can't connect to API
- Verify `VITE_API_URL` in frontend `.env`
- Check if backend is running on correct port
- Check CORS settings in backend

### Database connection issues
- Verify MongoDB is running
- Check connection string format
- For Docker: ensure containers are on same network

### Port already in use
- Change ports in `docker-compose.yml` or `.env` files
- Kill process using the port

## Project Structure

```
MaTable/
├── backend/              # Node.js + Express backend
│   ├── src/
│   │   ├── models/      # MongoDB models
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Auth middleware
│   │   └── scripts/     # Seed script
│   └── Dockerfile
├── src/                 # React frontend
│   ├── app/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── services/    # API service
│   │   └── context/     # React context
│   └── styles/          # CSS files
├── docker-compose.yml   # Docker orchestration
└── Dockerfile           # Frontend Dockerfile
```

## Next Steps

1. Customize the seed data in `backend/src/scripts/seed.ts`
2. Add your own venue images and data
3. Configure email/SMS notifications (optional)
4. Set up production environment variables
5. Deploy to your preferred hosting platform

## Support

For issues or questions, please check:
- Backend logs: `docker-compose logs backend`
- Frontend console: Browser DevTools
- MongoDB logs: `docker-compose logs mongodb`
