import { invoke } from "@tauri-apps/api/core";
// ⚠️ No v2, as importações mudaram para plugins específicos:
import { writeFile } from "@tauri-apps/plugin-fs"; 
import { save } from "@tauri-apps/plugin-dialog";

export class GetNotices {
  async download_docs(noticeId: number, name: string) {
    const token = localStorage.getItem("authToken");

    if (!token) {
      console.error("Token de autenticação não encontrado.");
      return;
    }

    try {
      // Chama o comando Tauri para obter o PDF em base64
      const base64Response = await invoke<string>("download_docs", {
        noticeId: noticeId, // Verifique se no Rust está camelCase ou snake_case
        token: token,
      });

      if (!base64Response) {
        throw new Error("Nenhuma resposta recebida do backend.");
      }

      // Converte base64 para Uint8Array
      const pdfBytes = this.base64ToUint8Array(base64Response);

      // Abre a janela de salvar (Plugin Dialog)
      const filePath = await save({
        defaultPath: `document_${noticeId}-${name}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (!filePath) {
        console.warn("Download cancelado pelo usuário.");
        return;
      }

      // Salva o arquivo (Plugin FS)
      // No v2 usamos writeFile passando o Uint8Array diretamente
      await writeFile(filePath, pdfBytes);

      console.log(`Documento salvo em: ${filePath}`);
    } catch (err: any) {
      console.error("Erro detalhado no GetNotices (download_docs):", err);
      throw err;
    }
  }

  private base64ToUint8Array(base64: string) {
    const raw = window.atob(base64);
    const rawLength = raw.length;
    const array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    return array;
  }
}