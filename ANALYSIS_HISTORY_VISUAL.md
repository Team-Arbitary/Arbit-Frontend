# Analysis History and Summary - Visual Reference

## Card Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Analysis History and Summary                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │  Status: SUCCESS  │  Date: Oct 20, 2025  │  Time: 250ms │   │
│ │  Total Items: 8 (5 AI + 3 Manual)                        │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Anomalies                                                       │
│                                                                 │
│ ● AI-Detected Anomalies                                        │
│ ┌──────────────────────────────────────────────────┐          │
│ │ 🔵 High Severity                         [AI]    │          │
│ │ Overheating detected on transformer coil         │          │
│ │                          Confidence: 92.5%       │          │
│ │                          Area: 1,245 px²         │          │
│ │ ─────────────────────────────────────────────    │          │
│ │ Type: Detected from AI                           │          │
│ │ Generated: Oct 20, 2025, 10:30 AM                │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                 │
│ ● Verified AI Detections                                       │
│ ┌──────────────────────────────────────────────────┐          │
│ │ 🟢 Faulty                         [Verified ✓]   │          │
│ │ Risk: Point fault • Hot spot confirmed           │          │
│ │                          Confidence: 88%         │          │
│ │                          Image: Result           │          │
│ │ ─────────────────────────────────────────────    │          │
│ │ Type: AI-detected, verified as correct          │          │
│ │ Verified by: hasitha@gmail.com                   │          │
│ │ Verified: Oct 20, 2025, 11:15 AM                 │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                 │
│ ● Modified AI Detections                                       │
│ ┌──────────────────────────────────────────────────┐          │
│ │ 🟠 Potentially Faulty  [Modified] [Verified]    │          │
│ │ Risk: Full wire overload • Corrected severity    │          │
│ │                          Confidence: 75%         │          │
│ │                          Image: Thermal          │          │
│ │ ─────────────────────────────────────────────    │          │
│ │ Type: Originally AI-detected, modified by user   │          │
│ │ Last modified by: hasitha@gmail.com              │          │
│ │ Modified: Oct 20, 2025, 11:45 AM                 │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                 │
│ ● Manual Annotations                                           │
│ ┌──────────────────────────────────────────────────┐          │
│ │ 🟣 Normal                            [Manual]    │          │
│ │ Risk: Normal • User added safe zone              │          │
│ │                          Confidence: 100%        │          │
│ │                          Image: Result           │          │
│ │ ─────────────────────────────────────────────    │          │
│ │ Type: Manually annotated by user                 │          │
│ │ Added by: hasitha@gmail.com                      │          │
│ │ Created: Oct 20, 2025, 12:00 PM                  │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                 │
│ [Scrollable content - max 400px height]                        │
└─────────────────────────────────────────────────────────────────┘
```

## Color Legend

| Category | Color | Border | Background | Bullet | Use Case |
|----------|-------|--------|------------|--------|----------|
| **AI-Detected** | Blue | `border-blue-500` | `bg-blue-50` | 🔵 | Original AI detections, untouched |
| **Verified AI** | Green | `border-green-500` | `bg-green-50` | 🟢 | AI detections user confirmed correct |
| **Modified AI** | Orange | `border-orange-500` | `bg-orange-50` | 🟠 | AI detections user corrected |
| **Manual** | Purple | `border-purple-500` | `bg-purple-50` | 🟣 | Completely user-created |

## Badge System

### Badge Types
```
┌─────────┐
│   AI    │  ← Secondary badge (gray)
└─────────┘

┌─────────────┐
│ Verified ✓  │  ← Success badge (green) - AI verified as correct
└─────────────┘

┌──────────┐
│ Modified │  ← Outline badge (orange border) - AI modified by user
└──────────┘

┌──────────┐
│  Manual  │  ← Outline badge (purple border) - User created
└──────────┘
```

### Badge Combinations
- **AI only**: Single "AI" badge
- **Verified AI**: Single "Verified ✓" badge
- **Modified AI (verified)**: Both "Modified" + "Verified ✓"
- **Manual**: Single "Manual" badge

## Information Hierarchy

### Priority 1: Visual Category
- Left border (4px, colored)
- Background color (light tint)
- Section header with bullet

### Priority 2: Anomaly Status
- Bold anomaly state or severity
- Badge(s) indicating type/status

### Priority 3: Description
- Risk type and details
- AI reasoning (for AI detections)

### Priority 4: Metrics
- Confidence score (%)
- Area (for AI) or Image type (for user annotations)

### Priority 5: Provenance
- Divider line
- Type description
- User attribution
- Timestamp

## Data Flow Diagram

```
┌──────────────┐
│  AI Analysis │
│   Completes  │
└──────┬───────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       v                                     v
┌──────────────┐                    ┌────────────────┐
│ AI Detections│                    │ User Opens     │
│ (Blue Cards) │                    │ Annotation Tool│
└──────────────┘                    └───────┬────────┘
                                            │
                    ┌───────────────────────┴─────────────────┐
                    │                                         │
                    v                                         v
            ┌───────────────┐                        ┌─────────────┐
            │ User Verifies │                        │ User Draws  │
            │ AI Detection  │                        │  New Box    │
            └───────┬───────┘                        └──────┬──────┘
                    │                                       │
                    v                                       v
            ┌───────────────┐                        ┌─────────────┐
            │  Verified AI  │                        │   Manual    │
            │ (Green Cards) │                        │(Purple Cards)│
            └───────────────┘                        └─────────────┘
                    │
                    │ User modifies
                    v
            ┌───────────────┐
            │  Modified AI  │
            │(Orange Cards) │
            └───────────────┘
```

## Responsive Behavior

### Desktop (> 768px)
- 2-column grid for summary stats
- Full card width
- All badges visible inline

### Mobile (< 768px)
- Single column layout
- Stats stack vertically
- Badges may wrap
- Scrollable content maintained

## Empty State

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              No anomalies detected              │
│              or annotated yet.                  │
│                                                 │
│      Use the Anomaly Annotation Tool to        │
│           add manual annotations.               │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Scroll Behavior

- **Container**: `max-h-[400px] overflow-y-auto`
- **Smooth scroll**: Native browser scrolling
- **Scroll indicator**: Browser default scrollbar
- **Sections**: Space-y-4 between categories
- **Cards**: Space-y-2 between individual anomalies

## Typography Scale

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Card Title | `text-lg` | `font-bold` | Default |
| Section Header | `text-sm` | `font-medium` | Category color (blue-700, etc.) |
| Anomaly State | `text-base` | `font-semibold` | Category color (dark) |
| Description | `text-sm` | `font-normal` | `text-gray-700` |
| Metrics | `text-xs` | `font-normal` | `text-gray-600` |
| Provenance | `text-xs` | `font-normal` | `text-gray-500` |
| User Attribution | `text-xs` | `font-medium` | `text-gray-500` |

## Interaction States

### Hover (Future Enhancement)
- Could add hover effect on cards
- Show actions (edit, delete, view details)
- Highlight related box on image

### Click (Future Enhancement)
- Navigate to annotation in modal
- Expand for more details
- Show full history timeline

## Animation Opportunities

### Current
- None (static rendering)

### Future Enhancements
- Fade-in new annotations
- Slide transition between categories
- Pulse effect on newly verified items
- Smooth expand/collapse for details

## Accessibility Considerations

### Color Independence
- Text labels supplement colors ("Type: Detected from AI")
- Badges provide semantic meaning beyond color
- Border patterns distinguish categories

### Screen Readers
- Semantic heading structure (h4 → h5)
- Descriptive text for all metadata
- Badge text is readable

### Keyboard Navigation
- Scrollable with keyboard (arrow keys, page up/down)
- Future: Focus management for interactive elements

## Integration Points

### With Annotation Modal
- Receives real-time updates via custom events
- Syncs immediately when annotations saved
- Reflects all modal changes

### With Export Function
- All displayed data included in JSON export
- Metadata preserved for backend submission
- Audit trail complete

### With Chat Assistant
- Chat can reference specific anomalies
- Context includes all annotation history
- User can ask about modifications

## Performance Notes

- **Rendering**: All categories render conditionally
- **Filtering**: Array.filter() runs on each render
- **Optimization**: Could memoize filtered arrays if performance issue
- **Scroll**: Native overflow, no virtual scrolling needed unless 100+ items

## Testing Scenarios

1. **Empty state**: No AI results, no user annotations
2. **AI only**: 5 AI detections, no user interaction
3. **Mixed**: 3 AI, 2 verified, 1 modified, 2 manual
4. **Many items**: 20+ annotations, test scrolling
5. **Long text**: Test description overflow
6. **Timestamps**: Verify date formatting
7. **User emails**: Test various email formats
