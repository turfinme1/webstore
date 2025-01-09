-- Migration: AddVoucherUpdateSettingsInAppSettings
-- Created at: 2025-01-09T09:33:26.580Z

ALTER TABLE app_settings ADD COLUMN target_group_status_update_interval INTERVAL NOT NULL DEFAULT '1 minutes';
ALTER TABLE app_settings ADD COLUMN target_group_status_update_initial_time TIME WITH TIME ZONE NOT NULL DEFAULT '14:20:00+02:00';

ALTER TABLE target_groups ADD COLUMN updated_at TIMESTAMPTZ;
