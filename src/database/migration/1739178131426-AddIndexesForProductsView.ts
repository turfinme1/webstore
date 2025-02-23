import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexesForProductsView1739178131426 implements MigrationInterface {
    name = 'AddIndexesForProductsView1739178131426'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "idx_images_product_id" ON "images" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "idx_ratings_product_id" ON "ratings" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "products_price_idx" ON "products" ("price") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_ratings_product_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_images_product_id"`);
        await queryRunner.query(`DROP INDEX "public"."products_price_idx"`);
    }

}
