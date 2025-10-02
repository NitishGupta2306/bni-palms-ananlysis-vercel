"""
Backward compatibility module for excel_processor.

This module maintains backward compatibility by re-exporting classes
from the new modular structure under bni.services.excel.
"""

from .excel.processor import ExcelProcessorService
from .excel.monthly_import_service import BNIMonthlyDataImportService
from .excel.growth_analysis_service import BNIGrowthAnalysisService
from .excel.parser import parse_bni_xml_excel

__all__ = [
    'ExcelProcessorService',
    'BNIMonthlyDataImportService',
    'BNIGrowthAnalysisService',
    'parse_bni_xml_excel',
]
