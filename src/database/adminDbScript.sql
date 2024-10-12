DROP TABLE IF EXISTS admin_captchas;
DROP TABLE IF EXISTS admin_failed_attempts;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_session_types;
DROP TABLE IF EXISTS admin_users;

DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS status_codes;

CREATE TABLE admin_users (
    id BIGSERIAL PRIMARY KEY,
    user_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    iso_country_code_id BIGINT NOT NULL REFERENCES iso_country_codes(id),
    country_id BIGINT NULL REFERENCES iso_country_codes(id), 
    gender_id BIGINT NULL REFERENCES genders(id),
    address TEXT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    has_first_login BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE admin_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    admin_user_id BIGINT NULL REFERENCES admin_users(id),
    ip_address TEXT NULL,
    session_type_id BIGINT NOT NULL REFERENCES session_types(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limited_until TIMESTAMPTZ NULL
);

CREATE TABLE admin_captchas (
    id BIGSERIAL PRIMARY KEY,
    admin_session_id BIGINT NOT NULL REFERENCES admin_sessions(id),
    equation TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE admin_failed_attempts (
    id BIGSERIAL PRIMARY KEY,
    admin_session_id BIGINT NOT NULL REFERENCES admin_sessions(id),
    attempt_type_id BIGINT NOT NULL REFERENCES attempt_types(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE status_codes (
    id BIGSERIAL PRIMARY KEY,
    code BIGINT UNIQUE NOT NULL,
    message TEXT NOT NULL 
);

CREATE TABLE logs (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id BIGINT NULL REFERENCES admin_users(id),
    user_id BIGINT NULL REFERENCES users(id),
    status_code_id BIGINT NOT NULL REFERENCES status_codes(id),
    log_level TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description JSONB NULL,
    debug_info TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE VIEW logs_view AS
SELECT
    logs.id,
    logs.admin_user_id,
    logs.user_id,
    sc.code AS status_code,
    logs.log_level,
    logs.short_description,
    logs.long_description,
    logs.debug_info,
    logs.created_at
FROM logs
LEFT JOIN status_codes sc ON logs.status_code_id = sc.id;

CREATE OR REPLACE VIEW status_codes_view AS
SELECT
    sc.*
FROM status_codes sc;

INSERT INTO status_codes (code, message) VALUES
(1, 'Internal Server Error'),
(2, 'Unauthorized'),
(3, 'Invalid Session'),
(4, 'Invalid Login'),
(5, 'Invalid Token'),
(6, 'Invalid Input'),
(7, 'Invalid Body'),
(8, 'Invalid Query Params'),
(9, 'Wrong Password'),
(10, 'Rate Limited'),
(11, 'No Changes'),
(12, 'Duplicate'),
(13, 'Not Found'),
(14, 'Registration Success'),
(15, 'Login Success'),
(16, 'Profile Update Success'),
(17, 'Password Reset Success'),
(18, 'Update Success'),
(19, 'Delete Success'),
(20, 'Create Success');