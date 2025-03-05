import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinalUserCountInCampaigns1741188819752 implements MigrationInterface {
    name = 'AddFinalUserCountInCampaigns1741188819752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE campaigns ADD COLUMN final_user_count BIGINT NULL;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }

}
