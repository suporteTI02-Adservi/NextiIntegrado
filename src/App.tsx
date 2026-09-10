import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./page/mainPage/mainPage";
import { Dashboard } from "./page/dashboard/Dashboard";
import Documentos from "./page/documentos/documentos";
import { Layout } from "./components/Layout/Layout";
import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { ExtractionProvider } from "./context/ExtractionContext";
import { IntroAnimation } from "./components/IntroAnimation/IntroAnimation";

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    // Retorna true apenas se for a primeira vez na sessão
    return !sessionStorage.getItem('hasSeenIntro3');
  });

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
    <>
      {showIntro && (
        <IntroAnimation onComplete={() => {
          sessionStorage.setItem('hasSeenIntro3', 'true');
          setShowIntro(false);
        }} />
      )}
      <ExtractionProvider>
        <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />}>
              <Route path="nexti" element={<MainPage />} />
              <Route path="main" element={<MainPage />} />
              <Route path="documentos" element={<Documentos />} />
            </Route>
            <Route path="/extracoes" element={<Dashboard />} />
            <Route path="*" element={<Dashboard />} />
        </Routes>
      </Layout>
    </Router>
  </ExtractionProvider>
  </>
);
}

export default App;
