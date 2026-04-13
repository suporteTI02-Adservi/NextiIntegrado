# Nexti Integrado

[![Tauri](https://img.shields.io/badge/Tauri-v2-blue?logo=rust)](https://tauri.app) [![React](https://img.shields.io/badge/React-19-green?logo=react)](https://react.dev)

## 📖 Visão Geral

**Nexti Integrado** é uma aplicação desktop minimalista construída com **Tauri v2** (Rust + React/TypeScript) para consulta de **documentos e convocações** de colaboradores via API Nexti (adservi).

### Funcionalidades Principais
- ✅ Busca paginada por **matrícula do colaborador**
- ✅ Listagem de documentos/convocações em tabela limpa
- ✅ Download direto de PDFs (salva via diálogo nativo)
- ✅ Interface responsiva e minimalista
- ✅ Bypass de CORS via backend Rust

**Fluxo Simplificado**:
```
Matrícula → Token OAuth → ID Colaborador → Documentos (paginado) → Download PDF
```

## 🛠️ Arquitetura

```
Frontend (React 19/TS + Vite)
├── src/page/mainPage/mainPage.tsx (UI + lógica de busca/paginação)
├── src/services/
│   ├── AuthService.ts (token)
│   ├── NoticeService.ts (busca docs/colaborador)
│   └── GetNotices.ts (download PDF base64)
└── src/App.tsx (root)

Backend (Rust + Tauri v2 + reqwest)
├── src-tauri/src/lib.rs (commands: get_token, get_colaborador, get_documents, download_docs)
└── src-tauri/src/main.rs (invoke handler + plugins fs/dialog)
```

## 🚀 Instalação e Execução

### Pré-requisitos
- **Rust**: `rustup install stable`
- **Node.js**: v20+
- **Tauri CLI**: `npm i -g @tauri-apps/cli`

### 1. Clonar/Instalar Dependências
```bash
npm install
cd src-tauri && cargo check
```

### 2. Desenvolvimento
```bash
npm run tauri dev
```
- Abre app em janela nativa (~port 1420 internamente)
- Backend Rust proxya APIs (sem CORS)

### 3. Build para Produção
```bash
npm run tauri build
```
- Gera executável em `src-tauri/target/release/bundle`

## 🔌 APIs Nexti Integradas

| Comando | Endpoint | Parâmetros | Retorno |
|---------|----------|------------|---------|
| `get_token` | `POST /security/oauth/token` | client_id=adservi | access_token |
| `get_colaborador` | `GET /persons/externalid/{empresa}-{id}` | external_id (i64) | person { id } |
| `get_documents` | `POST /core/notices/findsummonsandchecklistbypersonfilter` | personId, page | { content: [docs] } |
| `download_docs` | `POST /report/notice/summonsreceipt` | notice_id | PDF base64 |

**Credenciais**: Embutidas (adservi / secret). Para prod, use env vars.

## 📱 Interface

- **Formulário**: Input matrícula + botão "Pesquisar Documentos"
- **Tabela**: Colaborador, Nome, Convocação (HTML limpo), Download (ícone)
- **Paginação**: Anterior/Próxima (detecta fim por "BEM VINDO")
- **Estados**: Loading, Erro, Vazio

![Screenshot] (adicionar imagem da UI)

## 🔧 Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| `invoke` error | Backend não rodando | `cargo build` + `npm run tauri dev` |
| No docs | Matrícula inválida | Use matrícula real Nexti |
| CORS dev | Vite dev server | Sempre use `tauri dev` |
| Download falha | Token expirado | Reinicie app |

**Logs**: Console do app (F12) + `RUST_LOG=debug cargo tauri dev`

## 📈 Estrutura de Dados (API Response)

```json
{
  "id": 123,
  "personName": "João Silva",
  "name": "Convocação X",
  "text": "<p>Conteúdo HTML...</p>",
  "idNoticePerson": 456
}
```

## ♻️ Melhorias Futuras
- [ ] Filtro por datas
- [ ] Assinatura digital
- [ ] Export múltiplo
- [ ] Dark mode
- [ ] Config env (tokens)

## 📄 Licença
MIT - Feito com ❤️ para integração Nexti.

**Status: ✅ App funcional | 🧪 Teste com matrículas reais!**


