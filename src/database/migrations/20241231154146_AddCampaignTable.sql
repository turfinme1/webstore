-- Migration: AddCampaignTable
-- Created at: 2024-12-31T15:41:46.208Z

CREATE TABLE campaigns (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Active', 'Inactive', 'Expired voucher')),
    target_group_id BIGINT NOT NULL REFERENCES target_groups(id),
    voucher_id BIGINT UNIQUE NOT NULL REFERENCES vouchers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE OR REPLACE VIEW campaigns_view AS
SELECT
    campaigns.*,
    target_groups.name AS target_group_name,
    vouchers.name AS voucher_name
FROM campaigns
JOIN target_groups ON campaigns.target_group_id = target_groups.id
JOIN vouchers ON campaigns.voucher_id = vouchers.id
WHERE campaigns.is_active = TRUE

INSERT INTO interfaces (name) VALUES
('campaigns');

INSERT INTO permissions (name, interface_id) VALUES
('view', 13),
('create', 13),
('read', 13),
('update', 13),
('delete', 13);