# API Client Usage Guide

## Overview

The BNI PALMS Analytics application now uses a centralized API client (`apiClient`) that automatically handles JWT authentication for all API requests.

**Location:** `frontend/src/lib/apiClient.ts`

## Features

- ✅ Automatic JWT token injection in all requests
- ✅ Token expiration handling with auto-redirect to login
- ✅ Support for both admin and chapter authentication
- ✅ Type-safe methods for common HTTP verbs
- ✅ Proper error handling with 401/403 status codes
- ✅ Support for FormData (file uploads)

## Basic Usage

### Importing

```typescript
import { apiClient } from '@/lib/apiClient';
```

### GET Requests

```typescript
// Get all chapters (admin only)
const chapters = await apiClient.get('/api/chapters/');

// Get specific chapter
const chapter = await apiClient.get(`/api/chapters/${chapterId}/`);

// Get monthly reports
const reports = await apiClient.get(`/api/chapters/${chapterId}/reports/`);
```

### POST Requests

```typescript
// Create a new member
const newMember = await apiClient.post(`/api/chapters/${chapterId}/members/`, {
  first_name: 'John',
  last_name: 'Doe',
  business_name: 'Acme Corp',
  classification: 'Technology',
});

// Upload files (FormData)
const formData = new FormData();
formData.append('slip_audit_files', file);
formData.append('chapter_id', chapterId);

const result = await apiClient.post('/api/upload/excel/', formData);
```

### PUT/PATCH Requests

```typescript
// Update a member
const updated = await apiClient.patch(`/api/chapters/${chapterId}/members/${memberId}/`, {
  business_name: 'New Business Name',
});
```

### DELETE Requests

```typescript
// Delete a member
await apiClient.delete(`/api/chapters/${chapterId}/members/${memberId}/`);
```

## Authentication

### How It Works

1. **Token Storage**: JWT tokens are stored in `localStorage`:
   - `bni_admin_auth` - Admin authentication token
   - `bni_chapter_auth` - Chapter authentication token

2. **Token Priority**: Admin tokens take precedence over chapter tokens when both exist.

3. **Automatic Injection**: The API client automatically:
   - Reads tokens from localStorage
   - Checks expiration
   - Adds `Authorization: Bearer <token>` header to all requests

4. **Error Handling**:
   - **401 Unauthorized**: Clears auth and redirects to landing page
   - **403 Forbidden**: Throws permission error

### Skipping Authentication

For public endpoints (like login), use the `skipAuth` option:

```typescript
const response = await apiClient.fetch('/api/chapters/1/authenticate/', {
  method: 'POST',
  body: JSON.stringify({ password: 'secret' }),
  skipAuth: true, // Don't send Authorization header
});
```

## Migration from `fetch()`

### Before (using raw fetch)

```typescript
const response = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

if (!response.ok) {
  throw new Error('Failed to fetch chapter');
}

const data = await response.json();
```

### After (using apiClient)

```typescript
const data = await apiClient.get(`/api/chapters/${chapterId}/`);
```

**Benefits:**
- ✅ JWT token automatically added
- ✅ Less boilerplate code
- ✅ Consistent error handling
- ✅ Type safety

## Examples from Codebase

### Chapter Management

```typescript
// Get all chapters (admin)
const chapters = await apiClient.get('/api/chapters/');

// Create chapter (admin)
const newChapter = await apiClient.post('/api/chapters/', {
  name: 'Dubai Marina',
  region: 'Dubai',
});

// Delete chapter (admin)
await apiClient.delete(`/api/chapters/${chapterId}/`);
```

### Member Management

```typescript
// List members for a chapter
const members = await apiClient.get(`/api/chapters/${chapterId}/members/`);

// Get member analytics
const analytics = await apiClient.get(
  `/api/chapters/${chapterId}/members/${memberName}/analytics/`
);

// Create member
const member = await apiClient.post(`/api/chapters/${chapterId}/members/`, {
  first_name: 'Jane',
  last_name: 'Smith',
  classification: 'Finance',
});

// Update member
await apiClient.patch(`/api/chapters/${chapterId}/members/${memberId}/`, {
  email: 'jane@example.com',
});

// Delete member
await apiClient.delete(`/api/chapters/${chapterId}/members/${memberId}/`);
```

### Report Management

```typescript
// Get monthly reports
const reports = await apiClient.get(`/api/chapters/${chapterId}/reports/`);

// Get specific report
const report = await apiClient.get(
  `/api/chapters/${chapterId}/reports/${reportId}/`
);

// Delete report (admin only)
await apiClient.delete(`/api/chapters/${chapterId}/reports/${reportId}/`);
```

### File Uploads

```typescript
// Upload Excel files
const formData = new FormData();
formData.append('slip_audit_files', slipFile1);
formData.append('slip_audit_files', slipFile2);
formData.append('member_names_file', membersFile);
formData.append('chapter_id', chapterId);
formData.append('month_year', '2025-01');

const result = await apiClient.post('/api/upload/excel/', formData);

// Bulk upload (admin only)
const bulkData = new FormData();
bulkData.append('file', regionalSummaryFile);

const bulkResult = await apiClient.post('/api/upload/bulk/', bulkData);
```

### Analytics

```typescript
// Get referral matrix
const referralMatrix = await apiClient.get(
  `/api/chapters/${chapterId}/reports/${reportId}/matrix/referral/`
);

// Get one-to-one matrix
const otoMatrix = await apiClient.get(
  `/api/chapters/${chapterId}/reports/${reportId}/matrix/one-to-one/`
);

// Compare reports
const comparison = await apiClient.get(
  `/api/chapters/${chapterId}/comparison/comprehensive/?report_id=${current}&previous_report_id=${previous}`
);
```

## Error Handling

The API client throws errors for failed requests. Use try-catch:

```typescript
try {
  const data = await apiClient.get('/api/chapters/');
} catch (error) {
  console.error('Failed to fetch chapters:', error);
  // Show error message to user
}
```

### Common Errors

- **401 Unauthorized**: Token expired or invalid → Auto-redirects to login
- **403 Forbidden**: Insufficient permissions → Throws permission error
- **404 Not Found**: Resource doesn't exist
- **500 Server Error**: Backend error

## Testing

### With Valid Token

```typescript
// Login first
const { token } = await authenticateChapter(chapterId, password);

// Token is now stored in localStorage
// All subsequent requests will include it automatically

const data = await apiClient.get('/api/chapters/1/');
// Request includes: Authorization: Bearer <token>
```

### Without Token

```typescript
// Clear localStorage
localStorage.clear();

// Try to access protected endpoint
await apiClient.get('/api/chapters/'); // ❌ Throws 401, redirects to login
```

## Notes

- The API client is backward compatible with direct `fetch()` calls
- You can still use `fetch()` directly, but you'll need to manually add auth headers
- The `apiClient.fetch()` method provides raw fetch with auth for custom cases
- FormData uploads automatically set correct Content-Type headers

## Related Files

- `frontend/src/lib/apiClient.ts` - API client implementation
- `frontend/src/contexts/auth-context.tsx` - Authentication context
- `frontend/src/config/api.ts` - API base URL configuration
- `backend/chapters/authentication.py` - Backend JWT authentication
- `backend/chapters/permissions.py` - Backend permission classes

## Security Notes

1. **Never log tokens** - They're sensitive credentials
2. **Tokens expire after 24 hours** - Users must re-authenticate
3. **HTTPS required in production** - Tokens must be transmitted securely
4. **localStorage security** - Tokens are stored client-side (XSS risk mitigation needed)

## Next Steps for Developers

To migrate existing code to use the API client:

1. Find all `fetch()` calls: `grep -r "fetch(" src/`
2. Replace with appropriate `apiClient` method
3. Remove manual header management
4. Remove manual error handling for auth errors
5. Test authentication flows

Example replacements needed:
- ✅ `auth-context.tsx` - Updated to use `apiClient` for login
- ⏳ `landing-page.tsx` - Update chapter list fetch
- ⏳ `security-settings-tab.tsx` - Update settings fetches
- ⏳ `bulk-upload-tab.tsx` - Update upload endpoints
- ⏳ `useChapterManagement.ts` - Update CRUD operations
- ⏳ `useMemberManagement.ts` - Update member operations
- ⏳ And many more...

---

**Last Updated:** 2025-01-15
**Status:** ✅ API Client Created and Integrated with Auth Context
