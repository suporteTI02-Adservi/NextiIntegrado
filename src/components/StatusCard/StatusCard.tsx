import React from 'react';
import styles from './StatusCard.module.css';

export type StatusCardType = 'success' | 'processing' | 'error' | 'SUCCESS' | 'PENDING' | 'ERROR';

interface StatusCardProps {
  status: StatusCardType;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  status,
  title,
  className = '',
  style,
  size
}) => {
  const normalizedStatus = React.useMemo(() => {
    const s = String(status).toUpperCase();
    if (s === 'SUCCESS' || s === 'SUCESSO') return 'success';
    if (s === 'PENDING' || s === 'PROCESSING' || s === 'PROCESSANDO') return 'processing';
    return 'error';
  }, [status]);

  const defaultTitle = React.useMemo(() => {
    if (normalizedStatus === 'success') return 'Sucesso';
    if (normalizedStatus === 'processing') return 'Processando';
    return 'Erro';
  }, [normalizedStatus]);

  const customStyle: React.CSSProperties = {
    ...style,
    ...(size ? { width: size, height: size, minWidth: size, minHeight: size } : {})
  };

  return (
    <div
      className={`${styles.statusCard} ${styles[normalizedStatus]} ${className}`}
      style={customStyle}
      title={title || defaultTitle}
      role="status"
      aria-label={title || defaultTitle}
    >
      <div className={styles.cornerLight} aria-hidden="true" />
    </div>
  );
};

export default StatusCard;
