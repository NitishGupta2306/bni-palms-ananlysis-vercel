/**
 * Step 1: Report Type Selection
 *
 * Extracted from report-wizard-tab.tsx for better maintainability.
 */

import React from "react";
import { FileText, TrendingUp, GitCompare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Step1Props {
  selectedType: "single" | "multi" | "compare" | null;
  onSelectType: (type: "single" | "multi" | "compare") => void;
  onNext: () => void;
}

const reportTypes = [
  {
    id: "single" as const,
    icon: FileText,
    title: "Single Month Report",
    description: "View detailed matrices for one month",
    color: "bg-blue-500",
  },
  {
    id: "multi" as const,
    icon: TrendingUp,
    title: "Multi-Period Analysis",
    description: "Aggregate multiple months into one report",
    color: "bg-green-500",
  },
  {
    id: "compare" as const,
    icon: GitCompare,
    title: "Compare Two Periods",
    description: "Compare performance between two months",
    color: "bg-purple-500",
  },
];

export const Step1ReportType: React.FC<Step1Props> = ({
  selectedType,
  onSelectType,
  onNext,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Report Type</h3>
        <p className="text-sm text-muted-foreground">
          Choose the type of report you want to generate
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {reportTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;

          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? "ring-2 ring-primary shadow-md"
                  : "hover:border-primary/50"
              }`}
              onClick={() => onSelectType(type.id)}
            >
              <CardHeader>
                <div
                  className={`w-12 h-12 rounded-lg ${type.color} bg-opacity-10 flex items-center justify-center mb-3`}
                >
                  <Icon className={`h-6 w-6 text-${type.color.split("-")[1]}-500`} />
                </div>
                <CardTitle className="text-base">{type.title}</CardTitle>
                <CardDescription className="text-sm">
                  {type.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!selectedType}>
          Next Step
        </Button>
      </div>
    </div>
  );
};
