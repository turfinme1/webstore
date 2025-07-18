import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeHashingToBeInDatabase1752736969380 implements MigrationInterface {
    name = 'ChangeHashingToBeInDatabase1752736969380'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
        await queryRunner.query(`ALTER TABLE users ADD COLUMN password_version BIGINT NOT NULL DEFAULT 1;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }
}
