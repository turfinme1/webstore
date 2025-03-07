import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinalUserCountInCampaigns1741188819752 implements MigrationInterface {
    name = 'AddFinalUserCountInCampaigns1741188819752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE campaigns ADD COLUMN final_user_count BIGINT NULL;`);
        await queryRunner.query('CREATE INDEX idx_orders_voucher_status ON orders(voucher_code, status);');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }

}
