# Milestone 3 — Dataset Preprocessing

## Dataset Type
This project uses structured synthetic data because no real production dataset was provided. The data was generated to realistically populate the normalized gaming/tournament database from Milestone 2.

## Step 1 — Prepare Your Dataset

### Cleaning and preprocessing applied
- Generated all primary keys using stable table-specific IDs, such as `P001`, `T001`, `G001`, and `MSG0001`.
- Removed duplicate risk by enforcing unique primary keys and unique composite keys during generation.
- Preserved referential integrity by creating parent tables first, then generating child-table foreign keys from existing parent IDs.
- Standardized dates and times in `YYYY-MM-DD HH:MM:SS` format.
- Standardized booleans as `TRUE` / `FALSE`.
- Standardized numeric columns as integers for Elo values, ranks, rounds, scores, durations, and counts.
- Required PK and FK fields are populated. Optional fields such as `media_url`, `reply_to`, `invited_by`, and `prize_awarded` may be blank when the relationship or value is not applicable.
- Repeated or derived fields were not added. For example, player win/loss totals are intentionally excluded because they can be calculated from `game_history`.

### Row-count summary
| Table | Rows |
|---|---:|
| `player` | 100 |
| `gametype` | 50 |
| `structure` | 50 |
| `tournament` | 60 |
| `participant` | 100 |
| `game` | 50 |
| `game_player` | 100 |
| `game_move` | 100 |
| `game_history` | 100 |
| `group_t` | 50 |
| `group_list` | 100 |
| `friends` | 80 |
| `leaderboard` | 100 |
| `notification` | 100 |
| `chat` | 50 |
| `message` | 100 |

All core tables contain between 50 and 100 rows.

## Step 2 — Dataflow

Data enters the system through user registration, game-type setup, tournament creation, gameplay activity, group/social activity, chat messages, and system notifications.

1. **Reference and user data enters first.**
   - `player` stores registered users and their account/profile information.
   - `gametype` stores available game modes.
   - `structure` stores tournament formats such as single elimination, round robin, or Swiss.

2. **Tournament data depends on those parent tables.**
   - `tournament` receives a selected `game_type_ID`, `struct_ID`, and `organizer_PID`.
   - A player can organize many tournaments, while each tournament has one organizer.
   - `participant` then links players to tournaments using the composite key `TID + PID`.

3. **Gameplay data flows from tournaments into games.**
   - `game` records each completed game and references its tournament, game type, and winning player.
   - `game_player` replaces the old fixed `P1_ID` and `P2_ID` pattern, allowing each game to have flexible player participation.
   - `game_move` stores individual moves separately instead of storing a move list inside `game`.
   - `game_history` stores the per-player result and Elo change for each game.

4. **Social data flows through groups and friendships.**
   - `group_t` stores player-created groups and references the owner player.
   - `group_list` connects players to groups and records roles, join dates, and optional inviter.
   - `friends` stores player-to-player relationship records using `PID1`, `PID2`, and `requested_by`.

5. **Communication and notification data flows through chat tables.**
   - `chat` stores one conversation between two players.
   - `message` stores all messages for a chat, including sender and optional reply references.
   - `notification` stores system messages delivered to players based on activity such as game results, friend requests, group invites, tournament invites, and rank updates.

6. **Outputs from the database.**
   - Tournament standings can be produced by joining `tournament`, `participant`, `game`, and `game_history`.
   - Player match history can be produced from `player`, `game_player`, `game`, and `game_history`.
   - Ranking reports can be produced from `leaderboard` and `player`.
   - Social/group reports can be produced from `group_t`, `group_list`, and `friends`.
   - Chat and notification feeds can be produced from `chat`, `message`, and `notification`.
   - Future AI or recommendation features can use `game_history`, `rank_elo`, `leaderboard`, and `gametype` activity as model inputs.

## Step 3 — Export Clean CSV Files

The following CSV files are included in this folder:

- `player.csv`
- `gametype.csv`
- `structure.csv`
- `tournament.csv`
- `participant.csv`
- `game.csv`
- `game_player.csv`
- `game_move.csv`
- `game_history.csv`
- `group_t.csv`
- `group_list.csv`
- `friends.csv`
- `leaderboard.csv`
- `notification.csv`
- `chat.csv`
- `message.csv`
- `dataset_manifest.csv`

## Recommended Load Order

1. `player.csv`
2. `gametype.csv`
3. `structure.csv`
4. `tournament.csv`
5. `participant.csv`
6. `game.csv`
7. `game_player.csv`
8. `game_move.csv`
9. `game_history.csv`
10. `group_t.csv`
11. `group_list.csv`
12. `friends.csv`
13. `leaderboard.csv`
14. `notification.csv`
15. `chat.csv`
16. `message.csv`
