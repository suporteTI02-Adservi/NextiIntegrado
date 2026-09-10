import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useExtraction } from '../../context/ExtractionContext';
import { aiService } from '../../services/AiService';
import { AiConsultation } from '../../services/AiConsultation';
import { invoke } from '@tauri-apps/api/core';
import type { Task } from '../../context/ExtractionContext';
import { extractTextFromPdf } from '../../utils/pdfUtils';
import { FaPaperPlane, FaRobot, FaUser, FaTimes, FaCommentDots, FaSpinner } from 'react-icons/fa';
import styles from './ChatModal.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const ChatModal: React.FC = () => {
  const extraction = useExtraction();
  const extractionRef = useRef(extraction);
  extractionRef.current = extraction;
  const consultationRef = useRef(new AiConsultation());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', role: 'assistant', content: 'Olá! Como posso ajudar você hoje? Se quiser consultar documentos de um colaborador, digite @ seguido da matrícula (até 9 dígitos) no início da mensagem (ex: @190000197).' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [activeMatricula, setActiveMatricula] = useState<string | null>(null);

  const showToolsMenu = inputValue.includes('@') && !activeMatricula;
  const availableTools = [
    { name: 'Consultar Documentos (@)', description: 'Digite @ e a matrícula (ex: @190000197) para ler documentos do colaborador na conversa.' }
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingText, isOpen]);

  // Monitora input para criar a Tag visual azul
  useEffect(() => {
    const match = inputValue.match(/^@(\d{1,9})\s/);
    if (match && match[1]) {
      setActiveMatricula(match[1]);
      setInputValue(inputValue.replace(/^@\d{1,9}\s*/, ''));
    }
  }, [inputValue]);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const handleSend = async () => {
    if (abortControllerRef.current || (!inputValue.trim() && !activeMatricula)) return;
    // Accept a pasted @matricula even when no space was entered after it.
    const mention = inputValue.trim().match(/^@(\d{1,9})(?:\s+(.*))?$/s);
    const matricula = mention?.[1] ?? activeMatricula;
    const prompt = (mention ? mention[2]?.trim() : inputValue.trim()) || (matricula ? 'Resuma as informações e documentos deste colaborador.' : '');
    if (!prompt) return;
    if (mention) setActiveMatricula(matricula);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const id = crypto.randomUUID();
    const isCurrent = () => abortControllerRef.current === controller;
    let extractionStarted = false;
    setMessages(prev => [...prev,
      { id: `${id}-user`, role: 'user', content: matricula ? `[@${matricula}] ${prompt}` : prompt },
      { id, role: 'assistant', content: '' },
    ]);
    setInputValue('');
    setIsLoading(true);
    setElapsedSeconds(0);
    setLoadingText('Preparando a consulta...');
    const startedAt = performance.now();
    const timer = setInterval(() => {
      if (isCurrent()) setElapsedSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 1000);
    const append = (text: string) => {
      if (isCurrent() && !controller.signal.aborted) {
        setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, content: msg.content + text } : msg));
      }
    };
    try {
      await consultationRef.current.answer({
        matricula, prompt, signal: controller.signal, onChunk: append,
        onProgress: text => { if (isCurrent() && !controller.signal.aborted) setLoadingText(text); },
      }, {
        loadTasks: () => invoke<Task[]>('get_tasks_db'),
        startExtraction: value => {
          extractionStarted = true;
          return extractionRef.current.startDocumentoExtraction(value);
        },
        loadResults: id => extractionRef.current.getTaskResults(id),
        extractPdf: extractTextFromPdf,
        cleanHtml: html => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          doc.querySelectorAll('script, style').forEach(node => node.remove());
          return doc.body.textContent?.trim() || '';
        },
        ai: aiService,
      });
    } catch (error) {
      if (isCurrent()) {
        const detail = controller.signal.aborted
          ? `Consulta cancelada.${extractionStarted ? ' A extração já iniciada no Senior continuará no histórico.' : ''}`
          : error instanceof Error ? error.message : 'Não foi possível concluir a consulta à IA.';
        setMessages(prev => prev.map(msg => msg.id === id
          ? { ...msg, content: msg.content ? `${msg.content}\n\n**Resposta interrompida:** ${detail}` : detail }
          : msg));
      }
    } finally {
      clearInterval(timer);
      // A cancelled request must never reset the state of a newer one.
      if (isCurrent()) {
        abortControllerRef.current = null;
        setIsLoading(false);
        setLoadingText('');
      }
    }
  };

  const cancelRequest = () => {
    abortControllerRef.current?.abort();
    // Keep this request active until its cancellation has been handled.
    setLoadingText('Cancelando a consulta...');
  };
  return (
    <>
      {/* Botão Flutuante Inferior Direito */}
      <button 
        className={`${styles.fabChat} ${isOpen ? styles.fabHidden : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <span className={styles.fabBlob1} aria-hidden="true" />
        <span className={styles.fabBlob2} aria-hidden="true" />
        <span className={styles.fabBlob3} aria-hidden="true" />
        <span className={styles.fabContent}>
          <FaCommentDots /> Assistente IA
        </span>
      </button>

      {isOpen && (
        <div className={styles.backdropBlur} onClick={() => setIsOpen(false)}></div>
      )}

      {/* Modal / Pop-over do Chat */}
      <div className={`${styles.chatModalContainer} ${isOpen ? styles.chatModalOpen : ''}`}>
        <header className={styles.chatHeader}>
          <span className={styles.headerBlob1} aria-hidden="true" />
          <span className={styles.headerBlob2} aria-hidden="true" />
          <div className={styles.headerTitle}>
            <FaRobot className={styles.headerIcon} />
            <h2>Assistente de IA</h2>
          </div>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.messagesArea}>
          {messages.map(msg => (
            <div key={msg.id} className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.wrapperUser : styles.wrapperAssistant}`}>
              <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                <div className={styles.messageIcon}>
                  {msg.role === 'user' ? <FaUser /> : <FaRobot />}
                </div>
                <div className={styles.messageContent}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && loadingText && (
            <div className={styles.loadingIndicator}>
              <FaSpinner className={styles.spinner} />
              <span role="status" aria-live="polite">{loadingText} ({elapsedSeconds}s)</span>
              <button onClick={cancelRequest} className={styles.cancelBtn}>Parar</button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          {showToolsMenu && (
            <div className={styles.toolsPopup}>
              <div className={styles.toolsHeader}>Ferramentas Disponíveis</div>
              <div className={styles.toolsList}>
                {availableTools.map((tool, idx) => (
                  <div key={idx} className={styles.toolItem} onClick={() => setInputValue('@')}>
                    <div className={styles.toolName}>{tool.name}</div>
                    <div className={styles.toolDesc}>{tool.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMatricula && (
            <div className={styles.activeMatriculaPill}>
              <FaUser /> Contexto Matrícula: {activeMatricula}
              <button type="button" disabled={isLoading} onClick={() => setActiveMatricula(null)}><FaTimes /></button>
            </div>
          )}

          <form 
            className={styles.inputWrapper} 
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleSend(); 
            }}
          >
            <input 
              type="text" 
              placeholder="Digite sua mensagem ou @..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit"
              className={styles.sendBtn} 
              disabled={isLoading || (!inputValue.trim() && !activeMatricula)}
            >
              <FaPaperPlane />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

