-- ============================================================
-- Super Tic-Tac-Toe Platform — MySQL Schema + Sample Data
-- Run this file in MySQL Workbench or CLI:
--   source /path/to/mysql_setup.sql
-- ============================================================

DROP DATABASE IF EXISTS super_ttt;
CREATE DATABASE super_ttt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE super_ttt;

-- ============================================================
-- TABLE CREATION (order matters: parents before children)
-- ============================================================

-- 1. GAMETYPE — no foreign keys, created first
CREATE TABLE GAMETYPE (
    GT_ID           VARCHAR(50)  PRIMARY KEY,
    type_name       VARCHAR(100) NOT NULL,
    description     TEXT,
    max_duration_sec INT,
    is_ranked       BOOLEAN      DEFAULT TRUE,
    board_size      INT          DEFAULT 9,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- 2. STRUCTURE — no foreign keys
CREATE TABLE STRUCTURE (
    struct_ID      VARCHAR(50) PRIMARY KEY,
    format_type    VARCHAR(100) NOT NULL,
    details        TEXT,
    rounds         INT,
    seeding_method VARCHAR(100)
);

-- 3. PLAYER — no foreign keys, root entity
CREATE TABLE PLAYER (
    PID           VARCHAR(50)  PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    Gmail         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rank_elo      INT          DEFAULT 1000,
    country       VARCHAR(100),
    avatar_url    VARCHAR(500),
    total_wins    INT          DEFAULT 0,
    total_losses  INT          DEFAULT 0,
    total_draws   INT          DEFAULT 0,
    last_active   DATETIME,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    is_active     BOOLEAN      DEFAULT TRUE
);

-- 4. GROUP_T — depends on PLAYER (owner)
CREATE TABLE GROUP_T (
    GID         VARCHAR(50)  PRIMARY KEY,
    group_name  VARCHAR(100) NOT NULL,
    description TEXT,
    owner_PID   VARCHAR(50)  NOT NULL,
    banner_url  VARCHAR(500),
    max_members INT          DEFAULT 50,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    is_public   BOOLEAN      DEFAULT TRUE,
    FOREIGN KEY (owner_PID) REFERENCES PLAYER(PID) ON DELETE CASCADE
);

-- 5. TOURNAMENT — depends on STRUCTURE, GAMETYPE, PLAYER
CREATE TABLE TOURNAMENT (
    TID            VARCHAR(50)  PRIMARY KEY,
    struct_ID      VARCHAR(50)  NOT NULL UNIQUE,
    name           VARCHAR(200) NOT NULL,
    reward         VARCHAR(500),
    time           DATETIME     NOT NULL,
    max_participants INT,
    entry_elo_min  INT          DEFAULT 0,
    entry_elo_max  INT          DEFAULT 9999,
    game_type_ID   VARCHAR(50),
    organizer_PID  VARCHAR(50),
    status         VARCHAR(50)  DEFAULT 'upcoming',
    FOREIGN KEY (struct_ID)     REFERENCES STRUCTURE(struct_ID)  ON DELETE RESTRICT,
    FOREIGN KEY (game_type_ID)  REFERENCES GAMETYPE(GT_ID)       ON DELETE SET NULL,
    FOREIGN KEY (organizer_PID) REFERENCES PLAYER(PID)           ON DELETE SET NULL
);

-- 6. GAME — depends on GAMETYPE, TOURNAMENT (nullable), PLAYER x3
CREATE TABLE GAME (
    ID             VARCHAR(50)  PRIMARY KEY,
    Game_type_ID   VARCHAR(50)  NOT NULL,
    Tournament_ID  VARCHAR(50),                        -- nullable: casual games have no tournament
    P1_ID          VARCHAR(50)  NOT NULL,
    P2_ID          VARCHAR(50)  NOT NULL,
    start_time     DATETIME     NOT NULL,
    end_time       DATETIME,
    moves          TEXT,
    Winner         VARCHAR(50),                        -- nullable: NULL = draw or in-progress
    Arena          VARCHAR(100),
    points         INT          DEFAULT 0,
    status         VARCHAR(50)  DEFAULT 'in_progress',
    spectator_count INT         DEFAULT 0,
    FOREIGN KEY (Game_type_ID)  REFERENCES GAMETYPE(GT_ID)    ON DELETE RESTRICT,
    FOREIGN KEY (Tournament_ID) REFERENCES TOURNAMENT(TID)    ON DELETE SET NULL,
    FOREIGN KEY (P1_ID)         REFERENCES PLAYER(PID)        ON DELETE RESTRICT,
    FOREIGN KEY (P2_ID)         REFERENCES PLAYER(PID)        ON DELETE RESTRICT,
    FOREIGN KEY (Winner)        REFERENCES PLAYER(PID)        ON DELETE SET NULL
);

-- 7. GAME_HISTORY — junction: PLAYER x GAME (M:N)
CREATE TABLE GAME_HISTORY (
    PID              VARCHAR(50) NOT NULL,
    GAME_ID          VARCHAR(50) NOT NULL,
    result           VARCHAR(20),                      -- 'win', 'loss', 'draw', 'forfeit'
    elo_change       INT         DEFAULT 0,
    elo_before       INT,
    elo_after        INT,
    play_duration_sec INT,
    PRIMARY KEY (PID, GAME_ID),
    FOREIGN KEY (PID)     REFERENCES PLAYER(PID) ON DELETE CASCADE,
    FOREIGN KEY (GAME_ID) REFERENCES GAME(ID)    ON DELETE CASCADE
);

-- 8. PARTICIPANT — junction: PLAYER x TOURNAMENT (M:N)
CREATE TABLE PARTICIPANT (
    TID           VARCHAR(50) NOT NULL,
    PID           VARCHAR(50) NOT NULL,
    seed          INT,
    enrolled_at   DATETIME    DEFAULT CURRENT_TIMESTAMP,
    eliminated    BOOLEAN     DEFAULT FALSE,
    final_rank    INT,
    prize_awarded VARCHAR(200),
    PRIMARY KEY (TID, PID),
    FOREIGN KEY (TID) REFERENCES TOURNAMENT(TID) ON DELETE CASCADE,
    FOREIGN KEY (PID) REFERENCES PLAYER(PID)     ON DELETE CASCADE
);

-- 9. FRIENDS — self-referential M:N on PLAYER
CREATE TABLE FRIENDS (
    PID1         VARCHAR(50) NOT NULL,
    PID2         VARCHAR(50) NOT NULL,
    since        DATETIME    DEFAULT CURRENT_TIMESTAMP,
    status       VARCHAR(20) DEFAULT 'pending',       -- 'pending', 'accepted', 'blocked'
    requested_by VARCHAR(50),
    PRIMARY KEY (PID1, PID2),
    FOREIGN KEY (PID1) REFERENCES PLAYER(PID) ON DELETE CASCADE,
    FOREIGN KEY (PID2) REFERENCES PLAYER(PID) ON DELETE CASCADE,
    CHECK (PID1 < PID2)                               -- enforces no duplicate (A,B) and (B,A)
);

-- 10. GROUP_LIST — junction: PLAYER x GROUP_T (M:N)
CREATE TABLE GROUP_LIST (
    GID        VARCHAR(50) NOT NULL,
    PID        VARCHAR(50) NOT NULL,
    role       VARCHAR(50) DEFAULT 'member',
    joined_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
    invited_by VARCHAR(50),
    PRIMARY KEY (GID, PID),
    FOREIGN KEY (GID)        REFERENCES GROUP_T(GID)  ON DELETE CASCADE,
    FOREIGN KEY (PID)        REFERENCES PLAYER(PID)   ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES PLAYER(PID)   ON DELETE SET NULL
);

-- 11. CHAT — one thread per unique player pair
CREATE TABLE CHAT (
    CID             VARCHAR(50) PRIMARY KEY,
    PID1            VARCHAR(50) NOT NULL,
    PID2            VARCHAR(50) NOT NULL,
    created_at      DATETIME    DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME,
    is_archived     BOOLEAN     DEFAULT FALSE,
    UNIQUE KEY unique_chat_pair (PID1, PID2),          -- prevent duplicate DM threads
    FOREIGN KEY (PID1) REFERENCES PLAYER(PID) ON DELETE CASCADE,
    FOREIGN KEY (PID2) REFERENCES PLAYER(PID) ON DELETE CASCADE
);

-- 12. MESSAGE — depends on CHAT and PLAYER; self-references for replies
CREATE TABLE MESSAGE (
    message_ID     VARCHAR(50) PRIMARY KEY,
    CID            VARCHAR(50) NOT NULL,
    sender_PID     VARCHAR(50) NOT NULL,
    text_additions TEXT,
    media          VARCHAR(500),
    sent_at        DATETIME    DEFAULT CURRENT_TIMESTAMP,
    is_read        BOOLEAN     DEFAULT FALSE,
    reply_to       VARCHAR(50),                        -- nullable self-reference
    FOREIGN KEY (CID)        REFERENCES CHAT(CID)       ON DELETE CASCADE,
    FOREIGN KEY (sender_PID) REFERENCES PLAYER(PID)     ON DELETE CASCADE,
    FOREIGN KEY (reply_to)   REFERENCES MESSAGE(message_ID) ON DELETE SET NULL
);

-- 13. LEADERBOARD — denormalized ranking snapshots for fast queries
CREATE TABLE LEADERBOARD (
    LID          VARCHAR(50) PRIMARY KEY,
    PID          VARCHAR(50) NOT NULL,
    scope        VARCHAR(50),                          -- 'global', 'tournament', 'group'
    scope_ref    VARCHAR(50),                          -- TID or GID if scoped
    rank_position INT,
    elo_snapshot  INT,
    recorded_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PID) REFERENCES PLAYER(PID) ON DELETE CASCADE
);

-- 14. NOTIFICATION — system messages to players
CREATE TABLE NOTIFICATION (
    NID           VARCHAR(50) PRIMARY KEY,
    recipient_PID VARCHAR(50) NOT NULL,
    type          VARCHAR(100),                        -- 'friend_request', 'game_result', etc.
    ref_id        VARCHAR(50),                         -- ID of related entity (game, tournament...)
    content       TEXT,
    is_read       BOOLEAN     DEFAULT FALSE,
    created_at    DATETIME    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_PID) REFERENCES PLAYER(PID) ON DELETE CASCADE
);


-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO GAMETYPE VALUES
('GT001', 'Classic 3x3', 'Standard Super Tic-Tac-Toe on 9x9 board', 600, TRUE, 9, NOW()),
('GT002', 'Blitz',       'Fast 3x3 with 60-second timer',             60,  TRUE, 9, NOW()),
('GT003', 'Casual',      'Unranked practice game',                    NULL,FALSE, 9, NOW());

INSERT INTO STRUCTURE VALUES
('S001', 'Single Elimination', 'Lose once and you are out',          3, 'random'),
('S002', 'Round Robin',        'Every player faces every other',     5, 'elo'),
('S003', 'Swiss',              '5 rounds, paired by current score',  5, 'elo');

INSERT INTO PLAYER (PID, first_name, last_name, Gmail, password_hash, rank_elo, country, is_active) VALUES
('P001', 'Alice',   'Smith',   'alice@gmail.com',   'hash_alice',   1350, 'US', TRUE),
('P002', 'Bob',     'Jones',   'bob@gmail.com',     'hash_bob',     1200, 'UK', TRUE),
('P003', 'Charlie', 'Brown',   'charlie@gmail.com', 'hash_charlie', 980,  'CA', TRUE),
('P004', 'Diana',   'Prince',  'diana@gmail.com',   'hash_diana',   1500, 'DE', TRUE),
('P005', 'Eve',     'Wilson',  'eve@gmail.com',     'hash_eve',     1100, 'AU', TRUE);

INSERT INTO GROUP_T (GID, group_name, description, owner_PID, is_public) VALUES
('G001', 'Pro Players',    'Top ranked competitive players', 'P004', TRUE),
('G002', 'Beginners Club', 'New players welcome',            'P003', TRUE);

INSERT INTO TOURNAMENT VALUES
('T001', 'S001', 'Spring Championship 2026', '$500 prize', '2026-06-15 14:00:00', 16, 1000, 9999, 'GT001', 'P004', 'upcoming'),
('T002', 'S002', 'Beginner Open',            'Trophy',     '2026-06-20 10:00:00', 8,  0,    1100, 'GT003', 'P003', 'upcoming');

INSERT INTO GAME (ID, Game_type_ID, Tournament_ID, P1_ID, P2_ID, start_time, end_time, Winner, Arena, points, status) VALUES
('GM001', 'GT001', NULL,   'P001', 'P002', '2026-05-01 10:00:00', '2026-05-01 10:12:00', 'P001', 'Arena_A', 25, 'completed'),
('GM002', 'GT001', 'T001', 'P001', 'P004', '2026-05-02 15:00:00', '2026-05-02 15:20:00', 'P004', 'Arena_B', 30, 'completed'),
('GM003', 'GT002', NULL,   'P002', 'P003', '2026-05-03 09:00:00', '2026-05-03 09:01:30', NULL,   'Arena_A', 10, 'completed'),  -- draw
('GM004', 'GT001', NULL,   'P003', 'P005', '2026-05-04 11:00:00', NULL,                  NULL,   'Arena_C', 0,  'in_progress');

INSERT INTO GAME_HISTORY VALUES
('P001', 'GM001', 'win',  +15, 1335, 1350, 720),
('P002', 'GM001', 'loss', -15, 1215, 1200, 720),
('P001', 'GM002', 'loss', -20, 1350, 1330, 1200),
('P004', 'GM002', 'win',  +20, 1480, 1500, 1200),
('P002', 'GM003', 'draw',  +5, 1195, 1200, 90),
('P003', 'GM003', 'draw',  +5, 975,   980, 90);

INSERT INTO PARTICIPANT (TID, PID, seed, enrolled_at) VALUES
('T001', 'P001', 2, '2026-05-10 08:00:00'),
('T001', 'P004', 1, '2026-05-10 08:30:00'),
('T002', 'P002', 1, '2026-05-11 09:00:00'),
('T002', 'P003', 2, '2026-05-11 09:15:00'),
('T002', 'P005', 3, '2026-05-11 09:30:00');

-- PID1 < PID2 enforced by CHECK constraint
INSERT INTO FRIENDS (PID1, PID2, since, status, requested_by) VALUES
('P001', 'P002', '2026-04-01 12:00:00', 'accepted', 'P001'),
('P001', 'P004', '2026-04-05 14:00:00', 'accepted', 'P004'),
('P002', 'P003', '2026-04-10 09:00:00', 'pending',  'P002');

INSERT INTO GROUP_LIST (GID, PID, role, joined_at) VALUES
('G001', 'P001', 'member', '2026-04-15 10:00:00'),
('G001', 'P004', 'admin',  '2026-04-01 08:00:00'),
('G002', 'P002', 'member', '2026-04-20 11:00:00'),
('G002', 'P003', 'admin',  '2026-04-01 08:00:00'),
('G002', 'P005', 'member', '2026-04-22 13:00:00');

INSERT INTO CHAT (CID, PID1, PID2, created_at, last_message_at) VALUES
('C001', 'P001', 'P002', '2026-05-01 11:00:00', '2026-05-01 11:30:00'),
('C002', 'P001', 'P004', '2026-05-02 16:00:00', '2026-05-02 16:45:00');

INSERT INTO MESSAGE (message_ID, CID, sender_PID, text_additions, sent_at, is_read) VALUES
('M001', 'C001', 'P001', 'Good game!',         '2026-05-01 11:00:00', TRUE),
('M002', 'C001', 'P002', 'Thanks, rematch?',   '2026-05-01 11:05:00', TRUE),
('M003', 'C001', 'P001', 'Sure, tomorrow!',    '2026-05-01 11:10:00', FALSE),
('M004', 'C002', 'P004', 'Nice try Alice :)',  '2026-05-02 16:00:00', TRUE),
('M005', 'C002', 'P001', 'I will win next time','2026-05-02 16:05:00', FALSE);

INSERT INTO LEADERBOARD (LID, PID, scope, rank_position, elo_snapshot, recorded_at) VALUES
('LB001', 'P004', 'global', 1, 1500, NOW()),
('LB002', 'P001', 'global', 2, 1350, NOW()),
('LB003', 'P002', 'global', 3, 1200, NOW()),
('LB004', 'P005', 'global', 4, 1100, NOW()),
('LB005', 'P003', 'global', 5,  980, NOW());

INSERT INTO NOTIFICATION (NID, recipient_PID, type, ref_id, content, is_read) VALUES
('N001', 'P002', 'friend_request', 'P003', 'Charlie sent you a friend request', FALSE),
('N002', 'P001', 'game_result',    'GM002', 'You lost to Diana. Elo: 1350 → 1330', TRUE),
('N003', 'P001', 'tournament',     'T001', 'Spring Championship starts June 15!', FALSE);


-- ============================================================
-- USEFUL QUERIES FOR THE VIVA
-- ============================================================

-- Q1: Full leaderboard sorted by ELO
SELECT PID, first_name, last_name, rank_elo, total_wins, total_losses, total_draws
FROM PLAYER
ORDER BY rank_elo DESC;

-- Q2: Match history for a player (Alice = P001) with ELO change
SELECT G.ID, G.start_time, G.end_time, GH.result, GH.elo_before, GH.elo_after, GH.elo_change
FROM GAME_HISTORY GH
JOIN GAME G ON GH.GAME_ID = G.ID
WHERE GH.PID = 'P001'
ORDER BY G.start_time DESC;

-- Q3: All players enrolled in a tournament with their seed
SELECT P.first_name, P.last_name, P.rank_elo, PA.seed, PA.enrolled_at
FROM PARTICIPANT PA
JOIN PLAYER P ON PA.PID = P.PID
WHERE PA.TID = 'T001'
ORDER BY PA.seed;

-- Q4: Friends list for Alice (P001) — both directions handled
SELECT
    CASE WHEN F.PID1 = 'P001' THEN F.PID2 ELSE F.PID1 END AS friend_PID,
    P.first_name, P.last_name, F.since, F.status
FROM FRIENDS F
JOIN PLAYER P ON P.PID = CASE WHEN F.PID1 = 'P001' THEN F.PID2 ELSE F.PID1 END
WHERE (F.PID1 = 'P001' OR F.PID2 = 'P001') AND F.status = 'accepted';

-- Q5: All messages in a chat thread between Alice and Bob
SELECT M.sent_at, P.first_name AS sender, M.text_additions
FROM MESSAGE M
JOIN PLAYER P ON M.sender_PID = P.PID
JOIN CHAT C   ON M.CID = C.CID
WHERE C.PID1 = 'P001' AND C.PID2 = 'P002'
ORDER BY M.sent_at;

-- Q6: Count games played, wins, losses per player (derived from GAME_HISTORY)
SELECT P.first_name, P.last_name,
    COUNT(*) AS total_games,
    SUM(GH.result = 'win')  AS wins,
    SUM(GH.result = 'loss') AS losses,
    SUM(GH.result = 'draw') AS draws
FROM GAME_HISTORY GH
JOIN PLAYER P ON GH.PID = P.PID
GROUP BY GH.PID, P.first_name, P.last_name
ORDER BY wins DESC;

-- Q7: Group members with their roles
SELECT GT.group_name, P.first_name, P.last_name, GL.role, GL.joined_at
FROM GROUP_LIST GL
JOIN GROUP_T GT ON GL.GID = GT.GID
JOIN PLAYER  P  ON GL.PID = P.PID
ORDER BY GT.group_name, GL.role;

-- Q8: All games in tournament T001 with winner names
SELECT G.ID, P1.first_name AS player1, P2.first_name AS player2,
       W.first_name AS winner, G.start_time, G.status
FROM GAME G
JOIN PLAYER P1 ON G.P1_ID  = P1.PID
JOIN PLAYER P2 ON G.P2_ID  = P2.PID
LEFT JOIN PLAYER W ON G.Winner = W.PID
WHERE G.Tournament_ID = 'T001';

-- Q9: Unread notifications for Alice
SELECT type, content, created_at
FROM NOTIFICATION
WHERE recipient_PID = 'P001' AND is_read = FALSE
ORDER BY created_at DESC;

-- Q10: Average ELO change per result type across all games
SELECT result, AVG(elo_change) AS avg_elo_change, COUNT(*) AS occurrences
FROM GAME_HISTORY
GROUP BY result;
