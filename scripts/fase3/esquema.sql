-- Verificações do esquema da fase 3 (migration 0003). Roda numa transação e termina em ROLLBACK:
-- qualquer expectativa falsa derruba o script com "FALHA ...". Rode com psql -v ON_ERROR_STOP=1.
BEGIN;

CREATE TEMP TABLE ids (k text PRIMARY KEY, v uuid NOT NULL);
CREATE FUNCTION pg_temp.id(chave text) RETURNS uuid LANGUAGE sql AS $$ SELECT v FROM ids WHERE k = chave $$;

-- A instrução deve falhar com o SQLSTATE esperado (23503 FK, 23505 único, 23514 CHECK).
CREATE FUNCTION pg_temp.erra(nome text, estado text, comando text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE passou boolean := false;
BEGIN
  BEGIN
    EXECUTE comando;
    passou := true;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> estado THEN
      RAISE EXCEPTION 'FALHA %: esperava % e veio % (%)', nome, estado, SQLSTATE, SQLERRM;
    END IF;
  END;
  IF passou THEN RAISE EXCEPTION 'FALHA %: a instrução deveria falhar com %', nome, estado; END IF;
  RAISE NOTICE 'OK    %', nome;
END $$;

CREATE FUNCTION pg_temp.confere(nome text, obtido bigint, esperado bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF obtido IS DISTINCT FROM esperado THEN
    RAISE EXCEPTION 'FALHA %: esperado %, obtido %', nome, esperado, obtido;
  END IF;
  RAISE NOTICE 'OK    %', nome;
END $$;

-- Dados-base: dois tenants; o A tem pessoa, operador, loja, fonte, produto, oferta e alerta.
DO $$
DECLARE
  ta uuid; tb uuid; ua uuid; ub uuid; op uuid; la uuid; lb uuid; fo uuid; pr uuid; of_ uuid; al uuid; se uuid;
BEGIN
  INSERT INTO tenants (slug, nome) VALUES ('tenant-a', 'A') RETURNING id INTO ta;
  INSERT INTO tenants (slug, nome) VALUES ('tenant-b', 'B') RETURNING id INTO tb;
  INSERT INTO users (tenant_id, email) VALUES (ta, 'mae@exemplo.test') RETURNING id INTO ua;
  INSERT INTO users (tenant_id, email) VALUES (tb, 'mae@exemplo.test') RETURNING id INTO ub;
  INSERT INTO operadores (tenant_id, email, nome) VALUES (ta, 'op@exemplo.test', 'Ana') RETURNING id INTO op;
  INSERT INTO stores (tenant_id, rede, nome, tipo) VALUES (ta, 'Rede', 'Loja A', 'online') RETURNING id INTO la;
  INSERT INTO stores (tenant_id, rede, nome, tipo) VALUES (tb, 'Rede', 'Loja B', 'online') RETURNING id INTO lb;
  INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal)
    VALUES (ta, 'fonte', 'A', 120, 'SP', 'alta', 'teste') RETURNING id INTO fo;
  INSERT INTO products (tenant_id, chave_hash, familia_chave, marca, nome, categoria, quantidade, unidade, marca_chave)
    VALUES (ta, 'h1', 'f1', 'Elseve', 'Shampoo Hidratação Intensa 400 ml', 'cuidados_pessoais', 0.4, 'l', 'elseve') RETURNING id INTO pr;
  INSERT INTO offers (tenant_id, product_id, store_id, source_id, preco_centavos, preco_por_unidade_centavos, frete_status,
                      disponivel, link, coletada_em, id_externo)
    VALUES (ta, pr, la, fo, 1990, 4975, 'a_confirmar', true, 'https://exemplo.test/p', now(), 'X1') RETURNING id INTO of_;
  INSERT INTO alerts (tenant_id, offer_id, score, decisao, motivo, store_id, familia_chave, preco_centavos,
                      preco_efetivo_por_unidade, preco_referencia_por_unidade, entrega_a_confirmar)
    VALUES (ta, of_, 80, 'notificar', 'teste', la, 'f1', 1990, 4975, 7000, true) RETURNING id INTO al;
  INSERT INTO sessions (tenant_id, audiencia, user_id, access_hash, access_expira_em, refresh_hash, refresh_expira_em, criada_em)
    VALUES (ta, 'app', ua, '\x01', now() + interval '1 hour', '\x02', now() + interval '60 days', now()) RETURNING id INTO se;
  INSERT INTO ids VALUES ('ta', ta), ('tb', tb), ('ua', ua), ('ub', ub), ('op', op), ('la', la), ('lb', lb),
                         ('fo', fo), ('pr', pr), ('of', of_), ('al', al), ('se', se);
END $$;

-- 1. Exclusão de conta apaga em cascata tudo o que é da pessoa (DECISIONS 7).
DO $$
DECLARE restante bigint;
BEGIN
  INSERT INTO dispositivos (tenant_id, user_id, session_id, token, plataforma, versao_app)
    VALUES (pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('se'), 'tok-1', 'android', '1.0.0');
  INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES (pg_temp.id('ta'), pg_temp.id('ua'), 'loja', pg_temp.id('la'), 'push');
  INSERT INTO silenciamentos (tenant_id, user_id, tipo, marca_chave, alcance) VALUES (pg_temp.id('ta'), pg_temp.id('ua'), 'marca', 'elseve', 'tudo');
  INSERT INTO seguidos (tenant_id, user_id, product_id) VALUES (pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('pr'));
  INSERT INTO avisos (tenant_id, user_id, tipo, origem, product_id, alert_id, preco_centavos, queda)
    VALUES (pg_temp.id('ta'), pg_temp.id('ua'), 'promocao_excepcional', 'seguido', pg_temp.id('pr'), pg_temp.id('al'), 1990, 0.3);
  INSERT INTO alert_events (tenant_id, user_id, alert_id, tipo, origem, ocorrido_em)
    VALUES (pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('al'), 'aberto', 'push', now());
  INSERT INTO avaliacoes (tenant_id, user_id, alert_id, valor) VALUES (pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('al'), 'util');
  INSERT INTO denuncias (tenant_id, user_id, alert_id, motivo) VALUES (pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('al'), 'preco_errado');
  INSERT INTO user_preferences (user_id, tenant_id) VALUES (pg_temp.id('ua'), pg_temp.id('ta'));

  DELETE FROM users WHERE id = pg_temp.id('ua');
  SELECT (SELECT count(*) FROM sessions WHERE user_id = pg_temp.id('ua'))
       + (SELECT count(*) FROM dispositivos WHERE user_id = pg_temp.id('ua'))
       + (SELECT count(*) FROM silenciamentos WHERE user_id = pg_temp.id('ua'))
       + (SELECT count(*) FROM seguidos WHERE user_id = pg_temp.id('ua'))
       + (SELECT count(*) FROM avisos WHERE user_id = pg_temp.id('ua'))
       + (SELECT count(*) FROM alert_events WHERE user_id = pg_temp.id('ua'))
       + (SELECT count(*) FROM avaliacoes WHERE user_id = pg_temp.id('ua'))
       + (SELECT count(*) FROM denuncias WHERE user_id = pg_temp.id('ua'))
       + (SELECT count(*) FROM user_preferences WHERE user_id = pg_temp.id('ua')) INTO restante;
  PERFORM pg_temp.confere('excluir a conta apaga sessão, aparelho, silenciamentos, seguidos, avisos, eventos, avaliação, denúncia e preferências', restante, 0);
  -- O alerta e a oferta não são da pessoa e continuam.
  PERFORM pg_temp.confere('excluir a conta não apaga o alerta', (SELECT count(*) FROM alerts WHERE id = pg_temp.id('al')), 1);
  -- Pessoa nova para os testes seguintes.
  INSERT INTO users (id, tenant_id, email) VALUES (pg_temp.id('ua'), pg_temp.id('ta'), 'mae2@exemplo.test');
  INSERT INTO sessions (id, tenant_id, audiencia, user_id, access_hash, access_expira_em, refresh_hash, refresh_expira_em, criada_em)
    VALUES (pg_temp.id('se'), pg_temp.id('ta'), 'app', pg_temp.id('ua'), '\x11', now() + interval '1 hour', '\x12', now() + interval '60 days', now());
END $$;

-- 2. Isolamento entre tenants: nenhuma referência cruza o tenant.
SELECT pg_temp.erra('silenciar loja de outro tenant', '23503',
  format('INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES (%L, %L, ''loja'', %L, ''push'')',
         pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('lb')));
SELECT pg_temp.erra('seguir produto com pessoa de outro tenant', '23503',
  format('INSERT INTO seguidos (tenant_id, user_id, product_id) VALUES (%L, %L, %L)', pg_temp.id('ta'), pg_temp.id('ub'), pg_temp.id('pr')));
SELECT pg_temp.erra('sessão de operador de outro tenant', '23503',
  format('INSERT INTO sessions (tenant_id, audiencia, operador_id, access_hash, access_expira_em, refresh_hash, refresh_expira_em, criada_em)
          VALUES (%L, ''operador'', %L, ''\x21'', now(), ''\x22'', now(), now())', pg_temp.id('tb'), pg_temp.id('op')));

-- 3. Sessões: uma audiência por sessão, hashes únicos, revogação com motivo.
SELECT pg_temp.erra('sessão de app com operador junto', '23514',
  format('INSERT INTO sessions (tenant_id, audiencia, user_id, operador_id, access_hash, access_expira_em, refresh_hash, refresh_expira_em, criada_em)
          VALUES (%L, ''app'', %L, %L, ''\x31'', now(), ''\x32'', now(), now())', pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('op')));
SELECT pg_temp.erra('sessão de operador sem operador', '23514',
  format('INSERT INTO sessions (tenant_id, audiencia, user_id, access_hash, access_expira_em, refresh_hash, refresh_expira_em, criada_em)
          VALUES (%L, ''operador'', %L, ''\x33'', now(), ''\x34'', now(), now())', pg_temp.id('ta'), pg_temp.id('ua')));
SELECT pg_temp.erra('refresh repetido', '23505',
  format('INSERT INTO sessions (tenant_id, audiencia, user_id, access_hash, access_expira_em, refresh_hash, refresh_expira_em, criada_em)
          VALUES (%L, ''app'', %L, ''\x35'', now(), ''\x12'', now(), now())', pg_temp.id('ta'), pg_temp.id('ua')));
SELECT pg_temp.erra('revogada sem motivo', '23514',
  format('UPDATE sessions SET revogada_em = now() WHERE id = %L', pg_temp.id('se')));

-- 4. Aparelho preso à sessão: sessão revogada e apagada leva o aparelho junto; token único.
DO $$
BEGIN
  INSERT INTO dispositivos (tenant_id, user_id, session_id, token, plataforma, versao_app)
    VALUES (pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('se'), 'tok-2', 'android', '1.0.0');
  PERFORM pg_temp.erra('mesmo token de push em outra sessão', '23505',
    format('INSERT INTO dispositivos (tenant_id, user_id, session_id, token, plataforma, versao_app)
            SELECT tenant_id, user_id, gen_random_uuid(), ''tok-2'', ''ios'', ''1'' FROM dispositivos LIMIT 1'));
END $$;
SELECT pg_temp.erra('plataforma desconhecida', '23514',
  format('UPDATE dispositivos SET plataforma = ''web'' WHERE session_id = %L', pg_temp.id('se')));
DELETE FROM sessions WHERE id = pg_temp.id('se');
SELECT pg_temp.confere('apagar a sessão apaga o aparelho', (SELECT count(*) FROM dispositivos), 0);

-- 5. Silenciamentos e seguidos.
INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES (pg_temp.id('ta'), pg_temp.id('ua'), 'loja', pg_temp.id('la'), 'push');
SELECT pg_temp.erra('silenciar a mesma loja duas vezes', '23505',
  format('INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES (%L, %L, ''loja'', %L, ''tudo'')', pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('la')));
SELECT pg_temp.erra('silenciar loja sem informar a loja', '23514',
  format('INSERT INTO silenciamentos (tenant_id, user_id, tipo, marca_chave, alcance) VALUES (%L, %L, ''loja'', ''elseve'', ''push'')', pg_temp.id('ta'), pg_temp.id('ua')));
SELECT pg_temp.erra('marca em maiúsculas', '23514',
  format('INSERT INTO silenciamentos (tenant_id, user_id, tipo, marca_chave, alcance) VALUES (%L, %L, ''marca'', ''Elseve'', ''push'')', pg_temp.id('ta'), pg_temp.id('ua')));
INSERT INTO seguidos (tenant_id, user_id, product_id, queda_percentual) VALUES (pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('pr'), 20);
SELECT pg_temp.erra('seguir o mesmo produto duas vezes', '23505',
  format('INSERT INTO seguidos (tenant_id, user_id, product_id) VALUES (%L, %L, %L)', pg_temp.id('ta'), pg_temp.id('ua'), pg_temp.id('pr')));
SELECT pg_temp.erra('queda de 100 por cento não existe', '23514',
  format('UPDATE seguidos SET queda_percentual = 100 WHERE user_id = %L', pg_temp.id('ua')));

-- 6. Revisão do alerta, caso de denúncia e oferta.
SELECT pg_temp.erra('alerta aprovado sem data da revisão', '23514',
  format('UPDATE alerts SET revisao_situacao = ''aprovado'' WHERE id = %L', pg_temp.id('al')));
UPDATE alerts SET revisao_situacao = 'aprovado', revisao_em = now(), revisao_operador_id = pg_temp.id('op') WHERE id = pg_temp.id('al');
SELECT pg_temp.erra('revisão por operador de outro tenant', '23503',
  format('UPDATE alerts SET revisao_operador_id = gen_random_uuid() WHERE id = %L', pg_temp.id('al')));
SELECT pg_temp.erra('caso restaurado sem resolução', '23514',
  format('INSERT INTO casos_denuncia (tenant_id, alert_id, offer_id, aberto_em, situacao, denuncias, pessoas_base, limite, motivo_preco_errado, motivo_sem_estoque)
          VALUES (%L, %L, %L, now(), ''restaurada'', 3, 20, 2, 3, 0)', pg_temp.id('ta'), pg_temp.id('al'), pg_temp.id('of')));
INSERT INTO casos_denuncia (tenant_id, alert_id, offer_id, aberto_em, denuncias, pessoas_base, limite, motivo_preco_errado, motivo_sem_estoque)
  VALUES (pg_temp.id('ta'), pg_temp.id('al'), pg_temp.id('of'), now(), 3, 20, 2, 3, 0);
SELECT pg_temp.erra('dois casos para o mesmo alerta', '23505',
  format('INSERT INTO casos_denuncia (tenant_id, alert_id, offer_id, aberto_em, denuncias, pessoas_base, limite, motivo_preco_errado, motivo_sem_estoque)
          VALUES (%L, %L, %L, now(), 3, 20, 2, 3, 0)', pg_temp.id('ta'), pg_temp.id('al'), pg_temp.id('of')));
UPDATE casos_denuncia SET situacao = 'restaurada', resolucao = 'restaurar', resolucao_em = now(), resolucao_operador_id = pg_temp.id('op');
SELECT pg_temp.confere('caso resolvido sai da fila de escondidas', (SELECT count(*) FROM casos_denuncia WHERE situacao = 'escondida'), 0);

-- 7. Produto: imagem só https, marca em minúsculas, busca sem acento.
SELECT pg_temp.erra('imagem http', '23514', format('UPDATE products SET imagem_url = ''http://exemplo.test/a.jpg'' WHERE id = %L', pg_temp.id('pr')));
SELECT pg_temp.erra('chave de marca em maiúsculas', '23514', format('UPDATE products SET marca_chave = ''Elseve'' WHERE id = %L', pg_temp.id('pr')));
UPDATE products SET imagem_url = 'https://exemplo.test/a.jpg', advertencias = ARRAY['nbcal_aleitamento_2_anos'] WHERE id = pg_temp.id('pr');
SELECT pg_temp.confere('busca "hidratacao" acha "Hidratação" (sem acento)',
  (SELECT count(*) FROM products WHERE f_unaccent(lower(nome)) LIKE '%' || f_unaccent(lower('hidratacao')) || '%'), 1);
SELECT pg_temp.confere('busca aproximada acha o produto com erro de digitação',
  (SELECT count(*) FROM products WHERE similarity(f_unaccent(lower(nome)), f_unaccent(lower('shampo hidratacao'))) > 0.3), 1);

-- 8. Assinatura, credencial de fonte, triagem, auditoria, idempotência, Apple.
INSERT INTO users (tenant_id, email) VALUES (pg_temp.id('ta'), 'assina@exemplo.test');
INSERT INTO subscriptions (tenant_id, user_id, plano, status, origem, iniciada_em, transacao_original_id, comprovante_hash, produto_loja_id)
  SELECT tenant_id, id, 'premium_mensal', 'ativa', 'app_store', now(), 'T-1', '\xaa', 'economae_premium' FROM users WHERE email = 'assina@exemplo.test';
SELECT pg_temp.erra('mesma transação de assinatura em outra conta', '23505',
  format('INSERT INTO subscriptions (tenant_id, user_id, plano, status, origem, iniciada_em, transacao_original_id)
          VALUES (%L, %L, ''premium_anual'', ''ativa'', ''app_store'', now(), ''T-1'')', pg_temp.id('ta'), (SELECT id FROM users WHERE email = 'mae2@exemplo.test')));
SELECT pg_temp.erra('origem de assinatura desconhecida', '23514',
  format('UPDATE subscriptions SET origem = ''outra'' WHERE tenant_id = %L', pg_temp.id('ta')));
SELECT pg_temp.erra('credencial com IV de tamanho errado', '23514',
  format('INSERT INTO source_credentials (tenant_id, source_id, chave_versao, iv, texto_cifrado, tag) VALUES (%L, %L, ''v1'', ''\x0102'', ''\x03'', ''\x0000000000000000000000000000000f'')', pg_temp.id('ta'), pg_temp.id('fo')));
INSERT INTO source_credentials (tenant_id, source_id, chave_versao, iv, texto_cifrado, tag)
  VALUES (pg_temp.id('ta'), pg_temp.id('fo'), 'v1', decode(repeat('00', 12), 'hex'), '\x03', decode(repeat('00', 16), 'hex'));
INSERT INTO triagem_bloqueios (tenant_id, source_id, id_externo, titulo, codigo, detalhe, revisao_humana, primeira_vez_em, ultima_vez_em)
  VALUES (pg_temp.id('ta'), pg_temp.id('fo'), 'M1', 'Remédio', 'NBCAL_CAUTELA', 'x', false, now(), now());
SELECT pg_temp.erra('resultado da triagem sem data de revisão', '23514', 'UPDATE triagem_bloqueios SET resultado = ''liberado''');
SELECT pg_temp.erra('ação de auditoria inventada', '23514',
  format('INSERT INTO auditoria (tenant_id, operador_id, acao, alvo_tipo, alvo_id) VALUES (%L, %L, ''apagou_tudo'', ''alerta'', %L)', pg_temp.id('ta'), pg_temp.id('op'), pg_temp.id('al')));
INSERT INTO auditoria (tenant_id, operador_id, acao, alvo_tipo, alvo_id, detalhe)
  VALUES (pg_temp.id('ta'), pg_temp.id('op'), 'alerta_revisado', 'alerta', pg_temp.id('al'), '{"antes":"pendente","depois":"aprovado"}');
INSERT INTO idempotencia_chaves (tenant_id, escopo, rota, chave, corpo_hash, resposta_status, resposta)
  VALUES (pg_temp.id('ta'), pg_temp.id('ua')::text, 'POST /v1/alertas/{id}/eventos', 'k1', '\x01', 201, '{}');
SELECT pg_temp.erra('mesma chave de idempotência na mesma rota', '23505',
  format('INSERT INTO idempotencia_chaves (tenant_id, escopo, rota, chave, corpo_hash, resposta_status, resposta)
          VALUES (%L, %L, ''POST /v1/alertas/{id}/eventos'', ''k1'', ''\x02'', 201, ''{}'')', pg_temp.id('ta'), pg_temp.id('ua')::text));
SELECT pg_temp.erra('credencial Apple sem versão da chave', '23514',
  format('UPDATE users SET apple_credencial_cifrada = ''\x01'' WHERE id = %L', pg_temp.id('ua')));
UPDATE users SET apple_sub = 'apple-1' WHERE id = pg_temp.id('ua');
SELECT pg_temp.erra('mesmo apple_sub no mesmo tenant', '23505',
  format('UPDATE users SET apple_sub = ''apple-1'' WHERE email = ''assina@exemplo.test'' AND tenant_id = %L', pg_temp.id('ta')));
UPDATE users SET apple_sub = 'apple-1' WHERE id = pg_temp.id('ub');
SELECT pg_temp.confere('o mesmo apple_sub pode existir em outro tenant', (SELECT count(*) FROM users WHERE apple_sub = 'apple-1'), 2);

-- Migration 0004: link rastreado.
SELECT pg_temp.erra('link rastreado precisa ser https', '23514',
  format('UPDATE offers SET link_rastreado = ''http://x.test/a'', link_rastreado_de = ''l'', link_rastreado_em = now() WHERE id = %L', pg_temp.id('of')));
SELECT pg_temp.erra('link rastreado vem inteiro (link, origem e data juntos)', '23514',
  format('UPDATE offers SET link_rastreado = ''https://x.test/a'' WHERE id = %L', pg_temp.id('of')));
UPDATE offers SET link_rastreado = 'https://lmdee.link/a', link_rastreado_de = link, link_rastreado_em = now() WHERE id = pg_temp.id('of');
SELECT pg_temp.confere('link rastreado inteiro é aceito', (SELECT count(*) FROM offers WHERE link_rastreado IS NOT NULL), 1);

ROLLBACK;
\echo 'esquema da fase 3: todas as verificações passaram'
