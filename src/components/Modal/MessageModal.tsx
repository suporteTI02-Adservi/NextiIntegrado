import React, { useEffect } from 'react';
import { Button } from '../Button/Button';
import { getBadge } from '../ReportCard/ReportCard';
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

  const badge = getBadge(documentTitle || '');

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <h3>{documentTitle}</h3>
            {badge && (
              <span style={{
                background: `${badge.color}20`,
                color: badge.color,
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                border: `1px solid ${badge.color}40`,
                whiteSpace: 'nowrap'
              }}>
                {badge.label}
              </span>
            )}
          </div>
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
