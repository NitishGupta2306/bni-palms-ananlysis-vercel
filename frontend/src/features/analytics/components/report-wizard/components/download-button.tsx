import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DownloadButtonProps {
  label: string;
  icon: ReactNode;
  isDownloading: boolean;
  onClick: () => void;
  variant?: "default" | "outline";
  disabled?: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  label,
  icon,
  isDownloading,
  onClick,
  variant = "default",
  disabled = false,
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={isDownloading || disabled}
      variant={variant}
      className="gap-2"
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Downloading...</span>
        </>
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </Button>
  );
};
