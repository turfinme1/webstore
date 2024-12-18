-- Migration: AddTypeColumnInLogs
-- Created at: 2024-12-18T11:08:17.256Z

ALTER TABLE logs ADD COLUMN audit_type TEXT NOT NULL DEFAULT 'ASSERT' CHECK (audit_type IN ('ASSERT', 'ASSERT_USER', 'TEMPORARY', 'INFO'));

UPDATE logs SET audit_type = 'ASSERT' WHERE log_level = 'ERROR' AND long_description IS NULL; 
UPDATE logs SET audit_type = 'ASSERT_USER' WHERE log_level = 'ERROR' AND long_description IS NOT NULL; 
UPDATE logs SET audit_type = 'TEMPORARY' WHERE log_level = 'ERROR' AND long_description = 'Request aborted';
UPDATE logs SET audit_type = 'INFO' WHERE log_level = 'INFO';