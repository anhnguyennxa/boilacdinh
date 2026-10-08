-- Tìm kiếm tiếng Việt gần đúng, không dấu
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() không IMMUTABLE nên không dùng trực tiếp trong chỉ mục được; bọc lại với từ điển cố định.
-- "đ" không được unaccent mặc định chuyển thành "d" nên xử lý riêng.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT replace(replace(public.unaccent('public.unaccent'::regdictionary, $1), 'đ', 'd'), 'Đ', 'D') $$;

CREATE INDEX products_name_trgm_idx ON products USING GIN (f_unaccent(lower(name)) gin_trgm_ops);

ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
