# Nexti Integrado - Página de Acesso

## O que foi construído

Uma página inicial de acesso para o app Tauri/React que:
- Permite inserir **matrícula do colaborador** e **período de datas (DD/MM/YYYY)**.
- Busca **token de autenticação** via API Nexti.
- Consulta **documentos/convocações** do colaborador no período.
- Exibe tabela com arquivos e links (assinatura/download).

**Fluxo:**
```
Formulário → Token (OAuth) → API Documentos → Filtrar por matrícula → Tabela
```

## APIs Utilizadas
```
1. POST /security/oauth/token (client_credentials)
2. GET /notices/documents/start/{DDMMYYYY000000}/finish/{DDMMYYYY000000}
```

## Como usar

1. **Build Rust backend:**
   ```
   cd src-tauri
   cargo build
   ```

2. **Rodar app:**
   ```
   npm run tauri dev
   ```

3. **Teste:**
   - Matrícula: `123456` (exemplo)
   - Datas: `01/01/2024` a `31/12/2024`
   - Clique **"Pesquisar Documentos"**

## Estrutura de Arquivos

```
src/services/
├── AuthService.ts     # Classe token OAuth
└── NoticeService.ts   # Classe documentos/convocações

src/page/mainPage/
├── mainPage.tsx       # Componente principal
└── mainPage.module.css # Estilos

src/utils/
└── dateUtils.ts       # DD/MM/YYYY ↔ DDMMYYYY000000

src/App.tsx            # Roteamento (/) → MainPage
```

## Problema CORS (localhost:1420)

**Causa:** API Nexti bloqueia fetch do browser dev.
**Soluções:**
1. **Produção:** `npm run tauri dev` (Tauri bypassa CORS)
2. **Dev:** Use proxy em `vite.config.ts` ou extensão CORS browser

## Como adaptar tabela

Verifique estrutura JSON da API no console e ajuste campos:
```ts
// Exemplo API response
{
  "noticeId": "123",
  "personExternalId": "456789",
  "status": "pendente",
  "signatureLink": "url...",
  "downloadLink": "url..."
}
```

## Dependências principais
```
Frontend: React 19 + React Router + TypeScript
Backend: Tauri v2 + reqwest (proxy opcional)
```

**Status: ✅ Produção ready | 🔧 Teste com dados reais da API.**

