DROP VIEW IF EXISTS products_view;
DROP VIEW IF EXISTS country_codes_view;
DROP VIEW IF EXISTS categories_view;
DROP VIEW IF EXISTS comments_view;
DROP VIEW IF EXISTS product_ratings_view;

DROP TABLE IF EXISTS products_categories;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS products;

DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS captchas;
DROP TABLE IF EXISTS failed_attempts;
DROP TABLE IF EXISTS attempt_types;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS session_types;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS genders;
DROP TABLE IF EXISTS currencies;
DROP TABLE IF EXISTS iso_country_codes;
DROP TABLE IF EXISTS app_settings;

CREATE TABLE app_settings (
    id BIGSERIAL PRIMARY KEY,
    request_limit BIGINT NOT NULL DEFAULT 10,
    request_window INTERVAL NOT NULL DEFAULT '10 minutes',
    request_block_duration INTERVAL NOT NULL DEFAULT '1 hour',
    password_require_digit BOOLEAN NOT NULL DEFAULT FALSE,
    password_require_lowercase BOOLEAN NOT NULL DEFAULT FALSE,
    password_require_uppercase BOOLEAN NOT NULL DEFAULT FALSE,
    password_require_special BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE iso_country_codes (
    id BIGSERIAL PRIMARY KEY,
    country_name TEXT UNIQUE NOT NULL,                
    country_code TEXT UNIQUE NOT NULL,      
    phone_code TEXT NOT NULL                   
);

CREATE TABLE countries (
    id BIGSERIAL PRIMARY KEY,
    country_name TEXT UNIQUE NOT NULL,
    country_code TEXT UNIQUE NOT NULL,
    phone_code TEXT NOT NULL
);

CREATE TABLE genders (
    id BIGSERIAL PRIMARY KEY,
    type TEXT UNIQUE NOT NULL
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    user_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    iso_country_code_id BIGINT NOT NULL REFERENCES iso_country_codes(id), 
	country_id BIGINT NULL REFERENCES iso_country_codes(id),
    gender_id BIGINT NULL REFERENCES genders(id),
    address TEXT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
	has_first_login BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE session_types (
    id BIGSERIAL PRIMARY KEY,
    type TEXT UNIQUE NOT NULL
);

CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    session_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    user_id BIGINT NULL REFERENCES users(id),
    ip_address TEXT NULL,
    session_type_id BIGINT NOT NULL REFERENCES session_types(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limited_until TIMESTAMPTZ NULL
);

CREATE TABLE captchas (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    equation TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE attempt_types (
    id BIGSERIAL PRIMARY KEY,
    type TEXT UNIQUE NOT NULL -- 'login', 'captcha', etc.
);

CREATE TABLE failed_attempts (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    attempt_type_id BIGINT NOT NULL REFERENCES attempt_types(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_verifications (
    id BIGSERIAL PRIMARY KEY,
    token_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

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
    symbol TEXT NOT NULL
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

CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, user_id)
);

CREATE TABLE ratings (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    rating BIGINT CHECK (rating BETWEEN 1 AND 5), -- Rating between 1 and 5
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, user_id)
);

CREATE OR REPLACE VIEW products_view AS
SELECT
    p.id,
    p.name,
    p.price,
    p.short_description,
    p.long_description,
    ARRAY_AGG(i.url) AS images,
    ARRAY_AGG(DISTINCT c.name) AS categories,
	COALESCE(AVG(r.rating), 0) AS rating,
    COALESCE(COUNT(r.id), 0) AS rating_count 
FROM products p
LEFT JOIN images i ON p.id = i.product_id
LEFT JOIN products_categories pc ON p.id = pc.product_id
LEFT JOIN categories c ON pc.category_id = c.id
LEFT JOIN ratings r ON p.id = r.product_id
GROUP BY p.id;

CREATE OR REPLACE VIEW country_codes_view AS
SELECT
    icc.id,
    icc.country_name,
    icc.country_code,
    icc.phone_code
FROM iso_country_codes icc
ORDER BY icc.country_name;

CREATE OR REPLACE VIEW categories_view AS
SELECT
    id,
    name
FROM categories
ORDER BY name;

CREATE OR REPLACE VIEW comments_view AS
SELECT
    comments.*,
    users.name AS user_name
FROM comments
LEFT JOIN users ON comments.user_id = users.id;

CREATE OR REPLACE VIEW product_ratings_view AS
SELECT
    r.product_id,
    AVG(r.rating) AS average_rating,
    COUNT(r.rating) AS rating_count
FROM ratings r
GROUP BY r.product_id;

INSERT INTO genders(type) VALUES ('Male'), ('Female');
INSERT INTO session_types(type) VALUES ('Anonymous'), ('Authenticated'), ('Email Verification');
INSERT INTO attempt_types(type) VALUES ('Login'), ('Captcha');
INSERT INTO categories(name) VALUES 
('T-shirts'), ('Jackets'), ('Pants'), ('Shoes'), ('Hats'), ('Accessories'), ('Dresses'),
('Sunglasses'), ('Watches'), ('Belts'), ('Socks'), ('Underwear'), ('Scarves'), ('Gloves'),
('Bags'), ('Wallets'), ('Jewelry'), ('Ties'), ('Boots'), ('Sneakers');