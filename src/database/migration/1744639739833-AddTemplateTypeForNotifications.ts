import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTemplateTypeForNotifications1744639739833 implements MigrationInterface {
    name = 'AddTemplateTypeForNotifications1744639739833'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_type_check;`);
        await queryRunner.query(`
            ALTER TABLE email_templates
            ADD CONSTRAINT email_templates_type_check CHECK (type IN ('Notification', 'Email', 'Push-Notification', 'Push-Notification-Broadcast'));
        `);
        await queryRunner.query(`ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_type_check;`);
        await queryRunner.query(`
            ALTER TABLE emails
            ADD CONSTRAINT emails_type_check CHECK (type IN ('Notification', 'Email', 'Push-Notification', 'Push-Notification-Broadcast'));
        `);
        await queryRunner.query(`
            ALTER TABLE notifications
            ALTER COLUMN user_ids DROP NOT NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_type_check;`);
        await queryRunner.query(`
            ALTER TABLE email_templates
            ADD CONSTRAINT email_templates_type_check CHECK (type IN ('Notification', 'Email', 'Push-Notification'));
        `);
        await queryRunner.query(`ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_type_check;`);
        await queryRunner.query(`
            ALTER TABLE emails
            ADD CONSTRAINT emails_type_check CHECK (type IN ('Notification', 'Email', 'Push-Notification'));
        `);
        await queryRunner.query(`
            ALTER TABLE notifications
            ALTER COLUMN user_ids SET NOT NULL;
        `);
    }

}
