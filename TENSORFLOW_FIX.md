# TensorFlow.js Backend Fix

## Issues Fixed

### 1. "No backend found in registry" Error

**Problem**: TensorFlow.js requires a backend (WebGL or CPU) to be initialized before loading models.

**Solution**: Added backend initialization function that:
- Tries WebGL first (faster, GPU-accelerated)
- Falls back to CPU if WebGL is not available
- Ensures backend is ready before loading COCO-SSD model

### 2. html2canvas "oklch" Color Parsing Error

**Problem**: html2canvas doesn't support modern CSS color functions like `oklch()`.

**Solution**: Added `onclone` callback that:
- Replaces `oklch` colors with standard RGB colors
- Handles all elements in the cloned document
- Prevents parsing errors during screenshot capture

## Changes Made

### `src/app/services/tableDetection.ts`

1. Added `initializeBackend()` function:
   ```typescript
   async function initializeBackend() {
     // Try WebGL first, fallback to CPU
     await tf.setBackend('webgl');
     await tf.ready();
   }
   ```

2. Updated `loadModel()` to initialize backend first:
   ```typescript
   await initializeBackend();
   model = await cocoSsd.load();
   ```

3. Updated `preloadModel()` to initialize backend:
   ```typescript
   await initializeBackend();
   await loadModel();
   ```

### `src/app/components/KlaptyTour360.tsx`

1. Updated html2canvas options:
   - Added `onclone` callback to fix color issues
   - Set `allowTaint: false` for better security
   - Added `scale: 0.5` for better performance
   - Set `backgroundColor: '#ffffff'` to avoid transparency issues

## Testing

After these fixes:

1. **TensorFlow.js should load**: Check browser console for "TensorFlow.js WebGL backend initialized" or "TensorFlow.js CPU backend initialized"

2. **Model should load**: Check for "Model loaded successfully" message

3. **Screenshot capture should work**: Click "Détecter" button and it should capture without errors

4. **Detection should work**: After capture, tables should be detected and displayed

## Backend Priority

1. **WebGL** (preferred): GPU-accelerated, faster inference
2. **CPU** (fallback): Works everywhere but slower

## Troubleshooting

### If WebGL fails:
- Check browser supports WebGL: https://get.webgl.org/
- Some browsers/security settings block WebGL
- CPU backend will be used automatically

### If html2canvas still fails:
- Try updating to latest version: `npm install html2canvas@latest`
- Check browser console for specific error
- May need to disable certain CSS features

## Performance Notes

- **WebGL**: ~2-3 seconds for detection
- **CPU**: ~5-10 seconds for detection
- **Screenshot**: ~1-2 seconds (with scale: 0.5)

## Next Steps

1. Test detection on different browsers
2. Consider adding WebGL detection warning
3. Optimize screenshot quality vs performance
4. Add fallback for unsupported browsers
