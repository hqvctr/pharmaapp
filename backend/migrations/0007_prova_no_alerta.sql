-- Prova do desconto guardada no alerta (proposta de UX, BACKLOG_UX B-02): menor e maior preço por
-- unidade do período medido antes do alerta e quantos dias foram medidos. Cópia do que o motor viu,
-- como o preço e a referência já são. Alerta antigo fica com NULL e a API manda prova = null.
ALTER TABLE alerts
  ADD COLUMN piso_por_unidade   numeric(14, 4) CHECK (piso_por_unidade IS NULL OR piso_por_unidade > 0),
  ADD COLUMN maior_por_unidade  numeric(14, 4) CHECK (maior_por_unidade IS NULL OR maior_por_unidade > 0),
  ADD COLUMN dias_medidos       smallint CHECK (dias_medidos IS NULL OR dias_medidos >= 0);
