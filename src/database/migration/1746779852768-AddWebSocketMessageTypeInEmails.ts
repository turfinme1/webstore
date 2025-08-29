import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWebSocketMessageTypeInEmails1746779852768 implements MigrationInterface {
    name = 'AddWebSocketMessageTypeInEmails1746779852768'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "emails" ADD COLUMN "event_type" TEXT NOT NULL DEFAULT 'message'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
