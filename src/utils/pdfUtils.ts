import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Usar o próprio worker embutido ou desativar para evitar problemas de CORS/Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

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
      const newPdfBase64 = btoa(
        Array.from(newPdfBytes).map((byte) => String.fromCharCode(byte)).join('')
      );

      let pageLabel = `Página ${i + 1}`;
      let monthString = "Desconhecido";

      try {
        const page = await pdfjsDoc.getPage(i + 1); // pdfjs usa índice baseado em 1
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item: any) => item.str).join(' ');

        // Exemplo de regex para encontrar o mês/ano do holerite
        const monthMatch = textItems.match(/(?:Referência[:\s]*|)(\d{2}\/\d{4})/i);
        if (monthMatch && monthMatch[1]) {
          pageLabel = monthMatch[1];
          monthString = monthMatch[1];
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
