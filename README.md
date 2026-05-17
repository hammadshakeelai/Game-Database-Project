# Game Tournament Database Project

A normalized MySQL database for a competitive gaming and tournament platform. The system models player accounts, game types, tournaments, match participation, game moves, Elo-based ranking, social groups, friendships, chats, messages, notifications, and reporting queries.

This repository was built as a DB Lab milestone project and includes the full design-to-implementation workflow: requirements analysis, ERD/normalization, CSV dataset preparation, DDL schema scripts, DML population scripts, validation queries, views, triggers, procedures, tests, analytics, and documentation.

---

## Project Highlights

- **DBMS:** MySQL 8.0+
- **Database name:** `game_tournament_db`
- **Schema size:** 16 normalized tables
- **Data volume:** 1,340 synthetic CSV records across all tables
- **Normalization:** 1NF, 2NF, and 3NF documented
- **Integrity controls:** primary keys, foreign keys, unique constraints, check constraints, indexes, triggers, and validation queries
- **Reporting support:** sample queries, views, analytics scripts, and test suite

---

## Core Features

The database supports these platform workflows:

1. **Player management**
   - User profiles, emails, countries, active status, created dates, and Elo ratings.

2. **Tournament management**
   - Tournament setup with game type, structure, organizer, entry Elo range, schedule, status, and participant limits.

3. **Gameplay tracking**
   - Game records, players per game, move-by-move activity, results, Elo changes, and match history.

4. **Ranking and leaderboards**
   - Global player ranking, leaderboard positions, Elo calculations, and rank update tracking.

5. **Social and communication features**
   - Friends, groups, group membership, chats, messages, replies, read status, and notifications.

6. **Validation and analytics**
   - Referential integrity checks, row-count validation, business-rule queries, dashboard-style analytics, and performance documentation.

---

## Repository Structure

> Note: the final consolidated package is currently stored in `new folder/` in this archive. For a cleaner GitHub repository, you may rename it to `final_submission_repository_package/` and update paths accordingly.

```text
Game-Database-Project/
├── README.md
├── LICENSE
├── TTTGameData_Version_Control_Doc_DBLab.pdf
├── milestone 1/
│   ├── Requirements.docx
│   ├── main_design.md
│   └── super_ttt_erd_schema.html
├── milestone 2/
│   ├── 3NF_ERD_Table_Justification.docx
│   └── d548e0de-f15b-4dcd-8152-64c75ae15df8.png
├── milestone 3/
│   └── milestone3_dataset_preprocessing/
│       ├── *.csv
│       ├── README_Dataflow.md
│       └── VALIDATION_REPORT.md
├── milestone 4/
│   └── milestone4_database_setup_ddl/
│       ├── milestone4_ddl.sql
│       ├── README.md
│       └── workbench_verification_checklist.md
├── milestone 5/
│   └── milestone5_data_population_dml/
│       ├── 01_insert_data.sql
│       ├── 02_update_delete_demo.sql
│       ├── 03_validation_queries.sql
│       ├── 04_validation_output_commented.sql
│       └── csv/
└── new folder/
    ├── README.md
    ├── data/csv/
    ├── docs/
    │   ├── ARCHITECTURE.md
    │   ├── PERFORMANCE.md
    │   ├── data_dictionary.md
    │   ├── dataflow_description.md
    │   ├── normalization_walkthrough.md
    │   └── erd_design_and_normalization_overview.png
    └── sql/
        ├── analytics/business_analytics.sql
        ├── ddl/
        │   ├── milestone4_ddl.sql
        │   ├── procedures.sql
        │   ├── triggers.sql
        │   └── views.sql
        ├── dml/
        │   ├── 01_insert_data.sql
        │   ├── 02_update_delete_demo.sql
        │   ├── 03_validation_queries.sql
        │   ├── 04_validation_output_commented.sql
        │   └── optional_load_data_infile_template.sql
        ├── examples/sample_queries.sql
        ├── tests/test_suite.sql
        └── utilities/backup_restore.sql
```

---

## Database Tables

| Area | Tables |
|---|---|
| Player core | `player`, `leaderboard` |
| Game setup | `gametype`, `structure` |
| Tournaments | `tournament`, `participant` |
| Gameplay | `game`, `game_player`, `game_move`, `game_history` |
| Social | `friends`, `group_t`, `group_list` |
| Communication | `chat`, `message`, `notification` |

---

## Dataset Summary

The project includes cleaned synthetic CSV data under `new folder/data/csv/`.

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

---

## Quick Start

### 1. Requirements

Install MySQL 8.0 or later and make sure the `mysql` command is available from your terminal.

```bash
mysql --version
```

### 2. Create the database schema

From the repository root:

```bash
mysql -u root -p < "new folder/sql/ddl/milestone4_ddl.sql"
```

This creates the `game_tournament_db` database and all 16 tables.

### 3. Load sample data

```bash
mysql -u root -p game_tournament_db < "new folder/sql/dml/01_insert_data.sql"
```

### 4. Run the required update/delete demo

```bash
mysql -u root -p game_tournament_db < "new folder/sql/dml/02_update_delete_demo.sql"
```

### 5. Run validation checks

```bash
mysql -u root -p game_tournament_db < "new folder/sql/dml/03_validation_queries.sql"
```

Expected validation outcomes:

- All table row counts should return populated results.
- Primary-key and required foreign-key null checks should return `0`.
- Join-based orphan checks should return `0`.
- Business-rule checks should only show valid statuses, result values, and relationship records.

---

## Optional SQL Modules

After creating the schema and loading data, you can run the extended SQL modules:

```bash
# Common reporting views
mysql -u root -p game_tournament_db < "new folder/sql/ddl/views.sql"

# Stored procedures for common operations
mysql -u root -p game_tournament_db < "new folder/sql/ddl/procedures.sql"

# Data validation and auto-maintenance triggers
mysql -u root -p game_tournament_db < "new folder/sql/ddl/triggers.sql"

# Sample reports and query examples
mysql -u root -p game_tournament_db < "new folder/sql/examples/sample_queries.sql"

# Business analytics queries
mysql -u root -p game_tournament_db < "new folder/sql/analytics/business_analytics.sql"
```

The test suite contains intentional invalid inserts to prove that constraints reject bad data. Run it only when you are ready to inspect expected errors:

```bash
mysql -u root -p game_tournament_db < "new folder/sql/tests/test_suite.sql"
```

---

## Documentation Guide

| File | Purpose |
|---|---|
| `new folder/docs/ARCHITECTURE.md` | System design, domains, data flow, and architecture overview |
| `new folder/docs/data_dictionary.md` | Full table-by-table column, constraint, and relationship documentation |
| `new folder/docs/normalization_walkthrough.md` | 1NF, 2NF, and 3NF explanation with design decisions |
| `new folder/docs/dataflow_description.md` | Dataset generation, preprocessing, and table dependency flow |
| `new folder/docs/PERFORMANCE.md` | Index strategy, performance targets, and query optimization notes |
| `new folder/docs/erd_design_and_normalization_overview.png` | Final ERD diagram |

---

## Suggested Script Execution Order

Use this order for a clean end-to-end setup:

```text
1. new folder/sql/ddl/milestone4_ddl.sql
2. new folder/sql/dml/01_insert_data.sql
3. new folder/sql/dml/02_update_delete_demo.sql
4. new folder/sql/dml/03_validation_queries.sql
5. new folder/sql/ddl/views.sql
6. new folder/sql/ddl/procedures.sql
7. new folder/sql/ddl/triggers.sql
8. new folder/sql/examples/sample_queries.sql
9. new folder/sql/analytics/business_analytics.sql
```

---

## Milestone Summary

| Milestone | Focus | Main Deliverables |
|---|---|---|
| Milestone 1 | Requirements and initial design | Requirements document, initial schema, ERD work |
| Milestone 2 | ERD and normalization | 3NF design, ERD justification, normalized relationships |
| Milestone 3 | Dataset preprocessing | CSV files, dataflow documentation, validation report |
| Milestone 4 | DDL implementation | MySQL schema, keys, constraints, indexes, Workbench checklist |
| Milestone 5 | DML and validation | Inserts, update/delete demo, validation queries, commented output |

---

## Design Notes

- Fixed player columns such as `P1_ID` and `P2_ID` were replaced with the `game_player` junction table.
- Multi-valued move storage was replaced with the `game_move` table.
- Derived player totals such as wins/losses are not stored directly; they can be calculated from `game_history`.
- Tournament format details are stored in `structure` instead of being duplicated in `tournament`.
- Game mode details are stored in `gametype` instead of being duplicated in game or tournament records.
- Many-to-many relationships are resolved through junction tables such as `participant`, `game_player`, `group_list`, and `friends`.

---

## Useful Queries

### Top 10 players by Elo

```sql
SELECT
    PID,
    CONCAT(first_name, ' ', last_name) AS player_name,
    rank_elo,
    country
FROM player
ORDER BY rank_elo DESC
LIMIT 10;
```

### Tournament participation summary

```sql
SELECT
    t.TID,
    t.name,
    s.format_type,
    COUNT(pt.PID) AS participant_count,
    t.max_participants,
    t.status
FROM tournament t
JOIN structure s ON t.struct_ID = s.struct_ID
LEFT JOIN participant pt ON t.TID = pt.TID
GROUP BY t.TID, t.name, s.format_type, t.max_participants, t.status
ORDER BY t.scheduled_at DESC;
```

### Player win-rate report

```sql
SELECT
    p.PID,
    CONCAT(p.first_name, ' ', p.last_name) AS player_name,
    COUNT(gh.GAME_ID) AS total_games,
    SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) AS wins,
    ROUND(
        100.0 * SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) / NULLIF(COUNT(gh.GAME_ID), 0),
        2
    ) AS win_percentage
FROM player p
LEFT JOIN game_history gh ON p.PID = gh.PID
GROUP BY p.PID, p.first_name, p.last_name
ORDER BY win_percentage DESC;
```

---

## Backup and Restore

Create a SQL backup:

```bash
mysqldump -u root -p game_tournament_db > game_tournament_db_backup.sql
```

Restore a backup:

```bash
mysql -u root -p game_tournament_db < game_tournament_db_backup.sql
```

Additional backup helper routines are available in:

```text
new folder/sql/utilities/backup_restore.sql
```

---

## Git Commit Messages

Suggested milestone commit messages:

```bash
git commit -m "M2: ERD normalized and documentation added"
git commit -m "M3: Dataset preprocessing and dataflow added"
git commit -m "M4: DDL scripts added, EER diagram verified"
git commit -m "M5: Data populated validation queries added"
```

---

## Submission Checklist

Before final submission:

- [ ] Rename `new folder/` to a cleaner package name, if required by the instructor.
- [ ] Confirm `README.md` paths match the final folder names.
- [ ] Run DDL and DML scripts successfully in MySQL Workbench or terminal.
- [ ] Run validation queries and confirm no orphan records or key null issues.
- [ ] Review the ERD image and normalization walkthrough.
- [ ] Replace any remaining placeholders in the PDF submission document.
- [ ] Confirm both group members have visible Git commits, if required.
- [ ] Push the final repository to GitHub.

---

## License

This project is distributed under the license included in the repository. See `LICENSE` for details.
