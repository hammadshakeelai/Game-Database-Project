# MySQL Workbench Verification Checklist

## 1. Run the DDL Script
1. Open MySQL Workbench.
2. Connect to your MySQL server.
3. Open `milestone4_ddl.sql`.
4. Run the entire script.
5. Confirm that the script completes without errors.

## 2. Confirm Tables Were Created
Run:

```sql
USE game_tournament_db;
SHOW TABLES;
```

Expected table count: 16 tables.

Expected tables:
- `player`
- `gametype`
- `structure`
- `tournament`
- `participant`
- `game`
- `game_player`
- `game_move`
- `game_history`
- `group_t`
- `group_list`
- `friends`
- `leaderboard`
- `notification`
- `chat`
- `message`

## 3. Confirm Keys and Constraints
Run the verification queries at the bottom of `milestone4_ddl.sql`.

Check that:
- Every table has a primary key.
- Junction tables use composite primary keys:
  - `participant(TID, PID)`
  - `game_player(game_ID, PID)`
  - `game_history(PID, GAME_ID)`
  - `group_list(GID, PID)`
  - `friends(PID1, PID2)`
- All foreign keys appear in MySQL Workbench.
- Check constraints are visible for statuses, numeric ranges, and relationship rules.

## 4. Generate / Verify EER Diagram
1. In MySQL Workbench, go to **Database > Reverse Engineer**.
2. Select the connection that contains `game_tournament_db`.
3. Select the schema.
4. Continue through the wizard to generate the EER diagram.
5. Confirm the EER diagram matches the Milestone 2 normalized ERD.

## 5. Expected Normalization Reflections
Confirm these design choices appear in the EER diagram:
- `game_player` exists as the normalized replacement for fixed `P1_ID` and `P2_ID`.
- `game_move` exists as the normalized replacement for storing game moves inside `game`.
- Derived player totals are not stored in `player`.
- Player game outcomes are stored in `game_history`.
- Group membership is stored in `group_list`.
- Tournament enrollment is stored in `participant`.

## 6. GitHub Commit
Use the required commit message:

```bash
git add milestone4_ddl.sql workbench_verification_checklist.md
git commit -m "M4: DDL scripts added, EER diagram verified"
git push
```
