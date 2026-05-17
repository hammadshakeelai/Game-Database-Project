-- Triggers for Data Integrity & Auto-Maintenance
-- Run after milestone4_ddl.sql and 01_insert_data.sql

USE game_tournament_db;

-- ============================================================
-- PLAYER TRIGGERS
-- ============================================================

-- Prevent invalid Elo updates
DELIMITER //

CREATE TRIGGER trg_player_elo_validation BEFORE UPDATE ON player
FOR EACH ROW
BEGIN
    IF NEW.rank_elo < 0 OR NEW.rank_elo > 5000 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Player Elo must be between 0 and 5000';
    END IF;
END //

DELIMITER ;

-- ============================================================
-- GAME TRIGGERS
-- ============================================================

-- Validate game status on insert
DELIMITER //

CREATE TRIGGER trg_game_status_validation BEFORE INSERT ON game
FOR EACH ROW
BEGIN
    IF NEW.status NOT IN ('pending', 'in_progress', 'completed', 'abandoned', 'dispute') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid game status';
    END IF;
END //

DELIMITER ;

-- Prevent null end_time if status is completed
DELIMITER //

CREATE TRIGGER trg_game_completion_check BEFORE UPDATE ON game
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND NEW.end_time IS NULL THEN
        SET NEW.end_time = CURRENT_TIMESTAMP;
    END IF;
END //

DELIMITER ;

-- ============================================================
-- GAME_PLAYER TRIGGERS
-- ============================================================

-- Prevent negative scores
DELIMITER //

CREATE TRIGGER trg_game_player_score_validation BEFORE INSERT ON game_player
FOR EACH ROW
BEGIN
    IF NEW.score < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Game player score cannot be negative';
    END IF;
END //

DELIMITER ;

-- ============================================================
-- TOURNAMENT TRIGGERS
-- ============================================================

-- Validate tournament status
DELIMITER //

CREATE TRIGGER trg_tournament_status_validation BEFORE INSERT ON tournament
FOR EACH ROW
BEGIN
    IF NEW.status NOT IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid tournament status';
    END IF;
    IF NEW.max_participants <= 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tournament must allow at least 2 participants';
    END IF;
    IF NEW.entry_elo_min IS NOT NULL AND NEW.entry_elo_max IS NOT NULL THEN
        IF NEW.entry_elo_min > NEW.entry_elo_max THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Entry Elo min cannot be greater than max';
        END IF;
    END IF;
END //

DELIMITER ;

-- ============================================================
-- PARTICIPANT TRIGGERS
-- ============================================================

-- Validate participant seed
DELIMITER //

CREATE TRIGGER trg_participant_seed_validation BEFORE INSERT ON participant
FOR EACH ROW
BEGIN
    IF NEW.seed IS NOT NULL AND NEW.seed <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Participant seed must be positive';
    END IF;
END //

DELIMITER ;

-- ============================================================
-- FRIENDS TRIGGERS
-- ============================================================

-- Prevent self-friendship on insert
DELIMITER //

CREATE TRIGGER trg_friends_no_self_friendship BEFORE INSERT ON friends
FOR EACH ROW
BEGIN
    IF NEW.PID1 = NEW.PID2 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot create friendship with yourself';
    END IF;
END //

DELIMITER ;

-- Enforce PID1 < PID2 ordering
DELIMITER //

CREATE TRIGGER trg_friends_ordering BEFORE INSERT ON friends
FOR EACH ROW
BEGIN
    DECLARE v_temp VARCHAR(10);
    IF NEW.PID1 > NEW.PID2 THEN
        SET v_temp = NEW.PID1;
        SET NEW.PID1 = NEW.PID2;
        SET NEW.PID2 = v_temp;
    END IF;
END //

DELIMITER ;

-- Validate friendship status
DELIMITER //

CREATE TRIGGER trg_friends_status_validation BEFORE INSERT ON friends
FOR EACH ROW
BEGIN
    IF NEW.status NOT IN ('pending', 'accepted', 'blocked') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid friendship status';
    END IF;
    IF NEW.requested_by != NEW.PID1 AND NEW.requested_by != NEW.PID2 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'requested_by must be one of the friends';
    END IF;
END //

DELIMITER ;

-- ============================================================
-- GAME_HISTORY TRIGGERS
-- ============================================================

-- Validate game history result
DELIMITER //

CREATE TRIGGER trg_game_history_result_validation BEFORE INSERT ON game_history
FOR EACH ROW
BEGIN
    IF NEW.result NOT IN ('win', 'loss', 'draw', 'forfeit', 'bye') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid game result';
    END IF;
END //

DELIMITER ;

-- Validate Elo change bounds
DELIMITER //

CREATE TRIGGER trg_game_history_elo_validation BEFORE INSERT ON game_history
FOR EACH ROW
BEGIN
    IF NEW.elo_change < -200 OR NEW.elo_change > 200 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Elo change seems unrealistic (-200 to +200 typical range)';
    END IF;
    IF NEW.elo_before < 0 OR NEW.elo_before > 5000 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Elo before must be between 0 and 5000';
    END IF;
    IF NEW.elo_after < 0 OR NEW.elo_after > 5000 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Elo after must be between 0 and 5000';
    END IF;
END //

DELIMITER ;

-- ============================================================
-- NOTIFICATION TRIGGERS
-- ============================================================

-- Validate notification type
DELIMITER //

CREATE TRIGGER trg_notification_type_validation BEFORE INSERT ON notification
FOR EACH ROW
BEGIN
    IF NEW.type NOT IN ('friend_request', 'game_result', 'tournament_invite', 'rank_update', 'group_invite', 'message_received', 'system_alert') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid notification type';
    END IF;
END //

DELIMITER ;

-- ============================================================
-- MESSAGE TRIGGERS
-- ============================================================

-- Validate message is_read
DELIMITER //

CREATE TRIGGER trg_message_is_read_validation BEFORE INSERT ON message
FOR EACH ROW
BEGIN
    IF NEW.is_read NOT IN (TRUE, FALSE) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'is_read must be TRUE or FALSE';
    END IF;
END //

DELIMITER ;

-- Auto-update chat last_message_at on new message
DELIMITER //

CREATE TRIGGER trg_update_chat_last_message AFTER INSERT ON message
FOR EACH ROW
BEGIN
    UPDATE chat SET last_message_at = NEW.sent_at WHERE CID = NEW.CID;
END //

DELIMITER ;

-- ============================================================
-- LEADERBOARD TRIGGERS
-- ============================================================

-- Validate leaderboard rank position
DELIMITER //

CREATE TRIGGER trg_leaderboard_rank_validation BEFORE INSERT ON leaderboard
FOR EACH ROW
BEGIN
    IF NEW.rank_position <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rank position must be positive';
    END IF;
    IF NEW.elo_snapshot < 0 OR NEW.elo_snapshot > 5000 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Elo snapshot must be between 0 and 5000';
    END IF;
END //

DELIMITER ;

-- ============================================================
-- GROUP TRIGGERS
-- ============================================================

-- Validate group max_members
DELIMITER //

CREATE TRIGGER trg_group_max_members_validation BEFORE INSERT ON group_t
FOR EACH ROW
BEGIN
    IF NEW.max_members <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group max_members must be positive';
    END IF;
END //

DELIMITER ;

-- ============================================================
-- GROUP_LIST TRIGGERS
-- ============================================================

-- Validate group role
DELIMITER //

CREATE TRIGGER trg_group_list_role_validation BEFORE INSERT ON group_list
FOR EACH ROW
BEGIN
    IF NEW.role NOT IN ('owner', 'admin', 'moderator', 'member') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid group role';
    END IF;
END //

DELIMITER ;

-- Prevent duplicate group membership
DELIMITER //

CREATE TRIGGER trg_group_list_duplicate_prevention BEFORE INSERT ON group_list
FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM group_list WHERE GID = NEW.GID AND PID = NEW.PID) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Player is already a member of this group';
    END IF;
END //

DELIMITER ;
