import React, { useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCloudDownloadAlt, FaBars, FaChevronLeft, FaUsers } from "react-icons/fa";

import styles from "./mainPage.module.css";
import { GetNotices } from "../../services/GetNotices";
import { NoticeCard } from "../../components/NoticeCard/NoticeCard";
import { Button } from "../../components/Button/Button";
import { useToast } from "../../context/ToastContext";
import { MessageModal } from "../../components/Modal/MessageModal";
import { useSearchParams } from "react-router-dom";
import { useExtraction } from "../../context/ExtractionContext";

const MainPage: React.FC = () => {
  const [matricula, setMatricula] = useState<string>("");
  const [downloadLoad, setDownloadLoad] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { showToast } = useToast();
  const { tasks, startConvocacaoSearch, getTaskResults, loadTasks } = useExtraction();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalHtml, setModalHtml] = useState("");
  const [docs, setDocs] = useState<any[]>([]);

  const getNoticesService = new GetNotices();

  const taskId = `convocacao_${matricula}`;
  const currentTask = tasks.find(t => t.id === taskId);

  // Carregar dados da busca se a tarefa for concluída com sucesso
  useEffect(() => {
    if (currentTask && currentTask.status === 'SUCCESS') {
      getTaskResults(currentTask.id).then(res => {
        if (res) {
          setDocs(res);
        }
      });
    } else {
      setDocs([]);
    }
  }, [currentTask, getTaskResults]);

  // Poll automático se a tarefa estiver pendente nesta tela
  useEffect(() => {
    if (currentTask && currentTask.status === 'PENDING') {
      const interval = setInterval(() => {
        loadTasks();
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [currentTask, loadTasks]);

  const cleanHtml = (html: string) => {
    return html
      .replace(/<html.*?>/gi, "")
      .replace(/<\/html>/gi, "")
      .replace(/<body.*?>/gi, "")
      .replace(/<\/body>/gi, "")
      .replace(/<img[^>]*>/gi, "");
  };

  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (/[^0-9]/.test(val)) {
      showToast("Apenas números são permitidos na matrícula.");
    }

    const numericalOnly = val.replace(/[^0-9]/g, "");

    if (numericalOnly.length > 9) {
      showToast("A matrícula já atingiu o limite de 9 números.");
    }

    setMatricula(numericalOnly.substring(0, 9));
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      setCurrentPage(0);
    }

    if (!matricula) return;

    if (matricula.length !== 9) {
      showToast("A matrícula deve conter exatamente 9 números para buscar.");
      return;
    }

    const recentConvs = JSON.parse(localStorage.getItem('recentConvocacoes') || '[]');
    if (!recentConvs.includes(matricula)) {
      recentConvs.unshift(matricula);
      if (recentConvs.length > 3) recentConvs.pop();
      localStorage.setItem('recentConvocacoes', JSON.stringify(recentConvs));
    }

    setSearchParams({ matricula: matricula });

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }

    try {
      // Inicia a busca de convocações em background (SQLite e Context)
      startConvocacaoSearch(matricula).catch(err => {
        showToast(err.message || "Erro ao iniciar busca.");
      });
    } catch (err: any) {
      showToast(err.message || "Erro inesperado.");
    }
  };

  const handleDownload = async (noticeId: number, name: string) => {
    if (noticeId === null) {
      showToast("Falha técnica: ID do aviso não referenciado na API.");
      return;
    }

    try {
      await getNoticesService.download_docs(noticeId, name);
    } catch (err: any) {
      showToast(err.message || "Erro durante o download do documento.");
    }
  };

  const handleDownloadAll = async () => {
    setDownloadLoad(true);
    const noticeIDs = docs.map((doc: any) => ({
      id: doc.id,
      name: doc.name,
    }));

    if (noticeIDs.length === 0) {
      showToast("Nenhum documento para baixar.");
      setDownloadLoad(false);
      return;
    }

    try {
      await getNoticesService.download_all_docs(noticeIDs);
      showToast("Todos os documentos foram baixados com sucesso!");
    } catch (err: any) {
      showToast(err.message || "Erro durante o download dos documentos.");
    } finally {
      setDownloadLoad(false);
    }
  };

  const openFullMessage = (title: string, html: string) => {
    setModalTitle(title);
    setModalHtml(html);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const mat = searchParams.get("matricula");
    if (mat) {
      setMatricula(mat);
    }
  }, [searchParams]);

  // Paginação local/offline
  const itemsPerPage = 8;
  const totalPages = Math.ceil(docs.length / itemsPerPage);
  const paginatedDocs = docs.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const hasNextPage = currentPage < totalPages - 1;

  return (
    <div className={styles.layoutContainer}>
      <button 
        className={styles.toggleBtn} 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title={isSidebarOpen ? "Recolher Painel" : "Expandir Painel"}
      >
        {isSidebarOpen ? <FaChevronLeft /> : <FaBars />}
      </button>

      {/* Sidebar (Formulário) */}
      <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.sidebarCollapsed : ''}`}>
        <h2 style={{marginTop: '2rem'}}>Consultar</h2>
        <form onSubmit={handleSearch} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="matricula">Matrícula</label>
            <input
              id="matricula"
              type="text"
              value={matricula}
              onChange={handleMatriculaChange}
              placeholder="Digite os 9 números"
              required
            />
          </div>
          <Button
            variant="primary"
            type="submit"
            disabled={currentTask?.status === 'PENDING'}
            style={{ width: "100%" }}
          >
            {currentTask?.status === 'PENDING' ? "Buscando..." : "Pesquisar"}
          </Button>
        </form>
      </aside>

      {/* Main Content (Resultados) */}
      <main className={styles.mainContent}>
        {downloadLoad && (
          <div className={styles.loadingCard} style={{ margin: '0 auto' }}>
            <h2>Baixando documentos...</h2>
            <p>Isso pode demorar alguns minutos dependendo da quantidade de documentos.</p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '50%', animation: 'pulse 1.5s infinite' }}></div>
            </div>
            <style>
              {`@keyframes pulse { 0% { width: 10%; } 50% { width: 90%; } 100% { width: 10%; } }`}
            </style>
          </div>
        )}

        {!downloadLoad && (
          <>
            {/* Estado inicial / Nenhuma busca feita */}
            {!currentTask && (
              <div style={{ textAlign: 'center', marginTop: '10%' }}>
                <FaUsers size={64} color="var(--text-secondary)" opacity={0.5} />
                <h2 style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Nenhuma convocação carregada</h2>
                <p>Pesquise pela matrícula no painel lateral para carregar os dados.</p>
              </div>
            )}

            {/* Estado Pendente (Processando em Background) */}
            {currentTask && currentTask.status === 'PENDING' && (
              <div className={styles.loadingCard} style={{ margin: '0 auto' }}>
                <h2>Processando Consulta...</h2>
                <p>A consulta está sendo processada em segundo plano. Você pode navegar para outras abas.</p>
                <div style={{ margin: '1rem 0', fontWeight: 'bold' }}>
                  Etapa: {currentTask.step}
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '50%', animation: 'pulse 1.5s infinite' }}></div>
                </div>
                <style>
                  {`@keyframes pulse { 0% { width: 10%; } 50% { width: 90%; } 100% { width: 10%; } }`}
                </style>
              </div>
            )}

            {/* Estado Erro */}
            {currentTask && currentTask.status === 'ERROR' && (
              <div className={styles.error} style={{ margin: '0 auto', maxWidth: '600px', padding: '2rem', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', borderRadius: '12px' }}>
                <h2 style={{ color: '#e74c3c' }}>Falha na Consulta</h2>
                <p>{currentTask.error_msg || "Ocorreu um erro técnico ao consultar o Nexti."}</p>
              </div>
            )}

            {/* Estado Concluído com Sucesso */}
            {currentTask && currentTask.status === 'SUCCESS' && docs.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '10%' }}>
                <FaUsers size={64} color="var(--text-secondary)" opacity={0.5} />
                <h2 style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Nenhuma convocação encontrada</h2>
                <p>Este colaborador não possui convocações registradas no momento.</p>
              </div>
            )}

            {currentTask && currentTask.status === 'SUCCESS' && docs.length > 0 && (
              <section className={styles.resultsArea}>
                <h2>Convocações do Colaborador ({currentTask.nome || currentTask.matricula}) - {docs.length} no total</h2>

                <div className={styles.cardsGrid}>
                  <div className={styles.downloadAllWrapper}>
                    <Button
                      variant="primary"
                      onClick={handleDownloadAll}
                      style={{ gap: "0.5rem" }}
                    >
                      <FaCloudDownloadAlt /> Baixar Todos ({docs.length})
                    </Button>
                  </div>

                  {paginatedDocs.map((doc: any, idx: any) => (
                    <NoticeCard
                      key={idx}
                      personName={doc.personName}
                      id={doc.id}
                      name={doc.name}
                      text={doc.text}
                      onDownload={handleDownload}
                      onReadMore={openFullMessage}
                      cleanHtml={cleanHtml}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className={styles.paginationContainer}>
                    <Button
                      variant="icon"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 0))
                      }
                      disabled={currentPage === 0}
                    >
                      <FaArrowLeft />
                    </Button>

                    <span>
                      Página {currentPage + 1} de {totalPages} {currentPage === totalPages - 1 && "(última página)"}
                    </span>

                    <Button
                      variant="icon"
                      disabled={!hasNextPage}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                    >
                      <FaArrowRight />
                    </Button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <MessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        documentTitle={modalTitle}
        documentHtml={modalHtml}
      />
    </div>
  );
};

export default MainPage;
