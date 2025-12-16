import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = false, className, ...props }, ref) => {
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div style={{ width: fullWidth ? '100%' : 'auto' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: error ? '#dc2626' : '#374151',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            fontSize: '1rem',
            lineHeight: 1.5,
            color: '#1f2937',
            backgroundColor: '#fff',
            border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`,
            borderRadius: '0.375rem',
            outline: 'none',
            transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? '#dc2626' : '#3b82f6';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px rgba(220, 38, 38, 0.1)'
              : '0 0 0 3px rgba(59, 130, 246, 0.1)';
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#dc2626' : '#d1d5db';
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
          {...props}
        />
        {(error || helperText) && (
          <p
            style={{
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: error ? '#dc2626' : '#6b7280',
            }}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
