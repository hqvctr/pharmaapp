-- Histórico por produto (todas as lojas): o selo "menor preço em 180 dias" dos cartões consulta o menor e o maior preço da
-- janela de cada produto; o índice de 0001 começa pela loja e não serve a essa consulta.
CREATE INDEX price_history_produto_idx ON price_history (tenant_id, product_id, observado_em DESC);
