import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUrlInAppSettings1747034647190 implements MigrationInterface {
    name = 'AddUrlInAppSettings1747034647190'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_settings" ADD url TEXT`);
        await queryRunner.query(`ALTER TABLE "app_settings" ADD web_socket_api_url TEXT`);
        await queryRunner.query(`ALTER TABLE "app_settings" ADD web_socket_url TEXT`);
        await queryRunner.query(`ALTER TABLE "app_settings" ADD issues_url TEXT`);
        await queryRunner.query(`ALTER TABLE "app_settings" ADD java_api_url TEXT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
