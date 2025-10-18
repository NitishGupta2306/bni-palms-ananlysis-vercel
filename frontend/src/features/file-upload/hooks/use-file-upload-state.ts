import { useState } from 'react';

export type UploadType = 'members_only' | 'palms_only' | 'both' | null;

export interface UploadFile {
  file: File;
  name: string;
  size: string;
  type: 'slip_audit' | 'member_names';
  extractedDate?: string;
}

export interface UploadResult {
  type: 'success' | 'error';
  message: string;
  reportId?: number;
}

export const useFileUploadState = () => {
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [uploadType, setUploadType] = useState<UploadType>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [monthYear, setMonthYear] = useState(getCurrentMonth());
  const [requirePalmsSheets, setRequirePalmsSheets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [expandedMatrix, setExpandedMatrix] = useState<string | null>(null);

  const handleStartOver = () => {
    setCurrentStep(1);
    setUploadType(null);
    setFiles([]);
    setMonthYear(getCurrentMonth());
    setRequirePalmsSheets(false);
    setUploadProgress(0);
    setUploadResult(null);
  };

  const handleBack = () => {
    if (currentStep === 1) return;
    if (currentStep === 4 && uploadResult?.type === 'success') return;
    setCurrentStep(currentStep - 1);
  };

  return {
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
    expandedMatrix,
    setExpandedMatrix,
    handleStartOver,
    handleBack,
    getCurrentMonth,
  };
};
