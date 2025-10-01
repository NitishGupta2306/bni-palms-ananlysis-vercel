import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { MonthlyReport } from '../../../shared/services/ChapterDataLoader';

interface MatrixSelectorProps {
  monthlyReports: MonthlyReport[];
  selectedReport: MonthlyReport | null;
  onReportChange: (reportId: string) => void;
  onDownloadExcel: () => void;
}

export const MatrixSelector: React.FC<MatrixSelectorProps> = ({
  monthlyReports,
  selectedReport,
  onReportChange,
  onDownloadExcel,
}) => {
  if (monthlyReports.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="w-full sm:w-80">
        <Select value={selectedReport?.id?.toString() || ''} onValueChange={onReportChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select Monthly Report" />
          </SelectTrigger>
          <SelectContent>
            {monthlyReports.map((report) => (
              <SelectItem key={report.id} value={report.id.toString()}>
                <div className="flex justify-between items-center w-full">
                  <span>{report.month_year}</span>
                  <div className="flex gap-1 ml-4">
                    {report.has_referral_matrix && <Badge variant="secondary">Ref</Badge>}
                    {report.has_oto_matrix && <Badge variant="secondary">OTO</Badge>}
                    {report.has_combination_matrix && <Badge variant="secondary">Combo</Badge>}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedReport && (
        <Button
          onClick={onDownloadExcel}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download All Matrices
        </Button>
      )}
    </div>
  );
};
