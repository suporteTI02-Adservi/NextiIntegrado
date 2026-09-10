import React from 'react';
import { FaCloudDownloadAlt, FaEnvelopeOpenText } from 'react-icons/fa';
import { Button } from '../Button/Button';
import { getBadge } from '../ReportCard/ReportCard';
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

  // Badge inteligente baseado no nome/tipo da convocação
  const badge = getBadge(name || '');

  return (
    <div className={styles.card}>
      {/* Marca d'água de fundo para seguir o design V3.0 */}
      <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.05, transform: 'rotate(-15deg)', pointerEvents: 'none', zIndex: 0 }}>
        <FaEnvelopeOpenText size={150} />
      </div>

      <div className={styles.cardHeader}>
        <div style={{ flex: 1 }}>
          <h3 className={styles.personName}>{personName || "N/A"}</h3>
          <span className={styles.documentName}>{name || "N/A"}</span>
        </div>
        {badge && (
          <span style={{
            background: `${badge.color}20`,
            color: badge.color,
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.72rem',
            fontWeight: 'bold',
            border: `1px solid ${badge.color}40`,
            whiteSpace: 'nowrap',
            alignSelf: 'flex-start',
            marginTop: '2px'
          }}>
            {badge.label}
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.documentText} dangerouslySetInnerHTML={{ __html: summary }} />
      </div>
      <div className={styles.cardFooter}>
        <Button 
          variant="secondary" 
          onClick={() => onReadMore(name, text)} 
          title="Ler Mensagem Completa" 
          style={{ width: '100%', fontSize: '0.9rem', display: 'flex', gap: '0.5rem', zIndex: 1 }}
        >
          <FaEnvelopeOpenText /> Resumo completo
        </Button>
        <Button 
          variant="icon" 
          onClick={() => onDownload(id, name)} 
          title="Fazer Download"
          style={{ flexShrink: 0, zIndex: 1 }}
        >
          <FaCloudDownloadAlt />
        </Button>
      </div>
    </div>
  );
};
