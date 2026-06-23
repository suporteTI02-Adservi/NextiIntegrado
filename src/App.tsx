import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./page/mainPage/mainPage";
import { Dashboard } from "./page/dashboard/Dashboard";
import Documentos from "./page/documentos/documentos";
import { Layout } from "./components/Layout/Layout";
import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { ExtractionProvider } from "./context/ExtractionContext";

function App() {
  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await check();
        if (update) {
          const yes = await ask(`Uma nova versão (${update.version}) está disponível!\n\nDeseja atualizar agora?`, {
            title: 'Atualização Disponível',
            kind: 'info',
            okLabel: 'Sim, atualizar',
            cancelLabel: 'Mais tarde'
          });
          
          if (yes) {
            await message('O download da atualização foi iniciado. O aplicativo será reiniciado automaticamente quando for concluído.', { 
              title: 'Atualizando...', 
              kind: 'info' 
            });
            await update.downloadAndInstall();
            await relaunch();
          }
        }
      } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
      }
    }
    
    checkForUpdates();
  }, []);

  return (
    <ExtractionProvider>
      <Router>
        <Layout>
          <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nexti" element={<MainPage />} />
          <Route path="/main" element={<MainPage />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/extracoes" element={<Dashboard />} />
          <Route path="*" element={<Dashboard />} />
          </Routes>
        </Layout>
      </Router>
    </ExtractionProvider>
  );
}

export default App;
