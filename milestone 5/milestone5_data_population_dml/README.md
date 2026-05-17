# Milestone 5 — Data Population (DML)

## Purpose
This milestone loads the cleaned synthetic dataset from Milestone 3 into the normalized MySQL schema from Milestone 4.

## Included Files
- `01_insert_data.sql` — ready-to-run DML script using `INSERT` statements.
- `02_update_delete_demo.sql` — demonstrates one `UPDATE` and one `DELETE`, both with `WHERE` conditions.
- `03_validation_queries.sql` — required validation queries.
- `04_validation_output_commented.sql` — commented expected validation output.
- `optional_load_data_infile_template.sql` — optional template for using `LOAD DATA LOCAL INFILE`.
- `csv/` — clean CSV files copied from the Milestone 3 dataset.

## Run Order in MySQL Workbench
1. Run the Milestone 4 DDL script first.
2. Run `01_insert_data.sql`.
3. Run `02_update_delete_demo.sql`.
4. Run `03_validation_queries.sql`.
5. Compare your query output with `04_validation_output_commented.sql`.

## Validation Notes
After the update/delete demo:
- All tables still contain 50–100 rows.
- `notification` contains 99 rows because `N0100` is deleted as the required DELETE demonstration.
- All key-column NULL checks should return `0`.
- All JOIN-based orphan checks should return `0`.

## GitHub Commit
Use this exact commit message:

```bash
git add 01_insert_data.sql 02_update_delete_demo.sql 03_validation_queries.sql 04_validation_output_commented.sql optional_load_data_infile_template.sql csv/
git commit -m "M5: Data populated validation queries added"
git push
```
