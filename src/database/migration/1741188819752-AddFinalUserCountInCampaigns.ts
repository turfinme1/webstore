import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinalUserCountInCampaigns1741188819752 implements MigrationInterface {
    name = 'AddFinalUserCountInCampaigns1741188819752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE campaigns ADD COLUMN final_user_count BIGINT NULL;`);
        await queryRunner.query('CREATE INDEX idx_orders_voucher_status ON orders(voucher_code, status);');


        await queryRunner.query(`INSERT INTO interfaces (name) VALUES ('report-orders-by-user');`);
        await queryRunner.query(`INSERT INTO permissions (name, interface_id) VALUES 
            ('view', 15),
            ('create', 15),
            ('read', 15),
            ('update', 15),
            ('delete', 15);`
        );

        await queryRunner.query(`INSERT INTO interfaces (name) VALUES ('report-users');`);
        await queryRunner.query(`INSERT INTO permissions (name, interface_id) VALUES 
            ('view', 16),
            ('create', 16),
            ('read', 16),
            ('update', 16),
            ('delete', 16);`
        );

        await queryRunner.query(`INSERT INTO interfaces (name) VALUES ('report-notifications');`);
        await queryRunner.query(`INSERT INTO permissions (name, interface_id) VALUES 
            ('view', 17),
            ('create', 17),
            ('read', 17),
            ('update', 17),
            ('delete', 17);`
        );

        await queryRunner.query(`INSERT INTO interfaces (name) VALUES ('report-notifications-status');`);
        await queryRunner.query(`INSERT INTO permissions (name, interface_id) VALUES 
            ('view', 18),
            ('create', 18),
            ('read', 18),
            ('update', 18),
            ('delete', 18);`
        );

        await queryRunner.query(`INSERT INTO interfaces (name) VALUES ('report-campaigns');`);
        await queryRunner.query(`INSERT INTO permissions (name, interface_id) VALUES 
            ('view', 19),
            ('create', 19),
            ('read', 19),
            ('update', 19),
            ('delete', 19);`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE campaigns DROP COLUMN final_user_count;`);
        await queryRunner.query('DROP INDEX idx_orders_voucher_status;');

        await queryRunner.query(`DELETE FROM permissions WHERE interface_id IN (15, 16, 17, 18, 19);`);
        await queryRunner.query(`DELETE FROM interfaces WHERE id IN (15, 16, 17, 18, 19);`);
    }

}
