-- Subcategoria do produto dentro da categoria do app (ex.: bebe > fraldas). Nula quando a regra de categorização não define uma.
ALTER TABLE products ADD COLUMN subcategoria text CHECK (subcategoria IS NULL OR subcategoria ~ '^[a-z0-9_]+$');
CREATE INDEX products_categoria_idx ON products (tenant_id, categoria, subcategoria);
