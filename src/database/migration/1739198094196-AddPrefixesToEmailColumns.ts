import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrefixesToEmailColumns1739198094196 implements MigrationInterface {
    name = 'AddPrefixesToEmailColumns1739198094196'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION check_email_status_transition()
            RETURNS TRIGGER AS $$
            BEGIN
                IF TG_OP = 'INSERT' THEN
                    RETURN NEW;
                END IF;

                IF OLD.status = 'pending' AND NEW.status NOT IN ('sending', 'pending', 'sent', 'seen') THEN
                    RAISE EXCEPTION 'Invalid status transition: pending can only change to sending, pending, sent, or seen';
                ELSIF OLD.status = 'sending' AND NEW.status NOT IN ('sent', 'failed', 'pending') THEN
                    RAISE EXCEPTION 'Invalid status transition: sending can only change to sent, failed, or pending';
                ELSIF OLD.status = 'sent' AND NEW.status NOT IN ('seen') THEN
                    RAISE EXCEPTION 'Invalid status transition: sent can only change to seen';
                ELSIF OLD.status = 'seen' THEN
                    RAISE EXCEPTION 'Invalid status transition: seen is a final status';
                ELSIF OLD.status = 'failed' THEN
                    RAISE EXCEPTION 'Invalid status transition: failed is a final status';
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;`
        );
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "data_object"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "attempts"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "last_attempt"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "priority"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "retry_after"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "processing_started_at"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "lock_id"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "error_type"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "error"`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "email_attempts" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "email_last_attempt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "email_priority" integer DEFAULT 5`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "email_retry_after" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "email_processing_started_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "email_processing_started_at"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "email_retry_after"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "email_priority"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "email_last_attempt"`);
        await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "email_attempts"`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "error" text`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "error_type" text`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "lock_id" uuid`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "processing_started_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "retry_after" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "priority" integer DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "last_attempt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "attempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "emails" ADD "data_object" jsonb`);
    }

}
