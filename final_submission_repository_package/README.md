# DB Lab Final Submission Package

This package contains the final, milestone-aligned deliverables for the normalized gaming/tournament database project.

## Milestone mapping
- **Milestone 2 (ERD + normalization)**
  - `docs/erd_design_and_normalization_overview.png`
  - `docs/normalization_walkthrough.md`
- **Milestone 3 (dataset + dataflow)**
  - `docs/dataflow_description.md`
  - `data/csv/*.csv`
- **Milestone 4 (DDL + constraints + indexes)**
  - `sql/ddl/milestone4_ddl.sql`
- **Milestone 5 (population + operations + validation)**
  - `sql/dml/01_insert_data.sql`
  - `sql/dml/02_update_delete_demo.sql`
  - `sql/dml/03_validation_queries.sql`
  - `sql/dml/04_validation_output_commented.sql`

## Execution order
1. Run `sql/ddl/milestone4_ddl.sql`
2. Run `sql/dml/01_insert_data.sql`
3. Run `sql/dml/02_update_delete_demo.sql`
4. Run `sql/dml/03_validation_queries.sql`
5. (Optional) Review `sql/dml/04_validation_output_commented.sql`

## Notes
- Keep table and column names consistent across ERD, docs, CSV headers, DDL, DML, and validation queries.
- Do not store derived totals (wins/losses/draws) in `player`; derive them from `game_history`.
