import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Step2SelectMonthProps {
  monthYear: string;
  requirePalmsSheets: boolean;
  onMonthYearChange: (value: string) => void;
  onRequirePalmsSheetsChange: (value: boolean) => void;
  onContinue: () => void;
  canProceed: boolean;
}

export const Step2SelectMonth: React.FC<Step2SelectMonthProps> = ({
  monthYear,
  requirePalmsSheets,
  onMonthYearChange,
  onRequirePalmsSheetsChange,
  onContinue,
  canProceed,
}) => {
  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    // Generate last 12 months + next 2 months
    for (let i = 12; i >= -2; i--) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = format(date, 'MMMM yyyy');
      months.push(
        <SelectItem key={value} value={value}>
          {label}
        </SelectItem>
      );
    }
    return months;
  };

  return (
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
              <Select value={monthYear} onValueChange={onMonthYearChange}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select month and year" />
                </SelectTrigger>
                <SelectContent>{generateMonthOptions()}</SelectContent>
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
                onChange={(e) => onRequirePalmsSheetsChange(e.target.checked)}
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
                  Keep original PALMS files available for download later. Default
                  is No.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onContinue} disabled={!canProceed}>
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};
