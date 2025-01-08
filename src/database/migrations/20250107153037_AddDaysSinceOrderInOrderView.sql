-- Migration: AddDaysSinceOrderInOrderView
-- Created at: 2025-01-07T15:30:37.839Z

DROP VIEW IF EXISTS orders_view;
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
	DATE_PART('day', CURRENT_DATE - o.created_at) AS days_since_order,
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