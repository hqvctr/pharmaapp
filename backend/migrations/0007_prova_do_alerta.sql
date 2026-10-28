-- A "prova" do alerta (openapi.yaml, schema Prova): o que o motor mediu antes de avisar, por embalagem e loja.
-- Gravada na criação do alerta (o histórico muda depois; a prova é o retrato do momento). Alerta antigo e oferta
-- manual ficam sem prova (null no contrato).
ALTER TABLE alerts
  ADD COLUMN prova_menor_centavos integer CHECK (prova_menor_centavos IS NULL OR prova_menor_centavos > 0),
  ADD COLUMN prova_maior_centavos integer CHECK (prova_maior_centavos IS NULL OR prova_maior_centavos > 0),
  ADD COLUMN prova_dias           integer CHECK (prova_dias IS NULL OR prova_dias > 0),
  ADD CHECK ((prova_menor_centavos IS NULL) = (prova_maior_centavos IS NULL) AND (prova_menor_centavos IS NULL) = (prova_dias IS NULL)),
  ADD CHECK (prova_menor_centavos IS NULL OR prova_menor_centavos <= prova_maior_centavos);
