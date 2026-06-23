# Como Publicar Atualizações do Sistema (Tauri Updater)

Este documento descreve o passo a passo de como você deve lançar uma nova versão do seu sistema e como disponibilizá-la no GitHub Releases para que todos os seus usuários recebam a atualização.

## Passo 1: Ajuste Final no Código (Uma única vez)

Como eu não tinha a URL exata do seu repositório no GitHub, você precisará editar o arquivo `src-tauri/tauri.conf.json` e colocar a URL correta do seu GitHub.

No arquivo `tauri.conf.json`, procure por `endpoints` e altere a URL:
```json
"endpoints": [
  "https://github.com/SEU_USUARIO/SEU_REPOSITORIO/releases/latest/download/updater.json"
]
```
Substitua `SEU_USUARIO` pelo seu usuário do GitHub e `SEU_REPOSITORIO` pelo nome do repositório onde você criará a release.

## Passo 2: Alterar a Versão do Sistema
Quando quiser lançar uma nova versão (ex: da `1.0.0` para a `1.0.1`), você **precisa** alterar a versão nestes dois arquivos:
1. `src-tauri/tauri.conf.json` (Procure por `"version": "1.0.0"` e altere para a nova versão).
2. `package.json` (Procure por `"version": "0.1.0"` ou a versão atual, e altere para bater com o Tauri).

> **IMPORTANTE**: Se você não alterar a versão, o aplicativo não considerará que há uma nova atualização disponível.

## Passo 2: Compilar o Aplicativo
Execute o comando de build que você já conhece:
```bash
npm run tauri build
```
*(Ele é um atalho para `cargo build --release` empacotando junto o frontend).*

Ao finalizar, ele irá gerar na pasta `src-tauri/target/release/bundle/`:
- Os instaladores (`.msi` ou `.nsis.zip` etc).
- Arquivos de assinatura (`.sig`).
- O arquivo `updater.json` será gerado com as notas de lançamento e links.

## Passo 3: Publicar no GitHub Releases

1. Vá até o seu repositório no GitHub.
2. Clique em **Releases** na barra lateral direita.
3. Clique em **Draft a new release**.
4. Em "Choose a tag", digite a versão que acabou de compilar (ex: `v1.0.1`) e crie a tag. Conforme você indicou, o título pode ser `NextiIntegrado v1.0.1` (ou a versão respectiva).
5. **Arquivos para Upload:** Arraste e solte **TODOS** os arquivos de instalação `.exe`, `.nsis.zip`, os arquivos de assinatura `.sig` e o arquivo `updater.json` que foram gerados no build para a área de Anexos (Assets).
6. Clique em **Publish release**.

Pronto! Assim que você publicar, todos os usuários que abrirem o sistema e tiverem uma versão inferior à que você acabou de publicar verão o Pop-up na tela informando da atualização, e ela será feita automaticamente, reiniciando o app para a nova versão!
