-- Backup & Restore Utilities — Data Management

USE game_tournament_db;

-- ============================================================
-- BACKUP PROCEDURES
-- ============================================================

-- Full database export (use via command line)
-- mysqldump -u root -p game_tournament_db > backup_$(date +%Y%m%d_%H%M%S).sql

-- Export specific tables as CSV (via MySQL)
-- SELECT * INTO OUTFILE '/tmp/player_backup.csv' FIELDS TERMINATED BY ',' FROM player;
-- SELECT * INTO OUTFILE '/tmp/tournament_backup.csv' FIELDS TERMINATED BY ',' FROM tournament;

-- Create backup log table
CREATE TABLE IF NOT EXISTS backup_log (
    backup_id INT AUTO_INCREMENT PRIMARY KEY,
    backup_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    backup_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    row_count INT,
    status VARCHAR(20),
    notes TEXT
);

-- Log a backup operation
DELIMITER //

CREATE PROCEDURE sp_log_backup(
    IN p_backup_type VARCHAR(50),
    IN p_table_name VARCHAR(100),
    IN p_row_count INT,
    IN p_status VARCHAR(20),
    IN p_notes TEXT
)
BEGIN
    INSERT INTO backup_log (backup_type, table_name, row_count, status, notes)
    VALUES (p_backup_type, p_table_name, p_row_count, p_status, p_notes);
END //

DELIMITER ;

-- ============================================================
-- RESTORE PROCEDURES
-- ============================================================

-- Restore from SQL dump (use via command line)
-- mysql -u root -p game_tournament_db < backup_YYYYMMDD_HHMMSS.sql

-- Clear all data while preserving schema (careful!)
DELIMITER //

CREATE PROCEDURE sp_truncate_all_data()
COMMENT 'WARNING: Deletes all data while preserving schema. Backup first!'
BEGIN
    SET FOREIGN_KEY_CHECKS = 0;

    TRUNCATE TABLE message;
    TRUNCATE TABLE chat;
    TRUNCATE TABLE notification;
    TRUNCATE TABLE leaderboard;
    TRUNCATE TABLE friends;
    TRUNCATE TABLE group_list;
    TRUNCATE TABLE group_t;
    TRUNCATE TABLE game_history;
    TRUNCATE TABLE game_move;
    TRUNCATE TABLE game_player;
    TRUNCATE TABLE game;
    TRUNCATE TABLE participant;
    TRUNCATE TABLE tournament;
    TRUNCATE TABLE structure;
    TRUNCATE TABLE gametype;
    TRUNCATE TABLE player;

    SET FOREIGN_KEY_CHECKS = 1;

    SELECT 'All tables truncated' AS result;
END //

DELIMITER ;

-- ============================================================
-- POINT-IN-TIME RECOVERY HELPERS
-- ============================================================

-- Get recent deletions (if using audit tables)
DELIMITER //

CREATE PROCEDURE sp_get_audit_trail(
    IN p_table_name VARCHAR(100),
    IN p_hours_back INT
)
COMMENT 'Show recent changes to a table (requires audit logging)'
BEGIN
    -- Note: This is a template; implement audit tables as needed
    SELECT 'Audit trail not implemented - add audit tables to track changes' AS message;
END //

DELIMITER ;

-- ============================================================
-- DATA VALIDATION FOR RESTORE
-- ============================================================

-- Check referential integrity after restore
DELIMITER //

CREATE PROCEDURE sp_validate_restore()
COMMENT 'Validate data integrity after restore'
BEGIN
    DECLARE v_errors INT DEFAULT 0;

    -- Check for orphan records
    SELECT COUNT(*) INTO v_errors FROM tournament WHERE organizer_PID NOT IN (SELECT PID FROM player);
    IF v_errors > 0 THEN
        SELECT CONCAT('ERROR: ', v_errors, ' tournaments have invalid organizer_PID') AS validation_error;
    END IF;

    SELECT COUNT(*) INTO v_errors FROM participant WHERE TID NOT IN (SELECT TID FROM tournament);
    IF v_errors > 0 THEN
        SELECT CONCAT('ERROR: ', v_errors, ' participants have invalid TID') AS validation_error;
    END IF;

    SELECT COUNT(*) INTO v_errors FROM game WHERE game_type_ID NOT IN (SELECT GT_ID FROM gametype);
    IF v_errors > 0 THEN
        SELECT CONCAT('ERROR: ', v_errors, ' games have invalid game_type_ID') AS validation_error;
    END IF;

    IF v_errors = 0 THEN
        SELECT 'PASS: All referential integrity checks passed' AS validation_result;
    END IF;
END //

DELIMITER ;

-- ============================================================
-- RECOVERY HELPERS
-- ============================================================

-- Show database statistics before/after
DELIMITER //

CREATE PROCEDURE sp_show_database_statistics()
BEGIN
    SELECT
        'player' AS table_name, COUNT(*) AS row_count, ROUND(((data_length + index_length) / 1024), 2) AS size_kb
    FROM information_schema.tables WHERE TABLE_NAME = 'player' AND TABLE_SCHEMA = 'game_tournament_db'
    UNION ALL
    SELECT
        'tournament', COUNT(*), ROUND(((data_length + index_length) / 1024), 2)
    FROM information_schema.tables WHERE TABLE_NAME = 'tournament' AND TABLE_SCHEMA = 'game_tournament_db'
    UNION ALL
    SELECT
        'game', COUNT(*), ROUND(((data_length + index_length) / 1024), 2)
    FROM information_schema.tables WHERE TABLE_NAME = 'game' AND TABLE_SCHEMA = 'game_tournament_db'
    UNION ALL
    SELECT
        'message', COUNT(*), ROUND(((data_length + index_length) / 1024), 2)
    FROM information_schema.tables WHERE TABLE_NAME = 'message' AND TABLE_SCHEMA = 'game_tournament_db';
END //

DELIMITER ;
