# Conectar uma fonte de ofertas (Lomadee e outras)

O pipeline aceita **várias fontes ao mesmo tempo**. Cada canal (Lomadee, Mercado Livre, uma rede de afiliados,
um feed de produtos) é um adaptador registrado em `backend/src/fontes/registro.ts`. O tenant liga uma fonte a um
adaptador na config, o operador grava as credenciais dela **cifradas no banco** (AES-256-GCM, P2) e a coleta
roda uma fonte (`--fonte`) ou todas as ativas (`--todas`). Segredo nunca entra no repositório, no chat, na
config nem em log.

## Passo a passo (uma fonte que já tem adaptador, como a Lomadee)

1. **Chave de cifra das credenciais** (uma vez, guarde em lugar seguro; perdê-la obriga a regravar as credenciais):
   variável `CREDENTIALS_KEY` com 32 bytes em base64 (`openssl rand -base64 32`; o painel do projeto tem um botão
   que gera uma). Ao girar a chave, defina também `CREDENTIALS_KEY_VERSION` (ex.: `v2`) e regrave.
2. **Onde guardar a chave.** Num ambiente de nuvem da Anthropic, use **Segredos de rede** (tela de edição do ambiente): o proxy
   anexa a chave às chamadas para o endereço cadastrado e a sessão nunca a vê. A caixa "Variáveis de ambiente" mostra os
   valores a quem usa o ambiente, então não serve para chave. Lomadee: **Add secret** → Nome `Lomadee`; Tipo `Bearer`;
   Allowed websites `api.lomadee.com.br`; em Custom headers, nome `x-api-key`, **prefixo apagado** (a chave vai pura),
   Valor = a chave. A chave precisa dos escopos `products:read` e `brands:read` (e `shortener:write` para o link rastreado).
   Não dá para ver o valor depois de salvar (apague e refaça para trocar). Vale em sessão **nova**.
3. **Rede**: com o acesso à rede em "Total" não é preciso liberar endereço. `api.lomadee.com.br` é o servidor de produção
   (`api-beta.lomadee.com.br` é o antigo e será desligado). Num computador com proxy de ambiente, rode o Node com
   `NODE_USE_ENV_PROXY=1`.
4. **Só quando houver servidor próprio:** gravar a credencial cifrada no banco (lê as variáveis `FONTE_LOMADEE_APIKEY` e `CREDENTIALS_KEY`, não imprime nada além dos nomes dos campos). No ambiente de nuvem com segredo de rede, **pule este passo** e use `--chave-pelo-proxy` na coleta:
   `node backend/dist/pipeline/credencial.js --tenant padrao --fonte lomadee --de-ambiente`
   Conferir sem expor: `... --verificar`. Alternativa: `echo '{"apiKey":"..."}' | ... --stdin`.
5. **Achar as marcas** da Lomadee que interessam (Drogasil, Droga Raia e outras): `GET /affiliate/brands` com a chave. O id
   de cada marca (organização) é o que se vincula às lojas do app.
6. **Vincular as marcas às lojas** aprovadas (tabelas `stores`, `store_service_areas`, `store_source_refs`; modelo em
   `scripts/fase2/seed.sql`; `id_externo` = id da marca na Lomadee). O comando de provisionamento ainda não existe (D26).
7. **Ativar a fonte** (`sources.ativa = true`) só depois de ler os termos de uso e registrar em `SOURCES.md`.
8. **Coletar**: `node backend/dist/pipeline/coletar.js --tenant padrao --fonte lomadee` ou `--todas`
   (precisa de `DATABASE_URL`, `CREDENTIALS_KEY` e `--listas-medicamentos`; com segredo de rede, acrescente `--chave-pelo-proxy` e
   dispense `CREDENTIALS_KEY`). Agendamento a cada 2 h ainda não existe.

## O que a API da Lomadee entrega (conferido em respostas reais, 2026-10-28)
Produtos em `GET /affiliate/products` (`page`, `limit` de 1 a 100, `isAvailable`, `organizationIds`). **A resposta real difere
da documentação**: é só `{ data: [...] }` (sem `count`: a última página é a que vem incompleta); o **preço vem em reais
decimais** (96.99), não em centavos; `categories` fica no **produto** como `[{id, name}]` com nomes em inglês (`medicines`,
`hygiene`, `health_beauty`, `cosmetics`, `food_beverages`, e as genéricas `commerce_retail`, `industry_production`); cada
produto tinha uma opção, com `ean` numérico em 100% dos itens das farmácias, e `brands` vazio. Limite de 60 pedidos por
minuto por chave (a coleta espera 1,1 s entre pedidos). Ainda **não ligado**: o link rastreado de afiliado (o `url` do
produto é a página da loja; exige o encurtador, `POST /affiliate/shorten`).

**Marcas da conta (134, lidas em 2026-10-28):** Drogasil e Droga Raia **não estão na lista**. As farmácias disponíveis são
Drogasmil e Drogaria Rosário (mesmo site, 1.568 itens disponíveis) e PromoFarma (171 itens); BabyStock e Shopee devolvem
catálogo vazio. A primeira coleta real leu 1.739 produtos em 50 s, sem erro.

**No ambiente de nuvem**, o Node só usa o proxy (que anexa a chave do segredo de rede) com `NODE_USE_ENV_PROXY=1`:
`NODE_USE_ENV_PROXY=1 node backend/dist/pipeline/coletar.js --tenant padrao --fonte lomadee --chave-pelo-proxy --listas-medicamentos <arquivo>`.
Sem essa variável a chamada sai sem chave e a Lomadee responde 401.

## Outros canais além da Lomadee
A mesma chave da Lomadee dá acesso a **outras lojas da rede dela**: basta vincular os ids de loja e mapear as
categorias, sem adaptador novo. Canais com API própria precisam de um adaptador:

1. Ler os termos da fonte e registrar em `SOURCES.md` (tipo A a E, base legal, frequência, confiabilidade).
2. Criar `backend/src/fontes/<canal>.ts` com uma `FabricaFonte` (tipo, campos secretos, `criar`) que devolve um
   `SourceAdapter`, e registrar em `registro.ts`. O formato de saída é sempre `OfertaBruta`.
3. Acrescentar o bloco `fontes.<nome>` na config do tenant (`adaptador`, `mapaCategorias` e o que o adaptador usar).
4. Inserir a linha em `sources` e gravar as credenciais (passos 4 a 6 acima).
5. Testes do adaptador com respostas gravadas, como em `backend/fixtures/lomadee`.

Candidatos já discutidos: Mercado Livre (DECISIONS 20 e 26; busca devolveu 403 a apps comuns e não há API de
link de afiliado), redes de afiliados com feed de produtos (campo EAN é opcional no padrão Awin), Amazon
(API condicionada a vendas prévias). Nenhum tem adaptador ainda.
