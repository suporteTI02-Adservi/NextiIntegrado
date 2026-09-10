import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import styles from './PageModal.module.css';

interface PageModalProps {
  children: React.ReactNode;
}

export const PageModal: React.FC<PageModalProps> = ({ children }) => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Para efeito de animação de entrada
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  const handleClose = () => {
    setMounted(false);
    // Aguarda a animação de saída antes de navegar
    setTimeout(() => {
      navigate('/');
    }, 250);
  };

  return (
    <div className={`${styles.overlay} ${mounted ? styles.overlayVisible : ''}`}>
      <div className={styles.backdrop} onClick={handleClose}></div>
      <div className={`${styles.modalContainer} ${mounted ? styles.modalVisible : ''}`}>
        <button className={styles.closeBtn} onClick={handleClose} title="Voltar ao Painel">
          <FaTimes />
        </button>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};
