import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserLoginsTable1740938483133 implements MigrationInterface {
    name = 'AddUserLoginsTable1740938483133'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_logins" (
            "id" BIGSERIAL PRIMARY KEY,
            "user_id" BIGINT NOT NULL REFERENCES users(id),
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
        await queryRunner.query(`CREATE INDEX "idx_user_logins_user_id" ON "user_logins" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "idx_user_logins_created_at" ON "user_logins" ("created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        
    }

}
