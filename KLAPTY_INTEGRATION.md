# Klapty 360° Tour Integration Guide

## Overview

The MaTable platform now supports Klapty 360° tours with AI table detection. You can embed Klapty tours and detect tables directly from the interactive 360° view.

## How It Works

1. **Embed Klapty Tour**: The venue page automatically detects if a Klapty tour URL is available
2. **Interactive 360° View**: Users can explore the venue using Klapty's native controls
3. **AI Table Detection**: Click "Détecter" button to capture current view and detect tables
4. **Dynamic Hotspots**: Detected tables appear as interactive markers on the tour

## Setup

### 1. Add Klapty Tour URL to Venue

**Option A: Via Database**
```javascript
// Update venue with Klapty tour URL
{
  "klaptyTourUrl": "https://www.klapty.com/tour/tunnel/sVK0IMVEyT"
}
```

**Option B: Via API**
```bash
PATCH /api/venues/:id
{
  "klaptyTourUrl": "https://www.klapty.com/tour/tunnel/sVK0IMVEyT"
}
```

**Option C: Auto-detect from Description**
If the venue description contains a Klapty URL, it will be automatically extracted.

### 2. Component Usage

The `KlaptyTour360` component automatically replaces `VirtualTour360` when a Klapty URL is detected:

```typescript
// In VenueDetails.tsx
{klaptyTourUrl ? (
  <KlaptyTour360
    tourUrl={klaptyTourUrl}
    tables={tables}
    onTableSelect={handleTableSelect}
    selectedTableId={selectedTable?.id}
  />
) : (
  <VirtualTour360
    backgroundImage={backgroundImage}
    tables={tables}
    onTableSelect={handleTableSelect}
    selectedTableId={selectedTable?.id}
  />
)}
```

## Features

### ✅ Interactive 360° Tour
- Full Klapty tour embedded
- Native Klapty controls (zoom, rotate, navigate)
- VR support if available

### ✅ AI Table Detection
- **Capture Button**: Click camera icon to capture current view
- **Screenshot**: Uses html2canvas to capture iframe view
- **AI Detection**: TensorFlow.js detects tables in captured image
- **Hotspot Overlay**: Detected tables appear as interactive markers

### ✅ Dynamic Hotspots
- Green = Available tables
- Gold = VIP tables
- Gray = Reserved tables
- Hover for details
- Click to select

## Usage

### For Users

1. **Explore Tour**: Use Klapty controls to navigate
2. **Capture View**: Click "Détecter" button (camera icon)
3. **Wait for Detection**: AI analyzes the current view
4. **See Results**: Tables appear as hotspots
5. **Select Table**: Click hotspot to reserve

### For Developers

**Add Klapty Tour to Venue:**
```typescript
// In seed script or API
await Venue.updateOne(
  { name: "Le Baroque" },
  { 
    klaptyTourUrl: "https://www.klapty.com/tour/tunnel/sVK0IMVEyT" 
  }
);
```

**Test Detection:**
1. Navigate to venue with Klapty tour
2. Rotate to view with tables visible
3. Click "Détecter" button
4. Wait for detection (5-10 seconds)
5. Verify tables appear as hotspots

## Technical Details

### Capture Method

Due to CORS restrictions, we use `html2canvas` to capture the iframe:

```typescript
const html2canvas = await import('html2canvas');
const canvas = await html2canvas(container, {
  useCORS: true,
  allowTaint: true,
});
```

### Detection Flow

1. User clicks "Détecter"
2. Current view is captured as screenshot
3. Image is converted to data URL
4. TensorFlow.js model analyzes image
5. Tables are detected and converted to coordinates
6. Hotspots are overlaid on tour

### Coordinate System

- Hotspots use percentage-based coordinates (0-100%)
- Positioned relative to container dimensions
- Adjust automatically when tour rotates

## Limitations

1. **CORS Restrictions**: Cannot directly access iframe content
2. **Screenshot Quality**: Depends on html2canvas rendering
3. **Detection Accuracy**: Varies based on view angle and lighting
4. **Single View**: Detects tables from current view only

## Troubleshooting

### Detection Not Working

**Check:**
- html2canvas is installed: `npm install html2canvas`
- TensorFlow.js model is loaded
- Browser console for errors
- Network tab for model download

### Hotspots Not Appearing

**Check:**
- Tables array is not empty
- Coordinates are valid (0-100%)
- Overlay is enabled (`showOverlay={true}`)

### Tour Not Loading

**Check:**
- Klapty URL is valid
- Iframe is not blocked by browser
- Network connection is active

## Example Klapty URLs

```
https://www.klapty.com/tour/tunnel/sVK0IMVEyT
https://www.klapty.com/tour/venue/ABC123
https://www.klapty.com/tour/restaurant/XYZ789
```

## Next Steps

1. **Improve Detection**: Train custom model on restaurant images
2. **Multiple Views**: Detect tables from multiple angles
3. **Auto-Detection**: Automatically detect when tour loads
4. **VR Support**: Enhanced VR table selection

## API Endpoints

### Update Venue with Klapty URL

```bash
PATCH /api/venues/:id
Content-Type: application/json

{
  "klaptyTourUrl": "https://www.klapty.com/tour/tunnel/sVK0IMVEyT"
}
```

### Get Venue with Klapty Tour

```bash
GET /api/venues/:id

Response:
{
  "_id": "...",
  "name": "Le Baroque",
  "klaptyTourUrl": "https://www.klapty.com/tour/tunnel/sVK0IMVEyT",
  ...
}
```
