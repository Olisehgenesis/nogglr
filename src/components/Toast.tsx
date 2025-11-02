import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#FFB700',
          borderColor: '#FFB700',
        };
      case 'error':
        return {
          backgroundColor: '#000000',
          borderColor: '#000000',
        };
      case 'info':
        return {
          backgroundColor: '#1E73ED',
          borderColor: '#1E73ED',
        };
      default:
        return {
          backgroundColor: '#1E73ED',
          borderColor: '#1E73ED',
        };
    }
  };

  return (
    <div className="toast-container">
      <div 
        className="toast"
        style={getToastStyles()}
      >
        <span className="toast-message">{message}</span>
        <Button 
          className="toast-close" 
          onClick={onClose}
          variant="ghost"
          size="icon"
        >
          ×
        </Button>
      </div>
    </div>
  );
}

// Toast hook for easy usage
export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const ToastComponent = () => (
    <Toast
      message={toast.message}
      type={toast.type}
      isVisible={toast.isVisible}
      onClose={hideToast}
    />
  );

  return {
    showToast,
    hideToast,
    ToastComponent,
  };
}
