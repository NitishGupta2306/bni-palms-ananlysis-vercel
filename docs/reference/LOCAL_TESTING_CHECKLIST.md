# Local Testing Checklist

Complete manual testing guide for BNI Analytics Application

## Prerequisites

- [ ] Backend virtual environment activated
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Local SQLite database configured (`backend/db.sqlite3`)
- [ ] Django migrations applied (`python manage.py migrate`)
- [ ] Backend server running on `http://localhost:8000`
- [ ] Frontend server running on `http://localhost:3000`

---

## 1. Chapter Management

### View Chapters
- [ ] Navigate to Chapters page in frontend
- [ ] Verify chapter list displays correctly
- [ ] Check pagination (if applicable)
- [ ] Verify search/filter functionality

### Create Chapter
- [ ] Click "Add Chapter" or equivalent button
- [ ] Fill in chapter details:
  - Chapter name
  - Location
  - Meeting day
  - Meeting time
- [ ] Submit form
- [ ] Verify chapter appears in list
- [ ] Verify success notification

### Edit Chapter
- [ ] Select existing chapter
- [ ] Click edit button
- [ ] Modify chapter details
- [ ] Save changes
- [ ] Verify updated data persists
- [ ] Verify success notification

### Delete Chapter
- [ ] Select a chapter
- [ ] Click delete button
- [ ] Confirm deletion
- [ ] Verify chapter removed from list
- [ ] Verify success notification

---

## 2. Member Management

### View Members
- [ ] Navigate to Members page
- [ ] Verify member list displays correctly
- [ ] Check member details (name, business, classification, chapter)
- [ ] Verify pagination works
- [ ] Test search functionality
- [ ] Test filter by chapter

### Create Member
- [ ] Click "Add Member" button
- [ ] Fill in member details:
  - First name
  - Last name
  - Business name
  - Classification
  - Chapter selection
  - Active status
- [ ] Submit form
- [ ] Verify member appears in list
- [ ] Verify member shows under correct chapter
- [ ] Verify success notification

### Edit Member
- [ ] Select existing member
- [ ] Click edit button
- [ ] Modify member details
- [ ] Save changes
- [ ] Verify updated data persists
- [ ] Verify success notification

### Delete Member
- [ ] Select a member
- [ ] Click delete button
- [ ] Confirm deletion
- [ ] Verify member removed from list
- [ ] Verify success notification

---

## 3. PALMS Report Upload (Single Chapter)

### Prepare Test Data
- [ ] Have a valid PALMS report Excel file (.xls) ready
- [ ] Ensure file contains required columns:
  - First Name
  - Last Name
  - Business Name (if applicable)
  - Classification (if applicable)

### Upload Single Report
- [ ] Navigate to Upload page
- [ ] Select chapter from dropdown
- [ ] Select Excel file
- [ ] Click upload button
- [ ] Verify upload progress indicator
- [ ] Verify success message with stats:
  - Members created
  - Members updated
  - Total processed
- [ ] Check for any warnings or errors

### Verify Upload Results
- [ ] Navigate to Members page
- [ ] Filter by uploaded chapter
- [ ] Verify all members from file appear
- [ ] Verify member data matches file data
- [ ] Check for duplicate handling (should update, not duplicate)

---

## 4. Bulk Upload (Regional PALMS Summary)

### Prepare Test Data
- [ ] Have a Regional PALMS Summary Excel file ready
- [ ] File should contain multiple chapters
- [ ] Required columns:
  - Chapter
  - First Name
  - Last Name

### Upload Regional Summary
- [ ] Navigate to Bulk Upload page
- [ ] Select Regional Summary file
- [ ] Click upload button
- [ ] Verify upload progress
- [ ] Verify success message with stats:
  - Chapters created
  - Chapters updated
  - Members created
  - Members updated
  - Total rows processed
- [ ] Check warnings for any skipped rows

### Verify Bulk Upload Results
- [ ] Navigate to Chapters page
- [ ] Verify all chapters from file were created
- [ ] Navigate to Members page
- [ ] Filter by each chapter
- [ ] Verify members appear under correct chapters
- [ ] Verify no duplicate chapters created
- [ ] Verify no duplicate members created

---

## 5. Analytics & Reporting

### Chapter Analytics
- [ ] Navigate to Analytics page
- [ ] Select a chapter
- [ ] Verify metrics display:
  - Total members
  - Active members
  - Member growth trends (if applicable)
- [ ] Check charts/graphs render correctly

### Member Analytics
- [ ] View member statistics
- [ ] Verify classification breakdown
- [ ] Verify business category distribution (if applicable)
- [ ] Test date range filters (if applicable)

### Export Functionality (if exists)
- [ ] Export chapter list to CSV/Excel
- [ ] Export member list to CSV/Excel
- [ ] Export analytics report
- [ ] Verify exported files contain correct data

---

## 6. Error Handling

### Invalid File Upload
- [ ] Try uploading non-Excel file (.txt, .pdf)
- [ ] Verify appropriate error message
- [ ] Try uploading Excel file with missing columns
- [ ] Verify validation error with specific missing columns

### Form Validation
- [ ] Submit empty chapter form
- [ ] Submit empty member form
- [ ] Verify required field errors
- [ ] Test invalid data formats

### API Error Handling
- [ ] Stop backend server while frontend is running
- [ ] Attempt any action
- [ ] Verify user-friendly error message
- [ ] Restart backend
- [ ] Verify application recovers gracefully

---

## 7. UI/UX Testing

### Navigation
- [ ] Test all navigation menu items
- [ ] Verify breadcrumbs work correctly
- [ ] Test back button functionality
- [ ] Verify active page highlighting in nav

### Responsive Design
- [ ] Test on desktop resolution (1920x1080)
- [ ] Test on tablet resolution (768x1024)
- [ ] Test on mobile resolution (375x667)
- [ ] Verify layout adapts correctly
- [ ] Verify forms are usable on mobile

### Loading States
- [ ] Verify loading indicators appear during data fetch
- [ ] Verify loading states for file uploads
- [ ] Verify skeleton screens or spinners work

### Toast Notifications
- [ ] Verify success notifications appear and auto-dismiss
- [ ] Verify error notifications appear
- [ ] Verify warning notifications appear
- [ ] Test manual dismissal of notifications

---

## 8. Data Integrity

### Name Normalization
- [ ] Create members with different name casings (e.g., "John Smith", "JOHN SMITH", "john smith")
- [ ] Verify system recognizes them as same person (update instead of duplicate)
- [ ] Verify normalization works in bulk upload

### Chapter Association
- [ ] Upload data for same chapter twice
- [ ] Verify chapter not duplicated
- [ ] Verify members added/updated under same chapter
- [ ] Test chapter name variations (spaces, casing)

### Member Updates
- [ ] Upload same member data twice
- [ ] Verify member updated, not duplicated
- [ ] Verify updated fields reflect new data
- [ ] Verify unchanged fields remain intact

---

## 9. Performance Testing

### Large File Upload
- [ ] Upload Regional Summary with 100+ rows
- [ ] Verify upload completes without timeout
- [ ] Verify all data processed correctly
- [ ] Check server logs for any errors

### Page Load Times
- [ ] Time chapter list page load with 50+ chapters
- [ ] Time member list page load with 500+ members
- [ ] Verify acceptable performance (<3 seconds)

### Concurrent Operations
- [ ] Open app in two browser tabs
- [ ] Perform actions in both tabs
- [ ] Verify data stays in sync
- [ ] Verify no conflicts or errors

---

## 10. Edge Cases

### Empty States
- [ ] View chapters page with no chapters
- [ ] View members page with no members
- [ ] Verify empty state messages display

### Special Characters
- [ ] Create chapter with special characters in name
- [ ] Create member with accents in name (é, ñ, etc.)
- [ ] Upload file with special characters
- [ ] Verify data handled correctly

### Long Data
- [ ] Create chapter with very long name (100+ characters)
- [ ] Create member with very long business name
- [ ] Verify truncation or scrolling works

---

## 11. Database Verification

### Django Admin Verification
- [ ] Access Django admin at `http://localhost:8000/admin`
- [ ] Check Chapters table in admin
- [ ] Verify all fields populated correctly
- [ ] Check Members table in admin
- [ ] Verify foreign key relationships correct
- [ ] Verify normalized_name field populated

---

## Testing Phases Summary

### Phase 1: Local Environment Testing (Current)
Complete all items above with **local SQLite database**

### Phase 2: Remote Database Testing (Next)
After Phase 1 passes:
- [ ] Update `.env` to point to Supabase (remote PostgreSQL)
- [ ] Keep backend running locally
- [ ] Keep frontend running locally
- [ ] Run through **all test cases above** again
- [ ] Verify data syncs to Supabase
- [ ] Verify no SQL compatibility issues (SQLite → PostgreSQL)
- [ ] Test concurrent access with remote DB
- [ ] Verify performance with remote DB

### Phase 3: Production Deployment
After Phase 2 passes:
- [ ] Deploy backend to Vercel
- [ ] Deploy frontend to Vercel
- [ ] Run smoke tests on production
- [ ] Monitor logs for errors
- [ ] Test with production data

---

## Notes

- **Document any bugs found** with steps to reproduce
- **Take screenshots** of any UI issues
- **Check browser console** for JavaScript errors
- **Check Django server logs** for backend errors
- **Test on multiple browsers** (Chrome, Firefox, Safari)
- **Keep track of test data** (chapters/members created) for cleanup

---

## Bug Reporting Template

```
**Bug Title:** [Brief description]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots:**
[Attach screenshots if applicable]

**Console Errors:**
[Paste any errors from browser console or server logs]

**Environment:**
- Browser: [Chrome/Firefox/Safari]
- OS: [macOS/Windows/Linux]
- Screen Resolution: [1920x1080/etc]
```

---

**Last Updated:** October 2, 2025
