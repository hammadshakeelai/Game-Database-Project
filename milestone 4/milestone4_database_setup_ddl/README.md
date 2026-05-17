# Milestone 4 — Database Setup (DDL)

## Files
- `milestone4_ddl.sql` — complete MySQL DDL script for the finalized normalized schema.
- `workbench_verification_checklist.md` — steps to verify the schema and EER diagram in MySQL Workbench.

## Commit Message

Use this exact Git commit message:

```bash
git add milestone4_ddl.sql workbench_verification_checklist.md
git commit -m "M4: DDL scripts added, EER diagram verified"
git push
```

## Notes
The DDL includes:
- Primary keys for every table.
- Foreign keys matching the normalized ERD.
- `NOT NULL` constraints on required attributes.
- `UNIQUE` constraints for natural identifiers where appropriate.
- `CHECK` constraints for statuses, numeric ranges, and valid relationships.
- Indexes on foreign keys and frequently queried columns.
