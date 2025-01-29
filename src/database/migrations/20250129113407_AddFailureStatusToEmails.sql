-- Migration: AddFailureStatusToEmails
-- Created at: 2025-01-29T11:34:07.976Z

ALTER TABLE emails
DROP CONSTRAINT IF EXISTS emails_status_check;

ALTER TABLE emails
ADD CONSTRAINT emails_status_check CHECK (status IN ('queued', 'sending', 'sent', 'retry', 'failed'));