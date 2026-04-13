import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  className = '', 
  ...props 
}) => {
  const customClass = `${styles.btn} ${styles[variant]} ${className}`;
  
  return (
    <button className={customClass} {...props}>
      {children}
    </button>
  );
};
