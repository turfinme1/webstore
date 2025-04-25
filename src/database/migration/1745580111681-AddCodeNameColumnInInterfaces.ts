import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCodeNameColumnInInterfaces1745580111681 implements MigrationInterface {
    name = 'AddCodeNameColumnInInterfaces1745580111681'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER table interfaces ADD COLUMN IF NOT EXISTS code_name TEXT`);
        await queryRunner.query(`UPDATE interfaces SET code_name = name;`);
        await queryRunner.query('ALTER TABLE interfaces ALTER COLUMN code_name SET NOT NULL;');
        await queryRunner.query(`ALTER TABLE interfaces ADD CONSTRAINT interfaces_code_name_key UNIQUE (code_name);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER table interfaces DROP COLUMN code_name;`);
    }

}
