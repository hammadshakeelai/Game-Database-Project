# DB Lab Final Repository Package

This folder contains the files needed to update the GitHub repository for the database lab milestones.

## Contents

- `docs/erd_design_and_normalization_overview.png` - updated ERD diagram.
- `docs/normalization_walkthrough.md` - written 1NF, 2NF, and 3NF justifications.
- `docs/dataflow_description.md` - project-specific dataflow description.
- `docs/GroupName_Version_Control_DBLab.pdf` - Classroom PDF submission document. Rename after replacing `GroupName`.
- `data/csv/` - cleaned synthetic CSV files, one per table.
- `sql/ddl/milestone4_ddl.sql` - CREATE TABLE statements and constraints.
- `sql/dml/` - INSERT scripts, UPDATE/DELETE demo, validation queries, and commented output.

## Required Git Commit Messages

Use one clear commit per milestone. For Milestones 4 and 5, use the exact requested messages:

```bash
git add .
git commit -m "M4: DDL scripts added, EER diagram verified"

git add .
git commit -m "M5: Data populated validation queries added"
```

Suggested earlier messages:

```bash
git commit -m "M2: ERD normalized and documentation added"
git commit -m "M3: Dataset preprocessing and dataflow added"
```

## Before Submission

1. Replace placeholders in the PDF: group name, second member name, and GitHub repository link.
2. Rename the PDF to match the required format: `GroupName_Version_Control_DBLab.pdf`.
3. Push all repository files to GitHub.
4. Confirm both group members have contributed commits.
5. Upload the final PDF in Classroom.
