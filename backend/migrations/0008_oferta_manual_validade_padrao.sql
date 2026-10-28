-- Oferta manual (TIPO E): guarda se a validade veio do prazo padrão do tenant (D21), para o painel avisar o operador.
ALTER TABLE offers ADD COLUMN validade_padrao_aplicada boolean NOT NULL DEFAULT false;
