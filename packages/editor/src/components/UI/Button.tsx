import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  isActive = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs rounded',
    md: 'px-3 py-1.5 text-sm rounded-md',
    lg: 'px-4 py-2 text-base rounded-lg',
  };

  const activeClasses = isActive ? 'bg-gray-200 text-gray-900' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${activeClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
