import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameTablesAndColumns1747054110003 implements MigrationInterface {
    name = 'RenameTablesAndColumns1747054110003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "emails" RENAME TO "message_queue"`);
        await queryRunner.query(`ALTER TABLE "notifications" RENAME COLUMN "valid_date" TO "valid_to_timestamp"`);

        await queryRunner.query(`DROP VIEW notifications_view;`);
        await queryRunner.query(`
            CREATE VIEW notifications_view AS
            SELECT 
                notifications.*,
                email_templates.type as template_type
            FROM notifications
            JOIN email_templates ON notifications.template_id = email_templates.id
            WHERE is_active = TRUE;`
        );

        await queryRunner.query(`ALTER TABLE "email_templates" RENAME TO "message_templates"`);
        
        await queryRunner.query(`DROP VIEW email_templates_view;`);
        await queryRunner.query(`
            CREATE VIEW message_templates_view AS
            SELECT *
            FROM message_templates;`
        );

        await queryRunner.query(`UPDATE interfaces SET name = 'message-templates' where name = 'email-templates';`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
