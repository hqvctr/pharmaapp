-- Link rastreado da fonte de afiliados (Lomadee: encurtador). Guardado por oferta e válido enquanto o link da loja
-- (`link_rastreado_de`) não mudar; se mudar, o link é gerado de novo. Nunca contém identificador de pessoa (DECISIONS 67).
ALTER TABLE offers
  ADD COLUMN link_rastreado    text CHECK (link_rastreado IS NULL OR link_rastreado ~ '^https://'),
  ADD COLUMN link_rastreado_de text,
  ADD COLUMN link_rastreado_em timestamptz,
  ADD CONSTRAINT offers_link_rastreado_completo
    CHECK ((link_rastreado IS NULL) = (link_rastreado_de IS NULL) AND (link_rastreado IS NULL) = (link_rastreado_em IS NULL));
