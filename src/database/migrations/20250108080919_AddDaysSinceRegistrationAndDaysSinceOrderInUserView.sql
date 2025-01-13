-- Migration: AddDaysSinceRegistrationAndDaysSinceOrderInUserView
-- Created at: 2025-01-08T08:09:19.480Z

DROP VIEW IF EXISTS users_view;
CREATE OR REPLACE VIEW users_view AS
WITH last_orders AS (
    SELECT 
        user_id, 
        MAX(created_at) AS last_order_date
    FROM orders
    GROUP BY user_id
)
SELECT
    users.id,
    users.first_name,
    users.last_name,
    users.email,
    users.phone,
    icc.phone_code AS phone_code,
    users.iso_country_code_id,
    cc.country_name AS country_name,
    users.country_id,
    genders.type AS gender,
    users.birth_date,
    users.gender_id,
    users.address,
    users.is_email_verified,
    users.has_first_login,
    users.created_at,
    DATE_PART('day', CURRENT_DATE - users.created_at) AS days_since_registration,
	DATE_PART('day', CURRENT_DATE - lo.last_order_date) AS days_since_order
FROM users
LEFT JOIN iso_country_codes icc ON users.iso_country_code_id = icc.id
LEFT JOIN iso_country_codes cc ON users.country_id = cc.id
LEFT JOIN genders ON users.gender_id = genders.id
LEFT JOIN last_orders lo ON users.id = lo.user_id
WHERE users.is_active = TRUE
ORDER BY users.id;


DROP VIEW IF EXISTS target_groups_view;
CREATE OR REPLACE VIEW target_groups_view AS
SELECT
    tg.id,
    tg.name,
    tg.created_at,
    tg.filters,
    count(utg.user_id) AS user_count
FROM target_groups tg
LEFT JOIN user_target_groups utg ON tg.id = utg.target_group_id
WHERE tg.is_active = TRUE
GROUP BY tg.id;


CREATE OR REPLACE VIEW target_groups_detail_view AS
WITH last_orders AS (
    SELECT 
        user_id, 
        MAX(created_at) AS last_order_date
    FROM orders
    GROUP BY user_id
)
SELECT
    tg.id,
    tg.name,
    tg.created_at,
    tg.filters,
    COUNT(utg.user_id) AS user_count,
    (
        SELECT json_agg(
            json_build_object(
                'id', ranked_users.id,
                'first_name', ranked_users.first_name,
                'last_name', ranked_users.last_name,
                'email', ranked_users.email,
                'birth_date', ranked_users.birth_date,
                'gender', ranked_users.gender,
                'created_at', ranked_users.created_at,
                'days_since_registration', ranked_users.days_since_registration,
                'days_since_order', ranked_users.days_since_order
            )
        )
        FROM (
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                COALESCE(u.birth_date::text, null) AS birth_date,
                u.created_at,
                DATE_PART('day', CURRENT_DATE - u.created_at) AS days_since_registration,
	            DATE_PART('day', CURRENT_DATE - lo.last_order_date) AS days_since_order,
                g.type AS gender,
                ROW_NUMBER() OVER (PARTITION BY utg.target_group_id ORDER BY u.id) AS row_num
            FROM user_target_groups utg
            JOIN users u ON utg.user_id = u.id
            JOIN genders g ON u.gender_id = g.id
            LEFT JOIN last_orders lo ON u.id = lo.user_id
            WHERE utg.target_group_id = tg.id
        ) AS ranked_users
        WHERE ranked_users.row_num <= 200
    ) AS users
FROM target_groups tg
JOIN user_target_groups utg ON tg.id = utg.target_group_id
WHERE tg.is_active = TRUE
GROUP BY tg.id;


DROP VIEW IF EXISTS target_groups_export_view;
CREATE OR REPLACE VIEW target_groups_export_view AS
WITH last_orders AS (
    SELECT 
        user_id, 
        MAX(created_at) AS last_order_date
    FROM orders
    GROUP BY user_id
)
SELECT
    tg.id AS id,
	u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    COALESCE(u.birth_date::text, '') AS birth_date,
    g.type AS gender,
    u.created_at,
    DATE_PART('day', CURRENT_DATE - u.created_at) AS days_since_registration,
	DATE_PART('day', CURRENT_DATE - lo.last_order_date) AS days_since_order
FROM target_groups tg
JOIN user_target_groups utg ON tg.id = utg.target_group_id
JOIN users u ON utg.user_id = u.id
JOIN genders g ON u.gender_id = g.id
LEFT JOIN last_orders lo ON u.id = lo.user_id
WHERE tg.is_active = TRUE
ORDER BY tg.id, u.id;