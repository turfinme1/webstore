import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordVersionInAdminUserTable1752820178785 implements MigrationInterface {
    name = 'AddPasswordVersionInAdminUserTable1752820178785'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE admin_users ADD COLUMN password_version BIGINT NOT NULL DEFAULT 1;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        
    }
}
