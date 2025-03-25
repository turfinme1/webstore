import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserGroupChartCountColumnInAppSettings1742899516360 implements MigrationInterface {
    name = 'AddUserGroupChartCountColumnInAppSettings1742899516360'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE app_settings ADD COLUMN user_group_chart_count BIGINT NOT NULL DEFAULT 10`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE app_settings DROP COLUMN user_group_chart_count`);
    }

}
