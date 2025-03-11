import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserGroupsTable1741684864928 implements MigrationInterface {
    name = 'AddUserGroupsTable1741684864928'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_groups" (
                id BIGSERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                filters JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
        `);

        await queryRunner.query(`
            CREATE TABLE "user_user_groups" (
                user_group_id BIGINT NOT NULL REFERENCES user_groups(id),
                user_id BIGINT NOT NULL REFERENCES users(id),
                PRIMARY KEY (user_group_id, user_id)
            );
        `);

        await queryRunner.query(`
            CREATE VIEW "user_groups_view" AS
            SELECT
                ug.id,
                ug.name,
                ug.filters,
                ug.created_at,
                ug.updated_at,
                count(uug.user_id) as users_count
            FROM user_groups ug
            LEFT JOIN user_user_groups uug ON ug.id = uug.user_group_id
            WHERE ug.is_active = TRUE
            GROUP BY ug.id;
        `);

        await queryRunner.query(`INSERT INTO interfaces (name) VALUES ('user-groups');`);
        await queryRunner.query(`INSERT INTO permissions (name, interface_id) VALUES
            ('view', 20),
            ('create', 20),
            ('read', 20),
            ('update', 20),
            ('delete', 20);`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW "user_groups_view";`);
        await queryRunner.query(`DROP TABLE "user_user_groups";`);
        await queryRunner.query(`DROP TABLE "user_groups";`);
        await queryRunner.query(`DELETE FROM permissions WHERE interface_id = 20;`);
        await queryRunner.query(`DELETE FROM interfaces WHERE id = 20;`);
    }

}
