import React, { useState, useCallback } from "react";
import {
  CloudUpload,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Loader2,
  File,
  Info,
  CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useDropzone } from "react-dropzone";
import { useApiError } from "../../../shared/hooks/useApiError";
import { API_BASE_URL } from "@/config/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface UploadFile {
  file: File;
  name: string;
  size: string;
  type: "slip_audit" | "member_names";
  extractedDate?: string;
}

interface FileUploadComponentProps {
  chapterId: string;
  chapterName: string;
  onUploadSuccess: () => void;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  chapterId,
  chapterName,
  onUploadSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<UploadFile[]>([]);
  // Initialize with current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };
  const [monthYear, setMonthYear] = useState(getCurrentMonth());
  const [weekOfDate, setWeekOfDate] = useState<string>(""); // YYYY-MM-DD format
  const [requirePalmsSheets, setRequirePalmsSheets] = useState(false);
  const [uploadOption, setUploadOption] = useState<
    "slip_only" | "slip_and_members"
  >("slip_only");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const { handleError } = useApiError();
  const [isMonthPopoverOpen, setIsMonthPopoverOpen] = useState(false);

  // Extract date from filename - supports multiple formats
  const extractDateFromFilename = (filename: string): string | undefined => {
    // Try YYYY-MM-DD format first (e.g., slips-audit-report_2025-01-28.xls)
    const patternYMD = /(\d{4})-(\d{2})-(\d{2})/;
    let match = filename.match(patternYMD);
    if (match) {
      const [, year, month] = match;
      return `${year}-${month}`;
    }

    // Try MM-DD-YYYY format (e.g., Slips_Audit_Report_08-25-2025_2-26_PM.xls)
    const patternMDY = /(\d{2})-(\d{2})-(\d{4})/;
    match = filename.match(patternMDY);
    if (match) {
      const [, month, , year] = match;
      return `${year}-${month}`;
    }

    return undefined;
  };

  // Extract full date from filename for week tracking
  const extractFullDateFromFilename = (
    filename: string,
  ): string | undefined => {
    // Try YYYY-MM-DD format first (e.g., slips-audit-report_2025-01-28.xls)
    const patternYMD = /(\d{4})-(\d{2})-(\d{2})/;
    let match = filename.match(patternYMD);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month}-${day}`;
    }

    // Try MM-DD-YYYY format (e.g., Slips_Audit_Report_08-25-2025_2-26_PM.xls)
    const patternMDY = /(\d{2})-(\d{2})-(\d{4})/;
    match = filename.match(patternMDY);
    if (match) {
      const [, month, day, year] = match;
      return `${year}-${month}-${day}`;
    }

    return undefined;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => {
        // Try to determine file type based on name
        const isSlipAudit =
          file.name.toLowerCase().includes("slip") ||
          file.name.toLowerCase().includes("audit");

        // Extract date from filename if it's a slip audit file
        const extractedDate = isSlipAudit
          ? extractDateFromFilename(file.name)
          : undefined;

        // Auto-set month/year if date was extracted
        if (extractedDate && isSlipAudit) {
          setMonthYear(extractedDate);
        }

        // Extract full date for week tracking
        const extractedFullDate = isSlipAudit
          ? extractFullDateFromFilename(file.name)
          : undefined;

        // Auto-set week date if extracted and not already set
        if (extractedFullDate && isSlipAudit && !weekOfDate) {
          setWeekOfDate(extractedFullDate);
        }

        return {
          file,
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + " MB",
          type: (isSlipAudit ? "slip_audit" : "member_names") as
            | "slip_audit"
            | "member_names",
          extractedDate,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);
      setUploadResult(null);
    },
    [weekOfDate],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const changeFileType = (
    index: number,
    newType: "slip_audit" | "member_names",
  ) => {
    setFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, type: newType } : file)),
    );
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadResult({
        type: "error",
        message: "Please select at least one file",
      });
      return;
    }

    const slipAuditFiles = files.filter((f) => f.type === "slip_audit");
    if (slipAuditFiles.length === 0) {
      setUploadResult({
        type: "error",
        message: "Please select at least one slip audit file",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      const formData = new FormData();

      // Append all slip audit files
      slipAuditFiles.forEach((slipFile) => {
        formData.append("slip_audit_files", slipFile.file);
      });

      const memberNamesFile = files.find((f) => f.type === "member_names");
      if (memberNamesFile) {
        formData.append("member_names_file", memberNamesFile.file);
      }

      formData.append("chapter_id", chapterId);
      if (monthYear) {
        formData.append("month_year", monthYear);
      }
      if (weekOfDate) {
        formData.append("week_of_date", weekOfDate);
      }
      formData.append("require_palms_sheets", requirePalmsSheets.toString());
      formData.append("upload_option", uploadOption);

      // Use XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(Math.min(percentComplete, 95)); // Cap at 95% until processing is done
          }
        });

        // Handle completion
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            try {
              const result = JSON.parse(xhr.responseText);
              setUploadResult({
                type: "success",
                message: `Successfully uploaded and processed ${files.length} file(s) for ${format(new Date(monthYear + "-01"), "MMMM yyyy")}`,
              });
              setFiles([]);
              setMonthYear(getCurrentMonth());
              setWeekOfDate("");
              setRequirePalmsSheets(false);

              // Reset to step 1 after success
              setTimeout(() => {
                setCurrentStep(1);
                setUploadResult(null);
                setUploadProgress(0);
              }, 3000);

              onUploadSuccess();
              resolve();
            } catch (error) {
              reject(new Error("Failed to parse server response"));
            }
          } else {
            try {
              const result = JSON.parse(xhr.responseText);
              setUploadResult({
                type: "error",
                message: result.error || "Upload failed",
              });
            } catch {
              setUploadResult({
                type: "error",
                message: `Upload failed with status ${xhr.status}`,
              });
            }
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        // Handle errors
        xhr.addEventListener("error", () => {
          setUploadResult({
            type: "error",
            message:
              "Upload failed. Please check your connection and try again.",
          });
          reject(new Error("Network error"));
        });

        // Handle timeout
        xhr.addEventListener("timeout", () => {
          setUploadResult({
            type: "error",
            message:
              "Upload timeout - the file took too long to process. Please try again.",
          });
          reject(new Error("Upload timeout"));
        });

        // Set timeout (2 minutes)
        xhr.timeout = 120000;

        // Send request
        xhr.open("POST", `${API_BASE_URL}/api/upload/excel/`);
        xhr.send(formData);
      });
    } catch (error: any) {
      handleError(error);
      setUploadResult({
        type: "error",
        message: error.message || "Upload failed. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Step indicator component
  const StepIndicator = ({
    step,
    label,
    isActive,
    isCompleted,
  }: {
    step: number;
    label: string;
    isActive: boolean;
    isCompleted: boolean;
  }) => (
    <div className="flex flex-col items-center flex-1">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm mb-2 transition-all duration-200",
          isCompleted && "bg-primary text-primary-foreground",
          isActive &&
            !isCompleted &&
            "bg-primary text-primary-foreground ring-4 ring-primary/20",
          !isActive && !isCompleted && "bg-muted text-muted-foreground",
        )}
      >
        {isCompleted ? <Check className="h-5 w-5" /> : step}
      </div>
      <span
        className={cn(
          "text-xs font-medium text-center",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between max-w-md mx-auto">
        <StepIndicator
          step={1}
          label="Select Month"
          isActive={currentStep === 1}
          isCompleted={currentStep > 1}
        />
        <div
          className={cn(
            "flex-1 h-0.5 mx-2",
            currentStep > 1 ? "bg-primary" : "bg-muted",
          )}
        />
        <StepIndicator
          step={2}
          label="Upload Files"
          isActive={currentStep === 2}
          isCompleted={currentStep > 2}
        />
        <div
          className={cn(
            "flex-1 h-0.5 mx-2",
            currentStep > 2 ? "bg-primary" : "bg-muted",
          )}
        />
        <StepIndicator
          step={3}
          label="Review & Submit"
          isActive={currentStep === 3}
          isCompleted={false}
        />
      </div>

      {/* Step 1: Select Month */}
      {currentStep === 1 && (
        <Card className="border-2 border-primary/30">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-primary/10 mb-2">
                  <CalendarIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Select Report Month</h3>
                <p className="text-muted-foreground">
                  Choose the month and year for this report
                </p>
              </div>

              <div className="max-w-sm mx-auto space-y-4">
                <div className="space-y-2">
                  <Label>Report Month & Year</Label>
                  <input
                    type="month"
                    value={monthYear}
                    onChange={(e) => setMonthYear(e.target.value)}
                    className="w-full h-14 px-4 rounded-md border border-input bg-background text-base"
                  />
                </div>

                {/* Week Date Picker */}
                <div className="space-y-2 pt-2">
                  <Label>Week Starting Date (Optional)</Label>
                  <input
                    type="date"
                    value={weekOfDate}
                    onChange={(e) => setWeekOfDate(e.target.value)}
                    className="w-full h-14 px-4 rounded-md border border-input bg-background text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Specify which week this PALMS audit represents. Will be
                    auto-detected from filename if not set.
                  </p>
                </div>

                {/* PALMS Download Availability Toggle */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
                    <input
                      type="checkbox"
                      id="require-palms"
                      checked={requirePalmsSheets}
                      onChange={(e) => setRequirePalmsSheets(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="require-palms"
                        className="font-medium cursor-pointer"
                      >
                        Keep PALMS Sheets Downloadable
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Allow downloading original PALMS files for audit or
                        review purposes
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tips Section */}
                <Alert className="bg-primary/5 border-primary/20">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium text-primary">Tips:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                        <li>• Current month is pre-selected by default</li>
                        <li>
                          • Week date will be auto-detected from filenames
                        </li>
                        <li>
                          • You can upload past reports by changing the date
                        </li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setCurrentStep(2)}
                  size="lg"
                  className="px-8"
                >
                  Continue to Upload
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload Files */}
      {currentStep === 2 && (
        <Card className="border-2 border-primary/30">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-primary/10 mb-2">
                  <CloudUpload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Upload Report Files</h3>
                <p className="text-muted-foreground">
                  Upload slip audit and optionally member names files for{" "}
                  {format(new Date(monthYear + "-01"), "MMMM yyyy")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload Option</Label>
                  <Select
                    value={uploadOption}
                    onValueChange={(value) =>
                      setUploadOption(value as "slip_only" | "slip_and_members")
                    }
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slip_only">Slip Audit Only</SelectItem>
                      <SelectItem value="slip_and_members">
                        Slip Audit + Member Names
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* File Drop Zone */}
                <div
                  {...getRootProps()}
                  className={`
                    p-8 text-center border-4 border-dashed rounded-lg cursor-pointer transition-all duration-200
                    ${
                      isDragActive
                        ? "border-primary bg-primary/10 dark:bg-primary/20 scale-[1.02]"
                        : "border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10"
                    }
                  `}
                  data-testid="file-dropzone"
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center space-y-4">
                    <div
                      className={`p-3 rounded-full ${isDragActive ? "bg-primary/20" : "bg-primary/10"}`}
                    >
                      <CloudUpload
                        className={`h-12 w-12 ${isDragActive ? "text-primary" : "text-primary/80"}`}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-primary">
                        {isDragActive
                          ? "Drop files here..."
                          : "Drop PALMS Files Here"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Or click to browse and select files
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs px-3 py-1">
                      Supported: .xls, .xlsx
                    </Badge>
                  </div>
                </div>

                {/* Selected Files */}
                {files.length > 0 && (
                  <div className="space-y-3">
                    <Label>Selected Files ({files.length})</Label>
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <File className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">
                                {file.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {file.size}
                                </p>
                                {file.extractedDate && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {format(
                                      new Date(file.extractedDate + "-01"),
                                      "MMM yyyy",
                                    )}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Select
                              value={file.type}
                              onValueChange={(value) =>
                                changeFileType(
                                  index,
                                  value as "slip_audit" | "member_names",
                                )
                              }
                            >
                              <SelectTrigger className="w-[140px] h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="slip_audit">
                                  Slip Audit
                                </SelectItem>
                                <SelectItem value="member_names">
                                  Member Names
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() => removeFile(index)}
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {files.some((f) => f.extractedDate) && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Date auto-detected from filename and applied to Step 1.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  size="lg"
                >
                  <ChevronLeft className="mr-2 h-5 w-5" />
                  Back
                </Button>
                <Button
                  onClick={() => {
                    const slipFiles = files.filter(
                      (f) => f.type === "slip_audit",
                    );
                    if (slipFiles.length === 0) {
                      setUploadResult({
                        type: "error",
                        message: "Please select at least one slip audit file",
                      });
                      return;
                    }
                    setUploadResult(null);
                    setCurrentStep(3);
                  }}
                  size="lg"
                  disabled={files.length === 0}
                >
                  Review & Submit
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {uploadResult && uploadResult.type === "error" && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    {uploadResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Submit */}
      {currentStep === 3 && (
        <Card className="border-2 border-primary/30">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-primary/10 mb-2">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Review & Submit</h3>
                <p className="text-muted-foreground">
                  Please review your upload before submitting
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-4">
                {/* Summary Card */}
                <Card className="bg-muted/30">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Report Month
                        </Label>
                        <p className="text-lg font-semibold mt-1">
                          {format(new Date(monthYear + "-01"), "MMMM yyyy")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentStep(1)}
                      >
                        Edit
                      </Button>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-muted-foreground text-xs">
                        Upload Option
                      </Label>
                      <p className="font-medium mt-1">
                        {uploadOption === "slip_only"
                          ? "Slip Audit Only"
                          : "Slip Audit + Member Names"}
                      </p>
                    </div>

                    {weekOfDate && (
                      <div className="border-t pt-4">
                        <Label className="text-muted-foreground text-xs">
                          Audit Week Starting
                        </Label>
                        <p className="text-lg font-semibold mt-1">
                          {format(new Date(weekOfDate), "MMMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Week: {format(new Date(weekOfDate), "MMM d")} -{" "}
                          {format(
                            new Date(
                              new Date(weekOfDate).getTime() +
                                6 * 24 * 60 * 60 * 1000,
                            ),
                            "MMM d, yyyy",
                          )}
                        </p>
                      </div>
                    )}

                    {requirePalmsSheets && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">PALMS Downloadable</Badge>
                          <p className="text-sm text-muted-foreground">
                            Original PALMS sheets will be available for download
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-muted-foreground text-xs">
                          Files to Upload ({files.length})
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentStep(2)}
                        >
                          Edit
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 bg-background rounded border text-sm"
                          >
                            <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 truncate font-medium">
                              {file.name}
                            </span>
                            <Badge
                              variant={
                                file.type === "slip_audit"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {file.type === "slip_audit"
                                ? "Slip Audit"
                                : "Member Names"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Processing Info */}
                {!isUploading && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Files will be processed automatically. Matrices and
                      analytics will be generated for this report period. You
                      can view the results in the "Matrices" tab after upload
                      completes.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Uploading files...</span>
                        <span className="text-muted-foreground">
                          {Math.round(uploadProgress)}%
                        </span>
                      </div>
                      <Progress value={uploadProgress} className="h-3" />
                      <p className="text-xs text-muted-foreground text-center">
                        {uploadProgress < 95
                          ? "Uploading files to server..."
                          : uploadProgress < 100
                            ? "Processing files and generating matrices..."
                            : "Complete!"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Upload Result */}
              {uploadResult && (
                <Alert className="max-w-2xl mx-auto">
                  {uploadResult.type === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription
                    className={
                      uploadResult.type === "success"
                        ? "text-green-800 dark:text-green-200"
                        : "text-red-800 dark:text-red-200"
                    }
                  >
                    {uploadResult.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  size="lg"
                  disabled={isUploading}
                >
                  <ChevronLeft className="mr-2 h-5 w-5" />
                  Back
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || files.length === 0}
                  size="lg"
                  className="px-8"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="mr-2 h-5 w-5" />
                      Upload & Process
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUploadComponent;
