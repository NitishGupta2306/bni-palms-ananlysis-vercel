import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, AlertCircle, WifiOff } from 'lucide-react';

interface ErrorToast {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'network';
  duration?: number;
}

interface ErrorToastContextType {
  showError: (message: string, type?: ErrorToast['type']) => void;
  showNetworkError: (isOnline: boolean) => void;
  dismissError: (id: string) => void;
}

const ErrorToastContext = createContext<ErrorToastContextType | undefined>(undefined);

export const useErrorToast = () => {
  const context = useContext(ErrorToastContext);
  if (!context) {
    throw new Error('useErrorToast must be used within ErrorToastProvider');
  }
  return context;
};

export const ErrorToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ErrorToast[]>([]);

  const showError = useCallback((message: string, type: ErrorToast['type'] = 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: ErrorToast = {
      id,
      message,
      type,
      duration: type === 'network' ? 0 : 5000, // Network errors don't auto-dismiss
    };

    setToasts(prev => [...prev, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.duration);
    }
  }, []);

  const showNetworkError = useCallback((isOnline: boolean) => {
    if (!isOnline) {
      showError('You are offline. Some features may not be available.', 'network');
    } else {
      // Remove network error toasts when back online
      setToasts(prev => prev.filter(t => t.type !== 'network'));
      showError('Connection restored.', 'warning');
    }
  }, [showError]);

  const dismissError = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const getToastIcon = (type: ErrorToast['type']) => {
    switch (type) {
      case 'network':
        return <WifiOff className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getToastStyles = (type: ErrorToast['type']) => {
    switch (type) {
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      case 'warning':
        return 'bg-orange-500 text-white';
      case 'network':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-destructive text-destructive-foreground';
    }
  };

  return (
    <ErrorToastContext.Provider value={{ showError, showNetworkError, dismissError }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-lg shadow-lg min-w-[300px] ${getToastStyles(toast.type)}`}
          >
            {getToastIcon(toast.type)}
            <span className="flex-1 text-sm">{toast.message}</span>
            <button
              onClick={() => dismissError(toast.id)}
              className="opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ErrorToastContext.Provider>
  );
};