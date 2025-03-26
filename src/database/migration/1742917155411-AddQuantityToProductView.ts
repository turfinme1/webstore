import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuantityToProductView1742917155411 implements MigrationInterface {
    name = 'AddQuantityToProductView1742917155411'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW IF EXISTS products_view;`);
        await queryRunner.query(`
            CREATE OR REPLACE VIEW products_view AS
            WITH vat AS (
                SELECT vat_percentage FROM app_settings LIMIT 1
            )
            SELECT
                p.id,
                p.code,
                p.name,
                p.price,
                inv.quantity,
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
            LEFT JOIN inventories inv ON p.id = inv.product_id
            CROSS JOIN vat
            GROUP BY p.id, vat.vat_percentage, inv.quantity;`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW IF EXISTS products_view;`);
        await queryRunner.query(`
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
            GROUP BY p.id, vat.vat_percentage;`
        );
    }

}
