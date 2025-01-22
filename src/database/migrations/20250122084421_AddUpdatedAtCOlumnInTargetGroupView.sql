-- Migration: AddUpdatedAtCOlumnInTargetGroupView
-- Created at: 2025-01-22T08:44:21.357Z

DROP VIEW IF EXISTS target_groups_view;
CREATE OR REPLACE VIEW target_groups_view AS
SELECT
    tg.id,
    tg.name,
    tg.created_at,
    tg.updated_at,
    tg.filters,
    count(utg.user_id) AS user_count
FROM target_groups tg
LEFT JOIN user_target_groups utg ON tg.id = utg.target_group_id
WHERE tg.is_active = TRUE
GROUP BY tg.id;