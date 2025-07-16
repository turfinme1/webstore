import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFirebaseIntegration1752242062904 implements MigrationInterface {
    name = 'AddFirebaseIntegration1752242062904'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "push_notification_providers" (
                "id" BIGINT PRIMARY KEY,
                "name" TEXT NOT NULL UNIQUE,
                "display_name" TEXT NOT NULL
            );`
        );

        await queryRunner.query(`
            INSERT INTO "push_notification_providers" (id, name, display_name) VALUES
                (1, 'webpush', 'Web Push'),
                (2, 'firebase', 'Firebase');`
        );

        await queryRunner.query(`
            ALTER TABLE "app_settings" ADD COLUMN "push_notification_provider_id" BIGINT REFERENCES "push_notification_providers"(id)`
        );

        await queryRunner.query(`
            UPDATE "app_settings" SET "push_notification_provider_id" = 1
            WHERE "push_notification_provider_id" IS NULL;`
        );
        
        await queryRunner.query(`
            ALTER TABLE "push_subscriptions" ADD COLUMN "push_notification_provider_id" BIGINT REFERENCES "push_notification_providers"(id);`
        );

        await queryRunner.query(`
            UPDATE "push_subscriptions" SET "push_notification_provider_id" = 1
            WHERE "push_notification_provider_id" IS NULL;`
        );
        
        await queryRunner.query(`
            ALTER TABLE "push_subscriptions" ALTER COLUMN "push_notification_provider_id" SET NOT NULL;`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }
}
