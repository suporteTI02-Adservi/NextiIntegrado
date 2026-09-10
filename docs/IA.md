# Consultas à IA

O chat prepara os documentos localmente e faz **uma chamada à IA por pergunta**. Não há mais uma chamada de resumo por documento antes da resposta final. O modelo configurado continua sendo `qwen3.8:latest`, com `think: false`.

## Fluxo

1. Consultar o histórico atual no SQLite. Sem documentos prontos, iniciar a extração no Senior; uma extração pendente não é duplicada.
2. Ler os PDFs e limpar o HTML das convocações. Reutilizar textos já lidos enquanto a revisão `updated_at` da tarefa não mudar.
3. Reconstruir as linhas visuais do PDF, mantendo rótulos e valores juntos. Para conjuntos grandes, selecionar trechos relacionados à pergunta, sem preencher o contexto com avisos irrelevantes. Perguntas simples sobre salário contratual priorizam a CTPS Digital quando esse campo está legível; perguntas sobre histórico, diferenças e descontos mantêm uma seleção mais ampla. A interface identifica a cobertura parcial.
4. Enviar uma chamada e mostrar a resposta conforme ela chega.

O cache existe apenas na memória da sessão, limitado a seis tarefas e um milhão de caracteres por tarefa. Documentos que falharam na leitura não ficam no cache. A exclusão ou atualização de uma tarefa invalida sua entrada na próxima consulta.

A seleção por termos não é uma busca semântica e pode omitir informações de documentos longos. A IA recebe instruções para não tratar trechos como o histórico completo, especialmente em perguntas sobre totais ou ausência de registros. Perguntas com documento e período específicos ajudam na seleção. PDFs sem texto precisam de OCR, que este fluxo não implementa.

## Cancelamento e erros

O botão **Parar** cancela a espera e a chamada HTTP, interrompe a leitura de PDFs e impede que a consulta avance para a IA. Uma extração já iniciada no Senior continua no histórico: essa operação pertence ao fluxo de extrações e não tem cancelamento nativo.

O serviço usa limites de 90 segundos sem dados e 180 segundos por chamada. Trata erros HTTP, erros dentro do stream, JSON inválido, resposta vazia e conexão encerrada antes do registro `done`. Também processa o último registro sem quebra de linha e finaliza em `done`, sem aguardar o proxy fechar a conexão. Respostas interrompidas ou limitadas em tamanho são identificadas na conversa.

## Diagnóstico e validação

O console registra `[IA] Contexto preparado` com quantidades de documentos e bytes, e `[IA] Tempos da consulta (ms)` com tempo até os headers, primeiro texto, tempo total e, quando enviados pela API, tempo total do servidor, carregamento do modelo, processamento do contexto, geração e contagens de tokens, inclusive de cache. Não registra textos dos documentos nem credenciais.

`AiHttpTransport.ts` usa os comandos do plugin HTTP já instalado, mantendo sua verificação de URLs permitidas. As leituras nativas ocorrem sob demanda, sem antecipar a próxima leitura após `done`. O controle do recurso evita fechar duas vezes o corpo após EOF ou cancelamento. Esse contrato deve ser conferido ao atualizar o plugin HTTP.

Arquivos principais: `src/services/AiConsultation.ts` (fluxo), `src/services/AiService.ts` (HTTP e stream), `src/utils/aiContext.ts` (seleção e cache), `src/utils/pdfUtils.ts` (leitura de PDF) e `src/components/ChatModal/ChatModal.tsx` (interface).

Execute `npm run test:ai` para os testes locais com dados sintéticos e transporte simulado; eles não acessam o Senior, o servidor de IA nem o `.env`. Execute `npm run build` para a compilação de produção. O teste real no aplicativo Tauri ainda é necessário para medir a latência do modelo, do hardware e do proxy.

Contrato de resposta: [Ollama Generate](https://docs.ollama.com/api/generate) e [Streaming](https://docs.ollama.com/api/streaming).
