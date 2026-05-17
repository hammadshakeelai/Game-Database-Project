-- Milestone 5 — Validation Queries
-- Run after:
-- 1. 01_insert_data.sql
-- 2. 02_update_delete_demo.sql
--
-- Required checks:
-- - COUNT(*) for each table
-- - NULL check on key columns
-- - JOIN-based foreign-key integrity check

USE game_tournament_db;

-- 1. COUNT(*) for each table
SELECT 'player' AS table_name, COUNT(*) AS row_count FROM player
UNION ALL SELECT 'gametype', COUNT(*) FROM gametype
UNION ALL SELECT 'structure', COUNT(*) FROM structure
UNION ALL SELECT 'tournament', COUNT(*) FROM tournament
UNION ALL SELECT 'participant', COUNT(*) FROM participant
UNION ALL SELECT 'game', COUNT(*) FROM game
UNION ALL SELECT 'game_player', COUNT(*) FROM game_player
UNION ALL SELECT 'game_move', COUNT(*) FROM game_move
UNION ALL SELECT 'game_history', COUNT(*) FROM game_history
UNION ALL SELECT 'group_t', COUNT(*) FROM group_t
UNION ALL SELECT 'group_list', COUNT(*) FROM group_list
UNION ALL SELECT 'friends', COUNT(*) FROM friends
UNION ALL SELECT 'leaderboard', COUNT(*) FROM leaderboard
UNION ALL SELECT 'notification', COUNT(*) FROM notification
UNION ALL SELECT 'chat', COUNT(*) FROM chat
UNION ALL SELECT 'message', COUNT(*) FROM message;

-- 2. NULL check on primary-key and required foreign-key columns
SELECT 'player' AS table_name, COUNT(*) AS key_null_count FROM player
WHERE PID IS NULL
UNION ALL SELECT 'gametype', COUNT(*) FROM gametype
WHERE GT_ID IS NULL
UNION ALL SELECT 'structure', COUNT(*) FROM structure
WHERE struct_ID IS NULL
UNION ALL SELECT 'tournament', COUNT(*) FROM tournament
WHERE TID IS NULL OR struct_ID IS NULL OR game_type_ID IS NULL OR organizer_PID IS NULL
UNION ALL SELECT 'participant', COUNT(*) FROM participant
WHERE TID IS NULL OR PID IS NULL
UNION ALL SELECT 'game', COUNT(*) FROM game
WHERE game_ID IS NULL OR game_type_ID IS NULL
UNION ALL SELECT 'game_player', COUNT(*) FROM game_player
WHERE game_ID IS NULL OR PID IS NULL
UNION ALL SELECT 'game_move', COUNT(*) FROM game_move
WHERE move_ID IS NULL OR game_ID IS NULL OR actor_PID IS NULL
UNION ALL SELECT 'game_history', COUNT(*) FROM game_history
WHERE PID IS NULL OR GAME_ID IS NULL
UNION ALL SELECT 'group_t', COUNT(*) FROM group_t
WHERE GID IS NULL OR owner_PID IS NULL
UNION ALL SELECT 'group_list', COUNT(*) FROM group_list
WHERE GID IS NULL OR PID IS NULL
UNION ALL SELECT 'friends', COUNT(*) FROM friends
WHERE PID1 IS NULL OR PID2 IS NULL OR requested_by IS NULL
UNION ALL SELECT 'leaderboard', COUNT(*) FROM leaderboard
WHERE LID IS NULL OR PID IS NULL
UNION ALL SELECT 'notification', COUNT(*) FROM notification
WHERE NID IS NULL OR recipient_PID IS NULL
UNION ALL SELECT 'chat', COUNT(*) FROM chat
WHERE CID IS NULL OR PID1 IS NULL OR PID2 IS NULL
UNION ALL SELECT 'message', COUNT(*) FROM message
WHERE message_ID IS NULL OR CID IS NULL OR sender_PID IS NULL;

-- 3. JOIN-based check for foreign-key integrity
SELECT 'tournament.struct_ID -> structure.struct_ID' AS relationship_name, COUNT(*) AS orphan_count
FROM tournament t LEFT JOIN structure s ON t.struct_ID = s.struct_ID
WHERE s.struct_ID IS NULL

UNION ALL SELECT 'tournament.game_type_ID -> gametype.GT_ID', COUNT(*)
FROM tournament t LEFT JOIN gametype gt ON t.game_type_ID = gt.GT_ID
WHERE gt.GT_ID IS NULL

UNION ALL SELECT 'tournament.organizer_PID -> player.PID', COUNT(*)
FROM tournament t LEFT JOIN player p ON t.organizer_PID = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'participant.TID -> tournament.TID', COUNT(*)
FROM participant pt LEFT JOIN tournament t ON pt.TID = t.TID
WHERE t.TID IS NULL

UNION ALL SELECT 'participant.PID -> player.PID', COUNT(*)
FROM participant pt LEFT JOIN player p ON pt.PID = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'game.game_type_ID -> gametype.GT_ID', COUNT(*)
FROM game g LEFT JOIN gametype gt ON g.game_type_ID = gt.GT_ID
WHERE gt.GT_ID IS NULL

UNION ALL SELECT 'game.tournament_ID -> tournament.TID', COUNT(*)
FROM game g LEFT JOIN tournament t ON g.tournament_ID = t.TID
WHERE g.tournament_ID IS NOT NULL AND t.TID IS NULL

UNION ALL SELECT 'game.winner_PID -> player.PID', COUNT(*)
FROM game g LEFT JOIN player p ON g.winner_PID = p.PID
WHERE g.winner_PID IS NOT NULL AND p.PID IS NULL

UNION ALL SELECT 'game_player.game_ID -> game.game_ID', COUNT(*)
FROM game_player gp LEFT JOIN game g ON gp.game_ID = g.game_ID
WHERE g.game_ID IS NULL

UNION ALL SELECT 'game_player.PID -> player.PID', COUNT(*)
FROM game_player gp LEFT JOIN player p ON gp.PID = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'game_move.game_ID -> game.game_ID', COUNT(*)
FROM game_move gm LEFT JOIN game g ON gm.game_ID = g.game_ID
WHERE g.game_ID IS NULL

UNION ALL SELECT 'game_move.actor_PID -> player.PID', COUNT(*)
FROM game_move gm LEFT JOIN player p ON gm.actor_PID = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'game_history.PID -> player.PID', COUNT(*)
FROM game_history gh LEFT JOIN player p ON gh.PID = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'game_history.GAME_ID -> game.game_ID', COUNT(*)
FROM game_history gh LEFT JOIN game g ON gh.GAME_ID = g.game_ID
WHERE g.game_ID IS NULL

UNION ALL SELECT 'group_t.owner_PID -> player.PID', COUNT(*)
FROM group_t gr LEFT JOIN player p ON gr.owner_PID = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'group_list.GID -> group_t.GID', COUNT(*)
FROM group_list gl LEFT JOIN group_t gr ON gl.GID = gr.GID
WHERE gr.GID IS NULL

UNION ALL SELECT 'group_list.PID -> player.PID', COUNT(*)
FROM group_list gl LEFT JOIN player p ON gl.PID = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'group_list.invited_by -> player.PID', COUNT(*)
FROM group_list gl LEFT JOIN player p ON gl.invited_by = p.PID
WHERE gl.invited_by IS NOT NULL AND p.PID IS NULL

UNION ALL SELECT 'friends.PID1 -> player.PID', COUNT(*)
FROM friends f LEFT JOIN player p ON f.PID1 = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'friends.PID2 -> player.PID', COUNT(*)
FROM friends f LEFT JOIN player p ON f.PID2 = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'friends.requested_by -> player.PID', COUNT(*)
FROM friends f LEFT JOIN player p ON f.requested_by = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'leaderboard.PID -> player.PID', COUNT(*)
FROM leaderboard lb LEFT JOIN player p ON lb.PID = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'notification.recipient_PID -> player.PID', COUNT(*)
FROM notification n LEFT JOIN player p ON n.recipient_PID = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'chat.PID1 -> player.PID', COUNT(*)
FROM chat c LEFT JOIN player p ON c.PID1 = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'chat.PID2 -> player.PID', COUNT(*)
FROM chat c LEFT JOIN player p ON c.PID2 = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'message.CID -> chat.CID', COUNT(*)
FROM message m LEFT JOIN chat c ON m.CID = c.CID
WHERE c.CID IS NULL

UNION ALL SELECT 'message.sender_PID -> player.PID', COUNT(*)
FROM message m LEFT JOIN player p ON m.sender_PID = p.PID
WHERE p.PID IS NULL

UNION ALL SELECT 'message.reply_to -> message.message_ID', COUNT(*)
FROM message m LEFT JOIN message parent_msg ON m.reply_to = parent_msg.message_ID
WHERE m.reply_to IS NOT NULL AND parent_msg.message_ID IS NULL;

-- 4. Business-rule quality checks
SELECT 'duplicate_player_email' AS check_name, COUNT(*) AS issue_count
FROM (
    SELECT email
    FROM player
    GROUP BY email
    HAVING COUNT(*) > 1
) dup_emails

UNION ALL SELECT 'player_elo_out_of_range', COUNT(*)
FROM player
WHERE rank_elo NOT BETWEEN 0 AND 5000

UNION ALL SELECT 'tournament_invalid_status', COUNT(*)
FROM tournament
WHERE status NOT IN ('scheduled', 'active', 'completed', 'cancelled')

UNION ALL SELECT 'game_invalid_status', COUNT(*)
FROM game
WHERE status NOT IN ('scheduled', 'in_progress', 'completed', 'abandoned')

UNION ALL SELECT 'friends_self_reference', COUNT(*)
FROM friends
WHERE PID1 = PID2

UNION ALL SELECT 'duplicate_game_seat', COUNT(*)
FROM (
    SELECT game_ID, seat_no
    FROM game_player
    GROUP BY game_ID, seat_no
    HAVING COUNT(*) > 1
) dup_seats;
