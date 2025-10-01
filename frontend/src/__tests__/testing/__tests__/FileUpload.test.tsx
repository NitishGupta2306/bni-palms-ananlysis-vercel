import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test-utils/server';
import FileUploadComponent from '@/components/FileUploadComponent';

const createMockFile = (name: string, type: string, size = 1024) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('File Upload Integration', () => {
  const mockProps = {
    chapterId: '1',
    chapterName: 'Test Chapter',
    onUploadSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Selection', () => {
    it('accepts valid Excel files via drag and drop', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText('test.xlsx')).toBeInTheDocument();
        expect(screen.getByText(/0.00 MB/)).toBeInTheDocument();
      });
    });

    it('accepts multiple files in slip_and_members mode', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      // Change to slip_and_members mode
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

    it('shows file size information', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      const largeFile = createMockFile('large.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 5 * 1024 * 1024);
      const dropzone = screen.getByTestId('file-dropzone');

      await user.upload(dropzone, largeFile);

      await waitFor(() => {
        expect(screen.getByText('5.00 MB')).toBeInTheDocument();
      });
    });
  });

  describe('File Upload Process', () => {
    it('uploads file successfully and shows success message', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      // Add a file
      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');
      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText('test.xlsx')).toBeInTheDocument();
      });

      // Click upload button
      const uploadButton = screen.getByText(/upload & process files/i);
      await user.click(uploadButton);

      // Should show uploading state
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      expect(uploadButton).toBeDisabled();

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/successfully uploaded and processed/i)).toBeInTheDocument();
        expect(mockProps.onUploadSuccess).toHaveBeenCalled();
      }, { timeout: 5000 });

      // Files should be cleared after successful upload
      await waitFor(() => {
        expect(screen.queryByText('test.xlsx')).not.toBeInTheDocument();
      });
    });

    it('handles upload progress and loading states', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');
      await user.upload(dropzone, file);

      const uploadButton = screen.getByText(/upload & process files/i);

      // Mock delayed response
      server.use(
        http.post('/api/chapters/:id/upload/', async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return HttpResponse.json({
            success: true,
            message: 'Upload successful',
            recordsCreated: 25,
          });
        })
      );

      await user.click(uploadButton);

      // Should show loading state immediately
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      expect(uploadButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument();
        expect(screen.getByText(/successfully uploaded/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Error Handling', () => {
    it('displays server error messages', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      // Mock server error
      server.use(
        http.post('/api/chapters/:id/upload/', () => {
          return HttpResponse.json(
            {
              error: 'Invalid file format. Please upload an Excel file.',
              code: 'INVALID_FILE_FORMAT'
            },
            { status: 400 }
          );
        })
      );

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');
      await user.upload(dropzone, file);

      const uploadButton = screen.getByText(/upload & process files/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid file format/i)).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      // Mock network error
      server.use(
        http.post('/api/chapters/:id/upload/', () => {
          return HttpResponse.error();
        })
      );

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');
      await user.upload(dropzone, file);

      const uploadButton = screen.getByText(/upload & process files/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload failed. please try again/i)).toBeInTheDocument();
      });
    });

    it('handles file size limits', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      // Mock file too large error
      server.use(
        http.post('/api/chapters/:id/upload/', () => {
          return HttpResponse.json(
            {
              error: 'File too large. Maximum size is 10MB.',
              code: 'FILE_TOO_LARGE'
            },
            { status: 413 }
          );
        })
      );

      const largeFile = createMockFile('huge.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 15 * 1024 * 1024);
      const dropzone = screen.getByTestId('file-dropzone');
      await user.upload(dropzone, largeFile);

      const uploadButton = screen.getByText(/upload & process files/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });
    });

    it('shows validation errors for missing fields', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      // Try to upload without selecting files
      const uploadButton = screen.getByText(/upload & process files/i);

      // Button should be disabled when no files are selected
      expect(uploadButton).toBeDisabled();
    });
  });

  describe('File Management', () => {
    it('allows removing individual files', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      const file = createMockFile('remove-me.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');
      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(screen.getByText('remove-me.xlsx')).toBeInTheDocument();
      });

      // Find and click remove button
      const removeButton = screen.getByRole('button', { name: /remove file|delete/i });
      await user.click(removeButton);

      expect(screen.queryByText('remove-me.xlsx')).not.toBeInTheDocument();
    });

    it('updates upload button state based on file selection', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      const uploadButton = screen.getByText(/upload & process files/i);

      // Initially disabled
      expect(uploadButton).toBeDisabled();

      // Add file
      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');
      await user.upload(dropzone, file);

      await waitFor(() => {
        expect(uploadButton).not.toBeDisabled();
      });

      // Remove file
      const removeButton = screen.getByRole('button', { name: /remove file|delete/i });
      await user.click(removeButton);

      expect(uploadButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('validates month/year input', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      // Clear month input
      const monthInput = screen.getByLabelText(/report month/i);
      await user.clear(monthInput);

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');
      await user.upload(dropzone, file);

      const uploadButton = screen.getByText(/upload & process files/i);

      // Button should be disabled when month is empty
      expect(uploadButton).toBeDisabled();
    });

    it('requires at least one slip audit file', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      // Change to slip_and_members mode
      const uploadSelect = screen.getByRole('combobox', { name: /upload option/i });
      await user.click(uploadSelect);
      await user.click(screen.getByText('Slip Audit + Member Names'));

      // Add only member names file
      const memberFile = createMockFile('members.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');
      await user.upload(dropzone, memberFile);

      // Change file type to member names
      const typeSelect = screen.getByRole('combobox', { name: /member names/i });
      await user.click(typeSelect);
      await user.click(screen.getByText('Member Names'));

      const uploadButton = screen.getByText(/upload & process files/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/please select at least one slip audit file/i)).toBeInTheDocument();
      });
    });
  });

  describe('Upload Options', () => {
    it('switches between upload modes correctly', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      // Default should be slip_only
      expect(screen.getByText('Slip Audit Only')).toBeInTheDocument();

      // Change to slip_and_members
      const uploadSelect = screen.getByRole('combobox', { name: /upload option/i });
      await user.click(uploadSelect);
      await user.click(screen.getByText('Slip Audit + Member Names'));

      expect(screen.getByText('Slip Audit + Member Names')).toBeInTheDocument();
    });

    it('sends correct parameters to server', async () => {
      const user = userEvent.setup();
      render(<FileUploadComponent {...mockProps} />);

      let requestData: FormData | null = null;

      // Capture request data
      server.use(
        http.post('/api/chapters/:id/upload/', async ({ request }) => {
          requestData = await request.formData();
          return HttpResponse.json({
            success: true,
            message: 'Upload successful',
            recordsCreated: 25,
          });
        })
      );

      const file = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const dropzone = screen.getByTestId('file-dropzone');
      await user.upload(dropzone, file);

      const uploadButton = screen.getByText(/upload & process files/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(requestData).not.toBeNull();
      });

      // Verify form data contains expected fields
      expect(requestData?.has('slip_audit_file')).toBe(true);
      expect(requestData?.get('chapter_id')).toBe('1');
      expect(requestData?.get('upload_option')).toBe('slip_only');
      expect(requestData?.has('month_year')).toBe(true);
    });
  });
});