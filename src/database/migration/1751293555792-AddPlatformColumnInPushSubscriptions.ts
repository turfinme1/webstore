import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlatformColumnInPushSubscriptions1751293555792 implements MigrationInterface {
    name = 'AddPlatformColumnInPushSubscriptions1751293555792'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE push_subscriptions
                ADD COLUMN platform TEXT NULL;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }
}
