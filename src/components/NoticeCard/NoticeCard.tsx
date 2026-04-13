import React from 'react';
import { FaCloudDownloadAlt, FaEnvelopeOpenText } from 'react-icons/fa';
import { Button } from '../Button/Button';
import styles from './NoticeCard.module.css';

interface NoticeCardProps {
  personName: string;
  id: number;
  name: string;
  text: string;
  onDownload: (id: number, name: string) => void;
  onReadMore: (title: string, fullHtml: string) => void;
  cleanHtml: (html: string) => string;
}

export const NoticeCard: React.FC<NoticeCardProps> = ({
  personName,
  id,
  name,
  text,
  onDownload,
  onReadMore,
  cleanHtml
}) => {
  // Limita o resumo para manter a harmonia dos cards
  const textPreview = cleanHtml(text || "N/A");
  const summary = textPreview.length > 80 ? textPreview.substring(0, 80) + "..." : textPreview;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.personName}>{personName || "N/A"}</h3>
        <span className={styles.documentName}>{name || "N/A"}</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.documentText} dangerouslySetInnerHTML={{ __html: summary }} />
      </div>
      <div className={styles.cardFooter}>
        <Button 
          variant="secondary" 
          onClick={() => onReadMore(name, text)} 
          title="Ler Mensagem Completa" 
          style={{ width: '100%', fontSize: '0.9rem', display: 'flex', gap: '0.5rem' }}
        >
          <FaEnvelopeOpenText /> Resumo completo
        </Button>
        <Button 
          variant="icon" 
          onClick={() => onDownload(id, name)} 
          title="Fazer Download"
          style={{ flexShrink: 0 }}
        >
          <FaCloudDownloadAlt />
        </Button>
      </div>
    </div>
  );
};
