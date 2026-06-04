-- ================================================================
-- GAME TOURNAMENT PLATFORM — MASTER VIVA SCRIPT
-- ================================================================
-- Sections (run top to bottom in Workbench):
--
--   1.  Database
--   2.  Drop tables       (reverse FK order)
--   3.  Create tables     (16 tables)
--   4.  Indexes
--   5.  Load data         (LOAD DATA INFILE from Uploads folder)
--   6.  Triggers          (16 triggers — data integrity)
--   7.  Views             (12 views — reports & analytics)
--   8.  Stored Procedures (11 procedures — business logic)
--   9.  UPDATE / DELETE demo
--   10. Validation queries (row counts, NULL checks, FK integrity)
--   11. Sample queries    (player, tournament, game, social, chat)
--   12. Business analytics (advanced reporting)
--
-- Before running Section 5:
--   Copy all CSVs from
--     milestone 5/milestone5_data_population_dml/csv/
--   into
--     C:\ProgramData\MySQL\MySQL Server 8.0\Uploads\
-- ================================================================

-- ================================================================
-- SECTION 1 — DATABASE
-- ================================================================

CREATE DATABASE IF NOT EXISTS game_tournament_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE game_tournament_db;

-- ================================================================
-- SECTION 2 — DROP TABLES (reverse dependency order)
-- ================================================================

DROP TABLE IF EXISTS message;
DROP TABLE IF EXISTS chat;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS leaderboard;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS group_list;
DROP TABLE IF EXISTS group_t;
DROP TABLE IF EXISTS game_history;
DROP TABLE IF EXISTS game_move;
DROP TABLE IF EXISTS game_player;
DROP TABLE IF EXISTS game;
DROP TABLE IF EXISTS participant;
DROP TABLE IF EXISTS tournament;
DROP TABLE IF EXISTS structure;
DROP TABLE IF EXISTS gametype;
DROP TABLE IF EXISTS player;

-- ================================================================
-- SECTION 3 — CREATE TABLES
-- ================================================================

CREATE TABLE player (
    PID             VARCHAR(10)  NOT NULL,
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    rank_elo        INT          NOT NULL DEFAULT 1200,
    country         VARCHAR(80),
    avatar_url      VARCHAR(500),
    last_active     DATETIME,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_player PRIMARY KEY (PID),
    CONSTRAINT uq_player_email UNIQUE (email),
    CONSTRAINT chk_player_rank_elo CHECK (rank_elo BETWEEN 0 AND 5000)
);

CREATE TABLE gametype (
    GT_ID            VARCHAR(10)  NOT NULL,
    type_name        VARCHAR(100) NOT NULL,
    description      TEXT,
    max_duration_sec INT          NOT NULL,
    is_ranked        BOOLEAN      NOT NULL DEFAULT FALSE,
    board_size       VARCHAR(20)  NOT NULL,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_gametype PRIMARY KEY (GT_ID),
    CONSTRAINT uq_gametype_type_name UNIQUE (type_name),
    CONSTRAINT chk_gametype_duration CHECK (max_duration_sec > 0)
);

CREATE TABLE structure (
    struct_ID       VARCHAR(10)  NOT NULL,
    format_type     VARCHAR(50)  NOT NULL,
    details         TEXT,
    rounds          INT          NOT NULL,
    seeding_method  VARCHAR(50)  NOT NULL,

    CONSTRAINT pk_structure PRIMARY KEY (struct_ID),
    CONSTRAINT chk_structure_rounds CHECK (rounds > 0),
    CONSTRAINT chk_structure_format CHECK (
        format_type IN (
            'single_elimination', 'double_elimination',
            'round_robin', 'swiss', 'league', 'ladder'
        )
    ),
    CONSTRAINT chk_structure_seeding CHECK (
        seeding_method IN ('random', 'elo_based', 'manual', 'regional', 'balanced')
    )
);

CREATE TABLE tournament (
    TID               VARCHAR(10)  NOT NULL,
    struct_ID         VARCHAR(10)  NOT NULL,
    game_type_ID      VARCHAR(10)  NOT NULL,
    organizer_PID     VARCHAR(10)  NOT NULL,
    name              VARCHAR(150) NOT NULL,
    reward            VARCHAR(150),
    scheduled_at      DATETIME     NOT NULL,
    max_participants  INT          NOT NULL,
    entry_elo_min     INT          NOT NULL DEFAULT 0,
    entry_elo_max     INT          NOT NULL DEFAULT 5000,
    status            VARCHAR(30)  NOT NULL DEFAULT 'scheduled',

    CONSTRAINT pk_tournament PRIMARY KEY (TID),
    CONSTRAINT fk_tournament_structure
        FOREIGN KEY (struct_ID) REFERENCES structure(struct_ID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_tournament_gametype
        FOREIGN KEY (game_type_ID) REFERENCES gametype(GT_ID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_tournament_organizer
        FOREIGN KEY (organizer_PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_tournament_max_participants CHECK (max_participants > 1),
    CONSTRAINT chk_tournament_elo_range CHECK (
        entry_elo_min >= 0
        AND entry_elo_max >= entry_elo_min
        AND entry_elo_max <= 5000
    ),
    CONSTRAINT chk_tournament_status CHECK (
        status IN ('scheduled', 'active', 'completed', 'cancelled')
    )
);

CREATE TABLE participant (
    TID            VARCHAR(10) NOT NULL,
    PID            VARCHAR(10) NOT NULL,
    seed           INT,
    enrolled_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminated     BOOLEAN     NOT NULL DEFAULT FALSE,
    final_rank     INT,
    prize_awarded  VARCHAR(150),

    CONSTRAINT pk_participant PRIMARY KEY (TID, PID),
    CONSTRAINT fk_participant_tournament
        FOREIGN KEY (TID) REFERENCES tournament(TID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_participant_player
        FOREIGN KEY (PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_participant_seed CHECK (seed IS NULL OR seed > 0),
    CONSTRAINT chk_participant_final_rank CHECK (final_rank IS NULL OR final_rank > 0)
);

CREATE TABLE game (
    game_ID          VARCHAR(10) NOT NULL,
    game_type_ID     VARCHAR(10) NOT NULL,
    tournament_ID    VARCHAR(10),
    winner_PID       VARCHAR(10),
    arena            VARCHAR(100),
    start_time       DATETIME    NOT NULL,
    end_time         DATETIME,
    status           VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    spectator_count  INT         NOT NULL DEFAULT 0,

    CONSTRAINT pk_game PRIMARY KEY (game_ID),
    CONSTRAINT fk_game_gametype
        FOREIGN KEY (game_type_ID) REFERENCES gametype(GT_ID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_game_tournament
        FOREIGN KEY (tournament_ID) REFERENCES tournament(TID)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_game_winner
        FOREIGN KEY (winner_PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_game_status CHECK (
        status IN ('scheduled', 'in_progress', 'completed', 'abandoned')
    ),
    CONSTRAINT chk_game_spectator_count CHECK (spectator_count >= 0),
    CONSTRAINT chk_game_time_order CHECK (end_time IS NULL OR end_time >= start_time)
);

CREATE TABLE game_player (
    game_ID  VARCHAR(10) NOT NULL,
    PID      VARCHAR(10) NOT NULL,
    seat_no  INT         NOT NULL,
    score    INT         NOT NULL DEFAULT 0,

    CONSTRAINT pk_game_player PRIMARY KEY (game_ID, PID),
    CONSTRAINT fk_game_player_game
        FOREIGN KEY (game_ID) REFERENCES game(game_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_game_player_player
        FOREIGN KEY (PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_game_player_seat UNIQUE (game_ID, seat_no),
    CONSTRAINT chk_game_player_seat CHECK (seat_no > 0),
    CONSTRAINT chk_game_player_score CHECK (score >= 0)
);

CREATE TABLE game_move (
    move_ID        VARCHAR(12)  NOT NULL,
    game_ID        VARCHAR(10)  NOT NULL,
    actor_PID      VARCHAR(10)  NOT NULL,
    move_no        INT          NOT NULL,
    move_notation  VARCHAR(255) NOT NULL,
    move_time      DATETIME     NOT NULL,

    CONSTRAINT pk_game_move PRIMARY KEY (move_ID),
    CONSTRAINT fk_game_move_game
        FOREIGN KEY (game_ID) REFERENCES game(game_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_game_move_actor
        FOREIGN KEY (actor_PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_game_move_sequence UNIQUE (game_ID, move_no),
    CONSTRAINT chk_game_move_no CHECK (move_no > 0)
);

CREATE TABLE game_history (
    PID                VARCHAR(10) NOT NULL,
    GAME_ID            VARCHAR(10) NOT NULL,
    result             VARCHAR(20) NOT NULL,
    elo_change         INT         NOT NULL DEFAULT 0,
    elo_before         INT         NOT NULL,
    elo_after          INT         NOT NULL,
    play_duration_sec  INT         NOT NULL,

    CONSTRAINT pk_game_history PRIMARY KEY (PID, GAME_ID),
    CONSTRAINT fk_game_history_player
        FOREIGN KEY (PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_game_history_game
        FOREIGN KEY (GAME_ID) REFERENCES game(game_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_game_history_result CHECK (
        result IN ('win', 'loss', 'draw', 'forfeit')
    ),
    CONSTRAINT chk_game_history_elo_before CHECK (elo_before BETWEEN 0 AND 5000),
    CONSTRAINT chk_game_history_elo_after  CHECK (elo_after  BETWEEN 0 AND 5000),
    CONSTRAINT chk_game_history_duration   CHECK (play_duration_sec >= 0)
);

CREATE TABLE group_t (
    GID          VARCHAR(10)  NOT NULL,
    group_name   VARCHAR(120) NOT NULL,
    description  TEXT,
    owner_PID    VARCHAR(10)  NOT NULL,
    banner_url   VARCHAR(500),
    max_members  INT          NOT NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_public    BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_group_t PRIMARY KEY (GID),
    CONSTRAINT fk_group_t_owner
        FOREIGN KEY (owner_PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_group_t_name UNIQUE (group_name),
    CONSTRAINT chk_group_t_max_members CHECK (max_members > 0)
);

CREATE TABLE group_list (
    GID         VARCHAR(10) NOT NULL,
    PID         VARCHAR(10) NOT NULL,
    role        VARCHAR(30) NOT NULL DEFAULT 'member',
    joined_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    invited_by  VARCHAR(10),

    CONSTRAINT pk_group_list PRIMARY KEY (GID, PID),
    CONSTRAINT fk_group_list_group
        FOREIGN KEY (GID) REFERENCES group_t(GID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_group_list_player
        FOREIGN KEY (PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_group_list_inviter
        FOREIGN KEY (invited_by) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_group_list_role CHECK (
        role IN ('owner', 'admin', 'moderator', 'member')
    )
);

CREATE TABLE friends (
    PID1          VARCHAR(10) NOT NULL,
    PID2          VARCHAR(10) NOT NULL,
    since         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status        VARCHAR(30) NOT NULL DEFAULT 'pending',
    requested_by  VARCHAR(10) NOT NULL,

    CONSTRAINT pk_friends PRIMARY KEY (PID1, PID2),
    CONSTRAINT fk_friends_pid1
        FOREIGN KEY (PID1) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_friends_pid2
        FOREIGN KEY (PID2) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_friends_requested_by
        FOREIGN KEY (requested_by) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_friends_status CHECK (
        status IN ('pending', 'accepted', 'blocked')
    )
);

CREATE TABLE leaderboard (
    LID            VARCHAR(12) NOT NULL,
    PID            VARCHAR(10) NOT NULL,
    scope          VARCHAR(30) NOT NULL,
    scope_ref      VARCHAR(50) NOT NULL,
    rank_position  INT         NOT NULL,
    elo_snapshot   INT         NOT NULL,
    recorded_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_leaderboard PRIMARY KEY (LID),
    CONSTRAINT fk_leaderboard_player
        FOREIGN KEY (PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_leaderboard_scope CHECK (
        scope IN ('global', 'game_type', 'tournament', 'country')
    ),
    CONSTRAINT chk_leaderboard_rank CHECK (rank_position > 0),
    CONSTRAINT chk_leaderboard_elo  CHECK (elo_snapshot BETWEEN 0 AND 5000)
);

CREATE TABLE notification (
    NID            VARCHAR(12) NOT NULL,
    recipient_PID  VARCHAR(10) NOT NULL,
    type           VARCHAR(50) NOT NULL,
    ref_id         VARCHAR(50),
    content        TEXT        NOT NULL,
    is_read        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_notification PRIMARY KEY (NID),
    CONSTRAINT fk_notification_recipient
        FOREIGN KEY (recipient_PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_notification_type CHECK (
        type IN (
            'friend_request', 'tournament_invite', 'game_result',
            'group_invite', 'rank_update', 'chat_message'
        )
    )
);

CREATE TABLE chat (
    CID              VARCHAR(10) NOT NULL,
    PID1             VARCHAR(10) NOT NULL,
    PID2             VARCHAR(10) NOT NULL,
    created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at  DATETIME,
    is_archived      BOOLEAN     NOT NULL DEFAULT FALSE,

    CONSTRAINT pk_chat PRIMARY KEY (CID),
    CONSTRAINT fk_chat_pid1
        FOREIGN KEY (PID1) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_chat_pid2
        FOREIGN KEY (PID2) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_chat_pair UNIQUE (PID1, PID2),
    CONSTRAINT chk_chat_message_time CHECK (
        last_message_at IS NULL OR last_message_at >= created_at
    )
);

CREATE TABLE message (
    message_ID    VARCHAR(12) NOT NULL,
    CID           VARCHAR(10) NOT NULL,
    sender_PID    VARCHAR(10) NOT NULL,
    text_content  TEXT,
    media_url     VARCHAR(500),
    sent_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
    reply_to      VARCHAR(12),

    CONSTRAINT pk_message PRIMARY KEY (message_ID),
    CONSTRAINT fk_message_chat
        FOREIGN KEY (CID) REFERENCES chat(CID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_message_sender
        FOREIGN KEY (sender_PID) REFERENCES player(PID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_message_reply_to
        FOREIGN KEY (reply_to) REFERENCES message(message_ID)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_message_content CHECK (
        text_content IS NOT NULL OR media_url IS NOT NULL
    )
);

-- ================================================================
-- SECTION 4 — INDEXES
-- ================================================================

CREATE INDEX idx_player_email        ON player(email);
CREATE INDEX idx_player_rank_elo     ON player(rank_elo);
CREATE INDEX idx_player_country      ON player(country);
CREATE INDEX idx_player_is_active    ON player(is_active);

CREATE INDEX idx_tournament_struct_ID      ON tournament(struct_ID);
CREATE INDEX idx_tournament_game_type_ID   ON tournament(game_type_ID);
CREATE INDEX idx_tournament_organizer_PID  ON tournament(organizer_PID);
CREATE INDEX idx_tournament_status         ON tournament(status);
CREATE INDEX idx_tournament_scheduled_at   ON tournament(scheduled_at);

CREATE INDEX idx_participant_PID        ON participant(PID);
CREATE INDEX idx_participant_final_rank ON participant(final_rank);

CREATE INDEX idx_game_game_type_ID  ON game(game_type_ID);
CREATE INDEX idx_game_tournament_ID ON game(tournament_ID);
CREATE INDEX idx_game_winner_PID    ON game(winner_PID);
CREATE INDEX idx_game_status        ON game(status);
CREATE INDEX idx_game_start_time    ON game(start_time);

CREATE INDEX idx_game_player_PID    ON game_player(PID);

CREATE INDEX idx_game_move_game_ID    ON game_move(game_ID);
CREATE INDEX idx_game_move_actor_PID  ON game_move(actor_PID);
CREATE INDEX idx_game_move_time       ON game_move(move_time);

CREATE INDEX idx_game_history_GAME_ID ON game_history(GAME_ID);
CREATE INDEX idx_game_history_result  ON game_history(result);

CREATE INDEX idx_group_t_owner_PID  ON group_t(owner_PID);
CREATE INDEX idx_group_t_is_public  ON group_t(is_public);

CREATE INDEX idx_group_list_PID         ON group_list(PID);
CREATE INDEX idx_group_list_invited_by  ON group_list(invited_by);
CREATE INDEX idx_group_list_role        ON group_list(role);

CREATE INDEX idx_friends_PID2          ON friends(PID2);
CREATE INDEX idx_friends_requested_by  ON friends(requested_by);
CREATE INDEX idx_friends_status        ON friends(status);

CREATE INDEX idx_leaderboard_PID           ON leaderboard(PID);
CREATE INDEX idx_leaderboard_scope_ref     ON leaderboard(scope, scope_ref);
CREATE INDEX idx_leaderboard_rank_position ON leaderboard(rank_position);

CREATE INDEX idx_notification_recipient_PID ON notification(recipient_PID);
CREATE INDEX idx_notification_type          ON notification(type);
CREATE INDEX idx_notification_is_read       ON notification(is_read);
CREATE INDEX idx_notification_created_at    ON notification(created_at);

CREATE INDEX idx_chat_PID1            ON chat(PID1);
CREATE INDEX idx_chat_PID2            ON chat(PID2);
CREATE INDEX idx_chat_last_message_at ON chat(last_message_at);

CREATE INDEX idx_message_CID        ON message(CID);
CREATE INDEX idx_message_sender_PID ON message(sender_PID);
CREATE INDEX idx_message_sent_at    ON message(sent_at);
CREATE INDEX idx_message_reply_to   ON message(reply_to);

-- ================================================================
-- SECTION 5 — LOAD DATA FROM CSV
--
-- CSVs must be in: C:\ProgramData\MySQL\MySQL Server 8.0\Uploads\
-- Copy them with:
--   Copy-Item "...\milestone 5\milestone5_data_population_dml\csv\*"
--             "C:\ProgramData\MySQL\MySQL Server 8.0\Uploads\"
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- player (100 rows)
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/player.csv'
INTO TABLE player
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(PID, first_name, last_name, email, password_hash, rank_elo,
 @country, @avatar_url, @last_active, created_at, @is_active)
SET
  country     = NULLIF(@country, ''),
  avatar_url  = NULLIF(@avatar_url, ''),
  last_active = NULLIF(@last_active, ''),
  is_active   = (@is_active = 'TRUE');

-- gametype (50 rows)
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/gametype.csv'
INTO TABLE gametype
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(GT_ID, type_name, @description, max_duration_sec, @is_ranked, board_size, created_at)
SET
  description = NULLIF(@description, ''),
  is_ranked   = (@is_ranked = 'TRUE');

-- structure (50 rows)
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/structure.csv'
INTO TABLE structure
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(struct_ID, format_type, @details, rounds, seeding_method)
SET details = NULLIF(@details, '');

-- tournament (60 rows)
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/tournament.csv'
INTO TABLE tournament
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(TID, struct_ID, game_type_ID, organizer_PID, name, @reward,
 scheduled_at, max_participants, entry_elo_min, entry_elo_max, status)
SET reward = NULLIF(@reward, '');

-- participant (100 rows)
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/participant.csv'
INTO TABLE participant
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(TID, PID, @seed, enrolled_at, @eliminated, @final_rank, @prize_awarded)
SET
  seed          = NULLIF(@seed, ''),
  eliminated    = (@eliminated = 'TRUE'),
  final_rank    = NULLIF(@final_rank, ''),
  prize_awarded = NULLIF(@prize_awarded, '');

-- game
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/game.csv'
INTO TABLE game
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(game_ID, game_type_ID, @tournament_ID, @winner_PID, @arena,
 start_time, @end_time, status, spectator_count)
SET
  tournament_ID = NULLIF(@tournament_ID, ''),
  winner_PID    = NULLIF(@winner_PID, ''),
  arena         = NULLIF(@arena, ''),
  end_time      = NULLIF(@end_time, '');

-- game_player
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/game_player.csv'
INTO TABLE game_player
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(game_ID, PID, seat_no, score);

-- game_move
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/game_move.csv'
INTO TABLE game_move
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(move_ID, game_ID, actor_PID, move_no, move_notation, move_time);

-- game_history
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/game_history.csv'
INTO TABLE game_history
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(PID, GAME_ID, result, elo_change, elo_before, elo_after, play_duration_sec);

-- group_t
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/group_t.csv'
INTO TABLE group_t
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(GID, group_name, @description, owner_PID, @banner_url, max_members, created_at, @is_public)
SET
  description = NULLIF(@description, ''),
  banner_url  = NULLIF(@banner_url, ''),
  is_public   = (@is_public = 'TRUE');

-- group_list
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/group_list.csv'
INTO TABLE group_list
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(GID, PID, role, joined_at, @invited_by)
SET invited_by = NULLIF(@invited_by, '');

-- friends
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/friends.csv'
INTO TABLE friends
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(PID1, PID2, since, status, requested_by);

-- leaderboard
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/leaderboard.csv'
INTO TABLE leaderboard
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(LID, PID, scope, scope_ref, rank_position, elo_snapshot, recorded_at);

-- notification
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/notification.csv'
INTO TABLE notification
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(NID, recipient_PID, type, @ref_id, content, @is_read, created_at)
SET
  ref_id  = NULLIF(@ref_id, ''),
  is_read = (@is_read = 'TRUE');

-- chat
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/chat.csv'
INTO TABLE chat
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(CID, PID1, PID2, created_at, @last_message_at, @is_archived)
SET
  last_message_at = NULLIF(@last_message_at, ''),
  is_archived     = (@is_archived = 'TRUE');

-- message
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/message.csv'
INTO TABLE message
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(message_ID, CID, sender_PID, @text_content, @media_url, sent_at, @is_read, @reply_to)
SET
  text_content = NULLIF(@text_content, ''),
  media_url    = NULLIF(@media_url, ''),
  is_read      = (@is_read = 'TRUE'),
  reply_to     = NULLIF(@reply_to, '');

SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
-- SECTION 6 — TRIGGERS
-- ================================================================

DROP TRIGGER IF EXISTS trg_player_elo_validation;
DROP TRIGGER IF EXISTS trg_game_status_validation;
DROP TRIGGER IF EXISTS trg_game_completion_check;
DROP TRIGGER IF EXISTS trg_game_player_score_validation;
DROP TRIGGER IF EXISTS trg_tournament_status_validation;
DROP TRIGGER IF EXISTS trg_participant_seed_validation;
DROP TRIGGER IF EXISTS trg_friends_no_self_friendship;
DROP TRIGGER IF EXISTS trg_friends_ordering;
DROP TRIGGER IF EXISTS trg_friends_status_validation;
DROP TRIGGER IF EXISTS trg_game_history_result_validation;
DROP TRIGGER IF EXISTS trg_game_history_elo_validation;
DROP TRIGGER IF EXISTS trg_notification_type_validation;
DROP TRIGGER IF EXISTS trg_message_is_read_validation;
DROP TRIGGER IF EXISTS trg_update_chat_last_message;
DROP TRIGGER IF EXISTS trg_leaderboard_rank_validation;
DROP TRIGGER IF EXISTS trg_group_max_members_validation;
DROP TRIGGER IF EXISTS trg_group_list_role_validation;
DROP TRIGGER IF EXISTS trg_group_list_duplicate_prevention;

DELIMITER //

-- Prevent Elo going out of range on UPDATE
CREATE TRIGGER trg_player_elo_validation BEFORE UPDATE ON player
FOR EACH ROW
BEGIN
    IF NEW.rank_elo < 0 OR NEW.rank_elo > 5000 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Player Elo must be between 0 and 5000';
    END IF;
END //

-- Auto-set end_time when game is marked completed
CREATE TRIGGER trg_game_completion_check BEFORE UPDATE ON game
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND NEW.end_time IS NULL THEN
        SET NEW.end_time = CURRENT_TIMESTAMP;
    END IF;
END //

-- Prevent negative scores
CREATE TRIGGER trg_game_player_score_validation BEFORE INSERT ON game_player
FOR EACH ROW
BEGIN
    IF NEW.score < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Game player score cannot be negative';
    END IF;
END //

-- Validate tournament on insert
CREATE TRIGGER trg_tournament_status_validation BEFORE INSERT ON tournament
FOR EACH ROW
BEGIN
    IF NEW.max_participants <= 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tournament must allow at least 2 participants';
    END IF;
    IF NEW.entry_elo_min IS NOT NULL AND NEW.entry_elo_max IS NOT NULL THEN
        IF NEW.entry_elo_min > NEW.entry_elo_max THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Entry Elo min cannot be greater than max';
        END IF;
    END IF;
END //

-- Validate participant seed
CREATE TRIGGER trg_participant_seed_validation BEFORE INSERT ON participant
FOR EACH ROW
BEGIN
    IF NEW.seed IS NOT NULL AND NEW.seed <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Participant seed must be positive';
    END IF;
END //

-- Prevent self-friendship
CREATE TRIGGER trg_friends_no_self_friendship BEFORE INSERT ON friends
FOR EACH ROW
BEGIN
    IF NEW.PID1 = NEW.PID2 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot create friendship with yourself';
    END IF;
END //

-- Enforce PID1 < PID2 ordering
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

-- Validate friendship status and requester
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

-- Validate Elo change bounds on game_history insert
CREATE TRIGGER trg_game_history_elo_validation BEFORE INSERT ON game_history
FOR EACH ROW
BEGIN
    IF NEW.elo_before < 0 OR NEW.elo_before > 5000 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Elo before must be between 0 and 5000';
    END IF;
    IF NEW.elo_after < 0 OR NEW.elo_after > 5000 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Elo after must be between 0 and 5000';
    END IF;
END //

-- Auto-update chat last_message_at when a message is sent
CREATE TRIGGER trg_update_chat_last_message AFTER INSERT ON message
FOR EACH ROW
BEGIN
    UPDATE chat SET last_message_at = NEW.sent_at WHERE CID = NEW.CID;
END //

-- Validate leaderboard rank and Elo snapshot
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

-- Validate group max_members
CREATE TRIGGER trg_group_max_members_validation BEFORE INSERT ON group_t
FOR EACH ROW
BEGIN
    IF NEW.max_members <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group max_members must be positive';
    END IF;
END //

-- Validate group role
CREATE TRIGGER trg_group_list_role_validation BEFORE INSERT ON group_list
FOR EACH ROW
BEGIN
    IF NEW.role NOT IN ('owner', 'admin', 'moderator', 'member') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid group role';
    END IF;
END //

-- Prevent duplicate group membership
CREATE TRIGGER trg_group_list_duplicate_prevention BEFORE INSERT ON group_list
FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM group_list WHERE GID = NEW.GID AND PID = NEW.PID) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Player is already a member of this group';
    END IF;
END //

DELIMITER ;

-- ================================================================
-- SECTION 7 — VIEWS
-- ================================================================

-- Global Elo-based leaderboard (top 100)
CREATE OR REPLACE VIEW v_global_leaderboard AS
SELECT
    PID,
    CONCAT(first_name, ' ', last_name) AS player_name,
    rank_elo,
    country,
    is_active,
    created_at
FROM player
ORDER BY rank_elo DESC, created_at ASC
LIMIT 100;

-- Active players with win stats
CREATE OR REPLACE VIEW v_active_players_leaderboard AS
SELECT
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    p.rank_elo,
    p.country,
    COUNT(DISTINCT gh.GAME_ID) AS total_games,
    SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN gh.result = 'loss' THEN 1 ELSE 0 END) AS losses,
    ROUND(100.0 * SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) / NULLIF(COUNT(gh.GAME_ID), 0), 2) AS win_percentage
FROM player p
LEFT JOIN game_history gh ON p.PID = gh.PID
WHERE p.is_active = TRUE
GROUP BY p.PID, p.first_name, p.last_name, p.rank_elo, p.country
ORDER BY p.rank_elo DESC
LIMIT 100;

-- Tournament standings with participant counts
CREATE OR REPLACE VIEW v_tournament_standings AS
SELECT
    t.TID,
    t.name AS tournament_name,
    s.format_type,
    t.status,
    COUNT(pt.PID) AS participant_count,
    t.max_participants,
    GROUP_CONCAT(
        CONCAT(pt.final_rank, '. ', p.first_name, ' ', p.last_name)
        ORDER BY pt.final_rank
        SEPARATOR ' | '
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
    t.TID,
    t.name,
    gt.type_name,
    s.format_type,
    CONCAT(o.first_name, ' ', o.last_name) AS organizer,
    t.scheduled_at,
    DATEDIFF(t.scheduled_at, CURRENT_TIMESTAMP) AS days_until_start,
    t.max_participants,
    (SELECT COUNT(*) FROM participant WHERE TID = t.TID) AS enrolled_players
FROM tournament t
JOIN gametype gt ON t.game_type_ID = gt.GT_ID
JOIN structure s ON t.struct_ID = s.struct_ID
JOIN player o ON t.organizer_PID = o.PID
WHERE t.status IN ('scheduled', 'active')
  AND t.scheduled_at > CURRENT_TIMESTAMP
ORDER BY t.scheduled_at ASC;

-- Completed tournaments with champion
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

-- Player match history with Elo changes
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

-- Win rate per player per game type
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

-- Player friendship summary
CREATE OR REPLACE VIEW v_player_friends_summary AS
SELECT
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    COUNT(CASE WHEN f.status = 'accepted' THEN 1 END) AS friend_count,
    COUNT(CASE WHEN f.status = 'pending' AND f.requested_by = p.PID THEN 1 END) AS pending_sent,
    COUNT(CASE WHEN f.status = 'pending' AND f.requested_by != p.PID THEN 1 END) AS pending_received,
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
    g.is_public
FROM group_t g
JOIN player go ON g.owner_PID = go.PID
LEFT JOIN group_list gl ON g.GID = gl.GID
GROUP BY g.GID, g.group_name, go.first_name, go.last_name, g.max_members, g.is_public;

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
    c.is_archived
FROM chat c
JOIN player p1 ON c.PID1 = p1.PID
JOIN player p2 ON c.PID2 = p2.PID
LEFT JOIN message m ON c.CID = m.CID
GROUP BY c.CID, p1.first_name, p1.last_name, p2.first_name, p2.last_name,
         c.created_at, c.last_message_at, c.is_archived;

-- Database statistics (one-shot health check)
CREATE OR REPLACE VIEW v_database_statistics AS
SELECT 'Total Players'           AS metric, COUNT(*) AS count FROM player
UNION ALL SELECT 'Active Players',          COUNT(*) FROM player WHERE is_active = TRUE
UNION ALL SELECT 'Total Tournaments',       COUNT(*) FROM tournament
UNION ALL SELECT 'Completed Tournaments',   COUNT(*) FROM tournament WHERE status = 'completed'
UNION ALL SELECT 'Total Games Played',      COUNT(*) FROM game WHERE status = 'completed'
UNION ALL SELECT 'Total Messages',          COUNT(*) FROM message
UNION ALL SELECT 'Unread Messages',         COUNT(*) FROM message WHERE is_read = FALSE
UNION ALL SELECT 'Total Groups',            COUNT(*) FROM group_t
UNION ALL SELECT 'Friend Connections',      COUNT(*) FROM friends WHERE status = 'accepted';

-- Elo tier distribution
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
    ROUND(AVG(rank_elo), 0) AS avg_elo,
    MIN(rank_elo) AS min_elo,
    MAX(rank_elo) AS max_elo
FROM player
GROUP BY elo_tier
ORDER BY MIN(rank_elo);

-- ================================================================
-- SECTION 8 — STORED PROCEDURES
-- ================================================================

DROP PROCEDURE IF EXISTS sp_update_player_elo;
DROP PROCEDURE IF EXISTS sp_create_tournament;
DROP PROCEDURE IF EXISTS sp_register_for_tournament;
DROP PROCEDURE IF EXISTS sp_record_game_result;
DROP PROCEDURE IF EXISTS sp_send_friend_request;
DROP PROCEDURE IF EXISTS sp_accept_friend_request;
DROP PROCEDURE IF EXISTS sp_create_notification;
DROP PROCEDURE IF EXISTS sp_mark_notification_read;
DROP PROCEDURE IF EXISTS sp_create_group;
DROP PROCEDURE IF EXISTS sp_add_group_member;
DROP PROCEDURE IF EXISTS sp_get_player_stats;

DELIMITER //

-- Update a player's Elo and last_active after a game
-- CALL sp_update_player_elo('P001', 25);
CREATE PROCEDURE sp_update_player_elo(
    IN p_player_id VARCHAR(10),
    IN p_elo_change INT
)
COMMENT 'Update a player Elo rating and last_active timestamp'
BEGIN
    DECLARE v_new_elo INT;
    SELECT rank_elo INTO v_new_elo FROM player WHERE PID = p_player_id;
    SET v_new_elo = v_new_elo + p_elo_change;
    IF v_new_elo < 0 THEN SET v_new_elo = 0;
    ELSEIF v_new_elo > 5000 THEN SET v_new_elo = 5000;
    END IF;
    UPDATE player SET rank_elo = v_new_elo, last_active = CURRENT_TIMESTAMP
    WHERE PID = p_player_id;
    SELECT CONCAT('Player ', p_player_id, ' Elo updated to ', v_new_elo) AS result;
END //

-- Create a new tournament
-- CALL sp_create_tournament('Summer2026','SE001','GT_3x3','P001','Trophy','2026-06-01 10:00:00',32,1200,2000);
CREATE PROCEDURE sp_create_tournament(
    IN p_name        VARCHAR(255),
    IN p_struct_id   VARCHAR(10),
    IN p_gt_id       VARCHAR(10),
    IN p_org_pid     VARCHAR(10),
    IN p_reward      TEXT,
    IN p_sched_at    DATETIME,
    IN p_max_part    INT,
    IN p_elo_min     INT,
    IN p_elo_max     INT
)
COMMENT 'Create a new tournament instance'
BEGIN
    DECLARE v_tid VARCHAR(10);
    SET v_tid = CONCAT('T', LPAD((SELECT MAX(CAST(SUBSTR(TID,2) AS UNSIGNED))+1 FROM tournament),4,'0'));
    INSERT INTO tournament (TID, struct_ID, game_type_ID, organizer_PID, name, reward,
                            scheduled_at, max_participants, entry_elo_min, entry_elo_max, status)
    VALUES (v_tid, p_struct_id, p_gt_id, p_org_pid, p_name, p_reward,
            p_sched_at, p_max_part, p_elo_min, p_elo_max, 'scheduled');
    SELECT CONCAT('Tournament ', p_name, ' created: ', v_tid) AS result;
END //

-- Register a player for a tournament (checks capacity and Elo)
-- CALL sp_register_for_tournament('T001','P005',1);
CREATE PROCEDURE sp_register_for_tournament(
    IN p_tid    VARCHAR(10),
    IN p_pid    VARCHAR(10),
    IN p_seed   INT
)
COMMENT 'Register a player for a tournament'
BEGIN
    DECLARE v_max INT; DECLARE v_cur INT;
    DECLARE v_min INT; DECLARE v_max_elo INT;
    DECLARE v_elo INT;
    SELECT max_participants, entry_elo_min, entry_elo_max
    INTO v_max, v_min, v_max_elo FROM tournament WHERE TID = p_tid;
    SELECT COUNT(*) INTO v_cur FROM participant WHERE TID = p_tid;
    SELECT rank_elo INTO v_elo FROM player WHERE PID = p_pid;
    IF v_cur >= v_max THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tournament is full';
    END IF;
    IF v_elo < IFNULL(v_min, 0) OR v_elo > IFNULL(v_max_elo, 5000) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Player Elo does not meet tournament requirements';
    END IF;
    INSERT INTO participant (TID, PID, seed, enrolled_at)
    VALUES (p_tid, p_pid, p_seed, CURRENT_TIMESTAMP);
    SELECT CONCAT('Player ', p_pid, ' registered for ', p_tid) AS result;
END //

-- Record game result and optionally recalculate Elo (K=32)
-- CALL sp_record_game_result('G001','P001',TRUE);
CREATE PROCEDURE sp_record_game_result(
    IN p_game_id    VARCHAR(10),
    IN p_winner_pid VARCHAR(10),
    IN p_calc_elo   BOOLEAN
)
COMMENT 'Mark a game completed and optionally update Elo'
BEGIN
    DECLARE v_loser VARCHAR(10); DECLARE v_w_elo INT; DECLARE v_l_elo INT; DECLARE v_chg INT;
    IF p_calc_elo THEN
        SELECT gp.PID INTO v_loser FROM game_player gp
        WHERE gp.game_ID = p_game_id AND gp.PID != p_winner_pid LIMIT 1;
        SELECT rank_elo INTO v_w_elo FROM player WHERE PID = p_winner_pid;
        SELECT rank_elo INTO v_l_elo FROM player WHERE PID = v_loser;
        SET v_chg = ROUND(32 * (1 - 1 / (1 + POW(10, (v_l_elo - v_w_elo) / 400))));
        UPDATE player SET rank_elo = rank_elo + v_chg WHERE PID = p_winner_pid;
        UPDATE player SET rank_elo = rank_elo - v_chg WHERE PID = v_loser;
    END IF;
    UPDATE game SET winner_PID = p_winner_pid, status = 'completed', end_time = CURRENT_TIMESTAMP
    WHERE game_ID = p_game_id;
    SELECT CONCAT('Game ', p_game_id, ' completed. Winner: ', p_winner_pid) AS result;
END //

-- Send a friend request
-- CALL sp_send_friend_request('P001','P005');
CREATE PROCEDURE sp_send_friend_request(
    IN p_from VARCHAR(10),
    IN p_to   VARCHAR(10)
)
COMMENT 'Send a friend request'
BEGIN
    DECLARE v_p1 VARCHAR(10); DECLARE v_p2 VARCHAR(10);
    IF p_from < p_to THEN SET v_p1 = p_from; SET v_p2 = p_to;
    ELSE SET v_p1 = p_to; SET v_p2 = p_from; END IF;
    IF v_p1 = v_p2 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot send friend request to yourself';
    END IF;
    IF EXISTS (SELECT 1 FROM friends WHERE PID1 = v_p1 AND PID2 = v_p2) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Friendship already exists';
    END IF;
    INSERT INTO friends (PID1, PID2, status, requested_by, since)
    VALUES (v_p1, v_p2, 'pending', p_from, CURRENT_TIMESTAMP);
    SELECT CONCAT('Friend request sent from ', p_from, ' to ', p_to) AS result;
END //

-- Accept a pending friend request
-- CALL sp_accept_friend_request('P001','P005');
CREATE PROCEDURE sp_accept_friend_request(
    IN p_p1 VARCHAR(10),
    IN p_p2 VARCHAR(10)
)
COMMENT 'Accept a pending friend request'
BEGIN
    DECLARE v_p1 VARCHAR(10); DECLARE v_p2 VARCHAR(10);
    IF p_p1 < p_p2 THEN SET v_p1 = p_p1; SET v_p2 = p_p2;
    ELSE SET v_p1 = p_p2; SET v_p2 = p_p1; END IF;
    UPDATE friends SET status = 'accepted'
    WHERE PID1 = v_p1 AND PID2 = v_p2 AND status = 'pending';
    SELECT CONCAT('Friendship between ', p_p1, ' and ', p_p2, ' accepted') AS result;
END //

-- Create a notification for a player
-- CALL sp_create_notification('P005','friend_request','P001','P001 sent you a friend request');
CREATE PROCEDURE sp_create_notification(
    IN p_pid     VARCHAR(10),
    IN p_type    VARCHAR(50),
    IN p_ref_id  VARCHAR(100),
    IN p_content TEXT
)
COMMENT 'Create a system notification'
BEGIN
    DECLARE v_nid VARCHAR(12);
    SET v_nid = CONCAT('N', LPAD((SELECT MAX(CAST(SUBSTR(NID,2) AS UNSIGNED))+1 FROM notification),5,'0'));
    INSERT INTO notification (NID, recipient_PID, type, ref_id, content, is_read, created_at)
    VALUES (v_nid, p_pid, p_type, p_ref_id, p_content, FALSE, CURRENT_TIMESTAMP);
    SELECT CONCAT('Notification created: ', v_nid) AS result;
END //

-- Mark a notification as read
-- CALL sp_mark_notification_read('N0001');
CREATE PROCEDURE sp_mark_notification_read(IN p_nid VARCHAR(12))
COMMENT 'Mark a notification as read'
BEGIN
    UPDATE notification SET is_read = TRUE WHERE NID = p_nid;
    SELECT CONCAT('Notification ', p_nid, ' marked as read') AS result;
END //

-- Create a group (auto-adds owner as member)
-- CALL sp_create_group('Dragon Slayers','P001','Elite group',NULL,100,TRUE);
CREATE PROCEDURE sp_create_group(
    IN p_name       VARCHAR(255),
    IN p_owner      VARCHAR(10),
    IN p_desc       TEXT,
    IN p_banner     VARCHAR(500),
    IN p_max        INT,
    IN p_public     BOOLEAN
)
COMMENT 'Create a new player group'
BEGIN
    DECLARE v_gid VARCHAR(10);
    SET v_gid = CONCAT('G', LPAD((SELECT MAX(CAST(SUBSTR(GID,2) AS UNSIGNED))+1 FROM group_t),4,'0'));
    INSERT INTO group_t (GID, group_name, description, owner_PID, banner_url, max_members, is_public, created_at)
    VALUES (v_gid, p_name, p_desc, p_owner, p_banner, p_max, p_public, CURRENT_TIMESTAMP);
    INSERT INTO group_list (GID, PID, role, joined_at) VALUES (v_gid, p_owner, 'owner', CURRENT_TIMESTAMP);
    SELECT CONCAT('Group created: ', p_name, ' (', v_gid, ')') AS result;
END //

-- Add a member to a group (checks capacity)
-- CALL sp_add_group_member('G001','P005','member','P001');
CREATE PROCEDURE sp_add_group_member(
    IN p_gid    VARCHAR(10),
    IN p_pid    VARCHAR(10),
    IN p_role   VARCHAR(50),
    IN p_inv    VARCHAR(10)
)
COMMENT 'Add a player to a group'
BEGIN
    DECLARE v_cur INT; DECLARE v_max INT;
    SELECT COUNT(*) INTO v_cur FROM group_list WHERE GID = p_gid;
    SELECT max_members INTO v_max FROM group_t WHERE GID = p_gid;
    IF v_cur >= v_max THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group is at capacity';
    END IF;
    INSERT INTO group_list (GID, PID, role, joined_at, invited_by)
    VALUES (p_gid, p_pid, p_role, CURRENT_TIMESTAMP, p_inv);
    SELECT CONCAT('Player ', p_pid, ' added to group ', p_gid, ' as ', p_role) AS result;
END //

-- Full stats for a player
-- CALL sp_get_player_stats('P001');
CREATE PROCEDURE sp_get_player_stats(IN p_pid VARCHAR(10))
COMMENT 'Get comprehensive statistics for a player'
BEGIN
    SELECT
        p.PID,
        CONCAT(p.first_name, ' ', p.last_name) AS player_name,
        p.rank_elo,
        p.country,
        COUNT(DISTINCT gh.GAME_ID) AS total_games,
        SUM(CASE WHEN gh.result = 'win'  THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN gh.result = 'loss' THEN 1 ELSE 0 END) AS losses,
        SUM(CASE WHEN gh.result = 'draw' THEN 1 ELSE 0 END) AS draws,
        ROUND(100.0 * SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END)
              / NULLIF(COUNT(gh.GAME_ID), 0), 2) AS win_percentage,
        COUNT(DISTINCT pt.TID) AS tournaments_participated,
        p.created_at,
        p.last_active
    FROM player p
    LEFT JOIN game_history gh ON p.PID = gh.PID
    LEFT JOIN participant pt ON p.PID = pt.PID
    WHERE p.PID = p_pid
    GROUP BY p.PID, p.first_name, p.last_name, p.rank_elo,
             p.country, p.created_at, p.last_active;
END //

DELIMITER ;

-- ================================================================
-- SECTION 9 — UPDATE / DELETE DEMO
-- ================================================================

-- UPDATE: award 25 Elo to P001 after a verified win
UPDATE player
SET rank_elo    = rank_elo + 25,
    last_active = CURRENT_TIMESTAMP
WHERE PID = 'P001';

-- DELETE: remove an old notification
DELETE FROM notification
WHERE NID = 'N0100';

-- ================================================================
-- SECTION 10 — VALIDATION QUERIES
-- ================================================================

-- Row count per table (all should be > 0)
SELECT 'player' AS table_name, COUNT(*) AS row_count FROM player
UNION ALL SELECT 'gametype',     COUNT(*) FROM gametype
UNION ALL SELECT 'structure',    COUNT(*) FROM structure
UNION ALL SELECT 'tournament',   COUNT(*) FROM tournament
UNION ALL SELECT 'participant',  COUNT(*) FROM participant
UNION ALL SELECT 'game',         COUNT(*) FROM game
UNION ALL SELECT 'game_player',  COUNT(*) FROM game_player
UNION ALL SELECT 'game_move',    COUNT(*) FROM game_move
UNION ALL SELECT 'game_history', COUNT(*) FROM game_history
UNION ALL SELECT 'group_t',      COUNT(*) FROM group_t
UNION ALL SELECT 'group_list',   COUNT(*) FROM group_list
UNION ALL SELECT 'friends',      COUNT(*) FROM friends
UNION ALL SELECT 'leaderboard',  COUNT(*) FROM leaderboard
UNION ALL SELECT 'notification', COUNT(*) FROM notification
UNION ALL SELECT 'chat',         COUNT(*) FROM chat
UNION ALL SELECT 'message',      COUNT(*) FROM message;

-- NULL check on required columns (all should return 0)
SELECT 'player'     AS table_name, COUNT(*) AS key_null_count FROM player    WHERE PID IS NULL
UNION ALL SELECT 'gametype',   COUNT(*) FROM gametype   WHERE GT_ID IS NULL
UNION ALL SELECT 'structure',  COUNT(*) FROM structure  WHERE struct_ID IS NULL
UNION ALL SELECT 'tournament', COUNT(*) FROM tournament WHERE TID IS NULL OR struct_ID IS NULL OR game_type_ID IS NULL OR organizer_PID IS NULL
UNION ALL SELECT 'participant',COUNT(*) FROM participant WHERE TID IS NULL OR PID IS NULL
UNION ALL SELECT 'game',       COUNT(*) FROM game       WHERE game_ID IS NULL OR game_type_ID IS NULL
UNION ALL SELECT 'game_player',COUNT(*) FROM game_player WHERE game_ID IS NULL OR PID IS NULL
UNION ALL SELECT 'game_move',  COUNT(*) FROM game_move  WHERE move_ID IS NULL OR game_ID IS NULL OR actor_PID IS NULL
UNION ALL SELECT 'game_history',COUNT(*) FROM game_history WHERE PID IS NULL OR GAME_ID IS NULL
UNION ALL SELECT 'group_t',    COUNT(*) FROM group_t    WHERE GID IS NULL OR owner_PID IS NULL
UNION ALL SELECT 'group_list', COUNT(*) FROM group_list WHERE GID IS NULL OR PID IS NULL
UNION ALL SELECT 'friends',    COUNT(*) FROM friends    WHERE PID1 IS NULL OR PID2 IS NULL OR requested_by IS NULL
UNION ALL SELECT 'leaderboard',COUNT(*) FROM leaderboard WHERE LID IS NULL OR PID IS NULL
UNION ALL SELECT 'notification',COUNT(*) FROM notification WHERE NID IS NULL OR recipient_PID IS NULL
UNION ALL SELECT 'chat',       COUNT(*) FROM chat       WHERE CID IS NULL OR PID1 IS NULL OR PID2 IS NULL
UNION ALL SELECT 'message',    COUNT(*) FROM message    WHERE message_ID IS NULL OR CID IS NULL OR sender_PID IS NULL;

-- FK integrity (orphan check — all should return 0)
SELECT 'tournament.struct_ID -> structure'      AS relationship, COUNT(*) AS orphans
FROM tournament t LEFT JOIN structure s ON t.struct_ID = s.struct_ID WHERE s.struct_ID IS NULL
UNION ALL SELECT 'tournament.game_type_ID -> gametype', COUNT(*)
FROM tournament t LEFT JOIN gametype gt ON t.game_type_ID = gt.GT_ID WHERE gt.GT_ID IS NULL
UNION ALL SELECT 'participant.TID -> tournament', COUNT(*)
FROM participant pt LEFT JOIN tournament t ON pt.TID = t.TID WHERE t.TID IS NULL
UNION ALL SELECT 'participant.PID -> player', COUNT(*)
FROM participant pt LEFT JOIN player p ON pt.PID = p.PID WHERE p.PID IS NULL
UNION ALL SELECT 'game.game_type_ID -> gametype', COUNT(*)
FROM game g LEFT JOIN gametype gt ON g.game_type_ID = gt.GT_ID WHERE gt.GT_ID IS NULL
UNION ALL SELECT 'game_player.game_ID -> game', COUNT(*)
FROM game_player gp LEFT JOIN game g ON gp.game_ID = g.game_ID WHERE g.game_ID IS NULL
UNION ALL SELECT 'game_move.game_ID -> game', COUNT(*)
FROM game_move gm LEFT JOIN game g ON gm.game_ID = g.game_ID WHERE g.game_ID IS NULL
UNION ALL SELECT 'game_history.PID -> player', COUNT(*)
FROM game_history gh LEFT JOIN player p ON gh.PID = p.PID WHERE p.PID IS NULL
UNION ALL SELECT 'friends.PID1 -> player', COUNT(*)
FROM friends f LEFT JOIN player p ON f.PID1 = p.PID WHERE p.PID IS NULL
UNION ALL SELECT 'leaderboard.PID -> player', COUNT(*)
FROM leaderboard lb LEFT JOIN player p ON lb.PID = p.PID WHERE p.PID IS NULL
UNION ALL SELECT 'message.CID -> chat', COUNT(*)
FROM message m LEFT JOIN chat c ON m.CID = c.CID WHERE c.CID IS NULL
UNION ALL SELECT 'message.reply_to -> message', COUNT(*)
FROM message m LEFT JOIN message pm ON m.reply_to = pm.message_ID
WHERE m.reply_to IS NOT NULL AND pm.message_ID IS NULL;

-- ================================================================
-- SECTION 11 — SAMPLE QUERIES
-- ================================================================

-- Top 10 players by Elo
SELECT PID, CONCAT(first_name,' ',last_name) AS player_name,
       rank_elo, country, is_active
FROM player ORDER BY rank_elo DESC LIMIT 10;

-- Win rate per player (min 5 games)
SELECT p.PID, CONCAT(p.first_name,' ',p.last_name) AS player_name,
       COUNT(gh.GAME_ID) AS total_games,
       SUM(CASE WHEN gh.result='win' THEN 1 ELSE 0 END) AS wins,
       ROUND(100.0 * SUM(CASE WHEN gh.result='win' THEN 1 ELSE 0 END)
             / NULLIF(COUNT(gh.GAME_ID),0), 2) AS win_pct
FROM player p
LEFT JOIN game_history gh ON p.PID = gh.PID
WHERE gh.GAME_ID IS NOT NULL
GROUP BY p.PID, p.first_name, p.last_name
HAVING total_games >= 5
ORDER BY win_pct DESC;

-- Tournament standings
SELECT t.TID, t.name, s.format_type, t.status,
       COUNT(pt.PID) AS participants, t.max_participants, t.scheduled_at
FROM tournament t
JOIN structure s ON t.struct_ID = s.struct_ID
LEFT JOIN participant pt ON t.TID = pt.TID
GROUP BY t.TID, t.name, s.format_type, t.status, t.max_participants, t.scheduled_at
ORDER BY t.scheduled_at DESC;

-- Most played game types
SELECT gt.GT_ID, gt.type_name, COUNT(g.game_ID) AS total_games,
       SEC_TO_TIME(AVG(TIMESTAMPDIFF(SECOND, g.start_time, g.end_time))) AS avg_duration
FROM game g JOIN gametype gt ON g.game_type_ID = gt.GT_ID
WHERE g.status = 'completed'
GROUP BY gt.GT_ID, gt.type_name ORDER BY total_games DESC;

-- Most connected players (accepted friends)
SELECT p.PID, CONCAT(p.first_name,' ',p.last_name) AS player_name,
       COUNT(DISTINCT CASE WHEN f.PID1=p.PID THEN f.PID2 ELSE f.PID1 END) AS friend_count,
       p.rank_elo
FROM player p
LEFT JOIN friends f ON (p.PID=f.PID1 OR p.PID=f.PID2) AND f.status='accepted'
GROUP BY p.PID, p.first_name, p.last_name, p.rank_elo
HAVING friend_count > 0
ORDER BY friend_count DESC LIMIT 20;

-- Most active chats
SELECT c.CID,
       CONCAT(p1.first_name,' ',p1.last_name) AS participant_1,
       CONCAT(p2.first_name,' ',p2.last_name) AS participant_2,
       COUNT(m.message_ID) AS message_count,
       c.last_message_at
FROM chat c
JOIN player p1 ON c.PID1=p1.PID JOIN player p2 ON c.PID2=p2.PID
LEFT JOIN message m ON c.CID=m.CID
GROUP BY c.CID, p1.first_name, p1.last_name, p2.first_name, p2.last_name, c.last_message_at
HAVING message_count > 0
ORDER BY message_count DESC LIMIT 10;

-- Unread notifications per player
SELECT n.recipient_PID, CONCAT(p.first_name,' ',p.last_name) AS player_name,
       COUNT(CASE WHEN n.is_read=FALSE THEN 1 END) AS unread
FROM notification n JOIN player p ON n.recipient_PID=p.PID
GROUP BY n.recipient_PID, p.first_name, p.last_name
HAVING unread > 0
ORDER BY unread DESC;

-- ================================================================
-- SECTION 12 — BUSINESS ANALYTICS
-- ================================================================

-- Player engagement score (composite metric)
SELECT p.PID, CONCAT(p.first_name,' ',p.last_name) AS player_name,
    (SELECT COUNT(*) FROM game_history WHERE PID=p.PID) * 10
  + (SELECT COUNT(*) FROM participant  WHERE PID=p.PID) * 25
  + (SELECT COUNT(*) FROM friends WHERE (PID1=p.PID OR PID2=p.PID) AND status='accepted') * 5
  + (SELECT COUNT(*) FROM group_list WHERE PID=p.PID) * 15
  + (SELECT COUNT(*) FROM message WHERE sender_PID=p.PID) * 1 AS engagement_score
FROM player p WHERE p.is_active=TRUE
ORDER BY engagement_score DESC LIMIT 20;

-- Tournament competitiveness (Elo spread among participants)
SELECT t.TID, t.name,
       COUNT(DISTINCT pt.PID) AS participants,
       ROUND(AVG(p.rank_elo), 0) AS avg_elo,
       MIN(p.rank_elo) AS lowest_elo, MAX(p.rank_elo) AS highest_elo,
       MAX(p.rank_elo)-MIN(p.rank_elo) AS elo_spread,
       ROUND(STDDEV(p.rank_elo), 0) AS elo_stddev
FROM tournament t
JOIN participant pt ON t.TID=pt.TID
JOIN player p ON pt.PID=p.PID
GROUP BY t.TID, t.name ORDER BY elo_spread DESC;

-- Game type popularity
SELECT gt.GT_ID, gt.type_name,
       COUNT(g.game_ID) AS games_played,
       ROUND(100.0*COUNT(g.game_ID)/(SELECT COUNT(*) FROM game WHERE status='completed'),2) AS pct_of_all,
       SUM(g.spectator_count) AS total_spectators
FROM game g JOIN gametype gt ON g.game_type_ID=gt.GT_ID
WHERE g.status='completed'
GROUP BY gt.GT_ID, gt.type_name ORDER BY games_played DESC;

-- Friend request acceptance rate
SELECT
    COUNT(CASE WHEN status='accepted' THEN 1 END) AS accepted,
    COUNT(CASE WHEN status='pending'  THEN 1 END) AS pending,
    COUNT(CASE WHEN status='blocked'  THEN 1 END) AS blocked,
    ROUND(100.0*COUNT(CASE WHEN status='accepted' THEN 1 END)/COUNT(*),2) AS acceptance_rate
FROM friends;

-- Elo tier distribution with win rate
SELECT
    CASE WHEN p.rank_elo < 1000 THEN 'Beginner'
         WHEN p.rank_elo < 1500 THEN 'Intermediate'
         WHEN p.rank_elo < 2000 THEN 'Advanced'
         ELSE 'Expert' END AS elo_tier,
    COUNT(DISTINCT p.PID) AS players,
    ROUND(AVG(p.rank_elo), 0) AS avg_elo,
    COUNT(gh.GAME_ID) AS games_played,
    ROUND(100.0*SUM(CASE WHEN gh.result='win' THEN 1 ELSE 0 END)/NULLIF(COUNT(gh.GAME_ID),0),2) AS win_pct
FROM player p
LEFT JOIN game_history gh ON p.PID=gh.PID
WHERE p.is_active=TRUE
GROUP BY elo_tier ORDER BY avg_elo;

-- Data quality check
SELECT COUNT(*) AS total_players,
       SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) AS null_emails,
       SUM(CASE WHEN rank_elo < 0 OR rank_elo > 5000 THEN 1 ELSE 0 END) AS invalid_elos,
       ROUND(100.0*(COUNT(*) - SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END)
             - SUM(CASE WHEN rank_elo < 0 OR rank_elo > 5000 THEN 1 ELSE 0 END))/COUNT(*),2) AS data_quality_pct
FROM player;
