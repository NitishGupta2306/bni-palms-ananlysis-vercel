"""
XML Excel Parser for BNI Files

This module provides XML parsing functionality for BNI Excel files.
BNI audit reports are often exported as XML-based .xls files with sparse cell formatting,
where cells may have Index attributes to indicate their position in the row.
"""

import logging
import pandas as pd
from lxml import etree as ET
from pathlib import Path
from typing import Union

logger = logging.getLogger(__name__)


def parse_bni_xml_excel(file_path: Union[str, Path]) -> pd.DataFrame:
    """
    Parse XML-based Excel files (like BNI audit reports) and convert to DataFrame.

    This function handles the specific XML format used by BNI Excel exports, which include:
    - Microsoft Office XML Spreadsheet format
    - Sparse cells with Index attributes indicating column position (1-based)
    - Empty cells that need to be filled to maintain proper column alignment

    The parser uses lxml for performance (3-5x faster than standard ElementTree).

    Args:
        file_path: Path to the XML-based Excel file to parse

    Returns:
        pd.DataFrame: Parsed data with first row as headers and remaining rows as data

    Raises:
        ValueError: If no worksheet or table is found in the XML file
        FileNotFoundError: If the file does not exist

    Example:
        >>> df = parse_bni_xml_excel('/path/to/bni_audit_report.xls')
        >>> print(df.head())

    Note:
        - First row of the XML table is treated as headers
        - Sparse cells (with Index attribute) are properly aligned with empty string padding
        - All cell values are extracted as strings
        - Column headers are auto-generated if max columns exceed header count
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Parse the XML (lxml is 3-5x faster than ElementTree)
    tree = ET.parse(str(file_path))
    root = tree.getroot()

    # Define namespace for Microsoft Office XML Spreadsheet format
    ns = {
        'ss': 'urn:schemas-microsoft-com:office:spreadsheet',
        'o': 'urn:schemas-microsoft-com:office:office',
        'x': 'urn:schemas-microsoft-com:office:excel',
        'html': 'http://www.w3.org/TR/REC-html40'
    }

    # Find the worksheet
    worksheet = root.find('.//ss:Worksheet', ns)
    if worksheet is None:
        raise ValueError("No worksheet found in XML file")

    # Find the table
    table = worksheet.find('.//ss:Table', ns)
    if table is None:
        raise ValueError("No table found in worksheet")

    # Extract data from rows
    data_rows = []
    headers = []
    max_cols = 0

    rows = table.findall('.//ss:Row', ns)
    for i, row in enumerate(rows):
        cells = row.findall('.//ss:Cell', ns)
        row_data = []
        col_index = 0

        for cell in cells:
            # Check if cell has an Index attribute (sparse cells)
            # Index is 1-based in the XML format
            index_attr = cell.get(f'{{{ns["ss"]}}}Index')
            if index_attr:
                # Cell is at specific index (1-based), fill gaps with empty strings
                target_index = int(index_attr) - 1
                while col_index < target_index:
                    row_data.append("")
                    col_index += 1

            # Extract cell value
            data_elem = cell.find('.//ss:Data', ns)
            if data_elem is not None:
                cell_value = data_elem.text if data_elem.text else ""
            else:
                cell_value = ""
            row_data.append(cell_value)
            col_index += 1

        # Track maximum column count across all rows
        max_cols = max(max_cols, len(row_data))

        if i == 0:
            # First row is headers
            headers = row_data
        else:
            # Data rows
            data_rows.append(row_data)

    # Create DataFrame
    if not headers:
        raise ValueError("No headers found in XML file")

    # Pad headers and data rows to match maximum column count
    # This ensures all rows have the same number of columns
    while len(headers) < max_cols:
        headers.append(f"Column_{len(headers)}")

    for row in data_rows:
        while len(row) < max_cols:
            row.append("")

    df = pd.DataFrame(data_rows, columns=headers)
    logger.info(f"Successfully parsed XML Excel file with {len(df)} rows and {len(df.columns)} columns")

    return df
