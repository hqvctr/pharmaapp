# Conectar uma fonte de ofertas (Lomadee e outras)

O pipeline aceita **várias fontes ao mesmo tempo**. Cada canal (Lomadee, Mercado Livre, uma rede de afiliados,
um feed de produtos) é um adaptador registrado em `backend/src/fontes/registro.ts`. O tenant liga uma fonte a um
adaptador na config, o operador grava as credenciais dela **cifradas no banco** (AES-256-GCM, P2) e a coleta
roda uma fonte (`--fonte`) ou todas as ativas (`--todas`). Segredo nunca entra no repositório, no chat, na
config nem em log.

## Passo a passo (uma fonte que já tem adaptador, como a Lomadee)

1. **Chave de cifra das credenciais** (uma vez, guarde em lugar seguro; perdê-la obriga a regravar as credenciais):
   `openssl rand -base64 32` → variável `CREDENTIALS_KEY`. Ao girar a chave, defina também
   `CREDENTIALS_KEY_VERSION` (ex.: `v2`) e regrave.
2. **Segredos da fonte como variáveis de ambiente do ambiente da sessão** (menu do ambiente na barra de título
   da sessão → Editar). Nome: `FONTE_<FONTE>_<CAMPO>` em maiúsculas. Lomadee:
   `FONTE_LOMADEE_APPTOKEN` e `FONTE_LOMADEE_SOURCEID`. **Não cole chave nenhuma no chat.**
3. **Rede**: no mesmo menu, em Network access, adicione em *Allowed domains* o host da API da fonte e, se quiser
   que a documentação seja consultada, o da documentação. Lomadee (a confirmar na documentação oficial; a config
   atual usa `api.lomadee.com`): `api.lomadee.com`. Hoje, sem isso, o ambiente não resolve esses endereços.
4. **Gravar a credencial cifrada** (lê as variáveis, não imprime nada além dos nomes dos campos):
   `node backend/dist/pipeline/credencial.js --tenant padrao --fonte lomadee --de-ambiente`
   Conferir sem expor: `... --verificar`. Alternativa: `echo '{"appToken":"...","sourceId":"..."}' | ... --stdin`.
5. **Vincular as lojas** da fonte que o operador aprova (tabelas `stores`, `store_service_areas`, `store_source_refs`;
   modelo em `scripts/fase2/seed.sql`). O comando de provisionamento ainda não existe (D26, parte da fase 3).
   Os ids de loja da Lomadee saem da própria API (listagem de lojas), na primeira chamada real.
6. **Ativar a fonte** (`sources.ativa = true`) só depois de ler os termos de uso e registrar em `SOURCES.md`.
7. **Coletar**: `node backend/dist/pipeline/coletar.js --tenant padrao --fonte lomadee` ou `--todas`
   (precisa de `DATABASE_URL`, `CREDENTIALS_KEY` e `--listas-medicamentos`). Agendamento a cada 2 h ainda não existe.

## Primeira chamada real da Lomadee
O formato da resposta ainda é **presumido** (BACKLOG). Na primeira coleta real, guarde uma resposta crua (sem o
token) para substituir os dados sintéticos e ajustar `parseOferta`, e confira se a API informa GTIN, marca,
categorias e frete. Os mapas de categoria em `config/tenants/padrao.json` (`fontes.lomadee.mapaCategorias`)
também são presumidos.

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
