DROP VIEW IF EXISTS roles_view;
DROP VIEW IF EXISTS permissions_view;

DROP TABLE IF EXISTS admin_captchas;
DROP TABLE IF EXISTS admin_failed_attempts;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_session_types;
DROP TABLE IF EXISTS admin_users;

DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS admin_user_roles;
DROP TABLE IF EXISTS interfaces;
DROP TABLE IF EXISTS roles;

DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS status_codes;

CREATE TABLE admin_users (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NULL REFERENCES roles(id),
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

ALTER TABLE admin_users ADD COLUMN role_id BIGINT NULL REFERENCES roles(id);

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
    admin_user_id BIGINT NOT NULL REFERENCES admin_users(id),
    role_id BIGINT NOT NULL REFERENCES roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (admin_user_id, role_id)
);

CREATE TABLE interfaces (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id),
    permission_id BIGINT NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK (name IN ('view', 'create', 'read', 'update', 'delete')),
    interface_id BIGINT NOT NULL REFERENCES interfaces(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, interface_id)
);

INSERT INTO roles (name) VALUES
('admin'),
('product_manager'),
('order_manager'),
('customer_service');

INSERT INTO interfaces (name) VALUES
('crud_products'),
('crud_users'),
('crud_admin_users'),
('crud_orders'),
('report_logs'),
('report_orders');

INSERT INTO permissions (name, interface_id) VALUES
('view', 1),
('create', 1),
('read', 1),
('update', 1),
('delete', 1),
('view', 2),
('create', 2),
('read', 2),
('update', 2),
('delete', 2),
('view', 3),
('create', 3),
('read', 3),
('update', 3),
('delete', 3),
('view', 4),
('create', 4),
('read', 4),
('update', 4),
('delete', 4),
('view', 5),
('create', 5),
('read', 5),
('update', 5),
('delete', 5),
('view', 6),
('create', 6),
('read', 6),
('update', 6),
('delete', 6);

INSERT INTO role_permissions (role_id, permission_id) VALUES
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),   -- crud_products
    (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),  -- crud_users
    (1, 11), (1, 12), (1, 13), (1, 14), (1, 15), -- crud_admin_users
    (1, 16), (1, 17), (1, 18), (1, 19), (1, 20), -- crud_orders
    (1, 21), (1, 22),                          -- report_logs (view, create)
    (1, 23), (1, 24);                          -- report_orders (view, create)

-- Product Manager Role (2) - All permissions on crud_products
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (2, 1), (2, 2), (2, 3), (2, 4), (2, 5);  -- crud_products

-- Order Manager Role (3) - All permissions on crud_orders
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (3, 16), (3, 17), (3, 18), (3, 19), (3, 20);  -- crud_orders

-- Customer Service Role (4) - Limited permissions on orders and reports
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (4, 16), (4, 18),  -- crud_orders (view, read)
    (4, 23), (4, 24);  -- report_orders (view, read)
    
CREATE OR REPLACE VIEW roles_view AS
SELECT
    roles.id,
    roles.name,
    roles.is_active,
    roles.created_at,
    jsonb_agg(
        jsonb_build_object(
            'id', permissions_view.id,
            'type', permissions_view.name,
            'interface_name', permissions_view.interface_name
        )
    ) AS permissions
FROM roles
LEFT JOIN role_permissions ON roles.id = role_permissions.role_id
LEFT JOIN permissions_view ON role_permissions.permission_id = permissions_view.id
GROUP BY roles.id, roles.name, roles.is_active, roles.created_at
ORDER BY roles.id;

CREATE OR REPLACE VIEW permissions_view AS
SELECT
    permissions.id,
    permissions.interface_id,
    permissions.name,
    interfaces.name AS interface_name
FROM permissions
LEFT JOIN interfaces ON permissions.interface_id = interfaces.id
ORDER BY permissions.interface_id, permissions.name;


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
    admin_users.has_first_login,
    admin_users.role_id,
    roles.name AS role_name
FROM admin_users
LEFT JOIN iso_country_codes icc ON admin_users.iso_country_code_id = icc.id
LEFT JOIN iso_country_codes cc ON admin_users.country_id = cc.id
LEFT JOIN genders ON admin_users.gender_id = genders.id
LEFT JOIN roles ON admin_users.role_id = roles.id;

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