import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSettingsColumnInMessageTemplates1750418978290 implements MigrationInterface {
    name = 'AddSettingsColumnInMessageTemplates1750418978290'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE message_templates
                ADD COLUMN notification_settings JSONB NULL;`);

        await queryRunner.query(`DROP VIEW IF EXISTS message_templates_view;`);
        await queryRunner.query(`CREATE OR REPLACE VIEW message_templates_view AS
            SELECT * FROM message_templates`);
        
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }
}
