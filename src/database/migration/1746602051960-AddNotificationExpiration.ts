import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationExpiration1746602051960 implements MigrationInterface {
    name = 'AddNotificationExpiration1746602051960'


    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE notifications ADD COLUMN valid_date TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
        await queryRunner.query(`ALTER TABLE notifications ALTER COLUMN valid_date DROP DEFAULT`);
        await queryRunner.query(`DROP VIEW notifications_view;`);
        await queryRunner.query(`
            CREATE VIEW notifications_view AS
            SELECT 
                notifications.id, 
                notifications.name,
                notifications.valid_date,
                template_id, user_ids, 
                notifications.created_at, 
                email_templates.type as template_type
            FROM notifications
            JOIN email_templates ON notifications.template_id = email_templates.id
            WHERE is_active = TRUE;`
        );

        await queryRunner.query(`ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_status_check;`);
        await queryRunner.query(`ALTER TABLE emails ADD CONSTRAINT emails_status_check CHECK (status IN ('pending', 'sending', 'sent', 'seen', 'failed', 'expired'));`);
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION check_email_status_transition()
            RETURNS TRIGGER AS $$
            BEGIN
                IF TG_OP = 'INSERT' THEN
                    RETURN NEW;
                END IF;

                IF OLD.status = 'pending' AND NEW.status NOT IN ('sending', 'pending', 'expired') THEN
                    RAISE EXCEPTION 'Invalid status transition: pending can only change to sending, pending, or expired';
                ELSIF OLD.status = 'sending' AND NEW.status NOT IN ('sent', 'failed', 'pending', 'expired') THEN
                    RAISE EXCEPTION 'Invalid status transition: sending can only change to sent, failed, pending, or expired';
                ELSIF OLD.status = 'sent' AND NEW.status NOT IN ('seen') THEN
                    RAISE EXCEPTION 'Invalid status transition: sent can only change to seen';
                ELSIF OLD.status = 'seen' THEN
                    RAISE EXCEPTION 'Invalid status transition: seen is a final status';
                ELSIF OLD.status = 'failed' THEN
                    RAISE EXCEPTION 'Invalid status transition: failed is a final status';
                ELSIF OLD.status = 'expired' THEN
                    RAISE EXCEPTION 'Invalid status transition: expired is a final status';
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
