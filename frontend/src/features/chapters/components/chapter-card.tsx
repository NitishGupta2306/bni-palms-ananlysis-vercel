import React from "react";
import {
  Info,
  Upload,
  GitCompare,
  Grid3X3,
  AlertCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChapterMemberData } from "@/shared/services/chapter-data-loader";

interface ChapterCardProps {
  chapterData: ChapterMemberData;
  onTabSelect: (
    chapterId: string,
    tab: "info" | "upload" | "compare" | "preview",
  ) => void;
  onDelete?: (chapterId: string) => void;
  isLoading?: boolean;
}

const ChapterCard: React.FC<ChapterCardProps> = ({
  chapterData,
  onTabSelect,
  onDelete,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="h-[200px] flex items-center justify-center animate-pulse">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading {chapterData.chapterName}...
          </p>
        </div>
      </Card>
    );
  }

  const tabs = [
    { id: "info" as const, label: "Chapter Info", icon: Info },
    { id: "upload" as const, label: "Upload", icon: Upload },
    { id: "compare" as const, label: "Compare", icon: GitCompare },
    { id: "preview" as const, label: "Single-Month", icon: Grid3X3 },
  ];

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-lg border-l-4 border-l-primary/30 cursor-pointer hover:border-l-primary",
      )}
      data-testid={`chapter-card-${chapterData.chapterId}`}
      onClick={() => onTabSelect(chapterData.chapterId, "info")}
    >
      <CardContent className="p-4">
        {chapterData.loadError ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="text-lg font-bold">{chapterData.chapterName}</h3>
                <p className="text-xs text-destructive">
                  {chapterData.loadError}
                </p>
              </div>
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chapterData.chapterId);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <h3
                className="text-lg font-bold truncate"
                data-testid={`chapter-name-${chapterData.chapterId}`}
              >
                {chapterData.chapterName}
              </h3>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(chapterData.chapterId);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-primary/10 hover:border-primary transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabSelect(chapterData.chapterId, tab.id);
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium hidden sm:inline">
                      {tab.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default React.memo(ChapterCard);
