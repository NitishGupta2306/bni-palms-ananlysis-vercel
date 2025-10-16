# API Client Migration Status

**Date:** 2025-01-15
**Branch:** `fixes-oct-13`
**Purpose:** Track migration from raw `fetch()` to authenticated `apiClient`

---

## Overview

Migrating all API calls to use the centralized `apiClient` (located at `frontend/src/lib/apiClient.ts`) which provides:
- ✅ Automatic JWT token injection
- ✅ Token expiration handling with auto-redirect
- ✅ Consistent error handling (401/403)
- ✅ Type-safe methods
- ✅ Support for FormData (uploads)

---

## Migration Progress: 70% Complete

**Completed: 14 files**
**Remaining: 6 files**
**Estimated Time: 1-2 hours**

---

## ✅ Completed Migrations

### Core Services (100%)
- [x] `frontend/src/shared/services/ChapterDataLoader.ts`
  - All API calls (dashboard, reports, members, matrices, comparisons)
  - Uses `apiClient.get()`, `apiClient.delete()`

### Admin Hooks (100%)
- [x] `frontend/src/features/admin/hooks/useChapterManagement.ts`
  - Chapter CRUD operations
  - Uses `apiClient.post()`, `apiClient.put()`, `apiClient.delete()`

- [x] `frontend/src/features/admin/hooks/useMemberManagement.ts`
  - Member deletion (single and bulk)
  - Uses `apiClient.delete()`

### Member Hooks (100%)
- [x] `frontend/src/features/members/hooks/useMemberDetail.ts`
  - Member analytics fetching
  - Uses `apiClient.get()`

- [x] `frontend/src/features/members/hooks/useMemberActions.ts`
  - Member update and delete
  - Uses `apiClient.put()`, `apiClient.delete()`

### Analytics Components (100%)
- [x] `frontend/src/features/analytics/components/matrix-tab.tsx`
  - Matrix download
  - Uses `fetchWithAuth()` (raw authenticated fetch)

- [x] `frontend/src/features/analytics/components/matrix-selector.tsx`
  - PALMS download
  - Uses `fetchWithAuth()`

- [x] `frontend/src/features/analytics/components/matrix-export-button.tsx`
  - Export functionality
  - Uses `fetchWithAuth()`

- [x] `frontend/src/features/analytics/components/multi-month-tab.tsx`
  - Multi-month data
  - Uses `fetchWithAuth()`

### Landing & Auth (100%)
- [x] `frontend/src/features/landing/pages/landing-page.tsx`
  - Public chapters list
  - Uses `apiClient.get()` with `skipAuth: true`

- [x] `frontend/src/contexts/auth-context.tsx`
  - Login endpoints
  - Uses `apiClient.fetch()` with `skipAuth: true`

---

## ⏳ Remaining Migrations

### Admin Components (2 files)

#### 1. `frontend/src/features/admin/components/security-settings-tab.tsx`
**Lines:** 50, 64, 119, 167

**Current:**
```typescript
// Line 50
const chaptersResponse = await fetch(`${API_BASE_URL}/api/chapters/`);

// Line 64
const adminResponse = await fetch(`${API_BASE_URL}/api/admin/get-settings/`, {
  headers: { Authorization: `Bearer ${adminAuth?.token}` }
});

// Line 119
const response = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/update_password/`, {
  method: "POST",
  headers: { Authorization: `Bearer ${adminAuth?.token}` },
  body: JSON.stringify({ new_password: newPassword })
});

// Line 167
const response = await fetch(`${API_BASE_URL}/api/admin/update_password/`, {
  method: "POST",
  headers: { Authorization: `Bearer ${adminAuth?.token}` },
  body: JSON.stringify({ new_password: newPassword })
});
```

**Should be:**
```typescript
import { apiClient } from "@/lib/apiClient";

// Line 50
const chaptersData = await apiClient.get('/api/chapters/');

// Line 64
const adminData = await apiClient.get('/api/admin/get-settings/');

// Line 119
await apiClient.post(`/api/chapters/${chapterId}/update_password/`, {
  new_password: newPassword
});

// Line 167
await apiClient.post('/api/admin/update_password/', {
  new_password: newPassword
});
```

---

#### 2. `frontend/src/features/admin/components/bulk-upload-tab.tsx`
**Lines:** 33, 107

**Current:**
```typescript
// Line 33
const response = await fetch(`${API_BASE_URL}/api/upload/bulk/`, {
  method: "POST",
  body: formData  // FormData for file upload
});

// Line 107
const response = await fetch(`${API_BASE_URL}/api/upload/reset-all/`, {
  method: "POST"
});
```

**Should be:**
```typescript
import { apiClient } from "@/lib/apiClient";

// Line 33 - apiClient handles FormData automatically
const response = await apiClient.post('/api/upload/bulk/', formData);

// Line 107
await apiClient.post('/api/upload/reset-all/');
```

---

### Member Components (1 file)

#### 3. `frontend/src/features/members/components/members-tab.tsx`
**Lines:** 69, 118, 159

**Current:**
```typescript
// Line 69
const response = await fetch(`${API_BASE_URL}/api/chapters/${chapterData.chapterId}/`);

// Line 118
const response = await fetch(
  `${API_BASE_URL}/api/chapters/${chapterData.chapterId}/members/`,
  { method: "POST", body: JSON.stringify(formData) }
);

// Line 159
const response = await fetch(
  `${API_BASE_URL}/api/chapters/${chapterData.chapterId}/members/${member.id}/`,
  { method: "PATCH", body: JSON.stringify({ is_active: !member.is_active }) }
);
```

**Should be:**
```typescript
import { apiClient } from "@/lib/apiClient";

// Line 69
const data = await apiClient.get(`/api/chapters/${chapterData.chapterId}/`);
setMembers(data.members || []);

// Line 118
await apiClient.post(`/api/chapters/${chapterData.chapterId}/members/`, formData);

// Line 159
await apiClient.patch(
  `/api/chapters/${chapterData.chapterId}/members/${member.id}/`,
  { is_active: !member.is_active }
);
```

---

### Analytics Hooks (1 file)

#### 4. `frontend/src/features/analytics/hooks/useMatrixData.ts`
**Line:** 80

**Current:**
```typescript
fetch(`${API_BASE_URL}/api/chapters/${chapterId}/reports/${selectedReport.id}/tyfcb-data/`)
```

**Should be:**
```typescript
apiClient.get(`/api/chapters/${chapterId}/reports/${selectedReport.id}/tyfcb-data/`)
```

---

### Workers (1 file) - SKIP

#### 5. `frontend/src/workers/download-worker.ts`
**Line:** 44

**Note:** Web Workers run in a separate thread and don't have access to localStorage (where auth tokens are stored). This file should continue using raw `fetch()` but should receive the auth token as a parameter if needed.

**Current (OK to keep):**
```typescript
const response = await fetch(url);
```

---

### Other Files (1 file) - INVESTIGATE

#### 6. `frontend/src/features/chapters/components/chapter-routes.tsx` & `useAdminData.ts`
**Issue:** Contains `await refetch()` calls

These likely reference React Query or similar data fetching library. Need to investigate what `refetch()` actually does.

---

## Migration Checklist

### Step 1: Update Imports (All Files)
```typescript
// Add to imports
import { apiClient } from "@/lib/apiClient";

// Remove if no longer needed
// import { API_BASE_URL } from "@/config/api";
```

### Step 2: Replace fetch() Calls

**GET Requests:**
```typescript
// Before
const response = await fetch(`${API_BASE_URL}/api/chapters/`);
const data = await response.json();

// After
const data = await apiClient.get('/api/chapters/');
```

**POST Requests:**
```typescript
// Before
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

// After
const data = await apiClient.post(url, payload);
```

**FormData (File Uploads):**
```typescript
// Before
const response = await fetch(url, {
  method: 'POST',
  body: formData  // FormData object
});

// After
const data = await apiClient.post(url, formData);  // Handles FormData automatically
```

**PATCH Requests:**
```typescript
// Before
const response = await fetch(url, {
  method: 'PATCH',
  body: JSON.stringify(payload)
});

// After
const data = await apiClient.patch(url, payload);
```

### Step 3: Remove Manual Authorization Headers
```typescript
// Before
headers: {
  Authorization: `Bearer ${adminAuth?.token}`
}

// After
// Remove - apiClient adds this automatically
```

### Step 4: Update Error Handling
```typescript
// Before
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message);
}

// After
try {
  const data = await apiClient.get(url);
  // Success
} catch (error) {
  // apiClient throws on non-2xx responses
  // 401/403 automatically redirect to login
  console.error('Failed:', error);
}
```

### Step 5: Test Each Migration
- Verify API calls still work
- Check token is being sent (DevTools → Network tab)
- Test error scenarios (expired token, 403, etc.)
- Verify redirects work on auth failure

---

## Testing Plan

### Manual Testing
1. **Login Flow:**
   - Login as admin
   - Login as chapter
   - Verify tokens stored in localStorage

2. **API Calls:**
   - Open Network tab in DevTools
   - Perform actions (view chapters, upload file, etc.)
   - Verify `Authorization: Bearer <token>` header present

3. **Token Expiration:**
   - Clear tokens from localStorage
   - Try to access protected route
   - Verify redirect to landing page

4. **Error Handling:**
   - Try invalid operations
   - Verify error messages display
   - Check console for errors

### Files to Test After Migration
- [ ] security-settings-tab.tsx - Password updates
- [ ] bulk-upload-tab.tsx - File uploads and reset
- [ ] members-tab.tsx - Add/edit member, toggle status
- [ ] useMatrixData.ts - TYFCB data loading

---

## Benefits After Complete Migration

### Before (Current State)
- ❌ Manual token management in some files
- ❌ Inconsistent error handling
- ❌ Some calls missing authentication
- ❌ Code duplication

### After (Goal State)
- ✅ Automatic token injection everywhere
- ✅ Consistent error handling with redirects
- ✅ All API calls authenticated by default
- ✅ DRY - single source of truth for API logic
- ✅ Type-safe API calls
- ✅ Easier to maintain and debug

---

## Quick Migration Script

To find all remaining fetch calls:
```bash
cd frontend
grep -rn "fetch(" src/ \
  --include="*.ts" \
  --include="*.tsx" \
  | grep -v "fetchWithAuth" \
  | grep -v "apiClient" \
  | grep -v "// "
```

---

## Next Steps

1. **Migrate security-settings-tab.tsx** (15 min)
   - 4 fetch calls to update
   - Import apiClient
   - Remove manual auth headers

2. **Migrate bulk-upload-tab.tsx** (10 min)
   - 2 fetch calls
   - FormData already supported by apiClient

3. **Migrate members-tab.tsx** (15 min)
   - 3 fetch calls
   - Standard CRUD operations

4. **Migrate useMatrixData.ts** (5 min)
   - 1 fetch call
   - Simple GET request

5. **Test all migrations** (30 min)
   - Manual testing of each updated component
   - Verify auth headers present
   - Test error scenarios

6. **Commit and document** (10 min)
   - Create comprehensive commit message
   - Update this status document

**Total estimated time: ~1.5 hours**

---

## Related Files

- `frontend/src/lib/apiClient.ts` - API client implementation
- `API_CLIENT_USAGE.md` - Usage documentation
- `AUTHENTICATION_IMPLEMENTATION_STATUS.md` - Auth status
- `frontend/src/contexts/auth-context.tsx` - Token storage

---

**Status:** 🟡 IN PROGRESS (70% complete)
**Priority:** 🟠 MEDIUM (not blocking, but improves security & maintainability)
**Assignee:** In progress
**Next Update:** After completing remaining 4 files
