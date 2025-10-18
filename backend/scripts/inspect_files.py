"""
Script to inspect the structure of Excel files.
"""
import os
import sys
import django
from pathlib import Path

# Setup Django
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from bni.services.excel_processor import ExcelProcessorService


def inspect_slip_audit():
    """Inspect slip audit file structure."""
    print("="*60)
    print("SLIP AUDIT FILE INSPECTION")
    print("="*60)

    processor = ExcelProcessorService(None)
    df = processor._parse_xml_excel('bni/tests/fixtures/continental_slip_audit_aug2025.xls')

    print(f'\nShape: {df.shape} (rows x columns)')
    print(f'\nColumns ({len(df.columns)}):')
    for i, col in enumerate(df.columns, 1):
        print(f'  {i}. {col}')

    print(f'\nFirst 10 rows:')
    print(df.head(10).to_string())

    print(f'\nData types:')
    print(df.dtypes)


def inspect_member_names():
    """Inspect member names file structure."""
    print("\n\n" + "="*60)
    print("MEMBER NAMES FILE INSPECTION")
    print("="*60)

    processor = ExcelProcessorService(None)
    df = processor._parse_xml_excel('bni/tests/fixtures/continental_members_aug2025.xls')

    print(f'\nShape: {df.shape} (rows x columns)')
    print(f'\nColumns ({len(df.columns)}):')
    for i, col in enumerate(df.columns, 1):
        print(f'  {i}. {col}')

    print(f'\nAll rows:')
    print(df.to_string())


if __name__ == '__main__':
    inspect_slip_audit()
    inspect_member_names()
