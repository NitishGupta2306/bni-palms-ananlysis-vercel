import React from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FileUploadComponent from '../../file-upload/components/file-upload-component';
import { ChapterMemberData } from "@/shared/services/chapter-data-loader";

interface DataUploadTabProps {
  selectedChapter: ChapterMemberData | null;
  chapterData: ChapterMemberData[];
  onChapterSelect: (chapterId: string) => void;
  onUploadSuccess: () => void;
}

export const DataUploadTab: React.FC<DataUploadTabProps> = ({
  selectedChapter,
  chapterData,
  onChapterSelect,
  onUploadSuccess,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Upload PALMS Data</h2>
          <p className="text-muted-foreground">
            Select a chapter and upload slip audit reports or member data files.
          </p>
        </div>
      </div>

      {/* Chapter Selection */}
      <Card className="border-l-4 border-l-primary/30">
        <CardHeader>
          <CardTitle>Select Chapter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            <Select
              value={selectedChapter?.chapterId || ''}
              onValueChange={onChapterSelect}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a chapter to upload data for..." />
              </SelectTrigger>
              <SelectContent>
                {chapterData.map((chapter) => (
                  <SelectItem key={chapter.chapterId} value={chapter.chapterId}>
                    {chapter.chapterName} ({chapter.members.length} members)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedChapter && (
              <p className="text-sm text-muted-foreground">
                Selected: <strong>{selectedChapter.chapterName}</strong> with {selectedChapter.members.length} members
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Component */}
      {selectedChapter ? (
        <FileUploadComponent
          chapterId={selectedChapter.chapterId}
          chapterName={selectedChapter.chapterName}
          onUploadSuccess={onUploadSuccess}
        />
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please select a chapter to begin uploading data.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
