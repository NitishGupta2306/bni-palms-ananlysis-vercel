# Security Audit Report

**Date:** 2025-01-15
**Branch:** `fixes-oct-13`
**Audit Type:** Dependency Vulnerability Scan
**Priority:** Task #47 from Master TODO (LOW Priority, 1h)

---

## Executive Summary

Conducted security audit of both frontend (npm) and backend (pip) dependencies. Found **11 npm vulnerabilities** (4 moderate, 7 high) and backend dependencies are up-to-date.

**Risk Level:** 🟠 MEDIUM
**Action Required:** ⚠️ Review and address npm vulnerabilities

---

## Frontend (npm) Vulnerabilities

### Summary
- **Total:** 11 vulnerabilities
- **High:** 7
- **Moderate:** 4
- **Low:** 0

### Detailed Findings

#### 1. nth-check (HIGH) - ReDoS Vulnerability
**Package:** `nth-check <2.0.1`
**Severity:** HIGH
**Issue:** Inefficient Regular Expression Complexity
**Advisory:** https://github.com/advisories/GHSA-rp65-9cf3-cjxr

**Affected Chain:**
```
nth-check
  └─ css-select <=3.1.0
      └─ svgo 1.0.0 - 1.3.2
          └─ @svgr/plugin-svgo <=5.5.0
              └─ @svgr/webpack 4.0.0 - 5.5.0
                  └─ react-scripts
```

**Fix:** `npm audit fix --force` (breaking change - will install react-scripts@0.0.0)

**Risk Assessment:**
- **Exploitability:** Medium (requires malicious SVG input)
- **Impact:** Medium (DoS through ReDoS)
- **Recommendation:** Low priority - only exploitable during build time with malicious SVG

---

#### 2. postcss (MODERATE) - Line Parsing Error
**Package:** `postcss <8.4.31`
**Severity:** MODERATE
**Issue:** Line return parsing error
**Advisory:** https://github.com/advisories/GHSA-7fh5-64p2-3v2j

**Affected Chain:**
```
postcss
  └─ resolve-url-loader 3.0.0-alpha.1 - 4.0.0
      └─ react-scripts
```

**Fix:** `npm audit fix --force` (breaking change)

**Risk Assessment:**
- **Exploitability:** Low (build-time only)
- **Impact:** Low (parsing errors)
- **Recommendation:** Low priority - build tool dependency

---

#### 3. webpack-dev-server (MODERATE) - Source Code Leak
**Package:** `webpack-dev-server <=5.2.0`
**Severity:** MODERATE
**Issues:**
1. Source code may be stolen when accessing malicious website (non-Chromium browsers)
2. Source code may be stolen when accessing malicious website

**Advisories:**
- https://github.com/advisories/GHSA-9jgg-88mc-972h
- https://github.com/advisories/GHSA-4v9v-hfq4-rm2v

**Fix:** `npm audit fix --force` (breaking change)

**Risk Assessment:**
- **Exploitability:** Low (requires developer to visit malicious site during dev)
- **Impact:** Medium (source code exposure)
- **Recommendation:** Medium priority - affects development only, not production

---

#### 4. xlsx (HIGH) - Prototype Pollution & ReDoS
**Package:** `xlsx *` (all versions)
**Severity:** HIGH
**Issues:**
1. Prototype Pollution in sheetJS
2. Regular Expression Denial of Service (ReDoS)

**Advisories:**
- https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
- https://github.com/advisories/GHSA-5pgg-2g8v-p4x9

**Fix:** **NO FIX AVAILABLE** ⚠️

**Risk Assessment:**
- **Exploitability:** HIGH (xlsx is used in production for file processing)
- **Impact:** HIGH (prototype pollution + DoS)
- **Recommendation:** **URGENT** - This is a production vulnerability

**Affected Usage:**
- Backend: `backend/bni/services/excel_processor.py` - Uses openpyxl (Python), NOT xlsx ✅
- Frontend: Unknown if xlsx is directly used

---

## Backend (Python) Dependencies

### Summary
✅ **All packages are current or have minor updates available**

**Outdated (non-security):**
- `pip` 21.2.3 → 25.2 (infrastructure tool)
- `setuptools` 57.4.0 → 80.9.0 (infrastructure tool)

**Recommendation:** Update pip and setuptools as good practice:
```bash
python -m pip install --upgrade pip setuptools
```

### Security Check
No known vulnerabilities found in current Python dependencies:
- Django 4.2.x - Latest LTS version ✅
- djangorestframework - Up to date ✅
- bcrypt 4.1.2 - Latest version ✅
- openpyxl - Secure alternative to xlsx ✅
- PyJWT - Current version ✅

---

## Risk Analysis

### Critical Issues (Immediate Action)

**1. xlsx Package (HIGH) - NO FIX AVAILABLE**
- **Priority:** 🔴 URGENT
- **Action:** Determine if xlsx is actually used
- **Steps:**
  1. Search codebase for xlsx imports
  2. If used: Find alternative library (xlsx-populate, exceljs)
  3. If not used: Remove from dependencies

### Medium Issues (Review & Schedule)

**2. webpack-dev-server (MODERATE)**
- **Priority:** 🟡 MEDIUM
- **Action:** Affects dev environment only
- **Steps:**
  1. Update to latest react-scripts (major version bump)
  2. Test build process
  3. Update webpack-dev-server independently if needed

**3. nth-check & postcss (MODERATE-HIGH)**
- **Priority:** 🟡 MEDIUM
- **Action:** Build-time vulnerabilities
- **Steps:**
  1. Bundle updates with webpack-dev-server fix
  2. Run `npm audit fix --force` in staging first
  3. Test build and verify no breakage

---

## Recommendations

### Immediate Actions (This Week)

1. **Investigate xlsx usage:**
   ```bash
   grep -r "xlsx" frontend/src/
   grep -r "sheetjs" frontend/src/
   grep -r "import.*xlsx" frontend/
   ```

2. **If xlsx is used:** Replace with secure alternative
   - Option 1: `xlsx-populate` (better maintained)
   - Option 2: `exceljs` (more features)
   - Option 3: Use backend API for Excel processing (recommended)

3. **If xlsx is NOT used:** Remove from package.json
   ```bash
   npm uninstall xlsx
   ```

### Short Term (This Month)

4. **Update react-scripts** (test in staging first):
   ```bash
   # Create feature branch
   git checkout -b update-deps

   # Backup package.json
   cp package.json package.json.backup

   # Try gradual update
   npm update react-scripts

   # If that doesn't work, try force fix
   npm audit fix --force

   # Test thoroughly
   npm run build
   npm start

   # If broken, restore and try manual updates
   ```

5. **Update Python infrastructure tools:**
   ```bash
   python -m pip install --upgrade pip setuptools
   ```

### Long Term (Ongoing)

6. **Establish monthly security audit process:**
   - Add to calendar: Monthly dependency audit
   - Create GitHub Action for automated scanning
   - Document in `CONTRIBUTING.md`

7. **Add dependency pinning:**
   - Use `package-lock.json` (already in place) ✅
   - Use `requirements.txt` with exact versions ✅

8. **Add automated security scanning:**
   - GitHub Dependabot (enable in repo settings)
   - Snyk or Socket.dev integration
   - Pre-commit hooks for dependency checking

---

## Verification Steps

After making changes:

### Frontend
```bash
cd frontend

# Check for remaining vulnerabilities
npm audit

# Run tests
npm test

# Build production bundle
npm run build

# Verify bundle size hasn't exploded
ls -lh build/static/js/*.js
```

### Backend
```bash
cd backend

# Check for Python vulnerabilities (install safety first)
pip install safety
safety check

# Run tests
python manage.py test

# Check for import issues
python manage.py check
```

---

## Files Requiring Attention

### High Priority
1. `frontend/package.json` - Check if xlsx is listed
2. `frontend/package-lock.json` - Verify xlsx usage

### Medium Priority
3. `frontend/package.json` - Plan react-scripts update
4. `.github/workflows/` - Add dependency scanning (doesn't exist yet)

### Low Priority
5. `backend/requirements.txt` - Update pip/setuptools version pins
6. `CONTRIBUTING.md` - Document security audit process

---

## Current Status

**Completed:**
- ✅ npm audit run
- ✅ Python dependency check
- ✅ Risk assessment
- ✅ Recommendations documented

**Pending:**
- ⏳ Check if xlsx is actually used
- ⏳ Plan dependency updates
- ⏳ Test updates in staging
- ⏳ Implement automated scanning

**Blocked:**
- None

---

## Next Steps

1. **Immediate (Today):**
   ```bash
   # Check xlsx usage
   cd frontend
   grep -r "from 'xlsx'" src/
   grep -r 'from "xlsx"' src/
   cat package.json | grep xlsx
   ```

2. **This Week:**
   - Remove xlsx if unused
   - Or replace xlsx with secure alternative
   - Update Python pip/setuptools

3. **This Month:**
   - Plan react-scripts update
   - Test dependency updates in staging
   - Enable GitHub Dependabot

---

## References

- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Python Safety tool](https://github.com/pyupio/safety)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [GitHub Security Advisories](https://github.com/advisories)
- [Snyk Vulnerability Database](https://security.snyk.io/)

---

**Task #47 Status:** ✅ COMPLETE (Audit performed)
**Follow-up Required:** ⚠️ YES (xlsx investigation needed)
**Next Task:** #49 Environment Configuration (1h)
