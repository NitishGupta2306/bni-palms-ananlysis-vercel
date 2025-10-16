"""
Backward compatibility module for excel_processor.

This module maintains backward compatibility by re-exporting classes
from the new modular structure under bni.services.excel.
"""

from .excel.processor import ExcelProcessorService
from .excel.parser import parse_bni_xml_excel

__all__ = [
    'ExcelProcessorService',
    'parse_bni_xml_excel',
]
