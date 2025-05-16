import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserReportPreferences1747222168329 implements MigrationInterface {
    name = 'AddUserReportPreferences1747222168329'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE reports (
                name TEXT PRIMARY KEY
            );`
        );

        await queryRunner.query(`
            INSERT INTO reports (name) VALUES
            ('report-logs'),
            ('report-orders'),
            ('report-orders-by-user'),
            ('report-users'),
            ('report-notifications'),
            ('report-notifications-status'),
            ('report-campaigns'),
            ('report-push-subscriptions');`
        );
        
        await queryRunner.query(`
            CREATE TABLE user_report_preferences (
                id BIGSERIAL PRIMARY KEY,
                admin_user_id BIGINT NOT NULL REFERENCES admin_users(id),
                report_name TEXT NOT NULL REFERENCES reports(name),
                preference JSONB NOT NULL,
                UNIQUE (admin_user_id, report_name)
            );`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
