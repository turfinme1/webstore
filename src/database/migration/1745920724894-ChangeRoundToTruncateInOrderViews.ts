import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeRoundToTruncateInOrderViews1745920724894 implements MigrationInterface {
    name = 'ChangeRoundToTruncateInOrderViews1745920724894'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW orders_detail_view;`);
        await queryRunner.query(`
            CREATE VIEW orders_detail_view AS 
                WITH order_items_agg AS (
                    SELECT oi.order_id,
                        json_agg(json_build_object('product_id', oi.product_id, 'name', p.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'total_price', oi.total_price)) AS order_items
                    FROM order_items oi
                        JOIN products p ON oi.product_id = p.id
                    GROUP BY oi.order_id
                    )
                SELECT o.id,
                    o.order_hash,
                    o.user_id,
                    u.email,
                    o.status,
                    o.total_price,
                    o.discount_percentage,
                    o.voucher_code,
                    o.voucher_discount_amount,
                    trunc(o.total_price * o.discount_percentage / 100::numeric, 2) AS discount_amount,
                    trunc(o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2), 2) AS total_price_after_discount,
                    o.vat_percentage,
                    trunc((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * o.vat_percentage / 100::numeric, 2) AS vat_amount,
                    trunc((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * (1::numeric + o.vat_percentage / 100::numeric), 2) AS total_price_with_vat,
                    trunc(GREATEST((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * (1::numeric + o.vat_percentage / 100::numeric) - o.voucher_discount_amount, 0::numeric), 2) AS total_price_with_voucher,
                    o.paid_amount,
                    o.is_active,
                    o.created_at,
                    json_build_object('id', a.id, 'street', a.street, 'city', a.city, 'country_id', a.country_id, 'country_name', c.country_name) AS shipping_address,
                    oi_agg.order_items
            FROM orders o
                LEFT JOIN addresses a ON o.shipping_address_id = a.id
                LEFT JOIN iso_country_codes c ON a.country_id = c.id
                LEFT JOIN users u ON o.user_id = u.id
                LEFT JOIN order_items_agg oi_agg ON o.id = oi_agg.order_id;`
        );

        await queryRunner.query(`DROP VIEW orders_export_view;`);
        await queryRunner.query(`
            CREATE VIEW orders_export_view AS 
                SELECT o.created_at,
                    o.id,
                    o.order_hash,
                    u.email,
                    o.status,
                    o.total_price,
                    o.discount_percentage,
                    trunc(o.total_price * o.discount_percentage / 100::numeric, 2) AS discount_amount,
                    trunc(o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2), 2) AS total_price_after_discount,
                    o.vat_percentage,
                    trunc((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * o.vat_percentage / 100::numeric, 2) AS vat_amount,
                    trunc((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * (1::numeric + o.vat_percentage / 100::numeric), 2) AS total_price_with_vat,
                    o.paid_amount,
                    o.is_active
                FROM orders o
                    LEFT JOIN users u ON o.user_id = u.id;`
        );


        await queryRunner.query(`DROP VIEW orders_view;`);
        await queryRunner.query(`
            CREATE VIEW orders_view AS 
                SELECT o.id,
                    o.order_hash,
                    o.user_id,
                    u.email,
                    o.status,
                    o.total_price,
                    o.discount_percentage,
                    o.voucher_code,
                    o.voucher_discount_amount,
                    trunc(o.total_price * o.discount_percentage / 100::numeric, 2) AS discount_amount,
                    trunc(o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2), 2) AS total_price_after_discount,
                    o.vat_percentage,
                    trunc((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * o.vat_percentage / 100::numeric, 2) AS vat_amount,
                    trunc((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * (1::numeric + o.vat_percentage / 100::numeric), 2) AS total_price_with_vat,
                    trunc(GREATEST((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * (1::numeric + o.vat_percentage / 100::numeric) - o.voucher_discount_amount, 0::numeric), 2) AS total_price_with_voucher,
                    trunc(GREATEST((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * (1::numeric + o.vat_percentage / 100::numeric) - o.voucher_discount_amount, 0::numeric) / (1::numeric + o.vat_percentage / 100::numeric), 2) AS total_price_with_voucher_without_vat,
                    trunc(
                        GREATEST((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * (1::numeric + o.vat_percentage / 100::numeric) - o.voucher_discount_amount, 0::numeric), 2) 
                    - trunc(GREATEST((o.total_price - trunc(o.total_price * o.discount_percentage / 100::numeric, 2)) * (1::numeric + o.vat_percentage / 100::numeric) - o.voucher_discount_amount, 0::numeric) / (1::numeric + o.vat_percentage / 100::numeric), 2) AS  total_price_with_voucher_vat_amount,
                    o.paid_amount,
                    o.is_active,
                    o.created_at,
                    date_part('day'::text, CURRENT_DATE::timestamp with time zone - o.created_at) AS days_since_order,
                    json_build_object('id', a.id, 'street', a.street, 'city', a.city, 'country_id', a.country_id, 'country_name', c.country_name) AS shipping_address
                FROM orders o
                    LEFT JOIN addresses a ON o.shipping_address_id = a.id
                    LEFT JOIN iso_country_codes c ON a.country_id = c.id
                    LEFT JOIN users u ON o.user_id = u.id
                WHERE o.is_active = true;`
        );

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
