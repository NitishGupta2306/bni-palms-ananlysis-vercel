import { useErrorToast } from '../components/common/ErrorToast';
import { ApiErrorHandler } from '../lib/apiErrors';
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