import React from 'react';
import { Badge } from '@/components/ui/badge';

interface MatrixLegendProps {
  legend: Record<string, string>;
}

export const MatrixLegend: React.FC<MatrixLegendProps> = ({ legend }) => {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Legend:</h4>
      <div className="flex gap-2 flex-wrap">
        {Object.entries(legend).map(([key, value]) => (
          <Badge key={key} variant="outline">
            {key}: {value}
          </Badge>
        ))}
      </div>
    </div>
  );
};
