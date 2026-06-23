import React, { useState, useEffect } from "react";
import { Button } from "../../components/Button/Button";
import { useToast } from "../../context/ToastContext";
import { useExtraction, ReportData } from "../../context/ExtractionContext";
import styles from "./documentos.module.css";
import { open } from "@tauri-apps/plugin-dialog";
import { writeFile, readFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaBars, FaChevronLeft, FaSave, FaFilePdf, FaMoneyBillWave } from "react-icons/fa";

const Documentos: React.FC = () => {
  const { userCredentials, setCredentials, tasks, startDocumentoExtraction, startHoleriteExtraction, deleteTask, getTaskResults, loadTasks } = useExtraction();
  const [usuario, setUsuario] = useState(userCredentials?.usuario || "");
  const [senha, setSenha] = useState(userCredentials?.senha || "");
  const [matriculaInput, setMatriculaInput] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedReportUrl, setSelectedReportUrl] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportData[]>([]);
  
  // Filtros de Holerite
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('TODOS'); // 'TODOS', 'NORMAL', 'DECIMO'

  const { showToast } = useToast();

  // Detectar modo holerite via query param
  const tipoParam = searchParams.get("tipo");
  const isHoleriteMode = tipoParam === "holerite";

  const matriculaAtual = searchParams.get("aviso");
  const taskPrefix = isHoleriteMode ? "holerite" : "documento";
  const taskId = `${taskPrefix}_${matriculaAtual}`;
  const currentTask = tasks.find(e => e.id === taskId);

  useEffect(() => {
    if (matriculaAtual) {
      setMatriculaInput(matriculaAtual);
    }
  }, [matriculaAtual]);

  // Carrega os relatórios descriptografados/gerados quando a extração for SUCCESS
  useEffect(() => {
    if (currentTask && currentTask.status === 'SUCCESS') {
      getTaskResults(currentTask.id).then(res => {
        if (res) {
          setReports(res);
        }
      });
    } else {
      setReports([]);
    }
  }, [currentTask, getTaskResults]);

  // Poll automático para esta tela se estiver pendente
  useEffect(() => {
    if (currentTask && currentTask.status === 'PENDING') {
      const interval = setInterval(() => {
        loadTasks();
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [currentTask, loadTasks]);

  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const numericalOnly = val.replace(/[^0-9]/g, "");
    setMatriculaInput(numericalOnly);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userCredentials) {
      if (!usuario || !senha) {
        showToast("Por favor, preencha usuário e senha para a primeira consulta.");
        return;
      }
      setCredentials(usuario, senha);
    }

    if (!matriculaInput) {
      showToast("Matrícula é obrigatória.");
      return;
    }

    try {
      // Preserva o parâmetro tipo na URL
      const newParams: Record<string, string> = { aviso: matriculaInput };
      if (isHoleriteMode) {
        newParams.tipo = "holerite";
      }
      setSearchParams(newParams);
      setSelectedReportUrl(null);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false); // Fecha no mobile
      }
      
      // Inicia a extração assíncrona em background
      if (isHoleriteMode) {
        startHoleriteExtraction(matriculaInput).catch(err => {
          showToast(err.message || "Erro ao iniciar a extração de holerites.");
        });
      } else {
        startDocumentoExtraction(matriculaInput).catch(err => {
          showToast(err.message || "Erro ao iniciar a extração.");
        });
      }
    } catch (err: any) {
      showToast(err.message || "Erro inesperado.");
    }
  };

  const handleVerify = (url: string | null) => {
    if (url) setSelectedReportUrl(url);
  };

  const handleSaveAll = async () => {
    if (!currentTask || currentTask.status !== 'SUCCESS' || reports.length === 0) return;

    try {
      const selectedDir = await open({
        directory: true,
        multiple: false,
        title: isHoleriteMode 
          ? "Selecione a pasta para salvar os holerites"
          : "Selecione a pasta para salvar os relatórios"
      });

      if (selectedDir && typeof selectedDir === 'string') {
        if (isHoleriteMode && currentTask?.results) {
          // No caso de holerites, salva os PDFs consolidados usando as informações no resultsPayload
          const resultsPayload = JSON.parse(currentTask.results);
          for (const payload of resultsPayload) {
            if (payload.type === "HOLERITE_CONSOLIDADO" || payload.type === "DECIMO_CONSOLIDADO") {
              let fileName = payload.title.replace(/\//g, '-');
              fileName = `${matriculaAtual} - ${fileName}.pdf`;
              
              if (payload.filePath) {
                // Ler do disco e copiar para a pasta destino
                const fileData = await readFile(payload.filePath);
                const filePath = await join(selectedDir, fileName);
                await writeFile(filePath, fileData);
              } else if (payload.base64) {
                // Decodificar base64 e salvar
                const binaryString = atob(payload.base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const filePath = await join(selectedDir, fileName);
                await writeFile(filePath, bytes);
              }
            }
          }
        } else {
          // Comportamento normal para documentos CTPS/Afastamentos (ou fallback se não houver currentTask.results)
          for (const report of reports) {
            if (!report.blob) continue;

            let fileName: string;
            fileName = report.type === "AFASTAMENTOS" 
              ? `${matriculaAtual} - Afastamentos.pdf` 
              : `${matriculaAtual} - CTPS.pdf`;

            const arrayBuffer = await report.blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const filePath = await join(selectedDir, fileName);
            await writeFile(filePath, uint8Array);
          }
        }

        showToast(isHoleriteMode ? "Holerites salvos com sucesso!" : "Relatórios salvos com sucesso!");
        await deleteTask(currentTask.id);
        setSearchParams({});
        setSelectedReportUrl(null);
        navigate('/');
      }
    } catch (err: any) {
      showToast("Erro ao salvar os arquivos: " + err.message);
    }
  };

  const pageTitle = isHoleriteMode ? "Consulta de Holerites" : "Consulta de Documentos";
  const pageIcon = isHoleriteMode ? <FaMoneyBillWave size={64} color="var(--text-secondary)" opacity={0.5} /> : <FaFilePdf size={64} color="var(--text-secondary)" opacity={0.5} />;
  const emptyMsg = isHoleriteMode 
    ? "Nenhum holerite selecionado" 
    : "Nenhum documento selecionado";
  const emptyDesc = isHoleriteMode
    ? "Insira a matrícula do colaborador no painel lateral para buscar o histórico completo de holerites."
    : "Selecione uma extração ativa ou inicie uma nova consulta no painel lateral.";
  const loadingTitle = isHoleriteMode ? "Extraindo Histórico de Holerites..." : "Extraindo Relatórios...";
  const loadingDesc = isHoleriteMode 
    ? "O sistema está buscando todo o histórico de holerites do colaborador. Aguarde."
    : "O processo está rodando em segundo plano. Você pode consultar outras matrículas enquanto espera.";

  return (
    <div className={styles.layoutContainer}>
      {/* Botão para alternar a Sidebar */}
      <button 
        className={styles.toggleBtn} 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title={isSidebarOpen ? "Recolher Painel" : "Expandir Painel"}
      >
        {isSidebarOpen ? <FaChevronLeft /> : <FaBars />}
      </button>

      {/* Sidebar (Formulário) */}
      <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.sidebarCollapsed : ''}`}>
        <h2 style={{marginTop: '2rem'}}>{pageTitle}</h2>
        <form onSubmit={handleGenerate} className={styles.form}>
          {!userCredentials && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="usuario">Usuário Rubi</label>
                <input
                  id="usuario"
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Seu usuário"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="senha">Senha Rubi</label>
                <input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha"
                  required
                />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="matricula">Matrícula</label>
            <input
              id="matricula"
              type="text"
              value={matriculaInput}
              onChange={handleMatriculaChange}
              placeholder="Ex: 12345"
              required
            />
          </div>

          <Button variant="primary" type="submit" style={{ width: "100%" }}>
            {isHoleriteMode ? "Buscar Holerites" : "Buscar Relatórios"}
          </Button>
        </form>

        {userCredentials && (
          <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem'}}>
            Credenciais salvas. Para alterar, limpe os dados ou reinicie a sessão.
          </p>
        )}
      </aside>

      {/* Área Principal (Resultados) */}
      <main className={styles.mainContent}>
        {!matriculaAtual && (
          <div style={{ textAlign: 'center', marginTop: '10%' }}>
            {pageIcon}
            <h2 style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>{emptyMsg}</h2>
            <p>{emptyDesc}</p>
          </div>
        )}

        {matriculaAtual && (!currentTask || currentTask.status === 'PENDING') && (
          <div className={styles.loadingCard} style={{ margin: '0 auto' }}>
            <h2>{loadingTitle}</h2>
            <p>{loadingDesc}</p>
            <div style={{ margin: '1rem 0', fontWeight: 'bold' }}>
              Etapa: {currentTask?.step || 'Consultando no Senior...'}
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '50%', animation: 'pulse 1.5s infinite' }}></div>
            </div>
            <style>
              {`@keyframes pulse { 0% { width: 10%; } 50% { width: 90%; } 100% { width: 10%; } }`}
            </style>
          </div>
        )}

        {currentTask && currentTask.status === 'ERROR' && (
          <div className={styles.error} style={{ margin: '0 auto', maxWidth: '600px', padding: '2rem', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', borderRadius: '12px' }}>
            <h2 style={{ color: '#e74c3c' }}>Falha na Extração</h2>
            <p>{currentTask.error_msg}</p>
          </div>
        )}

        {currentTask && currentTask.status === 'SUCCESS' && reports.length > 0 && (
          <section className={styles.resultsArea}>
            <h2>
              {isHoleriteMode 
                ? `Holerites Encontrados (${currentTask.matricula})` 
                : `Documentos Encontrados (${currentTask.matricula})`
              } - {currentTask.nome || ''}
            </h2>

            {isHoleriteMode && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label htmlFor="filterMonth" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mês/Ano (Ex: 01/2024)</label>
                  <input 
                    id="filterMonth"
                    type="text" 
                    value={filterMonth} 
                    onChange={(e) => setFilterMonth(e.target.value)} 
                    placeholder="Filtrar por Mês" 
                    style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label htmlFor="filterType" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tipo</label>
                  <select 
                    id="filterType"
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--bg-glass)', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="TODOS">Todos</option>
                    <option value="NORMAL">Holerite Normal</option>
                    <option value="DECIMO">13º Salário</option>
                  </select>
                </div>
              </div>
            )}

            <div className={styles.cardsGrid}>
              {reports.filter(report => {
                if (!isHoleriteMode) return true;
                // Aplica filtro de Mês
                if (filterMonth && report.monthString && !report.monthString.includes(filterMonth)) {
                  return false;
                }
                // Aplica filtro de Tipo
                if (filterType === 'NORMAL' && report.isDecimoTerceiro) return false;
                if (filterType === 'DECIMO' && !report.isDecimoTerceiro) return false;
                return true;
              }).map((report, idx) => (
                <div key={idx} className={styles.reportCard}>
                  <h3>{report.title}</h3>
                  <Button variant="secondary" onClick={() => handleVerify(report.url)}>
                    Visualizar
                  </Button>
                </div>
              ))}
            </div>

            <div className={styles.downloadAllWrapper}>
              <Button variant="primary" onClick={handleSaveAll} style={{ padding: '0.8rem 2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <FaSave /> {isHoleriteMode ? "Salvar Holerites (Remove da Fila)" : "Salvar Relatórios (Remove da Fila)"}
              </Button>
            </div>

            {selectedReportUrl && (
              <div style={{
                background: 'var(--bg-glass)',
                borderRadius: '20px',
                padding: '1rem',
                height: '70vh',
                boxShadow: '10px 10px 20px var(--shadow-dark), -10px -10px 20px var(--shadow-light)'
              }}>
                <object
                  data={selectedReportUrl}
                  type="application/pdf"
                  style={{ width: '100%', height: '100%', borderRadius: '12px' }}
                >
                  <p>O seu visualizador não suporta PDFs nativamente. Tente salvar o arquivo.</p>
                </object>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Documentos;
