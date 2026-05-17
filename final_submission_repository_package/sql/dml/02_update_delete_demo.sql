-- Milestone 5 — Required UPDATE and DELETE Demonstration
-- Run after 01_insert_data.sql.
-- Both statements use WHERE conditions.

USE game_tournament_db;

-- UPDATE example:
-- Marks the latest unread notification as read for a player.
-- If no unread notification exists, this safely affects 0 rows.
UPDATE notification n
JOIN (
    SELECT NID
    FROM notification
    WHERE recipient_PID = 'P001'
      AND is_read = FALSE
    ORDER BY created_at DESC
    LIMIT 1
) target ON target.NID = n.NID
SET n.is_read = TRUE;

-- DELETE example:
-- Removes one already-read notification for archive cleanup.
-- Derived-table nesting is used to avoid target-table restrictions in MySQL deletes.
DELETE FROM notification
WHERE NID = (
    SELECT target.NID
    FROM (
        SELECT NID
        FROM notification
        WHERE recipient_PID = 'P001'
          AND is_read = TRUE
        ORDER BY created_at ASC
        LIMIT 1
    ) target
);
