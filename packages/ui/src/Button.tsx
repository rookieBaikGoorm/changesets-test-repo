import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  disabled?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
}) => {
  const isDisabled = disabled || loading;

  const baseStyles = {
    padding: '0.6em 1.2em',
    fontSize: '1em',
    fontWeight: 500,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid transparent',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'border-color 0.25s',
    opacity: isDisabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5em',
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#1a1a1a',
      color: '#fff',
    },
    secondary: {
      backgroundColor: '#646cff',
      color: '#fff',
    },
    success: {
      backgroundColor: '#22c55e',
      color: '#fff',
    },
  };

  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        pointerEvents: isDisabled ? 'none' : 'auto'
      }}
    >
      {loading && (
        <span
          style={{
            display: 'inline-block',
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      )}
      {children}
    </button>
  );
};
