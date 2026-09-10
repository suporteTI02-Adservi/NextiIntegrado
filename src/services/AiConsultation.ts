import type { Task } from '../context/ExtractionContext';
import type { AiService } from './AiService';
import { getContextByteBudget } from './AiService';
import { AiDocumentCache, buildDocumentContext, type AiDocument } from '../utils/aiContext';
import { abortable } from '../utils/abortable';

interface Dependencies {
  loadTasks: () => Promise<Task[]>;
  startExtraction: (matricula: string) => Promise<void>;
  loadResults: (id: string) => Promise<unknown>;
  extractPdf: (blob: Blob, signal: AbortSignal) => Promise<string>;
  cleanHtml: (html: string) => string;
  ai: Pick<AiService, 'generateResponse'>;
}

interface ConsultationRequest {
  matricula: string | null;
  prompt: string;
  signal: AbortSignal;
  onProgress: (text: string) => void;
  onChunk: (text: string) => void;
}

/** One model request per question; document preparation is local and reusable. */
export class AiConsultation {
  private readonly cache = new AiDocumentCache();
  private readonly extractions = new Map<string, Promise<void>>();

  async answer({ matricula, prompt, signal, onProgress, onChunk }: ConsultationRequest, deps: Dependencies) {
    signal.throwIfAborted();
    const contextBudget = getContextByteBudget(prompt);
    if (!matricula && /\b(colaborador|funcion[aá]rio|sal[aá]rio|remunera[cç][aã]o|holerite|ctps|afastamento)\b/i.test(prompt)) {
      onChunk('Selecione o colaborador digitando @ seguido da matrícula antes da pergunta. Assim posso consultar os documentos corretos.');
      return { elapsedMs: 0, truncated: false };
    }
    let contextText = 'Nenhum contexto de documento anexado nesta mensagem.';
    if (matricula) {
      onProgress('Consultando o histórico de documentos...');
      let tasks = await abortable(deps.loadTasks(), signal);
      signal.throwIfAborted();
      this.cache.retain(tasks);
      let matching = tasks.filter(task => task.matricula === matricula && task.status === 'SUCCESS');
      if (!matching.length) {
        if (this.extractions.has(matricula) || tasks.some(task => task.matricula === matricula && task.status === 'PENDING')) {
          throw new Error('Os documentos deste colaborador estão sendo extraídos. Aguarde a conclusão no menu principal e tente novamente.');
        }
        onProgress('Buscando documentos no Senior. A extração também ficará no histórico...');
        const extraction = deps.startExtraction(matricula);
        this.extractions.set(matricula, extraction);
        void extraction.finally(() => this.extractions.delete(matricula)).catch(() => undefined);
        await abortable(extraction, signal);
        signal.throwIfAborted();
        tasks = await abortable(deps.loadTasks(), signal);
        signal.throwIfAborted();
        matching = tasks.filter(task => task.matricula === matricula && task.status === 'SUCCESS');
        if (!matching.length) {
          throw new Error('Não foi possível obter documentos deste colaborador. Confira o resultado da extração no menu principal.');
        }
      }

      const documents: AiDocument[] = [];
      for (const task of matching) {
        signal.throwIfAborted();
        const cached = this.cache.get(task.id, task.updated_at);
        if (cached) {
          onProgress('Reutilizando o texto dos documentos já lidos...');
          documents.push(...cached);
          continue;
        }
        const results = await abortable(deps.loadResults(task.id), signal);
        signal.throwIfAborted();
        if (!Array.isArray(results) || !results.length) {
          documents.push({ title: task.task_type, text: '' });
          continue;
        }
        const taskDocuments: AiDocument[] = [];
        for (let index = 0; index < results.length; index++) {
          signal.throwIfAborted();
          const report = results[index];
          const title = String(report?.title || report?.name || `Documento ${index + 1}`);
          onProgress(`Lendo documento ${index + 1} de ${results.length}: ${title}`);
          let text = '';
          if (task.task_type === 'convocacao') {
            text = typeof report?.text === 'string' ? deps.cleanHtml(report.text) : '';
          } else if (report?.blob instanceof Blob) {
            try { text = await abortable(deps.extractPdf(report.blob, signal), signal); }
            catch {
              signal.throwIfAborted();
              // Preserve the missing-source marker so a partial answer is explicit.
            }
          }
          signal.throwIfAborted();
          taskDocuments.push({ title, text });
        }
        this.cache.set(task.id, task.updated_at, taskDocuments);
        documents.push(...taskDocuments);
      }
      if (!documents.length) throw new Error('Nenhum documento disponível para esta análise.');
      const context = buildDocumentContext(documents, prompt, contextBudget);
      console.info('[IA] Contexto preparado', {
        documents: context.totalDocuments, selectedDocuments: context.selectedDocuments,
        unreadableDocuments: context.unreadable, partial: context.partial,
        contextBytes: new TextEncoder().encode(context.text).length,
      });
      contextText = context.text;
      if (context.partial) {
        onChunk(`> Análise de trechos de ${context.selectedDocuments} de ${context.totalDocuments} documentos. Para verificar outros dados, especifique o documento ou período.${context.unreadable ? ` Não foi possível ler ${context.unreadable} documento(s).` : ''}\n\n`);
      }
    }
    signal.throwIfAborted();
    const metrics = await deps.ai.generateResponse({
      prompt, contextText, signal, onChunk,
      onProgress: stage => onProgress(stage === 'waiting' ? 'Aguardando a resposta do servidor de IA...' : stage === 'processing' ? 'O servidor está processando a pergunta...' : 'Recebendo a resposta da IA...'),
    });
    signal.throwIfAborted();
    if (metrics.truncated) onChunk('\n\n> A resposta atingiu o limite de tamanho. Faça uma pergunta mais específica para detalhar.');
    return metrics;
  }
}
