import React, { useState } from 'react';
import {
  CheckCircle,
  Info,
  Download,
  Eye,
  Database,
  ChevronDown,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { UploadFile } from '../../hooks/use-file-upload-state';

interface Step5ResultsProps {
  files: UploadFile[];
  monthYear: string;
  requirePalmsSheets: boolean;
  onStartOver: () => void;
  onViewReport: () => void;
}

const matrices = [
  {
    id: 'referral',
    name: 'Referral Matrix',
    description: 'Member-to-member referral tracking',
  },
  {
    id: 'oto',
    name: 'One-to-One Matrix',
    description: 'One-on-one meeting tracking',
  },
  {
    id: 'combination',
    name: 'Combination Matrix',
    description: 'Combined referral and one-to-one data',
  },
  {
    id: 'tyfcb',
    name: 'TYFCB Matrix',
    description: 'Thank You For Closed Business tracking',
  },
];

export const Step5Results: React.FC<Step5ResultsProps> = ({
  files,
  monthYear,
  requirePalmsSheets,
  onStartOver,
  onViewReport,
}) => {
  const [expandedMatrix, setExpandedMatrix] = useState<string | null>(null);

  return (
    <motion.div
      key="step5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upload Results</CardTitle>
              <CardDescription>
                Your upload has been processed successfully
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onStartOver}>
              Start Over
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-green-900 dark:text-green-100">
                  Upload
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Success
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-green-900 dark:text-green-100">
                  Processing
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Complete
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-green-900 dark:text-green-100">
                  Matrices
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Generated
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <Database className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-green-900 dark:text-green-100">
                  Database
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {requirePalmsSheets ? 'Stored' : 'Not Stored'}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Summary */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{format(new Date(monthYear + '-01'), 'MMMM yyyy')}</strong>{' '}
              report has been created with {files.length} file
              {files.length !== 1 ? 's' : ''}.{' '}
              {requirePalmsSheets &&
                'Original PALMS files have been stored in the database.'}
            </AlertDescription>
          </Alert>

          {/* Matrix Previews - Collapsible */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Generated Matrices</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  alert(
                    'Download functionality to be implemented - will download all matrices as Excel'
                  );
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>

            <div className="space-y-2">
              {matrices.map((matrix) => (
                <div key={matrix.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedMatrix(
                        expandedMatrix === matrix.id ? null : matrix.id
                      )
                    }
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{matrix.name}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {matrix.description}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-muted-foreground transition-transform',
                        expandedMatrix === matrix.id && 'rotate-180'
                      )}
                    />
                  </button>
                  {expandedMatrix === matrix.id && (
                    <div className="p-4 border-t bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        Matrix preview will be displayed here. This would show the{' '}
                        {matrix.name.toLowerCase()} data in a table format.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={onViewReport}>
              <Eye className="mr-2 h-4 w-4" />
              View in Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
