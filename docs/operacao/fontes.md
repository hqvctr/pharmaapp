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
2. **Segredo da fonte como variável de ambiente** do ambiente de nuvem (menu do ambiente → Editar). Nome:
   `FONTE_<FONTE>_<CAMPO>` em maiúsculas. Lomadee: **`FONTE_LOMADEE_APIKEY`**. **Não cole chave nenhuma no chat.**
   A chave precisa dos escopos `products:read` e `brands:read` (e `shortener:write` quando ligarmos o link rastreado).
3. **Rede**: a Lomadee responde com o acesso à rede em "Total". Se o ambiente estiver restrito, libere `api.lomadee.com.br`
   (servidor de produção; `api-beta.lomadee.com.br` é o antigo e será desligado).
4. **Gravar a credencial cifrada** (lê as variáveis, não imprime nada além dos nomes dos campos):
   `node backend/dist/pipeline/credencial.js --tenant padrao --fonte lomadee --de-ambiente`
   Conferir sem expor: `... --verificar`. Alternativa: `echo '{"apiKey":"..."}' | ... --stdin`.
5. **Achar as marcas** da Lomadee que interessam (Drogasil, Droga Raia e outras): `GET /affiliate/brands` com a chave. O id
   de cada marca (organização) é o que se vincula às lojas do app.
6. **Vincular as marcas às lojas** aprovadas (tabelas `stores`, `store_service_areas`, `store_source_refs`; modelo em
   `scripts/fase2/seed.sql`; `id_externo` = id da marca na Lomadee). O comando de provisionamento ainda não existe (D26).
7. **Ativar a fonte** (`sources.ativa = true`) só depois de ler os termos de uso e registrar em `SOURCES.md`.
8. **Coletar**: `node backend/dist/pipeline/coletar.js --tenant padrao --fonte lomadee` ou `--todas`
   (precisa de `DATABASE_URL`, `CREDENTIALS_KEY` e `--listas-medicamentos`). Agendamento a cada 2 h ainda não existe.

## O que a API da Lomadee entrega (documentação oficial, docs.lomadee.com.br)
Produtos em `GET /affiliate/products` (`page`, `limit` de 1 a 100, `isAvailable`, `organizationIds`), resposta
`{ data, count }`. Cada produto tem opções com `ean` (**código de barras: serve de GTIN**), `pricing[{listPrice, price}]`
**em centavos**, `categories`, `brands` e `seller`. Limite de 60 pedidos por minuto por chave (a coleta espera 1,1 s
entre pedidos). Ainda **presumido**: a forma dos itens de `categories` e `brands`. Ainda **não ligado**: o link rastreado
de afiliado (o `url` do produto não rende comissão; exige o encurtador, `POST /affiliate/shorten`).
Na primeira chamada real, guarde uma resposta crua (sem a chave) para trocar os dados sintéticos de
`backend/fixtures/lomadee` e confirmar categorias, marcas e se `ean` vem preenchido.

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
