# Implementation Plan - Correção CORS + Finalização

## Overview
Resolver CORS definitivo com Tauri proxy + melhorar UX data + criar docs. App deve funcionar 100% em `npm run tauri dev`.

## Types
Interfaces para API responses:
```ts
interface ApiDocument {
  noticeId: string;
  personExternalId: string;
  status: string;
  signatureLink?: string;
  downloadLink?: string;
}
```

## Files
**Novos:** Nenhum
**Modificados:**
- `vite.config.ts` - Proxy dev CORS
- `src-tauri/src/lib.rs` - Reativar proxy (async runtime)
- `README.md` - Documentação completa ✓

## Functions
**Novas:** `proxy_token()`, `proxy_documents()` em Rust
**Modificadas:** Services voltam invoke quando Tauri ready

## Classes
AuthService, NoticeService: Dual-mode (fetch dev | invoke prod)

## Dependencies
`tauri-plugin-http` ou manter reqwest

## Testing
- `npm run dev` (CORS proxy)
- `npm run tauri dev` (proxy Rust)

## Implementation Order
1. vite.config.ts proxy
2. Test `npm run dev`
3. Reativar Rust proxy
4. Finalizar README

**task_progress Items:**
- [x] Services fetch fix
- [ ] Vite proxy
- [ ] Rust proxy final

