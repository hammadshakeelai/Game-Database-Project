# Game-Database-Project

A comprehensive **gaming and tournament management platform** built as a normalized relational database. This project demonstrates proper database design through five progressive milestones: requirements analysis, ERD normalization, dataset preprocessing, DDL schema implementation, and DML data population with validation.

## Project Overview

This database serves a competitive gaming platform where players register, participate in tournaments, compete in individual games, earn Elo ratings, manage social connections, and receive notifications. The system supports multiple tournament formats (single elimination, round-robin, Swiss, etc.), tracks game history and moves, manages player groups, and maintains leaderboards.

## Milestone Breakdown

| Milestone | Focus | Deliverables |
|-----------|-------|--------------|
| **M1** | Requirements & Initial Design | Project scope, actor identification, core features, business rules |
| **M2** | ERD & Normalization | Normalized schema (1NF, 2NF, 3NF), updated ERD diagram, documentation |
| **M3** | Dataset Preprocessing | Synthetic data generation, data quality, dataflow documentation |
| **M4** | DDL Implementation | CREATE TABLE statements with constraints, indexes, foreign keys |
| **M5** | DML & Validation | Data loading (INSERT), UPDATE/DELETE demo, referential integrity checks |

## Repository Structure

```
Game-Database-Project/
├── README.md (this file)
├── milestone 1/
│   ├── Requirements.docx (project requirements and scope)
│   └── main_design.md (entity relationship diagram)
├── final_submission_repository_package/
│   ├── README.md (execution guide)
│   ├── docs/
│   │   ├── normalization_walkthrough.md (M2 detailed justification)
│   │   ├── dataflow_description.md (M3 data flow explanation)
│   │   └── erd_design_and_normalization_overview.png (normalized ERD)
│   ├── data/csv/
│   │   └── *.csv (16 synthetic data files, one per table)
│   └── sql/
│       ├── ddl/
│       │   └── milestone4_ddl.sql (all CREATE TABLE statements)
│       └── dml/
│           ├── 01_insert_data.sql (load all data from CSV)
│           ├── 02_update_delete_demo.sql (realistic UPDATE/DELETE workflows)
│           ├── 03_validation_queries.sql (referential and business rule validation)
│           └── 04_validation_output_commented.sql (query results documentation)
└── app/ (optional UI prototype)
```

## Quick Start

### For Grading or Testing

1. **Review documentation first:**
   - Read `final_submission_repository_package/README.md` for execution overview
   - Review `final_submission_repository_package/docs/normalization_walkthrough.md` for schema justification
   - Check `final_submission_repository_package/docs/dataflow_description.md` for data flow

2. **Load the database:**
   ```bash
   mysql -u root -p < final_submission_repository_package/sql/ddl/milestone4_ddl.sql
   mysql -u root -p game_tournament_db < final_submission_repository_package/sql/dml/01_insert_data.sql
   ```

3. **Run UPDATE/DELETE demo and validation:**
   ```bash
   mysql -u root -p game_tournament_db < final_submission_repository_package/sql/dml/02_update_delete_demo.sql
   mysql -u root -p game_tournament_db < final_submission_repository_package/sql/dml/03_validation_queries.sql
   ```

### For Development

All source files (normalization docs, ERD, CSV data, DDL, DML) are in `final_submission_repository_package/` for easy submission. Milestone 1 files are in `milestone 1/` for reference.

## Key Database Features

- **16 normalized tables** with 1NF, 2NF, 3NF compliance
- **Comprehensive constraints**: NOT NULL, UNIQUE, CHECK, FOREIGN KEY
- **38 indexes** on foreign keys and frequently queried columns
- **100+ synthetic data rows** per core table for realistic testing
- **Full validation suite**: referential integrity + business rule checks
- **Realistic workflows**: UPDATE/DELETE demos show actual system operations

## Submission Information

**Group Members:** [Insert names here]  
**GitHub Repository:** [Insert link here]  
**PDF Submission:** See `final_submission_repository_package/docs/GroupName_Version_Control_DBLab.pdf`

---

For detailed execution instructions, navigate to `final_submission_repository_package/README.md`.
