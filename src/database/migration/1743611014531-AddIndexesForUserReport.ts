import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexesForUserReport1743611014531 implements MigrationInterface {
    name = 'AddIndexesForUserReport1743611014531'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_created_inc_price ON orders (user_id, created_at) INCLUDE (paid_amount);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_user_created_inc_price;`);
    }

}
