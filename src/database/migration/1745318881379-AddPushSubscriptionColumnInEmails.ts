import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPushSubscriptionColumnInEmails1745318881379 implements MigrationInterface {
    name = 'AddPushSubscriptionColumnInEmails1745318881379'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "emails" ADD COLUMN "push_subscription_id" BIGINT NULL REFERENCES "push_subscriptions"("id");`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.query(`ALTER TABLE "emails" DROP COLUMN "push_subscription_id";`);
    }

}
