import { invoke } from "@tauri-apps/api/core";
import { AuthService } from "./AuthService";

export class NoticeService {
  /**
   * Busca documentos da API Nexti através do backend em Rust.
   * @param start Data de início (YYYY-MM-DD)
   * @param end Data de fim (YYYY-MM-DD)
   * @returns Array de documentos
   */

  async getColab(matricula: number) {
    const token = localStorage.getItem("authToken");

    try {
      const response = await invoke<any>("get_colaborador", {
        externalId: matricula,
        token: token,
      });

      if (!response) {
        throw new Error("Nenhuma resposta recebida do backend.");
      }

      return response.value.id;
    } catch (err: any) {
      console.error("Erro detalhado no NoticeService (getColab):", err);

      if (err instanceof TypeError && err.message.includes("invoke")) {
        throw new Error(
          "Erro de comunicação com o núcleo do Tauri. Tente reiniciar a aplicação pelo terminal.",
        );
      }
    }
  }

  async getDocuments(matricula: number, page: number = 0): Promise<any[]> {
    const token = await new AuthService().getToken();
    const id = await this.getColab(matricula);

    try {
      const response = await invoke<any>("get_documents", {
        id: id,
        page: page,
        token: token,
      });
      
      // Tratamento do retorno conforme a estrutura da API Nexti
      if (Array.isArray(response)) {
        return response;
      } else if (
        response &&
        response.content &&
        Array.isArray(response.content)
      ) {
        return response.content;
      }

      return [];
    } catch (err: any) {
      // O erro 'reading invoke' geralmente acontece aqui se o backend não responder
      console.error("Erro detalhado no NoticeService:", err);

      // Se for um erro de ambiente (TypeError), damos uma instrução mais clara
      if (err instanceof TypeError && err.message.includes("invoke")) {
        throw new Error(
          "Erro de comunicação com o núcleo do Tauri. Tente reiniciar a aplicação.",
        );
      }

      throw new Error(
        "Erro no sistema. Entre em contato com o desenvolvedor: suporte.ti02@grupoadservi.com.br"
      );
    }
  }
}
