# Configuração do Ambiente de Desenvolvimento (Windows)

Para que o projeto funcione e compile na máquina de um novo desenvolvedor, é necessário preparar o ambiente. Como utilizamos **Tauri** (que requer a compilação do Rust localmente), algumas ferramentas extras além do básico são obrigatórias no Windows.

## 1. Ferramentas Necessárias para Baixar

### A. Node.js
O Node é necessário para rodar o ecossistema do React (nosso framework frontend).
- **Onde baixar:** Acesse [nodejs.org](https://nodejs.org/).
- **Versão:** Baixe a versão LTS (recomendado 20.x ou superior).
- **Instalação:** Instalação padrão (`Next > Next`).

---

### B. Microsoft Visual Studio C++ Build Tools
Você precisa das ferramentas de build C++ do Windows na sua máquina para compilar o código em Rust nativamente para executável (`.exe`). Sem isso, o Rust simplesmente **vai dar erro logo no começo**.
- **Onde baixar:** Acesse [Visual Studio Build Tools](https://visualstudio.microsoft.com/pt-br/visual-cpp-build-tools/).
- **Como instalar:**
  1. Ao abrir o instalador, aparecerá a janela de "Cargas de trabalho" (Workloads).
  2. Marque a caixa: **"Desenvolvimento para desktop com C++"** (Desktop development with C++).
  3. No menu lateral direito (Detalhes de Instalação), certifique-se de que o **SDK do Windows 10 ou 11** esteja marcado.
  4. Clique em Instalar.

*Importante: Este passo é demorado e pesado (pode consumir uns 6 GB), mas é estritamente obrigatório.*

---

### C. Instalador da Linguagem Rust (`rustup`)
O compilador do Rust.
- **Onde baixar:** Acesse [rustup.rs](https://rustup.rs/) e baixe o `rustup-init.exe`.
- **Como instalar:** Abra o executável no terminal e apenas pressione `1` (Proceed with installation) e dê **Enter**.

---

## 2. Pós-instalação (Primeira Vez No Projeto)

Após clonar ou extrair a pasta do projeto no seu computador, abra uma aba de Terminal (via VS Code, CMD ou PowerShell).

### 1. Instalar as Dependências do Node (`node_modules`)
Na pasta raiz do projeto, rode:
```bash
npm install
```

### 2. Configurar Chaves de Autenticação (.env)
A Segurança no Tauri v2 que estipulamos usa injeção de ambiente na compilação.
- Crie um arquivo literal chamado `.env` (sem nome, apenas a extensão) **na raiz** ou dentro da pasta `src-tauri`.
- Coloque os acessos privados:
```env
CLIENT_ID=adservi
CLIENT_SECRET=sua-chave-privada-aqui
```

## 3. Rodando o Sistema

Para subir o ambiente de teste local onde alterações no código já recarregam a janela ao vivo (*Hot Reload*), garantindo toda a funcionalidade visual do React atuando junto com o Backend local do Tauri, utilize o comando:

```bash
npm run tauri dev
```
O console pode demorar vários minutos na *primeira vez* que rodar (pois ele precisará baixar pacotes do mundo do Rust e criar as conexões internas do C++). As próximas vezes que rodar vão ser ultrarrápidas, demorando menos de 2 segundos.
