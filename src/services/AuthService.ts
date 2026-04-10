// Tauri imports only work in Tauri context - use fetch for Vite dev
import { invoke} from "@tauri-apps/api/core";

export class AuthService {
  async getToken() {
    try {
      const token = await invoke<string>("get_token");
      localStorage.setItem("authToken", token);
      return token;
    } catch {
      return null;
    }
  }
}
