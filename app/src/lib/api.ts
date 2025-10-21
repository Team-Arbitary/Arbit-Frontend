/**
 * API Configuration
 * Centralized API base URL management
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5509";

export const API_ENDPOINTS = {
  // Transformer Management
  TRANSFORMER_CREATE: `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/create`,
  TRANSFORMER_VIEW_ALL: `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/view-all`,
  TRANSFORMER_DETAIL: (id: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/view/${id}`,
  TRANSFORMER_FILTER: `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/filter`,
  TRANSFORMER_UPDATE: `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/update`,
  TRANSFORMER_DELETE: (id: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/transformer-management/delete/${id}`,

  // Inspection Management
  INSPECTION_CREATE: `${API_BASE_URL}/transformer-thermal-inspection/inspection-management/create`,
  INSPECTION_VIEW_ALL: `${API_BASE_URL}/transformer-thermal-inspection/inspection-management/view-all`,
  INSPECTION_DETAIL: (id: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/inspection-management/view/${id}`,
  INSPECTION_DELETE: (id: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/inspection-management/delete/${id}`,

  // Image Inspection Management
  IMAGE_UPLOAD: `${API_BASE_URL}/transformer-thermal-inspection/image-inspection-management/upload`,
  IMAGE_BASELINE: (transformerNo: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/image-inspection-management/baseline/${encodeURIComponent(
      transformerNo
    )}`,
  IMAGE_THERMAL: (inspectionNo: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/image-inspection-management/thermal/${inspectionNo}`,

  // Image Analysis
  ANALYSIS_RESULT: (inspectionNo: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/image-analysis/result/${inspectionNo}`,
  ANALYSIS_ANALYZE: (inspectionNo: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/image-analysis/analyze/${inspectionNo}`,
  ANALYSIS_UPDATE_ANNOTATIONS: (inspectionNo: string, transformerNo: string) =>
    `${API_BASE_URL}/api/v1/image-analysis/result/update/${inspectionNo}/${transformerNo}`,
} as const;

/**
 * API Response envelope type
 */
export type ApiEnvelope<T> =
  | {
      responseCode?: string;
      responseDescription?: string;
      responseData?: T;
    }
  | T;
