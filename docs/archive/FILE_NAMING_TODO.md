# File Naming Consistency TODO

**Status:** Identified but not fixed (too time-consuming for quick wins session)
**Estimated Time:** 2 hours
**Priority:** Low (cosmetic/style issue)

## Issue

Some files use PascalCase naming while most use kebab-case. React/TypeScript conventions typically use kebab-case for all files.

## Files That Need Renaming

### PascalCase → kebab-case

1. **`src/app/App.tsx`** → `src/app/app.tsx`
   - Main application component

2. **`src/shared/contexts/NavigationContext.tsx`** → `src/shared/contexts/navigation-context.tsx`
   - Used in multiple components

3. **`src/shared/contexts/ThemeContext.tsx`** → `src/shared/contexts/theme-context.tsx`
   - Used in multiple components

4. **`src/shared/components/common/ErrorToast.tsx`** → `src/shared/components/common/error-toast.tsx`
   - Utility component

5. **`src/shared/components/common/ErrorBoundary.tsx`** → `src/shared/components/common/error-boundary.tsx`
   - Error handling component

6. **`src/shared/services/ChapterDataLoader.ts`** → `src/shared/services/chapter-data-loader.ts`
   - Service file, widely used

7. **`src/components/skeletons/ChapterCardSkeleton.tsx`** → `src/components/skeletons/chapter-card-skeleton.tsx`
   - Loading skeleton component

8. **`src/components/skeletons/TableSkeleton.tsx`** → `src/components/skeletons/table-skeleton.tsx`
   - Loading skeleton component

9. **`src/components/skeletons/StatCardSkeleton.tsx`** → `src/components/skeletons/stat-card-skeleton.tsx`
   - Loading skeleton component

10. **`src/components/animations/SplashScreen.tsx`** → `src/components/animations/splash-screen.tsx`
    - Animation component

## Why This Wasn't Fixed Yet

1. **Time-consuming**: Each rename requires:
   - Git rename command (preserves history)
   - Finding and updating all import statements
   - Testing to ensure nothing broke
   - Estimated 10-15 minutes per file = 2+ hours total

2. **Risk of breaking changes**: If any import is missed, the app will break

3. **Low priority**: This is a style/consistency issue, not a functional bug

## How to Fix (When Ready)

For each file:

1. **Find all imports:**
   ```bash
   grep -r "from.*FileName" frontend/src
   grep -r "import.*FileName" frontend/src
   ```

2. **Rename with git:**
   ```bash
   git mv src/path/OldName.tsx src/path/new-name.tsx
   ```

3. **Update all imports:**
   - Search for old import paths
   - Replace with new kebab-case paths
   - Example: `from '../ThemeContext'` → `from '../theme-context'`

4. **Test:**
   ```bash
   npm run build
   npm start
   ```

5. **Commit:**
   ```bash
   git commit -m "refactor: rename FileName to file-name for consistency"
   ```

## Current Naming Convention

Most files already follow kebab-case:
- ✅ `admin-dashboard.tsx`
- ✅ `member-management-tab.tsx`
- ✅ `chapter-routes.tsx`
- ✅ `matrix-display.tsx`
- ✅ `landing-page.tsx`

## Benefits of Fixing

- Consistent codebase style
- Easier to find files (all lowercase)
- Follows React/TypeScript community conventions
- Better autocomplete in some editors

## Decision

**Skip for now** - This is cosmetic and time-consuming. Focus on functional improvements and bug fixes first.

---

**Created:** 2025-01-15
**Session:** Madman Claude Quick Wins Part 2
