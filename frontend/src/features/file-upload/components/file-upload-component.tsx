import React, { useState, useCallback } from 'react';
import {
  CloudUpload,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Loader2,
  File,
  Info,
  CalendarIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDropzone } from 'react-dropzone';
import { useApiError } from '../../../shared/hooks/useApiError';
import { API_BASE_URL } from '@/config/api';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface UploadFile {
  file: File;
  name: string;
  size: string;
  type: 'slip_audit' | 'member_names';
  extractedDate?: string;
}

interface FileUploadComponentProps {
  chapterId: string;
  chapterName: string;
  onUploadSuccess: () => void;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  chapterId,
  chapterName,
  onUploadSuccess,
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  // Initialize with current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };
  const [monthYear, setMonthYear] = useState(getCurrentMonth());
  const [uploadOption, setUploadOption] = useState<'slip_only' | 'slip_and_members'>('slip_only');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const { handleError } = useApiError();
  const [isMonthPopoverOpen, setIsMonthPopoverOpen] = useState(false);

  // Extract date from filename - supports multiple formats
  const extractDateFromFilename = (filename: string): string | undefined => {
    // Try YYYY-MM-DD format first (e.g., slips-audit-report_2025-01-28.xls)
    const patternYMD = /(\d{4})-(\d{2})-(\d{2})/;
    let match = filename.match(patternYMD);
    if (match) {
      const [, year, month] = match;
      return `${year}-${month}`;
    }

    // Try MM-DD-YYYY format (e.g., Slips_Audit_Report_08-25-2025_2-26_PM.xls)
    const patternMDY = /(\d{2})-(\d{2})-(\d{4})/;
    match = filename.match(patternMDY);
    if (match) {
      const [, month, , year] = match;
      return `${year}-${month}`;
    }

    return undefined;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      // Try to determine file type based on name
      const isSlipAudit = file.name.toLowerCase().includes('slip') ||
                         file.name.toLowerCase().includes('audit');

      // Extract date from filename if it's a slip audit file
      const extractedDate = isSlipAudit ? extractDateFromFilename(file.name) : undefined;

      // Auto-set month/year if date was extracted
      if (extractedDate && isSlipAudit) {
        setMonthYear(extractedDate);
      }

      return {
        file,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: (isSlipAudit ? 'slip_audit' : 'member_names') as 'slip_audit' | 'member_names',
        extractedDate
      };
    });

    setFiles(prev => [...prev, ...newFiles]);
    setUploadResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: true
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const changeFileType = (index: number, newType: 'slip_audit' | 'member_names') => {
    setFiles(prev => prev.map((file, i) =>
      i === index ? { ...file, type: newType } : file
    ));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadResult({type: 'error', message: 'Please select at least one file'});
      return;
    }

    const slipAuditFiles = files.filter(f => f.type === 'slip_audit');
    if (slipAuditFiles.length === 0) {
      setUploadResult({type: 'error', message: 'Please select at least one slip audit file'});
      return;
    }

    // month_year is now optional - backend will use current month as default if not provided

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();

      // Append all slip audit files
      slipAuditFiles.forEach((slipFile) => {
        formData.append('slip_audit_files', slipFile.file);
      });

      const memberNamesFile = files.find(f => f.type === 'member_names');
      if (memberNamesFile) {
        formData.append('member_names_file', memberNamesFile.file);
      }

      formData.append('chapter_id', chapterId);
      // Only send month_year if it's set
      if (monthYear) {
        formData.append('month_year', monthYear);
      }
      formData.append('upload_option', uploadOption);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for batch processing

      const response = await fetch(`${API_BASE_URL}/api/upload/excel/`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          type: 'success',
          message: `Successfully uploaded and processed ${files.length} file(s) for ${monthYear}`
        });
        setFiles([]);
        // Keep current month for next upload
        setMonthYear(getCurrentMonth());
        onUploadSuccess();
      } else {
        setUploadResult({
          type: 'error',
          message: result.error || 'Upload failed'
        });
      }
    } catch (error: any) {
      handleError(error);
      const errorMessage = error.name === 'AbortError'
        ? 'Upload timeout - the file took too long to process. Please try again or use a smaller file.'
        : error.message || 'Upload failed. Please try again.';

      setUploadResult({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Month/Year and Upload Option */}
      <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Report Month
            </label>
            <Popover open={isMonthPopoverOpen} onOpenChange={setIsMonthPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !monthYear && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {monthYear ? format(new Date(monthYear + '-01'), 'MMMM yyyy') : "Select month"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
                      const currentYear = new Date().getFullYear();
                      const monthValue = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                      return (
                        <Button
                          key={month}
                          variant={monthYear === monthValue ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setMonthYear(monthValue);
                            setIsMonthPopoverOpen(false);
                          }}
                        >
                          {month}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const currentYear = new Date().getFullYear();
                        const prevYear = currentYear - 1;
                        const currentMonth = monthYear.split('-')[1];
                        setMonthYear(`${prevYear}-${currentMonth}`);
                      }}
                    >
                      {new Date().getFullYear() - 1}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const currentYear = new Date().getFullYear();
                        const currentMonth = monthYear.split('-')[1];
                        setMonthYear(`${currentYear}-${currentMonth}`);
                      }}
                    >
                      {new Date().getFullYear()}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Upload Option</label>
            <Select value={uploadOption} onValueChange={(value) => setUploadOption(value as 'slip_only' | 'slip_and_members')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slip_only">Slip Audit Only</SelectItem>
                <SelectItem value="slip_and_members">Slip Audit + Member Names</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* File Drop Zone */}
        <Card className="border-2 border-primary/30">
          <CardContent className="p-0">
            <div
              {...getRootProps()}
              className={`
                p-12 text-center border-4 border-dashed rounded-lg cursor-pointer transition-all duration-200
                ${isDragActive
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 scale-[1.02]'
                  : 'border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10'
                }
              `}
              data-testid="file-dropzone"
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center space-y-5">
                <div className={`p-4 rounded-full ${isDragActive ? 'bg-primary/20' : 'bg-primary/10'}`}>
                  <CloudUpload className={`h-16 w-16 ${isDragActive ? 'text-primary' : 'text-primary/80'}`} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-primary">
                    {isDragActive ? 'Drop files here...' : 'Drop PALMS Files Here'}
                  </h3>
                  <p className="text-base text-muted-foreground mt-2">
                    Or click to browse and select files
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm px-4 py-1">
                  Supported formats: .xls, .xlsx
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Files */}
        {files.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <File className="h-5 w-5" />
                Selected Files ({files.length})
              </h3>
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <File className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {file.size}
                          </p>
                          {file.extractedDate && (
                            <Badge variant="secondary" className="text-xs">
                              Date: {format(new Date(file.extractedDate + '-01'), 'MMM yyyy')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select
                        value={file.type}
                        onValueChange={(value) => changeFileType(index, value as 'slip_audit' | 'member_names')}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slip_audit">Slip Audit</SelectItem>
                          <SelectItem value="member_names">Member Names</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => removeFile(index)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Button */}
        <div className="flex flex-col gap-2">
          {files.some(f => f.extractedDate) && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Date auto-detected from filename. You can override it by selecting a different month above.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-start">
            <Button
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
              size="lg"
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CloudUpload className="h-5 w-5" />
              )}
              {isUploading ? 'Uploading...' : 'Upload & Process Files'}
            </Button>
          </div>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <Alert>
            {uploadResult.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription className={uploadResult.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
              {uploadResult.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Info className="h-5 w-5" />
              Upload Instructions
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="font-medium text-primary min-w-[20px]">1.</span>
                <span>Select the month/year in YYYY-MM format (e.g., 2024-08 for August 2024)</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-primary min-w-[20px]">2.</span>
                <span>Upload report files (.xls or .xlsx files)</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-primary min-w-[20px]">3.</span>
                <span>Optionally upload member names file if you have updated member information</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-primary min-w-[20px]">4.</span>
                <span>Files will be processed automatically and matrices will be generated</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-primary min-w-[20px]">5.</span>
                <span>Use "Previous Data" tab to view processed results after upload</span>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
};

export default FileUploadComponent;