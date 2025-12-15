import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  footer,
  className = '',
}) => {
  const cardStyles = {
    border: '1px solid #646cff',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
  };

  const titleStyles = {
    fontSize: '1.2em',
    fontWeight: 600,
    marginBottom: '12px',
    borderBottom: '1px solid #646cff',
    paddingBottom: '8px',
  };

  const footerStyles = {
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px solid #646cff',
    fontSize: '0.9em',
    color: '#888',
  };

  return (
    <div style={{ ...cardStyles }} className={className}>
      {title && <div style={titleStyles}>{title}</div>}
      <div>{children}</div>
      {footer && <div style={footerStyles}>{footer}</div>}
    </div>
  );
};
