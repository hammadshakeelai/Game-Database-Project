-- Milestone 5 — Required UPDATE and DELETE Demonstration
-- Run after 01_insert_data.sql.
-- Both statements use WHERE conditions.

USE game_tournament_db;

-- ============================================================
-- UPDATE EXAMPLES — Realistic Workflow Scenarios
-- ============================================================

-- UPDATE 1: Player gains Elo after a verified match result
-- Scenario: Player P001 wins and gains 25 Elo points; update their activity timestamp
UPDATE player
SET
    rank_elo = rank_elo + 25,
    last_active = CURRENT_TIMESTAMP
WHERE PID = 'P001';

-- UPDATE 2: Mark a system notification as read
-- Scenario: Player P002 has viewed a tournament invitation notification
UPDATE notification
SET
    is_read = TRUE
WHERE recipient_PID = 'P002' AND NID = 'N0050' AND is_read = FALSE;

-- UPDATE 3: Change tournament status to 'completed' after finals concluded
-- Scenario: Tournament T001 has finished; update status and record completion time
UPDATE tournament
SET
    status = 'completed'
WHERE TID = 'T001' AND status IN ('in_progress', 'on_hold');

-- UPDATE 4: Archive an old chat conversation by marking as archived
-- Scenario: Players P005 and P010 archive their chat history
UPDATE chat
SET
    is_archived = TRUE,
    last_message_at = CURRENT_TIMESTAMP
WHERE (PID1 = 'P005' AND PID2 = 'P010') OR (PID1 = 'P010' AND PID2 = 'P005');

-- ============================================================
-- DELETE EXAMPLES — Safe Data Removal
-- ============================================================

-- DELETE 1: Remove an old, non-critical notification
-- Scenario: Delete an old rank update notification that is no longer relevant
DELETE FROM notification
WHERE NID = 'N0100' AND type = 'rank_update' AND is_read = TRUE;

-- DELETE 2: Remove archived messages from a very old conversation (safe cascading)
-- Scenario: Player chooses to permanently delete messages from an archived chat
-- Note: Foreign key constraints protect data integrity; only orphaned records are deleted
DELETE FROM message
WHERE CID = 'C0045' AND sent_at < DATE_SUB(CURRENT_DATE, INTERVAL 1 YEAR);

-- DELETE 3: Remove a player who requested to delete their account
-- Scenario: After proper data archival, remove inactive account and associated records
-- Note: CASCADE rules handle dependent records; check FK constraints in DDL
DELETE FROM player
WHERE PID = 'P098' AND is_active = FALSE AND last_active < DATE_SUB(CURRENT_DATE, INTERVAL 2 YEARS);
