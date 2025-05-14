import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeNameUniqueInVouchersTable1747206522115 implements MigrationInterface {
    name = 'MakeNameUniqueInVouchersTable1747206522115'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "message_event_types" (
                "name" TEXT NOT NULL PRIMARY KEY
            );`
        );

        await queryRunner.query(`
            INSERT INTO message_event_types(name) VALUES
                ('message'),
                ('cart_update_sync_clients');`
        );

        await queryRunner.query(`
            ALTER TABLE message_queue
                ALTER COLUMN event_type DROP DEFAULT,
                ALTER COLUMN event_type DROP NOT NULL;`
        );
        await queryRunner.query(`
            ALTER TABLE message_queue
                ADD CONSTRAINT "fk_message_event_types"
                FOREIGN KEY (event_type) REFERENCES message_event_types(name);`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
