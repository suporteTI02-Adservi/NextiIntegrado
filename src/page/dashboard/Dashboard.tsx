import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useExtraction, Task } from '../../context/ExtractionContext';
import { TaskCard } from '../../components/TaskCard/TaskCard';
import { FaBars } from 'react-icons/fa';
import styles from './Dashboard.module.css';

export const Dashboard = () => {
  const { tasks, loadTasks, deleteTask } = useExtraction();
  const navigate = useNavigate();

  const [filterName, setFilterName] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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

  const handleNavigateTask = (task: Task) => {
    if (task.task_type === 'convocacao') {
      navigate(`/nexti?matricula=${task.matricula}`);
    } else if (task.task_type === 'holerite') {
      navigate(`/documentos?aviso=${task.matricula}&tipo=holerite`);
    } else if (task.task_type === 'juridico') {
      navigate(`/documentos?aviso=${task.matricula}&tipo=juridico`);
    } else {
      navigate(`/documentos?aviso=${task.matricula}&tipo=homologacao`);
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
      <Outlet />
      
      <div className={styles.header}>
        <div className={styles.welcome}>
          <div className={styles.welcomeRow}>
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`${styles.hamburgerBtn} ${showFilters ? styles.hamburgerBtnActive : ''}`}
              title="Filtros"
            >
              <FaBars />
            </button>
            <h2>Menu Principal</h2>
            
            <input 
              type="text" 
              className={styles.searchInput}
              placeholder="Pesquisar documentos..." 
              value={filterName} 
              onChange={e => setFilterName(e.target.value)} 
            />
          </div>
          <p>Acompanhe o status e histórico de processos (Convocações, Homologações, Jurídico e Holerites).</p>
        </div>
      </div>

      {showFilters && (
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Tipo de Processo</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">Todos os tipos</option>
              <option value="convocacao">Convocações</option>
              <option value="documento">Homologação</option>
              <option value="juridico">Jurídico</option>
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
      )}

      {filteredTasks.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>Nenhum processo encontrado.</h2>
          <p>Utilize o botão flutuante (+) no canto inferior direito para iniciar uma nova busca de Convocações ou extração de Documentos.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onNavigate={handleNavigateTask}
              onDelete={deleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};
