import React, { useEffect, useState } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, duration = 3500 }) => {
  const [render, setRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setRender(true);
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      // Aguarda o fim da animação de saída (300ms) antes de remover do DOM
      const timer = setTimeout(() => {
        setRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!render) return null;

  return (
    <div className={`${styles.toastContainer} ${isVisible ? styles.show : styles.hide}`}>
      <div className={styles.toastContent}>
        <span>{message}</span>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
      </div>
    </div>
  );
};
