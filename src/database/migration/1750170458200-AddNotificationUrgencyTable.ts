import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationUrgencyTable1750170458200 implements MigrationInterface {
    name = 'AddNotificationUrgencyTable1750170458200'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE message_queue
                ADD COLUMN notification_settings JSONB NULL;`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
