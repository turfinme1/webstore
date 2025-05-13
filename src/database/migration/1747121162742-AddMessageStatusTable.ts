import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMessageStatusTable1747121162742 implements MigrationInterface {
    name = 'AddMessageStatusTable1747121162742'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE message_queue_statuses (
                status TEXT PRIMARY KEY,
                display_name TEXT NOT NULL);`
        );

        await queryRunner.query(`
            INSERT INTO message_queue_statuses(status, display_name) VALUES
                ('pending',  'Pending'),
                ('sending',  'Sending'),
                ('sent',     'Sent'),
                ('seen',     'Seen'),
                ('failed',   'Failed'),
                ('expired',  'Expired');`
        );

        await queryRunner.query(`
            ALTER TABLE message_queue
                DROP CONSTRAINT emails_status_check;`
        );
       
        await queryRunner.query(`
            ALTER TABLE message_queue
                ALTER COLUMN status DROP DEFAULT,
                ALTER COLUMN status SET NOT NULL;`
        );

        await queryRunner.query(`
           ALTER TABLE message_queue
                ADD CONSTRAINT fk_message_queue_status 
                    FOREIGN KEY (status)
                    REFERENCES message_queue_statuses(status);`
        );

        await queryRunner.query(`
            ALTER TABLE message_queue
                ALTER COLUMN status SET DEFAULT 'pending';`
        );

        await queryRunner.query(`
            CREATE TABLE message_queue_status_transition (
                from_status TEXT NOT NULL REFERENCES message_queue_statuses(status),
                to_status   TEXT NOT NULL REFERENCES message_queue_statuses(status),
                PRIMARY KEY (from_status, to_status)
            );`
        );

        await queryRunner.query(`
            INSERT INTO message_queue_status_transition (from_status, to_status) VALUES
                ('pending','sending'),
                ('pending','expired'),
                ('pending','failed'),
                ('sending','pending'),
                ('sending','failed'),
                ('sending','sent'),
                ('sending','expired'),
                ('sent','seen');`
        );

        await queryRunner.query(`
            DROP TRIGGER IF EXISTS enforce_email_status_transition ON message_queue;
            DROP FUNCTION IF EXISTS check_email_status_transition();`
        );
        
        await queryRunner.query(`
            CREATE FUNCTION enforce_message_queue_status_transition() RETURNS trigger AS $$
            BEGIN
                IF NEW.status = OLD.status THEN
                    RETURN NEW;
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM message_queue_status_transition
                    WHERE from_status = OLD.status
                    AND to_status   = NEW.status
                ) THEN
                    RAISE EXCEPTION
                    'Invalid message_queue status transition: % → %',
                    OLD.status, NEW.status;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;`
        );

        await queryRunner.query(`
            CREATE TRIGGER trg_message_queue_status_transition
            BEFORE UPDATE OF status ON message_queue
            FOR EACH ROW
            EXECUTE FUNCTION enforce_message_queue_status_transition();`
        );
  
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
