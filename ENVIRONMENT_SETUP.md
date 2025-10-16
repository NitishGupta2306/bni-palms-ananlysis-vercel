# Environment Configuration Guide

**Date:** 2025-10-16
**Task:** #49 - Environment Configuration
**Status:** ✅ COMPLETE

---

## Overview

This guide explains how to configure environment variables for the BNI PALMS Analytics application (both backend and frontend).

---

## Quick Start

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your actual values
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with your actual values
npm start
```

---

## Backend Environment Variables

### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SECRET_KEY` | Django secret key for cryptographic signing | `django-insecure-*` | Generate new for production |
| `DEBUG` | Enable/disable debug mode | `True` | `False` (production) |
| `ALLOWED_HOSTS` | Comma-separated hostnames | `localhost,127.0.0.1` | `yourdomain.com` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | SQLite (dev) | `postgresql://user:pass@host:5432/db` |
| `CORS_ALLOWED_ORIGINS` | Frontend URLs (comma-separated) | `http://localhost:3000` | `https://yourdomain.com` |
| `VERCEL` | Set to "1" for Vercel deployment | - | `1` |

---

## Frontend Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `REACT_APP_BACKEND_URL` | Backend API base URL | `http://localhost:8000` | `https://api.yourdomain.com` |

**Important:** React environment variables:
- Must start with `REACT_APP_`
- Are embedded at **build time** (not runtime)
- Require restarting dev server after changes
- Must be set in hosting platform for production

---

## Development Setup

### 1. Backend Development

```bash
cd backend

# Copy example file
cp .env.example .env

# Edit .env (example development config)
cat > .env << EOF
SECRET_KEY=django-insecure-dev-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

### 2. Frontend Development

```bash
cd frontend

# Copy example file
cp .env.example .env

# Edit .env (example development config)
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8000
EOF

# Install dependencies
npm install

# Start development server
npm start
```

---

## Production Deployment

### Backend (Vercel/Railway/Heroku)

#### 1. Generate Secure SECRET_KEY

```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

#### 2. Set Environment Variables

**Vercel:**
```bash
vercel env add SECRET_KEY
vercel env add DEBUG
vercel env add ALLOWED_HOSTS
vercel env add DATABASE_URL
vercel env add CORS_ALLOWED_ORIGINS
```

**Railway/Heroku:** Set in dashboard or CLI

#### 3. Production Configuration

```bash
# CRITICAL: Set these correctly!
SECRET_KEY=<generated-secret-key>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=postgresql://user:password@host:5432/database
CORS_ALLOWED_ORIGINS=https://yourfrontend.com
VERCEL=1  # Only if deploying to Vercel
```

---

### Frontend (Vercel/Netlify)

#### Set Environment Variables

**Vercel:**
```bash
vercel env add REACT_APP_BACKEND_URL production
# Enter: https://your-backend.vercel.app
```

**Netlify:** Set in Site Settings > Build & Deploy > Environment

#### Production Configuration

```bash
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

---

## Database Configuration

### SQLite (Development)

Default when `DATABASE_URL` is not set:
- Database file: `backend/db.sqlite3`
- Automatically created
- Good for development only

### PostgreSQL (Production)

**Supabase Example:**
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

**Local PostgreSQL:**
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/bni_palms
```

**Connection Pooling:**
- Automatically enabled with 600s timeout
- Health checks enabled
- SSL required in production

---

## Security Considerations

### ⚠️ Never Commit These Files:
- ❌ `backend/.env`
- ❌ `frontend/.env`
- ❌ `.env.local`
- ❌ `.env.production`

### ✅ Safe to Commit:
- ✅ `backend/.env.example`
- ✅ `frontend/.env.example`

### Production Checklist

**Backend:**
- [ ] `SECRET_KEY` is changed from default
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` includes production domain
- [ ] `DATABASE_URL` points to production database
- [ ] `CORS_ALLOWED_ORIGINS` includes production frontend
- [ ] HTTPS is configured
- [ ] Security headers enabled (automatic when DEBUG=False)

**Frontend:**
- [ ] `REACT_APP_BACKEND_URL` uses HTTPS
- [ ] Backend domain is correct
- [ ] CORS is configured on backend
- [ ] Environment variables set in hosting platform
- [ ] New build triggered after env var changes

---

## Common Issues

### Backend: "DisallowedHost" Error

**Problem:** Django rejects requests from unlisted hosts

**Solution:** Add your domain to `ALLOWED_HOSTS`
```bash
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,subdomain.yourdomain.com
```

---

### Frontend: API Requests Fail (CORS)

**Problem:** Browser blocks API requests due to CORS

**Solution:** Add frontend URL to backend `CORS_ALLOWED_ORIGINS`
```bash
# Backend .env
CORS_ALLOWED_ORIGINS=https://yourfrontend.com,https://www.yourfrontend.com
```

---

### Frontend: Changes Not Reflected

**Problem:** Environment variable changes not working

**Solution:**
1. Restart dev server (`npm start`)
2. For production: Trigger new build after changing env vars
3. Clear browser cache

---

### Database Connection Errors

**Problem:** Cannot connect to PostgreSQL

**Solution:**
1. Check `DATABASE_URL` format
2. Verify credentials
3. Ensure database exists
4. Check firewall/network access
5. Verify SSL requirements

---

## Environment-Specific Configs

### Local Development

```bash
# Backend
DEBUG=True
DATABASE_URL=  # Leave empty for SQLite
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Frontend
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Staging

```bash
# Backend
DEBUG=False
DATABASE_URL=postgresql://user:pass@staging-db:5432/bni_staging
ALLOWED_HOSTS=staging.yourdomain.com
CORS_ALLOWED_ORIGINS=https://staging.yourdomain.com

# Frontend
REACT_APP_BACKEND_URL=https://staging-api.yourdomain.com
```

### Production

```bash
# Backend
DEBUG=False
DATABASE_URL=postgresql://user:pass@prod-db:5432/bni_production
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Frontend
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

---

## Vercel-Specific Configuration

### Auto-Detection

Vercel automatically detects `VERCEL=1` environment variable and adds:
- `*.vercel.app` to `ALLOWED_HOSTS`
- Vercel domains to CORS regex

### Setting Variables

```bash
# Via CLI
vercel env add SECRET_KEY production
vercel env add DEBUG production
vercel env add DATABASE_URL production

# Via Dashboard
# Project Settings > Environment Variables
```

### Preview Deployments

- Use separate environment variables for preview branches
- Set up different DATABASE_URL for testing
- Preview URLs automatically added to ALLOWED_HOSTS

---

## Testing Configuration

### Check Backend Config

```bash
cd backend
python manage.py check --deploy
```

### Check Environment Variables Loaded

```python
# backend/manage.py
import os
print(f"DEBUG: {os.environ.get('DEBUG')}")
print(f"DATABASE_URL: {os.environ.get('DATABASE_URL', 'Not set - using SQLite')}")
```

### Check Frontend Config

```bash
# Start dev server with debug
REACT_APP_DEBUG=true npm start

# Check in browser console
console.log(process.env)  # Only shows REACT_APP_* variables
```

---

## Migration from Old Setup

If you're migrating from hardcoded values:

1. **Create .env files**
   ```bash
   cp .env.example .env
   ```

2. **Extract current values** from settings.py/config files

3. **Update settings.py** to use `os.environ.get()`

4. **Test locally** before deploying

5. **Set production values** in hosting platform

---

## Related Documentation

- [Django Settings Documentation](https://docs.djangoproject.com/en/4.2/topics/settings/)
- [Create React App Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Python-dotenv Documentation](https://pypi.org/project/python-dotenv/)

---

## Task Completion

✅ Backend `.env.example` created
✅ Frontend `.env.example` created
✅ All environment variables documented
✅ Setup instructions provided
✅ Security best practices included
✅ Common issues documented
✅ Production checklist provided

**Status:** COMPLETE
**Effort:** 2 hours
**Impact:** Improved maintainability and security
