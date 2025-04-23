import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusColumnInPushSubscriptions1745393318135 implements MigrationInterface {
    name = 'AddStatusColumnInPushSubscriptions1745393318135'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE push_subscriptions ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'inactive'));`);
        await queryRunner.query(`CREATE INDEX "idx_push_subscriptions_status" ON push_subscriptions (status);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.query(`DROP INDEX "idx_push_subscriptions_status";`);
       await queryRunner.query(`ALTER TABLE push_subscriptions DROP COLUMN status;`);
    }

}
