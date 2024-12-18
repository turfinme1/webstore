-- Migration: AddVoucherTable
-- Created at: 2024-12-18T15:22:06.315Z

CREATE TABLE vouchers (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL,
    code TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE voucher_usages (
    user_id BIGINT NOT NULL REFERENCES users(id), 
    voucher_id BIGINT NOT NULL REFERENCES vouchers(id),
    PRIMARY KEY (user_id, voucher_id)
);

CREATE OR REPLACE VIEW vouchers_view AS
SELECT
    vouchers.*
FROM vouchers
WHERE vouchers.is_active = TRUE
ORDER BY vouchers.id DESC;

INSERT INTO interfaces (name) VALUES
('vouchers');

INSERT INTO permissions (name, interface_id) VALUES
('view', 12),
('create', 12),
('read', 12),
('update', 12),
('delete', 12);