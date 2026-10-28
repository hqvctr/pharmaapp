-- `Seguimento.atualizado_em` (contrato): quando os avisos do produto foram trocados pela última vez.
ALTER TABLE seguidos ADD COLUMN atualizado_em timestamptz NOT NULL DEFAULT now();
