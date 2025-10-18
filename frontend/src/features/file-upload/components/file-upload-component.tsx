import React, { useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence } from 'framer-motion';
import { useFileUploadState } from '../hooks/use-file-upload-state';
import { useFileUploadLogic } from '../hooks/use-file-upload-logic';
import { extractDateFromFilename } from '../utils/date-extractor';
import { StepProgress } from './step-progress';
import { Step1ChooseType } from './steps/step1-choose-type';
import { Step2SelectMonth } from './steps/step2-select-month';
import { Step3UploadFiles } from './steps/step3-upload-files';
import { Step4Processing } from './steps/step4-processing';
import { Step5Results } from './steps/step5-results';

interface FileUploadComponentProps {
  chapterId: string;
  chapterName: string;
  onUploadSuccess: () => void;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  chapterId,
  onUploadSuccess,
}) => {
  const {
    currentStep,
    setCurrentStep,
    uploadType,
    setUploadType,
    files,
    setFiles,
    monthYear,
    setMonthYear,
    requirePalmsSheets,
    setRequirePalmsSheets,
    isUploading,
    setIsUploading,
    uploadProgress,
    setUploadProgress,
    uploadResult,
    setUploadResult,
    handleStartOver,
    handleBack,
  } = useFileUploadState();

  const { handleUpload } = useFileUploadLogic({
    files,
    uploadType,
    monthYear,
    requirePalmsSheets,
    chapterId,
    setIsUploading,
    setUploadProgress,
    setUploadResult,
    setCurrentStep,
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => {
        // Determine file type based on upload type and filename
        let fileType: 'slip_audit' | 'member_names' = 'slip_audit';

        if (uploadType === 'members_only') {
          fileType = 'member_names';
        } else if (uploadType === 'both') {
          // Try to detect based on filename
          const isMemberNames =
            file.name.toLowerCase().includes('member') ||
            file.name.toLowerCase().includes('names');
          fileType = isMemberNames ? 'member_names' : 'slip_audit';
        }

        // Extract date from filename if it's a slip audit file
        const extractedDate =
          fileType === 'slip_audit'
            ? extractDateFromFilename(file.name)
            : undefined;

        // Auto-set month/year if date was extracted
        if (extractedDate && fileType === 'slip_audit') {
          setMonthYear(extractedDate);
        }

        return {
          file,
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          type: fileType,
          extractedDate,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);
      setUploadResult(null);
    },
    [uploadType, setFiles, setMonthYear, setUploadResult]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const changeFileType = (
    index: number,
    newType: 'slip_audit' | 'member_names'
  ) => {
    setFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, type: newType } : file))
    );
  };

  const canProceedFromStep2 = () => {
    return monthYear !== '';
  };

  const canProceedFromStep3 = () => {
    if (files.length === 0) return false;

    const slipFiles = files.filter((f) => f.type === 'slip_audit');
    const memberFiles = files.filter((f) => f.type === 'member_names');

    if (uploadType === 'palms_only') return slipFiles.length > 0;
    if (uploadType === 'members_only') return memberFiles.length > 0;
    if (uploadType === 'both')
      return slipFiles.length > 0 && memberFiles.length > 0;

    return false;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Upload Wizard</h2>
          <p className="text-xs text-muted-foreground">
            Upload and process reports in a few simple steps
          </p>
        </div>
        {currentStep > 1 && currentStep < 4 && (
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
      </div>

      {/* Step Progress Indicators */}
      <StepProgress currentStep={currentStep} />

      <AnimatePresence mode="wait">
        {/* Step 1: Choose Upload Type */}
        {currentStep === 1 && (
          <Step1ChooseType
            uploadType={uploadType}
            onUploadTypeChange={setUploadType}
            onContinue={() => setCurrentStep(2)}
          />
        )}

        {/* Step 2: Select Month */}
        {currentStep === 2 && (
          <Step2SelectMonth
            monthYear={monthYear}
            requirePalmsSheets={requirePalmsSheets}
            onMonthYearChange={setMonthYear}
            onRequirePalmsSheetsChange={setRequirePalmsSheets}
            onContinue={() => setCurrentStep(3)}
            canProceed={canProceedFromStep2()}
          />
        )}

        {/* Step 3: Upload Files */}
        {currentStep === 3 && (
          <Step3UploadFiles
            files={files}
            uploadType={uploadType}
            isDragActive={isDragActive}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            onRemoveFile={removeFile}
            onChangeFileType={changeFileType}
            onClearFiles={() => setFiles([])}
            onUpload={handleUpload}
            canProceed={canProceedFromStep3()}
          />
        )}

        {/* Step 4: Loading & Confirmation */}
        {currentStep === 4 && (
          <Step4Processing
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadResult={uploadResult}
            onStartOver={handleStartOver}
            onTryAgain={() => setCurrentStep(3)}
          />
        )}

        {/* Step 5: Results */}
        {currentStep === 5 && (
          <Step5Results
            files={files}
            monthYear={monthYear}
            requirePalmsSheets={requirePalmsSheets}
            onStartOver={handleStartOver}
            onViewReport={onUploadSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadComponent;
