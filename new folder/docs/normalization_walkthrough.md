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

---

## Comprehensive Table-by-Table Normalization Review

This section explicitly documents the normalization status of all 16 tables in the final schema.

### Tables Requiring Normalization Changes (addressed above)

| Table | 1NF Status | 2NF Status | 3NF Status | Action Taken |
|-------|-----------|-----------|-----------|------------|
| `game` | ❌ Violated (P1_ID, P2_ID fixed columns; moves CSV) | ✓ N/A | ✓ N/A | Removed P1_ID/P2_ID; replaced with `game_player`; replaced moves with `game_move` |
| `participant` | ✓ Atomic | ❌ Violated (non-key attrs depend on full key) | ✓ Yes | All non-key attributes now depend on full (TID, PID) composite key |
| `game_player` | ✓ Atomic | ❌ Violated (non-key attrs depend on full key) | ✓ Yes | All non-key attributes now depend on full (game_ID, PID) composite key |
| `game_history` | ✓ Atomic | ❌ Violated (non-key attrs depend on full key) | ✓ Yes | All non-key attributes now depend on full (PID, GAME_ID) composite key |
| `group_list` | ✓ Atomic | ❌ Violated (non-key attrs depend on full key) | ✓ Yes | All non-key attributes now depend on full (GID, PID) composite key |
| `friends` | ✓ Atomic | ❌ Violated (non-key attrs depend on full key) | ✓ Yes | All non-key attributes now depend on full (PID1, PID2) composite key |
| `player` | ✓ Atomic | ✓ Yes (single PK) | ❌ Violated (had derived wins/losses) | Removed derived totals; kept only independent attributes |

### Tables Already in 3NF (no changes needed)

| Table | Justification |
|-------|-------------|
| `gametype` | Single primary key (GT_ID). All attributes (type_name, description, max_duration_sec, is_ranked, board_size) depend only on GT_ID and do not depend on other non-key attributes. No derived data. ✓ 1NF ✓ 2NF ✓ 3NF |
| `structure` | Single primary key (struct_ID). All attributes (format_type, details, rounds, seeding_method) depend only on struct_ID. No derived data. ✓ 1NF ✓ 2NF ✓ 3NF |
| `tournament` | Single primary key (TID). All non-key attributes (struct_ID, game_type_ID, organizer_PID, name, reward, scheduled_at, max_participants, entry_elo_min, entry_elo_max, status) depend only on TID. Foreign key references point to independent lookup tables, not other non-key attributes. ✓ 1NF ✓ 2NF ✓ 3NF |
| `game` | Single primary key (game_ID). After removing P1_ID/P2_ID and moves, all attributes (game_type_ID, tournament_ID, winner_PID, arena, start_time, end_time, status, spectator_count) depend only on game_ID. No derived data. ✓ 1NF ✓ 2NF ✓ 3NF |
| `game_move` | Single primary key (move_ID). All attributes (game_ID, actor_PID, move_no, move_notation, move_time) depend only on move_ID. No derived data. ✓ 1NF ✓ 2NF ✓ 3NF |
| `group_t` | Single primary key (GID). All attributes (group_name, description, owner_PID, banner_url, max_members, created_at, is_public) depend only on GID. Owner_PID is an independent reference, not a derived value. ✓ 1NF ✓ 2NF ✓ 3NF |
| `chat` | Single primary key (CID). All attributes (PID1, PID2, created_at, last_message_at, is_archived) depend only on CID. Neither PID1 nor PID2 is derived; they identify the two participants in this conversation. ✓ 1NF ✓ 2NF ✓ 3NF |
| `message` | Single primary key (message_ID). All attributes (CID, sender_PID, text_content, media_url, sent_at, is_read, reply_to) depend only on message_ID. reply_to is an optional reference to another message, not a derived value. ✓ 1NF ✓ 2NF ✓ 3NF |
| `leaderboard` | Single primary key (LID). All attributes (PID, scope, scope_ref, rank_position, elo_snapshot, recorded_at) depend only on LID. Rank_position and elo_snapshot are snapshots in time, not derived totals; they represent facts at the moment of ranking calculation. ✓ 1NF ✓ 2NF ✓ 3NF |
| `notification` | Single primary key (NID). All attributes (recipient_PID, type, ref_id, content, is_read, created_at) depend only on NID. No derived data. ✓ 1NF ✓ 2NF ✓ 3NF |

### Summary

**Total tables: 16**
- **Tables with normalization changes: 7** (game, participant, game_player, game_history, group_list, friends, player)
- **Tables already in 3NF (no changes needed): 9** (gametype, structure, tournament, game_move, group_t, chat, message, leaderboard, notification)

All 16 tables satisfy 1NF, 2NF, and 3NF in the final schema. Changes were necessary only for tables that violated normal forms or contained derived data. All other tables were verified to require no changes.
