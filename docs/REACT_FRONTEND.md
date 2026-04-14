# Documentação do Frontend (React)

Toda a interação nativa do usuário provém da renderização gerada pela biblioteca **React**, utilizando a linguagem **TypeScript**, estando organizada na pasta `src`.

## Organização de Pastas

### `/components`
Guarda os pequenos bloquinhos visuais reutilizáveis em vez de reconstruí-los a toda hora.
- **`Button`:** Múltiplas variantes de botão (primário, de ícone), isolando estilos consistentes.
- **`Header`:** Cabeçalho padrão contendo a logomarca e título do app.
- **`NoticeCard`:** O "Cartão" visual que exibe cada documento consultado. Ele trata o texto HTML da requisição e possui de maneira embutida os botões de "Baixar" e de "Ler a mensagem completa".
- **`Modal` e `Toast`:** Painéis ou janelas de aviso sobrepostos nativamente para lidar com notificações e avisos de confirmação de "Carregando" na tela (evitando a necessidade de `alert()` padrão).

### `/context`
Contém `ThemeContext` (para lidar com mudança visual como DarkMode, se for implementado) e o `ToastContext` que distribui a facilidade de gerar avisos de erros ou sucesso globalmente em qualquer ponto do sistema usando chamadas simples (`showToast`).

### `/page/mainPage`
O principal pilar da interface do projeto fica no arquivo `mainPage.tsx`.

### Como o `mainPage.tsx` funciona

1. **Estado (`useState`):**
   A página lida e rastreia em torno de dez variáveis de controle: Matrícula atual do input, Lista de documentos recebida, se a tela está aguardando (loading), progresso e estado do "Download em Massa" e controles de visibilidade do Modal.

2. **O fluxo da função `handleSearch`**:
   - É disparada quando submetida pelo Enter ou boão de 'Pesquisar'.
   - Filtra os dados visuais.
   - Faz a ponte com a entidade `NoticeService`. 
   - Recebe a lista que devolve os dados com nomes, e o `id` e salva num estado mapeando `noticeID`. Esse `noticeID` será reutilizado se o usuário clicar no botão "Baixar Tudo".

3. **Interação de "Download"**:
   Essa interface dá o elo entre o usuário clicando no cartãozinho individual `handleDownload`, ou clicando em "Baixar todos juntos" `handleDownloadAll`.
   Ela usa overlay de painel para informar "Baixando x arquivos de y", informando isso de volta visualmente ao usuário pela barra de progresso.

4. **Tratamento Dinâmico de Erros**:
   Em todas as chamadas `async` desta página ele vai cercar por `try catch` e enviar os erros interceptados para o Modal ou para o Toast. Ou seja, exceções vindas do backend em Rust são capturadas e transformadas em mensagens gráficas na interface do React.
