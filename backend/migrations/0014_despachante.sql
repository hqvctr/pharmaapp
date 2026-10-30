-- Fase 4: despachante de avisos e push (DECISIONS 100).

-- 1. Alerta já passado pelo despachante (gerou os avisos de quem o vê, ou não era para gerar). Os alertas que já existem
-- contam como passados: ligar o despachante não manda push de alerta antigo.
ALTER TABLE alerts ADD COLUMN avisos_gerados_em timestamptz;
UPDATE alerts SET avisos_gerados_em = now();
CREATE INDEX alerts_sem_avisos_idx ON alerts (tenant_id, criado_em) WHERE avisos_gerados_em IS NULL;

-- 2. O que aconteceu com o push de cada aviso. A central guarda todo aviso; o push é uma decisão à parte, tomada quando o
-- aviso é enviado (consentimento, aparelho, silêncio, limite diário, anti-repetição, silenciamento).
ALTER TABLE avisos
  ADD COLUMN push    text NOT NULL DEFAULT 'pendente'
                     CHECK (push IN ('pendente', 'enviado', 'sem_consentimento', 'sem_aparelho', 'silenciado', 'limite_diario',
                                     'repetido', 'advertencia_legal', 'expirado', 'falhou')),
  ADD COLUMN push_em timestamptz,
  ADD CHECK ((push = 'pendente') = (push_em IS NULL));
-- Avisos gravados antes do despachante não viram push.
UPDATE avisos SET push = 'expirado', push_em = now();
CREATE INDEX avisos_push_pendente_idx ON avisos (tenant_id, user_id, criado_em) WHERE push = 'pendente';
CREATE INDEX avisos_push_enviado_idx ON avisos (tenant_id, user_id, push_em DESC) WHERE push = 'enviado';
-- Um aviso de promoção excepcional por pessoa e alerta, mesmo que o despachante rode duas vezes.
CREATE UNIQUE INDEX avisos_alerta_uq ON avisos (tenant_id, user_id, alert_id) WHERE tipo = 'promocao_excepcional' AND alert_id IS NOT NULL;

-- 3. Estado dos produtos seguidos visto na última avaliação, para avisar só na virada (voltou ao estoque, menor preço em 180 dias)
-- e medir a queda desde um preço-base (o de quando a avaliação começou, ou o do último aviso de queda).
ALTER TABLE seguidos
  ADD COLUMN estado_em           timestamptz,
  ADD COLUMN estoque_visto       boolean,
  ADD COLUMN menor_180d_visto    boolean,
  ADD COLUMN preco_base_centavos integer CHECK (preco_base_centavos IS NULL OR preco_base_centavos > 0);

-- 4. `deliveries` (esquema inicial) nunca recebeu linha: o registro do push passa a ser a coluna `avisos.push`.
DROP TABLE deliveries;
