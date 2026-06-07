# 360° VR Venue Viewer - Implementation Guide

## Overview

The MaTable platform now features an interactive 360° VR-style venue viewer with dynamic table hotspots, real-time availability, and AI-ready table detection.

## Features Implemented

### ✅ Interactive 360° Viewer
- **Drag to Rotate**: Mouse drag or touch swipe to explore the venue
- **Smooth Rotation**: CSS transforms for fluid 360° panorama viewing
- **Fullscreen Mode**: Immersive fullscreen experience
- **Mobile Support**: Touch gestures for rotation and interaction

### ✅ Dynamic Table Hotspots
- **Visual Indicators**: 
  - Green = Available tables
  - Gold/Accent = VIP tables
  - Gray = Reserved tables
- **Hover Effects**: Pulsing animation and detailed tooltips
- **Click to Select**: Direct table selection from 360° view
- **Real-time Updates**: Availability updates based on selected date/time

### ✅ Enhanced Interactions
- **Tooltips**: Show table number, capacity, location, and price on hover
- **Selection Highlight**: Selected table has ring highlight
- **Smooth Animations**: All interactions are animated for better UX

### ✅ AI Table Detection Structure
- **Service Layer**: `src/app/services/tableDetection.ts`
- **Backend Endpoint**: `/api/detect-tables` (ready for AI integration)
- **Detection Methods**:
  - Browser-based (TensorFlow.js) - Ready for implementation
  - Server-side (Python/TensorFlow) - Ready for implementation
  - Manual coordinates - Currently active

## Component Structure

### VirtualTour360 Component
Location: `src/app/components/VirtualTour360.tsx`

**Props:**
```typescript
interface VirtualTour360Props {
  backgroundImage: string;      // URL of 360° panoramic image
  tables: Table[];              // Array of tables with coordinates
  onTableSelect: (table: Table) => void;  // Callback when table is selected
  selectedTableId?: string;     // Currently selected table ID
}
```

**Features:**
- 360° rotation via mouse drag or touch
- Dynamic hotspot rendering based on table coordinates
- Real-time hover detection
- Fullscreen support
- Mobile-friendly touch controls

## Table Detection Service

### Current Implementation
Tables are currently positioned using manual coordinates stored in the database:
```typescript
{
  coordinates: { x: 20, y: 30 },  // Percentage-based (0-100)
  number: 1,
  capacity: 2,
  location: "Près de la fenêtre",
  price: 45,
  status: "available" | "reserved" | "vip"
}
```

### AI Integration Ready

The service layer is structured for easy AI integration:

#### Option 1: Browser-based (TensorFlow.js)
```typescript
// In src/app/services/tableDetection.ts
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export async function detectTablesWithTensorFlow(
  imageElement: HTMLImageElement
): Promise<DetectionResult[]> {
  const model = await cocoSsd.load();
  const predictions = await model.detect(imageElement);
  // Filter and convert to coordinates
}
```

#### Option 2: Backend API (Python/TensorFlow)
```typescript
// Call backend detection service
export async function detectTablesViaAPI(imageUrl: string) {
  const response = await fetch('/api/detect-tables', {
    method: 'POST',
    body: JSON.stringify({ imageUrl }),
  });
  return response.json();
}
```

## Backend API

### Table Detection Endpoint
**POST** `/api/detect-tables`

**Request:**
```json
{
  "imageUrl": "https://example.com/panorama.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "detections": [
    {
      "tableId": "detected-123",
      "coordinates": { "x": 25.5, "y": 40.2 },
      "confidence": 0.95,
      "boundingBox": { "x": 100, "y": 200, "width": 150, "height": 100 },
      "metadata": {
        "capacity": 4,
        "type": "standard",
        "location": "Centre de la salle"
      }
    }
  ]
}
```

## Integration with VenueDetails

The `VenueDetails` page automatically uses the new `VirtualTour360` component:

```typescript
<VirtualTour360
  backgroundImage={venue.images[0]}
  tables={tables}
  onTableSelect={handleTableSelect}
  selectedTableId={selectedTable?.id}
/>
```

## Mobile Support

### Touch Gestures
- **Single Touch Drag**: Rotate 360° view
- **Tap**: Select table hotspot
- **Long Press**: Show table details

### Responsive Design
- Adapts to all screen sizes
- Touch-optimized hotspot sizes
- Mobile-friendly tooltips

## Future Enhancements

### AI Table Detection
1. **Install TensorFlow.js**:
   ```bash
   npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
   ```

2. **Implement Detection**:
   - Load COCO-SSD model
   - Detect "dining table" objects
   - Convert bounding boxes to panorama coordinates
   - Merge with existing table metadata

### Backend AI Service
1. **Python Microservice**:
   - Use TensorFlow/PyTorch
   - YOLO or Faster R-CNN model
   - Process uploaded images
   - Return table coordinates

2. **Integration**:
   - Upload image to backend
   - Call detection service
   - Store results in database

### VR Headset Support
- WebXR API integration
- Head tracking for 360° view
- Controller support for table selection

### Advanced Features
- Auto-rotate to highlight available tables
- 3D floor plan overlay
- Table capacity estimation from image
- Location type detection (window, terrace, etc.)

## Usage Example

```typescript
import { VirtualTour360 } from '../components/VirtualTour360';
import { detectTablesInImage } from '../services/tableDetection';

// In your component
const [tables, setTables] = useState<Table[]>([]);

useEffect(() => {
  // Optionally detect tables from image
  detectTablesInImage(venueImage, existingTables)
    .then(detections => {
      const merged = mergeDetectedTables(detections, existingTables);
      setTables(merged);
    });
}, [venueImage]);

return (
  <VirtualTour360
    backgroundImage={venueImage}
    tables={tables}
    onTableSelect={(table) => {
      setSelectedTable(table);
      // Navigate to reservation
    }}
    selectedTableId={selectedTable?.id}
  />
);
```

## Testing

1. **Test 360° Rotation**:
   - Drag mouse or swipe on mobile
   - Verify smooth rotation
   - Check that hotspots move correctly

2. **Test Hotspot Interaction**:
   - Hover over tables (tooltip appears)
   - Click tables (selection works)
   - Verify reserved tables are disabled

3. **Test Mobile**:
   - Touch and drag to rotate
   - Tap hotspots to select
   - Verify responsive layout

## Performance Considerations

- **Image Optimization**: Use compressed panoramic images
- **Lazy Loading**: Load 360° view only when needed
- **Hotspot Rendering**: Only render visible hotspots
- **Animation**: Use CSS transforms for smooth performance

## Troubleshooting

### Hotspots not appearing
- Check table coordinates are valid (0-100)
- Verify tables array is not empty
- Check console for errors

### Rotation not working
- Ensure image is wide enough (should be 4x width for 360°)
- Check CSS transforms are supported
- Verify event handlers are attached

### Mobile touch not working
- Check touch event handlers
- Verify viewport meta tag
- Test on actual device (not just emulator)

## Next Steps

1. **Add AI Detection**: Integrate TensorFlow.js or backend service
2. **Improve Panorama**: Use equirectangular projection for true 360°
3. **Add VR Support**: Implement WebXR for headset support
4. **Optimize Performance**: Implement viewport culling for hotspots
5. **Add Analytics**: Track table selection patterns
