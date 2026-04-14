# Visão Geral do Projeto

Este projeto é uma aplicação Desktop desenvolvida para integrar com a API da Nexti, permitindo a consulta e o download em massa de documentos e convocações dos colaboradores.

A aplicação utiliza uma arquitetura moderna dividida em duas grandes partes principais:
- **Frontend (Interface do Usuário):** Feito em React com TypeScript, responsável por toda a parte visual, interação com o usuário, validação de campos e criação do arquivo ZIP.
- **Backend Integrado (Tauri Core):** Feito em Rust, mas empacotado junto com o aplicativo. Ele atua como um "mini-servidor" ou "ponte" local.

## Por que usar o Tauri (Rust) e não apenas React?

A escolha de utilizar o Tauri combinando React e Rust resolve os seguintes problemas:
1. **Segurança de Credenciais:** As chaves de acesso à API (Client ID e Secret) não ficam expostas no código do navegador, sendo compiladas de forma segura dentro do núcleo em Rust.
2. **CORS (Cross-Origin Resource Sharing):** Navegadores web bloqueiam requisições diretas a muitas APIs por segurança. Como quem faz as requisições HTTP é o Rust (no sistema operacional e não no navegador), não sofremos com erros de CORS.
3. **Acesso ao Sistema de Arquivos:** Permite nativamente exibir janelas do sistema operacional para "Salvar Como" e salvar diretamente o PDF ou ZIP na máquina do usuário.

## Como as partes se comunicam?

A comunicação entre o Frontend (React) e o Backend (Rust) acontece através de uma função chamada `invoke` do Tauri.

O fluxo de dados segue este ciclo:
1. O usuário clica em "Pesquisar" no React.
2. O React usa o `invoke` para chamar um comando específico dentro do Rust.
3. O Rust monta a requisição HTTP segura (inserindo os tokens ou chaves), e envia para a API Nexti.
4. A API devolve os dados para o Rust.
5. O Rust empacota esses dados e retorna para o React tratar e exibir na tela.

---
Para entender melhor o funcionamento de cada parte do sistema, confira as outras documentações:
- [TAURI_RUST.md](./TAURI_RUST.md) - Para entender a estrutura do Backend e empacotamento.
- [REACT_FRONTEND.md](./REACT_FRONTEND.md) - Para entender a organização das telas e componentes.
- [SERVICES.md](./SERVICES.md) - Para entender os serviços de conexão no Typescript.
