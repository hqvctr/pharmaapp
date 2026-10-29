-- Fotos extras do produto (a primeira é a de `imagem_url`), para a galeria do detalhe. Vazio quando a fonte só manda uma.
ALTER TABLE products ADD COLUMN imagens text[] NOT NULL DEFAULT '{}';
