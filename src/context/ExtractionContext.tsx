import React, { createContext, useContext, useState, useEffect } from 'react';
import { SoapService, ReportType } from '../services/SoapService';
import { NoticeService } from '../services/NoticeService';
import { invoke } from '@tauri-apps/api/core';

export interface ReportData {
  type: ReportType | string;
  title: string;
  blob: Blob | null;
  url: string | null;
  isDecimoTerceiro?: boolean;
  monthString?: string;
}

export type TaskType = 'documento' | 'convocacao' | 'holerite';
export type TaskStatus = 'PENDING' | 'SUCCESS' | 'ERROR';

export interface Task {
  id: string; // Ex: 'documento_123456', 'convocacao_123456' ou 'holerite_123456'
  task_type: TaskType;
  matricula: string;
  nome: string | null;
  status: TaskStatus;
  step: string;
  error_msg?: string;
  results?: string;
  updated_at: number;
}

interface ExtractionContextData {
  userCredentials: { usuario: string; senha: string } | null;
  setCredentials: (usuario: string, senha: string) => void;
  clearCredentials: () => void;
  tasks: Task[];
  loadTasks: () => Promise<void>;
  startDocumentoExtraction: (matricula: string) => Promise<void>;
  startConvocacaoSearch: (matricula: string) => Promise<void>;
  startHoleriteExtraction: (matricula: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTaskResults: (id: string) => Promise<any>;
}

const ExtractionContext = createContext<ExtractionContextData>({} as ExtractionContextData);

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToBlob = (base64: string, type: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
};

export const ExtractionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userCredentials, setUserCredentialsState] = useState<{ usuario: string; senha: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resultsCache, setResultsCache] = useState<Record<string, any>>({});

  const soapService = new SoapService();
  const noticeService = new NoticeService();

  useEffect(() => {
    // Carregar credenciais do localStorage ao iniciar
    const savedCreds = localStorage.getItem('rubiCredentials');
    if (savedCreds) {
      try {
        setUserCredentialsState(JSON.parse(savedCreds));
      } catch (e) {
        console.error("Erro ao carregar credenciais");
      }
    }
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const dbTasks = await invoke<Task[]>("get_tasks_db");
      setTasks(dbTasks);
    } catch (err) {
      console.error("Erro ao carregar tarefas do SQLite:", err);
    }
  };

  const setCredentials = (usuario: string, senha: string) => {
    const creds = { usuario, senha };
    setUserCredentialsState(creds);
    localStorage.setItem('rubiCredentials', JSON.stringify(creds));
  };

  const clearCredentials = () => {
    setUserCredentialsState(null);
    localStorage.removeItem('rubiCredentials');
  };

  const saveTask = async (
    id: string,
    taskType: TaskType,
    matricula: string,
    nome: string | null,
    status: TaskStatus,
    step: string,
    errorMsg?: string,
    resultsJson?: string
  ) => {
    try {
      await invoke("save_task_db", {
        id,
        taskType,
        matricula,
        nome,
        status,
        step,
        errorMsg: errorMsg || null,
        resultsJson: resultsJson || null,
      });
      await loadTasks();
    } catch (err) {
      console.error("Erro ao salvar tarefa no SQLite:", err);
    }
  };

  const startDocumentoExtraction = async (matricula: string) => {
    if (!userCredentials) {
      throw new Error("Credenciais não configuradas. Por favor, insira o usuário e senha.");
    }

    const taskId = `documento_${matricula}`;

    // 1. Iniciar tarefa no SQLite
    await saveTask(taskId, 'documento', matricula, null, 'PENDING', 'Consultando colaborador no Senior...');

    try {
      // 2. Buscar o nome do colaborador
      let nome: string | null = null;
      try {
        nome = await soapService.getColaboradorName(userCredentials.usuario, userCredentials.senha, matricula);
      } catch (e) {
        console.warn("Não foi possível buscar o nome do colaborador:", e);
      }

      await saveTask(taskId, 'documento', matricula, nome, 'PENDING', 'Buscando relatório de Afastamentos...');

      // 3. Buscar relatórios
      let blobAfastamentos: Blob | null = null;
      try {
        await saveTask(taskId, 'documento', matricula, nome, 'PENDING', 'Buscando relatório de Afastamentos...');
        blobAfastamentos = await soapService.getReport("AFASTAMENTOS", userCredentials.usuario, userCredentials.senha, matricula);
      } catch (e) { console.warn("Erro Afastamentos:", e); }

      let blobCTPS: Blob | null = null;
      try {
        await saveTask(taskId, 'documento', matricula, nome, 'PENDING', 'Buscando ficha CTPS...');
        blobCTPS = await soapService.getReport("CTPS", userCredentials.usuario, userCredentials.senha, matricula);
      } catch (e) { console.warn("Erro CTPS:", e); }

      let blobComprovante: Blob | null = null;
      try {
        await saveTask(taskId, 'documento', matricula, nome, 'PENDING', 'Buscando Comprovante Bancário...');
        blobComprovante = await soapService.getReport("COMPROVANTE_BANCARIO", userCredentials.usuario, userCredentials.senha, matricula);
      } catch (e) { console.warn("Erro Comprovante:", e); }

      let blobCTPSDigital: Blob | null = null;
      try {
        await saveTask(taskId, 'documento', matricula, nome, 'PENDING', 'Buscando CTPS Digital...');
        blobCTPSDigital = await soapService.getReport("CTPS_DIGITAL", userCredentials.usuario, userCredentials.senha, matricula);
      } catch (e) { console.warn("Erro CTPS Digital:", e); }

      await saveTask(taskId, 'documento', matricula, nome, 'PENDING', 'Salvando relatórios localmente...');

      // Converter blobs para base64 para persistir no SQLite
      const base64Afastamentos = blobAfastamentos ? await blobToBase64(blobAfastamentos) : null;
      const base64CTPS = blobCTPS ? await blobToBase64(blobCTPS) : null;
      const base64Comprovante = blobComprovante ? await blobToBase64(blobComprovante) : null;
      const base64CTPSDigital = blobCTPSDigital ? await blobToBase64(blobCTPSDigital) : null;

      // Salvar PDFs em disco usando o novo comando Rust (otimização)
      let pathAfastamentos: string | null = null;
      let pathCTPS: string | null = null;
      let pathComprovante: string | null = null;
      let pathCTPSDigital: string | null = null;
      try {
        if (base64Afastamentos) {
          pathAfastamentos = await invoke<string>("save_pdf_file", {
            base64Data: base64Afastamentos,
            fileName: `${matricula}_Afastamentos.pdf`,
            subFolder: matricula,
          });
        }
        if (base64CTPS) {
          pathCTPS = await invoke<string>("save_pdf_file", {
            base64Data: base64CTPS,
            fileName: `${matricula}_CTPS.pdf`,
            subFolder: matricula,
          });
        }
        if (base64Comprovante) {
          pathComprovante = await invoke<string>("save_pdf_file", {
            base64Data: base64Comprovante,
            fileName: `${matricula}_Comprovante_Bancario.pdf`,
            subFolder: matricula,
          });
        }
        if (base64CTPSDigital) {
          pathCTPSDigital = await invoke<string>("save_pdf_file", {
            base64Data: base64CTPSDigital,
            fileName: `${matricula}_CTPS_Digital.pdf`,
            subFolder: matricula,
          });
        }
      } catch (e) {
        console.warn("Não foi possível salvar PDFs em disco, usando base64 inline:", e);
      }

      // Payload com caminhos de arquivo em vez de base64 gigante
      const resultsPayload: any[] = [];
      const reports: ReportData[] = [];

      if (base64Afastamentos) {
        resultsPayload.push({
          type: "AFASTAMENTOS",
          title: "Afastamentos do Colaborador",
          ...(pathAfastamentos ? { filePath: pathAfastamentos } : { base64: base64Afastamentos })
        });
        reports.push({
          type: "AFASTAMENTOS",
          title: "Afastamentos do Colaborador",
          blob: blobAfastamentos,
          url: URL.createObjectURL(blobAfastamentos!)
        });
      }

      if (base64CTPS) {
        resultsPayload.push({
          type: "CTPS",
          title: "Ficha CTPS do Colaborador",
          ...(pathCTPS ? { filePath: pathCTPS } : { base64: base64CTPS })
        });
        reports.push({
          type: "CTPS",
          title: "Ficha CTPS do Colaborador",
          blob: blobCTPS,
          url: URL.createObjectURL(blobCTPS!)
        });
      }

      if (base64Comprovante) {
        resultsPayload.push({
          type: "COMPROVANTE_BANCARIO",
          title: "Comprovante Bancário",
          ...(pathComprovante ? { filePath: pathComprovante } : { base64: base64Comprovante })
        });
        reports.push({
          type: "COMPROVANTE_BANCARIO",
          title: "Comprovante Bancário",
          blob: blobComprovante,
          url: URL.createObjectURL(blobComprovante!)
        });
      }

      if (base64CTPSDigital) {
        resultsPayload.push({
          type: "CTPS_DIGITAL",
          title: "CTPS Digital",
          ...(pathCTPSDigital ? { filePath: pathCTPSDigital } : { base64: base64CTPSDigital })
        });
        reports.push({
          type: "CTPS_DIGITAL",
          title: "CTPS Digital",
          blob: blobCTPSDigital,
          url: URL.createObjectURL(blobCTPSDigital!)
        });
      }

      if (resultsPayload.length === 0) {
        throw new Error("Nenhum documento pôde ser encontrado para este colaborador.");
      }

      setResultsCache(prev => ({ ...prev, [taskId]: reports }));

      // Salvar como SUCCESS
      await saveTask(taskId, 'documento', matricula, nome, 'SUCCESS', 'Concluído', undefined, JSON.stringify(resultsPayload));
    } catch (err: any) {
      const errMsg = err.message || "Erro desconhecido";
      await saveTask(taskId, 'documento', matricula, null, 'ERROR', 'Falha na extração', errMsg);
    }
  };

  const startHoleriteExtraction = async (matricula: string) => {
    if (!userCredentials) {
      throw new Error("Credenciais não configuradas. Por favor, insira o usuário e senha.");
    }

    const taskId = `holerite_${matricula}`;

    // 1. Iniciar tarefa no SQLite
    await saveTask(taskId, 'holerite', matricula, null, 'PENDING', 'Consultando colaborador no Senior...');

    try {
      // 2. Buscar o nome do colaborador
      let nome: string | null = null;
      try {
        nome = await soapService.getColaboradorName(userCredentials.usuario, userCredentials.senha, matricula);
      } catch (e) {
        console.warn("Não foi possível buscar o nome do colaborador:", e);
      }

      // 3. Buscar histórico de holerites (Normal)
      await saveTask(taskId, 'holerite', matricula, nome, 'PENDING', `Buscando histórico de holerites normais...`);

      const resultsPayload: any[] = [];
      const reports: ReportData[] = [];

      try {
        const resultNormal = await soapService.getHolerite(userCredentials.usuario, userCredentials.senha, matricula, false);

        // Salvar PDF consolidado em disco
        let pathNormal: string | null = null;
        try {
          pathNormal = await invoke<string>("save_pdf_file", {
            base64Data: resultNormal.base64,
            fileName: `${matricula}_Holerite_Normal_Consolidado.pdf`,
            subFolder: `${matricula}/holerites`,
          });
        } catch (e) {
          console.warn("Não foi possível salvar holerite normal consolidado em disco:", e);
        }

        resultsPayload.push({
          type: "HOLERITE_CONSOLIDADO",
          title: `Histórico de Holerites`,
          ...(pathNormal ? { filePath: pathNormal } : { base64: resultNormal.base64 })
        });

        // Passar o PDF consolidado diretamente para a UI
        const blobNormal = base64ToBlob(resultNormal.base64, "application/pdf");
        reports.push({
          type: "HOLERITE_CONSOLIDADO",
          title: "Histórico de Holerites",
          blob: blobNormal,
          url: URL.createObjectURL(blobNormal),
          isDecimoTerceiro: false,
        });
      } catch (e: any) {
        console.warn(`Aviso: Erro ao buscar histórico de holerites normais: ${e.message}`);
      }

      // 4. Buscar histórico de 13º salário
      await saveTask(taskId, 'holerite', matricula, nome, 'PENDING', `Buscando histórico de 13º salário...`);
      try {
        const resultDecimo = await soapService.getHolerite(userCredentials.usuario, userCredentials.senha, matricula, true);

        // Salvar PDF consolidado em disco
        let pathDecimo: string | null = null;
        try {
          pathDecimo = await invoke<string>("save_pdf_file", {
            base64Data: resultDecimo.base64,
            fileName: `${matricula}_13_Salario_Consolidado.pdf`,
            subFolder: `${matricula}/holerites`,
          });
        } catch (e) {
          console.warn("Não foi possível salvar 13º salário consolidado em disco:", e);
        }

        resultsPayload.push({
          type: "DECIMO_CONSOLIDADO",
          title: `Histórico de 13º Salário`,
          ...(pathDecimo ? { filePath: pathDecimo } : { base64: resultDecimo.base64 })
        });

        // Passar o PDF consolidado diretamente para a UI
        const blobDecimo = base64ToBlob(resultDecimo.base64, "application/pdf");
        reports.push({
          type: "DECIMO_CONSOLIDADO",
          title: "Histórico de 13º Salário",
          blob: blobDecimo,
          url: URL.createObjectURL(blobDecimo),
          isDecimoTerceiro: true,
        });
      } catch (e: any) {
        console.warn(`Aviso: Erro ao buscar histórico de 13º salário: ${e.message}`);
      }

      if (resultsPayload.length === 0) {
        throw new Error("Nenhum holerite ou 13º salário encontrado para este colaborador.");
      }

      setResultsCache(prev => ({ ...prev, [taskId]: reports }));

      const finalStep = 'Concluído';

      await saveTask(taskId, 'holerite', matricula, nome, 'SUCCESS', finalStep, undefined, JSON.stringify(resultsPayload));
    } catch (err: any) {
      const errMsg = err.message || "Erro desconhecido";
      await saveTask(taskId, 'holerite', matricula, null, 'ERROR', 'Falha na extração de holerites', errMsg);
    }
  };

  const startConvocacaoSearch = async (matricula: string) => {
    const taskId = `convocacao_${matricula}`;

    await saveTask(taskId, 'convocacao', matricula, null, 'PENDING', 'Obtendo ID do colaborador no Nexti...');

    try {
      // 1. Obter ID do colaborador no Nexti
      const id = await noticeService.getColab(Number(matricula));
      if (!id) {
        throw new Error("Colaborador não encontrado no Nexti.");
      }

      await saveTask(taskId, 'convocacao', matricula, null, 'PENDING', 'Buscando nome do colaborador no Senior...');

      // Buscar dados adicionais do colaborador para obter o nome
      let nome: string | null = null;
      if (userCredentials) {
        try {
          nome = await soapService.getColaboradorName(userCredentials.usuario, userCredentials.senha, matricula);
        } catch (e) {
          console.warn("Erro ao buscar nome via SOAP:", e);
        }
      }

      if (!nome) {
        try {
          const colabInfo = await invoke<any>("get_colaborador", { externalId: Number(matricula) });
          if (colabInfo && colabInfo.person && colabInfo.person.name) {
            nome = colabInfo.person.name;
          }
        } catch (e) {
          console.warn("Não foi possível carregar o nome pelo Nexti:", e);
        }
      }

      await saveTask(taskId, 'convocacao', matricula, nome, 'PENDING', 'Buscando convocações na API Nexti...');

      // 2. Buscar convocações
      const response = await noticeService.getDocuments(Number(matricula), 0);

      let documentsList: any[] = [];
      if (response && Array.isArray(response)) {
        documentsList = response.map((doc: any) => ({
          personName: doc.personName || "N/A",
          id: doc.id || null,
          name: doc.name || "N/A",
          text: doc.text || "N/A",
          idNoticePerson: doc.idNoticePerson || null,
        }));
      }

      setResultsCache(prev => ({ ...prev, [taskId]: documentsList }));

      // 3. Salvar no SQLite
      await saveTask(taskId, 'convocacao', matricula, nome, 'SUCCESS', 'Concluído', undefined, JSON.stringify(documentsList));
    } catch (err: any) {
      const errMsg = err.message || "Erro desconhecido";
      await saveTask(taskId, 'convocacao', matricula, null, 'ERROR', 'Falha na busca', errMsg);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await invoke("delete_task_db", { id });

      // Revogar URLs do cache se houver
      const cached = resultsCache[id];
      if (cached && Array.isArray(cached)) {
        cached.forEach((r: any) => {
          if (r.url) URL.revokeObjectURL(r.url);
        });
      }

      setResultsCache(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      await loadTasks();
    } catch (err) {
      console.error("Erro ao deletar tarefa do SQLite:", err);
    }
  };

  const getTaskResults = async (id: string): Promise<any> => {
    if (resultsCache[id]) {
      return resultsCache[id];
    }

    try {
      const jsonStr = await invoke<string | null>("get_task_results_db", { id });
      if (!jsonStr) return null;

      const parsed = JSON.parse(jsonStr);

      if (id.startsWith('documento_') || id.startsWith('holerite_')) {
        const allReports: any[] = [];
        for (const r of parsed) {
          let base64 = r.base64;
          if (r.filePath) {
            try {
              base64 = await invoke<string>("read_pdf_file", { filePath: r.filePath });
            } catch (e) {
              console.error("Erro ao carregar PDF do disco:", e);
              continue;
            }
          }

          if (!base64) continue;

          // Sem separação, renderiza o PDF consolidado diretamente
          const blob = base64ToBlob(base64, "application/pdf");
          allReports.push({
            type: r.type,
            title: r.title,
            blob: blob,
            url: URL.createObjectURL(blob)
          });
        }

        setResultsCache(prev => ({ ...prev, [id]: allReports }));
        return allReports;
      } else {
        // Para convocação, retorna a lista de documentos diretamente
        setResultsCache(prev => ({ ...prev, [id]: parsed }));
        return parsed;
      }
    } catch (err) {
      console.error("Erro ao carregar resultados da tarefa do SQLite:", err);
      return null;
    }
  };

  return (
    <ExtractionContext.Provider value={{
      userCredentials,
      setCredentials,
      clearCredentials,
      tasks,
      loadTasks,
      startDocumentoExtraction,
      startConvocacaoSearch,
      startHoleriteExtraction,
      deleteTask,
      getTaskResults
    }}>
      {children}
    </ExtractionContext.Provider>
  );
};

export const useExtraction = () => useContext(ExtractionContext);
