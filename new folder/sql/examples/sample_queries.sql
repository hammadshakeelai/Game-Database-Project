-- Sample Query Library — Common Reports & Analytics
-- Use these queries to understand and report on database data

USE game_tournament_db;

-- ============================================================
-- 1. PLAYER STATISTICS & LEADERBOARD QUERIES
-- ============================================================

-- Top 10 players by Elo rating
SELECT
    PID,
    CONCAT(first_name, ' ', last_name) AS player_name,
    rank_elo,
    country,
    is_active,
    created_at
FROM player
ORDER BY rank_elo DESC
LIMIT 10;

-- Player Elo progression over time (from game_history)
SELECT
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    COUNT(gh.GAME_ID) AS total_games,
    SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN gh.result = 'loss' THEN 1 ELSE 0 END) AS losses,
    SUM(CASE WHEN gh.result = 'draw' THEN 1 ELSE 0 END) AS draws,
    ROUND(AVG(gh.elo_change), 2) AS avg_elo_change,
    MIN(gh.elo_before) AS min_elo_ever,
    MAX(gh.elo_after) AS peak_elo
FROM player p
LEFT JOIN game_history gh ON p.PID = gh.PID
GROUP BY p.PID, p.first_name, p.last_name
ORDER BY total_games DESC;

-- Win rate percentage by player
SELECT
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    COUNT(gh.GAME_ID) AS total_games,
    SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) AS wins,
    ROUND(
        100.0 * SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) / NULLIF(COUNT(gh.GAME_ID), 0),
        2
    ) AS win_percentage
FROM player p
LEFT JOIN game_history gh ON p.PID = gh.PID
WHERE gh.GAME_ID IS NOT NULL
GROUP BY p.PID, p.first_name, p.last_name
HAVING COUNT(gh.GAME_ID) >= 5
ORDER BY win_percentage DESC;

-- Inactive players (no activity in 90 days)
SELECT
    PID,
    CONCAT(first_name, ' ', last_name) AS player_name,
    email,
    last_active,
    DATEDIFF(CURRENT_DATE, DATE(last_active)) AS days_inactive
FROM player
WHERE is_active = TRUE
  AND last_active < DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)
ORDER BY last_active ASC;

-- ============================================================
-- 2. TOURNAMENT QUERIES
-- ============================================================

-- Tournament standings with participant info
SELECT
    t.TID,
    t.name,
    s.format_type AS tournament_format,
    t.status,
    COUNT(pt.PID) AS participant_count,
    t.max_participants,
    t.entry_elo_min,
    t.entry_elo_max,
    t.scheduled_at
FROM tournament t
JOIN structure s ON t.struct_ID = s.struct_ID
LEFT JOIN participant pt ON t.TID = pt.TID
GROUP BY t.TID, t.name, s.format_type, t.status, t.max_participants,
         t.entry_elo_min, t.entry_elo_max, t.scheduled_at
ORDER BY t.scheduled_at DESC;

-- Tournament leaderboard with player rankings
SELECT
    pt.TID,
    pt.final_rank,
    pt.seed,
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    p.rank_elo,
    pt.eliminated,
    pt.prize_awarded
FROM participant pt
JOIN player p ON pt.PID = p.PID
WHERE pt.TID = 'T001'  -- Replace with desired tournament ID
ORDER BY pt.final_rank ASC;

-- Games played in a specific tournament
SELECT
    g.game_ID,
    gt.type_name AS game_type,
    g.status,
    g.start_time,
    g.end_time,
    TIMEDIFF(g.end_time, g.start_time) AS game_duration,
    CONCAT(pw.first_name, ' ', pw.last_name) AS winner_name,
    COUNT(gp.PID) AS player_count
FROM game g
JOIN gametype gt ON g.game_type_ID = gt.GT_ID
LEFT JOIN player pw ON g.winner_PID = pw.PID
LEFT JOIN game_player gp ON g.game_ID = gp.game_ID
WHERE g.tournament_ID = 'T001'  -- Replace with desired tournament ID
GROUP BY g.game_ID, gt.type_name, g.status, g.start_time, g.end_time,
         pw.first_name, pw.last_name
ORDER BY g.start_time DESC;

-- ============================================================
-- 3. GAME & MATCH ANALYSIS
-- ============================================================

-- Player match history with detailed results
SELECT
    g.game_ID,
    g.start_time,
    gt.type_name AS game_type,
    gp.seat_no,
    gp.score,
    gh.result,
    gh.elo_before,
    gh.elo_change,
    gh.elo_after,
    gh.play_duration_sec,
    CONCAT(pw.first_name, ' ', pw.last_name) AS game_winner
FROM game_history gh
JOIN game g ON gh.GAME_ID = g.game_ID
JOIN game_player gp ON g.game_ID = gp.game_ID AND gh.PID = gp.PID
JOIN gametype gt ON g.game_type_ID = gt.GT_ID
LEFT JOIN player pw ON g.winner_PID = pw.PID
WHERE gh.PID = 'P001'  -- Replace with player ID
ORDER BY g.start_time DESC
LIMIT 20;

-- Most played game types
SELECT
    gt.GT_ID,
    gt.type_name,
    COUNT(g.game_ID) AS total_games,
    AVG(TIMEDIFF(g.end_time, g.start_time)) AS avg_game_duration,
    SUM(gt.is_ranked) AS ranked_games,
    COUNT(DISTINCT g.tournament_ID) AS tournaments_using_this_type
FROM game g
JOIN gametype gt ON g.game_type_ID = gt.GT_ID
WHERE g.status = 'completed'
GROUP BY gt.GT_ID, gt.type_name
ORDER BY total_games DESC;

-- Recent games with all participants
SELECT
    g.game_ID,
    g.start_time,
    g.status,
    STRING_AGG(DISTINCT CONCAT(p.first_name, ' ', p.last_name), ', ') AS player_names,
    gt.type_name,
    CONCAT(pw.first_name, ' ', pw.last_name) AS winner
FROM game g
JOIN game_player gp ON g.game_ID = gp.game_ID
JOIN player p ON gp.PID = p.PID
JOIN gametype gt ON g.game_type_ID = gt.GT_ID
LEFT JOIN player pw ON g.winner_PID = pw.PID
GROUP BY g.game_ID, g.start_time, g.status, gt.type_name, pw.first_name, pw.last_name
ORDER BY g.start_time DESC
LIMIT 20;

-- Average game duration by game type
SELECT
    gt.type_name,
    COUNT(g.game_ID) AS total_games,
    SEC_TO_TIME(AVG(TIMESTAMPDIFF(SECOND, g.start_time, g.end_time))) AS avg_duration,
    SEC_TO_TIME(MIN(TIMESTAMPDIFF(SECOND, g.start_time, g.end_time))) AS min_duration,
    SEC_TO_TIME(MAX(TIMESTAMPDIFF(SECOND, g.start_time, g.end_time))) AS max_duration
FROM game g
JOIN gametype gt ON g.game_type_ID = gt.GT_ID
WHERE g.status = 'completed'
GROUP BY gt.type_name
ORDER BY avg_duration DESC;

-- ============================================================
-- 4. SOCIAL FEATURES ANALYSIS
-- ============================================================

-- Most connected players (friend count)
SELECT
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    COUNT(DISTINCT CASE WHEN f.PID1 = p.PID THEN f.PID2 ELSE f.PID1 END) AS friend_count,
    p.rank_elo,
    p.country
FROM player p
LEFT JOIN friends f ON p.PID = f.PID1 OR p.PID = f.PID2
WHERE f.status = 'accepted'
GROUP BY p.PID, p.first_name, p.last_name, p.rank_elo, p.country
HAVING friend_count > 0
ORDER BY friend_count DESC
LIMIT 20;

-- Group membership summary
SELECT
    g.GID,
    g.group_name,
    CONCAT(go.first_name, ' ', go.last_name) AS owner_name,
    COUNT(DISTINCT gl.PID) AS member_count,
    g.max_members,
    g.is_public,
    g.created_at
FROM group_t g
JOIN player go ON g.owner_PID = go.PID
LEFT JOIN group_list gl ON g.GID = gl.GID
GROUP BY g.GID, g.group_name, go.first_name, go.last_name, g.max_members,
         g.is_public, g.created_at
ORDER BY member_count DESC;

-- Group members with roles
SELECT
    g.GID,
    g.group_name,
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS member_name,
    gl.role,
    gl.joined_at,
    CONCAT(pi.first_name, ' ', pi.last_name) AS invited_by_name
FROM group_list gl
JOIN group_t g ON gl.GID = g.GID
JOIN player p ON gl.PID = p.PID
LEFT JOIN player pi ON gl.invited_by = pi.PID
ORDER BY g.group_name, gl.joined_at;

-- Pending friend requests
SELECT
    f.PID1,
    f.PID2,
    CONCAT(p1.first_name, ' ', p1.last_name) AS from_player,
    CONCAT(p2.first_name, ' ', p2.last_name) AS to_player,
    f.requested_by,
    f.since AS requested_at
FROM friends f
JOIN player p1 ON f.PID1 = p1.PID
JOIN player p2 ON f.PID2 = p2.PID
WHERE f.status = 'pending'
ORDER BY f.since ASC;

-- ============================================================
-- 5. CHAT & MESSAGING ANALYSIS
-- ============================================================

-- Most active chats
SELECT
    c.CID,
    CONCAT(p1.first_name, ' ', p1.last_name) AS participant_1,
    CONCAT(p2.first_name, ' ', p2.last_name) AS participant_2,
    COUNT(m.message_ID) AS message_count,
    c.created_at,
    c.last_message_at,
    c.is_archived
FROM chat c
JOIN player p1 ON c.PID1 = p1.PID
JOIN player p2 ON c.PID2 = p2.PID
LEFT JOIN message m ON c.CID = m.CID
GROUP BY c.CID, p1.first_name, p1.last_name, p2.first_name, p2.last_name,
         c.created_at, c.last_message_at, c.is_archived
HAVING message_count > 0
ORDER BY message_count DESC;

-- Chat conversation between two players
SELECT
    m.message_ID,
    m.sent_at,
    CONCAT(p.first_name, ' ', p.last_name) AS sender,
    m.text_content,
    m.media_url,
    m.is_read,
    CASE WHEN m.reply_to IS NOT NULL THEN 'REPLY' ELSE 'NEW' END AS message_type
FROM message m
JOIN player p ON m.sender_PID = p.PID
WHERE m.CID = 'C0001'  -- Replace with desired chat ID
ORDER BY m.sent_at ASC;

-- ============================================================
-- 6. NOTIFICATION & SYSTEM METRICS
-- ============================================================

-- Unread notifications by user
SELECT
    n.recipient_PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    COUNT(CASE WHEN n.is_read = FALSE THEN 1 END) AS unread_count,
    COUNT(n.NID) AS total_notifications
FROM notification n
JOIN player p ON n.recipient_PID = p.PID
GROUP BY n.recipient_PID, p.first_name, p.last_name
HAVING unread_count > 0
ORDER BY unread_count DESC;

-- Notification breakdown by type
SELECT
    type,
    COUNT(NID) AS count,
    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) AS unread,
    SUM(CASE WHEN is_read = TRUE THEN 1 ELSE 0 END) AS read,
    MAX(created_at) AS most_recent
FROM notification
GROUP BY type
ORDER BY count DESC;

-- ============================================================
-- 7. SYSTEM HEALTH & PERFORMANCE METRICS
-- ============================================================

-- Total records per table (data volume)
SELECT
    'player' AS table_name, COUNT(*) AS row_count FROM player
UNION ALL SELECT 'tournament', COUNT(*) FROM tournament
UNION ALL SELECT 'game', COUNT(*) FROM game
UNION ALL SELECT 'participant', COUNT(*) FROM participant
UNION ALL SELECT 'game_player', COUNT(*) FROM game_player
UNION ALL SELECT 'game_move', COUNT(*) FROM game_move
UNION ALL SELECT 'game_history', COUNT(*) FROM game_history
UNION ALL SELECT 'friends', COUNT(*) FROM friends
UNION ALL SELECT 'group_t', COUNT(*) FROM group_t
UNION ALL SELECT 'group_list', COUNT(*) FROM group_list
UNION ALL SELECT 'chat', COUNT(*) FROM chat
UNION ALL SELECT 'message', COUNT(*) FROM message
UNION ALL SELECT 'notification', COUNT(*) FROM notification
UNION ALL SELECT 'leaderboard', COUNT(*) FROM leaderboard
ORDER BY row_count DESC;

-- Database growth over time
SELECT
    DATE(created_at) AS date,
    COUNT(DISTINCT PID) AS new_players,
    COUNT(DISTINCT CASE WHEN DATE(created_at) <= DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY) THEN PID END) AS cumulative_players
FROM player
GROUP BY DATE(created_at)
ORDER BY date ASC;

-- Active player count and engagement
SELECT
    COUNT(DISTINCT PID) AS total_players,
    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active_players,
    SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive_players,
    SUM(CASE WHEN last_active >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS active_last_7_days,
    SUM(CASE WHEN last_active >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS active_last_30_days
FROM player;
