-- DROP VIEW IF EXISTS products_view;
-- DROP VIEW IF EXISTS country_codes_view;
-- DROP VIEW IF EXISTS categories_view;
-- DROP VIEW IF EXISTS comments_view;
-- DROP VIEW IF EXISTS product_ratings_view;
-- DROP VIEW IF EXISTS orders_view;
-- DROP VIEW IF EXISTS orders_export_view;
-- DROP VIEW IF EXISTS orders_detail_view;
-- DROP VIEW IF EXISTS target_groups_view;
-- DROP VIEW IF EXISTS target_groups_export_view;
-- DROP VIEW IF EXISTS users_view;
-- DROP VIEW IF EXISTS promotions_view;
-- DROP VIEW IF EXISTS roles_view;
-- DROP VIEW IF EXISTS permissions_view;
-- DROP VIEW IF EXISTS logs_view;
-- DROP VIEW IF EXISTS admin_users_view;
-- DROP VIEW IF EXISTS email_templates_view;

-- DROP TABLE IF EXISTS products_categories;
-- DROP TABLE IF EXISTS categories;
-- DROP TABLE IF EXISTS images;
-- DROP TABLE IF EXISTS comments;
-- DROP TABLE IF EXISTS ratings;
-- DROP TABLE IF EXISTS email_verifications;
-- DROP TABLE IF EXISTS file_uploads;
-- DROP TABLE IF EXISTS app_settings;
-- DROP TABLE IF EXISTS captchas;
-- DROP TABLE IF EXISTS admin_captchas;
-- DROP TABLE IF EXISTS failed_attempts;
-- DROP TABLE IF EXISTS admin_failed_attempts;
-- DROP TABLE IF EXISTS attempt_types;
-- DROP TABLE IF EXISTS cart_items;
-- DROP TABLE IF EXISTS carts;
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS admin_sessions;
-- DROP TABLE IF EXISTS session_types;
-- DROP TABLE IF EXISTS user_target_groups;
-- DROP TABLE IF EXISTS target_groups;
-- DROP table IF EXISTS payments;
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS addresses;
-- DROP TABLE IF EXISTS logs;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS admin_user_roles;
-- DROP TABLE IF EXISTS admin_users;
-- DROP TABLE IF EXISTS genders;
-- DROP TABLE IF EXISTS currencies;
-- DROP TABLE IF EXISTS inventories;
-- DROP TABLE IF EXISTS emails;
-- DROP TABLE IF EXISTS products;
-- DROP TABLE IF EXISTS migrations;
-- DROP TABLE IF EXISTS iso_country_codes;
-- DROP TABLE IF EXISTS promotions;
-- DROP TABLE IF EXISTS role_permissions;
-- DROP TABLE IF EXISTS permissions;
-- DROP TABLE IF EXISTS roles;
-- DROP TABLE IF EXISTS email_templates;
-- DROP TABLE IF EXISTS interfaces;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    file_name TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE table emails (
    id BIGSERIAL PRIMARY KEY,
    template_type TEXT NOT NULL CHECK (template_type IN ('Email verification', 'Order created', 'Order paid', 'Forgot password')),
    data_object JSONB NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_attempt TIMESTAMPTZ NULL,
    sent_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sent')) DEFAULT 'queued',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    password_require_special BOOLEAN NOT NULL DEFAULT FALSE,
    report_row_limit_display BIGINT NOT NULL DEFAULT 1000
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
    rating BIGINT CHECK (rating BETWEEN 1 AND 5),
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

CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    country_id BIGINT NOT NULL REFERENCES iso_country_codes(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Paid', 'Delivered', 'Cancelled')),
    paid_amount NUMERIC(12, 2) NULL CHECK (paid_amount >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    discount_percentage NUMERIC(5, 2) NOT NULL CHECK (discount_percentage >= 0) DEFAULT 0,
    vat_percentage NUMERIC(5, 2) NOT NULL CHECK (vat_percentage >= 0) DEFAULT 0,
    shipping_address_id BIGINT NULL REFERENCES addresses(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

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
ORDER BY tg.id, u.id;


CREATE OR REPLACE VIEW promotions_view AS
SELECT
    promotions.*
FROM promotions
WHERE promotions.is_active = TRUE
ORDER BY promotions.id DESC;


CREATE OR REPLACE VIEW orders_view AS
SELECT
    o.id,
    o.order_hash,
    o.user_id,
    u.email,
    o.status,
    o.total_price,
    o.discount_percentage,
    ROUND(o.total_price * o.discount_percentage / 100, 2) AS discount_amount,
    ROUND(o.total_price * (1 - o.discount_percentage / 100), 2) AS total_price_after_discount,
    o.vat_percentage,
    ROUND(o.total_price * (1 - o.discount_percentage / 100) * o.vat_percentage / 100, 2) AS vat_amount,
    ROUND(o.total_price * (1 - o.discount_percentage / 100) * (1 + o.vat_percentage / 100), 2) AS total_price_with_vat,
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
LEFT JOIN addresses a ON o.shipping_address_id = a.id
LEFT JOIN iso_country_codes c ON a.country_id = c.id
LEFT JOIN users u ON o.user_id = u.id;


CREATE OR REPLACE VIEW orders_export_view AS
SELECT
    o.created_at,
    o.id,
    o.order_hash,
    u.email,
    o.status,
    o.total_price,
    o.discount_percentage,
    ROUND(o.total_price * o.discount_percentage / 100, 2) AS discount_amount,
    ROUND(o.total_price * (1 - o.discount_percentage / 100), 2) AS total_price_after_discount,
    o.vat_percentage,
    ROUND(o.total_price * (1 - o.discount_percentage / 100) * o.vat_percentage / 100, 2) AS vat_amount,
    ROUND(o.total_price * (1 - o.discount_percentage / 100) * (1 + o.vat_percentage / 100), 2) AS total_price_with_vat,
    o.paid_amount,
    o.is_active
FROM orders o
LEFT JOIN users u ON o.user_id = u.id;


CREATE OR REPLACE VIEW orders_detail_view AS
WITH order_items_agg AS (
    SELECT
        oi.order_id,
        json_agg(
            json_build_object(
                'product_id', oi.product_id,
                'name', p.name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total_price', oi.total_price
            )
        ) AS order_items
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY oi.order_id
)
SELECT
    o.id,
    o.order_hash,
    o.user_id,
    u.email,
    o.status,
    o.total_price,
    o.discount_percentage,
    ROUND(o.total_price * o.discount_percentage / 100, 2) AS discount_amount,
    ROUND(o.total_price * (1 - o.discount_percentage / 100), 2) AS total_price_after_discount,
    o.vat_percentage,
    ROUND(o.total_price * (1 - o.discount_percentage / 100) * o.vat_percentage / 100, 2) AS vat_amount,
    ROUND(o.total_price * (1 - o.discount_percentage / 100) * (1 + o.vat_percentage / 100), 2) AS total_price_with_vat,
    o.paid_amount,
    o.is_active,
    o.created_at,
    json_build_object(
        'id', a.id,
        'street', a.street,
        'city', a.city,
        'country_id', a.country_id,
        'country_name', c.country_name
    ) AS shipping_address,
    oi_agg.order_items
FROM
    orders o
LEFT JOIN addresses a ON o.shipping_address_id = a.id
LEFT JOIN iso_country_codes c ON a.country_id = c.id
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN order_items_agg oi_agg ON o.id = oi_agg.order_id;


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







CREATE TABLE admin_users (
    id BIGSERIAL PRIMARY KEY,
    user_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    birth_date DATE NULL,
    iso_country_code_id BIGINT NOT NULL REFERENCES iso_country_codes(id),
    country_id BIGINT NULL REFERENCES iso_country_codes(id), 
    gender_id BIGINT NULL REFERENCES genders(id),
    address TEXT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    has_first_login BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX admin_users_active_email_idx ON admin_users (email) 
WHERE is_active = TRUE;

CREATE TABLE admin_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    admin_user_id BIGINT NULL REFERENCES admin_users(id),
    ip_address TEXT NULL,
    session_type_id BIGINT NOT NULL REFERENCES session_types(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limited_until TIMESTAMPTZ NULL
);

CREATE TABLE admin_captchas (
    id BIGSERIAL PRIMARY KEY,
    admin_session_id BIGINT NOT NULL REFERENCES admin_sessions(id),
    equation TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE admin_failed_attempts (
    id BIGSERIAL PRIMARY KEY,
    admin_session_id BIGINT NOT NULL REFERENCES admin_sessions(id),
    attempt_type_id BIGINT NOT NULL REFERENCES attempt_types(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE logs (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id BIGINT NULL REFERENCES admin_users(id),
    user_id BIGINT NULL REFERENCES users(id),
    status_code TEXT NOT NULL,
    log_level TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NULL,
    debug_info TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_templates (
    id BIGSERIAL PRIMARY KEY,
    type TEXT UNIQUE NOT NULL CHECK (type IN ('Email verification', 'Order created', 'Order paid', 'Forgot password')),
    subject TEXT NOT NULL,
	placeholders JSONB NULL,
    template TEXT NULL,
    table_border_width BIGINT NULL CHECK (table_border_width IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)),
    table_border_color TEXT NULL CHECK (table_border_color IN ('black', 'green', 'red', 'blue', 'yellow', 'white', 'gray', 'purple', 'orange', 'brown', 'pink', 'cyan', 'magenta', 'lime', 'teal', 'indigo', 'maroon', 'navy', 'olive', 'silver', 'aqua', 'fuchsia', 'gray', 'lime', 'teal', 'violet', 'yellow', 'white', 'black', 'red', 'green', 'blue', 'yellow', 'white', 'gray', 'purple', 'orange', 'brown', 'pink', 'cyan', 'magenta', 'lime', 'teal', 'indigo', 'maroon', 'navy', 'olive', 'silver', 'aqua', 'fuchsia', 'gray', 'lime', 'teal', 'violet', 'yellow', 'white', 'black', 'red', 'green', 'blue', 'yellow', 'white', 'gray', 'purple', 'orange', 'brown', 'pink', 'cyan', 'magenta', 'lime', 'teal', 'indigo', 'maroon', 'navy', 'olive', 'silver', 'aqua', 'fuchsia', 'gray', 'lime', 'teal', 'violet', 'yellow', 'white', 'black', 'red', 'green', 'blue', 'yellow', 'white', 'gray', 'purple', 'orange', 'brown', 'pink', 'cyan', 'magenta', 'lime', 'teal', 'indigo', 'maroon', 'navy', 'olive', 'silver', 'aqua', 'fuchsia', 'gray', 'lime', 'teal', 'violet', 'yellow', 'white', 'black', 'red', 'green', 'blue', 'yellow', 'white', 'gray', 'purple', 'orange', 'brown', 'pink', 'cyan', 'magenta', 'lime', 'teal', 'indigo', 'maroon', 'navy', 'olive', 'silver', 'aqua', 'fuchsia', 'gray', 'lime', 'teal', 'violet', 'yellow', 'white', 'black', 'red', 'green', 'blue', 'yellow', 'white', 'gray', 'purple', 'orange', 'brown', 'pink', 'cyan')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_user_roles (
    admin_user_id BIGINT NOT NULL REFERENCES admin_users(id),
    role_id BIGINT NOT NULL REFERENCES roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (admin_user_id, role_id)
);

CREATE TABLE interfaces (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK (name IN ('view', 'create', 'read', 'update', 'delete')),
    interface_id BIGINT NOT NULL REFERENCES interfaces(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, interface_id)
);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id),
    permission_id BIGINT NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE OR REPLACE VIEW permissions_view AS
SELECT
    permissions.id,
    permissions.interface_id,
    permissions.name,
    interfaces.name AS interface_name
FROM permissions
LEFT JOIN interfaces ON permissions.interface_id = interfaces.id
ORDER BY permissions.interface_id, permissions.name;

CREATE VIEW roles_view AS
WITH permissions_per_interface AS (
    SELECT
        r.id AS role_id,
        i.id AS interface_id,
        i.name AS interface_name,
        COALESCE(BOOL_OR((p.name = 'view') AND rp.permission_id IS NOT NULL), FALSE) AS "view",
        COALESCE(BOOL_OR((p.name = 'create') AND rp.permission_id IS NOT NULL), FALSE) AS "create",
        COALESCE(BOOL_OR((p.name = 'read') AND rp.permission_id IS NOT NULL), FALSE) AS "read",
        COALESCE(BOOL_OR((p.name = 'update') AND rp.permission_id IS NOT NULL), FALSE) AS "update",
        COALESCE(BOOL_OR((p.name = 'delete') AND rp.permission_id IS NOT NULL), FALSE) AS "delete"
    FROM 
        roles r
    CROSS JOIN 
        interfaces i
    LEFT JOIN 
        permissions p ON i.id = p.interface_id
    LEFT JOIN 
        role_permissions rp ON r.id = rp.role_id AND p.id = rp.permission_id
    GROUP BY 
        r.id, i.id, i.name
)
SELECT 
    r.id,
    r.name,
    r.created_at,
    jsonb_agg(
        jsonb_build_object(
            'interface_id', pi.interface_id,
            'interface_name', pi.interface_name,
            'view', pi."view",
            'create', pi."create",
            'read', pi."read",
            'update', pi."update",
            'delete', pi."delete"
        ) ORDER BY pi.interface_id
    ) AS permissions
FROM 
    roles r
JOIN 
    permissions_per_interface pi ON r.id = pi.role_id
WHERE 
    r.is_active = TRUE
GROUP BY 
    r.id, r.name, r.created_at;


CREATE OR REPLACE VIEW logs_view AS
SELECT
    logs.*
FROM logs;

CREATE OR REPLACE VIEW admin_users_view AS
SELECT
    admin_users.id,
    admin_users.first_name,
    admin_users.last_name,
    admin_users.email,
    admin_users.phone,
    icc.phone_code AS phone_code,
    admin_users.iso_country_code_id,
    cc.country_name AS country_name,
    admin_users.country_id,
    genders.type AS gender,
    admin_users.gender_id,
    admin_users.address,
    admin_users.is_email_verified,
    admin_users.has_first_login,
    COALESCE(
        jsonb_agg(jsonb_build_object('id', roles.id, 'name', roles.name))
        FILTER (WHERE roles.id IS NOT NULL),
        '[]'::jsonb
    ) AS roles
FROM admin_users
LEFT JOIN iso_country_codes icc ON admin_users.iso_country_code_id = icc.id
LEFT JOIN iso_country_codes cc ON admin_users.country_id = cc.id
LEFT JOIN genders ON admin_users.gender_id = genders.id
LEFT JOIN admin_user_roles aur ON admin_users.id = aur.admin_user_id
LEFT JOIN roles ON aur.role_id = roles.id AND roles.is_active = true
WHERE admin_users.is_active = TRUE 
GROUP BY
    admin_users.id,
    admin_users.first_name,
    admin_users.last_name,
    admin_users.email,
    admin_users.phone,
    icc.phone_code,
    admin_users.iso_country_code_id,
    cc.country_name,
    admin_users.country_id,
    genders.type,
    admin_users.gender_id,
    admin_users.address,
    admin_users.is_email_verified,
    admin_users.has_first_login;

CREATE VIEW email_templates_view AS
SELECT *
FROM email_templates;