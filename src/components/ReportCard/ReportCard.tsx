import React from 'react';
import { Button } from '../Button/Button';
import { ReportData } from '../../context/ExtractionContext';

interface ReportCardProps {
  report: ReportData;
  onVerify: (url: string | null) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onVerify }) => {
  return (
    <div style={{
      background: 'var(--bg-glass)',
      padding: '1.2rem',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '1rem',
      boxShadow: '6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light)'
    }}>
      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
        {report.title}
      </h3>
      <Button variant="secondary" onClick={() => onVerify(report.url)}>
        Visualizar
      </Button>
    </div>
  );
};
