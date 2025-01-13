-- Migration: AddVATColumnsToOrdersView
-- Created at: 2025-01-13T09:39:45.531Z

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
    ROUND(GREATEST(o.total_price * (1 - o.discount_percentage / 100) * (1 + o.vat_percentage / 100) - o.voucher_discount_amount, 0) / (1 + o.vat_percentage / 100), 2) AS total_price_with_voucher_without_vat,
    ROUND(GREATEST(o.total_price * (1 - o.discount_percentage / 100) * (1 + o.vat_percentage / 100) - o.voucher_discount_amount, 0) - 
          (GREATEST(o.total_price * (1 - o.discount_percentage / 100) * (1 + o.vat_percentage / 100) - o.voucher_discount_amount, 0) / (1 + o.vat_percentage / 100)), 2) AS total_price_with_voucher_vat_amount,
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