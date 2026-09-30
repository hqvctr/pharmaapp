-- Fase 4: aparelhos que recebem push e estado de cada entrega.

-- Token FCM por aparelho, preso à sessão que o registrou: logout, expiração ou exclusão de conta
-- param o push naquele aparelho sem passo extra.
CREATE TABLE dispositivos (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  user_id        uuid NOT NULL,
  sessao_id      uuid NOT NULL REFERENCES sessoes(id) ON DELETE CASCADE,
  token          text NOT NULL UNIQUE CHECK (length(token) BETWEEN 20 AND 4096),
  plataforma     text NOT NULL CHECK (plataforma IN ('android')),
  criado_em      timestamptz NOT NULL,
  atualizado_em  timestamptz NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX dispositivos_user_idx ON dispositivos (tenant_id, user_id);

-- A linha da entrega é criada antes do envio (reserva contra envio duplicado) e diz como terminou.
ALTER TABLE deliveries
  ADD COLUMN status    text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'falhou')),
  ADD COLUMN erro      text,
  ADD COLUMN criado_em timestamptz NOT NULL DEFAULT now();
