# Relational Database Schema Description
## Super Tic-Tac-Toe Multiplayer Platform

---

## 1. Tables & Attributes

---

### 1.1 GAMETYPE
Defines the types/variants of the game that can be played.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| GT_ID | VARCHAR | **PK** | Unique identifier for the game type |
| type_name | VARCHAR | NOT NULL | Name of the game variant |

---

### 1.2 PLAYER
Stores all registered users of the platform.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| PID | VARCHAR | **PK** | Unique player identifier |
| first_name | VARCHAR | NOT NULL | Player's first name |
| last_name | VARCHAR | NOT NULL | Player's last name |
| Gmail | VARCHAR | UNIQUE, NOT NULL | Player's email address |
| rank_elo | INT | DEFAULT 1000 | Player's ELO rating / rank score |

---

### 1.3 GAME
Represents a single played game instance.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| ID | VARCHAR | **PK** | Unique game identifier |
| Game_type_ID | VARCHAR | **FK** → GAMETYPE(GT_ID) | The type/variant of the game |
| Tournament_ID | VARCHAR | **FK** → TOURNAMENT(TID), NULLABLE | Tournament this game belongs to (if any) |
| P1_ID | VARCHAR | **FK** → PLAYER(PID) | Player 1 |
| P2_ID | VARCHAR | **FK** → PLAYER(PID) | Player 2 |
| start_time | DATETIME | NOT NULL | When the game started |
| end_time | DATETIME | NULLABLE | When the game ended |
| moves | TEXT | NULLABLE | CSV-encoded move sequence |
| Winner | VARCHAR | **FK** → PLAYER(PID), NULLABLE | PID of the winner (NULL = draw) |
| Arena | VARCHAR | NULLABLE | Arena/board identifier |
| points | INT | DEFAULT 0 | Points awarded for this game |

---

### 1.4 GAME_HISTORY *(Junction Table)*
Resolves the M:N relationship between PLAYER and GAME.
Records every game a player has participated in.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| PID | VARCHAR | **PK, FK** → PLAYER(PID) | Participating player |
| GAME_ID | VARCHAR | **PK, FK** → GAME(ID) | Game played |

> **Composite PK:** (PID, GAME_ID)

---

### 1.5 TOURNAMENT
Represents a competitive tournament event.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| TID | VARCHAR | **PK** | Unique tournament identifier |
| struct_ID | VARCHAR | **FK** → STRUCTURE(struct_ID), UNIQUE | Bracket structure of the tournament |
| reward | VARCHAR | NULLABLE | Prize or reward description |
| time | DATETIME | NOT NULL | Scheduled start time |

---

### 1.6 STRUCTURE
Defines the bracket/format structure of a tournament.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| struct_ID | VARCHAR | **PK** | Unique structure identifier |
| details | TEXT | NULLABLE | Description of the bracket format |

---

### 1.7 PARTICIPANT *(Junction Table)*
Resolves the M:N relationship between PLAYER and TOURNAMENT.
Tracks which players are enrolled in which tournaments.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| TID | VARCHAR | **PK, FK** → TOURNAMENT(TID) | Tournament enrolled in |
| PID | VARCHAR | **PK, FK** → PLAYER(PID) | Enrolled player |

> **Composite PK:** (TID, PID)

---

### 1.8 FRIENDS *(Junction Table)*
Resolves the M:N self-referential relationship on PLAYER.
Represents a mutual friendship between two players.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| PID1 | VARCHAR | **PK, FK** → PLAYER(PID) | First player in the friendship |
| PID2 | VARCHAR | **PK, FK** → PLAYER(PID) | Second player in the friendship |

> **Composite PK:** (PID1, PID2)
> **Note:** To enforce symmetry, ensure PID1 < PID2 or handle both orderings at the application layer.

---

### 1.9 GROUP
Represents a player group or club on the platform.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| GID | VARCHAR | **PK** | Unique group identifier |
| group_name | VARCHAR | NOT NULL | Display name of the group |

---

### 1.10 GROUP_LIST *(Junction Table)*
Resolves the M:N relationship between PLAYER and GROUP.
Tracks group membership.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| GID | VARCHAR | **PK, FK** → GROUP(GID) | Group |
| PID | VARCHAR | **PK, FK** → PLAYER(PID) | Member player |

> **Composite PK:** (GID, PID)

---

### 1.11 CHAT
Represents a direct message thread between two players.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| CID | VARCHAR | **PK** | Unique chat thread identifier |
| PID1 | VARCHAR | **FK** → PLAYER(PID) | Initiating player |
| PID2 | VARCHAR | **FK** → PLAYER(PID) | Receiving player |

> **Note:** The pair (PID1, PID2) should be UNIQUE to prevent duplicate threads.

---

### 1.12 MESSAGE
Stores individual messages within a chat thread.

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| message_ID | VARCHAR | **PK** | Unique message identifier |
| CID | VARCHAR | **FK** → CHAT(CID) | Chat thread this message belongs to |
| text_additions | TEXT | NULLABLE | Text content of the message |
| media | VARCHAR | NULLABLE | URL or path to attached media |
| sent_at | DATETIME | DEFAULT NOW() | Timestamp of when message was sent |

---

## 2. Relationships Summary

| Relationship | Table A | Table B | Cardinality | Junction Table |
|---|---|---|---|---|
| Player plays Game | PLAYER | GAME | M:N | GAME_HISTORY |
| Player participates in Tournament | PLAYER | TOURNAMENT | M:N | PARTICIPANT |
| Player is friends with Player | PLAYER | PLAYER | M:N (self) | FRIENDS |
| Player belongs to Group | PLAYER | GROUP | M:N | GROUP_LIST |
| Player exchanges messages via Chat | PLAYER | CHAT | 1:M | — |
| GameType defines Game | GAMETYPE | GAME | 1:M | — |
| Tournament includes Game | TOURNAMENT | GAME | 1:M | — |
| Tournament has Structure | TOURNAMENT | STRUCTURE | 1:1 | — |
| Chat contains Message | CHAT | MESSAGE | 1:M | — |

---

## 3. Key Constraints Summary

| Table | Primary Key | Foreign Keys |
|---|---|---|
| GAMETYPE | GT_ID | — |
| PLAYER | PID | — |
| GAME | ID | Game_type_ID, Tournament_ID, P1_ID, P2_ID, Winner |
| GAME_HISTORY | (PID, GAME_ID) | PID, GAME_ID |
| TOURNAMENT | TID | struct_ID |
| STRUCTURE | struct_ID | — |
| PARTICIPANT | (TID, PID) | TID, PID |
| FRIENDS | (PID1, PID2) | PID1, PID2 |
| GROUP | GID | — |
| GROUP_LIST | (GID, PID) | GID, PID |
| CHAT | CID | PID1, PID2 |
| MESSAGE | message_ID | CID |

---

## 4. Referential Integrity Notes

- **GAME.Winner** is a nullable FK to PLAYER — NULL represents a draw or an in-progress game.
- **GAME.Tournament_ID** is nullable — not every game belongs to a tournament.
- **FRIENDS** is a symmetric relation. Enforce `PID1 ≠ PID2` via a CHECK constraint to prevent self-friendship.
- **CHAT** should enforce UNIQUE(PID1, PID2) to prevent duplicate direct-message threads between the same pair.
- **STRUCTURE** is in a mandatory 1:1 with TOURNAMENT — every tournament must have exactly one structure, enforced by the UNIQUE FK on `TOURNAMENT.struct_ID`.
- All junction table FKs should use `ON DELETE CASCADE` to maintain referential integrity when a parent record is removed.
