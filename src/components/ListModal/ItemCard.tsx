import React from 'react';
import { FaCloudDownloadAlt, FaEye } from 'react-icons/fa';
import { Button } from '../Button/Button';
import { getBadge } from '../ReportCard/ReportCard';
import styles from './ItemCard.module.css';

export interface ListItemData {
  id: string | number;
  title: string;
  subtitle?: string;
  previewText?: string;
  type?: string;
  rawItem?: any;
}

interface ItemCardProps {
  item: ListItemData;
  onPrimaryAction: (item: ListItemData) => void;
  onSecondaryAction?: (item: ListItemData) => void;
  cleanHtml?: (html: string) => string;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onPrimaryAction,
  onSecondaryAction,
  cleanHtml
}) => {
  const badge = getBadge(item.type || item.title || '');

  // Truncar prévia para 2 linhas de texto limpo, se houver
  let formattedPreview: string | null = null;
  if (item.previewText) {
    const rawPreview = cleanHtml ? cleanHtml(item.previewText) : item.previewText.replace(/<[^>]*>/g, '');
    if (rawPreview.trim()) {
      formattedPreview = rawPreview.length > 120 ? rawPreview.substring(0, 120) + '...' : rawPreview;
    }
  }

  return (
    <div className={styles.card}>
      {/* 1. Badge de tipo no canto superior direito */}
      {badge && (
        <span
          className={styles.badge}
          style={{
            background: `${badge.color}20`,
            color: badge.color,
            borderColor: `${badge.color}40`,
          }}
        >
          {badge.label}
        </span>
      )}

      <div className={styles.cardHeader}>
        {/* 2. Título do card */}
        <h3 className={styles.cardTitle}>{item.title || 'Sem título'}</h3>

        {/* 3. Subtítulo/linha de contexto */}
        {item.subtitle && (
          <span className={styles.cardSubtitle}>{item.subtitle}</span>
        )}
      </div>

      {/* 4. Prévia do conteúdo (2 linhas) — apenas quando aplicável */}
      {formattedPreview && (
        <div className={styles.cardPreview}>
          <p dangerouslySetInnerHTML={{ __html: formattedPreview }} />
        </div>
      )}

      {/* 5. Botões de ação no rodapé do card, largura total */}
      <div className={styles.cardFooter}>
        <Button
          variant="secondary"
          onClick={() => onPrimaryAction(item)}
          style={{ flex: 1, display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}
        >
          <FaEye /> Visualizar
        </Button>

        {onSecondaryAction && (
          <Button
            variant="icon"
            onClick={() => onSecondaryAction(item)}
            title="Baixar item"
            style={{ flexShrink: 0 }}
          >
            <FaCloudDownloadAlt />
          </Button>
        )}
      </div>
    </div>
  );
};
