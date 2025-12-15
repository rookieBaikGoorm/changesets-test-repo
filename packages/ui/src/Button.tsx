import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  const baseStyles = {
    padding: '0.6em 1.2em',
    fontSize: '1em',
    fontWeight: 500,
    fontFamily: 'inherit',
    borderRadius: '8px',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color 0.25s',
    opacity: disabled ? 0.5 : 1,
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
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...baseStyles, ...variantStyles[variant] }}
    >
      {children}
    </button>
  );
};
