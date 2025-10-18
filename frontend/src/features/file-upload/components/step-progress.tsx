import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepProgressProps {
  currentStep: number;
}

const steps = [
  { number: 1, label: 'Choose Type' },
  { number: 2, label: 'Select Month' },
  { number: 3, label: 'Upload Files' },
  { number: 4, label: 'Processing' },
  { number: 5, label: 'Results' },
];

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep }) => {
  return (
    <div className="flex items-center justify-between max-w-3xl mx-auto">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center flex-1">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm mb-2 transition-all',
                currentStep >= step.number
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {currentStep > step.number ? <Check className="h-5 w-5" /> : step.number}
            </div>
            <span className="text-xs font-medium text-center">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-2',
                currentStep > step.number ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
