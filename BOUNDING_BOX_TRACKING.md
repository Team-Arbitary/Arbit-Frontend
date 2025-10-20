# Bounding Box Annotation Tracking System

## Overview
This system tracks the provenance and status of bounding box annotations in thermal inspection images. Each annotation is color-coded based on its source and confirmation status.

## Color Coding System

### 🟡 Light Yellow - AI Detection Rejected by User
**Background**: `bg-yellow-50`  
**Border**: `border-yellow-400`  
**When**: AI-generated box that user marked as incorrect/false
- User reviewed AI detection and determined it was wrong
- Status: "AI Detection - Rejected by User"

### 🟢 Light Green - Confirmed or Manual
**Background**: `bg-green-50`  
**Border**: `border-green-400`  
**When**: 
1. User confirmed AI detection as correct
2. User manually added annotation
- Status: "Manually Added" or "Confirmed by User"

### ⚪ White - Unconfirmed AI Detection
**Background**: `bg-white`  
**Border**: `border-gray-300`  
**When**: AI-generated box not yet reviewed by user
- Awaiting user confirmation
- Status: "Unconfirmed AI Detection"

## JSON Export Format

Each bounding box annotation is exported with the following structure:

```json
{
  "id": "box-1760962034286",
  "bbox": [24.67, 72.65, 53.20, 18.40],
  "center": [51.27, 81.85],
  "anomalyState": "Normal",
  "confidenceScore": 73,
  "riskType": "Normal",
  "description": "Test",
  "imageType": "result",
  "modifiedBy": "hasitha@gmail.com",
  "confirmedBy": "hasitha@gmail.com"
}
```

### Field Descriptions

#### Core Fields
- **id**: Unique identifier (timestamp-based)
- **bbox**: `[x, y, width, height]` - Bounding box coordinates in %
- **center**: `[centerX, centerY]` - Center point coordinates in %
- **anomalyState**: "Faulty" | "Potentially Faulty" | "Normal"
- **confidenceScore**: 0-100 percentage
- **riskType**: "Point fault" | "Full wire overload" | "Transformer overload" | "Normal"
- **description**: Optional text description
- **imageType**: "thermal" | "result"

#### Tracking Fields
- **modifiedBy**: 
  - `"AI"` - If AI-generated and not modified by user
  - `"hasitha@gmail.com"` - User email if user created or modified
  
- **confirmedBy**:
  - User email (e.g., `"hasitha@gmail.com"`) - If confirmed by user or manually added
  - `"not confirmed by the user"` - If AI-generated and not yet reviewed
  - `"Rejected by hasitha@gmail.com"` - If user marked AI detection as false

## Internal Tracking Structure

The `BoundingBox` interface includes additional internal fields not exported:

```typescript
interface BoundingBox {
  // ... core fields ...
  
  // Internal tracking
  source?: "ai" | "manual" | "ai-modified" | "ai-rejected";
  createdBy?: string;
  createdAt?: string; // ISO timestamp
  modifiedAt?: string; // ISO timestamp
  aiGenerated?: boolean;
  userVerified?: boolean;
}
```

### Source States

1. **"ai"**: Original AI detection, unmodified
2. **"manual"**: User-created annotation from scratch
3. **"ai-modified"**: AI detection that user edited
4. **"ai-rejected"**: AI detection that user marked as false

## User Workflows

### Scenario 1: User Confirms AI Detection
```
1. AI generates box → source="ai", modifiedBy="AI", confirmedBy="not confirmed by the user"
2. User reviews and accepts → confirmedBy="hasitha@gmail.com"
3. Card shows: Green background, "Confirmed by User"
```

### Scenario 2: User Rejects AI Detection
```
1. AI generates box → source="ai", modifiedBy="AI"
2. User marks as false → source="ai-rejected", confirmedBy="Rejected by hasitha@gmail.com"
3. Card shows: Yellow background, "AI Detection - Rejected by User"
```

### Scenario 3: User Creates Manual Annotation
```
1. User draws new box → source="manual", modifiedBy="hasitha@gmail.com"
2. User saves metadata → confirmedBy="hasitha@gmail.com"
3. Card shows: Green background, "Manually Added"
```

### Scenario 4: User Modifies AI Detection
```
1. AI generates box → source="ai"
2. User edits coordinates/metadata → source="ai-modified", modifiedBy="hasitha@gmail.com"
3. Card shows: Green background, "Confirmed by User"
```

## Card Display Format

Each annotation card displays:

```
┌─────────────────────────────────────────────────────┐
│ [Colored Background based on status]                │
│ ┌───────────────────────────────────────────────┐  │
│ │ Faulty                              [AI/Manual] │  │
│ │ Risk: Transformer overload • Description      │  │
│ │                    Confidence: 88%  Image: Res│  │
│ │ ───────────────────────────────────────────── │  │
│ │ Status: Manually Added / Confirmed / Rejected │  │
│ │ Modified by: hasitha@gmail.com                │  │
│ │ Confirmed by: hasitha@gmail.com               │  │
│ │ Modified: Oct 20, 2025, 3:45 PM               │  │
│ └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Implementation Details

### Automatic Status Detection

The system automatically determines the card color based on:

```typescript
if (box.source === "ai-rejected") {
  // Yellow: User rejected AI detection
  bgColor = "bg-yellow-50";
  statusLabel = "AI Detection - Rejected by User";
} else if (box.source === "manual" || box.confirmedBy !== "not confirmed by the user") {
  // Green: User confirmed or manually added
  bgColor = "bg-green-50";
  statusLabel = box.source === "manual" ? "Manually Added" : "Confirmed by User";
} else {
  // White: Unconfirmed AI detection
  bgColor = "bg-white";
  statusLabel = "Unconfirmed AI Detection";
}
```

### Metadata Assignment Logic

When user saves annotation:

```typescript
// For new manual annotations
if (!isExisting && !isAIGenerated) {
  source = "manual";
  modifiedBy = currentUser;
  confirmedBy = currentUser;
}

// For modified AI annotations
if (isExisting && isAIGenerated) {
  if (userMarkedAsFalse) {
    source = "ai-rejected";
    confirmedBy = `Rejected by ${currentUser}`;
  } else {
    source = "ai-modified";
    confirmedBy = currentUser;
  }
}
```

## Badge Display

- **AI Badge**: Gray outline, shown for AI-generated boxes
- **Manual Badge**: Green outline, shown for user-created boxes

## Statistics Display

Card header shows:
- **Status**: Analysis completion status
- **Analysis Date**: When AI analysis ran
- **Processing Time**: AI processing duration
- **Annotations**: Total count of bounding box annotations

## Empty State

When no annotations exist:
```
┌─────────────────────────────────────────┐
│                                         │
│    No bounding box annotations yet.     │
│  Use the Anomaly Annotation Tool to    │
│          add annotations.               │
│                                         │
└─────────────────────────────────────────┘
```

## Benefits

1. **Clear Visual Status**: Instant recognition of annotation source and status
2. **Audit Trail**: Complete history of who created/modified each annotation
3. **Quality Control**: Easy identification of unconfirmed AI detections
4. **User Accountability**: Track which user confirmed or rejected detections
5. **Data Integrity**: Full provenance information for backend ML training

## Integration Points

### With Annotation Modal
- Real-time updates when user saves/modifies annotations
- Automatic source detection and status assignment
- Event-driven sync via `annotationsUpdated` custom event

### With Export Function
- All tracking metadata included in JSON export
- Backend receives complete provenance information
- Can use data to improve AI model

### With localStorage Cache
- Full annotation history persisted locally
- Survives page refreshes
- Inspection-specific cache keys

## Future Enhancements

1. **Bulk Operations**: Confirm/reject multiple AI detections at once
2. **Filtering**: Show only confirmed, rejected, or unconfirmed annotations
3. **Comments**: Add discussion threads to specific annotations
4. **Version History**: Track multiple edits over time
5. **ML Feedback**: Send user corrections back to improve AI model
6. **Collaboration**: Show when multiple users work on same inspection

## Testing Scenarios

### Test Case 1: AI Detection Flow
1. AI generates 3 boxes
2. All show white background (unconfirmed)
3. User confirms box 1 → turns green
4. User rejects box 2 → turns yellow
5. Box 3 remains white (unconfirmed)

### Test Case 2: Manual Addition
1. User opens annotation tool
2. Draws new bounding box
3. Fills metadata form
4. Saves → Shows green background immediately
5. confirmedBy = user email

### Test Case 3: Export Verification
1. Create mix of confirmed, rejected, and manual boxes
2. Export JSON
3. Verify all boxes have correct modifiedBy and confirmedBy values
4. Verify rejected boxes show rejection in confirmedBy

### Test Case 4: Page Refresh
1. Add various annotations
2. Refresh page
3. Verify all colors maintain correct status
4. Verify tracking metadata persists

## Current User

Currently uses mock user email:
```typescript
const currentUser = "hasitha@gmail.com";
```

**TODO**: Replace with actual authentication system to get real user information.
