-- Milestone 5 — Commented Validation Output
-- This file records the expected output after running:
-- 1. 01_insert_data.sql
-- 2. 02_update_delete_demo.sql
-- 3. 03_validation_queries.sql
--
-- The UPDATE changes player P001's Elo and last_active timestamp.
-- The DELETE removes notification N0100, so notification count is 99.

-- 1. COUNT(*) output
/*
+--------------+-----------+
| table_name   | row_count |
+--------------+-----------+
| player       | 100       |
| gametype     | 50        |
| structure    | 50        |
| tournament   | 60        |
| participant  | 100       |
| game         | 50        |
| game_player  | 100       |
| game_move    | 100       |
| game_history | 100       |
| group_t      | 50        |
| group_list   | 100       |
| friends      | 80        |
| leaderboard  | 100       |
| notification | 99        |
| chat         | 50        |
| message      | 100       |
+--------------+-----------+
*/

-- 2. NULL check output
/*
+--------------+----------------+
| table_name   | key_null_count |
+--------------+----------------+
| player       | 0              |
| gametype     | 0              |
| structure    | 0              |
| tournament   | 0              |
| participant  | 0              |
| game         | 0              |
| game_player  | 0              |
| game_move    | 0              |
| game_history | 0              |
| group_t      | 0              |
| group_list   | 0              |
| friends      | 0              |
| leaderboard  | 0              |
| notification | 0              |
| chat         | 0              |
| message      | 0              |
+--------------+----------------+
*/

-- 3. JOIN-based foreign-key integrity output
/*
+---------------------------------------------+--------------+
| relationship_name                           | orphan_count |
+---------------------------------------------+--------------+
| tournament.struct_ID -> structure.struct_ID | 0            |
| tournament.game_type_ID -> gametype.GT_ID   | 0            |
| tournament.organizer_PID -> player.PID      | 0            |
| participant.TID -> tournament.TID           | 0            |
| participant.PID -> player.PID               | 0            |
| game.game_type_ID -> gametype.GT_ID         | 0            |
| game.tournament_ID -> tournament.TID        | 0            |
| game.winner_PID -> player.PID               | 0            |
| game_player.game_ID -> game.game_ID         | 0            |
| game_player.PID -> player.PID               | 0            |
| game_move.game_ID -> game.game_ID           | 0            |
| game_move.actor_PID -> player.PID           | 0            |
| game_history.PID -> player.PID              | 0            |
| game_history.GAME_ID -> game.game_ID        | 0            |
| group_t.owner_PID -> player.PID             | 0            |
| group_list.GID -> group_t.GID               | 0            |
| group_list.PID -> player.PID                | 0            |
| group_list.invited_by -> player.PID         | 0            |
| friends.PID1 -> player.PID                  | 0            |
| friends.PID2 -> player.PID                  | 0            |
| friends.requested_by -> player.PID          | 0            |
| leaderboard.PID -> player.PID               | 0            |
| notification.recipient_PID -> player.PID    | 0            |
| chat.PID1 -> player.PID                     | 0            |
| chat.PID2 -> player.PID                     | 0            |
| message.CID -> chat.CID                     | 0            |
| message.sender_PID -> player.PID            | 0            |
| message.reply_to -> message.message_ID      | 0            |
+---------------------------------------------+--------------+
*/
