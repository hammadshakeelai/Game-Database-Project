-- Milestone 5 — Required UPDATE and DELETE Demonstration
-- Run after 01_insert_data.sql.
-- Both statements use WHERE conditions.

USE game_tournament_db;

-- UPDATE example:
-- Simulates a player gaining Elo after a verified match result.
UPDATE player
SET
    rank_elo = rank_elo + 25,
    last_active = CURRENT_TIMESTAMP
WHERE PID = 'P001';

-- DELETE example:
-- Removes one old notification record without affecting parent/child dependencies.
DELETE FROM notification
WHERE NID = 'N0100';
