import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexForUserIdInOrderItemsTable1745836714035 implements MigrationInterface {
    name = 'AddIndexForUserIdInOrderItemsTable1745836714035'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX idx_order_items_order_id ON order_items(order_id);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX idx_order_items_order_id;`);
    }

}
