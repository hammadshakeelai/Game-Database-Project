-- Views for Common Reports — Gaming & Tournament Platform
-- Run after milestone4_ddl.sql and 01_insert_data.sql

USE game_tournament_db;

-- ============================================================
-- LEADERBOARD VIEWS
-- ============================================================

-- Global Elo-based leaderboard (top 100 players)
CREATE OR REPLACE VIEW v_global_leaderboard AS
SELECT
    @rank := @rank + 1 AS rank,
    PID,
    CONCAT(first_name, ' ', last_name) AS player_name,
    rank_elo,
    country,
    email,
    is_active,
    created_at
FROM player, (SELECT @rank := 0) AS rank_init
ORDER BY rank_elo DESC, created_at ASC
LIMIT 100;

-- Active players leaderboard (only active accounts)
CREATE OR REPLACE VIEW v_active_players_leaderboard AS
SELECT
    @rank := @rank + 1 AS rank,
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    p.rank_elo,
    p.country,
    COUNT(DISTINCT gh.GAME_ID) AS total_games,
    SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN gh.result = 'loss' THEN 1 ELSE 0 END) AS losses,
    ROUND(100.0 * SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) / NULLIF(COUNT(gh.GAME_ID), 0), 2) AS win_percentage
FROM player p, (SELECT @rank := 0) AS rank_init
LEFT JOIN game_history gh ON p.PID = gh.PID
WHERE p.is_active = TRUE
GROUP BY p.PID, p.first_name, p.last_name, p.rank_elo, p.country
ORDER BY p.rank_elo DESC
LIMIT 100;

-- ============================================================
-- TOURNAMENT VIEWS
-- ============================================================

-- Tournament standings with participants
CREATE OR REPLACE VIEW v_tournament_standings AS
SELECT
    t.TID,
    t.name AS tournament_name,
    s.format_type,
    t.status,
    COUNT(pt.PID) AS participant_count,
    t.max_participants,
    GROUP_CONCAT(
        CONCAT(pt.final_rank, '. ', p.first_name, ' ', p.last_name),
        ' | '
        ORDER BY pt.final_rank
    ) AS standings
FROM tournament t
JOIN structure s ON t.struct_ID = s.struct_ID
LEFT JOIN participant pt ON t.TID = pt.TID
LEFT JOIN player p ON pt.PID = p.PID
GROUP BY t.TID, t.name, s.format_type, t.status, t.max_participants
ORDER BY t.scheduled_at DESC;

-- Upcoming tournaments
CREATE OR REPLACE VIEW v_upcoming_tournaments AS
SELECT
    TID,
    name,
    gt.type_name,
    s.format_type,
    CONCAT(o.first_name, ' ', o.last_name) AS organizer,
    scheduled_at,
    DATEDIFF(scheduled_at, CURRENT_TIMESTAMP) AS days_until_start,
    max_participants,
    (SELECT COUNT(*) FROM participant WHERE TID = t.TID) AS enrolled_players
FROM tournament t
JOIN gametype gt ON t.game_type_ID = gt.GT_ID
JOIN structure s ON t.struct_ID = s.struct_ID
JOIN player o ON t.organizer_PID = o.PID
WHERE t.status IN ('scheduled', 'on_hold')
  AND t.scheduled_at > CURRENT_TIMESTAMP
ORDER BY scheduled_at ASC;

-- Tournament results (completed tournaments)
CREATE OR REPLACE VIEW v_completed_tournaments AS
SELECT
    t.TID,
    t.name,
    gt.type_name,
    s.format_type,
    CONCAT(o.first_name, ' ', o.last_name) AS organizer,
    t.scheduled_at,
    COUNT(DISTINCT pt.PID) AS total_participants,
    COUNT(DISTINCT g.game_ID) AS total_games,
    (SELECT CONCAT(p1.first_name, ' ', p1.last_name)
     FROM participant pt1
     JOIN player p1 ON pt1.PID = p1.PID
     WHERE pt1.TID = t.TID AND pt1.final_rank = 1) AS champion
FROM tournament t
JOIN gametype gt ON t.game_type_ID = gt.GT_ID
JOIN structure s ON t.struct_ID = s.struct_ID
JOIN player o ON t.organizer_PID = o.PID
LEFT JOIN participant pt ON t.TID = pt.TID
LEFT JOIN game g ON t.TID = g.tournament_ID
WHERE t.status = 'completed'
GROUP BY t.TID, t.name, gt.type_name, s.format_type, o.first_name, o.last_name, t.scheduled_at
ORDER BY t.scheduled_at DESC;

-- ============================================================
-- PLAYER STATISTICS VIEWS
-- ============================================================

-- Player match history with details
CREATE OR REPLACE VIEW v_player_match_history AS
SELECT
    gh.PID,
    g.game_ID,
    gt.type_name,
    g.start_time,
    gh.result,
    gp.score,
    gh.elo_before,
    gh.elo_change,
    gh.elo_after,
    CONCAT(pw.first_name, ' ', pw.last_name) AS game_winner
FROM game_history gh
JOIN game g ON gh.GAME_ID = g.game_ID
JOIN game_player gp ON g.game_ID = gp.game_ID AND gh.PID = gp.PID
JOIN gametype gt ON g.game_type_ID = gt.GT_ID
LEFT JOIN player pw ON g.winner_PID = pw.PID;

-- Player head-to-head statistics (vs specific opponent)
CREATE OR REPLACE VIEW v_player_head_to_head AS
SELECT
    gh1.PID AS player_1,
    gh2.PID AS player_2,
    SUM(CASE WHEN gh1.result = 'win' THEN 1 ELSE 0 END) AS player_1_wins,
    SUM(CASE WHEN gh1.result = 'loss' THEN 1 ELSE 0 END) AS player_1_losses,
    SUM(CASE WHEN gh1.result = 'draw' THEN 1 ELSE 0 END) AS draws,
    COUNT(DISTINCT gh1.GAME_ID) AS total_matches
FROM game_history gh1
JOIN game_history gh2 ON gh1.GAME_ID = gh2.GAME_ID
  AND gh1.PID < gh2.PID
GROUP BY gh1.PID, gh2.PID;

-- Win rate by game type per player
CREATE OR REPLACE VIEW v_player_win_rate_by_game AS
SELECT
    gh.PID,
    gt.GT_ID,
    gt.type_name,
    COUNT(gh.GAME_ID) AS games_played,
    SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) AS wins,
    ROUND(
        100.0 * SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) / NULLIF(COUNT(gh.GAME_ID), 0),
        2
    ) AS win_percentage
FROM game_history gh
JOIN game g ON gh.GAME_ID = g.game_ID
JOIN gametype gt ON g.game_type_ID = gt.GT_ID
GROUP BY gh.PID, gt.GT_ID, gt.type_name;

-- ============================================================
-- SOCIAL FEATURE VIEWS
-- ============================================================

-- Player friendships summary
CREATE OR REPLACE VIEW v_player_friends_summary AS
SELECT
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    COUNT(CASE WHEN f.status = 'accepted' THEN 1 END) AS friend_count,
    COUNT(CASE WHEN f.status = 'pending' AND f.requested_by = p.PID THEN 1 END) AS pending_requests_sent,
    COUNT(CASE WHEN f.status = 'pending' AND f.requested_by != p.PID THEN 1 END) AS pending_requests_received,
    COUNT(CASE WHEN f.status = 'blocked' THEN 1 END) AS blocked_players
FROM player p
LEFT JOIN friends f ON (p.PID = f.PID1 OR p.PID = f.PID2)
GROUP BY p.PID, p.first_name, p.last_name;

-- Group membership summary
CREATE OR REPLACE VIEW v_group_membership_summary AS
SELECT
    g.GID,
    g.group_name,
    CONCAT(go.first_name, ' ', go.last_name) AS owner,
    COUNT(gl.PID) AS member_count,
    g.max_members,
    ROUND(100.0 * COUNT(gl.PID) / g.max_members, 1) AS capacity_percentage,
    g.is_public,
    COUNT(CASE WHEN gl.role = 'admin' THEN 1 END) AS admin_count,
    COUNT(CASE WHEN gl.role = 'moderator' THEN 1 END) AS moderator_count
FROM group_t g
JOIN player go ON g.owner_PID = go.PID
LEFT JOIN group_list gl ON g.GID = gl.GID
GROUP BY g.GID, g.group_name, go.first_name, go.last_name, g.max_members, g.is_public;

-- ============================================================
-- CHAT & MESSAGING VIEWS
-- ============================================================

-- Chat conversation summary
CREATE OR REPLACE VIEW v_chat_summary AS
SELECT
    c.CID,
    CONCAT(p1.first_name, ' ', p1.last_name) AS participant_1,
    CONCAT(p2.first_name, ' ', p2.last_name) AS participant_2,
    COUNT(m.message_ID) AS message_count,
    SUM(CASE WHEN m.is_read = FALSE THEN 1 ELSE 0 END) AS unread_count,
    c.created_at,
    c.last_message_at,
    c.is_archived,
    MAX(m.sent_at) AS last_message_time
FROM chat c
JOIN player p1 ON c.PID1 = p1.PID
JOIN player p2 ON c.PID2 = p2.PID
LEFT JOIN message m ON c.CID = m.CID
GROUP BY c.CID, p1.first_name, p1.last_name, p2.first_name, p2.last_name,
         c.created_at, c.last_message_at, c.is_archived;

-- Unread messages per player
CREATE OR REPLACE VIEW v_player_unread_messages AS
SELECT
    m.sender_PID,
    CONCAT(p.first_name, ' ', p.last_name) AS sender,
    (SELECT CONCAT(p2.first_name, ' ', p2.last_name)
     FROM player p2
     WHERE p2.PID = CASE WHEN c.PID1 = m.sender_PID THEN c.PID2 ELSE c.PID1 END) AS recipient,
    CASE WHEN c.PID1 = m.sender_PID THEN c.PID2 ELSE c.PID1 END AS recipient_PID,
    COUNT(m.message_ID) AS unread_count,
    MAX(m.sent_at) AS most_recent_message
FROM message m
JOIN chat c ON m.CID = c.CID
JOIN player p ON m.sender_PID = p.PID
WHERE m.is_read = FALSE
GROUP BY m.sender_PID, p.first_name, p.last_name, recipient_PID;

-- ============================================================
-- NOTIFICATION VIEWS
-- ============================================================

-- Player notification summary
CREATE OR REPLACE VIEW v_player_notifications_summary AS
SELECT
    recipient_PID,
    COUNT(NID) AS total_notifications,
    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) AS unread_notifications,
    COUNT(DISTINCT type) AS notification_types,
    MAX(created_at) AS latest_notification_time
FROM notification
GROUP BY recipient_PID;

-- Pending actions (friend requests, group invites, etc.)
CREATE OR REPLACE VIEW v_pending_actions AS
SELECT
    'Friend Request' AS action_type,
    f.PID2 AS for_player,
    f.PID1 AS from_player,
    CONCAT(p.first_name, ' ', p.last_name) AS from_player_name,
    f.since AS created_at,
    'pending' AS status
FROM friends f
JOIN player p ON f.PID1 = p.PID
WHERE f.status = 'pending' AND f.requested_by = f.PID1
UNION ALL
SELECT
    'Tournament Invitation',
    pt.PID,
    t.organizer_PID,
    CONCAT(p.first_name, ' ', p.last_name),
    t.scheduled_at,
    t.status
FROM participant pt
JOIN tournament t ON pt.TID = t.TID
JOIN player p ON t.organizer_PID = p.PID
WHERE t.status = 'scheduled';

-- ============================================================
-- SYSTEM HEALTH & ANALYTICS VIEWS
-- ============================================================

-- Database statistics summary
CREATE OR REPLACE VIEW v_database_statistics AS
SELECT
    'Total Players' AS metric,
    COUNT(*) AS count
FROM player
UNION ALL
SELECT 'Active Players', COUNT(*) FROM player WHERE is_active = TRUE
UNION ALL
SELECT 'Total Tournaments', COUNT(*) FROM tournament
UNION ALL
SELECT 'Completed Tournaments', COUNT(*) FROM tournament WHERE status = 'completed'
UNION ALL
SELECT 'Total Games Played', COUNT(*) FROM game WHERE status = 'completed'
UNION ALL
SELECT 'Total Messages', COUNT(*) FROM message
UNION ALL
SELECT 'Unread Messages', COUNT(*) FROM message WHERE is_read = FALSE
UNION ALL
SELECT 'Total Groups', COUNT(*) FROM group_t
UNION ALL
SELECT 'Friend Connections', COUNT(*) FROM friends WHERE status = 'accepted';

-- Elo distribution
CREATE OR REPLACE VIEW v_elo_distribution AS
SELECT
    CASE
        WHEN rank_elo < 1000 THEN 'Beginner (<1000)'
        WHEN rank_elo < 1500 THEN 'Intermediate (1000-1499)'
        WHEN rank_elo < 2000 THEN 'Advanced (1500-1999)'
        WHEN rank_elo < 2500 THEN 'Expert (2000-2499)'
        ELSE 'Master (2500+)'
    END AS elo_tier,
    COUNT(*) AS player_count,
    AVG(rank_elo) AS avg_elo,
    MIN(rank_elo) AS min_elo,
    MAX(rank_elo) AS max_elo
FROM player
GROUP BY elo_tier
ORDER BY MIN(rank_elo);

-- Recent activity dashboard
CREATE OR REPLACE VIEW v_recent_activity_dashboard AS
SELECT
    'Games Played Today' AS activity_type,
    COUNT(*) AS count,
    MAX(end_time) AS last_activity
FROM game
WHERE DATE(end_time) = CURRENT_DATE AND status = 'completed'
UNION ALL
SELECT 'Messages Sent Today', COUNT(*), MAX(sent_at) FROM message WHERE DATE(sent_at) = CURRENT_DATE
UNION ALL
SELECT 'New Players Today', COUNT(*), MAX(created_at) FROM player WHERE DATE(created_at) = CURRENT_DATE
UNION ALL
SELECT 'Tournaments Started Today', COUNT(*), MAX(scheduled_at) FROM tournament WHERE DATE(scheduled_at) = CURRENT_DATE AND status IN ('in_progress', 'completed');
