import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserReportAggregations1744380846796 implements MigrationInterface {
    name = 'AddUserReportAggregations1744380846796'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
                CREATE TABLE user_order_aggregates (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
                has_paid_order BOOLEAN NOT NULL,
                first_order_created_at timestamptz NULL,
                days_since_first_order BIGINT NULL,
                first_order_total_paid_amount NUMERIC(12,2) NULL,
                average_paid_amount NUMERIC(12,2) NOT NULL,
                days_since_last_order BIGINT NULL,
                order_total_paid_amount NUMERIC(12,2) NOT NULL,
                order_count BIGINT NOT NULL,
                updated_at timestamptz NULL
            );`
        );
        await queryRunner.query(`
                CREATE TABLE user_login_aggregates (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
                days_since_last_login BIGINT NULL,
                login_count BIGINT NOT NULL,
                average_weekly_login_count NUMERIC(12,2) NOT NULL, 
                updated_at timestamptz NULL
            );`
        );
        await queryRunner.query(`
            CREATE INDEX idx_logs_user_code
            ON logs USING btree (user_id)
            INCLUDE (created_at)
            WHERE status_code = 'CONTROLLER.AUTH.00051.LOGIN_SUCCESS'::text;`
        );
        await queryRunner.query(`
            CREATE INDEX idx_orders_paid_user
            ON orders (user_id)
            INCLUDE (created_at, paid_amount)
            WHERE status = 'Paid';`
        );

        await queryRunner.query(`
            WITH login_aggregates AS (
                SELECT
                    user_id,
                    MAX(created_at) AS last_login,
                    COUNT(*) AS login_count
                FROM logs
                WHERE status_code = 'CONTROLLER.AUTH.00051.LOGIN_SUCCESS'
                GROUP BY user_id
            )
            INSERT INTO user_login_aggregates (
                user_id,
                days_since_last_login,
                login_count,
                average_weekly_login_count,
                updated_at
            )
            SELECT
                u.id,
                DATE_PART('day', CURRENT_DATE - la.last_login)::BIGINT AS days_since_last_login,
                COALESCE(la.login_count, 0) AS login_count,
                TRUNC(
                    COALESCE(la.login_count, 0)::numeric / GREATEST(1, (DATE_PART('day', CURRENT_DATE - u.created_at) / 7)::numeric),
                    2
                ) AS average_weekly_login_count,
                NOW() AS updated_at
            FROM users u
            LEFT JOIN login_aggregates la ON u.id = la.user_id;`
        );

        await queryRunner.query(`
            WITH order_aggregates AS (
            SELECT
                user_id,
                MAX(created_at) AS last_order,
                COUNT(*) AS order_count,
                SUM(paid_amount) AS order_total_paid_amount,
                AVG(paid_amount) AS average_paid_amount
            FROM orders
            WHERE status = 'Paid'
            GROUP BY user_id
            ),
            first_orders AS (
            SELECT DISTINCT ON (user_id)
                user_id,
                created_at AS first_order_created_at,
                paid_amount AS first_order_total_paid_amount
            FROM orders
            WHERE status = 'Paid'
            ORDER BY user_id, created_at ASC
            )
            INSERT INTO user_order_aggregates (
                user_id,
                has_paid_order,
                first_order_created_at,
                days_since_first_order,
                first_order_total_paid_amount,
                average_paid_amount,
                days_since_last_order,
                order_total_paid_amount,
                order_count,
                updated_at
            )
            SELECT 
                u.id,
                CASE WHEN oa.order_count IS NULL THEN false ELSE true END AS has_paid_order,
                fo.first_order_created_at,
                CASE 
                    WHEN fo.first_order_created_at IS NOT NULL 
                    THEN DATE_PART('day', CURRENT_DATE - fo.first_order_created_at)::BIGINT 
                    ELSE NULL 
                END AS days_since_first_order,
                fo.first_order_total_paid_amount,
                COALESCE(oa.average_paid_amount, 0)::numeric,
                CASE 
                    WHEN oa.last_order IS NOT NULL 
                    THEN DATE_PART('day', CURRENT_DATE - oa.last_order)::BIGINT 
                    ELSE NULL 
                END AS days_since_last_order,
                COALESCE(oa.order_total_paid_amount, 0)::numeric,
                COALESCE(oa.order_count, 0),
                NOW() AS updated_at
            FROM users u
            LEFT JOIN order_aggregates oa ON u.id = oa.user_id
            LEFT JOIN first_orders fo ON u.id = fo.user_id;`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
                DROP TABLE user_order_aggregates;
            `
        );
        await queryRunner.query(`
                DROP TABLE user_login_aggregates;
            `
        );
    }

}
