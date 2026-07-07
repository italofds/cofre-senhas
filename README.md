# Cofre — Gerenciador de Senhas (PWA offline)

Gerenciador de senhas **apenas front-end** (Vue 3 + Vite), instalável como PWA em
**Android** e **Windows**, funcionando **100% offline**. Os cofres são arquivos
`.cofre` criptografados com **AES-256-GCM** e chave derivada da senha mestra via
**PBKDF2 (SHA-256, 310.000 iterações)** usando a Web Crypto nativa do navegador.

## Recursos

- Criar lista do zero, abrir um `.cofre` criptografado ou importar um JSON descriptografado.
- Lista de arquivos recentes para reabrir rapidamente.
- Registros com **Título, Login, Senha, URL e Observações**, agrupados em **pastas**.
- **Gerador de senha** randômico (tamanho variável, padrão 16; minúsculas, maiúsculas,
  números e símbolos `!@#$%&_-+=?`), usando CSPRNG.
- **Copiar senha** com um toque; mostrar/ocultar senha; **indicador de força**.
- **Buscar** em qualquer campo, de forma centralizada.
- **Exportar JSON sem senhas** (backup legível).
- Ao salvar, gera um novo `.cofre` com os dados atualizados e a **data da modificação**.
- **Zera toda a memória ao fechar** o aplicativo.

### Modo híbrido de arquivos
- **Chrome/Edge no desktop**: usa a *File System Access API* — salva de verdade no disco
  e permite reabrir os recentes com um toque.
- **Android / navegadores sem suporte**: cai automaticamente para *download* (salvar) e
  seletor de arquivos (abrir); os recentes guardam apenas o histórico de nomes.

## Formato do JSON (import/export e conteúdo descriptografado)

```json
{
  "records": [
    {
      "title": "xxxxxxxxx",
      "login": "xxxxxxxxx",
      "password": "xxxxxxxxx",
      "url": "xxxxxxxxx",
      "notes": "xxxxxxxxx",
      "folder": "xxxxxxxxx"
    }
  ]
}
```

O arquivo `.cofre` é um JSON "envelope" contendo os metadados de criptografia
(`salt`, `iv`, `iterations`…) e o campo `data` com o texto cifrado em base64. Ao
descriptografar dentro do app, o conteúdo é exatamente a estrutura acima.

## Rodar localmente

Requer Node.js 18+.

```bash
npm install
npm run dev      # ambiente de desenvolvimento
npm run build    # gera a versão de produção em dist/
npm run preview  # pré-visualiza o build
```

> **HTTPS/localhost:** a Web Crypto, o Service Worker e a File System Access API
> exigem contexto seguro. `localhost` e o GitHub Pages (HTTPS) atendem isso.

## Publicar no GitHub Pages

### Opção A — automática (GitHub Actions)
Este repositório já inclui `.github/workflows/deploy.yml`. Basta:
1. Criar um repositório no GitHub e enviar o código (`git push`).
2. Em **Settings → Pages → Build and deployment**, selecionar **GitHub Actions**.
3. A cada push na branch `main`, o site é publicado automaticamente.

### Opção B — manual
```bash
npm run build
# publique o conteúdo da pasta dist/ na branch gh-pages (ou use a extensão que preferir)
```

> **Subcaminho:** o projeto usa `base: './'` (em `vite.config.js`), o que funciona
> tanto na raiz quanto em `https://usuario.github.io/nome-do-repo/`. Se preferir,
> troque por `base: '/nome-do-repo/'`.

## Instalação como app

- **Windows (Chrome/Edge):** abra o site e clique no ícone de instalar na barra de
  endereços (ou menu → *Instalar Cofre*).
- **Android (Chrome):** menu → *Adicionar à tela inicial / Instalar app*.

Depois de instalado e com o Service Worker ativo, o app funciona sem internet.

## Segurança — notas

- A senha mestra **nunca** é armazenada; é usada apenas para derivar a chave em memória.
- Dados descriptografados existem **somente em memória** e são apagados ao fechar/atualizar.
- O `.cofre` só é decifrável com a senha mestra correta (AES-GCM autentica a integridade).
- Use uma senha mestra forte: ela é o único fator de proteção do arquivo.

## Estrutura

```
├─ index.html
├─ vite.config.js
├─ package.json
├─ public/                 ícones do PWA
└─ src/
   ├─ main.js              bootstrap + wipe ao fechar
   ├─ style.css            tema escuro
   ├─ App.vue              shell + roteamento de telas
   ├─ lib/
   │  ├─ crypto.js         AES-256-GCM + PBKDF2 (Web Crypto)
   │  ├─ files.js          File System Access + fallback + recentes
   │  ├─ generator.js      gerador de senha (CSPRNG)
   │  ├─ strength.js       indicador de força
   │  ├─ icons.js          ícones SVG inline (offline)
   │  └─ store.js          estado reativo + ações
   └─ components/          telas e sheets (.vue)
```
