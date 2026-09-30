-- Cenário do critério de pronto da fase 2. Lojas fictícias; nada aqui vai para produção.
\set ON_ERROR_STOP on
WITH t AS (SELECT id FROM tenants WHERE slug = 'economae')
INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, status_confianca, confiabilidade, base_legal, ativa)
SELECT id, 'lomadee', 'A', 120, 'SP', 'aprovada', 'alta',
       'Programa de afiliados Lomadee (termos a registrar em SOURCES.md na vinculação)', true FROM t;

WITH t AS (SELECT id FROM tenants WHERE slug = 'economae')
INSERT INTO stores (tenant_id, rede, nome, tipo, status, reputacao)
SELECT id, 'Farmácia Teste A', 'Farmácia Teste A (online)', 'online', 'aprovada', 0.90 FROM t
UNION ALL
SELECT id, 'Farmácia Teste B', 'Farmácia Teste B (online)', 'online', 'em_observacao', 0.70 FROM t;

-- Entrega no estado de SP.
INSERT INTO store_service_areas (tenant_id, store_id, cep_inicio, cep_fim, prazo_dias)
SELECT tenant_id, id, '01000000', '19999999', 3 FROM stores;

INSERT INTO store_source_refs (tenant_id, source_id, id_externo, store_id)
SELECT s.tenant_id, src.id, CASE s.rede WHEN 'Farmácia Teste A' THEN '9001' ELSE '9002' END, s.id
  FROM stores s JOIN sources src ON src.tenant_id = s.tenant_id AND src.nome = 'lomadee';
