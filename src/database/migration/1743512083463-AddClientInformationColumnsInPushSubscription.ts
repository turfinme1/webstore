import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClientInformationColumnsInPushSubscription1743512083463 implements MigrationInterface {
    name = 'AddClientInformationColumnsInPushSubscription1743512083463'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE push_subscriptions
            ADD COLUMN IF NOT EXISTS ip TEXT NOT NULL,
            ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL;
        `);

        await queryRunner.query(`INSERT INTO interfaces (name) VALUES ('report-push-subscriptions');`);
        await queryRunner.query(`INSERT INTO permissions (name, interface_id) VALUES
            ('view', 21),
            ('create', 21),
            ('read', 21),
            ('update', 21),
            ('delete', 21);`
        );

        await queryRunner.query(`ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_type_check1;`);
        await queryRunner.query(`
            ALTER TABLE email_templates
            ALTER COLUMN type SET DEFAULT 'Email';
        `);
        await queryRunner.query(`
            ALTER TABLE email_templates
            ADD CONSTRAINT email_templates_type_check CHECK (type IN ('Notification', 'Email', 'Push-Notification'));
        `);
        await queryRunner.query(`ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_type_check;`);
        await queryRunner.query(`
            ALTER TABLE emails
            ALTER COLUMN type SET DEFAULT 'Email';
        `);
        await queryRunner.query(`
            ALTER TABLE emails
            ADD CONSTRAINT emails_type_check CHECK (type IN ('Notification', 'Email', 'Push-Notification'));
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_created_inc_price ON orders (user_id, created_at) INCLUDE (paid_amount);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE push_subscriptions
            DROP COLUMN IF EXISTS ip,
            DROP COLUMN IF EXISTS user_agent;
        `);
        await queryRunner.query(`DROP TABLE IF EXISTS push_subscriptions;`);
        await queryRunner.query(`DELETE FROM permissions WHERE interface_id = 21;`);
        await queryRunner.query(`DELETE FROM interfaces WHERE id = 21;`);

        await queryRunner.query(`ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_type_check;`);
        await queryRunner.query(`
            ALTER TABLE email_templates
            ALTER COLUMN type SET DEFAULT 'Email';
        `);
        await queryRunner.query(`
            ALTER TABLE email_templates
            ADD CONSTRAINT email_templates_type_check CHECK (type IN ('Notification', 'Email'));
        `);
        await queryRunner.query(`ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_type_check;`);
        await queryRunner.query(`
            ALTER TABLE emails
            ALTER COLUMN type SET DEFAULT 'Email';
        `);
        await queryRunner.query(`
            ALTER TABLE emails
            ADD CONSTRAINT emails_type_check CHECK (type IN ('Notification', 'Email'));
        `);
    }

}