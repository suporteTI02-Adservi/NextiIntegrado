# Guia Mestre de Manutenção (Handover)

Este documento foi criado para **facilitar a transição e futuras manutenções** do projeto **NextiIntegrado**, seja por um novo desenvolvedor humano ou por um assistente de Inteligência Artificial (AI). 

Aqui você encontrará o "mapa" de como o projeto funciona, qual era o status do sistema quando o desenvolvimento original foi pausado, e as melhores práticas para continuar o trabalho.

---

## 🗺️ Mapa Rápido da Documentação

A pasta `/docs` contém documentos vitais sobre cada engrenagem deste sistema. Se você for mexer em uma camada específica, leia primeiro a sua documentação correspondente:

- **Configuração inicial (Windows)** 👉 [AMBIENTE_INSTALACAO.md](./AMBIENTE_INSTALACAO.md)
- **Por que usamos Rust com React?** 👉 [VISAO_GERAL.md](./VISAO_GERAL.md)
- **Tauri e Backend (Rust)** 👉 [TAURI_RUST.md](./TAURI_RUST.md)
- **Telas e UI (React)** 👉 [REACT_FRONTEND.md](./REACT_FRONTEND.md)
- **Ponte entre React e Rust (Serviços)** 👉 [SERVICES.md](./SERVICES.md)
- **Como publicar versões novas** 👉 [COMO_ATUALIZAR.md](../COMO_ATUALIZAR.md)

---

## 🎯 Status Atual do Projeto (State of the Art)

O aplicativo atualmente é um software Desktop plenamente capaz de:
1. **Autenticação Transparente**: Autentica de forma invisível via Rust (`lib.rs` -> `get_token`) escondendo credenciais da UI.
2. **Consultar Nexti API**: Buscar colaborador, checar matrículas, exibir relatórios e convocações.
3. **Downloads Simultâneos (ZIP)**: Graças ao backend em Rust convertendo PDFs para *Base64* e o frontend reagrupando com *JSZip*, o sistema realiza o download massivo sem engasgar e abre as janelas nativas de salvamento do Windows.
4. **Armazenamento e Estado**: Usando SQLite local para persistir estado e resultados de chamadas pesadas (`tasks`).

---

## 🚧 Status do `TODO.md` e a Integração SOAP Senior (O Segredo!)

No arquivo `TODO.md`, consta que é necessário implementar a baixa de relatórios chamados **CTPS Digital** (`FPAR536.CRE`) e **Comprovante Bancário** (`FPDO501.COL`).

**ATENÇÃO MANTENEDOR:** Grande parte desse trabalho **JÁ ESTÁ PRONTO** nos bastidores!

1. **A Camada de Backend (Rust) está pronta**:
   - No arquivo `src-tauri/src/lib.rs`, os comandos `generate_soap_report` e `consult_collaborator_soap` já estão criados e enviam payloads SOAP em XML perfeitamente.
2. **A Camada de Serviços (TypeScript) está pronta**:
   - No arquivo `src/services/SoapService.ts`, toda a lógica complexa de XML, encapsulamento CDATA, extração de Base64 e geração do PDF final (`Blob`) já foi feita. Ele suporta: `AFASTAMENTOS`, `CTPS`, `COMPROVANTE_BANCARIO`, `CTPS_DIGITAL` e `HOLERITE`.
3. **O QUE FALTA FAZER? (Apenas a UI)**:
   - Apenas o arquivo `src/page/mainPage/mainPage.tsx` (ou `src/page/documentos/documentos.tsx`) precisa ser atualizado para exibir os botões na tela e acionar os métodos já existentes do `SoapService.ts`. O trabalho "pesado" e as regras de negócio de integração SOAP já foram solucionados.

---

## 🤖 Dicas para Inteligência Artificial (AI Guidelines)

Se este projeto estiver sendo lido por uma Inteligência Artificial (como Github Copilot, Cursor, ou Gemini) preste atenção nas seguintes regras:

> [!IMPORTANT]
> **Comunicação Frontend-Backend**: O frontend (React) **não deve usar bibliotecas como Axios ou Fetch** diretamente para APIs de fora. Toda chamada externa passa pelo protocolo IPC do Tauri usando `invoke("nome_do_comando", { ... })`. O `rust` (Backend) é o responsável pelo POST/GET HTTP real para contornar problemas de CORS e manter credenciais protegidas.

> [!CAUTION]
> **Segurança (Variáveis de Ambiente)**: Senhas e Secrets (ex: `CLIENT_ID`, `CLIENT_SECRET`) não devem vazar para o frontend, e não devem ser lidos do `.env` em tempo de execução no cliente. Eles são lidos no **momento do build** via `build.rs` ou `option_env!` (macros do Rust) para serem selados binariamente. Nunca adicione lógicas que enviem senhas do Frontend para o Rust.

> [!TIP]
> **Manipulação de Arquivos e Sistema (IO)**: Quando for criar um recurso para "Salvar um arquivo", use os plugins nativos do Tauri (`@tauri-apps/plugin-dialog` para perguntar onde salvar, e `@tauri-apps/plugin-fs` para gravar os bytes). Evite os métodos legados ou truques do browser (como `URL.createObjectURL(blob)` seguido de um "clique invisível num `<a>`"), pois num contexto Desktop do Tauri, as APIs nativas oferecem integridade muito maior (como verificado em `GetNotices.ts`).

---

**Resumo de Onde Procurar as Coisas:**

| Se você precisa mexer em... | Vá para... |
|-----------------------------|------------|
| Telas, Botões, Cores, UI | `src/page/`, `src/components/`, `src/index.css` |
| Como o frontend pede os dados | `src/services/` (Avisos e SOAP) |
| A requisição real HTTP e CORS | `src-tauri/src/lib.rs` (Funções Rust) |
| Permissões (Pode abrir janela?) | `src-tauri/tauri.conf.json` |
| Credenciais e Segurança | `.env` (localmente) e `src-tauri/build.rs` |
