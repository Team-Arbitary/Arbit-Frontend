# Developer Quick Reference: Bounding Box Annotations

## 📝 Quick Summary

Added a comprehensive bounding box annotation system to the Image Analysis Comparison modal that allows users to:
- Draw rectangular boxes on thermal and analysis result images
- Add metadata (anomaly state, confidence, risk type, description)
- Manage annotations (select, delete, export)
- Works alongside existing 3x zoom feature

## 🔧 Files Modified

### Primary File
- `app/src/pages/InspectionDetail.tsx` - Main implementation

### No New Files Created
All code is in the existing `InspectionDetail.tsx` file

## 📦 New Dependencies
None! Uses existing shadcn/ui components:
- Dialog, Button, Select, Slider, Input, Textarea, Label (already installed)
- Lucide icons: Square, X, Save (already installed)

## 🏗️ Architecture

### Type Definitions (Lines 30-51)
```typescript
interface BoundingBox {
  id: string;
  startX: number;      // 0-100 (percentage)
  startY: number;      // 0-100 (percentage)
  endX: number;        // 0-100 (percentage)
  endY: number;        // 0-100 (percentage)
  anomalyState: "Faulty" | "Potentially Faulty" | "Normal" | "";
  confidenceScore: number;  // 0-100
  riskType: "Point fault" | "Full wire overload" | "Transformer overload" | "";
  description: string;
  imageType: "thermal" | "result";
}

interface AnnotationMetadata {
  anomalyState: "Faulty" | "Potentially Faulty" | "Normal" | "";
  confidenceScore: number;
  riskType: "Point fault" | "Full wire overload" | "Transformer overload" | "";
  description: string;
}
```

### State Management (Lines 80-97)
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

### Key Functions (Lines 142-283)

1. **handleImageClick(e, imageType)** - Start/finish drawing
2. **handleImageMouseMove(e)** - Update box while drawing
3. **handleSaveMetadata()** - Save annotation with metadata
4. **handleCancelMetadata()** - Cancel and remove pending box
5. **handleDeleteBox(boxId)** - Remove annotation
6. **handleExportAnnotations()** - Export to JSON file
7. **toggleAnnotationMode()** - Enable/disable annotation mode

## 🎨 UI Components Modified

### 1. Modal Header (Lines 295-330)
Added buttons:
- "Annotate Boxes" / "Exit Annotation"
- "Export (N)" (conditional)

### 2. Annotation Banner (Lines 335-346)
Blue info banner when annotation mode is active

### 3. Image Containers (Lines 367-485 & 495-612)
Enhanced both thermal and result image containers:
- Click handlers for drawing
- Render existing bounding boxes
- Render current drawing box
- Toggle between zoom and annotation mode

### 4. Metadata Form Dialog (Lines 790-873)
Modal form with:
- Anomaly State dropdown (required)
- Confidence Score slider (required)
- Risk Type dropdown (required, disabled for Normal)
- Description textarea (optional)

## 🚀 How to Use Programmatically

### Access Annotations
```typescript
// In AnalysisModal component
console.log(boundingBoxes); // Array of BoundingBox objects
```

### Send to Backend
```typescript
const handleExportAnnotations = async () => {
  try {
    const response = await fetch('/api/inspections/${inspection.id}/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inspectionId: inspection.id,
        annotations: boundingBoxes,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) throw new Error('Failed');
    
    toast({
      title: "Saved",
      description: "Annotations sent to backend"
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to save annotations",
      variant: "destructive"
    });
  }
};
```

### Load Existing Annotations
```typescript
// Add this to AnalysisModal's useEffect
useEffect(() => {
  const loadAnnotations = async () => {
    try {
      const response = await fetch(`/api/inspections/${inspection.id}/annotations`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.annotations) {
        setBoundingBoxes(data.annotations);
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };
  
  if (inspection.id) {
    loadAnnotations();
  }
}, [inspection.id]);
```

## 🧪 Testing Checklist

### Functional Tests
- [ ] Can enable/disable annotation mode
- [ ] Can draw boxes on thermal image
- [ ] Can draw boxes on result image
- [ ] Box appears with dashed border while drawing
- [ ] Metadata form appears after completing box
- [ ] Can save annotation with all fields
- [ ] Can cancel annotation (removes box)
- [ ] Boxes render with correct colors
- [ ] Can select/deselect boxes
- [ ] Can delete selected boxes
- [ ] Export button shows correct count
- [ ] Export downloads JSON file
- [ ] 3x zoom works when annotation mode is OFF
- [ ] 3x zoom disabled when annotation mode is ON

### Edge Cases
- [ ] Drawing very small boxes (< 1% dimension)
- [ ] Clicking same spot twice (no box created)
- [ ] Switching between images while drawing
- [ ] Closing modal with unsaved annotations
- [ ] Rapid clicking (double-click prevention)
- [ ] Drawing at image edges
- [ ] Multiple boxes overlapping
- [ ] All metadata combinations (Faulty/Normal/etc.)

### Browser Tests
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

## 🐛 Common Issues & Solutions

### Issue: Box not appearing
**Solution**: Check if box dimensions are > 1% in both directions

### Issue: Metadata form not showing
**Solution**: Check console for errors, ensure box was completed properly

### Issue: Can't click on boxes
**Solution**: Ensure pointer-events-auto class is on box elements

### Issue: Export not working
**Solution**: Check browser download permissions, verify boxes array has data

### Issue: Coordinates wrong on backend
**Solution**: Remember coordinates are percentages, convert to pixels based on original image dimensions

## 📊 Performance Considerations

### Current Implementation
- Client-side only (no automatic sync)
- Percentage-based coordinates (resolution independent)
- Optimized for up to 50 boxes per image
- No debouncing on mouse moves (consider adding for low-end devices)

### Potential Optimizations
```typescript
// Add debouncing for mouse move
const debouncedMouseMove = useMemo(
  () => debounce(handleImageMouseMove, 16), // ~60fps
  []
);

// Use React.memo for box rendering
const BoundingBoxOverlay = React.memo(({ box, isSelected, onSelect, onDelete }) => {
  // ... render logic
});
```

## 🔐 Security Considerations

### Data Validation
```typescript
// Add validation before saving
const validateBox = (box: BoundingBox): boolean => {
  // Check coordinates are within bounds
  if (box.startX < 0 || box.startX > 100) return false;
  if (box.endX < 0 || box.endX > 100) return false;
  if (box.startY < 0 || box.startY > 100) return false;
  if (box.endY < 0 || box.endY > 100) return false;
  
  // Check required fields
  if (!box.anomalyState) return false;
  if (box.confidenceScore < 0 || box.confidenceScore > 100) return false;
  
  // Check risk type if faulty
  if (box.anomalyState !== "Normal" && !box.riskType) return false;
  
  return true;
};
```

### XSS Prevention
- Description field could contain user input
- Already handled by React's default XSS protection
- Consider sanitizing on backend

## 📈 Future Enhancements

### Priority 1 (High Impact)
1. Auto-save to localStorage
2. Load existing annotations from backend
3. Undo/Redo functionality
4. Keyboard shortcuts (Delete, Escape, etc.)

### Priority 2 (Medium Impact)
5. Copy annotations between images
6. Bulk delete
7. Filter boxes by anomaly state
8. Edit box coordinates after creation
9. Resize boxes by dragging corners

### Priority 3 (Nice to Have)
10. Export to CSV/XML
11. Import annotations
12. Annotation history/versioning
13. Multi-user collaboration
14. AI-assisted annotation

## 🔗 Related Code Locations

### Existing 3x Zoom Feature
- Lines 100-127: Mouse move handler
- Lines 461-483: Zoom render (thermal)
- Lines 571-593: Zoom render (result)

### Modal Structure
- Lines 289-875: AnalysisModal component
- Lines 877-1574: InspectionDetail main component

### API Integration Points
- Line 267: handleExportAnnotations (modify for backend)
- Consider adding loadAnnotations function

## 📚 Documentation Files

1. `ANNOTATION_FEATURE.md` - Comprehensive feature documentation
2. `ANNOTATION_VISUAL_GUIDE.md` - Visual UI guide
3. `DEV_QUICK_REF.md` - This file

## 🤝 Contributing

### Code Style
- Use TypeScript strict types
- Follow existing component patterns
- Add JSDoc comments for complex functions
- Use semantic variable names

### Pull Request Template
```markdown
## Changes
- Added bounding box annotation feature

## Testing
- [x] Functional tests passed
- [x] Browser tests passed
- [x] Edge cases handled

## Screenshots
[Attach screenshots of feature]

## Breaking Changes
None - feature is additive only
```

## 📞 Support Contacts

For questions or issues:
1. Check console logs for detailed errors
2. Verify all required fields in metadata form
3. Test in different browser if issues persist
4. Review this guide and feature documentation

## 🏁 Quick Start for Developers

1. **Open the app**: Navigate to any inspection detail page
2. **Open Annotation Tools tab**: Click the tab
3. **Click Compare Images**: Opens the comparison modal
4. **Enable annotation mode**: Click "Annotate Boxes"
5. **Draw a box**: Click, move, click
6. **Fill metadata**: Complete the form
7. **Export**: Click export button to see JSON output

That's it! You now have annotated bounding boxes ready to send to your backend.
