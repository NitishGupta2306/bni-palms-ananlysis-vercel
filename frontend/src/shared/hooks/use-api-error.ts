import { useErrorToast } from '../components/common/error-toast';
import { ApiErrorHandler } from '../lib/api-errors';
import { useCallback } from 'react';

export const useApiError = () => {
  const { showError } = useErrorToast();

  const handleError = useCallback((error: any) => {
    const apiError = ApiErrorHandler.formatError(error);
    const userMessage = ApiErrorHandler.getUserMessage(apiError);

    showError(userMessage);

    // Log detailed error for debugging
    ApiErrorHandler.logError(apiError, 'API Error Handler');
  }, [showError]);

  return { handleError };
};