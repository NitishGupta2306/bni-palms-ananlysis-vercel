# Frontend Updates TODO

## Critical Issues

### 1. Unused Imports & Variables (ESLint Warnings)
**Priority: LOW | Effort: 1h | Type: CODE_QUALITY**

Multiple files have unused imports that clutter the code:
- `src/components/protected-route.tsx:1:17` - unused 'useEffect'
- `src/features/admin/components/admin-dashboard.tsx:1:27` - unused 'useEffect'
- `src/features/admin/components/admin-dashboard.tsx:9:3` - unused 'FileSpreadsheet', 'Calendar'
- `src/features/admin/components/admin-dashboard.tsx:13:10-41` - unused Card components
- `src/features/admin/components/member-management-tab.tsx:4:29` - unused 'CardHeader', 'CardTitle'
- `src/features/analytics/components/comparison-tab.tsx:3:59` - unused 'Loader2'
- `src/features/analytics/components/comparison-tab.tsx:10:10` - unused 'MonthlyReport', 'ComparisonData'
- `src/features/chapters/components/tabs/chapter-info-tab.tsx:4:10` - unused 'Badge'
- `src/features/chapters/components/tabs/chapter-info-tab.tsx:6:26` - unused 'cn'
- `src/features/chapters/components/chapter-routes.tsx:1:17` - unused 'useState'
- `src/features/chapters/components/chapter-routes.tsx:9:8` - unused 'UnifiedDashboard'

**Action**: Remove all unused imports and variables

---

## High Priority Issues

### 2. Massive Component Functions (>400 lines)
**Priority: HIGH | Effort: 8h | Type: REFACTORING**

Several components are too large and violate Single Responsibility Principle:

**`matrix-display.tsx` (467 lines)**
- Location: `src/features/analytics/components/matrix-display.tsx`
- Issues:
  - Complex sorting logic (lines 82-221)
  - Massive JSX rendering (lines 251-465)
  - Multiple responsibilities: sorting, filtering, display
- **Recommendation**: Split into:
  - `MatrixDisplay` (main component)
  - `useMatrixSort` (custom hook for sorting logic)
  - `MatrixHeaderCell` (extracted component)
  - `MatrixRow` (extracted component)

**`file-upload-component.tsx` (713 lines)**
- Location: `src/features/file-upload/components/file-upload-component.tsx`
- Issues:
  - 3-step wizard logic all in one component
  - Complex form validation
  - Mixed upload/UI concerns
- **Recommendation**: Split into:
  - `FileUploadWizard` (orchestrator)
  - `MonthSelectionStep`
  - `FileSelectionStep`
  - `ReviewSubmitStep`
  - `useFileUpload` (custom hook for upload logic)

**`unified-dashboard.tsx` (398 lines)**
- Location: `src/features/chapters/components/unified-dashboard.tsx`
- Issues:
  - Tab management mixed with data loading
  - Large conditional rendering blocks
- **Recommendation**: Extract tab content into separate components

---

### 3. React Hook Dependencies Issues
**Priority: MEDIUM | Effort: 2h | Type: BUG_RISK**

**Missing Dependencies:**
- `src/features/admin/components/security-settings-tab.tsx:47:6`
  - Hook: `useEffect`
  - Missing: `fetchPasswords`
  - Risk: Stale closure, fetchPasswords not called on updates

**Optimization Issues:**
- `src/features/analytics/components/matrix-display.tsx:43:9, 44:9`
  - Variables `members` and `matrix` can cause useMemo to recalculate every render
  - **Fix**: Wrap in their own useMemo hooks

**Action**: Add proper dependencies or wrap in useMemo as appropriate

---

### 4. Type Safety Issues
**Priority: MEDIUM | Effort: 3h | Type: TYPE_SAFETY**

**Using `any` type (reduces type safety):**
- `src/features/chapters/components/unified-dashboard.tsx:341` - `(member as any).name`

**Inconsistent prop types:**
- Multiple components accept union types but don't properly narrow them

**Action**: Replace `any` with proper types, add type guards where needed

---

## Medium Priority Issues

### 5. Repeated Logic & Code Duplication
**Priority: MEDIUM | Effort: 4h | Type: DRY_VIOLATION**

**Date Formatting (Repeated 10+ times):**
```typescript
// Found in multiple files
new Date(monthYear + '-01')
format(new Date(monthYear + '-01'), 'MMMM yyyy')
```
**Fix**: Create `src/lib/date-utils.ts` with helper functions:
- `parseMonthYear(monthYear: string): Date`
- `formatMonthYear(monthYear: string): string`

**API Base URL Imports:**
- Every component imports `API_BASE_URL` from config
- **Fix**: Create `src/lib/api.ts` with pre-configured axios instance

**Toast Notification Patterns:**
- Success/error toasts repeated with similar structure
- **Fix**: Create `src/hooks/useNotification.ts` wrapper:
```typescript
const { notifySuccess, notifyError } = useNotification();
```

---

### 6. Inconsistent File Naming
**Priority: LOW | Effort: 2h | Type: CONSISTENCY**

**Mix of naming conventions:**
- `chapter-info-tab.tsx` (kebab-case) ✓ Good
- `FileUploadComponent.tsx` (PascalCase) - Inconsistent
- `members-tab.tsx` (kebab-case) ✓ Good
- `ChapterDashboard.test.tsx` (PascalCase) - Inconsistent

**Recommendation**: Standardize on kebab-case for all files (matches React community best practices)

---

### 7. Missing Error Boundaries
**Priority: MEDIUM | Effort: 2h | Type: RELIABILITY**

**Components lacking error boundaries:**
- `matrix-display.tsx` - Complex rendering can fail
- `file-upload-component.tsx` - Upload failures should be caught
- `comparison-tab.tsx` - Data fetching errors

**Action**:
1. Create `ComponentErrorBoundary` wrapper
2. Wrap critical components
3. Add fallback UI for errors

---

### 8. Accessibility Issues
**Priority: MEDIUM | Effort: 3h | Type: ACCESSIBILITY**

**Issues found:**
- `src/components/ui/alert.tsx:39:3` - Headings must have accessible content
- Matrix tables lack proper ARIA labels for screen readers
- Upload dropzone missing keyboard navigation support
- Modal dialogs missing focus trap

**Action**:
- Add ARIA labels to all interactive elements
- Implement keyboard navigation for matrix sorting
- Add focus management to modals

---

## Low Priority Issues

### 9. Performance Optimizations
**Priority: LOW | Effort: 4h | Type: PERFORMANCE**

**Large re-renders:**
- Matrix components re-render entire table on sort
- **Fix**: Use React.memo for row components, useMemo for sorted data

**Bundle size:**
- Lucide-react imports entire icon library
- **Fix**: Use tree-shakeable imports

**Image optimization:**
- No lazy loading for images
- **Fix**: Add `loading="lazy"` to images

---

### 10. Regex & Escape Character Issues
**Priority: LOW | Effort: 30min | Type: CODE_QUALITY**

**Unnecessary escape characters:**
- `src/features/chapters/components/chapter-routes.tsx:75:64` - `\/` doesn't need escaping
- `src/features/file-upload/utils/excelSecurity.ts:112:44` - `\.` doesn't need escaping

**Problematic regex:**
- `src/features/file-upload/utils/excelSecurity.ts:130:26` - Control characters in regex may cause issues

**Action**: Clean up regex patterns, remove unnecessary escapes

---

## Quality of Life Improvements

### 11. Loading States Consistency
**Priority: LOW | Effort: 2h | Type: UX**

**Inconsistent loading patterns:**
- Some use `<Loader2>` directly
- Others use custom spinners
- New `LoadingSkeleton` component not universally adopted

**Action**: Migrate all loading states to use `LoadingSkeleton` component

---

### 12. Error Message Quality
**Priority: LOW | Effort: 2h | Type: UX**

**Generic error messages:**
- "Failed to load data" - not helpful
- "An error occurred" - too vague

**Action**: Provide specific, actionable error messages:
- "Unable to load chapter data. Please check your connection and try again."
- "File upload failed: File size exceeds 10MB limit"

---

### 13. Component Test Coverage
**Priority: LOW | Effort: 8h+ | Type: TESTING**

**Existing tests:**
- `ChapterDashboard.test.tsx` ✓
- `ErrorBoundary.test.tsx` ✓
- `FileUploadComponent.test.tsx` ✓
- `MembersTab.test.tsx` ✓

**Missing tests:**
- matrix-display.tsx (complex sorting logic)
- comparison-tab.tsx (data aggregation)
- file-upload-component.tsx (wizard flow)
- All custom hooks

**Action**: Achieve 80%+ test coverage for critical paths

---

### 14. Mobile Responsiveness
**Priority: MEDIUM | Effort: 4h | Type: UX**

**Issues:**
- Matrix tables overflow on mobile (not scrollable properly)
- Upload wizard steps cramped on small screens
- Member cards stack poorly on tablets

**Action**:
- Add horizontal scroll with indicators for matrices
- Optimize wizard for mobile viewport
- Test all breakpoints (sm, md, lg, xl)

---

### 15. Dark Mode Consistency
**Priority: LOW | Effort: 2h | Type: UX**

**Issues found:**
- Some hardcoded colors don't respect theme
- Custom color variables not using CSS variables
- Hover states need dark mode variants

**Action**: Audit all color usage, ensure theme compatibility

---

## Summary Statistics

**Total Issues: 15**
- Critical: 0
- High: 2
- Medium: 6
- Low: 7

**Estimated Total Effort: 47.5 hours**

**By Category:**
- Code Quality: 5 issues
- Refactoring: 2 issues
- UX: 4 issues
- Type Safety: 1 issue
- Performance: 1 issue
- Testing: 1 issue
- Accessibility: 1 issue
