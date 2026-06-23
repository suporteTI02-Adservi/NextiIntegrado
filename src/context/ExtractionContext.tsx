import React, { createContext, useContext, useState, useEffect } from 'react';
import { SoapService, ReportType } from '../services/SoapService';
import { NoticeService } from '../services/NoticeService';
import { invoke } from '@tauri-apps/api/core';
import { splitHoleritePdf } from '../utils/pdfUtils';

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
      const blobAfastamentos = await soapService.getReport("AFASTAMENTOS", userCredentials.usuario, userCredentials.senha, matricula);
      
      await saveTask(taskId, 'documento', matricula, nome, 'PENDING', 'Buscando ficha CTPS...');
      
      const blobCTPS = await soapService.getReport("CTPS", userCredentials.usuario, userCredentials.senha, matricula);

      await saveTask(taskId, 'documento', matricula, nome, 'PENDING', 'Salvando relatórios localmente...');

      // Converter blobs para base64 para persistir no SQLite
      const base64Afastamentos = await blobToBase64(blobAfastamentos);
      const base64CTPS = await blobToBase64(blobCTPS);

      // Salvar PDFs em disco usando o novo comando Rust (otimização)
      let pathAfastamentos: string | null = null;
      let pathCTPS: string | null = null;
      try {
        pathAfastamentos = await invoke<string>("save_pdf_file", {
          base64Data: base64Afastamentos,
          fileName: `${matricula}_Afastamentos.pdf`,
          subFolder: matricula,
        });
        pathCTPS = await invoke<string>("save_pdf_file", {
          base64Data: base64CTPS,
          fileName: `${matricula}_CTPS.pdf`,
          subFolder: matricula,
        });
      } catch (e) {
        console.warn("Não foi possível salvar PDFs em disco, usando base64 inline:", e);
      }

      // Payload com caminhos de arquivo em vez de base64 gigante
      const resultsPayload = [
        { 
          type: "AFASTAMENTOS", 
          title: "Afastamentos do Colaborador", 
          ...(pathAfastamentos ? { filePath: pathAfastamentos } : { base64: base64Afastamentos })
        },
        { 
          type: "CTPS", 
          title: "Ficha CTPS do Colaborador", 
          ...(pathCTPS ? { filePath: pathCTPS } : { base64: base64CTPS })
        }
      ];

      // Reconstruir no cache em memória com URLs
      const reports: ReportData[] = [
        {
          type: "AFASTAMENTOS",
          title: "Afastamentos do Colaborador",
          blob: blobAfastamentos,
          url: URL.createObjectURL(blobAfastamentos)
        },
        {
          type: "CTPS",
          title: "Ficha CTPS do Colaborador",
          blob: blobCTPS,
          url: URL.createObjectURL(blobCTPS)
        }
      ];

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

        // Dividir em pedaços para a UI
        const chunks = await splitHoleritePdf(resultNormal.base64, false);
        for (const chunk of chunks) {
          reports.push({
            type: "HOLERITE",
            title: chunk.title,
            blob: chunk.blob,
            url: URL.createObjectURL(chunk.blob),
            isDecimoTerceiro: chunk.isDecimoTerceiro,
            monthString: chunk.monthString
          });
        }
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

        // Dividir em pedaços para a UI
        const chunks = await splitHoleritePdf(resultDecimo.base64, true);
        for (const chunk of chunks) {
          reports.push({
            type: "HOLERITE",
            title: chunk.title,
            blob: chunk.blob,
            url: URL.createObjectURL(chunk.blob),
            isDecimoTerceiro: chunk.isDecimoTerceiro,
            monthString: chunk.monthString
          });
        }
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
        // Reconstrói Blobs e Blob URLs a partir de base64 ou filePath
        const reports = await Promise.all(parsed.map(async (r: any) => {
          if (r.filePath) {
            // Carregar do disco via comando Rust
            try {
              const base64 = await invoke<string>("read_pdf_file", { filePath: r.filePath });
              const blob = base64ToBlob(base64, "application/pdf");
              return {
                type: r.type,
                title: r.title,
                blob: blob,
                url: URL.createObjectURL(blob)
              };
            } catch (e) {
              console.error("Erro ao carregar PDF do disco:", e);
              return { type: r.type, title: r.title, blob: null, url: null };
            }
          } else if (r.base64) {
            const blob = base64ToBlob(r.base64, "application/pdf");
            return {
              type: r.type,
              title: r.title,
              blob: blob,
              url: URL.createObjectURL(blob)
            };
          }
          return r;
        }));

        setResultsCache(prev => ({ ...prev, [id]: reports }));
        return reports;
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
