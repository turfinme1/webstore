import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeNameUniqueInVouchersTable1747143225201 implements MigrationInterface {
    name = 'MakeNameUniqueInVouchersTable1747143225201'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "vouchers_name_is_active_idx" ON "vouchers" ("name") WHERE "is_active" = TRUE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
