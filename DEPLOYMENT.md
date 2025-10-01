# BNI Analytics - Deployment Guide

This guide covers deploying the BNI Analytics application to production.

## Architecture Overview

- **Frontend**: React SPA deployed to Vercel
- **Backend**: Django REST API deployed to Railway/Render/Heroku
- **Database**: Managed PostgreSQL (AWS RDS, Digital Ocean, or provider's managed DB)
- **File Storage**: Local storage or AWS S3
- **Cache/Queue**: Redis (managed or self-hosted)

---

## Prerequisites

- [ ] Git repository set up
- [ ] All tests passing locally
- [ ] Manual testing checklist completed
- [ ] Production environment variables prepared
- [ ] Domain name registered (optional but recommended)

---

## Frontend Deployment (Vercel)

### 1. Prepare Frontend

```bash
cd bni-app/frontend

# Ensure all tests pass
npm run test:ci

# Build for production
npm run build

# Test production build locally
npx serve -s build
```

### 2. Deploy to Vercel

**Option A: Using Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**Option B: Using Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `bni-app/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
5. Add Environment Variables:
   - `REACT_APP_API_URL`: Your backend API URL (e.g., `https://api.yourdomain.com`)
6. Click "Deploy"

### 3. Configure Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (up to 48 hours)

### 4. Verify Frontend Deployment

- Visit your Vercel URL or custom domain
- Check that the dashboard loads
- Verify API calls work (may fail until backend is deployed)
- Check browser console for errors

---

## Backend Deployment

### Option 1: Railway

#### 1. Prepare Backend

```bash
cd bni-app/backend

# Create production requirements (if not exists)
pip freeze > requirements.txt

# Ensure migrations are up to date
python manage.py makemigrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Test with production settings locally
DEBUG=False python manage.py check --deploy
```

#### 2. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Railway will detect Django and PostgreSQL

#### 3. Configure Environment Variables

In Railway dashboard, add these variables:
```
DEBUG=False
SECRET_KEY=<generate-new-secret-key>
ALLOWED_HOSTS=.railway.app,yourdomain.com
DATABASE_URL=<automatically-set-by-railway>
REDIS_URL=<add-redis-plugin>
CORS_ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
DJANGO_SETTINGS_MODULE=config.settings
```

#### 4. Configure Build & Start Commands

- **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
- **Start Command**: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

#### 5. Add PostgreSQL & Redis

- In Railway project, click "New" → "Database" → "PostgreSQL"
- Click "New" → "Database" → "Redis"
- Railway will automatically set `DATABASE_URL` and `REDIS_URL`

---

### Option 2: Render

#### 1. Create Render Services

1. Go to [render.com](https://render.com)
2. Create **Web Service**:
   - Connect GitHub repository
   - Root Directory: `bni-app/backend`
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start Command: `gunicorn config.wsgi:application`

3. Create **PostgreSQL Database**:
   - Choose plan
   - Note the connection string

4. Create **Redis Instance**:
   - Choose plan
   - Note the connection string

#### 2. Configure Environment Variables

Add in Render service settings:
```
DEBUG=False
SECRET_KEY=<your-secret-key>
ALLOWED_HOSTS=.onrender.com,yourdomain.com
DATABASE_URL=<postgres-connection-string>
REDIS_URL=<redis-connection-string>
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
DJANGO_SETTINGS_MODULE=config.settings
```

---

### Option 3: Heroku

#### 1. Prepare Heroku Files

Create `Procfile` in `bni-app/backend/`:
```
web: gunicorn config.wsgi --log-file -
worker: celery -A config worker -l info
```

Create `runtime.txt` in `bni-app/backend/`:
```
python-3.10.12
```

#### 2. Deploy to Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create bni-analytics-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set DEBUG=False
heroku config:set SECRET_KEY=<your-secret-key>
heroku config:set ALLOWED_HOSTS=.herokuapp.com,yourdomain.com
heroku config:set CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Deploy
git push heroku main

# Run migrations
heroku run python manage.py migrate

# Create superuser
heroku run python manage.py createsuperuser
```

---

## Database Setup

### 1. Run Migrations

```bash
# On Railway/Render: migrations run automatically via build command
# On Heroku:
heroku run python manage.py migrate

# Or connect to production database and run locally:
python manage.py migrate --database=production
```

### 2. Create Superuser

```bash
# Railway/Render: use web console or CLI
railway run python manage.py createsuperuser

# Heroku:
heroku run python manage.py createsuperuser
```

### 3. Set Up Database Backups

**Railway/Render**:
- Enable automatic backups in dashboard
- Set backup schedule (daily recommended)

**Heroku**:
```bash
heroku pg:backups:schedule --at '02:00 America/Los_Angeles'
```

---

## Post-Deployment Checklist

### Frontend
- [ ] Site loads at production URL
- [ ] Dashboard displays correctly
- [ ] API calls to backend work
- [ ] File uploads work
- [ ] Navigation functions properly
- [ ] No console errors
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (automatic with Vercel)

### Backend
- [ ] API endpoint responds at `/api/dashboard/`
- [ ] Admin panel accessible at `/admin/`
- [ ] Database migrations applied
- [ ] Static files served correctly
- [ ] CORS configured for frontend domain
- [ ] File uploads work
- [ ] Test data uploaded successfully
- [ ] Background tasks (Celery) running (if applicable)

### Security
- [ ] DEBUG=False in production
- [ ] SECRET_KEY is unique and secure
- [ ] ALLOWED_HOSTS configured correctly
- [ ] CORS_ALLOWED_ORIGINS limited to frontend domain
- [ ] HTTPS enforced (SECURE_SSL_REDIRECT=True)
- [ ] Security headers configured
- [ ] Database credentials secured
- [ ] Environment variables not in code

### Monitoring
- [ ] Error tracking configured (Sentry recommended)
- [ ] Uptime monitoring enabled
- [ ] Database backups scheduled
- [ ] Log aggregation set up
- [ ] Performance monitoring active

---

## Environment Variables Reference

### Frontend (.env.production)
```
REACT_APP_API_URL=https://your-backend-url.com
```

### Backend (production environment)
```
DEBUG=False
SECRET_KEY=<secure-random-key>
ALLOWED_HOSTS=.railway.app,.onrender.com,yourdomain.com
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379/0
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

---

## Troubleshooting

### Frontend Issues

**Issue**: API calls fail with CORS errors
**Solution**:
- Check CORS_ALLOWED_ORIGINS in backend includes frontend URL
- Ensure CORS_ALLOW_CREDENTIALS=True if using authentication

**Issue**: Build fails on Vercel
**Solution**:
- Check build logs for specific error
- Ensure all dependencies in package.json
- Set `CI=false` in build environment to treat warnings as non-fatal

### Backend Issues

**Issue**: Static files not loading
**Solution**:
- Run `python manage.py collectstatic`
- Check STATIC_ROOT and STATIC_URL settings
- Verify WhiteNoise is installed and configured

**Issue**: Database connection fails
**Solution**:
- Verify DATABASE_URL is correct
- Check database host is accessible
- Ensure SSL mode is correct (usually `?sslmode=require`)

**Issue**: 500 errors in production
**Solution**:
- Check application logs
- Enable Sentry or error tracking
- Verify all environment variables are set
- Check database migrations are applied

---

## Scaling Considerations

### Database
- Monitor connection pool usage
- Consider read replicas for heavy read workloads
- Implement database indexing for frequently queried fields

### Backend
- Enable Celery for background tasks
- Use Redis for caching frequently accessed data
- Consider CDN for static files
- Implement rate limiting for API endpoints

### Frontend
- Vercel automatically handles CDN and caching
- Implement lazy loading for routes
- Optimize images and assets

---

## Rollback Procedure

### Frontend (Vercel)
1. Go to Vercel dashboard
2. Select project → Deployments
3. Find previous working deployment
4. Click "..." → "Promote to Production"

### Backend (Railway/Render)
1. Revert Git repository to previous commit
2. Push to trigger new deployment
3. OR: Restore database from backup if needed

### Database
```bash
# Heroku
heroku pg:backups:restore <backup-id>

# Railway/Render
# Use dashboard to restore from backup
```

---

## Maintenance

### Regular Tasks
- [ ] Weekly: Review application logs
- [ ] Weekly: Check database size and performance
- [ ] Monthly: Review and update dependencies
- [ ] Monthly: Test backup restore procedure
- [ ] Quarterly: Security audit
- [ ] Quarterly: Performance optimization review

### Updates
```bash
# Update dependencies
pip install --upgrade -r requirements.txt
npm update

# Run tests
npm test
python manage.py test

# Deploy updates
git push origin main
```

---

## Support & Monitoring

### Recommended Tools
- **Error Tracking**: Sentry
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Performance**: New Relic, DataDog
- **Log Management**: Papertrail, Loggly

### Contact Information
- Developer: [Your Contact Info]
- Hosting Support: [Provider Support]
- Emergency Contact: [Emergency Contact]

---

For questions or issues, refer to:
- Application logs
- Provider documentation
- Project CLAUDE.md for architecture details
- Testing checklist.md for validation