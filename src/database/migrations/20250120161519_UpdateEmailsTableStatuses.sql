-- Migration: UpdateEmailsTableStatuses
-- Created at: 2025-01-20T16:15:19.413Z

ALTER TABLE emails 
ADD COLUMN error_type VARCHAR(50),
ADD COLUMN message_id VARCHAR(255),
ADD COLUMN retry_after TIMESTAMPTZ,
ADD COLUMN error TEXT,
ADD COLUMN processing_started_at TIMESTAMPTZ,
ADD COLUMN lock_id UUID;

CREATE TABLE email_error_logs (
    id BIGSERIAL PRIMARY KEY,
    email_id BIGINT REFERENCES emails(id),
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    smtp_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emails_status_attempts ON emails(status, attempts);
CREATE INDEX idx_emails_recipient_created ON emails(recipient, created_at);
CREATE INDEX idx_emails_lock_id ON emails(lock_id) WHERE lock_id IS NOT NULL;