import axios from "axios";
import { getGlobalLogout } from "./auth";

/**
 * API Configuration
 * Centralized API base URL management
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5509";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
});

// Request interceptor - Add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    
    // Handle authentication errors
    if (status === 401 || status === 403) {
      const logout = getGlobalLogout();
      if (logout) {
        const message = status === 401 
          ? "Your session has expired. Please login again."
          : "You don't have permission to access this resource. Please login again.";
        logout(message);
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error("Network error:", error.message);
    }
    
    return Promise.reject(error);
  }
);

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
    `${API_BASE_URL}/transformer-thermal-inspection/api/v1/image-analysis/result/${inspectionNo}`,
  ANALYSIS_ANALYZE: (inspectionNo: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/api/v1/image-analysis/analyze/${inspectionNo}`,
  ANALYSIS_UPDATE_ANNOTATIONS: (inspectionNo: string, transformerNo: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/api/v1/image-analysis/result/update/${inspectionNo}/${transformerNo}`,

  // User Management
  USER_PROFILE: `${API_BASE_URL}/transformer-thermal-inspection/api/user/profile`,
  USER_LOGIN: `${API_BASE_URL}/transformer-thermal-inspection/api/auth/login`,
  USER_SIGNUP: `${API_BASE_URL}/transformer-thermal-inspection/api/auth/signup`,

  // Maintenance Records
  MAINTENANCE_SAVE: `${API_BASE_URL}/transformer-thermal-inspection/api/maintenance-records`,
  MAINTENANCE_GET_BY_INSPECTION: (inspectionId: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/api/maintenance-records/inspection/${inspectionId}`,
  MAINTENANCE_GET_BY_TRANSFORMER: (transformerNo: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/api/maintenance-records/transformer/${transformerNo}`,
  MAINTENANCE_GET_HISTORY: (inspectionId: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/api/maintenance-records/inspection/${inspectionId}/history`,
  MAINTENANCE_RESTORE_VERSION: (inspectionId: string, version: number) =>
    `${API_BASE_URL}/transformer-thermal-inspection/api/maintenance-records/inspection/${inspectionId}/restore/${version}`,

  // Thermal Inspection Reports
  THERMAL_INSPECTION_SAVE: `${API_BASE_URL}/transformer-thermal-inspection/api/thermal-inspection-reports`,
  THERMAL_INSPECTION_GET: (inspectionId: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/api/thermal-inspection-reports/inspection/${inspectionId}`,
  THERMAL_INSPECTION_HISTORY: (inspectionId: string) =>
    `${API_BASE_URL}/transformer-thermal-inspection/api/thermal-inspection-reports/inspection/${inspectionId}/history`,
  THERMAL_INSPECTION_RESTORE: (inspectionId: string, version: number) =>
    `${API_BASE_URL}/transformer-thermal-inspection/api/thermal-inspection-reports/inspection/${inspectionId}/restore/${version}`,
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
