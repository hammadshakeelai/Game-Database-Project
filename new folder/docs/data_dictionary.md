# Data Dictionary — Gaming & Tournament Platform Database

Comprehensive documentation of all tables, columns, constraints, and relationships in the `game_tournament_db` database.

---

## Table of Contents
1. [Core Tables](#core-tables)
2. [Lookup Tables](#lookup-tables)
3. [Junction Tables](#junction-tables)
4. [Transactional Tables](#transactional-tables)
5. [Social Tables](#social-tables)
6. [Ranking & Notification Tables](#ranking--notification-tables)

---

## CORE TABLES

### **PLAYER**
Stores registered user accounts with profile and competitive information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `PID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Unique player identifier (e.g., P001, P100) |
| `first_name` | VARCHAR(50) | NOT NULL | Player's first name |
| `last_name` | VARCHAR(50) | NOT NULL | Player's last name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email address, must be unique across all players |
| `password_hash` | VARCHAR(255) | NOT NULL | Hashed password (never store plain text) |
| `rank_elo` | INT | NOT NULL, DEFAULT 1200, CHECK (0-5000) | Competitive ranking using Elo system; default 1200, range 0-5000 |
| `country` | VARCHAR(80) | OPTIONAL | Player's country of origin |
| `avatar_url` | VARCHAR(500) | OPTIONAL | URL to player's profile avatar image |
| `last_active` | DATETIME | OPTIONAL | Timestamp of last platform activity |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether account is active (false = suspended/deleted) |

**Indexes:**
- `idx_player_email` (email)
- `idx_player_rank_elo` (rank_elo DESC)
- `idx_player_is_active` (is_active)
- `idx_player_created_at` (created_at)

**Example:** Player "Ava Khan" registers with email "ava.khan1@example.com", starting Elo 1200, from Japan.

---

## LOOKUP TABLES

### **GAMETYPE**
Defines available game modes and their properties.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `GT_ID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Game type identifier (e.g., GT001, GT_3x3) |
| `type_name` | VARCHAR(100) | NOT NULL, UNIQUE | Human-readable game name (e.g., "3x3 Super Tic-Tac-Toe") |
| `description` | TEXT | OPTIONAL | Full description of game rules and mechanics |
| `max_duration_sec` | INT | NOT NULL, CHECK (>0) | Maximum game length in seconds |
| `is_ranked` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether playing this type affects Elo rating |
| `board_size` | VARCHAR(20) | NOT NULL | Board/grid dimensions (e.g., "3x3", "5x5", "custom") |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When this game type was added to system |

**Indexes:**
- `idx_gametype_type_name` (type_name)
- `idx_gametype_is_ranked` (is_ranked)

**Example:** "3x3 Super Tic-Tac-Toe" with 600 sec limit, ranked, board_size "3x3".

---

### **STRUCTURE**
Defines tournament formats and structure rules.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `struct_ID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Structure identifier (e.g., SE001, RR001) |
| `format_type` | VARCHAR(50) | NOT NULL, CHECK (IN allowed values) | Tournament format: single_elimination, double_elimination, round_robin, swiss, league, ladder |
| `details` | TEXT | OPTIONAL | Detailed rules and procedural notes |
| `rounds` | INT | NOT NULL, CHECK (>0) | Number of rounds (e.g., 4 rounds for single elimination with 16 players) |
| `seeding_method` | VARCHAR(50) | NOT NULL, CHECK (IN allowed values) | How players are seeded: random, elo_based, manual, regional, balanced |

**Indexes:**
- `idx_structure_format_type` (format_type)

**Example:** Single elimination format with 4 rounds, Elo-based seeding.

---

### **TOURNAMENT**
Represents a specific tournament instance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `TID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Tournament identifier (e.g., T001, MAJOR2026) |
| `struct_ID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References structure.struct_ID (which format is used) |
| `game_type_ID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References gametype.GT_ID (which game is played) |
| `organizer_PID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References player.PID (who created/runs the tournament) |
| `name` | VARCHAR(255) | NOT NULL | Tournament name (e.g., "Spring Championship 2026") |
| `reward` | TEXT | OPTIONAL | Prize description (e.g., "Trophy + $1000 prize pool") |
| `scheduled_at` | DATETIME | NOT NULL | Planned start time of tournament |
| `max_participants` | INT | NOT NULL, CHECK (>1) | Maximum number of players allowed |
| `entry_elo_min` | INT | OPTIONAL, CHECK (0-5000) | Minimum Elo rating required to enter (NULL = no minimum) |
| `entry_elo_max` | INT | OPTIONAL, CHECK (0-5000) | Maximum Elo rating allowed (NULL = no maximum) |
| `status` | VARCHAR(50) | NOT NULL, CHECK (IN allowed values) | Current state: scheduled, in_progress, completed, cancelled, on_hold |

**Indexes:**
- `idx_tournament_struct_ID` (struct_ID)
- `idx_tournament_game_type_ID` (game_type_ID)
- `idx_tournament_organizer_PID` (organizer_PID)
- `idx_tournament_scheduled_at` (scheduled_at)
- `idx_tournament_status` (status)

**Example:** "Spring Championship 2026" scheduled for 2026-06-01, single elimination format, 3x3 game, Elo 1000-2000 range.

---

## JUNCTION TABLES

### **PARTICIPANT**
Maps players to tournaments (many-to-many). Tracks each player's participation details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `TID` | VARCHAR(10) | PRIMARY KEY (part 1), FOREIGN KEY | References tournament.TID |
| `PID` | VARCHAR(10) | PRIMARY KEY (part 2), FOREIGN KEY | References player.PID |
| `seed` | INT | OPTIONAL, CHECK (>0) | Tournament seed number (1 = top seed, higher = weaker seed) |
| `enrolled_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When player joined tournament |
| `eliminated` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether player was eliminated (loses elimination tournaments) |
| `final_rank` | INT | OPTIONAL, CHECK (>0) | Final placement (1st, 2nd, etc.). NULL until tournament ends |
| `prize_awarded` | DECIMAL(10,2) | OPTIONAL, CHECK (>=0) | Prize money or points awarded. NULL if no prize |

**Indexes:**
- `idx_participant_TID` (TID)
- `idx_participant_PID` (PID)

**Example:** Player P001 seeds #2 in tournament T001, not yet eliminated, NULL final_rank until tournament completes.

---

### **GAME_PLAYER**
Maps players to games (many-to-many). Replaces old fixed P1_ID, P2_ID columns.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `game_ID` | VARCHAR(10) | PRIMARY KEY (part 1), FOREIGN KEY | References game.game_ID |
| `PID` | VARCHAR(10) | PRIMARY KEY (part 2), FOREIGN KEY | References player.PID |
| `seat_no` | INT | NOT NULL, CHECK (>0) | Player's board position (1, 2, 3...). Unique per game |
| `score` | INT | NOT NULL, DEFAULT 0, CHECK (>=0) | Player's final score in this game |

**Indexes:**
- `idx_game_player_game_ID` (game_ID)
- `idx_game_player_PID` (PID)
- UNIQUE INDEX on (game_ID, seat_no)

**Example:** In game G001, player P001 sits at seat 1 with score 8; player P002 sits at seat 2 with score 5.

---

### **GAME_HISTORY**
Records per-player results and Elo changes for each game.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `PID` | VARCHAR(10) | PRIMARY KEY (part 1), FOREIGN KEY | References player.PID |
| `GAME_ID` | VARCHAR(10) | PRIMARY KEY (part 2), FOREIGN KEY | References game.game_ID |
| `result` | VARCHAR(20) | NOT NULL, CHECK (IN allowed values) | Outcome: win, loss, draw, forfeit, bye |
| `elo_change` | INT | NOT NULL, CHECK (-200 to 200) | Elo points gained/lost (+ for win, - for loss) |
| `elo_before` | INT | NOT NULL, CHECK (0-5000) | Player's Elo rating before game |
| `elo_after` | INT | NOT NULL, CHECK (0-5000) | Player's Elo rating after game |
| `play_duration_sec` | INT | OPTIONAL, CHECK (>0) | How long player was actively playing (in seconds) |

**Indexes:**
- `idx_game_history_PID` (PID)
- `idx_game_history_GAME_ID` (GAME_ID)

**Example:** Player P001 won game G001, gained +25 Elo (1200→1225), played for 360 seconds.

---

### **GROUP_LIST**
Maps players to groups (many-to-many). Tracks membership, roles, and inviter.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `GID` | VARCHAR(10) | PRIMARY KEY (part 1), FOREIGN KEY | References group_t.GID |
| `PID` | VARCHAR(10) | PRIMARY KEY (part 2), FOREIGN KEY | References player.PID |
| `role` | VARCHAR(50) | NOT NULL, CHECK (IN allowed values) | Role in group: owner, admin, moderator, member |
| `joined_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When player joined group |
| `invited_by` | VARCHAR(10) | OPTIONAL, FOREIGN KEY | References player.PID (who invited them) |

**Indexes:**
- `idx_group_list_GID` (GID)
- `idx_group_list_PID` (PID)

**Example:** Player P005 joined group G001 as "member" on 2026-05-01, invited by P001 (owner).

---

### **FRIENDS**
Bidirectional friendship relationship between players.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `PID1` | VARCHAR(10) | PRIMARY KEY (part 1), FOREIGN KEY, CHECK (PID1 <> PID2) | First player in friendship pair |
| `PID2` | VARCHAR(10) | PRIMARY KEY (part 2), FOREIGN KEY, CHECK (PID1 <> PID2) | Second player in friendship pair (PID1 < PID2 to avoid duplicates) |
| `since` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When friendship was established |
| `status` | VARCHAR(20) | NOT NULL, CHECK (IN allowed values), DEFAULT 'accepted' | Status: pending, accepted, blocked |
| `requested_by` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References player.PID (who initiated the request) |

**Indexes:**
- `idx_friends_PID1` (PID1)
- `idx_friends_PID2` (PID2)
- `idx_friends_status` (status)

**Example:** Player P001 sent friend request to P005; status still 'pending'; requested_by = P001.

---

## TRANSACTIONAL TABLES

### **GAME**
Records a completed game instance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `game_ID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Unique game identifier (e.g., G001, GAME_2026_001) |
| `game_type_ID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References gametype.GT_ID (which game was played) |
| `tournament_ID` | VARCHAR(10) | OPTIONAL, FOREIGN KEY | References tournament.TID (NULL if casual game) |
| `winner_PID` | VARCHAR(10) | OPTIONAL, FOREIGN KEY | References player.PID (NULL if draw or not yet determined) |
| `arena` | VARCHAR(100) | OPTIONAL | Location/server where game was played |
| `start_time` | DATETIME | NOT NULL | When game started |
| `end_time` | DATETIME | OPTIONAL | When game ended (NULL if still in progress) |
| `status` | VARCHAR(50) | NOT NULL, CHECK (IN allowed values) | Current state: pending, in_progress, completed, abandoned, dispute |
| `spectator_count` | INT | NOT NULL, DEFAULT 0, CHECK (>=0) | Number of players watching (not playing) |

**Indexes:**
- `idx_game_game_type_ID` (game_type_ID)
- `idx_game_tournament_ID` (tournament_ID)
- `idx_game_winner_PID` (winner_PID)
- `idx_game_start_time` (start_time)
- `idx_game_status` (status)

**Example:** Game G001 of type GT_3x3, tournament T001, started 2026-05-17 14:00, completed with winner P001, 5 spectators.

---

### **GAME_MOVE**
Individual move record in a game. Replaces old CSV "moves" field.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `move_ID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Unique move identifier (e.g., MOVE001, G001_M001) |
| `game_ID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References game.game_ID |
| `actor_PID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References player.PID (who made the move) |
| `move_no` | INT | NOT NULL, CHECK (>0) | Sequence number (1st move, 2nd move, etc.). Unique per game |
| `move_notation` | VARCHAR(100) | NOT NULL | Move description (e.g., "place X at C2", "attack bishop") |
| `move_time` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When move was executed |

**Indexes:**
- `idx_game_move_game_ID` (game_ID)
- `idx_game_move_actor_PID` (actor_PID)
- UNIQUE INDEX on (game_ID, move_no)

**Example:** In game G001, player P001 makes move #1 "place X at C2" at 14:05.

---

## SOCIAL TABLES

### **GROUP_T**
Represents a player-created group or community.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `GID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Group identifier (e.g., G001, TEAM_Alpha) |
| `group_name` | VARCHAR(255) | NOT NULL, UNIQUE | Name of group (e.g., "Dragon Slayers", "Casual Players") |
| `description` | TEXT | OPTIONAL | Group purpose and description |
| `owner_PID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References player.PID (who created the group) |
| `banner_url` | VARCHAR(500) | OPTIONAL | URL to group banner/icon image |
| `max_members` | INT | NOT NULL, DEFAULT 100, CHECK (>0) | Maximum members allowed in group |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When group was created |
| `is_public` | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether group is public (discoverable) or private (invite-only) |

**Indexes:**
- `idx_group_t_owner_PID` (owner_PID)
- `idx_group_t_group_name` (group_name)
- `idx_group_t_is_public` (is_public)

**Example:** "Dragon Slayers" group created by P001, public, max 50 members.

---

### **CHAT**
Represents a direct message conversation between two players.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `CID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Chat conversation identifier (e.g., C001, CH_P001_P002) |
| `PID1` | VARCHAR(10) | NOT NULL, FOREIGN KEY | First participant (player PID) |
| `PID2` | VARCHAR(10) | NOT NULL, FOREIGN KEY | Second participant (player PID). PID1 < PID2 to avoid duplicates |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When chat conversation started |
| `last_message_at` | DATETIME | OPTIONAL | Timestamp of most recent message |
| `is_archived` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether chat is archived (hidden but preserved) |

**Indexes:**
- `idx_chat_PID1` (PID1)
- `idx_chat_PID2` (PID2)
- UNIQUE INDEX on (PID1, PID2)

**Example:** Chat C001 between players P001 and P005, started 2026-05-10, not archived.

---

### **MESSAGE**
Individual message in a chat conversation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `message_ID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Unique message identifier (e.g., MSG0001, M001_001) |
| `CID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References chat.CID (which conversation) |
| `sender_PID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References player.PID (who sent message) |
| `text_content` | TEXT | NOT NULL | Message body text |
| `media_url` | VARCHAR(500) | OPTIONAL | URL to attached media (image, video, etc.) |
| `sent_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When message was sent |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether recipient has read message |
| `reply_to` | VARCHAR(10) | OPTIONAL, FOREIGN KEY | References message.message_ID (threading) |

**Indexes:**
- `idx_message_CID` (CID)
- `idx_message_sender_PID` (sender_PID)
- `idx_message_is_read` (is_read)

**Example:** Message MSG0001 in chat C001 from P001: "Hey, want to play tomorrow?" sent 2026-05-17 15:30, unread.

---

## RANKING & NOTIFICATION TABLES

### **LEADERBOARD**
Denormalized ranking snapshot. Updated periodically (e.g., daily or after each tournament).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `LID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Leaderboard entry identifier (e.g., L001, LB_2026_001) |
| `PID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References player.PID |
| `scope` | VARCHAR(50) | NOT NULL, CHECK (IN allowed values) | Ranking scope: global, monthly, weekly, by_game_type, by_country |
| `scope_ref` | VARCHAR(100) | OPTIONAL | Reference for scope (e.g., game_type_ID, country name) |
| `rank_position` | INT | NOT NULL, CHECK (>0) | Rank number (1 = top, 2 = 2nd, etc.) |
| `elo_snapshot` | INT | NOT NULL, CHECK (0-5000) | Elo rating at time of ranking |
| `recorded_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When this ranking was calculated |

**Indexes:**
- `idx_leaderboard_PID` (PID)
- `idx_leaderboard_scope` (scope, scope_ref)
- `idx_leaderboard_rank_position` (rank_position)
- `idx_leaderboard_recorded_at` (recorded_at)

**Example:** Global leaderboard entry: Player P001 ranked #1 with Elo 2185, recorded 2026-05-17.

---

### **NOTIFICATION**
System notification for player events (friend requests, game results, rank changes, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `NID` | VARCHAR(10) | PRIMARY KEY, NOT NULL | Notification identifier (e.g., N0001, NOTIF_001) |
| `recipient_PID` | VARCHAR(10) | NOT NULL, FOREIGN KEY | References player.PID (who receives notification) |
| `type` | VARCHAR(50) | NOT NULL, CHECK (IN allowed values) | Notification category: friend_request, game_result, tournament_invite, rank_update, group_invite, message_received, system_alert |
| `ref_id` | VARCHAR(100) | OPTIONAL | Reference ID (e.g., game_ID, friend_PID, tournament_ID) for contextual link |
| `content` | TEXT | NOT NULL | Notification message to display |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether recipient has viewed notification |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When notification was generated |

**Indexes:**
- `idx_notification_recipient_PID` (recipient_PID)
- `idx_notification_type` (type)
- `idx_notification_is_read` (is_read)
- `idx_notification_created_at` (created_at)

**Example:** Notification N0001 to player P002: "P001 sent you a friend request", type=friend_request, unread.

---

## Relationship Overview

```
PLAYER (core identity)
├── GAME_HISTORY → GAME (track results)
├── PARTICIPANT → TOURNAMENT (enroll in events)
├── GAME_PLAYER → GAME (participate in games)
├── GAME_MOVE ← GAME (track moves)
├── FRIENDS ↔ PLAYER (bidirectional relationships)
├── GROUP_T (own groups)
├── GROUP_LIST → GROUP_T (join groups)
├── CHAT ↔ PLAYER (direct messaging)
├── MESSAGE ← CHAT (send messages)
├── LEADERBOARD (ranked)
└── NOTIFICATION (receive alerts)

TOURNAMENT
├── STRUCTURE (format rules)
├── GAMETYPE (game selection)
└── PARTICIPANT → PLAYER (player enrollment)
```

---

## Data Constraints Summary

| Type | Examples |
|------|----------|
| **Primary Keys** | Every table has single or composite PK |
| **Foreign Keys** | 20+ referential constraints with CASCADE rules |
| **UNIQUE** | player.email, gametype.type_name, group_t.group_name, (chat.PID1, chat.PID2) |
| **NOT NULL** | All ID and core attribute columns |
| **CHECK** | Elo ranges, status enumerations, positive counts/positions |
| **Indexes** | 38 total (PK, FK, frequently queried columns) |

---

## Best Practices for Using This Database

1. **Always join through junction tables** for M:M relationships (don't assume 1:1)
2. **Verify FK constraints** before deleting parent records
3. **Use player.rank_elo for queries**, not aggregate calculations (already maintained)
4. **Archive chat/notifications** instead of deleting to preserve history
5. **Check is_active** when querying players (may include suspended accounts)
6. **Query game_history for results**, not game.winner_PID alone (gives full context)
7. **Use leaderboard for rankings** (denormalized for performance)
8. **Validate Elo bounds** in application code (0-5000 range)
