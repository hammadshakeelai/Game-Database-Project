-- Milestone 5 — Optional LOAD DATA LOCAL INFILE Version
-- Use this only if your MySQL Workbench connection allows LOCAL INFILE.
-- The INSERT script is included as the main submission because it runs without changing file-path settings.
--
-- Before running this file:
-- 1. Run the Milestone 4 DDL script.
-- 2. Enable local infile if needed:
--    SET GLOBAL local_infile = 1;
-- 3. Replace the file paths below with absolute paths on your machine.

USE game_tournament_db;

-- Example:
-- LOAD DATA LOCAL INFILE '/absolute/path/to/csv/player.csv'
-- INTO TABLE player
-- FIELDS TERMINATED BY ',' ENCLOSED BY '"'
-- LINES TERMINATED BY '\n'
-- IGNORE 1 LINES
-- (PID, first_name, last_name, email, password_hash, rank_elo, country, avatar_url, last_active, created_at, @is_active)
-- SET is_active = (@is_active = 'TRUE');

-- This package uses 01_insert_data.sql as the ready-to-run DML file.
