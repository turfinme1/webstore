import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOrdersView1745828785943 implements MigrationInterface {
    name = 'UpdateOrdersView1745828785943'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW orders_view;`);
        await queryRunner.query(`CREATE VIEW orders_view AS
                SELECT o.id,
                    o.order_hash,
                    o.user_id,
                    u.email,
                    o.status,
                    o.total_price,
                    o.discount_percentage,
                    o.voucher_code,
                    o.voucher_discount_amount,
                    round(o.total_price * o.discount_percentage / 100::numeric, 2) AS discount_amount,
                    round(o.total_price * (1::numeric - o.discount_percentage / 100::numeric), 2) AS total_price_after_discount,
                    o.vat_percentage,
                    round(o.total_price * (1::numeric - o.discount_percentage / 100::numeric) * o.vat_percentage / 100::numeric, 2) AS vat_amount,
                    round(o.total_price * (1::numeric - o.discount_percentage / 100::numeric) * (1::numeric + o.vat_percentage / 100::numeric), 2) AS total_price_with_vat,
                    round(GREATEST(o.total_price * (1::numeric - o.discount_percentage / 100::numeric) * (1::numeric + o.vat_percentage / 100::numeric) - o.voucher_discount_amount, 0::numeric), 2) AS total_price_with_voucher,
                    round(GREATEST(o.total_price * (1::numeric - o.discount_percentage / 100::numeric) * (1::numeric + o.vat_percentage / 100::numeric) - o.voucher_discount_amount, 0::numeric) / (1::numeric + o.vat_percentage / 100::numeric), 2) AS total_price_with_voucher_without_vat,
                    round(GREATEST(o.total_price * (1::numeric - o.discount_percentage / 100::numeric) * (1::numeric + o.vat_percentage / 100::numeric) - o.voucher_discount_amount, 0::numeric) - GREATEST(o.total_price * (1::numeric - o.discount_percentage / 100::numeric) * (1::numeric + o.vat_percentage / 100::numeric) - o.voucher_discount_amount, 0::numeric) / (1::numeric + o.vat_percentage / 100::numeric), 2) AS total_price_with_voucher_vat_amount,
                    o.paid_amount,
                    o.is_active,
                    o.created_at,
                    date_part('day'::text, CURRENT_DATE::timestamp with time zone - o.created_at) AS days_since_order,
                    json_build_object('id', a.id, 'street', a.street, 'city', a.city, 'country_id', a.country_id, 'country_name', c.country_name) AS shipping_address
                FROM orders o
                    LEFT JOIN addresses a ON o.shipping_address_id = a.id
                    LEFT JOIN iso_country_codes c ON a.country_id = c.id
                    LEFT JOIN users u ON o.user_id = u.id
                WHERE o.is_active = true;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
