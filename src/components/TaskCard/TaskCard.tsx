import React from 'react';
import { Task } from '../../context/ExtractionContext';
import { Button } from '../Button/Button';
import { FaTrash, FaEye, FaFilePdf, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import styles from '../../page/dashboard/Dashboard.module.css';

interface TaskCardProps {
  task: Task;
  onNavigate: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onNavigate, onDelete }) => {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Processando...';
      case 'SUCCESS': return 'Concluído';
      case 'ERROR': return 'Erro';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING': return styles.statusPending;
      case 'SUCCESS': return styles.statusSuccess;
      case 'ERROR': return styles.statusError;
      default: return '';
    }
  };

  let displayDate = "";
  if (task.updated_at) {
    const ms = typeof task.updated_at === 'number' && task.updated_at < 1e11 ? task.updated_at * 1000 : task.updated_at;
    displayDate = new Date(ms).toLocaleString();
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.typeBadge}>
          {task.task_type === 'documento' ? (
            <span className={styles.badgeDoc}><FaFilePdf /> Documentos</span>
          ) : task.task_type === 'holerite' ? (
            <span className={styles.badgeHolerite}><FaMoneyBillWave /> Holerite</span>
          ) : (
            <span className={styles.badgeConv}><FaUsers /> Convocações</span>
          )}
        </div>
        <span className={`${styles.status} ${getStatusClass(task.status)}`}>
          {getStatusLabel(task.status)}
        </span>
      </div>
      
      <div className={styles.cardBody}>
        <div className={styles.matricula}>Matrícula: {task.matricula}</div>
        <div className={styles.nome}>
          Colaborador: {task.nome ? task.nome : <span style={{ opacity: 0.5 }}>{task.status === 'PENDING' ? 'Consultando...' : 'Não identificado'}</span>}
        </div>
        {displayDate && <div className={styles.dateInfo}>Data: {displayDate}</div>}
        
        {task.status === 'PENDING' && (
          <div className={styles.stepInfo}>
            <strong>Etapa:</strong> {task.step}
          </div>
        )}

        {task.status === 'ERROR' && task.error_msg && (
          <div className={styles.errorMsg}>
            {task.error_msg}
          </div>
        )}
      </div>

      <div className={styles.cardActions}>
        {task.status === 'SUCCESS' && (
          <Button 
            variant="primary" 
            onClick={() => onNavigate(task)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <FaEye /> Visualizar
          </Button>
        )}
        
        {task.status === 'ERROR' && (
          <Button 
            variant="secondary" 
            onClick={() => onNavigate(task)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            Tentar Novamente
          </Button>
        )}

        {task.status === 'PENDING' && (
          <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem' }}>
            <div className={styles.pulseBar}></div>
          </div>
        )}

        <Button 
          variant="icon" 
          onClick={() => onDelete(task.id)}
          title="Excluir Registro"
          style={{ color: '#e74c3c' }}
        >
          <FaTrash />
        </Button>
      </div>
    </div>
  );
};
