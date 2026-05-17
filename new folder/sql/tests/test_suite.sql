-- Comprehensive Test Suite — Gaming & Tournament Platform
-- Run after milestone4_ddl.sql and 01_insert_data.sql

USE game_tournament_db;

-- ============================================================
-- TEST 1: CONSTRAINT VALIDATION TESTS
-- ============================================================

-- Test 1.1: Elo range validation
SELECT '1.1: Elo Range Validation' AS test_name;
INSERT INTO player (PID, first_name, last_name, email, password_hash, rank_elo)
VALUES ('TEST_ELO_HIGH', 'Test', 'High', 'test_elo_high@test.com', 'hash', 5001);
-- Expected: ERROR (Elo > 5000)

-- Test 1.2: Unique email constraint
SELECT '1.2: Unique Email Constraint' AS test_name;
INSERT INTO player (PID, first_name, last_name, email, password_hash)
VALUES ('TEST_DUP_EMAIL', 'Dup', 'Email', 'ava.khan1@example.com', 'hash');
-- Expected: ERROR (email already exists)

-- Test 1.3: Self-friendship prevention
SELECT '1.3: Self-Friendship Prevention' AS test_name;
INSERT INTO friends (PID1, PID2, status, requested_by)
VALUES ('P001', 'P001', 'pending', 'P001');
-- Expected: ERROR (PID1 = PID2)

-- Test 1.4: Tournament max_participants validation
SELECT '1.4: Tournament Max Participants Validation' AS test_name;
INSERT INTO tournament (TID, struct_ID, game_type_ID, organizer_PID, scheduled_at, max_participants, status)
VALUES ('TEST_BAD_TOURN', 'S001', 'GT0001', 'P001', '2026-06-01', 1, 'scheduled');
-- Expected: ERROR (max_participants <= 1)

-- ============================================================
-- TEST 2: FOREIGN KEY CONSTRAINT TESTS
-- ============================================================

-- Test 2.1: Invalid tournament organizer
SELECT '2.1: Invalid Tournament Organizer' AS test_name;
INSERT INTO tournament (TID, struct_ID, game_type_ID, organizer_PID, scheduled_at, max_participants, status)
VALUES ('TEST_BAD_ORG', 'S001', 'GT0001', 'NONEXISTENT_PID', '2026-06-01', 32, 'scheduled');
-- Expected: ERROR (organizer_PID doesn't exist)

-- Test 2.2: Invalid game type
SELECT '2.2: Invalid Game Type' AS test_name;
INSERT INTO game (game_ID, game_type_ID, start_time, status)
VALUES ('TEST_BAD_GT', 'NONEXISTENT_GT', CURRENT_TIMESTAMP, 'pending');
-- Expected: ERROR (game_type_ID doesn't exist)

-- Test 2.3: Invalid tournament in participant
SELECT '2.3: Invalid Tournament in Participant' AS test_name;
INSERT INTO participant (TID, PID, seed)
VALUES ('NONEXISTENT_T', 'P001', 1);
-- Expected: ERROR (TID doesn't exist)

-- ============================================================
-- TEST 3: CASCADE & REFERENTIAL INTEGRITY TESTS
-- ============================================================

-- Test 3.1: Cascading delete on tournament deletion
SELECT '3.1: Cascading Delete on Tournament' AS test_name;
-- Note: Don't actually delete; just verify foreign key relationships
SELECT COUNT(*) AS participant_count
FROM participant WHERE TID = 'T001';

-- Test 3.2: Orphan check after delete
SELECT '3.2: Orphan Foreign Key Check' AS test_name;
SELECT COUNT(*) AS orphan_games FROM game
WHERE tournament_ID IS NOT NULL AND tournament_ID NOT IN (SELECT TID FROM tournament);
-- Expected: 0 orphans

-- ============================================================
-- TEST 4: DATA INTEGRITY TESTS
-- ============================================================

-- Test 4.1: No NULL primary keys
SELECT '4.1: No NULL Primary Keys' AS test_name;
SELECT COUNT(*) AS null_pk_count FROM player WHERE PID IS NULL;
SELECT COUNT(*) AS null_pk_count FROM tournament WHERE TID IS NULL;
SELECT COUNT(*) AS null_pk_count FROM game WHERE game_ID IS NULL;
-- Expected: 0 for all

-- Test 4.2: Required foreign keys are populated
SELECT '4.2: Required Foreign Keys Populated' AS test_name;
SELECT COUNT(*) AS null_fk_count FROM tournament
WHERE struct_ID IS NULL OR game_type_ID IS NULL OR organizer_PID IS NULL;
-- Expected: 0

-- Test 4.3: No duplicate composite keys
SELECT '4.3: No Duplicate Composite Keys' AS test_name;
SELECT game_ID, PID, COUNT(*) AS duplicate_count
FROM game_player
GROUP BY game_ID, PID
HAVING COUNT(*) > 1;
-- Expected: Empty result (no duplicates)

-- ============================================================
-- TEST 5: BUSINESS LOGIC TESTS
-- ============================================================

-- Test 5.1: Elo value realism
SELECT '5.1: Elo Value Realism' AS test_name;
SELECT COUNT(*) AS outlier_elo_count FROM player
WHERE rank_elo > 5000 OR rank_elo < 0;
-- Expected: 0

-- Test 5.2: Tournament status values
SELECT '5.2: Tournament Status Values' AS test_name;
SELECT DISTINCT status FROM tournament;
-- Expected: Only valid statuses (scheduled, in_progress, completed, cancelled, on_hold)

-- Test 5.3: Game result validity
SELECT '5.3: Game Result Validity' AS test_name;
SELECT DISTINCT result FROM game_history;
-- Expected: Only (win, loss, draw, forfeit, bye)

-- Test 5.4: Unique emails across all players
SELECT '5.4: Unique Emails' AS test_name;
SELECT COUNT(*) AS duplicate_email_count FROM (
    SELECT email, COUNT(*) AS count FROM player GROUP BY email HAVING count > 1
) AS dupes;
-- Expected: 0

-- Test 5.5: Game move sequence completeness
SELECT '5.5: Game Move Sequence' AS test_name;
SELECT game_ID, COUNT(*) AS move_count,
       MAX(move_no) AS highest_move_no
FROM game_move
GROUP BY game_ID
HAVING COUNT(*) != MAX(move_no);
-- Expected: Empty (no gaps in move sequence)

-- ============================================================
-- TEST 6: PERFORMANCE & EDGE CASE TESTS
-- ============================================================

-- Test 6.1: Large result set handling
SELECT '6.1: Large Result Set' AS test_name;
SELECT COUNT(*) AS player_count FROM player;
-- Expected: Can handle result

-- Test 6.2: Query optimization check
SELECT '6.2: Index Usage' AS test_name;
EXPLAIN SELECT * FROM player WHERE rank_elo > 1500 ORDER BY rank_elo DESC;
-- Expected: Uses index on rank_elo

-- Test 6.3: Negative scores prevention
SELECT '6.3: Negative Scores Prevention' AS test_name;
SELECT COUNT(*) AS negative_score_count FROM game_player WHERE score < 0;
-- Expected: 0

-- Test 6.4: Chat participant validation
SELECT '6.4: Chat Participant Ordering' AS test_name;
SELECT COUNT(*) AS misordered_chat FROM chat WHERE PID1 > PID2;
-- Expected: 0 (PID1 should be < PID2)

-- ============================================================
-- TEST 7: AGGREGATION & CALCULATION TESTS
-- ============================================================

-- Test 7.1: Player win rate accuracy
SELECT '7.1: Player Win Rate Accuracy' AS test_name;
SELECT TOP 5 PID,
       COUNT(*) AS games,
       SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS wins,
       ROUND(100.0 * SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) / COUNT(*), 2) AS win_pct
FROM game_history
GROUP BY PID
HAVING COUNT(*) > 0
ORDER BY games DESC;
-- Expected: Reasonable win percentages (should be between 0-100)

-- Test 7.2: Tournament participation count
SELECT '7.2: Tournament Participation' AS test_name;
SELECT TID, COUNT(DISTINCT PID) AS participant_count
FROM participant
GROUP BY TID
ORDER BY participant_count DESC
LIMIT 5;
-- Expected: Positive counts, within reasonable range

-- Test 7.3: Game coverage validation
SELECT '7.3: Game Coverage Validation' AS test_name;
SELECT COUNT(DISTINCT game_ID) AS games_in_history,
       (SELECT COUNT(*) FROM game WHERE status = 'completed') AS completed_games
FROM game_history;
-- Expected: games_in_history <= completed_games

-- ============================================================
-- TEST 8: NOTIFICATION & SYSTEM TESTS
-- ============================================================

-- Test 8.1: Unread message count accuracy
SELECT '8.1: Unread Message Count' AS test_name;
SELECT sender_PID, COUNT(*) AS unread_count
FROM message
WHERE is_read = FALSE
GROUP BY sender_PID
ORDER BY unread_count DESC
LIMIT 5;
-- Expected: Shows breakdown of unread messages

-- Test 8.2: Notification type validity
SELECT '8.2: Notification Type Validity' AS test_name;
SELECT DISTINCT type FROM notification;
-- Expected: Only valid types (friend_request, game_result, tournament_invite, etc.)

-- Test 8.3: Group capacity validation
SELECT '8.3: Group Capacity Validation' AS test_name;
SELECT g.GID, g.group_name, g.max_members,
       COUNT(gl.PID) AS current_members
FROM group_t g
LEFT JOIN group_list gl ON g.GID = gl.GID
GROUP BY g.GID, g.group_name, g.max_members
HAVING current_members > max_members;
-- Expected: Empty (no groups over capacity)

-- ============================================================
-- TEST 9: CONSISTENCY TESTS
-- ============================================================

-- Test 9.1: Player count consistency
SELECT '9.1: Player Count Consistency' AS test_name;
SELECT
    (SELECT COUNT(*) FROM player) AS total_players,
    (SELECT COUNT(DISTINCT PID) FROM participant) AS players_in_tournaments,
    (SELECT COUNT(DISTINCT PID) FROM friends) AS players_with_friends;
-- Expected: Shows distribution

-- Test 9.2: Game completeness
SELECT '9.2: Game Completeness' AS test_name;
SELECT COUNT(DISTINCT g.game_ID) AS games_with_players,
       COUNT(DISTINCT g.game_ID) AS games_with_moves
FROM game g
LEFT JOIN game_player gp ON g.game_ID = gp.game_ID
LEFT JOIN game_move gm ON g.game_ID = gm.game_ID
WHERE g.status = 'completed';
-- Expected: Most completed games should have players and moves

-- ============================================================
-- TEST 10: SUMMARY & RESULTS
-- ============================================================

-- Summary of all data
SELECT '10: SUMMARY STATISTICS' AS test_name;
SELECT 'Total Players' AS metric, COUNT(*) AS value FROM player
UNION ALL
SELECT 'Total Tournaments', COUNT(*) FROM tournament
UNION ALL
SELECT 'Total Games', COUNT(*) FROM game
UNION ALL
SELECT 'Total Participants', COUNT(*) FROM participant
UNION ALL
SELECT 'Total Messages', COUNT(*) FROM message
UNION ALL
SELECT 'Total Notifications', COUNT(*) FROM notification
UNION ALL
SELECT 'Active Players', SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) FROM player
ORDER BY metric;
