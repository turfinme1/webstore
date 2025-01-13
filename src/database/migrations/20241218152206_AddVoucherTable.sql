-- Migration: AddVoucherTable
-- Created at: 2024-12-18T15:22:06.315Z

DROP VIEW IF EXISTS vouchers_view;
DROP TABLE IF EXISTS voucher_usages;
DROP TABLE IF EXISTS vouchers;

CREATE TABLE vouchers (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL,
    code TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
CREATE UNIQUE INDEX vouchers_code_is_active_idx ON vouchers (code) WHERE is_active = TRUE;

CREATE TABLE voucher_usages (
    user_id BIGINT NOT NULL REFERENCES users(id), 
    voucher_id BIGINT NOT NULL REFERENCES vouchers(id),
    PRIMARY KEY (user_id, voucher_id)
);

CREATE OR REPLACE VIEW vouchers_view AS
SELECT
    vouchers.*
FROM vouchers
WHERE vouchers.is_active = TRUE
ORDER BY vouchers.id DESC;

INSERT INTO interfaces (name) VALUES
('vouchers');

INSERT INTO permissions (name, interface_id) VALUES
('view', 12),
('create', 12),
('read', 12),
('update', 12),
('delete', 12);

ALTER TABLE carts ADD COLUMN voucher_id BIGINT REFERENCES vouchers(id);
ALTER table carts ADD COLUMN voucher_discount_amount NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE orders ADD COLUMN voucher_code TEXT NULL;
ALTER TABLE orders ADD COLUMN voucher_discount_amount NUMERIC(12, 2) DEFAULT 0;

DROP VIEW orders_view;
CREATE OR REPLACE VIEW orders_view AS
SELECT
    o.id,
    o.order_hash,
    o.user_id,
    u.email,
    o.status,
    o.total_price,
    o.discount_percentage,
    o.voucher_code,
    o.voucher_discount_amount,
    ROUND(o.total_price * o.discount_percentage / 100, 2) AS discount_amount,
    ROUND(o.total_price * (1 - o.discount_percentage / 100), 2) AS total_price_after_discount,
    o.vat_percentage,
    ROUND(o.total_price * (1 - o.discount_percentage / 100) * o.vat_percentage / 100, 2) AS vat_amount,
    ROUND(o.total_price * (1 - o.discount_percentage / 100) * (1 + o.vat_percentage / 100), 2) AS total_price_with_vat,
    ROUND(GREATEST(o.total_price * (1 - o.discount_percentage / 100) * (1 + o.vat_percentage / 100) - o.voucher_discount_amount, 0), 2) AS total_price_with_voucher,
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

DROP VIEW orders_detail_view;
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
    o.voucher_code,
    o.voucher_discount_amount,
    ROUND(o.total_price * o.discount_percentage / 100, 2) AS discount_amount,
    ROUND(o.total_price * (1 - o.discount_percentage / 100), 2) AS total_price_after_discount,
    o.vat_percentage,
    ROUND(o.total_price * (1 - o.discount_percentage / 100) * o.vat_percentage / 100, 2) AS vat_amount,
    ROUND(o.total_price * (1 - o.discount_percentage / 100) * (1 + o.vat_percentage / 100), 2) AS total_price_with_vat,
    ROUND(GREATEST(o.total_price * (1 - o.discount_percentage / 100) * (1 + o.vat_percentage / 100) - o.voucher_discount_amount, 0), 2) AS total_price_with_voucher,
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