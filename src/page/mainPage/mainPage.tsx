import React, { useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { FaCloudDownloadAlt } from "react-icons/fa";

import styles from "./mainPage.module.css";
import { NoticeService } from "../../services/NoticeService";
import { GetNotices } from "../../services/GetNotices";

const MainPage: React.FC = () => {
  const [matricula, setMatricula] = useState(0);
  const [documents, setDocuments] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);

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

  const handleSearch = async (e?: React.SubmitEvent) => {
    if (e) {
      e.preventDefault();
      setCurrentPage(0); // reset aqui
    }

    if (e) e.preventDefault();
    setLoading(true);

    const response = await noticeService.getDocuments(matricula, currentPage);

    if (response && Array.isArray(response)) {
      // verifica se veio vazio
      if (response.length === 0) {
        setHasNextPage(false);
        setDocuments([]);
      } else {
        const lastItem = response[response.length - 1];

        const isLastPage = lastItem?.name?.toUpperCase().includes("BEM VINDO");

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
      }

      setError("");
    } else {
      setDocuments([]);
      setHasNextPage(false);
      setError("Nenhum documento encontrado ou erro na resposta.");
    }

    setLoading(false);
  };

  const handleDownload = async (noticeId: number, name: string) => {
    if (noticeId === null) {
      setError("ID de aviso ou ID externo da pessoa não definido.");
      return;
    }

    await getNoticesService.download_docs(noticeId, name);
  };

  useEffect(() => {
    if (matricula !== 0) {
      handleSearch();
    }
  }, [currentPage]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Convo</h1>
      </header>
      <main className={styles.main}>
        <form onSubmit={handleSearch} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="matricula">Matrícula:</label>
            <input
              id="matricula"
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(Number(e.target.value))}
              placeholder="Digite a matrícula"
              required
            />
          </div>
          <button type="submit" disabled={loading} className={styles.btn}>
            {loading ? "Carregando..." : "Pesquisar Documentos"}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        {documents && documents.length > 0 && !loading && (
          <section className={styles.results}>
            <h2>Documentos do Colaborador ({documents.length}):</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Nome</th>
                  <th>Convocação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc: any, idx: any) => {
                  return (
                    <tr key={idx}>
                      <td>{doc.personName || "N/A"}</td>
                      <td>{doc.name || doc.name || "N/A"}</td>
                      <td
                        dangerouslySetInnerHTML={{
                          __html: cleanHtml(doc.text || doc.text || "N/A"),
                        }}
                      />

                      <button
                        className={styles.downloadBtn}
                        onClick={() => handleDownload(doc.id, doc.name)}
                      >
                        <FaCloudDownloadAlt />
                      </button>
                    </tr>
                  );
                })}

                {/* {documents.map((doc: any, idx: any) => {
                  return (
                    <tr key={idx}>
                      <td>{doc.personName || "N/A"}</td>
                      <td>{doc.name || doc.name || "N/A"}</td>
                      <td
                        dangerouslySetInnerHTML={{
                          __html: doc.text || doc.text || "N/A",
                        }}
                      />
                      <td>
                        {doc.noticeStatusId === 2 && (
                          <button
                            onClick={() =>
                              handleDownload(doc.id, doc.personsExternalIds[0])
                            }
                          >
                            Baixar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })} */}
              </tbody>
            </table>

            <div className={styles.paginationContainer}>
              <button
                className={styles.paginationBtn}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                disabled={loading || currentPage === 0}
              >
                <FaArrowLeft />
              </button>

              <span>
                Página {currentPage + 1} {!hasNextPage && "(última página)"}
              </span>

              <button
                className={styles.paginationBtn}
                disabled={loading || !hasNextPage}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                <FaArrowRight />
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default MainPage;
