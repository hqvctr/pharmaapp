-- Revisão para o foco em mães e bebês: foto do produto, como a fonte informa (só https).
-- O app mostra a imagem direto da loja; nada é baixado para o servidor.
ALTER TABLE offers ADD COLUMN imagem_url text CHECK (imagem_url IS NULL OR imagem_url LIKE 'https://%');
