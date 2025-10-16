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
  ChevronDown,
  Check,
  Users,
  FileText,
  FolderUp,
  Download,
  Eye,
  Database,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useDropzone } from "react-dropzone";
import { useApiError } from "../../../shared/hooks/useApiError";
import { API_BASE_URL } from "@/config/api";
import { getAuthToken } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

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

type UploadType = "members_only" | "palms_only" | "both" | null;

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  chapterId,
  chapterName,
  onUploadSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadType, setUploadType] = useState<UploadType>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);

  // Initialize with current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const [monthYear, setMonthYear] = useState(getCurrentMonth());
  const [requirePalmsSheets, setRequirePalmsSheets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    type: "success" | "error";
    message: string;
    reportId?: number;
  } | null>(null);
  const [expandedMatrix, setExpandedMatrix] = useState<string | null>(null);
  const { handleError } = useApiError();

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

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => {
        // Determine file type based on upload type and filename
        let fileType: "slip_audit" | "member_names" = "slip_audit";

        if (uploadType === "members_only") {
          fileType = "member_names";
        } else if (uploadType === "both") {
          // Try to detect based on filename
          const isMemberNames =
            file.name.toLowerCase().includes("member") ||
            file.name.toLowerCase().includes("names");
          fileType = isMemberNames ? "member_names" : "slip_audit";
        }

        // Extract date from filename if it's a slip audit file
        const extractedDate =
          fileType === "slip_audit"
            ? extractDateFromFilename(file.name)
            : undefined;

        // Auto-set month/year if date was extracted
        if (extractedDate && fileType === "slip_audit") {
          setMonthYear(extractedDate);
        }

        return {
          file,
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + " MB",
          type: fileType,
          extractedDate,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);
      setUploadResult(null);
    },
    [uploadType],
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

    // Validate based on upload type
    const slipAuditFiles = files.filter((f) => f.type === "slip_audit");
    const memberFiles = files.filter((f) => f.type === "member_names");

    if (uploadType === "palms_only" && slipAuditFiles.length === 0) {
      setUploadResult({
        type: "error",
        message: "Please select at least one PALMS file",
      });
      return;
    }

    if (uploadType === "members_only" && memberFiles.length === 0) {
      setUploadResult({
        type: "error",
        message: "Please select at least one member names file",
      });
      return;
    }

    if (
      uploadType === "both" &&
      (slipAuditFiles.length === 0 || memberFiles.length === 0)
    ) {
      setUploadResult({
        type: "error",
        message: "Please select both PALMS and member names files",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setCurrentStep(4); // Move to loading step

    try {
      const formData = new FormData();

      // Append all slip audit files
      slipAuditFiles.forEach((slipFile) => {
        formData.append("slip_audit_files", slipFile.file);
      });

      // Append member names file if exists
      if (memberFiles.length > 0) {
        formData.append("member_names_file", memberFiles[0].file);
      }

      formData.append("chapter_id", chapterId);
      formData.append("month_year", monthYear);
      formData.append("require_palms_sheets", requirePalmsSheets.toString());

      // Determine upload option based on upload type
      const uploadOption =
        uploadType === "members_only"
          ? "members_only"
          : uploadType === "both"
            ? "slip_and_members"
            : "slip_only";
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
                reportId: result.report_id,
              });

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

        // Add authentication header
        const token = getAuthToken();
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

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

  const handleBack = () => {
    if (currentStep === 1) return;
    if (currentStep === 4 && uploadResult?.type === "success") return; // Don't go back after success
    setCurrentStep(currentStep - 1);
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setUploadType(null);
    setFiles([]);
    setMonthYear(getCurrentMonth());
    setRequirePalmsSheets(false);
    setUploadProgress(0);
    setUploadResult(null);
  };

  const canProceedFromStep2 = () => {
    return monthYear !== "";
  };

  const canProceedFromStep3 = () => {
    if (files.length === 0) return false;

    const slipFiles = files.filter((f) => f.type === "slip_audit");
    const memberFiles = files.filter((f) => f.type === "member_names");

    if (uploadType === "palms_only") return slipFiles.length > 0;
    if (uploadType === "members_only") return memberFiles.length > 0;
    if (uploadType === "both")
      return slipFiles.length > 0 && memberFiles.length > 0;

    return false;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Upload Wizard</h2>
          <p className="text-xs text-muted-foreground">
            Upload and process reports in a few simple steps
          </p>
        </div>
        {currentStep > 1 && currentStep < 4 && (
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
      </div>

      {/* Step Progress Indicators */}
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        <div className="flex flex-col items-center flex-1">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm mb-2 transition-all",
              currentStep >= 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {currentStep > 1 ? <Check className="h-5 w-5" /> : 1}
          </div>
          <span className="text-xs font-medium text-center">Choose Type</span>
        </div>
        <div
          className={cn(
            "flex-1 h-0.5 mx-2",
            currentStep > 1 ? "bg-primary" : "bg-muted",
          )}
        />

        <div className="flex flex-col items-center flex-1">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm mb-2 transition-all",
              currentStep >= 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {currentStep > 2 ? <Check className="h-5 w-5" /> : 2}
          </div>
          <span className="text-xs font-medium text-center">Select Month</span>
        </div>
        <div
          className={cn(
            "flex-1 h-0.5 mx-2",
            currentStep > 2 ? "bg-primary" : "bg-muted",
          )}
        />

        <div className="flex flex-col items-center flex-1">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm mb-2 transition-all",
              currentStep >= 3
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {currentStep > 3 ? <Check className="h-5 w-5" /> : 3}
          </div>
          <span className="text-xs font-medium text-center">Upload Files</span>
        </div>
        <div
          className={cn(
            "flex-1 h-0.5 mx-2",
            currentStep > 3 ? "bg-primary" : "bg-muted",
          )}
        />

        <div className="flex flex-col items-center flex-1">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm mb-2 transition-all",
              currentStep >= 4
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {currentStep > 4 ? <Check className="h-5 w-5" /> : 4}
          </div>
          <span className="text-xs font-medium text-center">Processing</span>
        </div>
        <div
          className={cn(
            "flex-1 h-0.5 mx-2",
            currentStep > 4 ? "bg-primary" : "bg-muted",
          )}
        />

        <div className="flex flex-col items-center flex-1">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm mb-2 transition-all",
              currentStep >= 5
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            5
          </div>
          <span className="text-xs font-medium text-center">Results</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Choose Upload Type */}
        {currentStep === 1 && (
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
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      uploadType === "members_only"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                    onClick={() => setUploadType("members_only")}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className={cn(
                          "p-3 rounded-full",
                          uploadType === "members_only"
                            ? "bg-primary/10"
                            : "bg-muted",
                        )}
                      >
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          Update Members
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload member names file to update member list
                        </p>
                      </div>
                      {uploadType === "members_only" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </motion.div>

                  {/* Upload PALMS Only */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "p-6 border-2 rounded-lg cursor-pointer transition-all",
                      uploadType === "palms_only"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                    onClick={() => setUploadType("palms_only")}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className={cn(
                          "p-3 rounded-full",
                          uploadType === "palms_only"
                            ? "bg-primary/10"
                            : "bg-muted",
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
                      {uploadType === "palms_only" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </motion.div>

                  {/* Upload Both */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "p-6 border-2 rounded-lg cursor-pointer transition-all",
                      uploadType === "both"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                    onClick={() => setUploadType("both")}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className={cn(
                          "p-3 rounded-full",
                          uploadType === "both" ? "bg-primary/10" : "bg-muted",
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
                      {uploadType === "both" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>

            {uploadType && (
              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(2)}>
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Select Month */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>Select Report Month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="space-y-2">
                    <Label>Report Month & Year</Label>
                    <Select value={monthYear} onValueChange={setMonthYear}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select month and year" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const months = [];
                          const currentDate = new Date();
                          // Generate last 12 months + next 2 months
                          for (let i = 12; i >= -2; i--) {
                            const date = new Date(
                              currentDate.getFullYear(),
                              currentDate.getMonth() - i,
                              1,
                            );
                            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                            const label = format(date, "MMMM yyyy");
                            months.push(
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>,
                            );
                          }
                          return months;
                        })()}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the period this report covers
                    </p>
                  </div>

                  {/* PALMS Storage Option */}
                  <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
                    <input
                      type="checkbox"
                      id="store-palms"
                      checked={requirePalmsSheets}
                      onChange={(e) => setRequirePalmsSheets(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 mt-0.5"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="store-palms"
                        className="font-medium cursor-pointer block"
                      >
                        Store PALMS sheets in database
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Keep original PALMS files available for download later.
                        Default is No.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedFromStep2()}
              >
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Upload Files */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>Upload Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Drop Zone */}
                <div
                  {...getRootProps()}
                  className={cn(
                    "p-8 text-center border-2 border-dashed rounded-lg cursor-pointer transition-all",
                    isDragActive
                      ? "border-primary bg-primary/10 scale-[1.01]"
                      : "border-border hover:border-primary/50 bg-muted/30",
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center space-y-4">
                    <div
                      className={cn(
                        "p-4 rounded-full transition-colors",
                        isDragActive ? "bg-primary/20" : "bg-primary/10",
                      )}
                    >
                      <CloudUpload
                        className={cn(
                          "h-12 w-12",
                          isDragActive ? "text-primary" : "text-primary/80",
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {isDragActive
                          ? "Drop files here..."
                          : "Drop Files Here"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Or click to browse and select files
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {uploadType === "members_only" &&
                          "Upload member names file (.xls, .xlsx)"}
                        {uploadType === "palms_only" &&
                          "Upload PALMS slip audit file (.xls, .xlsx)"}
                        {uploadType === "both" &&
                          "Upload both PALMS and member names files (.xls, .xlsx)"}
                      </p>
                    </div>
                    <Badge variant="secondary">Supported: .xls, .xlsx</Badge>
                  </div>
                </div>

                {/* Selected Files */}
                {files.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Selected Files ({files.length})</Label>
                      {files.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFiles([])}
                          className="text-destructive hover:text-destructive"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-background"
                        >
                          <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">
                              {file.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {file.size}
                              </p>
                              {file.extractedDate && (
                                <Badge variant="secondary" className="text-xs">
                                  Auto-detected:{" "}
                                  {format(
                                    new Date(file.extractedDate + "-01"),
                                    "MMM yyyy",
                                  )}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {uploadType === "both" && (
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
                                  PALMS
                                </SelectItem>
                                <SelectItem value="member_names">
                                  Members
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            onClick={() => removeFile(index)}
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
                )}

                {files.some((f) => f.extractedDate) && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Date auto-detected from filename and applied to Step 2.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!canProceedFromStep3()}
                size="lg"
              >
                Upload & Process
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Loading & Confirmation */}
        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Loading State */}
            {isUploading && (
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    </div>
                    <div className="text-center space-y-2 max-w-md">
                      <h3 className="text-2xl font-bold">Processing Upload</h3>
                      <p className="text-muted-foreground">
                        {uploadProgress < 95
                          ? "Uploading files to server..."
                          : "Processing files and generating matrices..."}
                      </p>
                    </div>
                    <div className="w-full max-w-md space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Progress</span>
                        <span className="text-muted-foreground">
                          {Math.round(uploadProgress)}%
                        </span>
                      </div>
                      <Progress value={uploadProgress} className="h-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success State */}
            {!isUploading && uploadResult?.type === "success" && (
              <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="p-4 rounded-full bg-green-100 dark:bg-green-900">
                      <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-center space-y-2 max-w-md">
                      <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">
                        Upload Successful!
                      </h3>
                      <p className="text-green-700 dark:text-green-300">
                        {uploadResult.message}
                      </p>
                    </div>
                    <Alert className="max-w-md">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Your report has been processed and matrices have been
                        generated. You can now view the report in the Reports
                        tab.
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleStartOver}>
                        Upload Another
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {!isUploading && uploadResult?.type === "error" && (
              <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="p-4 rounded-full bg-red-100 dark:bg-red-900">
                      <AlertTriangle className="h-16 w-16 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-center space-y-2 max-w-md">
                      <h3 className="text-2xl font-bold text-red-900 dark:text-red-100">
                        Upload Failed
                      </h3>
                      <p className="text-red-700 dark:text-red-300">
                        {uploadResult.message}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(3)}
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Try Again
                      </Button>
                      <Button variant="default" onClick={handleStartOver}>
                        Start Over
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadComponent;
