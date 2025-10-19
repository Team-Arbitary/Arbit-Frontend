# Visual Guide: Bounding Box Annotation Feature

## 🎯 Feature Location

```
InspectionDetail Page
  └── Annotation Tools Tab
      └── Compare Images Button
          └── Image Analysis Comparison Modal
              └── NEW: Annotate Boxes Button ⭐
```

## 🖼️ UI Components

### 1. Modal Header (Enhanced)
```
┌─────────────────────────────────────────────────────────────┐
│ Image Analysis Comparison - Inspection #123                 │
│ Analysis completed on 10/19/2025, 12:00 PM                  │
│                                                              │
│ [Annotate Boxes] [Export (3)] [Side by Side ▼]   [Close]  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Annotation Mode Banner (When Active)
```
┌─────────────────────────────────────────────────────────────┐
│ 📦 Annotation Mode Active                                   │
│ Click once to start drawing a box, move your cursor to     │
│ define the area, then click again to finish.               │
└─────────────────────────────────────────────────────────────┘
```

### 3. Side-by-Side View with Annotations
```
┌────────────────────────────┬────────────────────────────┐
│  Thermal Image (Original)  │   Analysis Result          │
├────────────────────────────┼────────────────────────────┤
│                            │                            │
│   ┌─────────────┐         │    ┌──────────────┐       │
│   │  [Image]    │         │    │  [Image]     │       │
│   │             │         │    │              │       │
│   │  ┌─RED BOX─┐│         │    │   ┌─ORANGE─┐│       │
│   │  │Faulty   ││         │    │   │Pot.Faulty│       │
│   │  │ (85%)   ││         │    │   │ (65%)   ││       │
│   │  └─────────┘│         │    │   └─────────┘│       │
│   │             │         │    │              │       │
│   └─────────────┘         │    └──────────────┘       │
│                            │                            │
│ Original                   │  Result                    │
│ 🔍 Hover to zoom          │  🔍 Hover to zoom          │
└────────────────────────────┴────────────────────────────┘
```

### 4. 3x Zoom Feature (When NOT in Annotation Mode)
```
┌──────────────────────────────┐
│        [Main Image]          │
│                              │
│    Hover here →  ┌─────────┐│
│                  │ Magnify │││
│                  │ Window  │││
│                  │  3x     │││
│                  └─────────┘││
│                   3x Zoom   ││
└──────────────────────────────┘
```

### 5. Drawing a Bounding Box (Annotation Mode)
```
Step 1: Click to start
┌─────────────────┐
│   [Image]       │
│                 │
│     ✖ (click)  │
│                 │
└─────────────────┘

Step 2: Move cursor
┌─────────────────┐
│   [Image]       │
│   ┌─────────┐   │
│   │ Moving  │   │
│   └─────────→   │
└─────────────────┘

Step 3: Click to finish
┌─────────────────┐
│   [Image]       │
│   ┌─────────┐   │
│   │Completed│   │
│   └─────────┘✖  │
└─────────────────┘
```

### 6. Metadata Form Dialog
```
┌───────────────────────────────────────┐
│  Annotation Metadata             [×]  │
├───────────────────────────────────────┤
│                                       │
│  Anomaly State *                      │
│  ┌─────────────────────────────────┐ │
│  │ Faulty                      ▼   │ │
│  └─────────────────────────────────┘ │
│    • Faulty                           │
│    • Potentially Faulty               │
│    • Normal                           │
│                                       │
│  Confidence Score (0-100) *           │
│  ├─────●──────────────────────┤ 85%  │
│                                       │
│  Risk Type *                          │
│  ┌─────────────────────────────────┐ │
│  │ Point fault             ▼   │     │
│  └─────────────────────────────────┘ │
│    • Point fault                      │
│    • Full wire overload               │
│    • Transformer overload             │
│                                       │
│  Description                          │
│  ┌─────────────────────────────────┐ │
│  │ Overheating detected on wire   │ │
│  │ connection point...            │ │
│  └─────────────────────────────────┘ │
│                                       │
│          [Cancel]  [Save Annotation]  │
└───────────────────────────────────────┘
```

### 7. Annotated Box (Selected)
```
           [DELETE ×]
        ┌─────────────┐
        │ Faulty (85%)│ ← Label
        │             │
        │             │ ← Yellow border (selected)
        │             │
        └─────────────┘
        Click to select/deselect
```

### 8. Color Coding
```
┌─────────────────────────────────────┐
│ Anomaly State    │ Border Color     │
├──────────────────┼──────────────────┤
│ Faulty           │ 🔴 Red           │
│ Potentially      │ 🟠 Orange        │
│ Faulty           │                  │
│ Normal           │ 🟢 Green         │
│ Selected         │ 🟡 Yellow        │
└─────────────────────────────────────┘
```

## 📱 Button States

### Annotate Boxes Button
```
Normal State:   [📦 Annotate Boxes]
Active State:   [📦 Exit Annotation] (Blue background)
```

### Export Button
```
Hidden:         (when no annotations)
Visible:        [💾 Export (3)]
                      ↑
                   Box count
```

## 🎨 Visual Indicators

### Border Styles
- **Completed boxes**: Solid border with semi-transparent fill
- **Drawing box**: Dashed border with semi-transparent fill
- **Selected box**: Thicker yellow border

### Cursor Styles
- **Normal mode**: Crosshair (for zoom)
- **Annotation mode**: Crosshair (for drawing)
- **Over selected box**: Pointer

## 📊 Data Flow Diagram

```
┌────────────────┐
│  User clicks   │
│  on image      │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  Start drawing │
│  bounding box  │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  User moves    │
│  cursor        │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  User clicks   │
│  again         │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  Show metadata │
│  form dialog   │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  User fills    │
│  required      │
│  fields        │
└───────┬────────┘
        │
        ▼
┌────────────────┐     ┌────────────────┐
│  Save          │────▶│  Add to        │
│  Annotation    │     │  boundingBoxes │
│                │     │  array         │
└────────────────┘     └────────┬───────┘
                                │
                                ▼
                       ┌────────────────┐
                       │  Render box    │
                       │  on image      │
                       └────────────────┘
```

## 🔄 Interaction Flow

### Adding Annotation
1. Click "Annotate Boxes" → Mode activates (blue button)
2. Click on image → Start point set
3. Move mouse → Box preview updates
4. Click again → Box completes
5. Form appears → Fill metadata
6. Click "Save" → Box saved and rendered
7. Repeat for more annotations

### Managing Annotations
1. Click on box → Box selected (yellow border)
2. Delete button appears → Click to remove
3. Click elsewhere → Deselect

### Exporting Annotations
1. Complete annotations
2. Click "Export (N)" button
3. JSON file downloads
4. Console logs data
5. Ready for backend integration

## 🎬 Animation States

### Hover Effects
- Boxes brighten on hover
- Delete button fades in on selection
- Zoom preview slides in smoothly

### Drawing Animation
- Dashed border animates while drawing
- Box smoothly follows cursor
- Form slides up from bottom

## 📐 Layout Breakpoints

### Desktop (> 1024px)
```
├─ Thermal Image (50%) ─┤├─ Result Image (50%) ─┤
```

### Tablet (768px - 1024px)
```
├─ Thermal Image (50%) ─┤├─ Result Image (50%) ─┤
(Slightly smaller zoom window)
```

### Mobile (< 768px)
```
├─────── Thermal Image ────────┤
├─────── Result Image ─────────┤
(Stacked layout, full width)
```

## 🎯 Hotspots

### Clickable Areas
- ✅ Image area (when annotation mode active)
- ✅ Bounding boxes (to select)
- ✅ Delete button (when box selected)
- ✅ Mode toggle button
- ✅ Export button

### Non-interactive Areas
- ❌ Image area (when annotation mode inactive)
- ❌ Background overlay
- ❌ Label badges on boxes

## 💡 Tips for Users

1. **Precise Annotation**: Use the 3x zoom first to locate anomalies, then enable annotation mode
2. **Quick Selection**: Click directly on boxes to select them quickly
3. **Batch Work**: Annotate all boxes first, export once at the end
4. **Save Often**: Export periodically to avoid losing work
5. **Color Guide**: Remember - Red=Faulty, Orange=Potentially Faulty, Green=Normal
