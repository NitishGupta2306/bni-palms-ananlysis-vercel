import React, { useState } from 'react';
import { Info, CheckCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UploadResult } from '../types/admin.types';
import { API_BASE_URL } from '@/config/api';
import { useInvalidateChapterData } from '@/shared/hooks/useChapterData';

interface BulkUploadTabProps {
  onDataRefresh: () => void;
}

export const BulkUploadTab: React.FC<BulkUploadTabProps> = ({ onDataRefresh }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<UploadResult | null>(null);
  const invalidateChapterData = useInvalidateChapterData();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/upload/bulk/`, {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type');

      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 500));
        throw new Error('Server returned non-JSON response');
      }

      if (response.ok) {
        const details = result.details || result;
        setUploadResult({
          success: true,
          message: `Successfully processed! Created ${details.chapters_created || 0} chapters and ${details.members_created || 0} members.`,
          details: result.details || result,
        });

        // Invalidate React Query cache to force refetch
        await invalidateChapterData();

        // Delay refresh callback to allow user to see the success message
        setTimeout(() => {
          onDataRefresh();
        }, 1500);
      } else {
        setUploadResult({
          success: false,
          message: result.message || result.error || 'Upload failed',
          details: result,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleReset = async () => {
    const confirmText = 'DELETE ALL DATA';
    const userInput = window.prompt(
      `⚠️ WARNING: This will permanently delete ALL data from the database!\n\n` +
      `This includes:\n` +
      `- All chapters\n` +
      `- All members\n` +
      `- All reports\n` +
      `- All analytics (referrals, one-to-ones, TYFCB)\n\n` +
      `Type "${confirmText}" to confirm:`
    );

    if (userInput !== confirmText) {
      if (userInput !== null) {
        alert('Reset cancelled. Confirmation text did not match.');
      }
      return;
    }

    setIsResetting(true);
    setResetResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload/reset-all/`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setResetResult({
          success: true,
          message: result.message,
          details: result.deleted,
        });

        // Invalidate React Query cache to force refetch
        await invalidateChapterData();

        // Refresh data after successful reset
        setTimeout(() => {
          onDataRefresh();
        }, 1500);
      } else {
        setResetResult({
          success: false,
          message: result.error || 'Reset failed',
        });
      }
    } catch (error) {
      console.error('Reset error:', error);
      setResetResult({
        success: false,
        message: `Reset error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Bulk Operations</h2>
          <p className="text-muted-foreground">
            Upload a Regional PALMS Summary report to bulk create/update chapters and members.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regional PALMS Summary Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Upload a Regional PALMS Summary report (.xls file). The system will automatically:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Create new chapters found in the report</li>
                <li>Create new members for each chapter</li>
                <li>Update existing chapter and member information</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="flex-1"
            />
            {isUploading && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>

          {uploadResult && (
            <Alert variant={uploadResult.success ? 'default' : 'destructive'}>
              {uploadResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                {uploadResult.message}
                {uploadResult.details && uploadResult.success && (
                  <div className="mt-2 text-sm space-y-1">
                    <div>Chapters created: {uploadResult.details.chapters_created || 0}</div>
                    <div>Chapters updated: {uploadResult.details.chapters_updated || 0}</div>
                    <div>Members created: {uploadResult.details.members_created || 0}</div>
                    <div>Members updated: {uploadResult.details.members_updated || 0}</div>
                    <div>Total processed: {uploadResult.details.total_processed || 0} rows</div>
                    {uploadResult.details.warnings && uploadResult.details.warnings.length > 0 && (
                      <div className="mt-2">
                        <div className="font-medium">Warnings ({uploadResult.details.warnings.length}):</div>
                        <div className="text-xs text-muted-foreground">Some rows were skipped due to missing data</div>
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Reset Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone: Reset Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription>
              <strong className="text-destructive">Warning:</strong> This action will permanently delete ALL data from the database, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All chapters and their settings</li>
                <li>All members</li>
                <li>All monthly reports</li>
                <li>All analytics data (referrals, one-to-ones, TYFCB)</li>
              </ul>
              <div className="mt-3 font-semibold">This action cannot be undone!</div>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleReset}
            disabled={isResetting || isUploading}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Reset All Data
              </>
            )}
          </Button>

          {resetResult && (
            <Alert variant={resetResult.success ? 'default' : 'destructive'}>
              {resetResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                {resetResult.message}
                {resetResult.details && resetResult.success && (
                  <div className="mt-2 text-sm space-y-1">
                    <div className="font-medium">Items deleted:</div>
                    <div>Chapters: {resetResult.details.chapters || 0}</div>
                    <div>Members: {resetResult.details.members || 0}</div>
                    <div>Monthly Reports: {resetResult.details.monthly_reports || 0}</div>
                    <div>Member Stats: {resetResult.details.member_stats || 0}</div>
                    <div>Referrals: {resetResult.details.referrals || 0}</div>
                    <div>One-to-Ones: {resetResult.details.one_to_ones || 0}</div>
                    <div>TYFCBs: {resetResult.details.tyfcbs || 0}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
