# Provenance

Vendored from the **Super Website Maker** repo
(`C:/Users/HP/Documents/GitHub/Super Website Maker/.claude/skills/creative-web`)
so the design gate travels with this project and can run in CI.

`SKILL.md` refers to a `research/` corpus at the source repo's root. That corpus is
**not** vendored here (it indexes ~38k resources); consult it in the source repo when
the summarised references are not enough.

## What is wired up

- `npm run design:scan` in `app/` runs `scripts/slopscan.mjs` over `app/src`.
- CI runs the same command, so a regression fails the build.
- `FINGERPRINTS.md` carries this project's row. Read it before planning UI work,
  and append when a redesign ships.

The other design skills used alongside this one (`frontend-design`,
`emil-design-eng`, `apple-design`, `animation-vocabulary`) are available as
global skills and are not duplicated here.
