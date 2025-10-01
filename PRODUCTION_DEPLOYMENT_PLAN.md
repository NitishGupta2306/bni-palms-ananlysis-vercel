# Production Database & Deployment Plan

## Overview
Migrate BNI Analytics from SQLite to PostgreSQL and deploy to production on Vercel. Current stack (Django + React) stays the same - we're just upgrading the database and deploying.

**Estimated Time:** 3-4 hours
**Current Status:** Development ready, needs production deployment

---

## Prerequisites (What I Need From You)

### 1. Vercel Account Setup
- [ ] Create Vercel account at https://vercel.com
- [ ] Verify email
- [ ] Connect GitHub account to Vercel

### 2. Database Provider Account
**Option A: Vercel Postgres (Recommended - easiest integration)**
- [ ] Enable Vercel Postgres in your Vercel dashboard
- [ ] Note: Requires credit card for verification (free tier available)

**Option B: Neon (Alternative - also free tier)**
- [ ] Create account at https://neon.tech
- [ ] Create new project
- [ ] Get connection string

**Option C: Supabase (Alternative - also free tier)**
- [ ] Create account at https://supabase.com
- [ ] Create new project
- [ ] Get connection string from Settings → Database

### 3. Information I'll Need From You
Once you create accounts, share with me:
- [ ] Vercel API token (Settings → Tokens → Create Token)
- [ ] PostgreSQL connection string (from whichever database provider you chose)
- [ ] GitHub repository access (if not already granted)

---

## Phase 1: Database Setup (You + Me)

### Step 1: Create Production Database (YOU DO THIS)
**If using Vercel Postgres:**
1. Go to Vercel Dashboard
2. Click "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Choose region closest to your users
6. Click "Create"
7. **Copy the connection string** - it looks like:
   ```
   postgres://username:password@host:5432/database
   ```

**If using Neon/Supabase:**
1. Create new project
2. Go to Settings → Connection String
3. Copy the "Connection String" (not the pooler URL)
4. **Send this to me**

### Step 2: Configure Environment Variables (I DO THIS)
I will:
- Create `.env.production` file with database credentials
- Update Django settings to use PostgreSQL
- Configure database connection pooling
- Add proper security settings

**Files I'll modify:**
- `backend/config/settings.py` - Add production database config
- `backend/.env.production` - Add environment variables
- `backend/requirements.txt` - Ensure `psycopg2-binary` is included

---

## Phase 2: Database Migration (I DO THIS)

### Step 3: Run Migrations
I will:
1. Connect to production database
2. Run `python manage.py migrate` to create all tables
3. Verify schema is correct
4. Test database connectivity

**Database tables that will be created:**
- `chapters_chapter` - BNI chapters
- `chapters_member` - Chapter members
- `chapters_monthlyreport` - Stored monthly matrices and files
- `chapters_membermonthlystats` - Individual member stats
- `analytics_referral` - Referral tracking
- `analytics_onetoone` - One-to-one meetings
- `analytics_tyfcb` - Thank You For Closed Business
- `analytics_dataimportsession` - Import audit logs

### Step 4: Optimize Database (I DO THIS)
I will add:
- Database indexes on frequently queried fields
- Foreign key constraints (already in models)
- JSON field indexes for matrix queries
- Connection pooling configuration

---

## Phase 3: Backend Deployment Setup (I DO THIS)

### Step 5: Configure Vercel for Django Backend
I will create:
- `vercel.json` - Vercel configuration file
- `build.sh` - Build script for backend
- Update CORS settings for production
- Configure static file serving

**Example `vercel.json` structure:**
```json
{
  "builds": [
    {
      "src": "backend/config/wsgi.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/config/wsgi.py"
    }
  ]
}
```

### Step 6: Deploy Backend to Vercel (YOU + ME)

**YOU DO:**
1. Go to Vercel Dashboard
2. Click "New Project"
3. Import the `bni-app` repository from GitHub
4. Select "Other" as framework preset

**I WILL GUIDE YOU TO:**
1. Set Root Directory to `backend`
2. Add environment variables:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `SECRET_KEY` - Django secret key (I'll generate)
   - `DEBUG` - Set to `False`
   - `ALLOWED_HOSTS` - Vercel domain
3. Click "Deploy"
4. **Share the deployment URL with me**

---

## Phase 4: Frontend Deployment (I DO THIS)

### Step 7: Configure Frontend for Production
I will:
- Update API endpoint URLs to point to production backend
- Configure environment variables for frontend
- Set up `.env.production` for React

**Files I'll modify:**
- `frontend/.env.production` - Add production API URL
- `frontend/src/shared/services/ChapterDataLoader.ts` - Use env variable for API URL
- `frontend/package.json` - Add production build script

### Step 8: Deploy Frontend to Vercel (YOU + ME)

**YOU DO:**
1. Go to Vercel Dashboard
2. Click "New Project" again
3. Import the same `bni-app` repository
4. Select "Create React App" as framework preset

**I WILL GUIDE YOU TO:**
1. Set Root Directory to `frontend`
2. Add environment variable:
   - `REACT_APP_API_URL` - Your backend deployment URL
3. Build Command: `npm run build`
4. Output Directory: `build`
5. Click "Deploy"

---

## Phase 5: File Upload Configuration (I DO THIS)

### Step 9: Configure File Storage
Since Vercel has ephemeral filesystem, I will:

**Option A: Use Vercel Blob Storage**
- Set up Vercel Blob for file uploads
- Configure Django to use Vercel Blob storage
- Update file upload views

**Option B: Use AWS S3 (if needed)**
- Configure S3 bucket
- Add django-storages
- Update Django settings for S3

**I'll need from you (if using S3):**
- AWS account credentials
- Or just go with Vercel Blob (easier)

---

## Phase 6: Testing & Validation (YOU + ME)

### Step 10: Test Production Deployment
**I WILL TEST:**
- [ ] Database connectivity
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] CORS headers working

**YOU WILL TEST:**
1. **Upload PALMS Data**
   - Go to Admin Dashboard → Bulk Upload
   - Upload a Regional PALMS Summary .xls file
   - Verify success message appears
   - Check chapters are created

2. **View Matrices**
   - Navigate to a chapter
   - Upload monthly report
   - Verify referral matrix displays
   - Verify one-to-one matrix displays
   - Check TYFCB report

3. **Test Comparison**
   - Upload data for two different months
   - Go to Comparison tab
   - Select two months
   - Verify comparison matrices show changes

---

## Phase 7: Data Migration (Optional)

### Step 11: Migrate Existing Data from SQLite (IF NEEDED)
If you have important data in development SQLite:

**I WILL:**
1. Export data from SQLite using Django dumpdata
2. Import into PostgreSQL using Django loaddata
3. Verify all records transferred correctly

**YOU TELL ME:**
- Do you have existing data you want to keep?
- Or start fresh in production?

---

## Rollback Plan (Just in Case)

If anything goes wrong:
1. **Database:** We can easily create a new PostgreSQL database
2. **Deployment:** Vercel keeps previous deployments, can rollback with one click
3. **Code:** Everything is in Git, can revert commits

---

## Post-Deployment Checklist

After everything is deployed:
- [ ] Update README.md with production URLs
- [ ] Document environment variables needed
- [ ] Set up monitoring (Vercel automatically monitors)
- [ ] Configure custom domain (optional)
- [ ] Set up automatic deployments on Git push

---

## Questions to Answer Before We Start

1. **Which database provider do you prefer?**
   - Vercel Postgres (easiest, built-in)
   - Neon (good free tier, separate service)
   - Supabase (includes more features like auth, storage)

2. **Do you have existing SQLite data to migrate?**
   - Yes → I'll migrate it
   - No → Start fresh in production

3. **Do you want a custom domain?**
   - Yes → You'll need to own a domain
   - No → Use Vercel's generated domain

4. **File upload preference?**
   - Vercel Blob (easiest)
   - AWS S3 (more control, requires AWS account)

---

## What Makes This Plan Good

✅ **Keeps working code** - No rewrite needed
✅ **Django ORM is perfect** - Already handles your data model
✅ **PostgreSQL is production-ready** - Mature, reliable, handles JSON fields
✅ **Vercel deployment** - Easy, fast, automatic scaling
✅ **Smart data strategy** - Matrices stored, comparisons computed on-demand
✅ **Quick migration** - 3-4 hours total, most is waiting for deployments

---

## Next Steps

When you're ready tomorrow:
1. Create Vercel account
2. Choose database provider (I recommend Vercel Postgres)
3. Create database and get connection string
4. Share credentials with me
5. We execute the plan together!

**Reminder:** We're not changing your tech stack. We're just:
- SQLite → PostgreSQL
- Local → Vercel (production)
- Everything else stays the same!
