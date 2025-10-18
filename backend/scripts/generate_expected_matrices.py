"""
Script to generate expected matrix outputs from real August 2025 data.
This processes the actual files and saves the expected matrices for testing.
"""
import os
import sys
import django
import json
from pathlib import Path

# Setup Django
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from chapters.models import Chapter
from members.models import Member
from reports.models import MonthlyReport
from bni.services.excel_processor import ExcelProcessorService
from bni.services.matrix_generator import MatrixGenerator


def process_chapter_data(chapter_name, slip_audit_path, member_names_path):
    """Process a chapter's data and generate expected matrices."""
    print(f"\n{'='*60}")
    print(f"Processing Chapter: {chapter_name}")
    print(f"{'='*60}")

    # Create or get chapter
    chapter, created = Chapter.objects.get_or_create(
        name=chapter_name,
        defaults={
            'location': 'Dubai',
            'meeting_day': 'Monday',
            'meeting_time': '07:00:00'
        }
    )
    print(f"Chapter: {chapter.name} (ID: {chapter.id}) - {'Created' if created else 'Existing'}")

    # Read files
    with open(slip_audit_path, 'rb') as f:
        slip_audit_file = SimpleUploadedFile(
            name=os.path.basename(slip_audit_path),
            content=f.read(),
            content_type='application/vnd.ms-excel'
        )

    with open(member_names_path, 'rb') as f:
        member_names_file = SimpleUploadedFile(
            name=os.path.basename(member_names_path),
            content=f.read(),
            content_type='application/vnd.ms-excel'
        )

    # Process using ExcelProcessorService
    processor = ExcelProcessorService(chapter)
    result = processor.process_monthly_report(
        slip_audit_file=slip_audit_file,
        member_names_file=member_names_file,
        month_year='2025-08'
    )

    print(f"\nProcessing Result:")
    print(f"  Success: {result.get('success')}")
    print(f"  Members created: {result.get('members_created', 0)}")
    print(f"  Members updated: {result.get('members_updated', 0)}")
    print(f"  Referrals: {result.get('referrals_count', 0)}")
    print(f"  One-to-Ones: {result.get('one_to_ones_count', 0)}")
    print(f"  TYFCBs: {result.get('tyfcbs_count', 0)}")

    if not result.get('success'):
        print(f"  Error: {result.get('error')}")
        return None

    # Get the monthly report
    monthly_report = MonthlyReport.objects.filter(
        chapter=chapter,
        month_year='2025-08'
    ).first()

    if not monthly_report:
        print("ERROR: Monthly report not created!")
        return None

    print(f"\nMonthly Report ID: {monthly_report.id}")

    # Extract matrices
    matrices = {
        'chapter_name': chapter_name,
        'chapter_id': chapter.id,
        'month_year': '2025-08',
        'members': monthly_report.referral_matrix_data.get('members', []),
        'member_count': len(monthly_report.referral_matrix_data.get('members', [])),
        'referral_matrix': {
            'members': monthly_report.referral_matrix_data.get('members', []),
            'matrix': monthly_report.referral_matrix_data.get('matrix', [])
        },
        'one_to_one_matrix': {
            'members': monthly_report.oto_matrix_data.get('members', []),
            'matrix': monthly_report.oto_matrix_data.get('matrix', [])
        },
        'combination_matrix': {
            'members': monthly_report.combination_matrix_data.get('members', []),
            'matrix': monthly_report.combination_matrix_data.get('matrix', []),
            'legend': monthly_report.combination_matrix_data.get('legend', {})
        },
        'statistics': {
            'total_referrals': result.get('referrals_count', 0),
            'total_one_to_ones': result.get('one_to_ones_count', 0),
            'total_tyfcbs': result.get('tyfcbs_count', 0),
        }
    }

    print(f"\nMatrix Summary:")
    print(f"  Members in matrix: {matrices['member_count']}")
    print(f"  Total referrals: {matrices['statistics']['total_referrals']}")
    print(f"  Total one-to-ones: {matrices['statistics']['total_one_to_ones']}")
    print(f"  Total TYFCBs: {matrices['statistics']['total_tyfcbs']}")

    return matrices


def main():
    """Generate expected matrices for all test chapters."""
    fixtures_dir = Path(__file__).parent / 'fixtures'

    # Process Continental chapter
    continental_matrices = process_chapter_data(
        chapter_name='BNI Continental',
        slip_audit_path=fixtures_dir / 'continental_slip_audit_aug2025.xls',
        member_names_path=fixtures_dir / 'continental_members_aug2025.xls'
    )

    if continental_matrices:
        # Save expected matrices
        output_file = fixtures_dir / 'expected_matrices_continental_aug2025.json'
        with open(output_file, 'w') as f:
            json.dump(continental_matrices, f, indent=2)
        print(f"\n✅ Saved expected matrices to: {output_file}")

        # Print first few rows of each matrix for verification
        print(f"\n{'='*60}")
        print("Sample Matrix Data (first 3 members):")
        print(f"{'='*60}")

        members = continental_matrices['members'][:3]
        print(f"\nMembers: {', '.join(members)}")

        print("\nReferral Matrix (first 3x3):")
        for i, row in enumerate(continental_matrices['referral_matrix']['matrix'][:3]):
            print(f"  {members[i]}: {row[:3]}")

        print("\nOne-to-One Matrix (first 3x3):")
        for i, row in enumerate(continental_matrices['one_to_one_matrix']['matrix'][:3]):
            print(f"  {members[i]}: {row[:3]}")

        print("\nCombination Matrix (first 3x3):")
        for i, row in enumerate(continental_matrices['combination_matrix']['matrix'][:3]):
            print(f"  {members[i]}: {row[:3]}")
    else:
        print("\n❌ Failed to process Continental chapter")


if __name__ == '__main__':
    main()
