# BNI Analytics - Vercel Deployment Instructions

## ✅ Completed Setup

The following has been configured and is ready for deployment:

### Backend Configuration
- ✅ Django settings updated for Supabase PostgreSQL
- ✅ `vercel.json` created for Vercel deployment
- ✅ `build.sh` script for collecting static files
- ✅ `.env.production` with all credentials (gitignored)
- ✅ Dependencies updated (`dj-database-url`, `supabase`)
- ✅ `.gitignore` configured

### Database Configuration
- ✅ Supabase project: `ocejfmdehbkviohctkka`
- ✅ Connection string configured
- ✅ Supabase API key added for file storage

---

## 📋 Deployment Steps

### Step 1: Deploy Backend to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard

2. **Create New Project**:
   - Click "New Project"
   - Import from GitHub: `bni-app` repository
   - Select "Other" as framework preset

3. **Configure Backend Deployment**:
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
   - **Build Command**: `./build.sh`
   - **Output Directory**: Leave empty

4. **Add Environment Variables** (click "Environment Variables"):
   ```
   DATABASE_URL=postgresql://postgres:alpha-tmmrw-king@db.ocejfmdehbkviohctkka.supabase.co:5432/postgres

   SECRET_KEY=kndC832y4_A7KAj-HPGA3FlyvR5RubWhlg3JIX-GT7sG5aufLTz80jRKa0hQBaz0kOk

   DEBUG=False

   ALLOWED_HOSTS=.vercel.app,localhost

   CORS_ALLOWED_ORIGINS=https://*.vercel.app,http://localhost:3000

   SUPABASE_URL=https://ocejfmdehbkviohctkka.supabase.co

   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZWpmbWRlaGJrdmlvaGN0a2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTI5MTcsImV4cCI6MjA3NDgyODkxN30.zuqpJlPUF3OqdRLXCrzIvW_S59ZCVUwa233BsauqoqA
   ```

5. **Click "Deploy"**

6. **Copy the deployment URL** (e.g., `https://your-backend.vercel.app`)

---

### Step 2: Run Database Migrations

After backend is deployed, you need to run migrations to create all tables in Supabase:

**Option A: Via Vercel CLI** (recommended):
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
cd backend
vercel link

# Run migrations via Vercel CLI
vercel exec -- python manage.py migrate
```

**Option B: Create a one-time migration endpoint**:
1. Add this to `config/urls.py` temporarily:
   ```python
   from django.http import JsonResponse
   from django.core.management import call_command

   def run_migrations(request):
       call_command('migrate')
       return JsonResponse({'status': 'migrations complete'})

   urlpatterns = [
       path('run-migrations/', run_migrations),  # Remove after first run
       # ... rest of urls
   ]
   ```
2. Visit `https://your-backend.vercel.app/run-migrations/`
3. Remove the endpoint after migrations complete

**Option C: Via Supabase SQL Editor**:
- Manually run the SQL schema (not recommended)

---

### Step 3: Deploy Frontend to Vercel

1. **Create Another New Project** in Vercel:
   - Import the same `bni-app` repository
   - Select "Create React App" as framework preset

2. **Configure Frontend Deployment**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Create React App
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

3. **Add Environment Variable**:
   ```
   REACT_APP_API_URL=https://your-backend.vercel.app
   ```
   (Replace with your actual backend URL from Step 1)

4. **Click "Deploy"**

5. **Copy the frontend URL** (e.g., `https://your-frontend.vercel.app`)

---

### Step 4: Update CORS Settings

After both deployments:

1. Go to Vercel Dashboard → Backend Project → Settings → Environment Variables

2. Update `CORS_ALLOWED_ORIGINS` to include your actual frontend URL:
   ```
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
   ```

3. **Redeploy the backend** to apply the new CORS settings

---

### Step 5: Configure Supabase for File Storage

1. **Go to Supabase Dashboard**: https://app.supabase.com

2. **Create Storage Bucket**:
   - Go to Storage → Create Bucket
   - Name: `bni-uploads`
   - Make it **public** or configure RLS policies

3. **Enable Public Access** (optional):
   - Click on bucket → Settings → Make public

---

## 🧪 Testing Production Deployment

After deployment, test the following:

### 1. Backend Health Check
Visit: `https://your-backend.vercel.app/api/dashboard/`
- Should return JSON data (even if empty)

### 2. Frontend Loading
Visit: `https://your-frontend.vercel.app`
- Should load the dashboard
- Check browser console for any CORS errors

### 3. Test Bulk Upload
1. Go to Admin Dashboard
2. Upload a PALMS file
3. Verify chapters are created
4. Check Supabase database for data

---

## 🔧 Troubleshooting

### CORS Errors
- Make sure `CORS_ALLOWED_ORIGINS` includes your frontend URL
- Redeploy backend after changing environment variables

### Database Connection Errors
- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check Supabase project is active and accessible

### Static Files Not Loading
- Ensure `build.sh` ran successfully during deployment
- Check Vercel build logs

### File Upload Errors
- Verify Supabase Storage bucket is created
- Check `SUPABASE_KEY` is set correctly
- Ensure bucket has proper access policies

---

## 📝 Next Steps After Deployment

1. **Custom Domain** (optional):
   - Go to Vercel Project → Settings → Domains
   - Add your custom domain

2. **Enable Auto-Deploy**:
   - Already enabled by default
   - Every push to `main` will auto-deploy

3. **Monitoring**:
   - Vercel provides automatic monitoring
   - Check Vercel Dashboard → Analytics

4. **Backup Strategy**:
   - Supabase provides automatic backups
   - Export data periodically via API

---

## 🚨 Important Notes

- **Never commit `.env.production`** to git (it's in `.gitignore`)
- **Keep SECRET_KEY secure** - regenerate if compromised
- **Database credentials** are sensitive - store securely
- **Migrations must be run** before the app will work properly
- **Local machine cannot connect** to Supabase (network issue), but Vercel can

---

## 🎯 Summary

**What's Ready:**
- ✅ Backend configured for Vercel + Supabase
- ✅ Frontend ready to connect to backend
- ✅ All credentials configured
- ✅ Build scripts created

**What You Need to Do:**
1. Deploy backend to Vercel (5 minutes)
2. Run migrations (2 minutes)
3. Deploy frontend to Vercel (3 minutes)
4. Update CORS settings (1 minute)
5. Test the application (5 minutes)

**Total Time: ~15-20 minutes**
