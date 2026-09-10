import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runInThisContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

// Execute the production TS in-process, including in Windows environments that
// disallow spawning esbuild/test workers. Credentials and native HTTP are injected.
const modules = new Map();
function loadTypeScript(path) {
  if (modules.has(path)) return modules.get(path).exports;
  const module = { exports: {} };
  modules.set(path, module);
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    transformers: { before: [context => {
      const visit = node => ts.isPropertyAccessExpression(node) && ts.isMetaProperty(node.expression) && node.name.text === 'env'
        ? ts.factory.createObjectLiteralExpression([])
        : ts.visitEachChild(node, visit, context);
      return source => ts.visitNode(source, visit);
    }] },
  });
  const require = specifier => {
    if (specifier === '@tauri-apps/api/core') return { invoke() { throw new Error('Native IPC must be injected in tests'); } };
    if (specifier === '@tauri-apps/plugin-http') return { fetch() { throw new Error('Native transport must be injected in tests'); } };
    if (specifier.startsWith('.')) return loadTypeScript(resolve(dirname(path), `${specifier}.ts`));
    throw new Error(`Unexpected dependency: ${specifier}`);
  };
  runInThisContext(`(function(require, exports, module) { ${outputText}\n})`, { filename: path })(require, module.exports, module);
  return module.exports;
}
const root = fileURLToPath(new URL('../', import.meta.url));
const { AiService, getContextByteBudget } = loadTypeScript(resolve(root, 'src/services/AiService.ts'));
const { AiConsultation } = loadTypeScript(resolve(root, 'src/services/AiConsultation.ts'));
const { buildDocumentContext } = loadTypeScript(resolve(root, 'src/utils/aiContext.ts'));
const { createAiTransport } = loadTypeScript(resolve(root, 'src/services/AiHttpTransport.ts'));
const { extractPageText } = loadTypeScript(resolve(root, 'src/utils/pdfText.ts'));
const credentials = () => ({ clientId: 'test-id', clientSecret: 'test-secret' });
const encoder = new TextEncoder();
const request = { prompt: 'Resuma.', contextText: 'Documento de teste.', onChunk() {} };

function streamResponse(records, { trailingNewline = true, fragment = false, stayOpen = false, onCancel = () => {} } = {}) {
  const text = records.map(record => typeof record === 'string' ? record : JSON.stringify(record)).join('\n') + (trailingNewline ? '\n' : '');
  const data = encoder.encode(text);
  return new Response(new ReadableStream({
    start(controller) {
      if (fragment) for (const byte of data) controller.enqueue(Uint8Array.of(byte));
      else if (data.length) controller.enqueue(data);
      if (!stayOpen) controller.close();
    },
    cancel: onCancel,
  }), { headers: { 'content-type': 'application/x-ndjson' } });
}

test('stream fragmentado preserva UTF-8 e último registro sem quebra de linha', async () => {
  let body;
  let result = '';
  const service = new AiService(async (_url, init) => {
    body = JSON.parse(init.body);
    return streamResponse([
      { thinking: 'processando', done: false },
      { response: 'Informação: ' },
      { response: 'R$ 100,00.', done: true, load_duration: 2e6, prompt_eval_duration: 3e6, eval_duration: 4e6 },
    ], { trailingNewline: false, fragment: true });
  }, credentials);
  const metrics = await service.generateResponse({ ...request, onChunk: chunk => { result += chunk; } });
  assert.equal(result, 'Informação: R$ 100,00.');
  assert.equal(body.think, false);
  assert.equal(body.options.repeat_penalty, 1.1);
  assert.equal(body.options.repeat_penality, undefined);
  assert.equal(metrics.promptMs, 3);
});

test('encerra ao receber done sem aguardar o proxy fechar a conexão', async () => {
  let cancelled = false;
  const service = new AiService(async () => streamResponse([{ response: 'OK', done: true }], { stayOpen: true, onCancel: () => { cancelled = true; } }), credentials);
  await service.generateResponse(request);
  assert.equal(cancelled, true);
});

for (const [name, records, expected] of [
  ['erro dentro do stream', [{ error: 'model unavailable' }], /model unavailable/],
  ['JSON inválido', ['invalid-json'], /resposta inválida/],
  ['resposta vazia', [{ done: true }], /sem produzir/],
  ['apenas raciocínio', [{ thinking: 'teste', done: true }], /sem produzir/],
  ['conexão interrompida', [{ response: 'Parcial' }], /antes de concluir/],
]) {
  test(`informa ${name}`, async () => {
    const service = new AiService(async () => streamResponse(records), credentials);
    await assert.rejects(service.generateResponse(request), expected);
  });
}

test('não oculta erros HTTP ou uma página de login do proxy', async () => {
  await assert.rejects(new AiService(async () => new Response('denied', { status: 403 }), credentials).generateResponse(request), /HTTP 403/);
  await assert.rejects(new AiService(async () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }), credentials).generateResponse(request), /página HTML/);
});

test('cancelamento é imediato mesmo quando o transporte nativo não resolve', async () => {
  const controller = new AbortController();
  const service = new AiService(() => new Promise(() => {}), credentials);
  const promise = service.generateResponse({ ...request, signal: controller.signal });
  controller.abort();
  await assert.rejects(promise, { name: 'AbortError' });
});

test('cancelamento durante a resposta preserva a interrupção', async () => {
  const controller = new AbortController();
  const service = new AiService(async () => streamResponse([{ response: 'início' }], { stayOpen: true }), credentials);
  await assert.rejects(service.generateResponse({ ...request, signal: controller.signal, onChunk() { controller.abort(); } }), { name: 'AbortError' });
});

test('cancelar no primeiro registro impede emissão dos demais registros do mesmo pacote', async () => {
  const controller = new AbortController();
  let text = '';
  const service = new AiService(async () => streamResponse([{ response: 'primeiro' }, { response: 'segundo', done: true }]), credentials);
  await assert.rejects(service.generateResponse({ ...request, signal: controller.signal, onChunk(chunk) { text += chunk; controller.abort(); } }), { name: 'AbortError' });
  assert.equal(text, 'primeiro');
});

test('limite de inatividade cobre espera por headers e leitura do corpo', async () => {
  const timing = { idleMs: 20, totalMs: 200 };
  await assert.rejects(new AiService(() => new Promise(() => {}), credentials, timing).generateResponse(request), { name: 'TimeoutError' });
  await assert.rejects(new AiService(async () => streamResponse([], { trailingNewline: false, stayOpen: true }), credentials, timing).generateResponse(request), { name: 'TimeoutError' });
});

test('limite total interrompe um servidor que envia dados sem terminar', async () => {
  let timer;
  const service = new AiService(async () => new Response(new ReadableStream({
    start(controller) { timer = setInterval(() => controller.enqueue(encoder.encode('{"thinking":"..."}\n')), 5); },
    cancel() { clearInterval(timer); },
  })), credentials, { idleMs: 100, totalMs: 30 });
  await assert.rejects(service.generateResponse(request), { name: 'TimeoutError' });
});

test('não faz chamada com credenciais ausentes ou contexto excessivo', async () => {
  let calls = 0;
  const transport = async () => { calls++; return new Response(); };
  await assert.rejects(new AiService(transport, () => ({})).generateResponse(request), /Credenciais/);
  await assert.rejects(new AiService(transport, credentials).generateResponse({ ...request, contextText: 'x'.repeat(8000) }), /limite de contexto/);
  assert.equal(calls, 0);
});

test('seleção encontra dados no final de documento longo e respeita bytes UTF-8', () => {
  const documents = [{ title: 'Histórico', text: 'Informações gerais. '.repeat(2000) + ' Competência 09/2026: vale transporte de R$ 350,00.' }];
  const question = 'Qual o vale transporte em 09/2026?';
  const limit = getContextByteBudget(question);
  const context = buildDocumentContext(documents, question, limit);
  assert.equal(context.partial, true);
  assert.match(context.text, /R\$ 350,00/);
  assert.ok(encoder.encode(context.text).length <= limit);
  const multibyte = buildDocumentContext([{ title: 'Acentuação', text: 'ação 漢字 '.repeat(2000) }], 'ação', 5000);
  assert.ok(encoder.encode(multibyte.text).length <= 5000);
});

test('conjunto pequeno usa todos os textos e fonte ilegível torna cobertura parcial', () => {
  const docs = [{ title: 'CTPS', text: 'Admissão em 01/01/2020.' }, { title: 'Afastamentos', text: 'Nenhum registro.' }];
  const complete = buildDocumentContext(docs, 'Resuma', 5000);
  assert.equal(complete.partial, false);
  assert.match(complete.text, /Admissão/);
  assert.match(complete.text, /Nenhum registro/);
  const partial = buildDocumentContext([...docs, { title: 'Digitalizado', text: '' }], 'Resuma', 5000);
  assert.equal(partial.partial, true);
  assert.equal(partial.unreadable, 1);
  assert.throws(() => buildDocumentContext([{ title: 'Digitalizado', text: '' }], 'Resuma', 5000), /OCR/);
});

function fixture() {
  const counters = { ai: 0, pdf: 0, load: 0, extraction: 0 };
  let tasks = [{ id: 'documento_123', matricula: '123', task_type: 'documento', status: 'SUCCESS', updated_at: 1 }];
  const contexts = [];
  const deps = {
    loadTasks: async () => tasks,
    startExtraction: async () => { counters.extraction++; },
    loadResults: async () => { counters.load++; return [
      { title: 'CTPS', blob: new Blob(['Admissão em 01/01/2020.']) },
      { title: 'Afastamentos', blob: new Blob(['Nenhum afastamento.']) },
    ]; },
    extractPdf: async blob => { counters.pdf++; return blob.text(); },
    cleanHtml: html => html.replace(/<[^>]*>/g, ''),
    ai: { generateResponse: async ({ contextText, onChunk }) => { counters.ai++; contexts.push(contextText); onChunk('Resposta de teste.'); return { truncated: false }; } },
  };
  const consultation = new AiConsultation();
  const ask = (extra = {}) => consultation.answer({ matricula: '123', prompt: 'Qual a admissão?', signal: new AbortController().signal, onProgress() {}, onChunk() {}, ...extra }, deps);
  return { ask, deps, counters, contexts, setTasks: value => { tasks = value; }, getTasks: () => tasks };
}

test('vários documentos geram uma chamada e segunda pergunta reutiliza os textos', async () => {
  const f = fixture();
  await f.ask();
  await f.ask({ prompt: 'Há afastamentos?' });
  assert.deepEqual(f.counters, { ai: 2, pdf: 2, load: 1, extraction: 0 });
  assert.match(f.contexts[0], /Admissão/);
});

test('nova extração invalida o cache; outra matrícula não recebe dados anteriores', async () => {
  const f = fixture();
  await f.ask();
  f.setTasks([{ ...f.getTasks()[0], updated_at: 2 }]);
  f.deps.loadResults = async () => [{ title: 'CTPS', blob: new Blob(['Contrato atualizado.']) }];
  await f.ask();
  assert.match(f.contexts[1], /Contrato atualizado/);
  assert.doesNotMatch(f.contexts[1], /Admissão/);
  f.setTasks([{ id: 'documento_456', matricula: '456', task_type: 'documento', status: 'SUCCESS', updated_at: 1 }]);
  f.deps.loadResults = async () => [{ title: 'CTPS', blob: new Blob(['Outro colaborador.']) }];
  await f.ask({ matricula: '456' });
  assert.doesNotMatch(f.contexts[2], /Contrato atualizado|Admissão/);
});

test('cancelar leitura de PDF impede qualquer chamada posterior à IA', async () => {
  const f = fixture();
  const controller = new AbortController();
  f.deps.extractPdf = async () => { controller.abort(); return 'Texto antigo'; };
  await assert.rejects(f.ask({ signal: controller.signal }), { name: 'AbortError' });
  assert.equal(f.counters.ai, 0);
  f.deps.extractPdf = async blob => blob.text();
  await f.ask();
  assert.equal(f.counters.ai, 1);
});

test('busca no Senior somente sem histórico e recarrega o resultado após extração', async () => {
  const f = fixture();
  const ready = f.getTasks();
  f.setTasks([]);
  f.deps.startExtraction = async () => { f.counters.extraction++; f.setTasks(ready); };
  await f.ask();
  assert.equal(f.counters.extraction, 1);
  assert.equal(f.counters.ai, 1);
});

test('tarefa pendente ou falha de extração não chama a IA com contexto inexistente', async () => {
  const f = fixture();
  f.setTasks([{ ...f.getTasks()[0], status: 'PENDING' }]);
  await assert.rejects(f.ask(), /sendo extraídos/);
  assert.equal(f.counters.extraction, 0);
  f.setTasks([]);
  await assert.rejects(f.ask(), /Não foi possível obter documentos/);
  assert.equal(f.counters.ai, 0);
});

test('cancelar espera do Senior não inicia extração duplicada nem chamada da IA', async () => {
  const f = fixture();
  const controller = new AbortController();
  f.setTasks([]);
  f.deps.startExtraction = () => {
    f.counters.extraction++;
    controller.abort();
    return new Promise(() => {});
  };
  await assert.rejects(f.ask({ signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(f.ask(), /sendo extraídos/);
  assert.equal(f.counters.extraction, 1);
  assert.equal(f.counters.ai, 0);
});

test('convocações usam texto limpo; conversa sem matrícula não herda documentos', async () => {
  const f = fixture();
  f.setTasks([{ ...f.getTasks()[0], id: 'convocacao_123', task_type: 'convocacao' }]);
  f.deps.loadResults = async () => [{ name: 'Aviso', text: '<p>Reunião às 10h.</p>' }];
  await f.ask();
  assert.match(f.contexts[0], /Reunião às 10h/);
  assert.doesNotMatch(f.contexts[0], /<p>/);
  await f.ask({ matricula: null, prompt: 'Olá' });
  assert.doesNotMatch(f.contexts[1], /Reunião/);
});

test('salário sem matrícula recebe orientação local, sem esperar pelo servidor', async () => {
  const f = fixture();
  let text = '';
  await f.ask({ matricula: null, prompt: 'Qual o salário do colaborador?', onChunk: value => { text += value; } });
  assert.match(text, /matrícula/);
  assert.equal(f.counters.ai, 0);
  assert.equal(f.counters.load, 0);
});

test('salário abreviado é encontrado em diferentes posições de uma ficha longa', () => {
  for (const before of [0, 100, 350, 700]) {
    for (const after of [0, 100, 350]) {
      const text = 'Dados cadastrais e registros antigos. '.repeat(before) + '\nSal. Contratual: R$ 3.456,78. Vigência 09/2026.\n' + 'Outras informações cadastrais. '.repeat(after);
      const result = buildDocumentContext([{ title: 'Ficha CTPS', text }], 'Qual o salário do colaborador?', 5500);
      assert.match(result.text, /3\.456,78/, `salary missing with padding ${before}/${after}`);
      assert.ok(encoder.encode(result.text).length <= 5500);
    }
  }
});

function nativeFixture(chunks, closeError) {
  const calls = [];
  const native = async (command, args) => {
    calls.push({ command, args });
    if (command.endsWith('|fetch')) return 1;
    if (command.endsWith('|fetch_send')) return { rid: 2, status: 200, statusText: 'OK', headers: [] };
    if (command.endsWith('|fetch_read_body')) return chunks.shift() ?? Uint8Array.of(1);
    if (command.endsWith('|fetch_cancel_body') && closeError) throw closeError;
  };
  return { transport: createAiTransport(native), calls };
}

test('transporte não antecipa leituras e encerra o corpo uma única vez após done', async () => {
  const record = encoder.encode('{"response":"OK","done":true}\n');
  const { transport, calls } = nativeFixture([Uint8Array.from([...record, 0])]);
  const service = new AiService(transport, credentials);
  await service.generateResponse(request);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.filter(c => c.command.endsWith('|fetch_read_body')).length, 1);
  assert.equal(calls.filter(c => c.command.endsWith('|fetch_cancel_body')).length, 1);
});

test('EOF nativo não provoca tentativa de fechar um recurso já removido', async () => {
  const { transport, calls } = nativeFixture([Uint8Array.of(1)]);
  const response = await transport('https://example.test', {});
  assert.equal(calls.filter(c => c.command.endsWith('|fetch_read_body')).length, 0);
  const reader = response.body.getReader();
  assert.equal((await reader.read()).done, true);
  await reader.cancel();
  assert.equal(calls.filter(c => c.command.endsWith('|fetch_cancel_body')).length, 0);
});

test('abort e cancel concorrentes fecham o recurso só uma vez', async () => {
  const { transport, calls } = nativeFixture([], 'The resource id 2 is invalid.');
  const controller = new AbortController();
  const response = await transport('https://example.test', { signal: controller.signal });
  const reader = response.body.getReader();
  controller.abort();
  await reader.cancel();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.filter(c => c.command.endsWith('|fetch_cancel_body')).length, 1);
});

test('PDF com rótulos antes dos valores preserva o salário na mesma linha visual', () => {
  const item = (str, x, y) => ({ str, transform: [8, 0, 0, 8, x, y] });
  const text = extractPageText([
    item('Remuneração inicial:', 55, 291), item('Salário contratual:', 55, 309),
    item('Última remuneração informada:', 55, 274),
    item('R$', 156, 291), item('0,00', 198, 291),
    item('R$', 208, 274), item('0,00', 250, 274),
    item('R$', 146, 309), item('3.456,78', 175, 309),
  ]);
  assert.match(text, /^Salário contratual: R\$ 3\.456,78\n/);
  assert.match(text, /Remuneração inicial: R\$ 0,00/);
});

test('pergunta salarial prioriza CTPS e não preenche contexto com avisos de VA', () => {
  const docs = [
    ...Array.from({ length: 17 }, () => ({ title: 'Recebimento de cartão VA', text: 'Comunicado sobre recebimento do cartão. '.repeat(20) })),
    { title: 'Ficha CTPS', text: 'Histórico de salários e reajustes anteriores. '.repeat(50) },
    { title: 'CTPS Digital', text: 'Salário contratual: R$ 3.456,78\nRemuneração inicial: R$ 0,00' },
  ];
  const context = buildDocumentContext(docs, 'Qual é o salário do colaborador?', 5500);
  assert.equal(context.selectedDocuments, 1);
  assert.match(context.text, /Salário contratual: R\$ 3\.456,78/);
  assert.doesNotMatch(context.text, /Recebimento de cartão/);
});
