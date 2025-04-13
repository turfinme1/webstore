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
            CREATE MATERIALIZED VIEW monthly_order_summary AS
            SELECT
                DATE_TRUNC('month', created_at) AS created_at,
                SUM(total_price) AS total_price,
                SUM(paid_amount) AS paid_amount,
                COUNT(*) AS count
            FROM orders
            WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY 1;`
        );

        await queryRunner.query(`
            CREATE MATERIALIZED VIEW daily_order_summary AS
            WITH date_series AS (
                    SELECT generate_series(
                        CURRENT_DATE - INTERVAL '9 days',
                        CURRENT_DATE,
                        INTERVAL '1 day'
                    )::date AS day
            ),
            order_data AS (
                SELECT
                    DATE_TRUNC('day', created_at)::date AS created_at,
                    SUM(total_price) AS total_price,
                    SUM(paid_amount) AS paid_amount,
                    COUNT(*) AS count
                FROM orders
                WHERE created_at >= CURRENT_DATE - INTERVAL '10 days'
                GROUP BY 1
            )
            SELECT
                d.day AS created_at,
                COALESCE(o.total_price, 0) AS total_price,
                COALESCE(o.paid_amount, 0) AS paid_amount,
                COALESCE(o.count, 0) AS count
            FROM date_series d
            LEFT JOIN order_data o ON d.day = o.created_at;`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP MATERIALIZED VIEW IF EXISTS daily_order_summary;
        `);
        
        await queryRunner.query(`
            DROP MATERIALIZED VIEW IF EXISTS monthly_order_summary;
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_orders_paid_user;
        `);
        
        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_logs_user_code;
        `);

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
