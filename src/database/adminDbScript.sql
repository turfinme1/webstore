DROP TABLE IF EXISTS admin_captchas;
DROP TABLE IF EXISTS admin_failed_attempts;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_session_types;
DROP TABLE IF EXISTS admin_users;

DROP TABLE IF EXISTS admin_user_roles;
DROP TABLE IF EXISTS interfaces;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;

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

CREATE TABLE logs (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id BIGINT NULL REFERENCES admin_users(id),
    user_id BIGINT NULL REFERENCES users(id),
    status_code TEXT NOT NULL,
    log_level TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NULL,
    debug_info TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_user_roles (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id BIGINT NOT NULL REFERENCES admin_users(id),
    role_id BIGINT NOT NULL REFERENCES roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interfaces (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK (name IN ('view', 'create', 'read', 'update', 'delete')),
    interface_id BIGINT NOT NULL REFERENCES interfaces(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, interface_id)
);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id),
    permission_id BIGINT NOT NULL REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE OR REPLACE VIEW logs_view AS
SELECT
    logs.*
FROM logs

CREATE OR REPLACE VIEW status_codes_view AS
SELECT
    sc.*
FROM status_codes sc;

CREATE OR REPLACE VIEW admin_users_view AS
SELECT
    admin_users.id,
    admin_users.first_name,
    admin_users.last_name,
    admin_users.email,
    admin_users.phone,
    icc.phone_code AS phone_code,
    admin_users.iso_country_code_id,
    cc.country_name AS country_name,
	admin_users.country_id,
    genders.type AS gender,
    admin_users.gender_id,
    admin_users.address,
    admin_users.is_email_verified,
    admin_users.has_first_login
FROM admin_users
LEFT JOIN iso_country_codes icc ON admin_users.iso_country_code_id = icc.id
LEFT JOIN iso_country_codes cc ON admin_users.country_id = cc.id
LEFT JOIN genders ON admin_users.gender_id = genders.id;

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
(20, 'Create Success'),
(21, 'Order Complete Success'),
(22, 'Cart Prices Changed');