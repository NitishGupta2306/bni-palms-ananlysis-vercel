# BNI PALMS Analytics - Excel Enhancement Testing Checklist

**Version:** 1.0  
**Date:** October 15, 2025  
**Feature:** Multi-Month Aggregated Excel Reports with Performance Highlighting

---

## Pre-Testing Setup

### Environment Verification
- [ ] Backend server running on `http://localhost:8000`
- [ ] Frontend server running on `http://localhost:3000`
- [ ] Database connected (Supabase PostgreSQL)
- [ ] Test data available (at least 2-3 monthly reports uploaded)
- [ ] Browser console open (F12) to check for errors

### Test Data Requirements
- [ ] Chapter with at least 10 members
- [ ] At least 2 monthly reports for the same chapter
- [ ] Reports contain referral and OTO data
- [ ] Some members with TYFCB data
- [ ] Mix of active and inactive members (if possible)

---

## SECTION 1: Summary Page Testing

### 1.1 Header and Layout
- [ ] **Merged header displays correctly**
  - [ ] Shows chapter name
  - [ ] Shows period range in MM/YYYY - MM/YYYY format
  - [ ] Spans full width of data
  - [ ] Has soft background color (#E8F5E8)
  - [ ] Text is bold and centered

- [ ] **Freeze panes working**
  - [ ] Scroll down - header row stays visible
  - [ ] Row 1 (merged header) stays at top

### 1.2 Chapter Statistics Section
- [ ] **Statistics table displays**
  - [ ] "Chapter Statistics" section header visible
  - [ ] Two-column table (Metric | Value)
  - [ ] Headers have gray background (#D3D3D3)

- [ ] **All statistics present**
  - [ ] Chapter Size (number of members)
  - [ ] Period display (formatted as MM/YYYY - MM/YYYY)
  - [ ] Total Months count
  - [ ] Chapter Avg Referrals Given (decimal number)
  - [ ] Chapter Avg OTO Given (decimal number)
  - [ ] Chapter Avg TYFCB (AED) (decimal with .00)
  - [ ] Referrals - % Green/Orange/Red
  - [ ] OTO - % Green/Orange/Red
  - [ ] TYFCB - % Green/Orange/Red
  - [ ] Inactive Members count (if any)

- [ ] **Percentages add up**
  - [ ] Green% + Orange% + Red% ≈ 100% for each category
  - [ ] (May not be exact 100% due to "neutral" members in 0.5-0.75 range)

- [ ] **Column widths**
  - [ ] Column A is readable (~30 chars wide)
  - [ ] Column B shows full values (~20 chars wide)

### 1.3 Member Performance Overview Table
- [ ] **Table displays below statistics**
  - [ ] "Member Performance Overview" header visible
  - [ ] Four columns: Member Name | Referrals | OTO | TYFCB (AED)
  - [ ] Headers have gray background
  - [ ] All members listed

- [ ] **Data accuracy**
  - [ ] Member names match actual members
  - [ ] Referrals numbers are integers
  - [ ] OTO numbers are integers
  - [ ] TYFCB shows currency format with decimals (AED #,##0.00)

- [ ] **Performance color coding**
  - [ ] **Green cells** (#B6FFB6) for members >= 1.75x average
    - [ ] Check at least one member has green highlighting
    - [ ] Green cells have bold text
  - [ ] **Orange cells** (#FFD699) for members 0.75x - 1.75x average
    - [ ] Check at least one member has orange highlighting
    - [ ] Orange cells have bold text
  - [ ] **Red cells** (#FFB6B6) for members < 0.5x average
    - [ ] Check at least one member has red highlighting
    - [ ] Red cells have bold text
  - [ ] No highlighting for members 0.5x - 0.75x average (neutral)

- [ ] **Sorting**
  - [ ] Members sorted by overall performance (sum of normalized scores)
  - [ ] Best performers at top of list

### 1.4 Performance Guide (Right Side)
- [ ] **Guide displays in columns G-I**
  - [ ] "Performance Guide" header visible
  - [ ] Header spans 2 columns (merged)
  - [ ] Located at row 4, column 7

- [ ] **Guide table structure**
  - [ ] Three columns: Color | Meaning | Threshold
  - [ ] Four rows: Header + Green + Orange + Red

- [ ] **Color examples**
  - [ ] Green row has green background (#B6FFB6)
  - [ ] Orange row has orange background (#FFD699)
  - [ ] Red row has red background (#FFB6B6)
  - [ ] All color cells have bold text

- [ ] **Content accuracy**
  - [ ] Green: "Excellent" | "≥ 1.75x average"
  - [ ] Orange: "Good/Average" | "0.75x - 1.75x average"
  - [ ] Red: "Needs Attention" | "< 0.5x average"

- [ ] **Column widths**
  - [ ] Color column ~12 chars
  - [ ] Meaning column ~15 chars
  - [ ] Threshold column ~20 chars

---

## SECTION 2: Referral Matrix Testing

### 2.1 Header and Structure
- [ ] **Merged header**
  - [ ] "Referral Matrix - Period: MM/YYYY - MM/YYYY"
  - [ ] Spans all columns (matrix + aggregates + monthly columns + separators)
  - [ ] Bold, centered, soft green background

- [ ] **Freeze panes**
  - [ ] Scroll right - row headers (member names) stay visible
  - [ ] Scroll down - column headers stay visible

### 2.2 Column Headers (Row 2)
- [ ] **Member name headers**
  - [ ] All member names present as column headers
  - [ ] Rotated 90 degrees (vertical text)
  - [ ] Gray background (#D3D3D3)
  - [ ] Bold font
  - [ ] Readable when rotated

- [ ] **Aggregate column headers**
  - [ ] "Total Given" column present
  - [ ] "Unique Given" column present
  - [ ] Both headers bold with gray background

- [ ] **Thick border separator (NEW)**
  - [ ] Thick medium-weight border on right side of "Unique Given" column
  - [ ] Separates aggregate section from monthly data
  - [ ] Border visible and professional-looking

- [ ] **Monthly column headers**
  - [ ] For each month (M1, M2, M3...):
    - [ ] "M1-MM/YYYY\nTotal" header (month display format correct)
    - [ ] "M1-MM/YYYY\nUnique" header
    - [ ] Headers rotated 90 degrees
    - [ ] Headers wrapped (two lines visible)
    - [ ] Gray background
    - [ ] Font size slightly smaller (8pt)

- [ ] **Thick border separators between months (NEW)**
  - [ ] Thick border on right side of each month's last column
  - [ ] Last month should NOT have thick border after it
  - [ ] All borders consistent style (medium weight)

### 2.3 Data Rows (Starting Row 3)
- [ ] **Row headers (Column A)**
  - [ ] All member names present
  - [ ] Bold font
  - [ ] No rotation (horizontal text)

- [ ] **Performance highlighting on member names**
  - [ ] Some members have green background (#B6FFB6)
  - [ ] Some members have orange background (#FFD699)
  - [ ] Some members have red background (#FFB6B6)
  - [ ] Some members have no highlighting (neutral performance)

- [ ] **Matrix cells (member interactions)**
  - [ ] Cells show referral counts (integers)
  - [ ] Zero values displayed
  - [ ] Non-zero values have yellow background (#FFE699)
  - [ ] Non-zero values have bold font
  - [ ] Diagonal cells (self-to-self) should be 0

- [ ] **Aggregate columns**
  - [ ] "Total Given" shows sum of referrals given by that member
  - [ ] "Unique Given" shows count of unique recipients
  - [ ] Both columns bold
  - [ ] Performance highlighting matches member name color
  - [ ] Values match manual calculation (spot check 2-3 members)

- [ ] **Monthly columns**
  - [ ] Each month shows totals for that specific month only
  - [ ] Values are less than or equal to aggregate totals
  - [ ] Sum of all monthly totals ≈ aggregate total (spot check)
  - [ ] Unique count makes sense (≤ total given)

### 2.4 Total Received Row (Bottom)
- [ ] **Row label**
  - [ ] "Total Received" in column A
  - [ ] Bold font

- [ ] **Column totals**
  - [ ] Each member column shows total referrals RECEIVED
  - [ ] Bold font
  - [ ] Values match manual calculation (spot check 2-3 members)
  - [ ] Stops at member columns (aggregate/monthly columns empty)

### 2.5 Data Accuracy
- [ ] **Spot check calculations** (pick 2-3 members):
  - [ ] Count non-zero cells in their row
  - [ ] Compare to "Unique Given" value (should match)
  - [ ] Sum all values in their row
  - [ ] Compare to "Total Given" value (should match)
  - [ ] Sum all values in their column
  - [ ] Compare to "Total Received" value (should match)

- [ ] **Monthly data verification**:
  - [ ] Pick one member and one month
  - [ ] Download original single-month report
  - [ ] Verify monthly total matches original report

---

## SECTION 3: One-to-One Matrix Testing

### 3.1 Structure Verification
- [ ] **Sheet exists** as "One-to-One Matrix"
- [ ] **Identical structure to Referral Matrix**
  - [ ] Same header format
  - [ ] Same column layout (members + aggregates + black separator + monthly)
  - [ ] Same performance highlighting logic
  - [ ] Same freeze panes

### 3.2 Data Verification
- [ ] **Shows OTO meeting counts** (not referrals)
- [ ] **Different values than Referral Matrix**
- [ ] **Performance colors based on OTO average** (not referral average)
- [ ] **Spot check 2-3 members** for accuracy

---

## SECTION 4: Combination Matrix Testing

### 4.1 Header and Structure
- [ ] **Merged header**
  - [ ] "Combination Matrix - Period: MM/YYYY - MM/YYYY"

- [ ] **Matrix values are 0-3**
  - [ ] 0 = Neither (no OTO, no Referral)
  - [ ] 1 = OTO Only
  - [ ] 2 = Referral Only
  - [ ] 3 = Both (OTO + Referral) ← **Best value**

### 4.2 Aggregate Columns (4 columns instead of 2!)
- [ ] **Four aggregate columns present**:
  - [ ] "Both (3)" - count of relationships with both
  - [ ] "Ref Only (2)" - count of referral-only
  - [ ] "OTO Only (1)" - count of OTO-only
  - [ ] "Neither (0)" - count of no interaction
  - [ ] All headers bold, gray background
  - [ ] Wrapped text, centered alignment

- [ ] **Thick border separator after aggregates (NEW)**
  - [ ] Thick border on right side of "Neither (0)" column

### 4.3 Monthly Columns (4 columns per month!)
- [ ] **Each month has 4 columns**:
  - [ ] "M1-MM/YYYY\nBoth" (rotated, gray background)
  - [ ] "M1-MM/YYYY\nRef" (rotated, gray background)
  - [ ] "M1-MM/YYYY\nOTO" (rotated, gray background)
  - [ ] "M1-MM/YYYY\nNone" (rotated, gray background)

- [ ] **Thick border separators between months (NEW)**
  - [ ] Present on right side of each month's last column
  - [ ] Not after last month

### 4.4 Data Verification
- [ ] **Matrix cells show 0, 1, 2, or 3 only**
  - [ ] No negative numbers
  - [ ] No numbers > 3
  - [ ] Diagonal (self-to-self) should be 0

- [ ] **Yellow highlighting**
  - [ ] Only cells with value **3** (Both) are yellow (#FFE699)
  - [ ] Yellow cells have bold font
  - [ ] Values 0, 1, 2 have no highlighting

- [ ] **Performance highlighting**
  - [ ] Based on count of "Both" (value 3)
  - [ ] Member names colored Green/Orange/Red based on "Both" count
  - [ ] "Both (3)" aggregate column has matching color

- [ ] **Aggregate calculations**
  - [ ] Spot check: Count cells in row with value 3
  - [ ] Should match "Both (3)" column
  - [ ] Spot check: Count cells with value 2
  - [ ] Should match "Ref Only (2)" column

- [ ] **Consistency check** (pick one member):
  - [ ] Find cell in Combination Matrix
  - [ ] Check same cell in Referral Matrix
  - [ ] Check same cell in OTO Matrix
  - [ ] Verify logic:
    - [ ] Referral=0, OTO=0 → Combo=0 ✓
    - [ ] Referral=0, OTO>0 → Combo=1 ✓
    - [ ] Referral>0, OTO=0 → Combo=2 ✓
    - [ ] Referral>0, OTO>0 → Combo=3 ✓

### 4.5 Total Received Row
- [ ] **Shows count of "Both" received**
  - [ ] Counts how many members gave this member value 3
  - [ ] Bold font
  - [ ] Makes sense in context

---

## SECTION 5: TYFCB Report Testing

### 5.1 Header and Structure
- [ ] **Merged header**
  - [ ] "TYFCB Report - Period: MM/YYYY - MM/YYYY"
  - [ ] Spans 7 columns (or more for monthly data)

### 5.2 Aggregate Table Headers
- [ ] **Seven column headers present**:
  - [ ] Member
  - [ ] Total Inside (AED)
  - [ ] Total Outside (AED)
  - [ ] Total TYFCB (AED)
  - [ ] Total Referrals
  - [ ] Avg Ref/Month
  - [ ] Avg Value/Ref (AED)
  - [ ] All gray background, bold, centered

### 5.3 Aggregate Data Rows
- [ ] **All members listed**
  - [ ] Member names bold
  - [ ] Sorted by Total TYFCB descending (highest at top)

- [ ] **Performance highlighting (NEW)**
  - [ ] Member names colored Green/Orange/Red based on Total TYFCB
  - [ ] Total TYFCB column has matching color highlighting
  - [ ] Bold text in colored cells
  - [ ] **SPECIAL**: Member names highlighted RED if Outside TYFCB > 2x Inside TYFCB (flags external referrers)

- [ ] **Currency formatting**
  - [ ] All AED columns show #,##0.00 format
  - [ ] Commas for thousands (if applicable)
  - [ ] Two decimal places

- [ ] **Calculations**
  - [ ] Total Inside + Total Outside = Total TYFCB (spot check 3 members)
  - [ ] Avg Ref/Month = Total Referrals / Number of Months (spot check)
  - [ ] Avg Value/Ref = Total TYFCB / Total Referrals (spot check)
  - [ ] If Total Referrals = 0, Avg Value/Ref should be 0 (not error)

### 5.4 Totals Row
- [ ] **"TOTAL:" label in column A**
  - [ ] Bold font

- [ ] **Column totals**
  - [ ] Total Inside sum (bold, currency format)
  - [ ] Total Outside sum (bold, currency format)
  - [ ] Total TYFCB sum (bold, currency format)
  - [ ] Total Referrals sum (bold)
  - [ ] Manually verify one total is correct

### 5.5 Monthly TYFCB Section (if implemented)
- [ ] **Section header present**
  - [ ] "Monthly TYFCB Data" visible
  - [ ] Merged cell, bold, soft background
  - [ ] Empty row above for separation

- [ ] **Month tables** (one per month):
  - [ ] Month header: "Month 1 - MM/YYYY"
  - [ ] Table headers: Member | Inside (AED) | Outside (AED) | Total (AED) | Referrals | Value/Ref (AED)
  - [ ] All members with activity listed
  - [ ] Sorted by Total descending
  - [ ] Currency formatting on AED columns
  - [ ] Month Total row at bottom

- [ ] **Empty rows between month tables**
  - [ ] 2-3 empty rows for visual separation

---

## SECTION 6: Inactive Members Sheet Testing

### 6.1 Structure
- [ ] **Sheet exists** (if there are inactive members)
- [ ] **Merged header**
  - [ ] "Inactive Members Report - Period: MM/YYYY - MM/YYYY"

### 6.2 Table Content
- [ ] **Column headers**:
  - [ ] Member Name
  - [ ] Business Name
  - [ ] Classification
  - [ ] Last Active Month
  - [ ] All headers bold, gray background

- [ ] **Data accuracy**
  - [ ] Lists members who became inactive during period
  - [ ] Shows correct last active month
  - [ ] Business info matches member records

---

## SECTION 7: File-Level Testing

### 7.1 Download Process
- [ ] **File downloads successfully**
  - [ ] No browser errors
  - [ ] No 500 errors in backend
  - [ ] File downloads within 10 seconds for 3-month report

- [ ] **Filename format**
  - [ ] Format: `ChapterName_Aggregated_Report_MMM-till-MMM-YYYY.xlsx`
  - [ ] Example: `BNI_Continental_Aggregated_Report_Sep-till-Nov-2025.xlsx`
  - [ ] No special characters that break downloads
  - [ ] Spaces replaced with underscores

### 7.2 File Properties
- [ ] **File opens in Excel/LibreOffice**
  - [ ] No corruption errors
  - [ ] All sheets visible in sheet tabs
  - [ ] No "Repair" prompts

- [ ] **File size**
  - [ ] Reasonable size (typically 20KB - 100KB for 50 members)
  - [ ] Not suspiciously small (< 5KB = likely error)
  - [ ] Not too large (> 5MB = performance issue)

### 7.3 Sheet Order
- [ ] **Correct sheet order** (left to right):
  1. Summary
  2. Referral Matrix
  3. One-to-One Matrix
  4. Combination Matrix
  5. TYFCB Report
  6. Inactive Members (if any)

---

## SECTION 8: Edge Cases & Error Handling

### 8.1 Single Month Selection
- [ ] **Select only 1 month**
  - [ ] File generates successfully
  - [ ] Period shows single month: "09/2025" (not "09/2025 - 09/2025")
  - [ ] Only M1 monthly columns appear
  - [ ] No thick border separator after M1 (since it's the only month)
  - [ ] Averages divide by 1 correctly

### 8.2 Many Months Selection
- [ ] **Select 6+ months**
  - [ ] File generates successfully
  - [ ] All months appear as columns
  - [ ] Excel doesn't become too wide (scrollable horizontally)
  - [ ] Performance is acceptable (< 30 seconds)
  - [ ] Thick border separators between all months

### 8.3 Empty Data Scenarios
- [ ] **Member with zero referrals**
  - [ ] Shows 0 in all cells
  - [ ] Total Given = 0
  - [ ] Unique Given = 0
  - [ ] Likely has red highlighting (< 0.5x average)

- [ ] **Member with zero OTO**
  - [ ] OTO matrix shows 0s
  - [ ] Combination matrix shows correct values (0 or 2, never 1 or 3)

- [ ] **Member with zero TYFCB**
  - [ ] Shows 0.00 in TYFCB columns
  - [ ] Avg Value/Ref = 0.00 (not error/blank)

- [ ] **Month with no data**
  - [ ] Monthly columns show 0s
  - [ ] No crashes or errors

### 8.4 Special Characters in Names
- [ ] **Member names with special chars**
  - [ ] Apostrophes (O'Brien) display correctly
  - [ ] Hyphens (Mary-Jane) display correctly
  - [ ] Accented characters (José, Françoise) display correctly
  - [ ] No encoding errors (�� symbols)

### 8.5 Large Chapter
- [ ] **50+ members**
  - [ ] Matrix renders (may be wide)
  - [ ] All members visible
  - [ ] Performance is acceptable
  - [ ] No browser/Excel crashes

---

## SECTION 9: Performance Testing

### 9.1 Backend Performance
- [ ] **Generation time** (check terminal/logs):
  - [ ] 2 months, 20 members: < 5 seconds
  - [ ] 3 months, 50 members: < 15 seconds
  - [ ] 6 months, 50 members: < 30 seconds

- [ ] **No errors in terminal**
  - [ ] No Python exceptions
  - [ ] No database errors
  - [ ] No timeout errors

### 9.2 Frontend Performance
- [ ] **UI responsiveness**
  - [ ] "Generate Report" button shows loading state
  - [ ] UI doesn't freeze during generation
  - [ ] Success message appears after download
  - [ ] Can generate multiple reports in sequence

---

## SECTION 10: Cross-Browser Testing

### 10.1 Chrome/Edge
- [ ] File downloads successfully
- [ ] Filename correct
- [ ] Opens in Excel/LibreOffice

### 10.2 Firefox
- [ ] File downloads successfully
- [ ] Filename correct
- [ ] Opens in Excel/LibreOffice

### 10.3 Safari (if Mac available)
- [ ] File downloads successfully
- [ ] Filename correct
- [ ] Opens in Excel/LibreOffice

---

## SECTION 11: Visual Quality Checks

### 11.1 Colors
- [ ] **All colors match specification**:
  - [ ] Green: #B6FFB6 (light green, not too bright)
  - [ ] Orange: #FFD699 (light orange, not too dark)
  - [ ] Red: #FFB6B6 (light red/pink, not alarming)
  - [ ] Yellow: #FFE699 (light yellow for non-zero values)
  - [ ] Gray: #D3D3D3 (light gray for headers)
  - [ ] Header BG: #E8F5E8 (very light green)
  - [ ] Black: #000000 (borders and text)

- [ ] **Colors print well** (if testing printing):
  - [ ] Performance colors visible on grayscale printer
  - [ ] Border separators visible
  - [ ] Text readable

### 11.2 Formatting
- [ ] **Alignment**
  - [ ] Member names left-aligned
  - [ ] Numbers right-aligned
  - [ ] Headers centered
  - [ ] Rotated headers readable

- [ ] **Borders (NEW IMPROVEMENTS)**
  - [ ] Thin borders around all data cells (professional table appearance)
  - [ ] Thick/medium borders separating sections (aggregate from monthly)
  - [ ] Medium border under all section headers
  - [ ] Clean, consistent border styling throughout
  - [ ] No random or missing borders

### 11.3 Fonts
- [ ] **Consistent font usage**
  - [ ] Headers bold (size 10-12pt)
  - [ ] Data normal weight (size 10pt)
  - [ ] Small headers for rotated text (size 8-9pt)
  - [ ] No font mixing (should be Arial or Calibri throughout)

---

## SECTION 12: Accessibility & Usability

### 12.1 Readability
- [ ] **Column widths appropriate**
  - [ ] No text cutoff
  - [ ] No excessive wrapping
  - [ ] Rotated headers fit in cells

- [ ] **Row heights appropriate**
  - [ ] Rotated headers have enough height
  - [ ] Data rows not too cramped
  - [ ] Good visual spacing

### 12.2 Navigation
- [ ] **Sheet tabs easy to click**
  - [ ] Tab names not truncated
  - [ ] Easy to switch between sheets

- [ ] **Freeze panes helpful**
  - [ ] Can scroll and still see context
  - [ ] Improves usability for large matrices

---

## SECTION 13: Data Integrity

### 13.1 Consistency Checks
- [ ] **Same member appears identically across sheets**
  - [ ] Name spelled same way
  - [ ] Same order in matrices
  - [ ] No duplicates

- [ ] **Data matches original uploads**
  - [ ] Pick one month
  - [ ] Download original single-month report
  - [ ] Spot check 3-5 members match

### 13.2 Calculation Verification
- [ ] **Aggregate equals sum of monthly**
  - [ ] Pick one member, one metric
  - [ ] Aggregate value = M1 + M2 + M3...
  - [ ] Within rounding tolerance (±0.01 for currency)

- [ ] **Performance colors consistent**
  - [ ] Member colored green in Summary → also green in their metric sheet
  - [ ] Colors don't contradict across sheets

---

## SECTION 14: Security & Privacy

### 14.1 Data Privacy
- [ ] **Only shows data for selected chapter**
  - [ ] No data leakage from other chapters
  - [ ] No test/debug data visible

- [ ] **No sensitive information exposed**
  - [ ] No member phone numbers/emails (unless intended)
  - [ ] No internal IDs or technical details
  - [ ] No debug logs in cells

### 14.2 File Security
- [ ] **No macros or embedded code**
  - [ ] Excel doesn't warn about macros
  - [ ] Pure data file, no VBA
  - [ ] Can open without security warnings

---

## Final Checklist Sign-Off

### Tester Information
- **Tester Name:** _______________________
- **Test Date:** _______________________
- **Browser Used:** _______________________
- **Excel/LibreOffice Version:** _______________________

### Overall Results
- [ ] All critical tests passed
- [ ] All high-priority tests passed
- [ ] Visual quality acceptable
- [ ] Performance acceptable
- [ ] Ready for production

### Issues Found
Document any issues:
```
Issue 1: [Description]
Severity: [Critical/High/Medium/Low]
Steps to reproduce: [...]

Issue 2: [Description]
...
```

### Notes
```
[Any additional observations or recommendations]
```

---

## Quick Smoke Test (5 minutes)

If you don't have time for full testing, do this:

1. [ ] Select 2 monthly reports
2. [ ] Click "Generate Report"
3. [ ] File downloads
4. [ ] Open in Excel - no errors
5. [ ] Check Summary page - colors visible
6. [ ] Check Referral Matrix - monthly columns present
7. [ ] Check Combination Matrix - 4 aggregate columns
8. [ ] Spot check 2-3 calculations manually

If all pass → Likely good to go  
If any fail → Do full testing

---

**End of Testing Checklist**