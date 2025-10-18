# API Configuration Guide

## Overview
The frontend is now properly configured to connect to your Spring Boot backend running on **port 5509**.

## Configuration Files

### Environment Files
- **`.env.development`** - For local development (points to `http://localhost:5509`)
- **`.env.production`** - For production deployment (points to `https://arbit-backend-1.onrender.com`)

### API Configuration
All API endpoints are centralized in `/app/src/lib/api.ts`:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5509';

export const API_ENDPOINTS = {
  // Transformer Management
  TRANSFORMER_CREATE: `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/create`,
  TRANSFORMER_VIEW_ALL: `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/view-all`,
  TRANSFORMER_DETAIL: (id: string) => `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/view/${id}`,
  TRANSFORMER_FILTER: `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/filter`,
  TRANSFORMER_UPDATE: `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/update`,
  TRANSFORMER_DELETE: (id: string) => `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/delete/${id}`,
  
  // Inspection Management
  INSPECTION_CREATE: `${API_BASE_URL}/transformer-thermal-inspection/inspection-management/create`,
  INSPECTION_VIEW_ALL: `${API_BASE_URL}/transformer-thermal-inspection/inspection-management/view-all`,
  INSPECTION_DETAIL: (id: string) => `${API_BASE_URL}/transformer-thermal-inspection/inspection-management/view/${id}`,
  INSPECTION_DELETE: (id: string) => `${API_BASE_URL}/transformer-thermal-inspection/inspection-management/delete/${id}`,
  
  // Image Inspection Management
  IMAGE_UPLOAD: `${API_BASE_URL}/transformer-thermal-inspection/image-inspection-management/upload`,
  IMAGE_BASELINE: (transformerNo: string) => `${API_BASE_URL}/transformer-thermal-inspection/image-inspection-management/baseline/${encodeURIComponent(transformerNo)}`,
  IMAGE_THERMAL: (inspectionNo: string) => `${API_BASE_URL}/transformer-thermal-inspection/image-inspection-management/thermal/${inspectionNo}`,
  
  // Image Analysis
  ANALYSIS_RESULT: (inspectionNo: string) => `${API_BASE_URL}/transformer-thermal-inspection/image-analysis/result/${inspectionNo}`,
  ANALYSIS_ANALYZE: (inspectionNo: string) => `${API_BASE_URL}/transformer-thermal-inspection/image-analysis/analyze/${inspectionNo}`,
}
```

## Updated Components

All components now use the centralized `API_ENDPOINTS`:

1. **`AddTransformerModal.tsx`** - Create new transformers
2. **`AddInspectionModal.tsx`** - Create new inspections
3. **`Dashboard.tsx`** - View, filter, update, delete transformers and inspections
4. **`TransformerDetail.tsx`** - Transformer details, baseline image management
5. **`InspectionDetail.tsx`** - Inspection details, thermal image analysis

## Running the Application

### Development Mode (Local Backend)
```bash
cd app
npm run dev
```
Frontend will run on: `http://localhost:8080`  
Backend should be running on: `http://localhost:5509`

### Production Build
```bash
cd app
npm run build
```

## Changing the Backend URL

### For Local Development
Edit `/app/.env.development`:
```env
VITE_API_BASE_URL=http://localhost:5509
```

### For Production
Edit `/app/.env.production`:
```env
VITE_API_BASE_URL=https://your-production-backend.com
```

### For Testing Different Ports
You can override the URL by creating `/app/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:YOUR_PORT
```

## CORS Configuration

Make sure your Spring Boot backend has CORS configured to allow requests from:
- `http://localhost:8080` (development)
- Your production frontend domain

Example Spring Boot CORS configuration:
```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:8080", "https://your-frontend-domain.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowCredentials(true);
    }
}
```

## Troubleshooting

### Connection Refused
- Verify backend is running on port 5509
- Check `http://localhost:5509/actuator/health`

### CORS Errors
- Add `http://localhost:8080` to backend's CORS allowed origins
- Check browser console for specific CORS error messages

### API 404 Errors
- Verify endpoint paths match backend controller mappings
- Check SpringDoc OpenAPI docs at `http://localhost:5509/swagger-ui.html`

## Next Steps

1. ✅ Backend running on port 5509
2. ✅ Frontend configured to connect to localhost:5509
3. ✅ All API calls centralized
4. 🔄 Test the connection by running `npm run dev`
5. 🔄 Verify CORS is properly configured on backend
