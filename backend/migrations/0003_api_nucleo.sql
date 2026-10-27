-- Fase 3: tabelas e colunas do contrato do núcleo (openapi.yaml 1.1.0 e admin.yaml 1.0.0).
-- Segue as regras do esquema inicial: tenant_id em toda tabela, referências compostas (tenant_id, id)
-- e exclusão de conta em cascata (DECISIONS 7) em toda tabela que guarda dado da pessoa.

-- Busca textual de produto sem acento (contrato: GET /v1/produtos).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
-- unaccent() não é IMMUTABLE; o wrapper permite indexar. O dicionário é fixado para não variar com a sessão.
CREATE FUNCTION f_unaccent(texto text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, texto) $$;

-- 1. Operadores (área admin). Cadastro por comando de linha, sem rota (DECISIONS 40).
CREATE TABLE operadores (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  email      text NOT NULL,
  nome       text NOT NULL,
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, id)
);
CREATE UNIQUE INDEX operadores_tenant_email_uq ON operadores (tenant_id, lower(email));

-- 2. Sessões. Access e refresh opacos: o banco guarda só o SHA-256. A mesma linha serve às duas
-- audiências (pessoa do app ou operador, nunca as duas). O refresh gira a cada renovação; o hash do
-- refresh anterior fica guardado para detectar reuso (reuso revoga a sessão).
CREATE TABLE sessions (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  audiencia             text NOT NULL CHECK (audiencia IN ('app', 'operador')),
  user_id               uuid,
  operador_id           uuid,
  access_hash           bytea NOT NULL,
  access_expira_em      timestamptz NOT NULL,
  refresh_hash          bytea NOT NULL,
  refresh_anterior_hash bytea,
  refresh_expira_em     timestamptz NOT NULL,
  criada_em             timestamptz NOT NULL,
  renovada_em           timestamptz,
  revogada_em           timestamptz,
  revogada_motivo       text CHECK (revogada_motivo IN ('saiu', 'reuso', 'conta_excluida', 'operador_desativado')),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, operador_id) REFERENCES operadores (tenant_id, id) ON DELETE CASCADE,
  CHECK ((audiencia = 'app' AND user_id IS NOT NULL AND operador_id IS NULL)
      OR (audiencia = 'operador' AND operador_id IS NOT NULL AND user_id IS NULL)),
  CHECK ((revogada_em IS NULL) = (revogada_motivo IS NULL))
);
CREATE UNIQUE INDEX sessions_access_uq ON sessions (access_hash);
CREATE UNIQUE INDEX sessions_refresh_uq ON sessions (refresh_hash);
CREATE UNIQUE INDEX sessions_refresh_anterior_uq ON sessions (refresh_anterior_hash) WHERE refresh_anterior_hash IS NOT NULL;
CREATE INDEX sessions_user_idx ON sessions (tenant_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX sessions_operador_idx ON sessions (tenant_id, operador_id) WHERE operador_id IS NOT NULL;

-- 3. Login com Apple (só quando existir o app de iPhone). A credencial para revogar a conta na Apple
-- fica cifrada (AES-256-GCM, mesma chave versionada de source_credentials); nunca em claro.
ALTER TABLE users
  ADD COLUMN apple_sub                text,
  ADD COLUMN apple_credencial_cifrada bytea,
  ADD COLUMN apple_chave_versao       text,
  ADD CHECK ((apple_credencial_cifrada IS NULL) = (apple_chave_versao IS NULL));
CREATE UNIQUE INDEX users_tenant_apple_uq ON users (tenant_id, apple_sub) WHERE apple_sub IS NOT NULL;

-- 4. Produto: chave da marca (D15), imagem (D13) e advertências da NBCAL (triagem calcula, hoje não grava).
-- `marca` (texto) continua sendo o nome para exibir.
ALTER TABLE products
  ADD COLUMN marca_chave  text CHECK (marca_chave IS NULL OR marca_chave ~ '^[a-z0-9-]+$'),
  ADD COLUMN imagem_url   text CHECK (imagem_url IS NULL OR imagem_url ~ '^https://'),
  ADD COLUMN advertencias text[] NOT NULL DEFAULT '{}';
CREATE INDEX products_marca_idx ON products (tenant_id, marca_chave) WHERE marca_chave IS NOT NULL;
CREATE INDEX products_busca_idx ON products USING gin (f_unaccent(lower(nome)) gin_trgm_ops);

-- 5. Silenciamento de loja ou marca. `push` só deixa de receber push; `tudo` some de feed, pesquisa,
-- página do produto e avisos.
CREATE TABLE silenciamentos (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  tipo             text NOT NULL CHECK (tipo IN ('loja', 'marca')),
  loja_id          uuid,
  marca_chave      text CHECK (marca_chave IS NULL OR marca_chave ~ '^[a-z0-9-]+$'),
  alcance          text NOT NULL CHECK (alcance IN ('push', 'tudo')),
  criado_em        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, loja_id) REFERENCES stores (tenant_id, id),
  CHECK ((tipo = 'loja' AND loja_id IS NOT NULL AND marca_chave IS NULL)
      OR (tipo = 'marca' AND marca_chave IS NOT NULL AND loja_id IS NULL))
);
CREATE UNIQUE INDEX silenciamentos_loja_uq ON silenciamentos (tenant_id, user_id, loja_id) WHERE tipo = 'loja';
CREATE UNIQUE INDEX silenciamentos_marca_uq ON silenciamentos (tenant_id, user_id, marca_chave) WHERE tipo = 'marca';

-- 6. Produtos seguidos, com os cinco avisos configuráveis (ConfigAvisosProduto).
CREATE TABLE seguidos (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  user_id               uuid NOT NULL,
  product_id            uuid NOT NULL,
  promocao_excepcional  boolean NOT NULL DEFAULT true,
  queda_percentual      smallint CHECK (queda_percentual IS NULL OR queda_percentual BETWEEN 1 AND 99),
  voltou_estoque        boolean NOT NULL DEFAULT false,
  menor_preco_180d      boolean NOT NULL DEFAULT false,
  promocao_acabando     boolean NOT NULL DEFAULT false,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, user_id, product_id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id)
);

-- 7. Revisão do alerta pelo operador. `aprovado_por`/`aprovado_em` (texto livre da fase 1) ficam como
-- legado: nada no código os usa. A situação nova nasce do que já existia.
ALTER TABLE alerts
  ADD COLUMN revisao_situacao    text NOT NULL DEFAULT 'nao_exigida'
                                 CHECK (revisao_situacao IN ('pendente', 'aprovado', 'rejeitado', 'nao_exigida')),
  ADD COLUMN revisao_operador_id uuid,
  ADD COLUMN revisao_em          timestamptz,
  ADD COLUMN revisao_observacao  text,
  ADD FOREIGN KEY (tenant_id, revisao_operador_id) REFERENCES operadores (tenant_id, id),
  ADD CHECK ((revisao_situacao IN ('aprovado', 'rejeitado')) = (revisao_em IS NOT NULL));
UPDATE alerts SET revisao_situacao = 'aprovado', revisao_em = aprovado_em
  WHERE aprovado_em IS NOT NULL AND decisao = 'aguardar_aprovacao';
UPDATE alerts SET revisao_situacao = 'pendente' WHERE decisao = 'aguardar_aprovacao' AND aprovado_em IS NULL;
CREATE INDEX alerts_revisao_idx ON alerts (tenant_id, criado_em DESC) WHERE revisao_situacao = 'pendente';

-- 8. Oferta: quem cadastrou à mão (TIPO E) e se está escondida por denúncia (limpa quando o preço muda).
ALTER TABLE offers
  ADD COLUMN criada_por   uuid,
  ADD COLUMN escondida_em timestamptz,
  ADD FOREIGN KEY (tenant_id, criada_por) REFERENCES operadores (tenant_id, id);

-- 9. Eventos do alerta (aberto, clicado, compartilhado). `deliveries.canal` só aceita push e não cabe aqui.
-- Base do cálculo de denúncia (pessoas distintas que abriram ou clicaram em 7 dias).
CREATE TABLE alert_events (
  id            bigint GENERATED ALWAYS AS IDENTITY,
  tenant_id     uuid NOT NULL,
  user_id       uuid NOT NULL,
  alert_id      uuid NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('aberto', 'clicado', 'compartilhado')),
  origem        text NOT NULL CHECK (origem IN ('push', 'feed', 'central', 'produto')),
  ocorrido_em   timestamptz NOT NULL,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, alert_id) REFERENCES alerts (tenant_id, id)
);
CREATE INDEX alert_events_base_idx ON alert_events (tenant_id, alert_id, ocorrido_em DESC);
CREATE INDEX alert_events_user_idx ON alert_events (tenant_id, user_id);

-- Chaves de idempotência (24 h). O escopo é o id da pessoa ou do operador em texto, sem FK: a limpeza por
-- expiração e a exclusão de conta apagam as linhas do escopo.
CREATE TABLE idempotencia_chaves (
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  escopo          text NOT NULL,
  rota            text NOT NULL,
  chave           text NOT NULL,
  corpo_hash      bytea NOT NULL,
  resposta_status smallint NOT NULL,
  resposta        jsonb NOT NULL,
  criada_em       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, escopo, rota, chave)
);
CREATE INDEX idempotencia_chaves_expira_idx ON idempotencia_chaves (criada_em);

-- 10. Avaliação ("útil / não útil") e denúncia: uma de cada por pessoa e alerta. O alerta já é por
-- oferta e preço, então a contagem recomeça sozinha quando o preço muda e nasce um alerta novo.
CREATE TABLE avaliacoes (
  tenant_id    uuid NOT NULL,
  user_id      uuid NOT NULL,
  alert_id     uuid NOT NULL,
  valor        text NOT NULL CHECK (valor IN ('util', 'nao_util')),
  avaliado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, alert_id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, alert_id) REFERENCES alerts (tenant_id, id)
);

CREATE TABLE denuncias (
  tenant_id      uuid NOT NULL,
  user_id        uuid NOT NULL,
  alert_id       uuid NOT NULL,
  motivo         text NOT NULL CHECK (motivo IN ('preco_errado', 'sem_estoque')),
  denunciado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, alert_id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, alert_id) REFERENCES alerts (tenant_id, id)
);
CREATE INDEX denuncias_alerta_idx ON denuncias (tenant_id, alert_id);

-- Caso aberto quando o limite de denúncias é passado e a oferta some. Os números são cópia do momento
-- da abertura (cai a contagem viva se quem denunciou excluir a conta; o caso não muda).
-- Um caso por alerta: depois de restaurado, denúncia nova do mesmo alerta é ignorada até o preço mudar.
CREATE TABLE casos_denuncia (
  id                   uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL,
  alert_id             uuid NOT NULL,
  offer_id             uuid NOT NULL,
  aberto_em            timestamptz NOT NULL,
  situacao             text NOT NULL DEFAULT 'escondida' CHECK (situacao IN ('escondida', 'restaurada', 'mantida_escondida')),
  denuncias            integer NOT NULL CHECK (denuncias >= 0),
  pessoas_base         integer NOT NULL CHECK (pessoas_base >= 0),
  limite               integer NOT NULL CHECK (limite >= 1),
  motivo_preco_errado  integer NOT NULL CHECK (motivo_preco_errado >= 0),
  motivo_sem_estoque   integer NOT NULL CHECK (motivo_sem_estoque >= 0),
  resolucao            text CHECK (resolucao IN ('restaurar', 'manter_escondida')),
  resolucao_operador_id uuid,
  resolucao_em         timestamptz,
  resolucao_observacao text,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, alert_id),
  FOREIGN KEY (tenant_id, alert_id) REFERENCES alerts (tenant_id, id),
  FOREIGN KEY (tenant_id, offer_id) REFERENCES offers (tenant_id, id),
  FOREIGN KEY (tenant_id, resolucao_operador_id) REFERENCES operadores (tenant_id, id),
  CHECK ((resolucao IS NULL) = (resolucao_em IS NULL)),
  CHECK ((situacao = 'escondida') = (resolucao IS NULL))
);
CREATE INDEX casos_denuncia_fila_idx ON casos_denuncia (tenant_id, aberto_em DESC) WHERE situacao = 'escondida';

-- 11. Central de avisos dentro do app. Retenção de 90 dias (config; limpeza por rotina).
CREATE TABLE avisos (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  user_id        uuid NOT NULL,
  tipo           text NOT NULL CHECK (tipo IN ('promocao_excepcional', 'queda_percentual', 'voltou_estoque', 'menor_preco_180d', 'promocao_acabando')),
  origem         text NOT NULL CHECK (origem IN ('categoria', 'seguido')),
  product_id     uuid NOT NULL,
  store_id       uuid,
  alert_id       uuid,
  preco_centavos integer CHECK (preco_centavos IS NULL OR preco_centavos > 0),
  queda          numeric(5, 4) CHECK (queda IS NULL OR queda BETWEEN 0 AND 1),
  valida_ate     timestamptz,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  lido_em        timestamptz,
  PRIMARY KEY (id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id),
  FOREIGN KEY (tenant_id, store_id) REFERENCES stores (tenant_id, id),
  FOREIGN KEY (tenant_id, alert_id) REFERENCES alerts (tenant_id, id)
);
CREATE INDEX avisos_user_idx ON avisos (tenant_id, user_id, criado_em DESC, id DESC);
CREATE INDEX avisos_nao_lidos_idx ON avisos (tenant_id, user_id) WHERE lido_em IS NULL;

-- 12. Aparelho para push, preso à sessão: sair, sessão revogada ou conta excluída apagam o registro.
CREATE TABLE dispositivos (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  user_id        uuid NOT NULL,
  session_id     uuid NOT NULL,
  token          text NOT NULL,
  plataforma     text NOT NULL CHECK (plataforma IN ('android', 'ios')),
  versao_app     text NOT NULL,
  registrado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, session_id),
  UNIQUE (tenant_id, token),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, session_id) REFERENCES sessions (tenant_id, id) ON DELETE CASCADE
);

-- 13. Assinatura validada nas lojas de apps. O comprovante nunca é guardado em claro: só o hash, que
-- detecta comprovante de outra conta. O mapeamento dos estados de cada loja ainda será feito (D23).
ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_origem_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_origem_check CHECK (origem IN ('google_play', 'app_store')),
  ADD COLUMN comprovante_hash       bytea,
  ADD COLUMN transacao_original_id  text,
  ADD COLUMN produto_loja_id        text;
CREATE UNIQUE INDEX subscriptions_transacao_uq ON subscriptions (tenant_id, origem, transacao_original_id)
  WHERE transacao_original_id IS NOT NULL;

-- 14. Credencial de fonte (P2, DECISIONS 22): AES-256-GCM, chave por env com id de versão. Só escrita pela API.
CREATE TABLE source_credentials (
  tenant_id        uuid NOT NULL,
  source_id        uuid NOT NULL,
  chave_versao     text NOT NULL,
  iv               bytea NOT NULL CHECK (octet_length(iv) = 12),
  texto_cifrado    bytea NOT NULL,
  tag              bytea NOT NULL CHECK (octet_length(tag) = 16),
  atualizada_em    timestamptz NOT NULL DEFAULT now(),
  atualizada_por   uuid,
  PRIMARY KEY (tenant_id, source_id),
  FOREIGN KEY (tenant_id, source_id) REFERENCES sources (tenant_id, id),
  FOREIGN KEY (tenant_id, atualizada_por) REFERENCES operadores (tenant_id, id)
);

-- 15. Revisão humana da triagem (medicamento e NBCAL), incluindo a liberação (DECISIONS 48).
ALTER TABLE triagem_bloqueios
  ADD COLUMN resultado            text CHECK (resultado IN ('bloqueio_correto', 'falso_positivo', 'liberado')),
  ADD COLUMN revisado_por         uuid,
  ADD COLUMN revisao_observacao   text,
  ADD FOREIGN KEY (tenant_id, revisado_por) REFERENCES operadores (tenant_id, id),
  ADD CHECK ((resultado IS NULL) = (revisado_em IS NULL));

-- 16. Auditoria das ações dos operadores. Nunca guarda valor de credencial.
CREATE TABLE auditoria (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  operador_id  uuid NOT NULL,
  acao         text NOT NULL CHECK (acao IN (
                 'operador_entrou', 'alerta_revisado', 'loja_status_definido', 'fonte_status_definido',
                 'fonte_credencial_gravada', 'denuncia_resolvida', 'triagem_revisada', 'triagem_liberada',
                 'oferta_manual_criada', 'oferta_manual_encerrada')),
  alvo_tipo    text NOT NULL CHECK (alvo_tipo IN ('operador', 'alerta', 'loja', 'fonte', 'caso_denuncia', 'triagem', 'oferta')),
  alvo_id      uuid NOT NULL,
  detalhe      jsonb NOT NULL DEFAULT '{}',
  em           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (tenant_id, operador_id) REFERENCES operadores (tenant_id, id)
);
CREATE INDEX auditoria_em_idx ON auditoria (tenant_id, em DESC, id DESC);

-- Feed e detalhe buscam o alerta mais recente de cada oferta.
CREATE INDEX alerts_oferta_idx ON alerts (tenant_id, offer_id, criado_em DESC, id DESC);
