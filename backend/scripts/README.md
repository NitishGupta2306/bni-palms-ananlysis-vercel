# Backend Utility Scripts

This directory contains one-off utility scripts for development and debugging.

## Available Scripts

### `inspect_files.py`
**Purpose:** Inspect the structure of BNI Excel files for debugging

**Usage:**
```bash
cd backend
python scripts/inspect_files.py
```

**What it does:**
- Parses slip audit and member names Excel files
- Displays file structure, columns, and sample data
- Useful for debugging Excel parsing issues

**Note:** Requires test fixture files in `bni/tests/fixtures/`

### `generate_expected_matrices.py`
**Purpose:** Generate test fixtures from real BNI data

**Usage:**
```bash
cd backend
python scripts/generate_expected_matrices.py
```

**What it does:**
- Processes real BNI Excel files
- Generates expected matrix outputs for unit tests
- Saves results as JSON fixtures

**When to use:**
- After changing matrix generation logic
- When adding new test cases
- To update expected test outputs

**Warning:** Modifies database. Run in development environment only.

## Script Maintenance

- Keep scripts minimal and focused on single tasks
- Add detailed docstrings explaining purpose and usage
- Update this README when adding new scripts
- Remove scripts that are no longer needed

## Deprecated Scripts

Scripts that have been removed:
- `set_default_passwords.py` - Removed for security (contained hardcoded passwords)
- `test_chapters_api.py` - Removed (converted to proper test suite)
