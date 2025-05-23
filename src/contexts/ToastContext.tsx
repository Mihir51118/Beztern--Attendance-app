import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  toasts: [],
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prevToasts) => prevToasts.slice(1));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // Stable showToast function to prevent unnecessary re-renders
  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
  }, []);

  // Memoize context value to keep showToast identity stable
  const contextValue = useMemo(
    () => ({ showToast, toasts }),
    [showToast, toasts]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type} animate-slideUp`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
