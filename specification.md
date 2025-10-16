# BNI PALMS Analytics - Excel Report Specifications

## Color Theme & Visual Design

### Primary Color Scheme
We use a classic **Red-Orange-Green** theme to indicate performance levels:
- **Green (#B6FFB6)**: Excellent performance
- **Orange (#FFD699)**: Good/Average performance  
- **Red (#FFB6B6)**: Needs attention
- **Yellow (#FFE699)**: Special highlights (non-zero matrix values)
- **Black (#000000)**: Visual separators between sections
- **Light Gray (#D3D3D3)**: Headers and section dividers

### Performance Highlighting Logic

#### Thresholds
Performance is measured against chapter average for each metric:

- **Green (Excellent):** Member performance >= 1.75x chapter average
  - Top ~15-20% performers
  - Significantly above average contribution
  
- **Orange (Good):** Member performance >= 0.75x AND < 1.75x chapter average
  - Average to above-average performers
  - Meeting or slightly exceeding expectations
  
- **Red (Needs Attention):** Member performance < 0.5x chapter average
  - Bottom performers requiring support
  - Less than half the chapter average
  
- **No Highlight:** Performance >= 0.5x AND < 0.75x chapter average
  - Below average but not critical
  - Neutral/no color applied

#### Metrics Evaluated
1. **Referrals Given** (total across period)
2. **One-to-One Meetings Given** (total across period)
3. **TYFCB Total** (Total AED value of closed business)
4. **Combination "Both"** (count of relationships with both OTO + Referral)

#### Application
- Highlighting applies to **member names** and their **total columns**
- Applies to both **aggregate totals** and **monthly totals**
- Summary page shows all members with color-coded performance across all metrics

---

## Matrix Structure

### Referral Matrix
**Purpose:** Track referrals given between members

**Columns:**
1. Member names (row headers)
2. Member name columns (matrix data)
3. Total Referrals Given (aggregate)
4. Total Unique Given (aggregate)
5. [BLACK SEPARATOR COLUMN]
6. M1 - YYYY-MM Total Referrals (monthly)
7. M1 - YYYY-MM Total Unique (monthly)
8. [BLACK SEPARATOR COLUMN]
9. M2 - YYYY-MM Total Referrals (monthly)
10. M2 - YYYY-MM Total Unique (monthly)
11. ... (repeat for each month)

**Formula:** 
```
Aggregate Matrix = M1.matrix + M2.matrix + M3.matrix + ...
```

### One-to-One Matrix
**Identical structure to Referral Matrix** but tracking one-to-one meetings instead of referrals.

### Combination Matrix
**Purpose:** Show relationship quality (both OTO and Referrals vs just one)

**Values:**
- 0 = Neither (no OTO, no Referral)
- 1 = OTO Only
- 2 = Referral Only
- 3 = Both (OTO + Referral) ← **Best outcome**

**Columns:**
1. Member names (row headers)
2. Member name columns (matrix data with values 0-3)
3. Total "Both" (3) - count of relationships with both
4. Total "Referral Only" (2) - count of referral-only relationships
5. Total "OTO Only" (1) - count of OTO-only relationships  
6. Total "Neither" (0) - count of no interaction
7. [BLACK SEPARATOR COLUMN]
8. M1 - YYYY-MM Both (3)
9. M1 - YYYY-MM Ref Only (2)
10. M1 - YYYY-MM OTO Only (1)
11. M1 - YYYY-MM Neither (0)
12. [BLACK SEPARATOR COLUMN]
13. ... (repeat for each month)

**Highlighting:** Based on "Both" (value 3) count

---

## TYFCB Report Structure

### Aggregate TYFCB Table (Top Section)
**Columns:**
- Member
- Total Inside (AED)
- Total Outside (AED)
- Total TYFCB (AED)
- Total Referrals
- Avg Referrals/Month
- Avg Value/Referral (AED)

**Sorting:** By Total TYFCB descending

### Monthly TYFCB Tables (Bottom Section)
One table per month with:
- Member
- M[X] Inside (AED)
- M[X] Outside (AED)
- M[X] Total (AED)
- M[X] Referrals
- M[X] Value/Referral (AED)

**Visual Separation:** Empty row between each monthly table

---

## Summary Page Structure

### Quick Statistics Section
Table showing:
- Chapter Size (total members)
- Chapter Avg Referrals Given
- Chapter Avg OTO Given
- Chapter Avg TYFCB
- % Green (Referrals)
- % Orange (Referrals)
- % Red (Referrals)
- % Green (OTO)
- % Orange (OTO)
- % Red (OTO)
- % Green (TYFCB)
- % Orange (TYFCB)
- % Red (TYFCB)

### Performance Table
Shows all members with their performance across all metrics:
- Member Name
- OTO Value (color-coded)
- Referral Value (color-coded)
- TYFCB Value (color-coded)

### Performance Guide (Right Side)
Helper card showing:
- Green: >= 1.75x average (Excellent)
- Orange: 0.75x - 1.75x average (Good)
- Red: < 0.5x average (Needs Attention)

With color-coded example cells

---

## Visual Design Elements

### Headers
- **Merged cell** spanning matrix width
- **Bold text**, centered alignment
- **Soft background color** complementing Red/Orange/Green theme
- Format: "[Sheet Name] - Period: MM/YYYY - MM/YYYY"

### Separators
- **Black background columns** between sections (empty cells)
- **Thick borders** around tables
- **Empty rows** between TYFCB monthly tables

### Table Enhancements
- **Freeze panes** at row 3 (keep headers visible when scrolling)
- **Alternating row colors** for readability
- **Auto-adjusted column widths** for summary page
- **Rotated headers** (90°) for member name columns in matrices
- **Number formatting:**
  - Currency: #,##0.00 AED
  - Counts: whole numbers
  - Averages: 0.00

### Cell Styling
- **Yellow highlight (#FFE699):** Non-zero values in matrices
- **Green/Orange/Red:** Performance-based on member totals
- **Gray (#D3D3D3):** Section headers
- **Bold font:** Headers, totals rows, member names

---

## Date Formatting

### Input Format
Database stores: `YYYY-MM` (e.g., "2025-09")

### Display Format  
Excel shows: `MM/YYYY` (e.g., "09/2025")

### Period Ranges
Format: "MM/YYYY - MM/YYYY" (e.g., "09/2025 - 11/2025")

---

## Implementation Notes

### Data Source
- Pull from Supabase PostgreSQL database
- Aggregate multiple `MonthlyReport` objects
- Calculate statistics across all selected months

### Performance Calculations
1. Calculate chapter average for each metric
2. For each member, compare to average
3. Apply highlighting based on thresholds
4. Count members in each performance tier (Green/Orange/Red)
5. Calculate percentages for summary

### File Generation
- Single Excel file (.xlsx)
- Multiple sheets (Summary, Referral, OTO, Combination, TYFCB, Inactive Members)
- Generated in-memory (BytesIO)
- Returned as HTTP download

---

## Testing Requirements

- [ ] All merged headers span correct width
- [ ] Date formatting displays as MM/YYYY
- [ ] Black separator columns appear correctly
- [ ] Performance highlighting calculates accurately
- [ ] Thresholds (1.75x, 0.75x, 0.5x) apply correctly
- [ ] Monthly columns show individual month data
- [ ] Combination matrix has 4 aggregate columns
- [ ] TYFCB shows separate tables per month
- [ ] Summary statistics calculate correctly
- [ ] Performance guide displays on summary page
- [ ] File opens without errors in Excel/LibreOffice
- [ ] Freeze panes work when scrolling
- [ ] Column widths are readable
- [ ] Currency formatting shows AED correctly
