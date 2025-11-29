# Frontend Architecture Explanation

## 📁 File Structure

```
app/src/pages/InspectionDetail.tsx
├── Components
│   ├── AnalysisModal (Nested Component)
│   └── InspectionDetail (Main Export)
├── State Management
├── API Integration
└── UI/UX Logic
```

---

## 🏗️ Main Architecture Components

### 1. **InspectionDetail Component** (Main Page)

The root component that manages the inspection workflow.

**Key Responsibilities:**

- Display inspection metadata (transformer number, branch, status)
- Handle image uploads (thermal & baseline)
- Manage analysis workflow
- Show progress tracking
- Display analysis results and annotations

---

### 2. **AnalysisModal Component** (Image Analysis & Annotation Tool)

A sophisticated modal for detailed image analysis and bounding box annotations.

**Key Features:**

- **4 View Modes:**

  - Side-by-Side: Compare thermal vs analysis result
  - Slider: Overlay comparison with draggable divider
  - Magnifier: Detailed inspection with zoom lens
  - Zoom & Pan: Synchronized zoom/pan on both images

- **Annotation System:**

  - Draw bounding boxes on images
  - Edit/resize/delete annotations
  - Add metadata (anomaly state, confidence, risk type)
  - Track annotation history (who added/edited/deleted)

---

## 🔄 State Management

### Core State Variables

```typescript
// Inspection Data
const [inspection, setInspection] = useState<InspectionView>({
  id,
  transformerNo,
  branch,
  status,
  lastUpdated,
});

// Image States
const [baselineImage, setBaselineImage] = useState<string | null>(null);
const [thermalImage, setThermalImage] = useState<string | null>(null);
const [analysisResult, setAnalysisResult] = useState<string | null>(null);

// Analysis Data (from API)
const [analysisData, setAnalysisData] = useState<any>(null);

// Annotations (Manual + AI)
const [cachedAnnotations, setCachedAnnotations] = useState<BoundingBox[]>([]);
const [confirmedAnomalies, setConfirmedAnomalies] = useState<
  Set<string | number>
>(new Set());

// UI States
const [isUploading, setIsUploading] = useState(false);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [statusPolling, setStatusPolling] = useState(false);
const [showAnalysisModal, setShowAnalysisModal] = useState(false);

// Chat (AI Assistant)
const [chatMessages, setChatMessages] = useState<Array>([]);
const [chatInput, setChatInput] = useState("");
```

---

## 📡 API Integration

### API Endpoints Used

```typescript
// From lib/api.ts
API_ENDPOINTS = {
  INSPECTION_DETAIL(id): Get inspection metadata
  IMAGE_BASELINE(transformerNo): Upload/Get/Delete baseline image
  IMAGE_THERMAL(inspectionNo): Upload/Get/Delete thermal image
  IMAGE_UPLOAD: Upload images with metadata
  ANALYSIS_RESULT(id): Get analysis result image
  ANALYSIS_ANALYZE(id): Trigger AI analysis
  ANALYSIS_UPDATE_ANNOTATIONS(id, transformerNo): Save annotations
}
```

### Data Flow

```
1. Load Inspection → GET /inspection/:id
2. Load Images → GET /baseline/:transformerNo, /thermal/:inspectionNo
3. Upload Images → POST /upload (with FormData)
4. Analyze → POST /analyze/:id
5. Poll Status → Periodic GET /thermal/:inspectionNo
6. Get Results → GET /analysis-result/:id
7. Save Annotations → PUT /update-annotations/:id/:transformerNo
```

---

## 🎯 Main Functions

### Image Upload Functions

```typescript
handleFileUpload(file: File, type: "baseline" | "thermal")
├── Create FormData with image + metadata
├── POST to API_ENDPOINTS.IMAGE_UPLOAD
├── Show progress bar (simulated)
└── Update local state with uploaded image

handleUpload(type: "baseline" | "thermal")
├── Create file input element
├── Trigger file picker
└── Call handleFileUpload on selection

handleDeleteImage(type: "baseline" | "thermal")
├── Confirm deletion
├── DELETE request to API
└── Clear local state
```

### Analysis Functions

```typescript
handleAnalyze()
├── POST to /analyze/:id
├── Start status polling
├── Update inspection status to "in-progress"
└── Fetch analysis result after delay

checkThermalStatus()
├── GET /thermal/:inspectionNo
├── Update inspection status from API
└── Trigger fetchAnalysisResult if completed

fetchAnalysisResult()
├── GET /analysis-result/:id
├── Handle different response formats (image/JSON)
├── Parse analysisResultJson
├── Create normalized anomaly data
└── Update state with result + analysis data

// Status Polling Effect
useEffect(() => {
  if (statusPolling) {
    setInterval(() => {
      checkThermalStatus();
      fetchAnalysisResult();
    }, 5000);
  }
}, [statusPolling]);
```

### Annotation Functions

```typescript
// In AnalysisModal Component

handleImageClick(e, imageType)
├── Start drawing bounding box
├── Set startX, startY coordinates
└── Track mouse movement

handleImageMouseMove(e)
├── Update endX, endY while drawing
└── Show live preview of box

handleSaveMetadata()
├── Validate required fields
├── Determine annotation source (manual/ai-modified/ai-rejected)
├── Add tracking metadata (createdBy, modifiedBy, confirmedBy)
└── Update boundingBoxes state

handleEditBox(boxId)
├── Load existing box metadata into form
├── Open metadata dialog
└── Save updated metadata

handleDeleteBox(boxId)
├── Soft delete annotation
└── Update annotations array

handleSaveAnnotations()
├── Convert bounding boxes to backend format
├── Convert percentage coords to pixels
├── PUT to /update-annotations
├── Handle server response
└── Refresh page on success

handleResizeStart/Move/End()
├── Track resize handle being dragged
├── Update box coordinates dynamically
└── Save changes on mouse up
```

### Caching Functions

```typescript
saveAnnotationsToCache(annotations)
└── localStorage.setItem(`inspection_annotations_${id}`, JSON.stringify(annotations))

loadAnnotationsFromCache()
└── localStorage.getItem(`inspection_annotations_${id}`)

clearAnnotationsCache()
└── localStorage.removeItem(`inspection_annotations_${id}`)

// Confirmed Anomalies
handleConfirmAnomaly(anomalyId)
├── Add to confirmedAnomalies Set
├── Save to localStorage
└── Show toast notification

// Load confirmed anomalies on mount
useEffect(() => {
  const stored = localStorage.getItem(`confirmed-anomalies-${id}`);
  setConfirmedAnomalies(new Set(JSON.parse(stored)));
}, [id]);
```

### AI Confidence Randomization

```typescript
getDisplayConfidence(confidenceScore, boxId)
├── If confidence !== 100% → return original
├── Generate pseudo-random seed from boxId
├── Use LCG algorithm: (seed * 9301 + 49297) % 233280
├── Normalize to 0-1 range
└── Map to 70-100 range

// Used in multiple places:
// - Analysis History section (AI anomalies)
// - Bounding box labels
// - Manual annotations display
```

---

## 🎨 UI Components & Flow

### Progress Tracking

```typescript
getProgressSteps()
├── Step 1: Thermal Image Upload
│   └── Status: completed if thermalImage exists
├── Step 2: AI Analysis
│   ├── not-ready: No images
│   ├── ready: Both images uploaded
│   ├── in-progress: Analysis running
│   └── completed: Status = "Completed"
└── Step 3: Thermal Image Review
    └── completed: analysisResult exists
```

### Modal View Modes

```typescript
// Side-by-Side
├── Two image containers side by side
├── Bounding boxes overlaid on images
├── Edit/delete controls per box
└── Resize handles for selected box

// Slider
├── Base image (analysis result)
├── Overlay image (thermal) with clipPath
├── Draggable divider line
└── Bounding boxes on base image

// Magnifier
├── Two images with hover magnifier
├── Adjustable magnifier size & zoom
├── Bounding boxes visible
└── No annotation editing in this mode

// Zoom & Pan
├── Synchronized zoom on both images
├── Click & drag to pan
├── Zoom slider + buttons
└── Reset button to center view
```

---

## 📦 Data Structures

### BoundingBox Interface

```typescript
interface BoundingBox {
  // Geometry
  id: string;
  startX: number; // Percentage
  startY: number;
  endX: number;
  endY: number;

  // Classification
  anomalyState: "Faulty" | "Potentially Faulty" | "Normal";
  confidenceScore: number;
  riskType:
    | "Point fault"
    | "Full wire overload"
    | "Transformer overload"
    | "Normal";
  description: string;
  imageType: "thermal" | "result";

  // Tracking Metadata
  source: "ai" | "manual" | "ai-modified" | "ai-rejected";
  annotationType: "added" | "edited" | "deleted";
  createdBy: string;
  createdAt: string;
  modifiedBy: string;
  confirmedBy: string;
  editedBy: string;
  aiGenerated: boolean;
  userVerified: boolean;
  isDeleted: boolean;

  // Server Sync
  serverSynced: boolean;
  lastSyncAt: string;
  serverData: any;
}
```

### Analysis Data Structure

```typescript
{
  analysisDate: string;
  analysisStatus: "SUCCESS";
  processingTimeMs: number;
  annotatedImageData: string; // Base64 image
  analysisResultJson: string | Array | Object;
  parsedAnalysisJson: {
    anomalies: Array<{
      id: number;
      bbox: [x, y, width, height];
      center: [x, y];
      area: number;
      severity_level: "HIGH" | "MEDIUM" | "LOW";
      confidence: number;
      type: string;
      reasoning: string;
      // ... other fields
    }>;
    summary: {
      total_anomalies: number;
      severity_distribution: {
      }
      average_confidence: number;
    }
    formatType: "array" | "object" | "single";
  }
}
```

---

## 🔔 Event System

```typescript
// Custom Event for Annotation Updates
window.dispatchEvent(
  new CustomEvent("annotationsUpdated", {
    detail: updatedBoxes,
  })
);

// Listener in main component
useEffect(() => {
  window.addEventListener("annotationsUpdated", (event) => {
    setCachedAnnotations(event.detail);
    saveAnnotationsToCache(event.detail);
  });
}, []);
```

---

## 🎯 Key Features Implementation

### 1. **Dual Image Comparison**

- Baseline (original) vs Thermal (current) vs Analysis Result
- Multiple view modes for different inspection needs
- Synchronized controls in zoom mode

### 2. **Bounding Box Annotation System**

- Click to draw boxes on images
- Resize with 8 handles (corners + edges)
- Metadata form for each annotation
- Track annotation lifecycle (who created/edited/confirmed)

### 3. **AI Anomaly Detection Integration**

- Parse API response (handles 3 different formats)
- Normalize data structure
- Display AI detections with bounding boxes
- Allow user confirmation/rejection

### 4. **Confidence Score Randomization**

- Hide 100% confidence scores from AI
- Generate pseudo-random 70-100% values
- Deterministic based on anomaly ID
- Apply to all displays (boxes, cards, tooltips)

### 5. **Status Polling**

- Auto-check analysis status every 5 seconds
- Stop when analysis complete
- Update UI progressively
- Handle "in-progress" state

### 6. **Local Storage Caching**

- Save annotations per inspection
- Persist confirmed anomalies
- Load on page reload
- Sync with server on save

### 7. **Chat Assistant (Beta)**

- Message history (newest first)
- RAG integration (pending)
- Context-aware responses
- Fixed height scrollable container

---

## 🔧 Helper Functions

```typescript
// Display Utilities
openInNewTab(url) → Open image in new tab
getDisplayConfidence(score, id) → Randomize 100% confidences

// Progress Calculation
getProgressSteps() → Dynamic progress based on state

// Annotation Utilities
handleMouseMove/Down/Up → Zoom & pan controls
handleResizeStart/Move/End → Box resizing
parseAnalysisData(json) → Normalize API response formats

// Event Handlers
handleSendMessage() → AI chat
handleConfirmAnomaly(id) → Mark AI detection as confirmed
```

---

## 📊 Component Lifecycle

```
1. Mount
   ├── Load inspection data (API)
   ├── Load baseline image (API)
   ├── Load thermal image (API)
   ├── Load cached annotations (localStorage)
   └── Load confirmed anomalies (localStorage)

2. User Actions
   ├── Upload Images → POST to API → Update state
   ├── Analyze → POST analyze → Poll status → Fetch result
   ├── Annotate → Draw boxes → Save metadata → Cache locally
   ├── Confirm Anomaly → Update Set → Save to localStorage
   └── Chat → Send message → Mock AI response (RAG pending)

3. Auto-Refresh
   ├── Poll thermal status (if in-progress)
   ├── Fetch analysis result (when complete)
   └── Update UI progressively

4. Unmount
   └── Clear intervals, cleanup event listeners
```

---

## 🎨 Styling Approach

- **Tailwind CSS** for utility-first styling
- **Shadcn UI** components (Card, Button, Dialog, etc.)
- **Dynamic classes** based on state (severity colors, status badges)
- **Backdrop blur** for glass-morphism effect
- **Responsive grid** layouts (2-column, 3-column)

---

## 🚀 Performance Optimizations

1. **Image Loading**: Object URLs for blob data
2. **Polling**: Clear intervals when not needed
3. **Caching**: localStorage for offline annotations
4. **Lazy Loading**: Analysis result fetched on demand
5. **Pseudo-random**: Deterministic random for consistent UI

---

## 🔐 Error Handling

```typescript
try {
  // API call
} catch (err) {
  toast({
    title: "Error",
    description: err.message,
    variant: "destructive",
  });
}
```

---

This architecture provides a **robust, user-friendly interface** for thermal image inspection with advanced annotation capabilities and AI-powered anomaly detection! 🎯✨
