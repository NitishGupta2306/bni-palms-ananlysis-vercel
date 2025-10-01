# BNI Test Data

## August 2025 Data

This directory contains real BNI chapter data from August 2025 for comprehensive testing.

### Structure

```
august-2025/
├── slip-audit-reports/     # Monthly slip audit reports for each chapter
│   ├── continental/
│   ├── elevate/
│   ├── energy/
│   ├── excelerate/
│   ├── givers/
│   ├── gladiators/
│   ├── legends/
│   ├── synergy/
│   └── united/
└── member-names/           # Member names Excel files for each chapter
    ├── bni-continental.xls
    ├── bni-elevate.xls
    ├── bni-energy.xls
    ├── bni-excelerate.xls
    ├── bni-givers.xls
    ├── bni-gladiators.xls
    ├── bni-legends.xls
    ├── bni-synergy.xls
    └── bni-united.xls
```

### Chapters Included

1. **BNI Continental**
2. **BNI Elevate**
3. **BNI Energy**
4. **BNI Excelerate**
5. **BNI Givers**
6. **BNI Gladiators**
7. **BNI Legends**
8. **BNI Synergy**
9. **BNI United**

### Data Contents

Each slip audit report contains:
- Referrals given between members
- One-to-One meetings completed
- TYFCB (Thank You For Closed Business) amounts
- Dates and details for each interaction

Each member names file contains:
- First Name
- Last Name
- Business classification
- Contact information

### Usage in Tests

These files are used to:
1. Test Excel file parsing and data extraction
2. Validate member creation and name normalization
3. Verify referral, OTO, and TYFCB data storage
4. Test monthly report generation
5. Validate data integrity and relationships

### Important Notes

- Files are copied from `/Users/nattletale/Documents/bni-docs/august-data/`
- Data represents real BNI chapter activity for August 2025
- All tests should use this data for consistency
- Do not modify these files - they are the source of truth for testing