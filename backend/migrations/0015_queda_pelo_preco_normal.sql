-- "Baixou X%" dos seguidos passa a contar do preço normal do produto (mediana de 30 dias em todas as lojas, DECISIONS 102).
-- A coluna deixa de guardar um preço-base e passa a guardar o preço do último aviso de queda enquanto o preço segue abaixo do
-- normal (null = pronto para avisar na próxima queda).
ALTER TABLE seguidos RENAME COLUMN preco_base_centavos TO queda_avisada_centavos;
UPDATE seguidos SET queda_avisada_centavos = NULL;
