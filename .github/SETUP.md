# GitHub Setup Guide

This document explains how to configure GitHub repository settings, secrets, and branch protection for the BNI Analytics application.

## Required GitHub Secrets

Navigate to **Settings → Secrets and variables → Actions** and add these secrets:

### Vercel Deployment Secrets
```
VERCEL_TOKEN              - Your Vercel API token
VERCEL_ORG_ID             - Your Vercel organization ID
VERCEL_PROJECT_ID_BACKEND - Backend project ID in Vercel
VERCEL_PROJECT_ID_FRONTEND - Frontend project ID in Vercel
```

**How to get these:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. **Token**: Settings → Tokens → Create Token
3. **Org ID**: Settings → General → scroll to "Organization ID"
4. **Project IDs**: Each project's Settings → General → "Project ID"

### Optional Secrets
```
CODECOV_TOKEN              - For code coverage reporting (from codecov.io)
PRODUCTION_BACKEND_URL     - Production backend URL for smoke tests
PRODUCTION_FRONTEND_URL    - Production frontend URL for smoke tests
```

## GitHub Environments

Create three environments in **Settings → Environments**:

### 1. Production Environment
- **Protection rules:**
  - Required reviewers: 2
  - Deployment branch: `production` only
- **Environment secrets:**
  - `DATABASE_URL` - Production PostgreSQL connection string
  - `SECRET_KEY` - Django production secret key
  - `ALLOWED_HOSTS` - Production domain names
  - `CORS_ALLOWED_ORIGINS` - Production frontend URLs

### 2. Staging Environment
- **Protection rules:**
  - Required reviewers: 1
  - Deployment branches: `staging`, `main`
- **Environment secrets:**
  - `DATABASE_URL` - Staging database connection string
  - `SECRET_KEY` - Django staging secret key

### 3. Preview Environment
- **No protection rules** (for PR previews)
- **No secrets required** (uses Vercel preview defaults)

## Branch Protection Rules

Navigate to **Settings → Branches** and add rules for each branch:

### `production` Branch
- ✅ Require a pull request before merging
  - Required approvals: 2
  - Dismiss stale reviews when new commits are pushed
- ✅ Require status checks to pass before merging
  - Required checks:
    - `Backend CI / test`
    - `Frontend CI / test`
    - `Security Scanning / codeql-analysis`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Require linear history
- ✅ Do not allow bypassing the above settings
- ❌ Allow force pushes: **Disabled**
- ❌ Allow deletions: **Disabled**

### `staging` Branch
- ✅ Require a pull request before merging
  - Required approvals: 1
- ✅ Require status checks to pass before merging
  - Required checks:
    - `Backend CI / test`
    - `Frontend CI / test`
- ✅ Require conversation resolution before merging
- ❌ Allow force pushes: **Only admins**
- ❌ Allow deletions: **Disabled**

### `main` Branch
- ✅ Require a pull request before merging
  - Required approvals: 1
- ✅ Require status checks to pass before merging
  - Required checks:
    - `Backend CI / test`
    - `Frontend CI / test`
- ✅ Require conversation resolution before merging

### `develop` Branch
- ✅ Require status checks to pass before merging
  - Required checks:
    - `Backend CI / test`
    - `Frontend CI / test`

## Repository Settings

### General Settings
Navigate to **Settings → General**:

- ✅ Allow squash merging (default)
- ✅ Allow rebase merging
- ❌ Allow merge commits
- ✅ Automatically delete head branches

### Security Settings
Navigate to **Settings → Code security and analysis**:

- ✅ Dependency graph: **Enabled**
- ✅ Dependabot alerts: **Enabled**
- ✅ Dependabot security updates: **Enabled**
- ✅ Dependabot version updates: **Enabled** (configured via `.github/dependabot.yml`)
- ✅ CodeQL scanning: **Enabled** (configured via workflows)
- ✅ Secret scanning: **Enabled**
- ✅ Push protection: **Enabled**

### Actions Settings
Navigate to **Settings → Actions → General**:

- ✅ Allow all actions and reusable workflows
- ✅ Workflow permissions: Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

## Vercel Project Configuration

For each Vercel project (backend and frontend):

### Backend Project Settings
1. **Root Directory**: `backend`
2. **Build Command**: (auto-detected)
3. **Output Directory**: (auto-detected)
4. **Install Command**: `pip install -r requirements.txt`

**Environment Variables:**
```
DATABASE_URL=<your-postgres-connection-string>
SECRET_KEY=<django-secret-key>
DEBUG=False
ALLOWED_HOSTS=.vercel.app
CORS_ALLOWED_ORIGINS=<your-frontend-url>
```

### Frontend Project Settings
1. **Framework Preset**: Create React App
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `build`
5. **Install Command**: `npm ci`

**Environment Variables:**
```
REACT_APP_API_URL=<your-backend-url>
CI=false
GENERATE_SOURCEMAP=false
```

## Post-Setup Checklist

After configuring everything:

- [ ] All secrets added to GitHub
- [ ] All environments configured
- [ ] Branch protection rules applied
- [ ] Security features enabled
- [ ] Vercel projects connected
- [ ] Test a PR to staging to verify workflows
- [ ] Test a deployment to production
- [ ] Verify Dependabot is creating PRs
- [ ] Verify CodeQL scans are running

## Troubleshooting

**Workflows failing?**
- Check that all required secrets are set
- Verify secret names match workflow files exactly
- Ensure Vercel projects are properly linked

**Branch protection blocking merges?**
- Ensure required status checks are passing
- Update branch with latest changes from base branch
- Get required number of approvals

**Dependabot not working?**
- Check `.github/dependabot.yml` syntax
- Verify repository has dependency files
- Check Dependabot logs in Insights → Dependency graph

## Need Help?

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development workflow or open an issue.
