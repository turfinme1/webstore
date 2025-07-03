import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationStatuses1751466661854 implements MigrationInterface {
    name = 'AddNotificationStatuses1751466661854'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE message_queue ADD COLUMN error_message TEXT NULL;`
        );
        
        await queryRunner.query(`
            INSERT INTO message_queue_statuses (status, display_name) VALUES
                ('unsubscribed', 'Unsubscribed'),
                ('delivered', 'Delivered'),
                ('opened', 'Opened'),
                ('dismissed', 'Dismissed'),
                ('clicked', 'Clicked');`
        );

        await queryRunner.query(`
            INSERT INTO message_queue_status_transition (from_status, to_status) VALUES
                ('pending', 'unsubscribed'),
                ('sending', 'unsubscribed'),
                ('sent', 'delivered'),
                ('sent', 'opened'),
                ('sent', 'clicked'),
                ('sent', 'dismissed'),
                ('sent', 'expired'),
                ('delivered', 'opened'),
                ('delivered', 'clicked'),
                ('delivered', 'dismissed');`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }
}
