/**
 * API Configuration
 * Determines the base URL for API requests based on environment
 */

export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  dashboard: `${API_BASE_URL}/api/dashboard/`,
  chapters: `${API_BASE_URL}/api/chapters/`,
  upload: `${API_BASE_URL}/api/upload/`,
};
