DROP VIEW IF EXISTS products_view;
DROP VIEW IF EXISTS country_codes_view;
DROP VIEW IF EXISTS categories_view;
DROP VIEW IF EXISTS comments_view;
DROP VIEW IF EXISTS product_ratings_view;
DROP VIEW IF EXISTS orders_view;
DROP VIEW orders_export_view;

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
DROP TABLE IF EXISTS user_target_groups;
DROP TABLE IF EXISTS target_groups;

DROP TABLE IF EXISTS inventories;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;

CREATE TABLE file_uploads (
    id BIGSERIAL PRIMARY KEY,
    file_name TEXT NOT NULL, 
    file_path TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_settings (
    id BIGSERIAL PRIMARY KEY,
    vat_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
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
    birth_date DATE NULL,
    iso_country_code_id BIGINT NOT NULL REFERENCES iso_country_codes(id), 
	country_id BIGINT NULL REFERENCES iso_country_codes(id),
    gender_id BIGINT NULL REFERENCES genders(id),
    address TEXT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
	has_first_login BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN birth_date DATE NULL;

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
    code TEXT UNIQUE NOT NULL DEFAULT substring(uuid_generate_v4()::text, 1, 8),
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

CREATE TABLE inventories (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT UNIQUE NOT NULL REFERENCES products(id),
    quantity BIGINT NOT NULL CHECK (quantity >= 0)
);

CREATE TABLE carts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NULL REFERENCES users(id),
    session_id BIGINT NULL REFERENCES sessions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	CONSTRAINT user_or_session_must_be_set CHECK (
        (user_id IS NOT NULL AND session_id IS NULL) OR 
        (user_id IS NULL AND session_id IS NOT NULL)
    )
);
CREATE UNIQUE INDEX unique_active_cart_per_user_or_session 
ON carts (
    COALESCE(
        'user_' || user_id::TEXT, 
        'session_' || session_id::TEXT
    )
)
WHERE is_active = true;

CREATE TABLE cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL REFERENCES carts(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL, 
    total_price NUMERIC(12, 2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_cart_product UNIQUE (cart_id, product_id) 
);


-- Addresses Table (Normalized Shipping/Billing Address)
CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    country_id BIGINT NOT NULL REFERENCES iso_country_codes(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Paid', 'Delivered', 'Cancelled')),
    paid_amount NUMERIC(12, 2) NULL CHECK (paid_amount >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    shipping_address_id BIGINT NULL REFERENCES addresses(id),
    payment_id BIGINT NULL REFERENCES payments(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
ALTER TABLE orders ADD COLUMN payment_id BIGINT NULL REFERENCES payments(id);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    payment_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    order_id BIGINT UNIQUE NOT NULL REFERENCES orders(id),
    payment_provider TEXT NULL CHECK (payment_provider IN ('PayPal', 'Bobi')),
    provider_payment_id TEXT NOT NULL,
    paid_amount NUMERIC(12, 2) NULL CHECK (paid_amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Paid', 'Failed', 'Expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL, 
    total_price NUMERIC(12, 2) NOT NULL GENERATED ALWAYS AS (unit_price * quantity) STORED CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE promotions (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL CHECK (discount_percentage >= 0),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE target_groups (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    filters JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE user_target_groups (
    target_group_id BIGINT NOT NULL REFERENCES target_groups(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    PRIMARY KEY (target_group_id, user_id)
);

CREATE OR REPLACE VIEW target_groups_view AS
SELECT
    tg.id,
    tg.name,
    tg.created_at,
    tg.filters,
    count(utg.user_id) AS user_count,
    json_agg(
        json_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email,
            'birth_date', COALESCE(u.birth_date::text, null),
            'gender', g.type
        )
    ) AS users
FROM target_groups tg
JOIN user_target_groups utg ON tg.id = utg.target_group_id
JOIN users u ON utg.user_id = u.id
JOIN genders g ON u.gender_id = g.id
WHERE tg.is_active = TRUE
GROUP BY tg.id;

CREATE OR REPLACE VIEW target_groups_export_view AS
SELECT
    tg.id AS id,
	u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    COALESCE(u.birth_date::text, '') AS birth_date,
    g.type AS gender
FROM target_groups tg
JOIN user_target_groups utg ON tg.id = utg.target_group_id
JOIN users u ON utg.user_id = u.id
JOIN genders g ON u.gender_id = g.id
WHERE tg.is_active = TRUE
ORDER BY tg.id, u.id

CREATE OR REPLACE VIEW promotions_view AS
SELECT
    promotions.*
FROM promotions
WHERE promotions.is_active = TRUE
ORDER BY promotions.id DESC;

CREATE OR REPLACE VIEW orders_view AS
WITH vat AS (
    SELECT vat_percentage FROM app_settings LIMIT 1
),
largest_discount AS (
    SELECT COALESCE(MAX(discount_percentage), 0) AS discount_percentage
    FROM promotions
    WHERE is_active = TRUE
      AND NOW() BETWEEN start_date AND end_date
)
SELECT
    o.id,
    o.order_hash,
    o.user_id,
    u.email,
    o.status,
    o.total_price,
    ld.discount_percentage,
    ROUND(o.total_price * ld.discount_percentage / 100, 2) AS discount_amount,
    ROUND(o.total_price * (1 - ld.discount_percentage / 100), 2) AS total_price_after_discount,
    vat.vat_percentage,
    ROUND(o.total_price * (1 - ld.discount_percentage / 100) * vat.vat_percentage / 100, 2) AS vat_amount,
    ROUND(o.total_price * (1 - ld.discount_percentage / 100) * (1 + vat.vat_percentage / 100), 2) AS total_price_with_vat,
    o.paid_amount,
    o.is_active,
    o.created_at,
	json_build_object(
        'id', a.id,
        'street', a.street,
        'city', a.city,
        'country_id', a.country_id,
        'country_name', c.country_name
    ) AS shipping_address
FROM
    orders o
CROSS JOIN vat
CROSS JOIN largest_discount ld
LEFT JOIN addresses a ON o.shipping_address_id = a.id
LEFT JOIN iso_country_codes c ON a.country_id = c.id
LEFT JOIN users u ON o.user_id = u.id;

CREATE OR REPLACE VIEW orders_export_view AS
WITH vat AS (
    SELECT vat_percentage FROM app_settings LIMIT 1
),
largest_discount AS (
    SELECT COALESCE(MAX(discount_percentage), 0) AS discount_percentage
    FROM promotions
    WHERE is_active = TRUE
      AND NOW() BETWEEN start_date AND end_date
)
SELECT
    o.created_at,
	o.id,
    o.order_hash,
    u.email,
    o.status,
    o.total_price,
	ld.discount_percentage,
    ROUND(o.total_price * ld.discount_percentage / 100, 2) AS discount_amount,
    ROUND(o.total_price * (1 - ld.discount_percentage / 100), 2) AS total_price_after_discount,
    vat.vat_percentage,
    ROUND(o.total_price * (1 - ld.discount_percentage / 100) * vat.vat_percentage / 100, 2) AS vat_amount,
    ROUND(o.total_price * (1 - ld.discount_percentage / 100) * (1 + vat.vat_percentage / 100), 2) AS total_price_with_vat,
    o.paid_amount,
    o.is_active
FROM orders o
CROSS JOIN vat
CROSS JOIN largest_discount ld
LEFT JOIN users u ON o.user_id = u.id;

CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status <> OLD.status THEN
        IF OLD.status = 'Paid' AND NEW.status = 'Pending' THEN
            RAISE EXCEPTION 'Cannot revert order status from Paid to Pending'
            USING ERRCODE = '80000';
        ELSIF OLD.status = 'Delivered' AND (NEW.status = 'Pending' OR NEW.status = 'Paid') THEN
            RAISE EXCEPTION 'Cannot revert order status from Delivered to Pending or Paid'
            USING ERRCODE = '80000';
        ELSIF OLD.status = 'Cancelled' THEN
            RAISE EXCEPTION 'Cannot update a Cancelled order'
            USING ERRCODE = '80000';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_status_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_status_transition();


CREATE OR REPLACE VIEW products_view AS
WITH vat AS (
    SELECT vat_percentage FROM app_settings LIMIT 1
)
SELECT
    p.id,
    p.code,
    p.name,
    p.price,
    p.short_description,
    p.long_description,
    ARRAY_AGG(DISTINCT i.url) AS images,
    ARRAY_AGG(DISTINCT c.name) AS categories,
    COALESCE(AVG(r.rating), 0) AS rating,
    COALESCE(COUNT(r.id), 0) AS rating_count,
    ROUND(p.price * (1 + vat.vat_percentage / 100), 2) AS price_with_vat
FROM products p
LEFT JOIN images i ON p.id = i.product_id
LEFT JOIN products_categories pc ON p.id = pc.product_id
LEFT JOIN categories c ON pc.category_id = c.id
LEFT JOIN ratings r ON p.id = r.product_id
CROSS JOIN vat
GROUP BY p.id, vat.vat_percentage;

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
    users.first_name AS user_name
FROM comments
LEFT JOIN users ON comments.user_id = users.id;

CREATE OR REPLACE VIEW product_ratings_view AS
SELECT
    r.product_id,
    AVG(r.rating) AS average_rating,
    COUNT(r.rating) AS rating_count
FROM ratings r
GROUP BY r.product_id;

CREATE OR REPLACE VIEW users_view AS
SELECT
    users.id,
    users.first_name,
    users.last_name,
    users.email,
    users.phone,
    icc.phone_code AS phone_code,
    users.iso_country_code_id,
    cc.country_name AS country_name,
	users.country_id,
    genders.type AS gender,
    users.birth_date,
    users.gender_id,
    users.address,
    users.is_email_verified,
    users.has_first_login
FROM users
LEFT JOIN iso_country_codes icc ON users.iso_country_code_id = icc.id
LEFT JOIN iso_country_codes cc ON users.country_id = cc.id
LEFT JOIN genders ON users.gender_id = genders.id
WHERE users.is_active = TRUE;

INSERT INTO genders(type) VALUES ('Male'), ('Female');
INSERT INTO session_types(type) VALUES ('Anonymous'), ('Authenticated'), ('Email Verification');
INSERT INTO attempt_types(type) VALUES ('Login'), ('Captcha');
INSERT INTO categories(name) VALUES 
('T-shirts'), ('Jackets'), ('Pants'), ('Shoes'), ('Hats'), ('Accessories'), ('Dresses'),
('Sunglasses'), ('Watches'), ('Belts'), ('Socks'), ('Underwear'), ('Scarves'), ('Gloves'),
('Bags'), ('Wallets'), ('Jewelry'), ('Ties'), ('Boots'), ('Sneakers');

INSERT INTO inventories(product_id, quantity) 
VALUES (1, 5), (2, 10), (3, 3), (4, 12), (5, 7), (6, 13), (7, 5), (8, 2), (9, 3), (10, 4), (11, 5), (12, 50), (13, 75), (14, 200), (15, 150), (16, 100), (17, 50), (18, 75), (19, 200), (20, 150);