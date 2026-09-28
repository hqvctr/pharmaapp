-- Tenant de desenvolvimento passa a ter o slug do app (vai no cabeçalho X-Tenant do app publicado).
UPDATE tenants SET slug = 'economae', nome = 'economae' WHERE slug = 'padrao';

-- Tamanho da fralda extraído do título. Null: não é fralda ou o tamanho não foi identificado.
ALTER TABLE products ADD COLUMN tamanho_fralda text
  CHECK (tamanho_fralda IS NULL OR tamanho_fralda IN ('RN', 'P', 'M', 'G', 'XG', 'XXG', 'XXXG'));

-- Tamanhos que a mãe quer receber. Vazio: todos. Opcional; nunca data de nascimento nem idade.
ALTER TABLE user_preferences ADD COLUMN tamanhos_fralda text[] NOT NULL DEFAULT '{}'
  CHECK (tamanhos_fralda <@ ARRAY['RN', 'P', 'M', 'G', 'XG', 'XXG', 'XXXG']::text[]);
