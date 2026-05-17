-- Stored Procedures — Business Logic & Common Operations
-- Run after milestone4_ddl.sql and 01_insert_data.sql

USE game_tournament_db;

-- ============================================================
-- PLAYER MANAGEMENT PROCEDURES
-- ============================================================

-- Update player Elo rating after a game
-- Usage: CALL sp_update_player_elo('P001', 25);
DELIMITER //

CREATE PROCEDURE sp_update_player_elo(
    IN p_player_id VARCHAR(10),
    IN p_elo_change INT
)
COMMENT 'Update a player''s Elo rating and last_active timestamp'
BEGIN
    DECLARE v_new_elo INT;

    -- Get current Elo
    SELECT rank_elo INTO v_new_elo FROM player WHERE PID = p_player_id;

    -- Add change
    SET v_new_elo = v_new_elo + p_elo_change;

    -- Clamp to valid range (0-5000)
    IF v_new_elo < 0 THEN
        SET v_new_elo = 0;
    ELSEIF v_new_elo > 5000 THEN
        SET v_new_elo = 5000;
    END IF;

    -- Update player
    UPDATE player
    SET rank_elo = v_new_elo,
        last_active = CURRENT_TIMESTAMP
    WHERE PID = p_player_id;

    SELECT CONCAT('Player ', p_player_id, ' Elo updated to ', v_new_elo) AS result;
END //

DELIMITER ;

-- ============================================================
-- TOURNAMENT MANAGEMENT PROCEDURES
-- ============================================================

-- Create a new tournament
-- Usage: CALL sp_create_tournament('SummerChamp2026', 'SE001', 'GT_3x3', 'P001', 'Trophy + $1000', '2026-06-01 10:00:00', 32, 1200, 2000);
DELIMITER //

CREATE PROCEDURE sp_create_tournament(
    IN p_tournament_name VARCHAR(255),
    IN p_struct_id VARCHAR(10),
    IN p_game_type_id VARCHAR(10),
    IN p_organizer_pid VARCHAR(10),
    IN p_reward TEXT,
    IN p_scheduled_at DATETIME,
    IN p_max_participants INT,
    IN p_entry_elo_min INT,
    IN p_entry_elo_max INT
)
COMMENT 'Create a new tournament instance'
BEGIN
    DECLARE v_tid VARCHAR(10);

    -- Generate tournament ID (simplified; in production use UUID or sequence)
    SET v_tid = CONCAT('T', LPAD((SELECT MAX(CAST(SUBSTR(TID, 2) AS UNSIGNED)) + 1 FROM tournament), 4, '0'));

    -- Create tournament
    INSERT INTO tournament (TID, struct_ID, game_type_ID, organizer_PID, name, reward, scheduled_at, max_participants, entry_elo_min, entry_elo_max, status)
    VALUES (v_tid, p_struct_id, p_game_type_id, p_organizer_pid, p_tournament_name, p_reward, p_scheduled_at, p_max_participants, p_entry_elo_min, p_entry_elo_max, 'scheduled');

    SELECT CONCAT('Tournament ', p_tournament_name, ' created with ID: ', v_tid) AS result;
END //

DELIMITER ;

-- Register a player in a tournament
-- Usage: CALL sp_register_for_tournament('T001', 'P005', 1);
DELIMITER //

CREATE PROCEDURE sp_register_for_tournament(
    IN p_tournament_id VARCHAR(10),
    IN p_player_id VARCHAR(10),
    IN p_seed INT
)
COMMENT 'Register a player for a tournament'
BEGIN
    DECLARE v_max_participants INT;
    DECLARE v_current_participants INT;
    DECLARE v_entry_elo_min INT;
    DECLARE v_entry_elo_max INT;
    DECLARE v_player_elo INT;

    -- Fetch tournament constraints
    SELECT max_participants, entry_elo_min, entry_elo_max
    INTO v_max_participants, v_entry_elo_min, v_entry_elo_max
    FROM tournament
    WHERE TID = p_tournament_id;

    -- Count current participants
    SELECT COUNT(*) INTO v_current_participants FROM participant WHERE TID = p_tournament_id;

    -- Get player Elo
    SELECT rank_elo INTO v_player_elo FROM player WHERE PID = p_player_id;

    -- Validate
    IF v_current_participants >= v_max_participants THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tournament is full';
    END IF;

    IF v_player_elo < IFNULL(v_entry_elo_min, 0) OR v_player_elo > IFNULL(v_entry_elo_max, 5000) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Player Elo does not meet tournament requirements';
    END IF;

    -- Register
    INSERT INTO participant (TID, PID, seed, enrolled_at)
    VALUES (p_tournament_id, p_player_id, p_seed, CURRENT_TIMESTAMP);

    SELECT CONCAT('Player ', p_player_id, ' registered for tournament ', p_tournament_id) AS result;
END //

DELIMITER ;

-- ============================================================
-- GAME MANAGEMENT PROCEDURES
-- ============================================================

-- Record a completed game with result
-- Usage: CALL sp_record_game_result('G001', 'P001', TRUE);
DELIMITER //

CREATE PROCEDURE sp_record_game_result(
    IN p_game_id VARCHAR(10),
    IN p_winner_pid VARCHAR(10),
    IN p_calculate_elo BOOLEAN
)
COMMENT 'Mark a game as completed and optionally update Elo'
BEGIN
    DECLARE v_loser_pid VARCHAR(10);
    DECLARE v_winner_elo INT;
    DECLARE v_loser_elo INT;
    DECLARE v_elo_change INT;

    IF p_calculate_elo THEN
        -- Get players and their Elos
        SELECT gp.PID INTO v_loser_pid FROM game_player gp WHERE gp.game_ID = p_game_id AND gp.PID != p_winner_pid LIMIT 1;

        SELECT rank_elo INTO v_winner_elo FROM player WHERE PID = p_winner_pid;
        SELECT rank_elo INTO v_loser_elo FROM player WHERE PID = v_loser_pid;

        -- Simple Elo calculation (K=32)
        SET v_elo_change = ROUND(32 * (1 - 1 / (1 + POW(10, (v_loser_elo - v_winner_elo) / 400))));

        -- Update Elos
        UPDATE player SET rank_elo = rank_elo + v_elo_change WHERE PID = p_winner_pid;
        UPDATE player SET rank_elo = rank_elo - v_elo_change WHERE PID = v_loser_pid;
    END IF;

    -- Mark game completed
    UPDATE game SET winner_PID = p_winner_pid, status = 'completed', end_time = CURRENT_TIMESTAMP WHERE game_ID = p_game_id;

    SELECT CONCAT('Game ', p_game_id, ' recorded with winner: ', p_winner_pid) AS result;
END //

DELIMITER ;

-- ============================================================
-- FRIEND MANAGEMENT PROCEDURES
-- ============================================================

-- Send friend request
-- Usage: CALL sp_send_friend_request('P001', 'P005');
DELIMITER //

CREATE PROCEDURE sp_send_friend_request(
    IN p_from_pid VARCHAR(10),
    IN p_to_pid VARCHAR(10)
)
COMMENT 'Send a friend request from one player to another'
BEGIN
    DECLARE v_pid1 VARCHAR(10);
    DECLARE v_pid2 VARCHAR(10);

    -- Ensure PID1 < PID2 for consistency
    IF p_from_pid < p_to_pid THEN
        SET v_pid1 = p_from_pid;
        SET v_pid2 = p_to_pid;
    ELSE
        SET v_pid1 = p_to_pid;
        SET v_pid2 = p_from_pid;
    END IF;

    -- Check for self-friendship
    IF v_pid1 = v_pid2 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot send friend request to yourself';
    END IF;

    -- Check if already friends
    IF EXISTS (SELECT 1 FROM friends WHERE (PID1 = v_pid1 AND PID2 = v_pid2)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Friendship already exists';
    END IF;

    -- Insert friend request
    INSERT INTO friends (PID1, PID2, status, requested_by, since)
    VALUES (v_pid1, v_pid2, 'pending', p_from_pid, CURRENT_TIMESTAMP);

    SELECT CONCAT('Friend request sent from ', p_from_pid, ' to ', p_to_pid) AS result;
END //

DELIMITER ;

-- Accept friend request
-- Usage: CALL sp_accept_friend_request('P001', 'P005');
DELIMITER //

CREATE PROCEDURE sp_accept_friend_request(
    IN p_player1 VARCHAR(10),
    IN p_player2 VARCHAR(10)
)
COMMENT 'Accept a pending friend request'
BEGIN
    DECLARE v_pid1 VARCHAR(10);
    DECLARE v_pid2 VARCHAR(10);

    -- Ensure consistent ordering
    IF p_player1 < p_player2 THEN
        SET v_pid1 = p_player1;
        SET v_pid2 = p_player2;
    ELSE
        SET v_pid1 = p_player2;
        SET v_pid2 = p_player1;
    END IF;

    -- Update to accepted
    UPDATE friends SET status = 'accepted' WHERE PID1 = v_pid1 AND PID2 = v_pid2 AND status = 'pending';

    SELECT CONCAT('Friend request between ', p_player1, ' and ', p_player2, ' accepted') AS result;
END //

DELIMITER ;

-- ============================================================
-- NOTIFICATION PROCEDURES
-- ============================================================

-- Create a notification
-- Usage: CALL sp_create_notification('P005', 'friend_request', 'P001', 'P001 sent you a friend request');
DELIMITER //

CREATE PROCEDURE sp_create_notification(
    IN p_recipient_pid VARCHAR(10),
    IN p_type VARCHAR(50),
    IN p_ref_id VARCHAR(100),
    IN p_content TEXT
)
COMMENT 'Create a system notification for a player'
BEGIN
    DECLARE v_nid VARCHAR(10);

    -- Generate notification ID
    SET v_nid = CONCAT('N', LPAD((SELECT MAX(CAST(SUBSTR(NID, 2) AS UNSIGNED)) + 1 FROM notification), 5, '0'));

    INSERT INTO notification (NID, recipient_PID, type, ref_id, content, is_read, created_at)
    VALUES (v_nid, p_recipient_pid, p_type, p_ref_id, p_content, FALSE, CURRENT_TIMESTAMP);

    SELECT CONCAT('Notification created: ', v_nid) AS result;
END //

DELIMITER ;

-- Mark notification as read
-- Usage: CALL sp_mark_notification_read('N0001');
DELIMITER //

CREATE PROCEDURE sp_mark_notification_read(
    IN p_notification_id VARCHAR(10)
)
COMMENT 'Mark a notification as read'
BEGIN
    UPDATE notification SET is_read = TRUE WHERE NID = p_notification_id;
    SELECT CONCAT('Notification ', p_notification_id, ' marked as read') AS result;
END //

DELIMITER ;

-- ============================================================
-- GROUP MANAGEMENT PROCEDURES
-- ============================================================

-- Create a group
-- Usage: CALL sp_create_group('Dragon Slayers', 'P001', 'A group for experienced players', 'https://...', 100, TRUE);
DELIMITER //

CREATE PROCEDURE sp_create_group(
    IN p_group_name VARCHAR(255),
    IN p_owner_pid VARCHAR(10),
    IN p_description TEXT,
    IN p_banner_url VARCHAR(500),
    IN p_max_members INT,
    IN p_is_public BOOLEAN
)
COMMENT 'Create a new player group'
BEGIN
    DECLARE v_gid VARCHAR(10);

    -- Generate group ID
    SET v_gid = CONCAT('G', LPAD((SELECT MAX(CAST(SUBSTR(GID, 2) AS UNSIGNED)) + 1 FROM group_t), 4, '0'));

    -- Create group
    INSERT INTO group_t (GID, group_name, description, owner_PID, banner_url, max_members, is_public, created_at)
    VALUES (v_gid, p_group_name, p_description, p_owner_pid, p_banner_url, p_max_members, p_is_public, CURRENT_TIMESTAMP);

    -- Add owner as member with role 'owner'
    INSERT INTO group_list (GID, PID, role, joined_at)
    VALUES (v_gid, p_owner_pid, 'owner', CURRENT_TIMESTAMP);

    SELECT CONCAT('Group created: ', p_group_name, ' (', v_gid, ')') AS result;
END //

DELIMITER ;

-- Add member to group
-- Usage: CALL sp_add_group_member('G001', 'P005', 'member', 'P001');
DELIMITER //

CREATE PROCEDURE sp_add_group_member(
    IN p_group_id VARCHAR(10),
    IN p_player_id VARCHAR(10),
    IN p_role VARCHAR(50),
    IN p_invited_by VARCHAR(10)
)
COMMENT 'Add a player to a group'
BEGIN
    DECLARE v_member_count INT;
    DECLARE v_max_members INT;

    -- Get group member count and max
    SELECT COUNT(*) INTO v_member_count FROM group_list WHERE GID = p_group_id;
    SELECT max_members INTO v_max_members FROM group_t WHERE GID = p_group_id;

    -- Check capacity
    IF v_member_count >= v_max_members THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group is at capacity';
    END IF;

    -- Add member
    INSERT INTO group_list (GID, PID, role, joined_at, invited_by)
    VALUES (p_group_id, p_player_id, p_role, CURRENT_TIMESTAMP, p_invited_by);

    SELECT CONCAT('Player ', p_player_id, ' added to group ', p_group_id, ' as ', p_role) AS result;
END //

DELIMITER ;

-- ============================================================
-- MAINTENANCE & REPORTING PROCEDURES
-- ============================================================

-- Generate leaderboard snapshot
-- Usage: CALL sp_generate_leaderboard('global');
DELIMITER //

CREATE PROCEDURE sp_generate_leaderboard(
    IN p_scope VARCHAR(50)
)
COMMENT 'Generate current leaderboard snapshot'
BEGIN
    INSERT INTO leaderboard (LID, PID, scope, scope_ref, rank_position, elo_snapshot, recorded_at)
    SELECT
        CONCAT('LB_', p_scope, '_', @rank := @rank + 1),
        PID,
        p_scope,
        NULL,
        @rank,
        rank_elo,
        CURRENT_TIMESTAMP
    FROM player, (SELECT @rank := 0) AS init
    WHERE is_active = TRUE
    ORDER BY rank_elo DESC, created_at ASC
    LIMIT 100;

    SELECT CONCAT('Leaderboard snapshot for scope "', p_scope, '" generated') AS result;
END //

DELIMITER ;

-- Get player statistics
-- Usage: CALL sp_get_player_stats('P001');
DELIMITER //

CREATE PROCEDURE sp_get_player_stats(
    IN p_player_id VARCHAR(10)
)
COMMENT 'Get comprehensive statistics for a player'
BEGIN
    SELECT
        p.PID,
        CONCAT(p.first_name, ' ', p.last_name) AS player_name,
        p.rank_elo,
        p.country,
        COUNT(DISTINCT gh.GAME_ID) AS total_games,
        SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN gh.result = 'loss' THEN 1 ELSE 0 END) AS losses,
        SUM(CASE WHEN gh.result = 'draw' THEN 1 ELSE 0 END) AS draws,
        ROUND(100.0 * SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) / NULLIF(COUNT(gh.GAME_ID), 0), 2) AS win_percentage,
        COUNT(DISTINCT pt.TID) AS tournaments_participated,
        p.created_at,
        p.last_active
    FROM player p
    LEFT JOIN game_history gh ON p.PID = gh.PID
    LEFT JOIN participant pt ON p.PID = pt.PID
    WHERE p.PID = p_player_id
    GROUP BY p.PID, p.first_name, p.last_name, p.rank_elo, p.country, p.created_at, p.last_active;
END //

DELIMITER ;
