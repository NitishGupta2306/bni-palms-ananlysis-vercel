import { useState, useEffect } from 'react';
import { useErrorToast } from '../components/common/error-toast';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { showNetworkError } = useErrorToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNetworkError(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      showNetworkError(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showNetworkError]);

  return isOnline;
};