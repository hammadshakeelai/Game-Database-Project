# Normalization Walkthrough - Milestone 2

## Project
Gaming / Tournament Platform Database

## 1NF - First Normal Form

### Issue reviewed
First Normal Form requires each table to store atomic values, with no repeating groups or multi-valued fields. The original design included fixed player columns in the game table, such as `P1_ID` and `P2_ID`, and a `moves` attribute that could contain multiple moves in one field.

### Change made
- Replaced `GAME.P1_ID` and `GAME.P2_ID` with the junction table `game_player`.
- Replaced the multi-valued `GAME.moves` field with the table `game_move`.

### Justification
Each row now stores one fact. `game_player` stores one player per game per row, and `game_move` stores one move per row. This makes the schema atomic and flexible enough to support games with more than two participants.

## 2NF - Second Normal Form

### Issue reviewed
Second Normal Form requires every non-key attribute in a table with a composite primary key to depend on the whole key, not only part of it. This was reviewed for `participant`, `game_player`, `game_history`, `group_list`, and `friends`.

### Change made
- `participant` uses `(TID, PID)` as the composite primary key. Attributes such as `seed`, `enrolled_at`, `eliminated`, `final_rank`, and `prize_awarded` depend on the tournament-player pair.
- `game_player` uses `(game_ID, PID)` as the composite primary key. Attributes such as `seat_no` and `score` depend on the game-player pair.
- `game_history` uses `(PID, GAME_ID)` as the composite primary key. Attributes such as `result`, `elo_change`, `elo_before`, `elo_after`, and `play_duration_sec` depend on the player-game pair.
- `group_list` uses `(GID, PID)` as the composite primary key. Attributes such as `role`, `joined_at`, and `invited_by` describe the specific group membership.
- `friends` uses `(PID1, PID2)` as the composite primary key. Attributes such as `since`, `status`, and `requested_by` describe the relationship between the two players.

### Justification
No non-key attribute depends on only one part of a composite key. The non-key attributes describe the complete relationship represented by each composite key.

## 3NF - Third Normal Form

### Issue reviewed
Third Normal Form requires non-key attributes to depend only on the key, not on other non-key attributes. It also removes derived data that can be calculated from transactional records. The original player table included derived totals such as wins, losses, and draws.

### Change made
- Removed derived player totals from `player`.
- Kept game outcome and Elo movement in `game_history`.
- Kept tournament format details in `structure` instead of repeating them in `tournament`.
- Kept game type details in `gametype` instead of repeating them in `game` or `tournament`.
- Kept group membership details in `group_list` instead of repeating them in `player` or `group_t`.

### Justification
Derived values such as total wins, losses, and draws can be calculated from `game_history` using aggregate queries. Keeping game type, tournament structure, and membership facts in their own tables prevents update anomalies and keeps each fact stored in one place.

## Duplicate and Redundancy Review

### Issue reviewed
The schema was checked for repeated data, duplicate columns, and overlapping attributes.

### Changes made
- Removed fixed player columns from `game` and replaced them with `game_player`.
- Removed multi-valued move storage from `game` and replaced it with `game_move`.
- Removed derived player totals from `player`.
- Used unique constraints for natural unique values such as `player.email`, `gametype.type_name`, and `group_t.group_name`.

### Final result
The final schema satisfies 1NF, 2NF, and 3NF. Many-to-many relationships are resolved through junction tables, derived data is not stored as static columns, and the ERD matches the DDL scripts.
