-- Business Analytics Queries — Insights & Reporting
-- Advanced analytical queries for dashboards and reports

USE game_tournament_db;

-- ============================================================
-- 1. PLAYER INSIGHTS
-- ============================================================

-- Player progression over time (Elo growth)
SELECT
    gh.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    MIN(DATE(gh.play_duration_sec)) AS first_game_date,
    MAX(DATE(gh.play_duration_sec)) AS last_game_date,
    COUNT(gh.GAME_ID) AS total_games,
    MIN(gh.elo_before) AS starting_elo,
    MAX(gh.elo_after) AS current_elo,
    MAX(gh.elo_after) - MIN(gh.elo_before) AS elo_improvement,
    ROUND((MAX(gh.elo_after) - MIN(gh.elo_before)) / COUNT(gh.GAME_ID), 2) AS avg_improvement_per_game
FROM game_history gh
JOIN player p ON gh.PID = p.PID
GROUP BY gh.PID, p.first_name, p.last_name
HAVING COUNT(gh.GAME_ID) >= 10
ORDER BY elo_improvement DESC;

-- Player engagement score (composite)
SELECT
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    (SELECT COUNT(*) FROM game_history WHERE PID = p.PID) * 10 AS games_score,
    (SELECT COUNT(*) FROM participant WHERE PID = p.PID) * 25 AS tournament_score,
    (SELECT COUNT(*) FROM friends WHERE (PID1 = p.PID OR PID2 = p.PID) AND status = 'accepted') * 5 AS social_score,
    (SELECT COUNT(*) FROM group_list WHERE PID = p.PID) * 15 AS group_score,
    (SELECT COUNT(*) FROM message WHERE sender_PID = p.PID) * 1 AS chat_score,
    (SELECT COUNT(*) FROM game_history WHERE PID = p.PID) * 10
    + (SELECT COUNT(*) FROM participant WHERE PID = p.PID) * 25
    + (SELECT COUNT(*) FROM friends WHERE (PID1 = p.PID OR PID2 = p.PID) AND status = 'accepted') * 5
    + (SELECT COUNT(*) FROM group_list WHERE PID = p.PID) * 15
    + (SELECT COUNT(*) FROM message WHERE sender_PID = p.PID) * 1 AS total_engagement_score
FROM player p
WHERE p.is_active = TRUE
ORDER BY total_engagement_score DESC;

-- ============================================================
-- 2. TOURNAMENT INSIGHTS
-- ============================================================

-- Tournament competitiveness (Elo spread)
SELECT
    t.TID,
    t.name,
    COUNT(DISTINCT pt.PID) AS participant_count,
    ROUND(AVG(p.rank_elo), 2) AS avg_player_elo,
    MIN(p.rank_elo) AS lowest_elo,
    MAX(p.rank_elo) AS highest_elo,
    MAX(p.rank_elo) - MIN(p.rank_elo) AS elo_spread,
    ROUND(STDDEV(p.rank_elo), 2) AS elo_stddev
FROM tournament t
JOIN participant pt ON t.TID = pt.TID
JOIN player p ON pt.PID = p.PID
GROUP BY t.TID, t.name
ORDER BY elo_spread DESC;

-- Tournament growth over time
SELECT
    DATE(scheduled_at) AS tournament_date,
    COUNT(*) AS tournaments_scheduled,
    SUM(max_participants) AS total_capacity,
    AVG(max_participants) AS avg_size
FROM tournament
WHERE DATE(scheduled_at) >= DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)
GROUP BY DATE(scheduled_at)
ORDER BY tournament_date DESC;

-- ============================================================
-- 3. GAME ANALYTICS
-- ============================================================

-- Game type popularity (absolute and relative)
SELECT
    gt.GT_ID,
    gt.type_name,
    COUNT(g.game_ID) AS games_played,
    ROUND(100.0 * COUNT(g.game_ID) / (SELECT COUNT(*) FROM game WHERE status = 'completed'), 2) AS percentage_of_all_games,
    ROUND(AVG(TIMEDIFF(g.end_time, g.start_time)), 0) AS avg_game_duration_seconds,
    COUNT(DISTINCT g.tournament_ID) AS tournaments_using_type,
    SUM(g.spectator_count) AS total_spectators
FROM game g
JOIN gametype gt ON g.game_type_ID = gt.GT_ID
WHERE g.status = 'completed'
GROUP BY gt.GT_ID, gt.type_name
ORDER BY games_played DESC;

-- Game outcome distribution
SELECT
    CASE
        WHEN TIMEDIFF(g.end_time, g.start_time) < SEC_TO_TIME(300) THEN 'Quick (<5 min)'
        WHEN TIMEDIFF(g.end_time, g.start_time) < SEC_TO_TIME(900) THEN 'Medium (5-15 min)'
        WHEN TIMEDIFF(g.end_time, g.start_time) < SEC_TO_TIME(1800) THEN 'Long (15-30 min)'
        ELSE 'Very Long (>30 min)'
    END AS game_duration_category,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM game WHERE status = 'completed'), 2) AS percentage
FROM game g
WHERE g.status = 'completed'
GROUP BY game_duration_category
ORDER BY CASE
    WHEN game_duration_category = 'Quick (<5 min)' THEN 1
    WHEN game_duration_category = 'Medium (5-15 min)' THEN 2
    WHEN game_duration_category = 'Long (15-30 min)' THEN 3
    ELSE 4
END;

-- ============================================================
-- 4. SOCIAL ANALYTICS
-- ============================================================

-- Most influential players (network size)
SELECT
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    p.rank_elo,
    (SELECT COUNT(*) FROM friends WHERE (PID1 = p.PID OR PID2 = p.PID) AND status = 'accepted') AS friend_count,
    (SELECT COUNT(*) FROM group_list WHERE PID = p.PID) AS group_memberships,
    (SELECT COUNT(DISTINCT GID) FROM group_t WHERE owner_PID = p.PID) AS groups_owned,
    (SELECT COUNT(*) FROM group_list WHERE invited_by = p.PID) AS players_invited
FROM player p
WHERE p.is_active = TRUE
ORDER BY friend_count DESC
LIMIT 20;

-- Group activity level
SELECT
    g.GID,
    g.group_name,
    COUNT(gl.PID) AS current_members,
    g.max_members,
    ROUND(100.0 * COUNT(gl.PID) / g.max_members, 1) AS capacity_percentage,
    COUNT(DISTINCT gl.invited_by) AS inviters,
    SUM(CASE WHEN gl.role IN ('admin', 'moderator') THEN 1 ELSE 0 END) AS admin_moderator_count,
    DATEDIFF(CURRENT_DATE, DATE(g.created_at)) AS days_since_creation
FROM group_t g
LEFT JOIN group_list gl ON g.GID = gl.GID
GROUP BY g.GID, g.group_name, g.max_members, g.created_at
ORDER BY current_members DESC;

-- Friend request acceptance rate
SELECT
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) AS accepted_requests,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_requests,
    COUNT(CASE WHEN status = 'blocked' THEN 1 END) AS blocked_requests,
    ROUND(100.0 * COUNT(CASE WHEN status = 'accepted' THEN 1 END) / COUNT(*), 2) AS acceptance_rate
FROM friends;

-- ============================================================
-- 5. COMMUNICATION ANALYTICS
-- ============================================================

-- Most active chat pairs
SELECT
    CONCAT(p1.first_name, ' ', p1.last_name) AS player_1,
    CONCAT(p2.first_name, ' ', p2.last_name) AS player_2,
    COUNT(m.message_ID) AS message_count,
    SUM(CASE WHEN m.is_read = FALSE THEN 1 ELSE 0 END) AS unread_messages,
    MAX(m.sent_at) AS last_message_time,
    DATEDIFF(CURRENT_DATE, DATE(c.created_at)) AS chat_age_days
FROM chat c
JOIN player p1 ON c.PID1 = p1.PID
JOIN player p2 ON c.PID2 = p2.PID
LEFT JOIN message m ON c.CID = m.CID
GROUP BY c.CID, p1.first_name, p1.last_name, p2.first_name, p2.last_name, c.created_at
HAVING COUNT(m.message_ID) > 0
ORDER BY message_count DESC
LIMIT 20;

-- Message activity by time of day
SELECT
    HOUR(sent_at) AS hour_of_day,
    COUNT(*) AS message_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM message), 2) AS percentage
FROM message
GROUP BY HOUR(sent_at)
ORDER BY hour_of_day;

-- ============================================================
-- 6. RANKING & ELO ANALYTICS
-- ============================================================

-- Elo distribution percentiles
SELECT
    ROUND(PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY rank_elo) OVER (), 0) AS p10,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY rank_elo) OVER (), 0) AS p25,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rank_elo) OVER (), 0) AS p50_median,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY rank_elo) OVER (), 0) AS p75,
    ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY rank_elo) OVER (), 0) AS p90
FROM player
LIMIT 1;

-- Elo volatility (biggest swings per game)
SELECT
    gh.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    MAX(gh.elo_change) AS biggest_win_elo,
    MIN(gh.elo_change) AS biggest_loss_elo,
    MAX(gh.elo_change) + ABS(MIN(gh.elo_change)) AS total_volatility,
    ROUND(STDDEV(gh.elo_change), 2) AS elo_stddev
FROM game_history gh
JOIN player p ON gh.PID = p.PID
GROUP BY gh.PID, p.first_name, p.last_name
HAVING COUNT(*) >= 10
ORDER BY total_volatility DESC;

-- ============================================================
-- 7. SYSTEM HEALTH METRICS
-- ============================================================

-- Data quality score
SELECT
    COUNT(*) AS total_records,
    SUM(CASE WHEN PID IS NULL THEN 1 ELSE 0 END) AS null_pks,
    SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) AS null_emails,
    SUM(CASE WHEN rank_elo < 0 OR rank_elo > 5000 THEN 1 ELSE 0 END) AS invalid_elos,
    ROUND(100.0 * (COUNT(*) - SUM(CASE WHEN PID IS NULL THEN 1 ELSE 0 END) - SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) - SUM(CASE WHEN rank_elo < 0 OR rank_elo > 5000 THEN 1 ELSE 0 END)) / COUNT(*), 2) AS data_quality_percentage
FROM player;

-- Database activity last 7 days
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS new_games,
    SUM(spectator_count) AS total_spectators,
    AVG(spectator_count) AS avg_spectators_per_game
FROM game
WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================
-- 8. PREDICTIVE INSIGHTS
-- ============================================================

-- Win rate vs Elo correlation (for ranking algorithm validation)
SELECT
    CASE
        WHEN p.rank_elo < 1000 THEN 'Beginner'
        WHEN p.rank_elo < 1500 THEN 'Intermediate'
        WHEN p.rank_elo < 2000 THEN 'Advanced'
        ELSE 'Expert'
    END AS elo_tier,
    COUNT(DISTINCT p.PID) AS players,
    ROUND(AVG(p.rank_elo), 0) AS avg_elo,
    COUNT(gh.GAME_ID) AS games_played,
    ROUND(100.0 * SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) / NULLIF(COUNT(gh.GAME_ID), 0), 2) AS win_percentage
FROM player p
LEFT JOIN game_history gh ON p.PID = gh.PID
WHERE p.is_active = TRUE
GROUP BY elo_tier
ORDER BY avg_elo;

-- Player skill progression (trend analysis)
SELECT
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    COUNT(gh.GAME_ID) AS total_games,
    ROUND(AVG(gh.elo_change), 2) AS avg_elo_change_per_game,
    (CASE WHEN AVG(gh.elo_change) > 0 THEN 'Improving' WHEN AVG(gh.elo_change) < 0 THEN 'Declining' ELSE 'Stable' END) AS skill_trend,
    ROUND(STDDEV(gh.elo_change), 2) AS consistency_stddev
FROM player p
LEFT JOIN game_history gh ON p.PID = gh.PID
WHERE p.is_active = TRUE
GROUP BY p.PID, p.first_name, p.last_name
HAVING COUNT(gh.GAME_ID) >= 20
ORDER BY avg_elo_change_per_game DESC;
