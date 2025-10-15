/**
 * API Client with JWT Authentication
 *
 * This module provides a centralized API client that automatically:
 * - Adds JWT tokens to all requests
 * - Handles token expiration and redirects to login
 * - Provides type-safe fetch wrapper
 *
 * Usage:
 * ```typescript
 * import { apiClient } from '@/lib/apiClient';
 *
 * // GET request
 * const data = await apiClient.get('/api/chapters/');
 *
 * // POST request
 * const result = await apiClient.post('/api/chapters/1/authenticate/', { password: 'abc' });
 *
 * // DELETE request
 * await apiClient.delete('/api/chapters/1/members/123/');
 * ```
 */

import { API_BASE_URL } from '@/config/api';

const CHAPTER_AUTH_KEY = 'bni_chapter_auth';
const ADMIN_AUTH_KEY = 'bni_admin_auth';

interface ChapterAuth {
  chapterId: string;
  token: string;
  expiresAt: string;
  chapterName: string;
}

interface AdminAuth {
  token: string;
  expiresAt: string;
}

/**
 * Get the current authentication token (admin takes precedence)
 */
function getAuthToken(): string | null {
  // Check admin auth first (higher priority)
  const adminAuthStr = localStorage.getItem(ADMIN_AUTH_KEY);
  if (adminAuthStr) {
    try {
      const adminAuth: AdminAuth = JSON.parse(adminAuthStr);
      const expiresAt = new Date(adminAuth.expiresAt);

      if (expiresAt > new Date()) {
        return adminAuth.token;
      } else {
        // Token expired, clear it
        localStorage.removeItem(ADMIN_AUTH_KEY);
      }
    } catch (error) {
      console.error('Failed to parse admin auth:', error);
      localStorage.removeItem(ADMIN_AUTH_KEY);
    }
  }

  // Check chapter auth
  const chapterAuthStr = localStorage.getItem(CHAPTER_AUTH_KEY);
  if (chapterAuthStr) {
    try {
      const chapterAuth: ChapterAuth = JSON.parse(chapterAuthStr);
      const expiresAt = new Date(chapterAuth.expiresAt);

      if (expiresAt > new Date()) {
        return chapterAuth.token;
      } else {
        // Token expired, clear it
        localStorage.removeItem(CHAPTER_AUTH_KEY);
      }
    } catch (error) {
      console.error('Failed to parse chapter auth:', error);
      localStorage.removeItem(CHAPTER_AUTH_KEY);
    }
  }

  return null;
}

/**
 * Clear all authentication and redirect to login
 */
function handleAuthError() {
  localStorage.removeItem(CHAPTER_AUTH_KEY);
  localStorage.removeItem(ADMIN_AUTH_KEY);

  // Redirect to landing page
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

export interface FetchOptions extends RequestInit {
  skipAuth?: boolean; // Skip authentication for public endpoints
}

/**
 * Enhanced fetch wrapper with automatic JWT authentication
 */
async function fetchWithAuth(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;

  // Prepare headers
  const headers: HeadersInit = {
    ...fetchOptions.headers,
  };

  // Add authentication token if not skipped
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Add default Content-Type for non-FormData requests
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Make the request
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Handle authentication errors
  if (response.status === 401) {
    console.warn('Authentication failed (401). Clearing auth and redirecting to login.');
    handleAuthError();
    throw new Error('Authentication required. Please log in again.');
  }

  // Handle forbidden errors
  if (response.status === 403) {
    console.warn('Access forbidden (403). Insufficient permissions.');
    throw new Error('You do not have permission to access this resource.');
  }

  return response;
}

/**
 * API Client with convenient methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetchWithAuth(fullUrl, {
      ...options,
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GET ${url} failed: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetchWithAuth(fullUrl, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`POST ${url} failed: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetchWithAuth(fullUrl, {
      ...options,
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PUT ${url} failed: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetchWithAuth(fullUrl, {
      ...options,
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PATCH ${url} failed: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetchWithAuth(fullUrl, {
      ...options,
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DELETE ${url} failed: ${response.status} ${errorText}`);
    }

    // DELETE might not return JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return {} as T;
  },

  /**
   * Raw fetch with authentication (for custom cases)
   */
  fetch: fetchWithAuth,
};

/**
 * Export for backward compatibility
 */
export { fetchWithAuth };
