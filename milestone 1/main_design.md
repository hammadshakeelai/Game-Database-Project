# Super Tic-Tac-Toe Database Design (Milestone 1)

## System overview
This project models a competitive gaming platform where players join tournaments, play games, exchange messages, receive notifications, and participate in groups. The schema is normalized so each table stores one type of fact and many-to-many relationships are handled through junction tables.

## Actors and key workflows
- **Player**: registers, joins tournaments, plays games, sends chat messages, joins groups.
- **Organizer**: creates tournaments and manages participation.
- **System**: records game history, updates notifications, and produces leaderboard snapshots.

## Entity summary
| Entity | Purpose | Key attributes |
|---|---|---|
| `player` | User accounts and profile state | `PID`, `email`, `rank_elo`, `last_active`, `is_active` |
| `gametype` | Lookup of supported game modes | `GT_ID`, `type_name`, `max_duration_sec`, `is_ranked` |
| `structure` | Tournament format rules | `struct_ID`, `format_type`, `rounds`, `seeding_method` |
| `tournament` | Tournament instance and configuration | `TID`, `struct_ID`, `game_type_ID`, `organizer_PID`, `status` |
| `participant` | Player enrollment in tournaments | `TID`, `PID`, `seed`, `final_rank`, `eliminated` |
| `game` | Individual matches linked to tournaments | `game_ID`, `game_type_ID`, `tournament_ID`, `winner_PID`, `status` |
| `game_player` | Player participation per game | `game_ID`, `PID`, `seat_no`, `score` |
| `game_move` | Atomic move records per game | `move_ID`, `game_ID`, `actor_PID`, `move_no`, `move_notation` |
| `game_history` | Player outcome and Elo movement per game | `PID`, `GAME_ID`, `result`, `elo_before`, `elo_after`, `elo_change` |
| `group_t` | User-created groups | `GID`, `group_name`, `owner_PID`, `max_members` |
| `group_list` | Group membership records | `GID`, `PID`, `role`, `joined_at`, `invited_by` |
| `friends` | Friendship relationships between players | `PID1`, `PID2`, `status`, `requested_by` |
| `leaderboard` | Ranking snapshots by scope | `LID`, `PID`, `scope`, `rank_position`, `elo_snapshot` |
| `chat` | Direct conversation between two players | `CID`, `PID1`, `PID2`, `last_message_at` |
| `message` | Messages inside a chat | `message_ID`, `CID`, `sender_PID`, `text_content`, `reply_to` |
| `notification` | Activity alerts sent to players | `NID`, `recipient_PID`, `type`, `content`, `is_read` |

## Relationship summary
- `player` ↔ `tournament` through `participant`.
- `game` ↔ `player` through `game_player`.
- `game` ↔ moves through `game_move`.
- `player` ↔ `game` outcome history through `game_history`.
- `group_t` ↔ `player` through `group_list`.
- `chat` stores the player pair and `message` stores per-chat messages.

## Required vs optional attributes
- **Required examples:** `player.email`, `tournament.struct_ID`, `game.game_type_ID`, `message.sender_PID`.
- **Optional examples:** `game.tournament_ID` (casual game), `group_list.invited_by`, `message.reply_to`, `notification.ref_id`.

## Derived values intentionally not stored
The design does not store static totals such as player wins/losses/draws. These are derived from `game_history` via aggregate queries to avoid redundancy and update anomalies.
