/**
 * Step 3: Options & Download
 *
 * Extracted from report-wizard-tab.tsx for better maintainability.
 * Uses DownloadButton foundation component for consistent download actions.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileArchive } from "lucide-react";
import { DownloadButton } from "../components/DownloadButton";
import { MatrixType } from "../types";

interface Step3Props {
  reportType: "single" | "multi" | "compare";
  includePalms: boolean;
  selectedMatrixTypes: MatrixType[];
  onTogglePalms: (value: boolean) => void;
  onToggleMatrixType: (type: MatrixType) => void;
  onDownloadMatrices: () => void;
  onDownloadPalms: () => void;
  isDownloadingMatrices: boolean;
  isDownloadingPalms: boolean;
  onBack: () => void;
  onGenerateReport: () => void;
}

const matrixTypeOptions: Array<{ id: MatrixType; label: string; description: string }> = [
  { id: "referral", label: "Referral Matrix", description: "Member-to-member referral data" },
  { id: "oto", label: "One-to-One Matrix", description: "One-to-one meeting data" },
  { id: "combination", label: "Combination Matrix", description: "Combined referral and OTO data" },
  { id: "tyfcb", label: "TYFCB Data", description: "Thank You For Closed Business data" },
];

export const Step3Options: React.FC<Step3Props> = ({
  reportType,
  includePalms,
  selectedMatrixTypes,
  onTogglePalms,
  onToggleMatrixType,
  onDownloadMatrices,
  onDownloadPalms,
  isDownloadingMatrices,
  isDownloadingPalms,
  onBack,
  onGenerateReport,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Options</h3>
        <p className="text-sm text-muted-foreground">
          Choose which data to include in your report
        </p>
      </div>

      {/* Matrix Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matrix Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {matrixTypeOptions.map((option) => (
            <div key={option.id} className="flex items-start space-x-3">
              <Checkbox
                id={option.id}
                checked={selectedMatrixTypes.includes(option.id)}
                onCheckedChange={() => onToggleMatrixType(option.id)}
              />
              <div className="flex-1">
                <Label
                  htmlFor={option.id}
                  className="text-sm font-medium cursor-pointer"
                >
                  {option.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* PALMS Sheets Option */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="palms"
              checked={includePalms}
              onCheckedChange={onTogglePalms}
            />
            <div className="flex-1">
              <Label htmlFor="palms" className="text-sm font-medium cursor-pointer">
                Include PALMS Source Files
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Include original Excel files in the download
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Actions */}
      <div className="grid gap-3 md:grid-cols-2">
        <DownloadButton
          label="Download Matrices"
          icon={<FileSpreadsheet className="mr-2 h-4 w-4" />}
          isDownloading={isDownloadingMatrices}
          onClick={onDownloadMatrices}
          disabled={selectedMatrixTypes.length === 0}
        />

        {includePalms && (
          <DownloadButton
            label="Download PALMS Files"
            icon={<FileArchive className="mr-2 h-4 w-4" />}
            isDownloading={isDownloadingPalms}
            onClick={onDownloadPalms}
            variant="outline"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        <Button onClick={onGenerateReport}>
          Generate Report
        </Button>
      </div>
    </div>
  );
};
