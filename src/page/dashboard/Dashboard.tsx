import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExtraction, Task } from '../../context/ExtractionContext';
import { Button } from '../../components/Button/Button';
import { FaTrash, FaEye, FaSync, FaFilePdf, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import styles from './Dashboard.module.css';

export const Dashboard = () => {
  const { tasks, loadTasks, deleteTask } = useExtraction();
  const navigate = useNavigate();

  const [filterName, setFilterName] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  // Poll de 2 segundos para atualizar a lista se houver alguma tarefa pendente
  useEffect(() => {
    const hasPending = tasks.some(t => t.status === 'PENDING');
    if (hasPending) {
      const interval = setInterval(() => {
        loadTasks();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [tasks, loadTasks]);

  const handleRefresh = async () => {
    await loadTasks();
  };

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

  const handleNavigateTask = (task: Task) => {
    if (task.task_type === 'convocacao') {
      navigate(`/nexti?matricula=${task.matricula}`);
    } else if (task.task_type === 'holerite') {
      navigate(`/documentos?aviso=${task.matricula}&tipo=holerite`);
    } else {
      navigate(`/documentos?aviso=${task.matricula}`);
    }
  };

  const filteredTasks = tasks.filter(task => {
    // Filter by name/matricula
    const searchTerm = filterName.toLowerCase();
    const matchName = (task.nome?.toLowerCase() || '').includes(searchTerm) || 
                      task.matricula.includes(searchTerm);
    
    // Filter by type
    const matchType = filterType === 'all' || task.task_type === filterType;

    // Filter by date
    let matchDate = true;
    if (filterDate) {
      let dateObj;
      if (typeof task.updated_at === 'number') {
        const ms = task.updated_at > 1e11 ? task.updated_at : task.updated_at * 1000;
        dateObj = new Date(ms);
      } else {
        dateObj = new Date(task.updated_at);
      }
      
      const tzOffset = dateObj.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().split('T')[0];
      
      matchDate = localISOTime === filterDate;
    }

    return matchName && matchType && matchDate;
  });

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.welcome}>
          <h2>Menu Principal</h2>
          <p>Acompanhe o status e histórico de processos (Convocações e Documentos).</p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaSync /> Atualizar
        </Button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Buscar (Nome ou Matrícula)</label>
          <input 
            type="text" 
            placeholder="Digite para buscar..." 
            value={filterName} 
            onChange={e => setFilterName(e.target.value)} 
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Tipo de Processo</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">Todos os tipos</option>
            <option value="convocacao">Convocações</option>
            <option value="documento">Documentos</option>
            <option value="holerite">Holerites</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Data de Criação</label>
          <input 
            type="date" 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)} 
          />
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>Nenhum processo encontrado.</h2>
          <p>Utilize o botão flutuante (+) no canto inferior direito para iniciar uma nova busca de Convocações ou extração de Documentos.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredTasks.map((task) => {
            let displayDate = "";
            if (task.updated_at) {
              const ms = typeof task.updated_at === 'number' && task.updated_at < 1e11 ? task.updated_at * 1000 : task.updated_at;
              displayDate = new Date(ms).toLocaleString();
            }

            return (
              <div key={task.id} className={styles.card}>
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
                      onClick={() => handleNavigateTask(task)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <FaEye /> Visualizar
                    </Button>
                  )}
                  
                  {task.status === 'ERROR' && (
                    <Button 
                      variant="secondary" 
                      onClick={() => handleNavigateTask(task)}
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
                    onClick={() => deleteTask(task.id)}
                    title="Excluir Registro"
                    style={{ color: '#e74c3c' }}
                  >
                    <FaTrash />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
