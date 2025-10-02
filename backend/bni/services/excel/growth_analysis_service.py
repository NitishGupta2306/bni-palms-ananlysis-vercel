"""
BNI Growth Analysis Service

Service for calculating growth metrics and trends between current and last month.
"""
import logging
from chapters.models import Chapter
from members.models import Member

logger = logging.getLogger(__name__)


class BNIGrowthAnalysisService:
    """
    Service for calculating growth metrics and trends between current and last month.
    """

    @staticmethod
    def get_chapter_growth_metrics(chapter_id: int):
        """
        Get growth metrics for a chapter comparing current vs last month.
        """
        try:
            from bni.models import MonthlyChapterReport

            chapter = Chapter.objects.get(id=chapter_id)

            # Get the two most recent monthly reports
            recent_reports = MonthlyChapterReport.objects.filter(
                chapter=chapter
            ).order_by('-report_month')[:2]

            if len(recent_reports) < 2:
                return {
                    'chapter': chapter.name,
                    'has_comparison': False,
                    'message': 'Need at least 2 months of data for comparison'
                }

            current_report = recent_reports[0]
            previous_report = recent_reports[1]

            # Calculate growth metrics
            growth_data = current_report.calculate_growth(previous_report)

            return {
                'chapter': chapter.name,
                'has_comparison': True,
                'current_month': current_report.report_month,
                'previous_month': previous_report.report_month,
                'current_metrics': {
                    'total_referrals_given': current_report.total_referrals_given,
                    'total_one_to_ones': current_report.total_one_to_ones,
                    'total_tyfcb': float(current_report.total_tyfcb),
                    'active_member_count': current_report.active_member_count,
                    'performance_score': current_report.performance_score
                },
                'previous_metrics': {
                    'total_referrals_given': previous_report.total_referrals_given,
                    'total_one_to_ones': previous_report.total_one_to_ones,
                    'total_tyfcb': float(previous_report.total_tyfcb),
                    'active_member_count': previous_report.active_member_count,
                    'performance_score': previous_report.performance_score
                },
                'growth': growth_data
            }

        except Chapter.DoesNotExist:
            return {'error': f'Chapter with ID {chapter_id} not found'}
        except Exception as e:
            logger.error(f"Error calculating growth for chapter {chapter_id}: {str(e)}")
            return {'error': str(e)}

    @staticmethod
    def get_member_growth_metrics(member_id: int):
        """
        Get growth metrics for an individual member comparing current vs last month.
        """
        try:
            from bni.models import MemberMonthlyMetrics

            member = Member.objects.get(id=member_id)

            # Get the two most recent monthly metrics
            recent_metrics = MemberMonthlyMetrics.objects.filter(
                member=member
            ).order_by('-report_month')[:2]

            if len(recent_metrics) < 2:
                return {
                    'member': member.full_name,
                    'chapter': member.chapter.name,
                    'has_comparison': False,
                    'message': 'Need at least 2 months of data for comparison'
                }

            current_metrics = recent_metrics[0]
            previous_metrics = recent_metrics[1]

            # Calculate growth metrics
            growth_data = current_metrics.calculate_growth(previous_metrics)

            return {
                'member': member.full_name,
                'chapter': member.chapter.name,
                'has_comparison': True,
                'current_month': current_metrics.report_month,
                'previous_month': previous_metrics.report_month,
                'current_metrics': {
                    'referrals_given': current_metrics.referrals_given,
                    'referrals_received': current_metrics.referrals_received,
                    'one_to_ones_completed': current_metrics.one_to_ones_completed,
                    'tyfcb_amount': float(current_metrics.tyfcb_amount),
                    'performance_score': current_metrics.performance_score,
                    'oto_completion_rate': current_metrics.oto_completion_rate
                },
                'previous_metrics': {
                    'referrals_given': previous_metrics.referrals_given,
                    'referrals_received': previous_metrics.referrals_received,
                    'one_to_ones_completed': previous_metrics.one_to_ones_completed,
                    'tyfcb_amount': float(previous_metrics.tyfcb_amount),
                    'performance_score': previous_metrics.performance_score,
                    'oto_completion_rate': previous_metrics.oto_completion_rate
                },
                'growth': growth_data
            }

        except Member.DoesNotExist:
            return {'error': f'Member with ID {member_id} not found'}
        except Exception as e:
            logger.error(f"Error calculating growth for member {member_id}: {str(e)}")
            return {'error': str(e)}
