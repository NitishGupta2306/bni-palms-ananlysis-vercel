# Authentication Implementation Status

**Date:** 2025-01-15
**Branch:** `fixes-oct-13`
**Status:** 🟡 IN PROGRESS (70% Complete)
**Priority:** 🔴 CRITICAL (Task #1 from Master TODO)

---

## What's Been Completed ✅

### 1. Authentication Infrastructure (✅ DONE)

**Files Created:**
- `backend/chapters/authentication.py` - JWT authentication class
- `backend/chapters/permissions.py` - Custom permission classes

**Authentication Class:**
```python
JWTAuthentication(BaseAuthentication)
```
- Extracts JWT tokens from Authorization header
- Verifies tokens using existing `verify_token()` utility
- Returns `JWTAuthObject` with user info
- Handles expired/invalid tokens gracefully

**Permission Classes:**
- `IsAdmin` - Admin-only endpoints
- `IsChapterOrAdmin` - Chapter or admin access
- `IsOwnerChapter` - Chapter-owned resources only
- `ReadOnly` - Read-only for authenticated users

### 2. Settings Updated (✅ DONE)

**File:** `backend/config/settings.py`

**Changed:**
```python
# Before
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
}

# After
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "chapters.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}
```

**Impact:**
- All endpoints now require authentication by default
- JWT tokens must be included in Authorization header
- Login endpoints still work (use `permission_classes = [AllowAny]`)

---

## What Still Needs to Be Done ⏳

### 3. Update View Permissions (⏳ TODO - 2h)

Need to update `permission_classes` on specific endpoints:

#### Chapter Views (`backend/chapters/views.py`)

```python
class ChapterViewSet(viewsets.ModelViewSet):
    # Change this:
    permission_classes = [AllowAny]

    # To this:
    permission_classes = [IsChapterOrAdmin]  # Chapters can see their own data, admins see all

    # Specific methods:
    def list(self, request):
        # Use: IsAdmin (only admins see all chapters)
        pass

    def retrieve(self, request, pk=None):
        # Use: IsChapterOrAdmin (chapters see own, admin sees all)
        pass

    def create(self, request):
        # Use: IsAdmin (only admins create chapters)
        pass

    def destroy(self, request, pk=None):
        # Use: IsAdmin (only admins delete chapters)
        pass

    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def authenticate(self, request, pk=None):
        # Keep: AllowAny (must allow login!)
        pass

    @action(detail=True, methods=["post"])
    def update_password(self, request, pk=None):
        # Change to: IsAdmin
        pass
```

#### Admin Auth Views (`backend/chapters/views.py`)

```python
class AdminAuthViewSet(viewsets.ViewSet):
    # Keep: AllowAny for auth endpoints
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"])
    def authenticate(self, request):
        # Keep: AllowAny
        pass

    @action(detail=False, methods=["post"])
    def update_password(self, request):
        # Change to: IsAdmin
        pass

    @action(detail=False, methods=["get"], url_path="get-settings")
    def get_settings(self, request):
        # Change to: IsAdmin
        pass
```

#### Reports Views (`backend/reports/views.py`)

Need to add:
```python
from chapters.permissions import IsChapterOrAdmin, IsAdmin

class MonthlyReportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsChapterOrAdmin]

    # Chapters can only access their own reports
    # Admins can access all reports
```

#### Analytics Views (`backend/analytics/views.py`)

```python
from chapters.permissions import IsChapterOrAdmin

class AnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [IsChapterOrAdmin]
```

#### Members Views (`backend/members/views.py`)

```python
from chapters.permissions import IsChapterOrAdmin, IsAdmin

class MemberViewSet(viewsets.ModelViewSet):
    permission_classes = [IsChapterOrAdmin]

    def create(self, request):
        # IsAdmin or chapter owner
        pass

    def destroy(self, request, pk=None):
        # IsAdmin or chapter owner
        pass
```

#### Uploads Views (`backend/uploads/views.py`)

```python
from chapters.permissions import IsChapterOrAdmin

class UploadViewSet(viewsets.ViewSet):
    permission_classes = [IsChapterOrAdmin]
```

---

### 4. Add Permission Checks in Methods (⏳ TODO - 1h)

For endpoints that need fine-grained control:

```python
def retrieve(self, request, pk=None):
    """Get chapter details."""
    chapter = self.get_object()

    # Check permissions manually if needed
    if not request.user.is_admin:
        # Non-admin users can only see their own chapter
        if str(request.user.chapter_id) != str(chapter.id):
            return Response(
                {"error": "You can only access your own chapter"},
                status=status.HTTP_403_FORBIDDEN
            )

    # ... rest of method
```

---

### 5. Update Frontend to Send Tokens (⏳ TODO - 1h)

**Location:** `frontend/src/config/api.ts` or similar

Add interceptor to include JWT token in all requests:

```typescript
// Store token after login
localStorage.setItem('auth_token', token);

// Add to all API requests
const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
```

---

### 6. Test All Endpoints (⏳ TODO - 2h)

Test matrix:

| Endpoint | No Auth | Chapter Token | Admin Token | Expected |
|----------|---------|---------------|-------------|----------|
| POST /api/admin/authenticate/ | ✅ | ❌ | ❌ | 200 |
| POST /api/chapters/{id}/authenticate/ | ✅ | ❌ | ❌ | 200 |
| GET /api/chapters/ | ❌ | ❌ | ✅ | 200 for admin only |
| GET /api/chapters/{id}/ | ❌ | ✅ (own) | ✅ | 200 |
| POST /api/chapters/ | ❌ | ❌ | ✅ | 201 for admin only |
| DELETE /api/chapters/{id}/ | ❌ | ❌ | ✅ | 200 for admin only |
| POST /api/chapters/{id}/update_password/ | ❌ | ❌ | ✅ | 200 for admin only |
| GET /api/admin/get-settings/ | ❌ | ❌ | ✅ | 200 for admin only |
| GET /api/reports/ | ❌ | ✅ (own) | ✅ | 200 |
| POST /api/uploads/ | ❌ | ✅ (own) | ✅ | 201 |

Legend:
- ✅ = Should succeed
- ❌ = Should return 401/403
- (own) = Only their own chapter

---

## Implementation Plan

### Step 1: Update Permissions (2h)

1. Update `ChapterViewSet` permissions
2. Update `AdminAuthViewSet` permissions
3. Update all other viewsets (reports, analytics, members, uploads)

### Step 2: Test Backend (1h)

```bash
# Test with curl or Postman

# 1. Login as admin
curl -X POST http://localhost:8000/api/admin/authenticate/ \
  -H "Content-Type: application/json" \
  -d '{"password": "admin123"}'

# Get token from response

# 2. Try protected endpoint with token
curl http://localhost:8000/api/chapters/ \
  -H "Authorization: Bearer <token>"

# 3. Try without token (should fail)
curl http://localhost:8000/api/chapters/

# 4. Try with chapter token on admin endpoint (should fail)
curl -X POST http://localhost:8000/api/chapters/{id}/update_password/ \
  -H "Authorization: Bearer <chapter_token>" \
  -d '{"new_password": "new123"}'
```

### Step 3: Update Frontend (1h)

1. Create API interceptor
2. Store token after login
3. Add token to all requests
4. Handle 401 responses (redirect to login)

### Step 4: Full Integration Test (1h)

1. Login as admin → verify can access all endpoints
2. Login as chapter → verify can only access own data
3. Logout → verify can't access protected endpoints
4. Token expiration → verify redirect to login

---

## Security Benefits

Once complete:

| Before | After |
|--------|-------|
| Anyone can access all endpoints | Must be authenticated |
| No token required | JWT token required in header |
| No permission checks | Fine-grained permissions |
| Anyone can delete chapters | Only admins can delete |
| Anyone can see all chapters | Chapters see own, admins see all |
| Anyone can change passwords | Only admins can change passwords |

---

## Files Modified So Far

1. ✅ `backend/chapters/authentication.py` - NEW
2. ✅ `backend/chapters/permissions.py` - NEW
3. ✅ `backend/config/settings.py` - Modified

## Files That Need Updates

4. ⏳ `backend/chapters/views.py` - Add permission classes
5. ⏳ `backend/reports/views.py` - Add permission classes
6. ⏳ `backend/analytics/views.py` - Add permission classes
7. ⏳ `backend/members/views.py` - Add permission classes
8. ⏳ `backend/uploads/views.py` - Add permission classes
9. ⏳ `frontend/src/config/api.ts` - Add JWT interceptor

---

## Current Status

**Completed:** 70%
- ✅ Authentication infrastructure
- ✅ Permission classes
- ✅ Settings updated

**Remaining:** 30%
- ⏳ Update view permissions (2h)
- ⏳ Frontend token handling (1h)
- ⏳ Testing (2h)

**Total Remaining Time:** ~5 hours

---

## How to Complete

### Quick Commands

```bash
# 1. Commit current progress
git add backend/chapters/authentication.py backend/chapters/permissions.py backend/config/settings.py
git commit -m "feat: add JWT authentication infrastructure"

# 2. Update view permissions (manual work)
# Edit all view files to add permission_classes

# 3. Test
python manage.py runserver
# Try curl commands from Implementation Plan

# 4. Update frontend
# Add JWT interceptor to API client

# 5. Full test
# Login and test all flows
```

---

**Next Steps:**
1. Update permissions in all views (2h)
2. Test with curl/Postman (30min)
3. Update frontend API client (1h)
4. Integration testing (30min)
5. Documentation (30min)

**Total:** ~4.5 hours to complete Critical Task #1
