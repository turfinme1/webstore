import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveSequenceInInterfacesTable1745580996068 implements MigrationInterface {
    name = 'RemoveSequenceInInterfacesTable1745580996068'

    public async up(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.query(`ALTER TABLE interfaces ALTER COLUMN id DROP DEFAULT;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
