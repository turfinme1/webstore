-- Migration: UpdateEmailsTableStatuses
-- Created at: 2025-01-20T16:15:19.413Z

-- CREATE table emails (
--     id BIGSERIAL PRIMARY KEY,
--     template_type TEXT NOT NULL CHECK (template_type IN ('Email verification', 'Order created', 'Order paid', 'Forgot password')),
--     data_object JSONB NOT NULL,
--     attempts INT NOT NULL DEFAULT 0,
--     last_attempt TIMESTAMPTZ NULL,
--     sent_at TIMESTAMPTZ NULL,
--     error_type TEXT,
--     error TEXT,
--     priority INT DEFAULT 5,
--     retry_after TIMESTAMPTZ,
--     processing_started_at TIMESTAMPTZ,
--     lock_id UUID;
--     status TEXT NOT NULL CHECK (status IN ('queued', 'sent')) DEFAULT 'queued',
--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

ALTER TABLE emails 
ADD COLUMN error_type TEXT,
ADD COLUMN error TEXT,
ADD COLUMN priority INT DEFAULT 5,
ADD COLUMN retry_after TIMESTAMPTZ,
ADD COLUMN processing_started_at TIMESTAMPTZ,
ADD COLUMN lock_id UUID;

ALTER TABLE emails
DROP CONSTRAINT IF EXISTS emails_status_check;

ALTER TABLE emails
ADD CONSTRAINT emails_status_check CHECK (status IN ('queued', 'sending', 'sent', 'retry'));