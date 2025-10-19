# Bounding Box Annotation Feature

## Overview
A comprehensive bounding box annotation system has been added to the Image Analysis Comparison modal in the InspectionDetail page. This feature allows users to annotate thermal anomalies with precise boundary boxes and detailed metadata.

## Features

### 1. **Annotation Mode**
- Toggle annotation mode with the "Annotate Boxes" button in the modal header
- When active, both thermal and analysis result images become annotatable
- Visual indicators show when annotation mode is enabled

### 2. **Drawing Bounding Boxes**
- **Click once** on an image to start drawing a box
- **Move cursor** to define the rectangular area
- **Click again** to complete the box
- Real-time preview shows the box as you draw

### 3. **3x Zoom Integration**
- The existing 3x zoom feature still works when annotation mode is OFF
- When annotation mode is ON, it switches to box drawing mode
- Hover zoom helps precisely locate anomalies before annotating

### 4. **Annotation Metadata**
After completing a bounding box, a form appears to collect:

- **Anomaly State*** (Required)
  - Faulty
  - Potentially Faulty
  - Normal

- **Confidence Score*** (Required)
  - Slider from 0-100%
  - Indicates confidence in the anomaly assessment

- **Risk Type*** (Required for Faulty/Potentially Faulty)
  - Point fault
  - Full wire overload
  - Transformer overload
  - Auto-disabled for "Normal" state

- **Description** (Optional)
  - Text area for additional notes

### 5. **Visual Indicators**
Bounding boxes are color-coded based on anomaly state:
- **Red** - Faulty
- **Orange** - Potentially Faulty
- **Green** - Normal
- **Yellow** - Selected box

Each box displays:
- Anomaly state label
- Confidence score
- Delete button (when selected)

### 6. **Box Management**
- Click on any box to select it
- Selected boxes show a delete button
- Can annotate both thermal and result images separately
- Box count displayed in export button

### 7. **Data Export**
- Click "Export" button to save annotations
- Generates JSON file: `inspection-{id}-annotations.json`
- Ready to send to backend API

## Data Structure

### BoundingBox Object
```json
{
  "id": "box-1697712345678",
  "startX": 25.5,
  "startY": 30.2,
  "endX": 45.8,
  "endY": 50.1,
  "anomalyState": "Faulty",
  "confidenceScore": 85,
  "riskType": "Point fault",
  "description": "Overheating detected on wire connection",
  "imageType": "thermal"
}
```

### Coordinates
- All coordinates are **percentages** (0-100) relative to image dimensions
- Makes annotations resolution-independent
- Easy to map to actual pixel coordinates on backend

## Usage Workflow

1. **Open Image Comparison**
   - Navigate to Inspection Detail
   - Click "Compare Images" button in Annotation Tools tab

2. **Enable Annotation Mode**
   - Click "Annotate Boxes" button
   - Blue banner confirms mode is active

3. **Draw Boxes**
   - Click to start, move cursor, click to finish
   - Draw on either thermal or result image

4. **Fill Metadata**
   - Form appears automatically
   - Fill required fields (marked with *)
   - Click "Save Annotation"

5. **Manage Annotations**
   - Click boxes to select/deselect
   - Delete unwanted boxes
   - Continue adding more boxes

6. **Export Data**
   - Click "Export ({count})" button
   - Downloads JSON file
   - Console logs annotations for backend integration

## Backend Integration

### Sending Annotations to Backend

Add this function to send annotations:

```typescript
const sendAnnotationsToBackend = async (inspectionId: string, annotations: BoundingBox[]) => {
  try {
    const response = await fetch(`${API_ENDPOINTS.BASE}/inspections/${inspectionId}/annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inspectionId,
        annotations,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) throw new Error('Failed to save annotations');
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error saving annotations:', error);
    throw error;
  }
};
```

### Expected Backend Endpoint

```
POST /api/inspections/{id}/annotations

Request Body:
{
  "inspectionId": "123",
  "annotations": [
    {
      "id": "box-1697712345678",
      "startX": 25.5,
      "startY": 30.2,
      "endX": 45.8,
      "endY": 50.1,
      "anomalyState": "Faulty",
      "confidenceScore": 85,
      "riskType": "Point fault",
      "description": "Overheating detected",
      "imageType": "thermal"
    }
  ],
  "timestamp": "2025-10-19T12:00:00Z"
}
```

## Technical Details

### New State Variables
```typescript
const [annotationMode, setAnnotationMode] = useState(false);
const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
const [currentBox, setCurrentBox] = useState<Partial<BoundingBox> | null>(null);
const [isDrawing, setIsDrawing] = useState(false);
const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
const [showMetadataForm, setShowMetadataForm] = useState(false);
const [pendingBoxId, setPendingBoxId] = useState<string | null>(null);
const [metadata, setMetadata] = useState<AnnotationMetadata>({...});
```

### Key Functions
- `handleImageClick()` - Start/finish drawing
- `handleImageMouseMove()` - Update box while drawing
- `handleSaveMetadata()` - Save annotation with metadata
- `handleDeleteBox()` - Remove annotation
- `handleExportAnnotations()` - Export to JSON
- `toggleAnnotationMode()` - Enable/disable annotation

### Components Used
- Dialog (from shadcn/ui)
- Button, Select, Slider, Input, Textarea, Label
- Lucide icons: Square, X, Save, Search, Eye

## Future Enhancements

### Possible Additions:
1. **Load existing annotations** from backend
2. **Edit box coordinates** after creation
3. **Bulk delete** multiple boxes
4. **Filter boxes** by anomaly state
5. **Auto-save** annotations periodically
6. **Undo/Redo** functionality
7. **Keyboard shortcuts** for faster workflow
8. **Copy annotations** between images
9. **Export to different formats** (CSV, XML)
10. **Annotation history** and versioning

## Browser Compatibility

Tested and works on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Notes

- Annotations are stored in component state (client-side only)
- Export creates downloadable JSON file
- No automatic backend sync (manual export required)
- Rendering optimized for up to 50 boxes per image
- Percentage-based coordinates scale with image size

## Troubleshooting

### Box not appearing
- Ensure you click twice (start and end)
- Box must be larger than 1% in both dimensions

### Metadata form not showing
- Check if box size is valid
- Look for console errors

### Export not working
- Check browser console for errors
- Verify at least one box is annotated
- Check browser download permissions

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify all required fields in metadata form
3. Ensure images are loaded before annotating
4. Test in different browser if issues persist
