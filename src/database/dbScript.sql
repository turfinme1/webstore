DROP VIEW IF EXISTS products_view;
DROP VIEW IF EXISTS country_codes_view;

DROP TABLE IF EXISTS products_categories;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS currencies;

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL
);

CREATE TABLE currencies (
    id BIGSERIAL PRIMARY KEY,
    currency_code TEXT NOT NULL,
    exchange_rate_to_base NUMERIC(18, 6) NOT NULL, 
    symbol TEXT NOT NULL,
);

CREATE TABLE images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    url TEXT NOT NULL
);

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE products_categories (
    product_id BIGINT NOT NULL REFERENCES products(id),
    category_id BIGINT NOT NULL REFERENCES categories(id),
    PRIMARY KEY (product_id, category_id)
);

CREATE OR REPLACE VIEW products_view AS
SELECT
    p.id,
    p.name,
    p.price,
    p.short_description,
    p.long_description,
    ARRAY_AGG(i.url) AS images,
    ARRAY_AGG(DISTINCT c.name) AS categories
FROM products p
LEFT JOIN images i ON p.id = i.product_id
LEFT JOIN products_categories pc ON p.id = pc.product_id
LEFT JOIN categories c ON pc.category_id = c.id
GROUP BY p.id;

CREATE OR REPLACE VIEW country_codes_view AS
SELECT
    icc.id,
    icc.country_name,
    icc.country_code,
    icc.phone_code
FROM iso_country_codes icc
ORDER BY icc.country_name;

CREATE TABLE iso_country_codes (
    id BIGSERIAL PRIMARY KEY,
    country_name TEXT UNIQUE NOT NULL,                
    country_code TEXT UNIQUE NOT NULL,      
    phone_code TEXT NOT NULL                   
);