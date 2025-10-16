"""
Summary Page Excel Formatter.

Handles formatting for the summary/overview page with:
- Merged header with chapter name and period
- Chapter Statistics section (size, averages, performance distribution)
- Member Performance Overview table (all members with all metrics)
- Performance Guide legend (color meanings and thresholds)
- Performance highlighting on all metrics
"""

from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

from .colors import (
    COLOR_GREEN,
    COLOR_ORANGE,
    COLOR_RED,
    COLOR_GRAY,
    get_performance_color,
    count_performance_tiers,
)
from .border_utils import create_merged_header, configure_print_settings


def write_summary_page(worksheet, chapter_name: str, period_str: str, aggregated_data: dict,
                       differences: list, stats: dict):
    """
    Write comprehensive summary page with statistics and performance tables.

    Args:
        worksheet: The worksheet to write to
        chapter_name: Name of the chapter
        period_str: Period display string (e.g., "01/2025 - 03/2025")
        aggregated_data: Dict with referral_matrix, oto_matrix, etc.
        differences: List of inactive members
        stats: Chapter statistics dict
    """
    # Configure print settings
    configure_print_settings(worksheet, orientation='portrait', fit_to_page=True)

    # Merged header
    create_merged_header(
        worksheet,
        f"{chapter_name} - Summary Report",
        10,
        period_str,
        row=1,
    )

    # Freeze panes
    worksheet.freeze_panes = "A3"

    current_row = 3

    # =========================================================================
    # SECTION 1: QUICK STATISTICS
    # =========================================================================

    # Section header
    worksheet.cell(
        row=current_row, column=1, value="Chapter Statistics"
    ).font = Font(bold=True, size=12)
    current_row += 1

    # Statistics table headers
    stat_headers = ["Metric", "Value"]
    for col_idx, header in enumerate(stat_headers, start=1):
        cell = worksheet.cell(row=current_row, column=col_idx)
        cell.value = header
        cell.font = Font(bold=True)
        cell.fill = PatternFill(
            start_color=COLOR_GRAY,
            end_color=COLOR_GRAY,
            fill_type="solid",
        )
    current_row += 1

    # Calculate performance tier percentages
    ref_tiers = count_performance_tiers(
        stats["ref_totals"], stats["avg_referrals"]
    )
    oto_tiers = count_performance_tiers(stats["oto_totals"], stats["avg_oto"])
    tyfcb_tiers = count_performance_tiers(
        stats["tyfcb_totals"], stats["avg_tyfcb"]
    )

    # Build statistics list
    statistics = [
        ("Chapter Size", stats["chapter_size"]),
        ("Period", period_str),
        ("Total Months", stats.get("total_months", 1)),
        ("", ""),
        ("Chapter Avg Referrals Given", f"{stats['avg_referrals']:.1f}"),
        ("Chapter Avg OTO Given", f"{stats['avg_oto']:.1f}"),
        ("Chapter Avg TYFCB (AED)", f"{stats['avg_tyfcb']:.2f}"),
        ("", ""),
        ("Referrals - % Green", f"{ref_tiers['green_pct']:.1f}%"),
        ("Referrals - % Orange", f"{ref_tiers['orange_pct']:.1f}%"),
        ("Referrals - % Red", f"{ref_tiers['red_pct']:.1f}%"),
        ("", ""),
        ("OTO - % Green", f"{oto_tiers['green_pct']:.1f}%"),
        ("OTO - % Orange", f"{oto_tiers['orange_pct']:.1f}%"),
        ("OTO - % Red", f"{oto_tiers['red_pct']:.1f}%"),
        ("", ""),
        ("TYFCB - % Green", f"{tyfcb_tiers['green_pct']:.1f}%"),
        ("TYFCB - % Orange", f"{tyfcb_tiers['orange_pct']:.1f}%"),
        ("TYFCB - % Red", f"{tyfcb_tiers['red_pct']:.1f}%"),
    ]

    if differences:
        statistics.append(("", ""))
        statistics.append(("Inactive Members", len(differences)))

    # Write statistics
    for metric, value in statistics:
        worksheet.cell(row=current_row, column=1, value=metric).font = Font(
            bold=metric != ""
        )
        worksheet.cell(row=current_row, column=2, value=value)
        current_row += 1

    # Auto-adjust column widths for statistics
    worksheet.column_dimensions["A"].width = 30
    worksheet.column_dimensions["B"].width = 20

    # =========================================================================
    # SECTION 2: PERFORMANCE TABLE (ALL MEMBERS)
    # =========================================================================

    current_row += 2
    worksheet.cell(
        row=current_row, column=1, value="Member Performance Overview"
    ).font = Font(bold=True, size=12)
    current_row += 1

    # Table headers
    perf_headers = ["Member Name", "Referrals", "OTO", "TYFCB (AED)"]
    for col_idx, header in enumerate(perf_headers, start=1):
        cell = worksheet.cell(row=current_row, column=col_idx)
        cell.value = header
        cell.font = Font(bold=True)
        cell.fill = PatternFill(
            start_color=COLOR_GRAY,
            end_color=COLOR_GRAY,
            fill_type="solid",
        )
    current_row += 1

    # Get all members sorted by total performance (sum of normalized scores)
    ref_matrix = aggregated_data["referral_matrix"]
    member_performance = []

    for member in ref_matrix.index:
        ref_val = stats["ref_totals"].get(member, 0)
        oto_val = stats["oto_totals"].get(member, 0)
        tyfcb_val = stats["tyfcb_totals"].get(member, 0)

        # Calculate normalized score (sum of ratios to average)
        ref_ratio = (
            ref_val / stats["avg_referrals"] if stats["avg_referrals"] > 0 else 0
        )
        oto_ratio = oto_val / stats["avg_oto"] if stats["avg_oto"] > 0 else 0
        tyfcb_ratio = (
            tyfcb_val / stats["avg_tyfcb"] if stats["avg_tyfcb"] > 0 else 0
        )
        total_score = ref_ratio + oto_ratio + tyfcb_ratio

        member_performance.append(
            {
                "member": member,
                "ref": ref_val,
                "oto": oto_val,
                "tyfcb": tyfcb_val,
                "score": total_score,
            }
        )

    # Sort by score descending
    member_performance.sort(key=lambda x: x["score"], reverse=True)

    # Write performance data with color coding
    for perf_data in member_performance:
        # Member name
        worksheet.cell(
            row=current_row, column=1, value=perf_data["member"]
        ).font = Font(bold=True)

        # Referrals (with color)
        ref_cell = worksheet.cell(row=current_row, column=2, value=perf_data["ref"])
        ref_color = get_performance_color(
            perf_data["ref"], stats["avg_referrals"]
        )
        if ref_color:
            ref_cell.fill = PatternFill(
                start_color=ref_color, end_color=ref_color, fill_type="solid"
            )
            ref_cell.font = Font(bold=True)

        # OTO (with color)
        oto_cell = worksheet.cell(row=current_row, column=3, value=perf_data["oto"])
        oto_color = get_performance_color(perf_data["oto"], stats["avg_oto"])
        if oto_color:
            oto_cell.fill = PatternFill(
                start_color=oto_color, end_color=oto_color, fill_type="solid"
            )
            oto_cell.font = Font(bold=True)

        # TYFCB (with color)
        tyfcb_cell = worksheet.cell(
            row=current_row, column=4, value=perf_data["tyfcb"]
        )
        tyfcb_cell.number_format = "#,##0.00"
        tyfcb_color = get_performance_color(
            perf_data["tyfcb"], stats["avg_tyfcb"]
        )
        if tyfcb_color:
            tyfcb_cell.fill = PatternFill(
                start_color=tyfcb_color, end_color=tyfcb_color, fill_type="solid"
            )
            tyfcb_cell.font = Font(bold=True)

        current_row += 1

    # =========================================================================
    # SECTION 3: PERFORMANCE GUIDE (RIGHT SIDE)
    # =========================================================================

    guide_start_row = 4
    guide_col = 7

    # Guide header
    worksheet.cell(
        row=guide_start_row, column=guide_col, value="Performance Guide"
    ).font = Font(bold=True, size=11)
    worksheet.merge_cells(
        start_row=guide_start_row,
        start_column=guide_col,
        end_row=guide_start_row,
        end_column=guide_col + 1,
    )
    guide_start_row += 2

    # Guide table
    guide_data = [
        ("Color", "Meaning", "Threshold"),
        ("Green", "Excellent", "≥ 1.75x average"),
        ("Orange", "Good/Average", "0.75x - 1.75x average"),
        ("Red", "Needs Attention", "< 0.5x average"),
    ]

    for row_offset, (color_name, meaning, threshold) in enumerate(guide_data):
        row = guide_start_row + row_offset

        if row_offset == 0:  # Header row
            for col_offset, text in enumerate([color_name, meaning, threshold]):
                cell = worksheet.cell(
                    row=row, column=guide_col + col_offset, value=text
                )
                cell.font = Font(bold=True)
                cell.fill = PatternFill(
                    start_color=COLOR_GRAY,
                    end_color=COLOR_GRAY,
                    fill_type="solid",
                )
        else:
            # Color cell
            cell = worksheet.cell(row=row, column=guide_col, value=color_name)
            cell.font = Font(bold=True)
            if color_name == "Green":
                cell.fill = PatternFill(
                    start_color=COLOR_GREEN,
                    end_color=COLOR_GREEN,
                    fill_type="solid",
                )
            elif color_name == "Orange":
                cell.fill = PatternFill(
                    start_color=COLOR_ORANGE,
                    end_color=COLOR_ORANGE,
                    fill_type="solid",
                )
            elif color_name == "Red":
                cell.fill = PatternFill(
                    start_color=COLOR_RED,
                    end_color=COLOR_RED,
                    fill_type="solid",
                )

            # Meaning
            worksheet.cell(row=row, column=guide_col + 1, value=meaning)

            # Threshold
            worksheet.cell(row=row, column=guide_col + 2, value=threshold)

    # Adjust column widths for guide
    worksheet.column_dimensions[get_column_letter(guide_col)].width = 12
    worksheet.column_dimensions[get_column_letter(guide_col + 1)].width = 15
    worksheet.column_dimensions[get_column_letter(guide_col + 2)].width = 20

    # Set default column widths for main section
    worksheet.column_dimensions["A"].width = 30  # Metric names
    worksheet.column_dimensions["B"].width = 15  # Values
