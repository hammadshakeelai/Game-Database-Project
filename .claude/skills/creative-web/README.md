# creative-web

An agent skill for building websites that read as authored rather than generated.

Distilled from `research/` at the repo root: 60 design skills read as primary source,
5 reverse-engineered brand systems, 10 award-tier sites measured directly, and a
38,803-resource corpus.

## What is here

```
SKILL.md          the decision procedure — the entry point an agent loads
FINGERPRINTS.md   cross-build registry; stops the agent repeating itself
scripts/          slopscan.mjs — the executable gate
references/       depth, loaded on demand (motion, anti-slop, 3D, type, patterns, recipes)
```

It is deliberately three things, not one:

1. **A procedure** — design read, reflex ladder, dials, structure rules.
2. **A gate** — `slopscan.mjs` must exit 0. Taste as a failing test, not as advice.
3. **A memory** — `FINGERPRINTS.md` accumulates across builds.

The third is the part a document cannot do. A markdown file is read once per session and
forgotten; a registry accumulates. The two highest-scoring skills in the source corpus both
built anti-self-repetition machinery for exactly this reason, and neither is prose alone.

## Using the gate

```bash
node .claude/skills/creative-web/scripts/slopscan.mjs src
```

Exit 0 = clean or warnings only. Exit 1 = at least one error.

```bash
node .../slopscan.mjs src --json        # machine-readable
node .../slopscan.mjs src --warn-only   # never fail the build
```

Suppress a rule where it is genuinely wrong, with a reason:

```css
/* creative-web-allow: TRANSITION_ALL -- third-party widget, we don't control the styles */
```

### Rules

| Rule | Severity | Checks |
|---|---|---|
| `LILA_GRADIENT` | error | Both gradient stops in OKLCH hue 255–310, C>0.08 |
| `TRANSITION_ALL` | error | `transition: all` |
| `ANIMATE_LAYOUT` | error | Transitioning width/height/top/left/margin/padding |
| `SCALE_ZERO` | error | `scale(0)` entrances |
| `EASE_IN` | error | `ease-in` on UI motion (`ease-in-out` is fine) |
| `NO_REDUCED_MOTION` | error | Motion exists but no `prefers-reduced-motion` anywhere |
| `CREAM_GROUND` | warn | Ground in OKLCH L .84–.97, C<.06, hue 40–100 |
| `PURE_BLACK` | warn | `#000` as a ground |
| `INTER_DEFAULT` | warn | Inter as the first family |
| `GRADIENT_TEXT`, `EM_DASH`, `SLOW_UI`, `ZINDEX_ADHOC`, `FONT_SPRAWL` | warn | — |

Colour rules are evaluated in **OKLCH**, not by matching hex strings, so a banned look
cannot slip through by being a slightly different shade.

> **One correction to the source.** The skill this borrows from publishes the purple-gradient
> band as hue 250–290. Measured, that is too narrow: violet-500 `#8b5cf6` is H 292.7 and
> purple-600 `#7c3aed` is H 293.0, so the single most common AI gradient escapes its own
> published ban. Widened here to 255–310 with a chroma floor.

## Installing elsewhere

Project-local (as here): `.claude/skills/creative-web/` — versioned with the repo.

For every project, copy it to `~/.claude/skills/creative-web/`. Note that `FINGERPRINTS.md`
then becomes a *global* memory across all your work, which is usually what you want —
the house-style problem is not per-project.

## Maintaining

`SKILL.md`, `README.md` and `FINGERPRINTS.md` are edited here directly.

Everything in `references/` is **generated** — edit `research/design_intelligence.md`
instead and regenerate:

```bash
python research/tools/build_skill_refs.py
```

That script asserts no section lands in two reference files.
