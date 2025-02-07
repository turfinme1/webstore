-- Migration: ChangeEmailTemplatesTableToNotifications
-- Created at: 2025-02-03T08:41:42.061Z

ALTER TABLE email_templates RENAME COLUMN type TO name;
ALTER TABLE email_templates ADD COLUMN type TEXT NOT NULL CHECK (type IN ('Notification', 'Email')) DEFAULT 'Email';

ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_type_check;
INSERT INTO email_templates (type, subject, name, placeholders, template, table_border_width, table_border_color) VALUES
('Notification', 'Notification', 'Notification 1 HEllo wrld','["{first_name}", "{last_name}", "{email}", "{phone}"]', 'Hello, {first_name} {last_name}! You have a new notification. Your email is {email} and your phone number is {phone}', NULL, NULL);


ALTER TABLE email_templates 
    ADD CONSTRAINT email_templates_name_unique UNIQUE (name),
    ADD CONSTRAINT email_templates_type_length_check CHECK (length(type) > 3);

ALTER TABLE emails ADD COLUMN IF NOT EXISTS recipient_id BIGINT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS text_content TEXT;
ALTER TABLE emails ADD COLUMN subject TEXT;
ALTER TABLE emails ADD COLUMN type TEXT NOT NULL CHECK (type IN ('Notification', 'Email')) DEFAULT 'Email';
ALTER TABLE emails DROP COLUMN IF EXISTS template_type;
ALTER TABLE emails ALTER COLUMN data_object DROP NOT NULL;

ALTER TABLE emails
DROP CONSTRAINT IF EXISTS emails_status_check;

ALTER TABLE emails
ADD CONSTRAINT emails_status_check CHECK (status IN ('pending', 'sending', 'sent', 'seen', 'failed'));

ALTER TABLE emails
ALTER COLUMN status SET DEFAULT 'pending';

CREATE OR REPLACE FUNCTION check_email_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'pending' AND NEW.status NOT IN ('sending', 'pending') THEN
        RAISE EXCEPTION 'Invalid status transition: pending can only change to sending or pending';
    ELSIF OLD.status = 'sending' AND NEW.status NOT IN ('sent', 'failed', 'pending') THEN
        RAISE EXCEPTION 'Invalid status transition: sending can only change to sent, failed, or pending';
    ELSIF OLD.status = 'sent' AND NEW.status NOT IN ('seen') THEN
        RAISE EXCEPTION 'Invalid status transition: sent can only change to seen';
    ELSIF OLD.status = 'seen' THEN
        RAISE EXCEPTION 'Invalid status transition: seen is a final status';
    ELSIF OLD.status = 'failed' THEN
		RAISE EXCEPTION 'Invalid status transition: failed is a final status';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_email_status_transition
    BEFORE UPDATE OF status ON emails
    FOR EACH ROW
    EXECUTE FUNCTION check_email_status_transition();

COMMENT ON FUNCTION check_email_status_transition() IS 'Enforces valid email status transitions';

INSERT INTO interfaces (name) VALUES ('notifications');
INSERT INTO permissions (name, interface_id) VALUES
('view', 14),
('create', 14),
('read', 14),
('update', 14),
('delete', 14);

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    template_id BIGINT NOT NULL REFERENCES email_templates(id),
    user_ids TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE VIEW notifications_view AS
SELECT notifications.id, notifications.name, template_id, user_ids, notifications.created_at, email_templates.type as template_type
FROM notifications
JOIN email_templates ON notifications.template_id = email_templates.id
WHERE is_active = TRUE;

ALTER TABLE emails ADD COLUMN notification_id BIGINT REFERENCES notifications(id);

DROP VIEW email_templates_view;
CREATE VIEW email_templates_view AS
SELECT *
FROM email_templates;