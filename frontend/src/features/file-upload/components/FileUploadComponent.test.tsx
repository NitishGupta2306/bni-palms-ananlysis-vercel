import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import FileUploadComponent from './file-upload-component';

expect.extend(toHaveNoViolations);

// Mock the security validation utility
jest.mock('../utils/excelSecurity', () => ({
  validateExcelFile: jest.fn().mockResolvedValue({ isValid: true }),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockProps = {
  chapterId: 'test-chapter-1',
  chapterName: 'Test Chapter',
  onUploadSuccess: jest.fn(),
};

const createMockFile = (name: string, type: string, size = 1024) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const renderFileUploadComponent = (props = {}) => {
  return render(<FileUploadComponent {...mockProps} {...props} />);
};

describe('FileUploadComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Upload successful' }),
    });
  });

  describe('Initial State', () => {
    it('renders with initial state correctly', () => {
      renderFileUploadComponent();

      expect(screen.getByText('Upload Data Files')).toBeInTheDocument();
      expect(screen.getByText('Upload Excel files for Test Chapter')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /month/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /upload option/i })).toBeInTheDocument();
    });

    it('sets current month as default', () => {
      renderFileUploadComponent();

      const monthInput = screen.getByDisplayValue(/\d{4}-\d{2}/);
      const currentDate = new Date();
      const expectedMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      expect(monthInput).toHaveValue(expectedMonth);
    });

    it('sets default upload option to slip_only', () => {
      renderFileUploadComponent();

      expect(screen.getByText('Slip Audit Only')).toBeInTheDocument();
    });
  });

  describe('File Upload - Drag and Drop', () => {
    it('accepts Excel files via drag and drop', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText('test.xlsx')).toBeInTheDocument();
      });
    });

    it('shows file details when file is dropped', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const file = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 2048);
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText('data.xlsx')).toBeInTheDocument();
        expect(screen.getByText('2.00 KB')).toBeInTheDocument();
      });
    });

    it('rejects non-Excel files', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const file = createMockFile('test.txt', 'text/plain');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText(/only excel files are allowed/i)).toBeInTheDocument();
      });
    });

    it('allows multiple file types when slip_and_members is selected', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      // Change to slip_and_members option
      const uploadSelect = screen.getByRole('combobox', { name: /upload option/i });
      await user.click(uploadSelect);
      await user.click(screen.getByText('Slip Audit + Member Names'));

      const file1 = createMockFile('slip.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const file2 = createMockFile('members.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, [file1, file2]);

      await waitFor(() => {
        expect(screen.getByText('slip.xlsx')).toBeInTheDocument();
        expect(screen.getByText('members.xlsx')).toBeInTheDocument();
      });
    });
  });

  describe('File Upload - Input Field', () => {
    it('accepts files through file input', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const file = createMockFile('upload.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const input = screen.getByLabelText(/choose excel files/i);

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('upload.xlsx')).toBeInTheDocument();
      });
    });
  });

  describe('File Management', () => {
    it('allows removing individual files', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const file = createMockFile('remove-me.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText('remove-me.xlsx')).toBeInTheDocument();
      });

      const removeButton = screen.getByTestId('remove-file-0');
      await user.click(removeButton);

      expect(screen.queryByText('remove-me.xlsx')).not.toBeInTheDocument();
    });

    it('allows clearing all files', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const files = [
        createMockFile('file1.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        createMockFile('file2.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      ];
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, files);

      await waitFor(() => {
        expect(screen.getByText('file1.xlsx')).toBeInTheDocument();
        expect(screen.getByText('file2.xlsx')).toBeInTheDocument();
      });

      const clearButton = screen.getByText(/clear all files/i);
      await user.click(clearButton);

      expect(screen.queryByText('file1.xlsx')).not.toBeInTheDocument();
      expect(screen.queryByText('file2.xlsx')).not.toBeInTheDocument();
    });
  });

  describe('File Type Assignment', () => {
    it('assigns slip_audit type to single files in slip_only mode', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const file = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText('Slip Audit')).toBeInTheDocument();
      });
    });

    it('allows changing file types in slip_and_members mode', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      // Change to slip_and_members mode
      const uploadSelect = screen.getByRole('combobox', { name: /upload option/i });
      await user.click(uploadSelect);
      await user.click(screen.getByText('Slip Audit + Member Names'));

      const file = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        const typeSelect = screen.getByTestId('file-type-select-0');
        expect(typeSelect).toBeInTheDocument();
      });

      const typeSelect = screen.getByTestId('file-type-select-0');
      await user.click(typeSelect);
      await user.click(screen.getByText('Member Names'));

      await waitFor(() => {
        expect(screen.getByText('Member Names')).toBeInTheDocument();
      });
    });
  });

  describe('Upload Process', () => {
    it('shows upload progress during file upload', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText('test.xlsx')).toBeInTheDocument();
      });

      // Mock a delayed fetch response
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, message: 'Upload successful' }),
        }), 100))
      );

      const uploadButton = screen.getByText(/upload files/i);
      await user.click(uploadButton);

      expect(screen.getByText(/uploading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument();
      });
    });

    it('shows success message after successful upload', async () => {
      const user = userEvent.setup();
      const mockOnUploadSuccess = jest.fn();
      renderFileUploadComponent({ onUploadSuccess: mockOnUploadSuccess });

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText('test.xlsx')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText(/upload files/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      });
    });

    it('shows error message on upload failure', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Upload failed' }),
      });

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText('test.xlsx')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText(/upload files/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('disables upload button when no files are selected', () => {
      renderFileUploadComponent();

      const uploadButton = screen.getByText(/upload files/i);
      expect(uploadButton).toBeDisabled();
    });

    it('enables upload button when files are selected', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        const uploadButton = screen.getByText(/upload files/i);
        expect(uploadButton).not.toBeDisabled();
      });
    });

    it('validates month/year input', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const monthInput = screen.getByRole('textbox', { name: /month/i });
      await user.clear(monthInput);
      await user.type(monthInput, 'invalid');

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      const uploadButton = screen.getByText(/upload files/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid month/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = renderFileUploadComponent();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels and roles', () => {
      renderFileUploadComponent();

      expect(screen.getByLabelText(/choose excel files/i)).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /month/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /upload option/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderFileUploadComponent();

      const fileInput = screen.getByLabelText(/choose excel files/i);
      const monthInput = screen.getByRole('textbox', { name: /month/i });
      const uploadSelect = screen.getByRole('combobox', { name: /upload option/i });

      expect(fileInput).toHaveAttribute('tabIndex', '0');
      expect(monthInput).toHaveAttribute('tabIndex', '0');
      expect(uploadSelect).toHaveAccessibleName();
    });
  });

  describe('Security Features', () => {
    it('validates Excel files for security', async () => {
      const { validateExcelFile } = require('../utils/excelSecurity');
      const user = userEvent.setup();
      renderFileUploadComponent();

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(validateExcelFile).toHaveBeenCalledWith(file);
      });
    });

    it('handles security validation errors', async () => {
      const { validateExcelFile } = require('../utils/excelSecurity');
      validateExcelFile.mockResolvedValueOnce({ isValid: false, error: 'Potentially malicious file' });

      const user = userEvent.setup();
      renderFileUploadComponent();

      const file = createMockFile('malicious.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText(/potentially malicious file/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Size Limits', () => {
    it('shows file size information', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const largeFile = createMockFile('large.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 5 * 1024 * 1024); // 5MB
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, largeFile);

      await waitFor(() => {
        expect(screen.getByText('5.00 MB')).toBeInTheDocument();
      });
    });

    it('warns about large files', async () => {
      const user = userEvent.setup();
      renderFileUploadComponent();

      const veryLargeFile = createMockFile('huge.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 40 * 1024 * 1024); // 40MB
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, veryLargeFile);

      await waitFor(() => {
        expect(screen.getByText(/file is quite large/i)).toBeInTheDocument();
      });
    });
  });
});