import { MatrixData } from '../types/matrix.types';

interface MatrixVisualizationConfig {
  hasData: boolean;
  hasLegend: boolean;
  hasTotals: boolean;
  hasSummaries: boolean;
}

export const useMatrixVisualization = (matrixData: MatrixData | null): MatrixVisualizationConfig => {
  if (!matrixData) {
    return {
      hasData: false,
      hasLegend: false,
      hasTotals: false,
      hasSummaries: false,
    };
  }

  const { matrix, legend, totals, summaries } = matrixData;
  const hasData = matrix.some(row => row.some(cell => cell > 0));

  return {
    hasData,
    hasLegend: !!legend,
    hasTotals: !!totals,
    hasSummaries: !!summaries,
  };
};
