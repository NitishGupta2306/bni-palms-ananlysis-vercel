import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

interface MatrixExportButtonProps {
  chapterId: string;
  chapterName: string;
  reportId: number;
  monthYear: string;
}

export const MatrixExportButton: React.FC<MatrixExportButtonProps> = ({
  chapterId,
  chapterName,
  reportId,
  monthYear,
}) => {
  const handleDownloadExcel = async () => {
    try {
      // Fetch the Excel file from the API
      const response = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/reports/${reportId}/download-matrices/`);

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${chapterName.replace(/ /g, '_')}_Matrices_${monthYear}.xlsx`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download Excel file:', error);
      alert('Failed to download Excel file. Please try again.');
    }
  };

  return (
    <Button onClick={handleDownloadExcel} className="flex items-center gap-2">
      <Download className="h-4 w-4" />
      Download All Matrices
    </Button>
  );
};
