-- Migration: AddCreatedAtColumnInUsers
-- Created at: 2025-01-06T20:07:37.575Z

ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE users SET created_at = NOW() - (random() * (NOW() - '2020-01-01'::TIMESTAMPTZ));
