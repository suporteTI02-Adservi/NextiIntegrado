import React from 'react';
import { Button } from '../Button/Button';
import { ReportData } from '../../context/ExtractionContext';
import { FaFilePdf, FaMoneyBillWave, FaFileAlt, FaIdCard, FaHandHoldingUsd, FaBriefcase } from 'react-icons/fa';

interface ReportCardProps {
  report: ReportData;
  onVerify: (url: string | null) => void;
}

export const getBadge = (title: string) => {
  if (!title) return null;
  const t = title.toLowerCase();

  // Tabela oficial do TODO.md:
  if (t.includes('ctps digital')) return { label: 'CTPS Digital', color: '#5DADE2' };
  if (t.includes('ctps')) return { label: 'CTPS', color: '#3498DB' };
  if (t.includes('afastamento')) return { label: 'Afastamento', color: '#9B59B6' };
  if (t.includes('cartão') || t.includes('cartao') || t.includes('Cartão') || t.includes('convocacao de cartao')) {
    return { label: 'Cartão', color: '#E67E22' };
  }
  if (t.includes('alimentação') || t.includes('alimentacao') || /\bva\b/.test(t)) {
    return { label: 'VA', color: '#E67E22' };
  }

  // Demais tipos não listados usam a cor Padrão (Cinza #7F8C8D)
  let label = 'Outro';
  if (t.includes('holerite')) label = 'Holerite';
  else if (t.includes('13º') || t.includes('décimo') || t.includes('decimo')) label = '13º Salário';
  else if (t.includes('bancário') || t.includes('bancario')) label = 'Bancário';
  else if (t.includes('rescisão') || t.includes('rescisao')) label = 'Rescisão';
  else if (t.includes('refeição') || t.includes('refeicao') || /\bvr\b/.test(t)) label = 'VR';
  else if (t.includes('transporte') || /\bvt\b/.test(t)) label = 'VT';
  else if (t.includes('saúde') || t.includes('saude')) label = 'Saúde';
  else if (t.includes('férias') || t.includes('ferias')) label = 'Férias';
  else if (t.includes('admiss')) label = 'Admissão';
  else if (t.includes('demiss') || t.includes('desligamento')) label = 'Desligamento';
  else if (t.includes('treinamento')) label = 'Treinamento';

  return { label, color: '#7F8C8D' };
};

const getWatermarkIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('holerite') || t.includes('decimo')) return <FaMoneyBillWave />;
  if (t.includes('ctps')) return <FaIdCard />;
  if (t.includes('afastamento')) return <FaBriefcase />;
  if (t.includes('bancario') || t.includes('bancário')) return <FaHandHoldingUsd />;
  if (t.includes('rescis')) return <FaFileAlt />;
  return <FaFilePdf />;
};

export const ReportCard: React.FC<ReportCardProps> = ({ report, onVerify }) => {
  const badge = getBadge(report.title);

  return (
    <div style={{
      background: 'var(--bg-glass)',
      padding: '1.2rem',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '1rem',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
      border: '1px solid var(--border-glass)',
      backdropFilter: 'blur(12px)',
      opacity: 0.7,
      transition: 'opacity 0.2s, transform 0.2s',
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Ícone watermark de fundo */}
      <div style={{
        position: 'absolute',
        right: '-12px',
        bottom: '-12px',
        opacity: 0.04,
        transform: 'rotate(-15deg)',
        pointerEvents: 'none',
        zIndex: 0,
        fontSize: '120px',
        color: 'var(--text-main)'
      }}>
        {getWatermarkIcon(report.type)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', position: 'relative', zIndex: 1 }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', margin: 0, fontWeight: 600 }}>
          {report.title}
        </h3>
        {badge && (
          <span style={{
            background: `${badge.color}20`,
            color: badge.color,
            padding: '4px 8px',
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
      <Button variant="secondary" onClick={() => onVerify(report.url)} style={{ padding: '6px 0', fontSize: '0.85rem', position: 'relative', zIndex: 1 }}>
        Visualizar
      </Button>
    </div>
  );
};
