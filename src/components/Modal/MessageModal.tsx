import React, { useEffect } from 'react';
import { Button } from '../Button/Button';
import styles from './MessageModal.module.css';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentHtml: string;
}

export const MessageModal: React.FC<MessageModalProps> = ({ 
  isOpen, 
  onClose, 
  documentTitle, 
  documentHtml 
}) => {
  // Impede que o fundo (body) role quando o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{documentTitle}</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          <div dangerouslySetInnerHTML={{ __html: documentHtml }} />
        </div>
        
        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose} style={{ minWidth: '120px' }}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
