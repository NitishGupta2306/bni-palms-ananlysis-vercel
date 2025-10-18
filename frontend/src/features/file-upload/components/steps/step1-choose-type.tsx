import React from 'react';
import { Users, FileText, FolderUp, CheckCircle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UploadType } from '../../hooks/use-file-upload-state';

interface Step1ChooseTypeProps {
  uploadType: UploadType;
  onUploadTypeChange: (type: UploadType) => void;
  onContinue: () => void;
}

export const Step1ChooseType: React.FC<Step1ChooseTypeProps> = ({
  uploadType,
  onUploadTypeChange,
  onContinue,
}) => {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Choose Upload Type</CardTitle>
          <CardDescription className="text-xs">
            What would you like to upload?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Update Members Only */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'p-4 border-2 rounded-lg cursor-pointer transition-all',
                uploadType === 'members_only'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => onUploadTypeChange('members_only')}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div
                  className={cn(
                    'p-3 rounded-full',
                    uploadType === 'members_only' ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Update Members</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload member names file to update member list
                  </p>
                </div>
                {uploadType === 'members_only' && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
            </motion.div>

            {/* Upload PALMS Only */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'p-6 border-2 rounded-lg cursor-pointer transition-all',
                uploadType === 'palms_only'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => onUploadTypeChange('palms_only')}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div
                  className={cn(
                    'p-3 rounded-full',
                    uploadType === 'palms_only' ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Upload PALMS</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload slip audit report to generate matrices
                  </p>
                </div>
                {uploadType === 'palms_only' && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
            </motion.div>

            {/* Upload Both */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'p-6 border-2 rounded-lg cursor-pointer transition-all',
                uploadType === 'both'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => onUploadTypeChange('both')}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div
                  className={cn(
                    'p-3 rounded-full',
                    uploadType === 'both' ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
                  <FolderUp className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Upload Both</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload both PALMS and member names files
                  </p>
                </div>
                {uploadType === 'both' && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {uploadType && (
        <div className="flex justify-end">
          <Button onClick={onContinue}>
            Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};
