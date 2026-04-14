import React, { useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

import styles from "./mainPage.module.css";
import { NoticeService } from "../../services/NoticeService";
import { GetNotices } from "../../services/GetNotices";
import { NoticeCard } from "../../components/NoticeCard/NoticeCard";
import { Button } from "../../components/Button/Button";
import { Header } from "../../components/Header/Header";
import { useToast } from "../../context/ToastContext";
import { MessageModal } from "../../components/Modal/MessageModal";

const MainPage: React.FC = () => {
  const [matricula, setMatricula] = useState<string>("");
  const [documents, setDocuments] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [downloadLoad, setDownloadLoad] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Toast vindo do Contexto
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalHtml, setModalHtml] = useState("");

  const [noticeID, setNoticeID] = useState<any[]>([]);

  const noticeService = new NoticeService();
  const getNoticesService = new GetNotices();

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

    // Feedback instantâneo se digitarem letras
    if (/[^0-9]/.test(val)) {
      showToast("Apenas números são permitidos na matrícula.");
    }

    const numericalOnly = val.replace(/[^0-9]/g, "");

    // Feedback instantâneo se ultrapassarem 9 caracteres
    if (numericalOnly.length > 9) {
      showToast("A matrícula já atingiu o limite de 9 números.");
    }

    // Bloquear a string para passar apenas tamanho 9 numérico
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

    setLoading(true);

    try {
      const response = await noticeService.getDocuments(
        Number(matricula),
        currentPage,
      );

      if (response && Array.isArray(response)) {
        if (response.length === 0) {
          setHasNextPage(false);
          setDocuments([]);
        } else {
          const lastItem = response[response.length - 1];
          const isLastPage = lastItem?.name
            ?.toUpperCase()
            .includes("BEM VINDO");

          setHasNextPage(!isLastPage);
          setDocuments(
            response.map((doc: any) => ({
              personName: doc.personName || "N/A",
              id: doc.id || null,
              name: doc.name || "N/A",
              text: doc.text || "N/A",
              idNoticePerson: doc.idNoticePerson || null,
            })),
          );

          setNoticeID(
            response.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
            })),
          );
        }
      } else {
        setDocuments([]);
        setHasNextPage(false);
        showToast("Nenhum documento encontrado ou resposta inválida.");
      }
    } catch (err: any) {
      setDocuments([]);
      setHasNextPage(false);
      showToast(err.message || "Falha técnica ao acessar serviços.");
    }

    setLoading(false);
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
    if (noticeID.length === 0) {
      showToast("Nenhum documento para baixar.");
      setDownloadLoad(false);
      return;
    }

    try {
      await getNoticesService.download_all_docs(noticeID);

      showToast("Todos os documentos foram baixados com sucesso!");
      setDownloadLoad(false);
    } catch (err: any) {
      showToast(err.message || "Erro durante o download dos documentos.");
      setDownloadLoad(false);
    }
  };

  const openFullMessage = (title: string, html: string) => {
    setModalTitle(title);
    setModalHtml(html);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (
      matricula &&
      matricula.length === 9 &&
      !loading &&
      (documents.length > 0 || currentPage > 0)
    ) {
      handleSearch();
    }
  }, [currentPage]);

  return (
    <div className={styles.page}>
      <Header />

      {downloadLoad && (
        <div className={styles.page}>
          <Header />
          <main>
            <div>
              <p>
                Baixando documentos...{" "}
                <p>
                  Isso pode demorar alguns minutos dependendo da quantidade de
                  documentos.
                </p>
              </p>
            </div>
          </main>
        </div>
      )}
      {!downloadLoad && (
        <>
          <main className={styles.main}>
            <form onSubmit={handleSearch} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="matricula">Matrícula</label>
                <input
                  id="matricula"
                  type="text"
                  value={matricula}
                  onChange={handleMatriculaChange}
                  placeholder="Digite os 9 números da matrícula"
                  required
                />
              </div>
              <Button
                variant="primary"
                type="submit"
                disabled={loading}
                style={{ width: "100%" }}
              >
                {loading ? "Carregando..." : "Pesquisar Documentos"}
              </Button>
            </form>

            {documents && documents.length > 0 && !loading && (
              <section className={styles.resultsArea}>
                <h2>Documentos do Colaborador ({documents.length})</h2>

                <div className={styles.cardsGrid}>
                  <button onClick={handleDownloadAll}>
                    Baixar Todos ({documents.length})
                  </button>

                  {documents.map((doc: any, idx: any) => (
                    <NoticeCard
                      key={idx}
                      personName={doc.personName}
                      id={doc.id}
                      name={doc.name}
                      text={doc.text} // Vai passar do DB pro front, Note: O doc.text contem o HTML original!
                      onDownload={handleDownload}
                      onReadMore={openFullMessage}
                      cleanHtml={cleanHtml}
                    />
                  ))}
                </div>

                <div className={styles.paginationContainer}>
                  <Button
                    variant="icon"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 0))
                    }
                    disabled={loading || currentPage === 0}
                  >
                    <FaArrowLeft />
                  </Button>

                  <span>
                    Página {currentPage + 1} {!hasNextPage && "(última página)"}
                  </span>

                  <Button
                    variant="icon"
                    disabled={loading || !hasNextPage}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    <FaArrowRight />
                  </Button>
                </div>
              </section>
            )}
          </main>
        </>
      )}

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
