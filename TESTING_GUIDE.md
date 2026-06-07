# Testing Guide - AI Table Detection & 360° VR Viewer

## Quick Start Testing

### 1. Install Dependencies

**Frontend:**
```bash
# If using Docker
docker-compose exec frontend npm install

# Or locally
npm install
```

**Backend:**
```bash
# If using Docker (already installed)
# Or locally
cd backend
npm install
```

### 2. Start Services

```bash
# Start all services
docker-compose up -d

# Check services are running
docker-compose ps

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

### 3. Seed Database (if not done)

```bash
docker-compose exec backend npm run seed
```

## Testing the 360° VR Viewer

### Step 1: Access a Venue
1. Open browser: `http://localhost:5173`
2. Navigate to any venue:
   - Click "Explorer" → Select a venue
   - Or go directly: `http://localhost:5173/lieu/1`

### Step 2: Test 360° Rotation
1. **Mouse**: Click and drag on the 360° view to rotate
2. **Touch (Mobile)**: Swipe left/right to rotate
3. **Verify**: Image should rotate smoothly

### Step 3: Test Table Hotspots
1. **Hover** over table markers (green/gold circles)
2. **Verify**: Tooltip appears with table info
3. **Click** on a table marker
4. **Verify**: Table is selected (ring highlight appears)
5. **Check**: Reservation panel updates with selected table

### Step 4: Test AI Detection
1. Click **"Détecter les tables (AI)"** button
2. **First time**: Wait for model to load (~5-10 seconds)
   - Progress message: "Chargement du modèle AI..."
3. **Detection**: Wait for detection to complete
   - Progress: "Détection des tables en cours..."
4. **Results**: 
   - Success: "✅ X table(s) détectée(s) !"
   - Or: "ℹ️ Aucune table détectée, utilisation des coordonnées manuelles"
5. **Verify**: New hotspots appear or existing ones update

## Testing Scenarios

### Scenario 1: Basic 360° View
- ✅ Image displays correctly
- ✅ Can drag to rotate
- ✅ Table hotspots are visible
- ✅ Hover shows tooltip
- ✅ Click selects table

### Scenario 2: AI Detection
- ✅ Button is visible
- ✅ Clicking starts detection
- ✅ Progress messages appear
- ✅ Detection completes
- ✅ Tables update in view

### Scenario 3: Table Selection & Reservation
1. Select a table from 360° view
2. Choose date and time
3. Click "Réserver cette table"
4. Fill in reservation form
5. Submit reservation
6. Verify confirmation

### Scenario 4: Mobile Testing
1. Open on mobile device or resize browser
2. Test touch drag to rotate
3. Test tap on table hotspots
4. Verify responsive layout

## Expected Behavior

### AI Detection
- **First Click**: Model loads (5-10 seconds)
- **Subsequent Clicks**: Faster (model cached)
- **Detection Time**: 1-3 seconds per image
- **Results**: Tables detected or fallback to manual

### 360° Viewer
- **Rotation**: Smooth, responsive
- **Hotspots**: Visible, clickable
- **Tooltips**: Appear on hover
- **Selection**: Visual feedback

## Troubleshooting

### AI Detection Not Working

**Check Browser Console:**
```javascript
// Open DevTools (F12) → Console
// Look for errors like:
// - "Failed to load model"
// - "CORS error"
// - "TensorFlow.js error"
```

**Common Issues:**

1. **Model Not Loading**
   - Check internet connection (model downloads from CDN)
   - Check browser console for errors
   - Try hard refresh (Ctrl+Shift+R)

2. **CORS Error**
   - Image must be from same origin or CORS-enabled
   - Use images from your server, not external URLs

3. **Detection Returns No Results**
   - Image might not contain clear table objects
   - Try with a different image
   - Check image quality/resolution

4. **Slow Detection**
   - First time: Normal (model download)
   - Subsequent: Should be faster
   - Check browser performance

### 360° Viewer Issues

1. **Rotation Not Working**
   - Check if image is wide enough
   - Verify CSS transforms are supported
   - Check browser console for errors

2. **Hotspots Not Visible**
   - Check table coordinates are valid (0-100)
   - Verify tables array is not empty
   - Check z-index and positioning

3. **Click Not Working**
   - Check pointer-events CSS
   - Verify event handlers are attached
   - Check for overlapping elements

## Test Checklist

- [ ] Frontend loads at http://localhost:5173
- [ ] Backend API responds at http://localhost:3001/health
- [ ] Can navigate to venue page
- [ ] 360° view displays correctly
- [ ] Can drag to rotate view
- [ ] Table hotspots are visible
- [ ] Hover shows tooltip
- [ ] Click selects table
- [ ] AI detection button is visible
- [ ] AI detection works (after model loads)
- [ ] Detection progress messages appear
- [ ] Tables update after detection
- [ ] Reservation flow works
- [ ] Mobile touch controls work

## Performance Testing

### Load Times
- Initial page load: < 3 seconds
- Model load (first time): 5-10 seconds
- Detection time: 1-3 seconds
- Subsequent detections: < 2 seconds

### Memory Usage
- Check browser DevTools → Performance
- Model uses ~50-100MB
- Should be stable, no memory leaks

## API Testing

### Test Backend Detection Endpoint

```bash
# Health check
curl http://localhost:3001/api/detection/status

# Test detection (with image URL)
curl -X POST http://localhost:3001/api/detection/detect-tables \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/panorama.jpg"}'
```

## Next Steps After Testing

1. **If AI detection works**: Great! You can use it for new venues
2. **If detection is slow**: Consider backend Python service
3. **If accuracy is low**: Train custom model on restaurant images
4. **If errors occur**: Check console logs and fix issues

## Demo Flow

1. **Home** → Click "Explorer les lieux"
2. **Explorer** → Click any venue card
3. **Venue Details** → See 360° view
4. **Drag** to rotate and explore
5. **Hover** over tables to see info
6. **Click** "Détecter les tables (AI)"
7. **Wait** for detection (~5-10 seconds first time)
8. **See** detected tables appear
9. **Click** a table to select
10. **Choose** date/time
11. **Click** "Réserver cette table"
12. **Fill** reservation form
13. **Submit** and see confirmation

## Success Indicators

✅ 360° view rotates smoothly
✅ Table hotspots are interactive
✅ AI detection finds tables
✅ Detection progress is visible
✅ Tables update after detection
✅ Reservation flow completes
✅ Mobile controls work
