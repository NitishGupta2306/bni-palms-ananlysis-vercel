# BNI Application - Manual Testing Checklist

This checklist covers all functionality that must be manually tested before deployment.

**Testing Date:** _________________
**Tested By:** _________________
**Environment:** Local / Staging / Production
**Backend Running:** Yes / No
**Frontend Running:** Yes / No

---

## 1. Chapter Management

### 1.1 Dashboard View
- [ ] Navigate to root URL (http://localhost:3000)
- [ ] Dashboard loads without errors
- [ ] All chapters are displayed in cards
- [ ] Chapter cards show:
  - [ ] Chapter name
  - [ ] Location
  - [ ] Member count
  - [ ] Last data update date
  - [ ] Performance metrics
- [ ] Cards are clickable and respond to hover

### 1.2 Create Chapter
- [ ] Click "Add Chapter" or equivalent button
- [ ] Dialog/form opens
- [ ] Enter chapter details:
  - [ ] Name: "Test Chapter"
  - [ ] Location: "Dubai"
  - [ ] Meeting Day: "Monday"
  - [ ] Meeting Time: "07:00"
- [ ] Click "Create" button
- [ ] Success message appears
- [ ] New chapter appears in dashboard
- [ ] Click new chapter to verify it opens

### 1.3 View Chapter Details
- [ ] Click on "BNI Continental" (or any chapter)
- [ ] Chapter detail page loads
- [ ] Breadcrumb navigation shows: Home > Chapter Name
- [ ] Chapter information displayed:
  - [ ] Name, location, meeting details
  - [ ] Member count
  - [ ] Total referrals, OTOs, TYFCB
- [ ] Tabs visible: Members, Analytics, Reports, Previous Data

### 1.4 Delete Chapter
- [ ] Navigate to admin section or chapter management
- [ ] Select a test chapter to delete
- [ ] Click delete button
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Success message appears
- [ ] Chapter removed from dashboard
- [ ] Verify chapter data is deleted from backend

---

## 2. File Upload & Processing

Test with all 9 chapters using August 2025 data:
- Continental, Elevate, Energy, Excelerate, Givers, Gladiators, Legends, Synergy, United

### 2.1 Upload Slip Audit File (Continental)
- [ ] Navigate to BNI Continental chapter
- [ ] Click "Upload Data" or equivalent
- [ ] Select upload option: "Slip Audit Only"
- [ ] Choose file: `testing/test-data/august-2025/slip-audit-reports/continental/Slips_Audit_Report_08-25-2025_2-26_PM.xls`
- [ ] Enter month/year: "2025-08"
- [ ] Click "Upload" button
- [ ] Upload progress indicator shows
- [ ] Success message appears with:
  - [ ] Records processed count
  - [ ] Referrals created count
  - [ ] One-to-Ones created count
  - [ ] TYFCBs created count
- [ ] No error messages displayed

### 2.2 Upload with Member Names File (Continental)
- [ ] Navigate to BNI Continental chapter
- [ ] Select upload option: "Slip Audit + Member Names"
- [ ] Choose slip audit file (same as above)
- [ ] Choose member names file: `testing/test-data/august-2025/member-names/bni-continental.xls`
- [ ] Enter month/year: "2025-08"
- [ ] Click "Upload"
- [ ] Both files upload successfully
- [ ] Members created/updated count shown
- [ ] Verify members appear in Members tab

### 2.3 Repeat for All Chapters
Test upload for each of the remaining 8 chapters:

**BNI Elevate:**
- [ ] Slip audit file uploaded successfully
- [ ] Member names file uploaded successfully
- [ ] Data processed without errors

**BNI Energy:**
- [ ] Slip audit file uploaded successfully
- [ ] Member names file uploaded successfully
- [ ] Data processed without errors

**BNI Excelerate:**
- [ ] Slip audit file uploaded successfully
- [ ] Member names file uploaded successfully
- [ ] Data processed without errors

**BNI Givers:**
- [ ] Slip audit file uploaded successfully
- [ ] Member names file uploaded successfully
- [ ] Data processed without errors

**BNI Gladiators:**
- [ ] Slip audit file uploaded successfully
- [ ] Member names file uploaded successfully
- [ ] Data processed without errors

**BNI Legends:**
- [ ] Slip audit file uploaded successfully
- [ ] Member names file uploaded successfully
- [ ] Data processed without errors

**BNI Synergy:**
- [ ] Slip audit file uploaded successfully
- [ ] Member names file uploaded successfully
- [ ] Data processed without errors

**BNI United:**
- [ ] Slip audit file uploaded successfully
- [ ] Member names file uploaded successfully
- [ ] Data processed without errors

### 2.4 Upload Error Handling
- [ ] Try uploading a text file (.txt) instead of Excel
  - [ ] Error message: "Invalid file type"
- [ ] Try uploading a file >10MB
  - [ ] Error message: "File too large"
- [ ] Try uploading without selecting chapter
  - [ ] Error message: "Chapter required"
- [ ] Try uploading without selecting file
  - [ ] Error message: "File required"
- [ ] Try uploading corrupted .xls file
  - [ ] Appropriate error message shown

---

## 3. Members View & Management

### 3.1 View Members List (Continental)
- [ ] Navigate to BNI Continental
- [ ] Click "Members" tab
- [ ] Members list displays
- [ ] Each member shows:
  - [ ] Full name
  - [ ] Business name
  - [ ] Classification
  - [ ] Contact information (if available)
- [ ] Member count matches total shown
- [ ] Members are sorted alphabetically

### 3.2 View Member Details
- [ ] Click on a member from the list
- [ ] Member detail page loads
- [ ] Breadcrumb: Home > Chapter > Member Name
- [ ] Member information displayed:
  - [ ] Name, business, classification
  - [ ] Email, phone
- [ ] Performance stats shown:
  - [ ] Referrals given count
  - [ ] Referrals received count
  - [ ] One-to-Ones completed count
  - [ ] TYFCB amount (inside chapter)
  - [ ] TYFCB amount (outside chapter)
- [ ] Missing interactions section displays:
  - [ ] Missing one-to-ones list
  - [ ] Missing referrals given to list
  - [ ] Missing referrals received from list
  - [ ] Priority connections list

### 3.3 Create New Member
- [ ] Navigate to chapter members page
- [ ] Click "Add Member" button
- [ ] Form opens
- [ ] Enter member details:
  - [ ] First Name: "Test"
  - [ ] Last Name: "Member"
  - [ ] Business Name: "Test Business"
  - [ ] Classification: "Consultant"
  - [ ] Email: "test@example.com"
  - [ ] Phone: "1234567890"
- [ ] Click "Save"
- [ ] Success message appears
- [ ] New member appears in list

### 3.4 Edit Member
- [ ] Select an existing member
- [ ] Click "Edit" button
- [ ] Form opens with current data
- [ ] Modify business name: "Updated Business Name"
- [ ] Click "Save"
- [ ] Success message appears
- [ ] Changes reflected in member list

### 3.5 Delete Member
- [ ] Select the test member created earlier
- [ ] Click "Delete" button
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Success message appears
- [ ] Member removed from list

---

## 4. Data Viewing & Validation

### 4.1 View Monthly Reports List
- [ ] Navigate to BNI Continental
- [ ] Click "Reports" tab
- [ ] List of monthly reports displays
- [ ] Each report shows:
  - [ ] Month/Year (e.g., "2025-08")
  - [ ] Upload date
  - [ ] Processed date
  - [ ] File names (slip audit, member names)
- [ ] Reports sorted by date (newest first)

### 4.2 View Referral Data
- [ ] Select a monthly report
- [ ] Navigate to "Referrals" section/tab
- [ ] Referral list or summary displays
- [ ] Data includes:
  - [ ] Giver name
  - [ ] Receiver name
  - [ ] Date given
  - [ ] Detail/notes (if available)
- [ ] Data matches uploaded file

### 4.3 View One-to-One Data
- [ ] Select a monthly report
- [ ] Navigate to "One-to-Ones" section
- [ ] One-to-One list displays
- [ ] Data includes:
  - [ ] Member 1 name
  - [ ] Member 2 name
  - [ ] Meeting date
  - [ ] Duration (if available)
- [ ] Data matches uploaded file

### 4.4 View TYFCB Data
- [ ] Select a monthly report
- [ ] Navigate to "TYFCB" section
- [ ] TYFCB summary displays:
  - [ ] Total inside chapter amount
  - [ ] Total outside chapter amount
  - [ ] Count of TYFCBs
  - [ ] Breakdown by member
- [ ] Individual TYFCB records show:
  - [ ] Giver name (or "Outside Chapter")
  - [ ] Receiver name
  - [ ] Amount
  - [ ] Currency
  - [ ] Date
- [ ] Data matches uploaded file

### 4.5 Download Matrices
- [ ] Navigate to a monthly report
- [ ] Click "Download Matrices" or "Export" button
- [ ] Excel file downloads
- [ ] Open downloaded file
- [ ] File contains sheets for:
  - [ ] Referral Matrix (skip validation for now)
  - [ ] One-to-One Matrix (skip validation for now)
  - [ ] Combination Matrix (skip validation for now)
- [ ] File opens without errors in Excel/LibreOffice

---

## 5. Data Integrity & Relationships

### 5.1 Member Name Normalization
- [ ] Create members with various name formats:
  - [ ] "Mr. John Smith" → should normalize to "john smith"
  - [ ] "Dr. Jane Doe Jr." → should normalize to "jane doe"
  - [ ] "MICHAEL BROWN" → should normalize to "michael brown"
- [ ] Verify normalized names are used for matching in referrals/OTOs

### 5.2 Data Isolation Between Chapters
- [ ] Upload data for BNI Continental
- [ ] Navigate to BNI Elevate
- [ ] Verify BNI Elevate shows NO data from Continental
- [ ] Upload data for BNI Elevate
- [ ] Verify both chapters maintain separate data
- [ ] Check that member lists don't overlap

### 5.3 Duplicate Prevention
- [ ] Upload the same slip audit file twice for same chapter/month
- [ ] First upload: succeeds
- [ ] Second upload: should either:
  - [ ] Prevent duplicate with error message, OR
  - [ ] Update existing data without creating duplicates
- [ ] Verify data integrity maintained

---

## 6. Reports Management

### 6.1 View Report History
- [ ] Navigate to chapter with multiple uploads
- [ ] View list of all monthly reports
- [ ] Reports listed chronologically
- [ ] Can select different months to view

### 6.2 Compare Reports (if implemented)
- [ ] Select two different monthly reports
- [ ] Compare feature shows differences in:
  - [ ] Member count changes
  - [ ] Referral trends
  - [ ] TYFCB trends
  - [ ] Engagement patterns

### 6.3 Delete Monthly Report
- [ ] Select a test report
- [ ] Click "Delete" button
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Success message appears
- [ ] Report removed from list
- [ ] Associated data removed from database
- [ ] Chapter stats updated to reflect deletion

---

## 7. Navigation & User Experience

### 7.1 Breadcrumb Navigation
- [ ] Dashboard → Chapter: breadcrumb shows "Home > Chapter Name"
- [ ] Dashboard → Chapter → Member: breadcrumb shows "Home > Chapter > Member Name"
- [ ] Click "Home" in breadcrumb: returns to dashboard
- [ ] Click "Chapter Name" in breadcrumb: returns to chapter page

### 7.2 Back Button Navigation
- [ ] Use browser back button from member page
  - [ ] Returns to chapter page
- [ ] Use browser back button from chapter page
  - [ ] Returns to dashboard
- [ ] Forward button works correctly
- [ ] Refresh page: stays on current page with data intact

### 7.3 Direct URL Navigation
- [ ] Copy URL of member detail page
- [ ] Open in new tab
  - [ ] Page loads correctly
- [ ] Copy URL of chapter page
- [ ] Open in new tab
  - [ ] Page loads correctly
- [ ] Invalid chapter ID in URL
  - [ ] Shows appropriate error message

### 7.4 Loading States
- [ ] Dashboard loading: spinner/skeleton shows
- [ ] Chapter loading: spinner shows
- [ ] File upload: progress bar shows
- [ ] Data loading: loading indicators display
- [ ] No frozen UI during loading

---

## 8. Error Handling

### 8.1 Network Errors
- [ ] Stop backend server
- [ ] Try to load dashboard
  - [ ] Appropriate error message shows
  - [ ] "Retry" button available
- [ ] Try to upload file
  - [ ] Network error message shows
- [ ] Restart backend
- [ ] Click "Retry"
  - [ ] Dashboard loads successfully

### 8.2 404 Handling
- [ ] Navigate to `/chapter/99999` (non-existent ID)
  - [ ] "Chapter not found" message displays
  - [ ] Link to return to dashboard available
- [ ] Navigate to `/chapter/1/members/NonExistent`
  - [ ] "Member not found" message displays

### 8.3 Form Validation
- [ ] Try to create chapter with empty name
  - [ ] Validation error shows
- [ ] Try to create member with empty first name
  - [ ] Validation error shows
- [ ] Try to upload with invalid month format
  - [ ] Validation error shows

---

## 9. Performance

### 9.1 Large File Upload
- [ ] Upload largest slip audit file (check file sizes)
- [ ] Upload completes within reasonable time (<30 seconds)
- [ ] Progress indicator updates smoothly
- [ ] No browser freeze/crash

### 9.2 Large Chapter (100+ members)
- [ ] Navigate to chapter with most members
- [ ] Members list loads within 2 seconds
- [ ] Scrolling is smooth
- [ ] Search/filter works quickly

### 9.3 Multiple Concurrent Operations
- [ ] Open 3 tabs with different chapters
- [ ] Navigate in each tab simultaneously
- [ ] All tabs respond correctly
- [ ] No data corruption between tabs

### 9.4 Page Load Times
- [ ] Dashboard initial load: < 2 seconds
- [ ] Chapter page load: < 2 seconds
- [ ] Member detail page load: < 1 second
- [ ] Data refresh: < 1 second

---

## 10. Cross-Browser Testing

### 10.1 Chrome
- [ ] All functionality works
- [ ] UI renders correctly
- [ ] File upload works
- [ ] No console errors

### 10.2 Firefox
- [ ] All functionality works
- [ ] UI renders correctly
- [ ] File upload works
- [ ] No console errors

### 10.3 Safari
- [ ] All functionality works
- [ ] UI renders correctly
- [ ] File upload works
- [ ] No console errors

### 10.4 Edge
- [ ] All functionality works
- [ ] UI renders correctly
- [ ] File upload works
- [ ] No console errors

---

## 11. Responsive Design (if applicable)

### 11.1 Tablet (768px - 1024px)
- [ ] Dashboard layout adapts
- [ ] Chapter cards stack appropriately
- [ ] Navigation remains accessible
- [ ] Tables scroll horizontally if needed

### 11.2 Mobile (< 768px)
- [ ] Dashboard is usable
- [ ] Forms are accessible
- [ ] File upload works
- [ ] Navigation menu accessible

---

## 12. Security

### 12.1 File Upload Security
- [ ] Upload .exe file renamed to .xls
  - [ ] Rejected with error
- [ ] Upload file with script tags in content
  - [ ] Content sanitized
- [ ] Upload file with SQL injection attempt
  - [ ] Safely handled

### 12.2 XSS Prevention
- [ ] Create member with name: `<script>alert('xss')</script>`
  - [ ] Name displayed as text, not executed
- [ ] Upload file with XSS in cell data
  - [ ] Data sanitized

---

## Test Results Summary

**Total Tests:** _____
**Passed:** _____
**Failed:** _____
**Skipped:** _____

### Critical Issues Found:
1.
2.
3.

### Non-Critical Issues Found:
1.
2.
3.

### Notes:




---

**Sign-off:**
Tester: _________________ Date: _________
Approved: _______________ Date: _________