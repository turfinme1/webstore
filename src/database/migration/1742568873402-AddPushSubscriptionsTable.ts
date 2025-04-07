import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPushSubscriptionsTable1742568873402 implements MigrationInterface {
    name = 'AddPushSubscriptionsTable1742568873402'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                endpoint TEXT NOT NULL UNIQUE,
                data JSONB NOT NULL,
                user_id BIGINT REFERENCES users(id),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NULL
            );`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS push_subscriptions;`);
    }

}
