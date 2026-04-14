# Documentação do Backend (Tauri / Rust)

A pasta principal que o próximo desenvolvedor vai trabalhar, caso precise mexer na infraestrutura de requisições, segurança ou permissões de sistema, é a pasta `src-tauri`. O Tauri utiliza o ecossistema da linguagem **Rust**.

Mesmo sem ter domínio de Rust, os padrões adotados são de fácil leitura, lembrando a chamada de requisições web comuns (como Postman/Fetch).

## Estrutura de Arquivos

### 1. O Arquivo `build.rs`
Este arquivo é o primeiro responsável pela segurança do sistema. O papel principal do `build.rs` é ler as chaves de acesso (como `CLIENT_ID` e `CLIENT_SECRET`, que podem ficar em um arquivo `.env` na raiz durante o desenvolvimento) e injetá-las dentro da aplicação no momento da **compilação**.
- **Na prática para a TI:** Isso garante que o sistema em produção não vai depender de arquivos de configuração externos ou `.env` "soltos", pois esses valores já estarão compilados em linguagem de máquina inatingível.

### 2. O Arquivo `src-tauri/src/lib.rs`
Este é o cérebro das requisições. Aqui residem os **Comandos Tauri**. Para o React, eles funcionam como pequenos "endpoints" em rota local que você pode acessar chamando o seu nome.

#### Comandos Disponíveis (`#[tauri::command]`):

- **`get_token`**: \
  Lê as credenciais secretas imbutidas pelo compilador e dispara uma requisição `POST` com Header Basic Auth. Devolve um Token `Bearer` válido do Nexti. \
  *(Essa é uma proteção essencial, sem ela nossa aplicação não autentica com a API)*

- **`get_colaborador`**: \
  Dada uma matrícula (external_id), consulta a API para descobrir o ID interno (chave única da API da Nexti) para o respectivo colaborador.

- **`get_documents`**: \
  Responsável por buscar o array de convocações e documentos. Ele recebe a página `page`, monta o corpo JSON indicando `noticeTypeIds: [2]`, e devolve toda a listagem (JSON) validável pelo Frontend.

- **`download_docs`**: \
  Responsável por chamar e baixar o arquivo PDF do site Nexti.
  - **Atenção à Lógica:** A resposta original do servidor é os dados do arquivo em "raw" (binário bruto de um PDF). Como transmitir "arquivos puros" entre o processo do Rust e a janela do navegador do Tauri pode dar pane nos dados em trânsito, a estratégia aqui foi converter o resultado em uma sequência `base64`. Isso gera uma simples e limpa "string longa" que viaja sem quebrar para o Typescript processar.

### 3. O Arquivo `tauri.conf.json`
O arquivo de configuração e metadados do Tauri. Ele contém ícones, nomes da janela, e especialmente a lista de comandos e permissões liberadas de segurança (`fs`, `dialog`). Sempre que um novo comando Rust for criado no `lib.rs`, o nome dele obrigatoriamente deve ser inserido neste manifesto, ou o React ficará bloqueado de chamá-lo.
