# Normalization Walkthrough - Milestone 2

## Project
Gaming / Tournament Platform Database

## 1NF - First Normal Form

### Old problem
The early design violated atomicity by storing repeating values in single rows:
- `game` had fixed player columns (`P1_ID`, `P2_ID`) even though participation is a repeating set.
- `game` had a `moves` field that stored multiple actions in one attribute.

### Table change applied
- Introduced `game_player (game_ID, PID, seat_no, score)` to model one player-per-game per row.
- Introduced `game_move (move_ID, game_ID, actor_PID, move_no, move_notation, move_time)` to model one move-per-row.

### Why the new design is better
Each column now stores one atomic value and each row represents one fact. The model supports any number of participants and moves without schema changes.

## 2NF - Second Normal Form

### Old problem
Composite-key tables are only in 2NF when every non-key attribute depends on the full composite key, not one part of it.

### Table changes reviewed
- `participant (TID, PID)`: `seed`, `enrolled_at`, `eliminated`, `final_rank`, `prize_awarded` depend on the tournament-player pair.
- `game_player (game_ID, PID)`: `seat_no` and `score` depend on the game-player pair.
- `game_history (PID, GAME_ID)`: result and Elo movement fields depend on the player-game pair.
- `group_list (GID, PID)`: `role`, `joined_at`, `invited_by` depend on specific group membership.
- `friends (PID1, PID2)`: `since`, `status`, `requested_by` depend on the relationship pair.

### Why the new design is better
No partial dependency remains. Attributes describe the whole relationship represented by each junction row, preventing partial-update anomalies.

## 3NF - Third Normal Form

### Old problem
The initial player design included derived totals (`wins`, `losses`, `draws`), which creates transitive/derived redundancy and inconsistency risk.

### Table change applied
- Removed derived totals from `player`.
- Kept match outcomes and Elo deltas in `game_history`.
- Kept format/type metadata in lookup tables (`structure`, `gametype`) instead of repeating details in transaction tables.

### Why the new design is better
Every non-key attribute depends directly on its key. Derived statistics are calculated from `game_history` when needed, so there is one source of truth and fewer update anomalies.

## Duplicate and Redundancy Review

### Old problem
Redundant patterns in the early schema caused repeated data and difficult updates.

### Table change applied
- Replaced fixed player columns in `game` with `game_player`.
- Replaced multi-valued move storage with `game_move`.
- Removed derived player totals.
- Enforced uniqueness where needed (`player.email`, `gametype.type_name`, `group_t.group_name`).

### Final result
The schema satisfies 1NF, 2NF, and 3NF. Many-to-many relationships are handled by junction tables, derived data is query-time computed, and naming aligns with the Milestone 4 DDL.
