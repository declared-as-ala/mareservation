# Quick Test Guide

## ✅ Services Status

All services should be running:
- ✅ Frontend: http://localhost:5173
- ✅ Backend: http://localhost:3001
- ✅ MongoDB: localhost:27017

## 🧪 Test Steps

### 1. Test Backend API

**Health Check:**
```
http://localhost:3001/health
```

**Detection Status:**
```
http://localhost:3001/api/detection/status
```

### 2. Test Frontend

1. **Open**: http://localhost:5173
2. **Navigate**: Click "Explorer" or "Restaurants"
3. **Select Venue**: Click any venue card
4. **360° View**: Should see interactive panorama

### 3. Test 360° Features

- **Drag to Rotate**: Click and drag on image
- **Hover Tables**: Move mouse over green/gold markers
- **Click Table**: Click a marker to select
- **Fullscreen**: Click maximize button (top right)

### 4. Test AI Detection

1. **Click Button**: "Détecter les tables (AI)" (top right of 360° section)
2. **Wait**: First time loads model (~5-10 seconds)
3. **Watch Progress**: 
   - "Chargement du modèle AI..."
   - "Détection des tables en cours..."
   - "✅ X table(s) détectée(s) !"
4. **Verify**: Tables update in view

### 5. Test Reservation

1. **Select Table**: Click table from 360° view
2. **Choose Date**: Select date
3. **Choose Time**: Select time
4. **Click**: "Réserver cette table"
5. **Fill Form**: Enter details
6. **Submit**: Complete reservation

## 🔍 Troubleshooting

### Backend Not Responding
```bash
docker-compose restart backend
docker-compose logs backend
```

### Frontend Not Loading
```bash
docker-compose restart frontend
docker-compose logs frontend
```

### AI Detection Not Working
- Check browser console (F12)
- Verify TensorFlow.js is installed
- Check network tab for model download

### API Errors
- Check backend logs: `docker-compose logs backend`
- Verify MongoDB is running: `docker-compose ps`
- Test health endpoint: http://localhost:3001/health

## ✅ Success Indicators

- [ ] Frontend loads at http://localhost:5173
- [ ] Can navigate to venues
- [ ] 360° view displays
- [ ] Can drag to rotate
- [ ] Table hotspots work
- [ ] AI detection button visible
- [ ] Detection completes
- [ ] Reservation flow works

## 📝 Test Data

Use these test credentials:
- **Email**: customer@test.com
- **Password**: password123

Or create a new account via signup.
