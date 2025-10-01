export interface ExcelRow {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ExcelValidationOptions {
  maxFileSize: number;
  allowedMimeTypes: string[];
  maxSheets: number;
  maxRows: number;
  maxColumns: number;
  maxCellLength: number;
}

export interface SanitizedData {
  rows: ExcelRow[];
  warnings: string[];
}
