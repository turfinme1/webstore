import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuantityChangeMessageEventType1748333209992 implements MigrationInterface {
    name = 'AddQuantityChangeMessageEventType1748333209992'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO message_event_types(name) VALUES ('quantity_update_sync_clients');`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
       
    }

}
