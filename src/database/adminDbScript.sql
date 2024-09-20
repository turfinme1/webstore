DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS captchas;
DROP TABLE IF EXISTS failed_attempts;
DROP TABLE IF EXISTS attempt_types;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS session_types;
DROP TABLE IF EXISTS users;

CREATE TABLE admin_users (
    id BIGSERIAL PRIMARY KEY,
    user_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    gender_id BIGINT NULL REFERENCES genders(id),
    address TEXT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE admin_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_hash UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    user_id BIGINT NULL REFERENCES users(id),
    ip_address TEXT NULL,
    session_type_id BIGINT NOT NULL REFERENCES session_types(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
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