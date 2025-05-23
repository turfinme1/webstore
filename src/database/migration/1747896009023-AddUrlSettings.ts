import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUrlSettings1747896009023 implements MigrationInterface {
    name = 'AddUrlSettings1747896009023'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_settings" ADD front_office_port BIGINT`);
        await queryRunner.query(`UPDATE app_settings SET front_office_port = 3002 WHERE id = 1`);
        await queryRunner.query(`ALTER TABLE "app_settings" ALTER COLUMN front_office_port SET NOT NULL`);

        await queryRunner.query(`ALTER TABLE "app_settings" ADD front_office_transport TEXT`);
        await queryRunner.query(`UPDATE app_settings SET front_office_transport = 'websocket' WHERE id = 1`);

        await queryRunner.query(`INSERT INTO message_event_types (name) VALUES ('notification')`);
        await queryRunner.query(`UPDATE message_queue SET event_type = 'notification' WHERE event_type = 'message'`);
        await queryRunner.query(`DELETE FROM message_event_types WHERE name = 'message'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
