import React from 'react';
import { Task } from '../../context/ExtractionContext';
import { FaTrash, FaEye, FaFilePdf, FaUsers, FaMoneyBillWave, FaBalanceScale } from 'react-icons/fa';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: Task;
  onNavigate: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onNavigate, onDelete }) => {
  let displayDate = "";
  if (task.updated_at) {
    const ms = typeof task.updated_at === 'number' && task.updated_at < 1e11 ? task.updated_at * 1000 : task.updated_at;
    displayDate = new Date(ms).toLocaleString();
  }

  const renderTypeIcon = (type: string) => {
    if (type === 'juridico') return <FaBalanceScale />;
    if (type === 'documento') return <FaFilePdf />;
    if (type === 'holerite') return <FaMoneyBillWave />;
    return <FaUsers />;
  };

  const getTypeStyle = (type: string) => {
    if (type === 'juridico') return styles.juridicoIcon;
    if (type === 'documento') return styles.docIcon;
    if (type === 'holerite') return styles.holeriteIcon;
    return styles.convIcon;
  };

  return (
    <div className={`${styles.card} ${task.status === 'PENDING' ? styles.statusPending : task.status === 'SUCCESS' ? styles.statusSuccess : styles.statusError}`}>
      <div className={styles.topCornerLight} aria-hidden="true" />
      <div className={styles.watermarkIcon}>
        {renderTypeIcon(task.task_type)}
      </div>

      <div className={styles.cardContent}>
        <div className={styles.topRightActions}>
          <button 
            className={styles.deleteBtn} 
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            title="Excluir Registro"
          >
            <FaTrash size={12} />
          </button>
        </div>

        <div className={styles.headerRow}>
          <div className={`${styles.iconBadge} ${getTypeStyle(task.task_type)}`} title={task.task_type}>
            {renderTypeIcon(task.task_type)}
          </div>
        </div>
        
        <div className={styles.cardBody}>
          <div className={styles.matricula}>{task.matricula}</div>
          <div className={styles.nome}>
            {task.nome ? task.nome : <span style={{ opacity: 0.5 }}>{task.status === 'PENDING' ? 'Consultando...' : 'Não identificado'}</span>}
          </div>
          {displayDate && <div className={styles.dateInfo}>{displayDate}</div>}
          
          {task.status === 'PENDING' && (
            <div className={styles.stepInfo}>
              {task.step}
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
            <button 
              className={styles.viewBtn} 
              onClick={() => onNavigate(task)}
            >
              <FaEye /> Visualizar
            </button>
          )}
          
          {task.status === 'ERROR' && (
            <button 
              className={styles.viewBtn} 
              onClick={() => onNavigate(task)}
            >
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
