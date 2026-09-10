export interface AiDocument {
  title: string;
  text: string;
}

const bytes = (text: string) => new TextEncoder().encode(text).length;
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const stopWords = new Set('a o as os de da do das dos e em na no nas nos um uma uns umas para por com que qual quais quanto quantos quando onde como meu minha seu sua este esta deste desta esse essa dele dela colaborador documentos documento informacoes principais resuma resumo favor'.split(' '));

/** Select original passages locally; no preliminary model calls or silent truncation. */
export function buildDocumentContext(documents: AiDocument[], prompt: string, maxBytes: number) {
  const readable = documents.filter(doc => doc.text.trim());
  const unreadable = documents.length - readable.length;
  if (!readable.length) throw new Error('Não foi possível obter texto dos documentos. PDFs digitalizados podem precisar de reconhecimento de texto (OCR).');
  const keywords = [...new Set(normalize(prompt).match(/[a-z0-9]+/g) ?? [])]
    .filter(word => word.length >= 2 && !stopWords.has(word));
  const salaryQuestion = /\b(?:salario|salarios|salarial|remuneracao|vencimentos?|holerite)\b/.test(normalize(prompt));
  const contractSources = new Set<number>();
  if (salaryQuestion && !/histor|compar|diferenc|aument|reajust|liquid|bruto|descont|provent|rescis|total|inicial|ultima/.test(normalize(prompt))) {
    readable.forEach((doc, index) => {
      if (/ctps digital/.test(normalize(doc.title)) && /salario\s+contratual\s*:\s*R\$\s*\d[\d.,]*/i.test(normalize(doc.text))) {
        contractSources.add(index);
      }
    });
  }
  const chunks = readable.flatMap((doc, documentIndex) => {
    const result = [];
    let start = 0;
    let index = 0;
    while (start < doc.text.length) {
      let end = Math.min(start + 1000, doc.text.length);
      // Split on a word boundary when possible; overlap retains nearby values/dates.
      if (end < doc.text.length) {
        const boundary = doc.text.lastIndexOf(' ', end);
        if (boundary > start + 650) end = boundary;
      }
      const text = doc.text.slice(start, end).trim();
      const normalizedText = normalize(text);
      const normalizedTitle = normalize(doc.title);
      const salaryMatch = salaryQuestion && /\b(?:salarios?|remuneracao|vencimentos?|sal\.?\s+(?:base|contratual|mensal))\b/.test(normalizedText);
      const salarySource = salaryQuestion ? (/ctps digital/.test(normalizedTitle) ? 8 : /ctps|ficha cadastral|holerite|contracheque/.test(normalizedTitle) ? 4 : 0) : 0;
      const score = keywords.reduce((total, word) => total + (normalizedText.includes(word) ? 3 : 0) + (normalizedTitle.includes(word) ? 2 : 0), (salaryMatch ? 8 : 0) + salarySource);
      const label = doc.title.replace(/[\r\n]/g, ' ').slice(0, 160);
      result.push({ documentIndex, index, score, content: `[Documento: ${label} | trecho ${index + 1}]\n${text}\n\n` });
      if (end === doc.text.length) break;
      start = end - 120;
      index++;
    }
    return result;
  });

  const completeHeader = 'Cobertura: texto completo dos documentos disponíveis.\n\n';
  const fullText = chunks.map(chunk => chunk.content).join('');
  if (!unreadable && bytes(completeHeader + fullText) <= maxBytes) {
    return { text: completeHeader + fullText, partial: false, selectedDocuments: readable.length, totalDocuments: documents.length, unreadable };
  }

  // Reserve metadata space before selecting. Ties alternate between documents.
  let remaining = maxBytes - 400;
  const ranked = [...chunks].sort((a, b) => b.score - a.score || a.index - b.index || a.documentIndex - b.documentIndex);
  // A specific question should not fill unused space with unrelated notices.
  const candidates = contractSources.size ? ranked.filter(chunk => contractSources.has(chunk.documentIndex))
    : ranked.some(chunk => chunk.score > 0) ? ranked.filter(chunk => chunk.score > 0) : ranked;
  const selected: typeof chunks = [];
  for (const chunk of candidates) {
    const size = bytes(chunk.content);
    if (size <= remaining) { selected.push(chunk); remaining -= size; }
  }
  if (!selected.length) throw new Error('Não há espaço suficiente para analisar os documentos. Faça uma pergunta mais curta.');
  selected.sort((a, b) => a.documentIndex - b.documentIndex || a.index - b.index);
  const selectedDocuments = new Set(selected.map(chunk => chunk.documentIndex)).size;
  const header = `Cobertura PARCIAL: ${selected.length} de ${chunks.length} trechos; ${selectedDocuments} de ${documents.length} documentos; ${unreadable} sem texto disponível. Não inferir ausência de dados nem totais do histórico completo.\n\n`;
  return { text: header + selected.map(chunk => chunk.content).join(''), partial: true, selectedDocuments, totalDocuments: documents.length, unreadable };
}

/** Session-only cache, invalidated by extraction revision; no new data on disk. */
export class AiDocumentCache {
  private entries = new Map<string, { revision: number; documents: AiDocument[] }>();
  get(id: string, revision: number): AiDocument[] | undefined {
    const entry = this.entries.get(id);
    if (entry?.revision === revision) return entry.documents;
    this.entries.delete(id);
    return undefined;
  }
  set(id: string, revision: number, documents: AiDocument[]) {
    // Retry unreadable documents next time; bound memory for long payroll histories.
    if (!documents.length || documents.some(doc => !doc.text.trim()) || documents.reduce((n, doc) => n + doc.text.length, 0) > 1_000_000) return;
    this.entries.delete(id);
    this.entries.set(id, { revision, documents });
    while (this.entries.size > 6) this.entries.delete(this.entries.keys().next().value!);
  }
  retain(tasks: { id: string; updated_at: number; status: string }[]) {
    const revisions = new Map(tasks.filter(task => task.status === 'SUCCESS').map(task => [task.id, task.updated_at]));
    for (const [id, entry] of this.entries) if (revisions.get(id) !== entry.revision) this.entries.delete(id);
  }
}
