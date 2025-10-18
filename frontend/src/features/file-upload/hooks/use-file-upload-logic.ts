import { useApiError } from '../../../shared/hooks/useApiError';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/apiClient';
import { format } from 'date-fns';
import { UploadFile, UploadType, UploadResult } from './use-file-upload-state';

interface UseFileUploadLogicProps {
  files: UploadFile[];
  uploadType: UploadType;
  monthYear: string;
  requirePalmsSheets: boolean;
  chapterId: string;
  setIsUploading: (value: boolean) => void;
  setUploadProgress: (value: number) => void;
  setUploadResult: (result: UploadResult | null) => void;
  setCurrentStep: (step: number) => void;
}

export const useFileUploadLogic = ({
  files,
  uploadType,
  monthYear,
  requirePalmsSheets,
  chapterId,
  setIsUploading,
  setUploadProgress,
  setUploadResult,
  setCurrentStep,
}: UseFileUploadLogicProps) => {
  const { handleError } = useApiError();

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadResult({
        type: 'error',
        message: 'Please select at least one file',
      });
      return;
    }

    // Validate based on upload type
    const slipAuditFiles = files.filter((f) => f.type === 'slip_audit');
    const memberFiles = files.filter((f) => f.type === 'member_names');

    if (uploadType === 'palms_only' && slipAuditFiles.length === 0) {
      setUploadResult({
        type: 'error',
        message: 'Please select at least one PALMS file',
      });
      return;
    }

    if (uploadType === 'members_only' && memberFiles.length === 0) {
      setUploadResult({
        type: 'error',
        message: 'Please select at least one member names file',
      });
      return;
    }

    if (
      uploadType === 'both' &&
      (slipAuditFiles.length === 0 || memberFiles.length === 0)
    ) {
      setUploadResult({
        type: 'error',
        message: 'Please select both PALMS and member names files',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setCurrentStep(4); // Move to loading step

    try {
      const formData = new FormData();

      // Append all slip audit files
      slipAuditFiles.forEach((slipFile) => {
        formData.append('slip_audit_files', slipFile.file);
      });

      // Append member names file if exists
      if (memberFiles.length > 0) {
        formData.append('member_names_file', memberFiles[0].file);
      }

      formData.append('chapter_id', chapterId);
      formData.append('month_year', monthYear);
      formData.append('require_palms_sheets', requirePalmsSheets.toString());

      // Determine upload option based on upload type
      const uploadOption =
        uploadType === 'members_only'
          ? 'members_only'
          : uploadType === 'both'
            ? 'slip_and_members'
            : 'slip_only';
      formData.append('upload_option', uploadOption);

      // Use XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(Math.min(percentComplete, 95)); // Cap at 95% until processing is done
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            try {
              const result = JSON.parse(xhr.responseText);
              setUploadResult({
                type: 'success',
                message: `Successfully uploaded and processed ${files.length} file(s) for ${format(new Date(monthYear + '-01'), 'MMMM yyyy')}`,
                reportId: result.report_id,
              });

              // Move to results step instead of resetting
              setCurrentStep(5);
              resolve();
            } catch (error) {
              reject(new Error('Failed to parse server response'));
            }
          } else {
            try {
              const result = JSON.parse(xhr.responseText);
              setUploadResult({
                type: 'error',
                message: result.error || 'Upload failed',
              });
            } catch {
              setUploadResult({
                type: 'error',
                message: `Upload failed with status ${xhr.status}`,
              });
            }
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          setUploadResult({
            type: 'error',
            message: 'Upload failed. Please check your connection and try again.',
          });
          reject(new Error('Network error'));
        });

        // Handle timeout
        xhr.addEventListener('timeout', () => {
          setUploadResult({
            type: 'error',
            message:
              'Upload timeout - the file took too long to process. Please try again.',
          });
          reject(new Error('Upload timeout'));
        });

        // Set timeout (2 minutes)
        xhr.timeout = 120000;

        // Send request
        xhr.open('POST', `${API_BASE_URL}/api/upload/excel/`);

        // Add authentication header
        const token = getAuthToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData);
      });
    } catch (error: any) {
      handleError(error);
      setUploadResult({
        type: 'error',
        message: error.message || 'Upload failed. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return { handleUpload };
};
