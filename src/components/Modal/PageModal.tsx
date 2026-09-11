import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
    const frame = requestAnimationFrame(() => setMounted(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(() => navigate('/'), 250);
  };

  return createPortal(
    <div className={[styles.overlay, mounted ? styles.overlayVisible : ''].join(' ')}>
      <div className={styles.backdrop} onClick={handleClose} />
      <div
        className={[styles.modalContainer, mounted ? styles.modalVisible : ''].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        <button className={styles.closeBtn} onClick={handleClose} title="Voltar ao Painel" aria-label="Fechar">
          <FaTimes />
        </button>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body
  );
};