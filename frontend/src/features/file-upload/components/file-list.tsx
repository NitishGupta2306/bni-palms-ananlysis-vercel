import React from 'react';
import { File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { UploadFile } from '../hooks/use-file-upload-state';

interface FileListProps {
  files: UploadFile[];
  uploadType: 'members_only' | 'palms_only' | 'both' | null;
  onRemoveFile: (index: number) => void;
  onChangeFileType: (index: number, type: 'slip_audit' | 'member_names') => void;
  onClearAll: () => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  uploadType,
  onRemoveFile,
  onChangeFileType,
  onClearAll,
}) => {
  if (files.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Selected Files ({files.length})</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-destructive hover:text-destructive"
        >
          Clear All
        </Button>
      </div>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 border rounded-lg bg-background"
          >
            <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">{file.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{file.size}</p>
                {file.extractedDate && (
                  <Badge variant="secondary" className="text-xs">
                    Auto-detected:{' '}
                    {format(new Date(file.extractedDate + '-01'), 'MMM yyyy')}
                  </Badge>
                )}
              </div>
            </div>
            {uploadType === 'both' && (
              <Select
                value={file.type}
                onValueChange={(value) =>
                  onChangeFileType(index, value as 'slip_audit' | 'member_names')
                }
              >
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slip_audit">PALMS</SelectItem>
                  <SelectItem value="member_names">Members</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              onClick={() => onRemoveFile(index)}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
