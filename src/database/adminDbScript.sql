DROP TABLE IF EXISTS admin_captchas;
DROP TABLE IF EXISTS admin_failed_attempts;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_session_types;
DROP TABLE IF EXISTS admin_users;

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