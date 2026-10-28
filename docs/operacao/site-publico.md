# Site público do app (`site/`)

Três páginas estáticas: `index.html` (o que é o app, com aviso de afiliado), `termos.html` e `privacidade.html`
(provisórias, marcadas como em revisão jurídica). Servem a duas coisas:

1. **O endereço do canal na Lomadee.** O canal "Aplicativo Mobile" **exige link de loja de apps** (Google Play, Apple
   Store ou Microsoft Store; conferido no formulário em 2026-10-28), então o site sozinho não serve a esse tipo. Ver "Se a Lomadee recusar".
2. **As URLs de termos e privacidade** que `GET /v1/configuracao` devolve (config `app.urlSite` + `app.termos.caminho`
   e `app.privacidade.caminho` em `backend/config/tenants/padrao.json`).

## Estado (2026-10-28): PUBLICADO em https://economae.pages.dev

Projeto Cloudflare Pages `economae` ligado a `hqvctr/pharmaapp`, branch de produção `claude/zen-gates-965k2e`, sem build, saída `site`.
A Cloudflare serve `/termos` e `/privacidade` (redireciona os `.html`), e a config usa os caminhos sem `.html`.
**Pendências:** (a) trocar a branch de produção quando houver uma branch estável (apagar a atual derruba o site); (b) conferir no GitHub se o app da
Cloudflare ficou limitado ao repositório `pharmaapp`.

## Como foi publicado (referência)

Opção recomendada: **Cloudflare Pages** (grátis, aceita repositório privado, sem cartão).
1. Cloudflare → Workers & Pages → Create → Pages → conectar o repositório `hqvctr/pharmaapp`.
2. Branch de produção: a que o responsável escolher. Build command: vazio. Output directory: `site`.
3. O endereço sai como `https://<nome-do-projeto>.pages.dev`. **Se o nome não for `economae`, ajustar
   `app.urlSite` em `padrao.json`** (hoje `https://economae.pages.dev`, um palpite) e fazer o deploy da API.

Não usar GitHub Pages: exige repositório público (ou plano pago) e este repositório tem parecer jurídico, contrato
e decisões internas.

## Antes de o app ir para usuários reais
- Trocar os textos de `termos.html` e `privacidade.html` pelos revisados (BACKLOG, fase 3: "termos e política em
  revisão da assessoria") e subir a `versao` em `padrao.json`; a versão nova faz o app pedir novo aceite.
- Incluir na política o contato do encarregado/responsável (e-mail), que ainda não foi definido: o responsável
  precisa escolher um endereço que possa ser público. O de remetente atual é de Gmail pessoal.
- Domínio próprio (~R$ 40/ano) troca `*.pages.dev` por um endereço mais confiável, para a Lomadee e para a Play.

## Se a Lomadee recusar o link do site
- Perguntar ao suporte qual link aceitam para app ainda não publicado (a pergunta cabe nas 6 de `docs/juridico/lomadee-termos.md`).
- Alternativa: publicar o app em teste fechado na Google Play (exige a taxa única de registro, BACKLOG fase 4/6) e usar
  o link da página de teste.
