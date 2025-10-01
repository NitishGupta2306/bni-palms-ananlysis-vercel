export interface ExcelValidationOptions {
  maxFileSize: number;
  allowedExtensions: string[];
  maxSheets: number;
  maxRows: number;
  maxCols: number;
}

export const DEFAULT_VALIDATION_OPTIONS: ExcelValidationOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.xls', '.xlsx'],
  maxSheets: 10,
  maxRows: 10000,
  maxCols: 100,
};

export class ExcelSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExcelSecurityError';
  }
}

export const validateExcelFile = (
  file: File,
  options: ExcelValidationOptions = DEFAULT_VALIDATION_OPTIONS
): void => {
  // Validate file size
  if (file.size > options.maxFileSize) {
    throw new ExcelSecurityError(`File size exceeds maximum allowed size of ${options.maxFileSize} bytes`);
  }

  // Validate file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = options.allowedExtensions.some(ext =>
    fileName.endsWith(ext.toLowerCase())
  );

  if (!hasValidExtension) {
    throw new ExcelSecurityError(`File extension not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`);
  }

  // Validate MIME type
  const allowedMimeTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ];

  if (!allowedMimeTypes.includes(file.type) && file.type !== '') {
    throw new ExcelSecurityError(`Invalid MIME type: ${file.type}`);
  }
};

export const sanitizeSheetData = (data: any[], options: ExcelValidationOptions = DEFAULT_VALIDATION_OPTIONS): any[] => {
  // Limit number of rows
  if (data.length > options.maxRows) {
    throw new ExcelSecurityError(`Sheet contains too many rows. Maximum allowed: ${options.maxRows}`);
  }

  return data.map((row, rowIndex) => {
    if (typeof row !== 'object' || row === null) {
      return {};
    }

    const keys = Object.keys(row);

    // Limit number of columns
    if (keys.length > options.maxCols) {
      throw new ExcelSecurityError(`Row ${rowIndex} contains too many columns. Maximum allowed: ${options.maxCols}`);
    }

    const sanitizedRow: any = {};

    for (const key of keys) {
      // Sanitize key names to prevent prototype pollution
      const sanitizedKey = sanitizePropertyName(key);
      if (sanitizedKey) {
        // Sanitize values
        const value = row[key];
        sanitizedRow[sanitizedKey] = sanitizeValue(value);
      }
    }

    return sanitizedRow;
  });
};

const sanitizePropertyName = (name: string): string | null => {
  if (typeof name !== 'string') {
    return null;
  }

  // Remove dangerous property names that could cause prototype pollution
  const dangerousNames = [
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__'
  ];

  const normalizedName = name.toLowerCase().trim();

  if (dangerousNames.includes(normalizedName)) {
    return null;
  }

  // Only allow alphanumeric characters, spaces, and common punctuation
  const sanitized = name.replace(/[^\w\s\-_\.]/g, '').trim();

  // Limit length
  return sanitized.length > 0 && sanitized.length <= 100 ? sanitized : null;
};

const sanitizeValue = (value: any): any => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    // Limit string length to prevent DoS
    if (value.length > 1000) {
      return value.substring(0, 1000);
    }

    // Remove potentially dangerous characters
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  if (typeof value === 'number') {
    // Ensure finite numbers
    return isFinite(value) ? value : 0;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  // For objects, convert to string safely
  return String(value).substring(0, 1000);
};