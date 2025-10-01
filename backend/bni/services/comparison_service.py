"""
Matrix Comparison Service

This service compares matrix data between two monthly reports to track
member performance improvements and declines over time.
"""
import logging
from typing import Dict, List, Tuple, Any
from reports.models import MonthlyReport
from members.models import Member

logger = logging.getLogger(__name__)


class ComparisonService:
    """Service for comparing matrices between two monthly reports."""

    @staticmethod
    def compare_monthly_reports(current_report: MonthlyReport, previous_report: MonthlyReport) -> Dict[str, Any]:
        """
        Compare two monthly reports and return comprehensive comparison data.

        Args:
            current_report: The more recent monthly report
            previous_report: The older monthly report to compare against

        Returns:
            Dictionary containing all comparison data and insights
        """
        # Validate reports belong to same chapter
        if current_report.chapter != previous_report.chapter:
            raise ValueError("Cannot compare reports from different chapters")

        # Compare each matrix type
        referral_comparison = ComparisonService.compare_referral_matrices(
            current_report.referral_matrix_data,
            previous_report.referral_matrix_data
        )

        oto_comparison = ComparisonService.compare_oto_matrices(
            current_report.oto_matrix_data,
            previous_report.oto_matrix_data
        )

        combination_comparison = ComparisonService.compare_combination_matrices(
            current_report.combination_matrix_data,
            previous_report.combination_matrix_data
        )

        # Generate overall insights
        insights = ComparisonService.get_comparison_insights({
            'referral': referral_comparison,
            'oto': oto_comparison,
            'combination': combination_comparison
        })

        return {
            'current_report': {
                'id': current_report.id,
                'month_year': current_report.month_year,
                'processed_at': current_report.processed_at
            },
            'previous_report': {
                'id': previous_report.id,
                'month_year': previous_report.month_year,
                'processed_at': previous_report.processed_at
            },
            'referral_comparison': referral_comparison,
            'oto_comparison': oto_comparison,
            'combination_comparison': combination_comparison,
            'overall_insights': insights
        }

    @staticmethod
    def compare_referral_matrices(current_data: Dict, previous_data: Dict) -> Dict[str, Any]:
        """
        Compare referral matrices between two periods.

        Args:
            current_data: Current month's referral matrix data
            previous_data: Previous month's referral matrix data

        Returns:
            Dictionary with comparison results
        """
        if not current_data or not previous_data:
            return {'error': 'Missing matrix data'}

        current_members = current_data.get('members', [])
        previous_members = previous_data.get('members', [])
        current_matrix = current_data.get('matrix', [])
        previous_matrix = previous_data.get('matrix', [])

        # Create member name lookup for matching
        member_changes = {}

        for i, member_name in enumerate(current_members):
            # Normalize name for matching
            normalized_name = Member.normalize_name(member_name)

            # Find this member in previous data
            try:
                prev_index = next(
                    idx for idx, name in enumerate(previous_members)
                    if Member.normalize_name(name) == normalized_name
                )
            except StopIteration:
                # Member not in previous period (new member)
                prev_index = None

            # Calculate totals for this member
            current_total = sum(current_matrix[i]) if i < len(current_matrix) else 0
            previous_total = sum(previous_matrix[prev_index]) if prev_index is not None and prev_index < len(previous_matrix) else 0

            # Calculate unique counts (non-zero values)
            current_unique = sum(1 for val in current_matrix[i] if val > 0) if i < len(current_matrix) else 0
            previous_unique = sum(1 for val in previous_matrix[prev_index] if val > 0) if prev_index is not None and prev_index < len(previous_matrix) else 0

            change = current_total - previous_total
            unique_change = current_unique - previous_unique

            # Determine direction
            if change > 0:
                direction = "↗️"
                status = "improved"
            elif change < 0:
                direction = "↘️"
                status = "declined"
            else:
                direction = "➡️"
                status = "no_change"

            member_changes[member_name] = {
                'current_total': current_total,
                'previous_total': previous_total,
                'change': change,
                'current_unique': current_unique,
                'previous_unique': previous_unique,
                'unique_change': unique_change,
                'direction': direction,
                'status': status,
                'is_new_member': prev_index is None
            }

        return {
            'members': current_members,
            'current_matrix': current_matrix,
            'previous_matrix': previous_matrix,
            'member_changes': member_changes,
            'summary': ComparisonService._calculate_summary(member_changes)
        }

    @staticmethod
    def compare_oto_matrices(current_data: Dict, previous_data: Dict) -> Dict[str, Any]:
        """
        Compare one-to-one matrices between two periods.

        Args:
            current_data: Current month's OTO matrix data
            previous_data: Previous month's OTO matrix data

        Returns:
            Dictionary with comparison results
        """
        if not current_data or not previous_data:
            return {'error': 'Missing matrix data'}

        current_members = current_data.get('members', [])
        previous_members = previous_data.get('members', [])
        current_matrix = current_data.get('matrix', [])
        previous_matrix = previous_data.get('matrix', [])

        member_changes = {}

        for i, member_name in enumerate(current_members):
            normalized_name = Member.normalize_name(member_name)

            try:
                prev_index = next(
                    idx for idx, name in enumerate(previous_members)
                    if Member.normalize_name(name) == normalized_name
                )
            except StopIteration:
                prev_index = None

            # Calculate totals
            current_total = sum(current_matrix[i]) if i < len(current_matrix) else 0
            previous_total = sum(previous_matrix[prev_index]) if prev_index is not None and prev_index < len(previous_matrix) else 0

            # Calculate unique counts
            current_unique = sum(1 for val in current_matrix[i] if val > 0) if i < len(current_matrix) else 0
            previous_unique = sum(1 for val in previous_matrix[prev_index] if val > 0) if prev_index is not None and prev_index < len(previous_matrix) else 0

            change = current_total - previous_total
            unique_change = current_unique - previous_unique

            if change > 0:
                direction = "↗️"
                status = "improved"
            elif change < 0:
                direction = "↘️"
                status = "declined"
            else:
                direction = "➡️"
                status = "no_change"

            member_changes[member_name] = {
                'current_total': current_total,
                'previous_total': previous_total,
                'change': change,
                'current_unique': current_unique,
                'previous_unique': previous_unique,
                'unique_change': unique_change,
                'direction': direction,
                'status': status,
                'is_new_member': prev_index is None
            }

        return {
            'members': current_members,
            'current_matrix': current_matrix,
            'previous_matrix': previous_matrix,
            'member_changes': member_changes,
            'summary': ComparisonService._calculate_summary(member_changes)
        }

    @staticmethod
    def compare_combination_matrices(current_data: Dict, previous_data: Dict) -> Dict[str, Any]:
        """
        Compare combination matrices between two periods.

        The combination matrix uses:
        - 0: Neither (no OTO, no referral)
        - 1: OTO only
        - 2: Referral only
        - 3: Both OTO and referral

        Args:
            current_data: Current month's combination matrix data
            previous_data: Previous month's combination matrix data

        Returns:
            Dictionary with comparison results
        """
        if not current_data or not previous_data:
            return {'error': 'Missing matrix data'}

        current_members = current_data.get('members', [])
        previous_members = previous_data.get('members', [])
        current_matrix = current_data.get('matrix', [])
        previous_matrix = previous_data.get('matrix', [])

        member_changes = {}

        for i, member_name in enumerate(current_members):
            normalized_name = Member.normalize_name(member_name)

            try:
                prev_index = next(
                    idx for idx, name in enumerate(previous_members)
                    if Member.normalize_name(name) == normalized_name
                )
            except StopIteration:
                prev_index = None

            # Count by category for current
            current_row = current_matrix[i] if i < len(current_matrix) else []
            current_counts = {
                'neither': sum(1 for val in current_row if val == 0),
                'oto_only': sum(1 for val in current_row if val == 1),
                'referral_only': sum(1 for val in current_row if val == 2),
                'both': sum(1 for val in current_row if val == 3)
            }

            # Count by category for previous
            if prev_index is not None and prev_index < len(previous_matrix):
                previous_row = previous_matrix[prev_index]
                previous_counts = {
                    'neither': sum(1 for val in previous_row if val == 0),
                    'oto_only': sum(1 for val in previous_row if val == 1),
                    'referral_only': sum(1 for val in previous_row if val == 2),
                    'both': sum(1 for val in previous_row if val == 3)
                }
            else:
                previous_counts = {'neither': 0, 'oto_only': 0, 'referral_only': 0, 'both': 0}

            # Calculate changes
            changes = {
                'neither': current_counts['neither'] - previous_counts['neither'],
                'oto_only': current_counts['oto_only'] - previous_counts['oto_only'],
                'referral_only': current_counts['referral_only'] - previous_counts['referral_only'],
                'both': current_counts['both'] - previous_counts['both']
            }

            # Overall improvement: increase in 'both', decrease in 'neither'
            improvement_score = changes['both'] - changes['neither']

            if improvement_score > 0:
                direction = "↗️"
                status = "improved"
            elif improvement_score < 0:
                direction = "↘️"
                status = "declined"
            else:
                direction = "➡️"
                status = "no_change"

            member_changes[member_name] = {
                'current_counts': current_counts,
                'previous_counts': previous_counts,
                'changes': changes,
                'improvement_score': improvement_score,
                'direction': direction,
                'status': status,
                'is_new_member': prev_index is None
            }

        return {
            'members': current_members,
            'current_matrix': current_matrix,
            'previous_matrix': previous_matrix,
            'member_changes': member_changes,
            'summary': ComparisonService._calculate_combination_summary(member_changes)
        }

    @staticmethod
    def _calculate_summary(member_changes: Dict) -> Dict[str, Any]:
        """Calculate summary statistics for referral/OTO comparisons."""
        total_members = len(member_changes)
        improved = sum(1 for data in member_changes.values() if data['status'] == 'improved')
        declined = sum(1 for data in member_changes.values() if data['status'] == 'declined')
        no_change = sum(1 for data in member_changes.values() if data['status'] == 'no_change')
        new_members = sum(1 for data in member_changes.values() if data.get('is_new_member', False))

        # Get top improvements and declines
        sorted_by_change = sorted(
            member_changes.items(),
            key=lambda x: x[1]['change'],
            reverse=True
        )

        top_improvements = [
            {'member': name, 'change': data['change'], 'current': data['current_total'], 'previous': data['previous_total']}
            for name, data in sorted_by_change[:5]
            if data['change'] > 0
        ]

        top_declines = [
            {'member': name, 'change': data['change'], 'current': data['current_total'], 'previous': data['previous_total']}
            for name, data in sorted(sorted_by_change, key=lambda x: x[1]['change'])[:5]
            if data['change'] < 0
        ]

        # Calculate averages (excluding new members)
        existing_members = [data for data in member_changes.values() if not data.get('is_new_member', False)]
        average_change = sum(data['change'] for data in existing_members) / len(existing_members) if existing_members else 0
        improvement_rate = (improved / total_members * 100) if total_members > 0 else 0

        return {
            'total_members': total_members,
            'improved': improved,
            'declined': declined,
            'no_change': no_change,
            'new_members': new_members,
            'top_improvements': top_improvements,
            'top_declines': top_declines,
            'average_change': round(average_change, 2),
            'improvement_rate': round(improvement_rate, 1)
        }

    @staticmethod
    def _calculate_combination_summary(member_changes: Dict) -> Dict[str, Any]:
        """Calculate summary statistics for combination matrix comparisons."""
        total_members = len(member_changes)
        improved = sum(1 for data in member_changes.values() if data['status'] == 'improved')
        declined = sum(1 for data in member_changes.values() if data['status'] == 'declined')
        no_change = sum(1 for data in member_changes.values() if data['status'] == 'no_change')
        new_members = sum(1 for data in member_changes.values() if data.get('is_new_member', False))

        # Get top improvements and declines by improvement_score
        sorted_by_score = sorted(
            member_changes.items(),
            key=lambda x: x[1]['improvement_score'],
            reverse=True
        )

        top_improvements = [
            {
                'member': name,
                'improvement_score': data['improvement_score'],
                'both_change': data['changes']['both'],
                'neither_change': data['changes']['neither']
            }
            for name, data in sorted_by_score[:5]
            if data['improvement_score'] > 0
        ]

        top_declines = [
            {
                'member': name,
                'improvement_score': data['improvement_score'],
                'both_change': data['changes']['both'],
                'neither_change': data['changes']['neither']
            }
            for name, data in sorted(sorted_by_score, key=lambda x: x[1]['improvement_score'])[:5]
            if data['improvement_score'] < 0
        ]

        # Calculate averages (excluding new members)
        existing_members = [data for data in member_changes.values() if not data.get('is_new_member', False)]
        average_improvement_score = sum(data['improvement_score'] for data in existing_members) / len(existing_members) if existing_members else 0
        improvement_rate = (improved / total_members * 100) if total_members > 0 else 0

        return {
            'total_members': total_members,
            'improved': improved,
            'declined': declined,
            'no_change': no_change,
            'new_members': new_members,
            'top_improvements': top_improvements,
            'top_declines': top_declines,
            'average_improvement_score': round(average_improvement_score, 2),
            'improvement_rate': round(improvement_rate, 1)
        }

    @staticmethod
    def get_comparison_insights(all_comparisons: Dict) -> Dict[str, Any]:
        """
        Generate overall insights from all comparison data.

        Args:
            all_comparisons: Dictionary containing referral, oto, and combination comparisons

        Returns:
            Overall insights and statistics
        """
        referral_summary = all_comparisons.get('referral', {}).get('summary', {})
        oto_summary = all_comparisons.get('oto', {}).get('summary', {})
        combination_summary = all_comparisons.get('combination', {}).get('summary', {})

        return {
            'referrals': {
                'improved': referral_summary.get('improved', 0),
                'declined': referral_summary.get('declined', 0),
                'average_change': referral_summary.get('average_change', 0),
                'improvement_rate': referral_summary.get('improvement_rate', 0),
                'top_improvers': referral_summary.get('top_improvements', [])[:3]
            },
            'one_to_ones': {
                'improved': oto_summary.get('improved', 0),
                'declined': oto_summary.get('declined', 0),
                'average_change': oto_summary.get('average_change', 0),
                'improvement_rate': oto_summary.get('improvement_rate', 0),
                'top_improvers': oto_summary.get('top_improvements', [])[:3]
            },
            'overall': {
                'total_members': referral_summary.get('total_members', 0),
                'new_members': referral_summary.get('new_members', 0),
                'combination_improvement_rate': combination_summary.get('improvement_rate', 0),
                'most_improved_metric': ComparisonService._determine_most_improved_metric(
                    referral_summary, oto_summary
                )
            }
        }

    @staticmethod
    def _determine_most_improved_metric(referral_summary: Dict, oto_summary: Dict) -> str:
        """Determine which metric showed the most improvement."""
        ref_rate = referral_summary.get('improvement_rate', 0)
        oto_rate = oto_summary.get('improvement_rate', 0)

        if ref_rate > oto_rate:
            return 'referrals'
        elif oto_rate > ref_rate:
            return 'one_to_ones'
        else:
            return 'equal'
