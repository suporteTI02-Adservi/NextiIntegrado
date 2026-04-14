# Documentação de Serviços (TypeScript Services)

A pasta principal que conecta a parte visual (React) aos verbos mecânicos de fundo (Rust API/Tauri) é a pasta `src/services`.

A ideia dos "Services" é não misturar regras de negócio complicadas e acessos a API diretamente com o HTML/CSS dos Comportamentos Visuais do React.

## Lista de Serviços

### 1. `AuthService.ts`
Encarregado da autenticação local. Ele chama o Rust para `get_token` e, uma vez recebido, armazena no `localStorage` do navegador Tauri para reuso posterior.

### 2. `NoticeService.ts`
Funciona como o bibliotecário do sistema de Listas de Convocações:
- Contém a função `getColab`: Busca do usuário/matrícula.
- Contém a função `getDocuments`: Agrupa as regras da chamada, buscando o colaborador, verificando qual estrutura de Array ou array `.content` foi devolvida na request do Rust e padronizando isso pra ser devolvido uniformemente para o Frontend sem gerar crashes visuais. 

### 3. `GetNotices.ts`  - (Lógica de Download / ZIP / Plugins Tauri)

Este é o serviço mais pesado e estruturado da aplicação em termos de IO (Entrada vs Saída de Arquivos Máquina). A classe possui 2 métodos cruciais de Download de material:

#### Modulo 1: `download_docs`
Baixa um ÚNICO documento por vez.
- Solicita o texto `base64` do Backend em Rust.
- Utiliza uma função customizada interna chamada `base64ToUint8Array` para reconstituir adequadamente o PDF como cadeia Binária compatível de se salvar.
- Aciona um plugin oficial do Tauri Dialog (`@tauri-apps/plugin-dialog`) para abrir aquela tela de OS padrão do "Salvar Como".
- Aciona o fileSystem Nativo do Tauri (`@tauri-apps/plugin-fs`), função `writeFile` para fisicamente forjar o arquivo gerado dentro da máquina da pessoa no lugar que o usuário optou.

#### Modulo 2: `download_all_docs`
Regra de negócio customizada para compactação simultânea.
- Em vez de fazer a requisição de API uma vez e dar um output, inicia-se um laço de repetição `for`.
- Percorre cada ID que deveria ser baixado e roda o request pro Backend.
- Ao pegar o PDF via `base64`, injeta ele diretamente e ativamente numa instância temporal do instanciador **JSZip** (`zip.file()`). 
    **Nota Importante:** O nome dos PDFs salvos segue o padrão *{ID do aviso} - {Nome*.pdf}*. Sem o `ID` neste naming rule, o JSZip poderia acidentalmente engolir múltiplos processos com o mesmo nome e comprimi-los com apenas um único documento remanescente substituído (ex: gerando apenas "ELOGIO.pdf" sobrando em vez de todas as assinaturas).
- Rola um Callback via parameter (`onProgress`) que funciona igual radar para pontuar na tela React quantos de arquivos terminaram o Request.
- Ao termino, usa o Dialog Tauri pra definir lugar e o system File Generator para expurgar de uma vez só todos do JSZip ao formato `.zip` com total integridade.

### Tratamento e Proteção
Vale ressaltar que para cada método em Services, ele começa pela premonição e proteção do token. Caso não contenha esse item primário nos `localStorage` ou o Backend Rust desista de responder, ele lança as exceções visíveis via `throw new Error(...)` de forma auto-explicável pra TI ou Suporte atuar em cima.
