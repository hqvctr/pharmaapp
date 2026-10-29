-- As categorias do app mudaram para as do KV (gestacao, mamae, bebe, infantil). Quem já tinha preferências salvas com as
-- antigas mantém o que tem equivalente (higiene_bebe → bebe, cuidados_pessoais → mamae); o resto sai, para o app não
-- reenviar um slug que a API passou a recusar. Só existe tenant 'padrao' com dados reais neste ponto.
UPDATE user_preferences up
   SET categorias = COALESCE((
         SELECT array_agg(DISTINCT c ORDER BY c)
           FROM (SELECT CASE x WHEN 'higiene_bebe' THEN 'bebe' WHEN 'cuidados_pessoais' THEN 'mamae' ELSE x END AS c
                   FROM unnest(up.categorias) AS x) t
          WHERE c IN ('gestacao', 'mamae', 'bebe', 'infantil')), '{}')
 WHERE EXISTS (SELECT 1 FROM unnest(up.categorias) AS x WHERE x NOT IN ('gestacao', 'mamae', 'bebe', 'infantil'));
