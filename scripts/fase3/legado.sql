-- Dados da fase 2 (esquema 0001+0002) para testar a migration 0003 sobre linhas que já existem.
INSERT INTO sources (id, tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal)
  SELECT '00000000-0000-0000-0000-0000000000f1', id, 'fonte', 'A', 120, 'SP', 'alta', 'teste' FROM tenants WHERE slug = 'padrao';
INSERT INTO stores (id, tenant_id, rede, nome, tipo)
  SELECT '00000000-0000-0000-0000-0000000000a1', id, 'Rede', 'Loja', 'online' FROM tenants WHERE slug = 'padrao';
INSERT INTO products (id, tenant_id, chave_hash, familia_chave, nome, categoria, quantidade, unidade)
  SELECT '00000000-0000-0000-0000-0000000000b1', id, 'h', 'f', 'Produto', 'higiene_bebe', 1, 'un' FROM tenants WHERE slug = 'padrao';
INSERT INTO offers (id, tenant_id, product_id, store_id, source_id, preco_centavos, preco_por_unidade_centavos, frete_status,
                    disponivel, link, coletada_em, id_externo)
  SELECT ('00000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid, t.id,
         '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1',
         1000, 1000, 'a_confirmar', true, 'https://x.test', now(), 'O' || n
  FROM tenants t, generate_series(1, 3) n WHERE t.slug = 'padrao';
-- 1: notificar; 2: aguardar_aprovacao já aprovada; 3: aguardar_aprovacao ainda não aprovada.
INSERT INTO alerts (id, tenant_id, offer_id, score, decisao, motivo, aprovado_por, aprovado_em, store_id, familia_chave,
                    preco_centavos, preco_efetivo_por_unidade, preco_referencia_por_unidade, entrega_a_confirmar)
  SELECT ('00000000-0000-0000-0000-0000000002' || lpad(n::text, 2, '0'))::uuid, t.id,
         ('00000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid, 80,
         CASE n WHEN 1 THEN 'notificar' ELSE 'aguardar_aprovacao' END, 'teste',
         CASE n WHEN 2 THEN 'responsável' END, CASE n WHEN 2 THEN '2026-09-02T10:00:00Z'::timestamptz END,
         '00000000-0000-0000-0000-0000000000a1', 'f', 1000, 1000, 2000, true
  FROM tenants t, generate_series(1, 3) n WHERE t.slug = 'padrao';
