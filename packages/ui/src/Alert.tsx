import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
}

export function Alert({
  children,
  variant = 'info',
  onClose
}: AlertProps) {
  const variantStyles = {
    info: 'bg-blue-50 border-blue-500 text-blue-900',
    success: 'bg-green-50 border-green-500 text-green-900',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-900',
    error: 'bg-red-50 border-red-500 text-red-900',
  };

  return (
    <div
      className={`border-l-4 p-4 ${variantStyles[variant]}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <div>{children}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-4 text-xl font-bold opacity-50 hover:opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
