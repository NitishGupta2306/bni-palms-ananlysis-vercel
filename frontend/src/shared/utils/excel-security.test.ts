import {
  validateExcelFile,
  sanitizeSheetData,
  ExcelSecurityError,
  DEFAULT_VALIDATION_OPTIONS
} from '../../features/file-upload/utils/excel-security';

describe('Excel Security Utils', () => {
  describe('validateExcelFile', () => {
    it('accepts valid Excel files', () => {
      const validFile = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      expect(() => validateExcelFile(validFile)).not.toThrow();
    });

    it('rejects files that are too large', () => {
      const largeContent = 'x'.repeat(51 * 1024 * 1024); // 51MB (exceeds 50MB limit)
      const largeFile = new File([largeContent], 'large.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      expect(() => validateExcelFile(largeFile)).toThrow(ExcelSecurityError);
      expect(() => validateExcelFile(largeFile)).toThrow(/File size exceeds maximum/);
    });

    it('rejects files with invalid extensions', () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      expect(() => validateExcelFile(invalidFile)).toThrow(ExcelSecurityError);
      expect(() => validateExcelFile(invalidFile)).toThrow(/File extension not allowed/);
    });

    it('accepts files with allowed extensions', () => {
      const xlsFile = new File(['test'], 'test.xls', {
        type: 'application/vnd.ms-excel'
      });
      const xlsxFile = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      expect(() => validateExcelFile(xlsFile)).not.toThrow();
      expect(() => validateExcelFile(xlsxFile)).not.toThrow();
    });

    it('handles case-insensitive extensions', () => {
      const upperCaseFile = new File(['test'], 'TEST.XLSX', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      expect(() => validateExcelFile(upperCaseFile)).not.toThrow();
    });
  });

  describe('sanitizeSheetData', () => {
    it('sanitizes normal data correctly', () => {
      const input = [
        { 'First Name': 'John', 'Last Name': 'Doe', 'Age': 30 },
        { 'First Name': 'Jane', 'Last Name': 'Smith', 'Age': 25 }
      ];

      const result = sanitizeSheetData(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        'First Name': 'John',
        'Last Name': 'Doe',
        'Age': 30
      });
    });

    it('removes dangerous property names', () => {
      const input = [
        {
          'First Name': 'John',
          '__proto__': 'malicious',
          'constructor': 'evil',
          'prototype': 'bad',
          'Last Name': 'Doe'
        }
      ];

      const result = sanitizeSheetData(input);

      expect(result[0]).toEqual({
        'First Name': 'John',
        'Last Name': 'Doe'
      });

      // Check that the dangerous values were not set
      expect(Object.hasOwnProperty.call(result[0], '__proto__')).toBe(false);
      expect(Object.hasOwnProperty.call(result[0], 'constructor')).toBe(false);
      expect(Object.hasOwnProperty.call(result[0], 'prototype')).toBe(false);
    });

    it('truncates long string values', () => {
      const longString = 'x'.repeat(1500);
      const input = [
        { 'Name': longString }
      ];

      const result = sanitizeSheetData(input);

      expect(result[0].Name).toHaveLength(1000);
      expect(result[0].Name).toBe('x'.repeat(1000));
    });

    it('handles null and undefined values', () => {
      const input = [
        { 'Name': null, 'Age': undefined, 'City': 'NYC' }
      ];

      const result = sanitizeSheetData(input);

      expect(result[0]).toEqual({
        'Name': '',
        'Age': '',
        'City': 'NYC'
      });
    });

    it('sanitizes property names with special characters', () => {
      const input = [
        { 'Name!@#$%^&*()': 'John', 'Age<script>': 30 }
      ];

      const result = sanitizeSheetData(input);

      expect(result[0]).toHaveProperty('Name');
      expect(result[0]).toHaveProperty('Agescript');
      expect(result[0].Name).toBe('John');
      expect(result[0].Agescript).toBe(30);
    });

    it('rejects data with too many rows', () => {
      const manyRows = Array.from({ length: 10001 }, (_, i) => ({ id: i }));

      expect(() => sanitizeSheetData(manyRows)).toThrow(ExcelSecurityError);
      expect(() => sanitizeSheetData(manyRows)).toThrow(/too many rows/);
    });

    it('rejects rows with too many columns', () => {
      const manyColumns: { [key: string]: string } = {};
      for (let i = 0; i < 101; i++) {
        manyColumns[`col${i}`] = `value${i}`;
      }

      expect(() => sanitizeSheetData([manyColumns])).toThrow(ExcelSecurityError);
      expect(() => sanitizeSheetData([manyColumns])).toThrow(/too many columns/);
    });

    it('handles finite numbers correctly', () => {
      const input = [
        { 'Normal': 42, 'Infinity': Infinity, 'NaN': NaN, 'Negative': -Infinity }
      ];

      const result = sanitizeSheetData(input);

      expect(result[0]).toEqual({
        'Normal': 42,
        'Infinity': 0,
        'NaN': 0,
        'Negative': 0
      });
    });

    it('removes control characters from strings', () => {
      const input = [
        { 'Name': 'John\x00\x01\x1F\x7FDoe' }
      ];

      const result = sanitizeSheetData(input);

      expect(result[0].Name).toBe('JohnDoe');
    });

    it('handles boolean values correctly', () => {
      const input = [
        { 'Active': true, 'Deleted': false }
      ];

      const result = sanitizeSheetData(input);

      expect(result[0]).toEqual({
        'Active': true,
        'Deleted': false
      });
    });

    it('converts objects to strings safely', () => {
      const input = [
        { 'Data': { nested: 'object' }, 'Array': [1, 2, 3] }
      ];

      const result = sanitizeSheetData(input);

      expect(typeof result[0].Data).toBe('string');
      expect(typeof result[0].Array).toBe('string');
      expect(result[0].Data).toContain('object');
    });
  });

  describe('ExcelSecurityError', () => {
    it('creates proper error instances', () => {
      const error = new ExcelSecurityError('Test message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ExcelSecurityError);
      expect(error.name).toBe('ExcelSecurityError');
      expect(error.message).toBe('Test message');
    });
  });
});