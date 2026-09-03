# Fingerprints

Cross-build registry. **Read this before planning; append to it when a build ships.**

## Why this file exists

A skill that only lists good rules will still converge on a house style, because the
convergence does not feel like a reflex from the inside — it feels like reasoned choice,
every time. It is only visible when finished work is lined up side by side.

One skill in the source corpus measured its own showcase output and found eight of nine
builds dark, three of them within 0.002 lightness of each other, the same monospace face
independently "chosen" twice, and one header layout in seven of nine. None of those is a
mistake. All of them together are a signature — and a signature is exactly what the client
did not order.

This file is the memory that makes that visible.

## The gate

A new plan must differ from **every existing row** on **at least 4 of the 6 dimensions** —
compared against each row *individually*, not averaged across the table.

If the plan fails the gate, **change the plan, not the log.**

| # | Dimension | What counts as different |
|---|---|---|
| 1 | **Grammar** | The page's structural model (filmic one-shot, editorial column, spatial world, index/grid, document, dashboard, diagrammatic, single-object study) |
| 2 | **Navigation** | How the visitor moves and where the nav lives |
| 3 | **Hero device** | The first-viewport mechanism |
| 4 | **Palette** | Ground lightness band + accent hue. Two dark grounds with a warm accent are *not* different. |
| 5 | **Type** | Family pairing and the display treatment |
| 6 | **Signature move** | The one thing the visitor remembers |

Record palette as OKLCH ground lightness and accent hue, not as a colour name — "dark with
an orange accent" hides the collision that `L 0.18 / H 40` versus `L 0.18 / H 35` makes
obvious.

## Rows

| Date | Project | Grammar | Nav | Hero device | Palette (ground L / accent H) | Type | Signature move |
|---|---|---|---|---|---|---|---|
| 2026-09-01 | site/ — M. H. Shakeel portfolio | Technical spec sheet (index grammar) | None; sequential sheet sections | Live Doomsday calculator (diegetic: the hero IS the project) | Light vellum L 0.945 / accent H 45 oxide | Archivo 900 display + IBM Plex Mono | The page measures and displays its own DOM, weight and timing |
| 2026-09-01 | site/plate/ — Chladni plate | Single-object apparatus study | None; one full-bleed view | Live standing-wave simulation, pointer sets the mode | Warm charcoal L 0.190 / achromatic sand (no accent hue) | Bodoni Moda display + DM Mono | The figure is emergent: no line is drawn, sand stops where the plate is still |
| 2026-09-03 | Game-Database-Project/app — Super Tic-Tac-Toe | Product dashboard + single-object board study | Persistent in-app nav | The authoritative board itself, playable on arrival | Baize L 0.345 / accent H 84 brass | Fraunces (display) + Public Sans (UI) + Spline Sans Mono (notation) | Marks are chalk and red pencil on felt; the one accent is brass and it only ever marks the next action |

## On the second and third order

Passing this gate is necessary, not sufficient. Also run the reflex ladder in `SKILL.md`
§2: the first-order cliché *and* the tasteful avoidance of it are both saturated. This
table catches you repeating **yourself**; the ladder catches you repeating **everyone**.

When a build ships, also name in the commit which two of your own recurring habits you
broke this time. Breaking one is coincidence; two is a decision.
