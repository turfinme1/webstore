import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCampaignChartCountColumnInAppSettings1744100800340 implements MigrationInterface {
    name = 'AddCampaignChartCountColumnInAppSettings1744100800340'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE app_settings ADD COLUMN campaign_chart_count BIGINT NOT NULL DEFAULT 10`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE app_settings DROP COLUMN campaign_chart_count`);
    }

}
