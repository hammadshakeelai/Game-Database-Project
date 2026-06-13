-- =============================================================
-- Game Tournament Platform — Complete Setup (DDL + CSV Load)
-- DBMS : MySQL 8.0+
--
-- Before running:
--   Copy all CSV files from:
--     milestone 5/milestone5_data_population_dml/csv/
--   into the MySQL secure upload directory:
--     C:\ProgramData\MySQL\MySQL Server 8.0\Uploads\
--
--   Then run this file in Workbench (no special settings needed).
--   Paths below use LOAD DATA INFILE (server-side read — no LOCAL).
-- =============================================================

-- =============================================================
-- SECTION 1 — DATABASE
-- =============================================================

CREATE DATABASE IF NOT EXISTS game_tournament_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE game_tournament_db;

-- =============================================================
-- SECTION 2 — DROP TABLES (reverse dependency order)
-- =============================================================

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

-- =============================================================
-- SECTION 3 — CREATE TABLES
-- =============================================================

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

-- =============================================================
-- SECTION 4 — INDEXES
-- =============================================================

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

-- =============================================================
-- SECTION 5 — LOAD DATA FROM CSV
--
-- CSVs must be in: C:\ProgramData\MySQL\MySQL Server 8.0\Uploads\
-- (MySQL secure_file_priv directory — no special Workbench settings needed)
--
-- All CSV files have a header row (IGNORE 1 LINES).
-- BOOLEAN columns (TRUE/FALSE text) are loaded via @var and SET.
-- Nullable columns (empty string in CSV) use NULLIF(@var, '').
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- player  (100 rows)
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/player.csv'
INTO TABLE player
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(PID, first_name, last_name, email, password_hash, rank_elo,
 @country, @avatar_url, @last_active, created_at, @is_active)
SET
  country    = NULLIF(@country, ''),
  avatar_url = NULLIF(@avatar_url, ''),
  last_active = NULLIF(@last_active, ''),
  is_active  = (@is_active = 'TRUE');

-- ----------------------------------------------------------
-- gametype  (50 rows)
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/gametype.csv'
INTO TABLE gametype
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(GT_ID, type_name, @description, max_duration_sec, @is_ranked, board_size, created_at)
SET
  description = NULLIF(@description, ''),
  is_ranked   = (@is_ranked = 'TRUE');

-- ----------------------------------------------------------
-- structure  (50 rows)
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/structure.csv'
INTO TABLE structure
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(struct_ID, format_type, @details, rounds, seeding_method)
SET details = NULLIF(@details, '');

-- ----------------------------------------------------------
-- tournament  (60 rows)
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/tournament.csv'
INTO TABLE tournament
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(TID, struct_ID, game_type_ID, organizer_PID, name, @reward,
 scheduled_at, max_participants, entry_elo_min, entry_elo_max, status)
SET reward = NULLIF(@reward, '');

-- ----------------------------------------------------------
-- participant  (100 rows)
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- game
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- game_player
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/game_player.csv'
INTO TABLE game_player
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(game_ID, PID, seat_no, score);

-- ----------------------------------------------------------
-- game_move
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/game_move.csv'
INTO TABLE game_move
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(move_ID, game_ID, actor_PID, move_no, move_notation, move_time);

-- ----------------------------------------------------------
-- game_history
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/game_history.csv'
INTO TABLE game_history
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(PID, GAME_ID, result, elo_change, elo_before, elo_after, play_duration_sec);

-- ----------------------------------------------------------
-- group_t
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- group_list
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/group_list.csv'
INTO TABLE group_list
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(GID, PID, role, joined_at, @invited_by)
SET invited_by = NULLIF(@invited_by, '');

-- ----------------------------------------------------------
-- friends
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/friends.csv'
INTO TABLE friends
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(PID1, PID2, since, status, requested_by);

-- ----------------------------------------------------------
-- leaderboard
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/leaderboard.csv'
INTO TABLE leaderboard
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(LID, PID, scope, scope_ref, rank_position, elo_snapshot, recorded_at);

-- ----------------------------------------------------------
-- notification
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/notification.csv'
INTO TABLE notification
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(NID, recipient_PID, type, @ref_id, content, @is_read, created_at)
SET
  ref_id  = NULLIF(@ref_id, ''),
  is_read = (@is_read = 'TRUE');

-- ----------------------------------------------------------
-- chat
-- ----------------------------------------------------------
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/chat.csv'
INTO TABLE chat
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(CID, PID1, PID2, created_at, @last_message_at, @is_archived)
SET
  last_message_at = NULLIF(@last_message_at, ''),
  is_archived     = (@is_archived = 'TRUE');

-- ----------------------------------------------------------
-- message
-- ----------------------------------------------------------
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

-- =============================================================
-- SECTION 6 — VERIFICATION
-- =============================================================

SHOW TABLES;

SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'game_tournament_db'
ORDER BY table_name;
