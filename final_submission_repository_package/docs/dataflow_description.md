# Milestone 3 - Dataset Preprocessing and Dataflow

## Dataset source
This repository uses synthetic but relationally consistent data generated for the normalized gaming/tournament schema. Data patterns emulate real platform events (registration, tournament operations, games, messaging, and notifications).

## Data entry sources by domain
1. **Player registration**
   - Source tables: `player`
   - Inputs: account fields, country, avatar URL, activity timestamps.
2. **Game and format setup**
   - Source tables: `gametype`, `structure`
   - Inputs: mode definitions, duration/rules, bracket/seeding strategies.
3. **Tournament lifecycle**
   - Source tables: `tournament`, `participant`
   - Inputs: organizer selection, tournament status, enrollment and ranking details.
4. **Gameplay records**
   - Source tables: `game`, `game_player`, `game_move`, `game_history`
   - Inputs: game timeline, participant seats, move logs, result and Elo deltas.
5. **Social graph and groups**
   - Source tables: `friends`, `group_t`, `group_list`
   - Inputs: friend requests/status, group ownership, membership and roles.
6. **Communication and alerts**
   - Source tables: `chat`, `message`, `notification`
   - Inputs: chat threads, message events, system notifications tied to activity.
7. **Ranking output**
   - Source table: `leaderboard`
   - Inputs: ranking snapshots by scope (`global`, `game_type`, `tournament`, `country`).

## Load dependency order (parent before child)
1. `player`, `gametype`, `structure`
2. `tournament`
3. `participant`, `group_t`, `friends`, `chat`, `leaderboard`, `notification`
4. `game`
5. `game_player`, `game_move`, `game_history`, `group_list`, `message`

This order ensures all foreign keys in child tables reference existing parent rows.

## Data quality checks applied
- **Primary-key uniqueness:** every PK is unique per table.
- **Composite-key uniqueness:** no duplicate `(TID, PID)`, `(game_ID, PID)`, `(GID, PID)`, `(PID1, PID2)`.
- **Foreign-key validity:** all FK values are drawn from existing parent IDs.
- **Time consistency:** timestamps use `YYYY-MM-DD HH:MM:SS`.
- **Required-column completeness:** no null PKs and no null required FKs.
- **Optional-field handling:** nullable fields (`reply_to`, `invited_by`, `media_url`, `prize_awarded`, etc.) are blank only when not applicable.
- **Business rule consistency:** Elo values stay in valid ranges, friendship rows avoid self-links, and per-game seat numbers remain unique.

## Analytical outputs supported
- Tournament standings from `tournament + participant + game + game_history`
- Player match history from `player + game_player + game + game_history`
- Rank reports from `leaderboard + player`
- Social summaries from `group_t + group_list + friends`
- Chat and notification feeds from `chat + message + notification`
