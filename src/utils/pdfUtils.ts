import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configurar o worker do pdfjs-dist usando o recurso de URL do Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfChunk {
  title: string;
  blob: Blob;
  base64: string;
  isDecimoTerceiro: boolean;
  monthString: string;
}

export async function splitHoleritePdf(
  originalPdfBase64: string,
  isDecimoTerceiro: boolean
): Promise<PdfChunk[]> {
  try {
    const pdfBytes = Uint8Array.from(atob(originalPdfBase64), (c) => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const numberOfPages = pdfDoc.getPageCount();

    // Ler texto com pdfjs-dist para identificar mês e ano
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdfjsDoc = await loadingTask.promise;

    const chunks: PdfChunk[] = [];

    for (let i = 0; i < numberOfPages; i++) {
      // Cria um novo PDF apenas com esta página
      const newPdfDoc = await PDFDocument.create();
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
      newPdfDoc.addPage(copiedPage);

      const newPdfBytes = await newPdfDoc.save();
      const newPdfBlob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      let binary = '';
      const len = newPdfBytes.byteLength;
      for (let j = 0; j < len; j++) {
        binary += String.fromCharCode(newPdfBytes[j]);
      }
      const newPdfBase64 = btoa(binary);

      let pageLabel = `Página ${i + 1}`;
      let monthString = "Desconhecido";

      try {
        const page = await pdfjsDoc.getPage(i + 1); // pdfjs usa índice baseado em 1
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item: any) => item.str).join(' ');

        // Procura por Competência, Referência ou Mês/Ano explícito
        const exactMatch = textItems.match(/(?:Refer[êe]ncia|Compet[êe]ncia|M[êe]s\/Ano)[:\s-]*(\d{2}\/\d{4})/i);
        
        if (exactMatch && exactMatch[1]) {
          pageLabel = exactMatch[1];
          monthString = exactMatch[1];
        } else {
          // Fallback: pega todas as datas mm/yyyy ou dd/mm/yyyy
          const allDates = [...textItems.matchAll(/(\d{2}\/\d{4})/g)];
          if (allDates.length > 0) {
            // Em holerites Senior, a primeira data geralmente é a admissão e a última pode ser a de impressão.
            // A competência costuma ser a 2ª ou 3ª data (ex: Admissão, Competência, Data Pgto).
            // Vamos assumir a 2ª data se houver mais de uma, senão a 1ª.
            const targetDate = allDates.length > 1 ? allDates[1][1] : allDates[0][1];
            pageLabel = targetDate;
            monthString = targetDate;
          }
        }
      } catch (e) {
        console.warn("Erro ao extrair texto da página", i, e);
      }

      const prefix = isDecimoTerceiro ? "13º Salário" : "Holerite";

      chunks.push({
        title: `${prefix} ${pageLabel}`,
        blob: newPdfBlob,
        base64: newPdfBase64,
        isDecimoTerceiro,
        monthString
      });
    }

    return chunks.reverse(); // Mostrar do mais recente para o mais antigo, assumindo que vêm em ordem cronológica normal
  } catch (err) {
    console.error("Erro ao dividir PDF:", err);
    throw err;
  }
}
