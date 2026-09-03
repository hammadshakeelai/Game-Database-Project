<!-- Reference for the creative-web skill. Extracted from
     research/design_intelligence.md, which is the full document and the place to edit. -->

# Measured sites

## 4.5 Corrections from measuring ten real sites

Direct measurement of ten award-tier sites (`interaction_archaeology.md`) produced findings
no amount of reading skills would have surfaced — including one that corrects an earlier
draft of this document.

**Structural minimalism is the actual signature.** The measured sites run **175–2,089 DOM
nodes, median ~640**. A typical generated marketing page runs several thousand for far less
effect, and the most technically ambitious site in the sample has the *fewest* nodes of all
(175). Treat node count as a budget the way you treat bundle size. This look comes from
composition, not accumulation.

**Several canvases, not one.** Four of the ten run two or three simultaneous canvas
contexts — a 2D canvas for cheap overlays alongside separate WebGL contexts for background
and foreground. The pattern is not one monolithic full-viewport scene; it is
purpose-specific canvases at independent resolutions, composited with the DOM, each able to
pause on its own.

**Type is the ownable layer.** Eight of ten use a custom, licensed or self-hosted face —
Fort, LocomotiveNew, Obys, jws, sauce, therma, Saol Display, Neue Montreal. **Not one used
Inter.** This corroborates the skills' "avoid Inter as default" from an entirely
independent direction: the typeface is the primary differentiator at the top of the market
and the one layer that cannot be cloned by copying CSS. Where a custom commission is out of
reach, an editorial serif display paired against a neutral grotesque buys much of the same
distinctiveness.

**Where semantics actually die — a correction.** An earlier draft of this section, working
from five sites, claimed the elite tier broadly ignores document structure. With ten sites
that overstates it. Three of ten have no `<h1>`, and all three are the most
*canvas-dominant* sites in the sample — those where the experience is the canvas. Sites
that kept a DOM-led architecture kept their heading structure. **The risk arrives with
canvas-dominance, not with ambition** — which is a more useful rule, and an avoidable one:
the `webgl-image-plane` pattern achieves the same visual result with semantics intact.

Two smaller notes worth carrying: perceptual colour spaces (`oklch`, `lab`) are shipping in
production and solve the even-tonal-step problem AI palettes usually fail; and four of the
ten serve **zero images**, carrying everything in canvas and type.

Sample size is ten; these are observations, not statistics.

---


---

# Interaction Archaeology

Direct technical observation of reference sites (§9, §19). **Bucket B — inspiration only.**
Nothing here is copied code, assets or copy. These are measured facts about public pages,
converted into generalized patterns that can be reimplemented originally.

Method: navigate the live page, wait for hydration, then read the DOM and computed styles —
counting structural elements and detecting rendering contexts and typefaces. Facts below
were measured, not inferred.

---

## Measured sample — 10 sites

| Site | DOM nodes | Canvas contexts | Typeface | `<h1>` | Media | Background |
|---|---|---|---|---|---|---|
| jesperlandberg.com | **175** | webgl2 | (generic sans) | yes | 0 img | `rgb(0,0,0)` |
| p5aholic.me | 348 | webgl2 | Neue Montreal | yes | 0 img | `rgb(13,13,13)` |
| resn.co.nz | 546 | **2d + webgl2 ×2** | Fort (4 weights, custom) | yes | 3 img | `rgb(0,0,0)` |
| locomotive.ca | 613 | **webgl2 ×2** | LocomotiveNew (custom), HelveticaNowDisplay | yes | 7 img, 1 video | transparent |
| basement.studio | 634 | none | Geist | yes | 64 img | `rgb(0,0,0)` |
| unseen.co | 737 | webgl2 | Neue Montreal + Saol Display | yes (weak: "Home") | 0 img | transparent |
| bruno-simon.com | 969 | webgl2 | Nunito, Amatic SC | **none** | — | transparent |
| obys.agency | 1,546 | webgl2 | Obys (custom) | **none** | 38 img | white |
| darkroom.engineering | 1,739 | none | mono, sauce, therma (custom) | yes | **0 img, 4 video** | `lab(0 0 0)` |
| aristidebenoist.com | 2,089 | **webgl + webgl2** | jws (custom) | **none** | 20 img | transparent |

Only bruno-simon.com exposed a detectable library global (Howler). Every other site was
fully bundled.

---

## What the measurements show

### 1. These pages are very small
**175–2,089 nodes; median ~640.** A typical generated or templated marketing page runs
several thousand nodes for far less visual effect. The most technically ambitious site in
the sample by reputation (jesperlandberg.com) has the *fewest* nodes of all — 175.

**Elite creative sites are structurally minimal and spend their complexity in the render
layer, not the markup.** If a build is producing 4,000 nodes of nested wrappers, it is
already off the path regardless of how good the animation is. Treat node count as a budget
the way you treat bundle size.

### 2. Multiple canvases, not one
Four of the ten run **two or three simultaneous canvas contexts** — Resn runs a 2D canvas
alongside two WebGL2 contexts; Locomotive and Aristide Benoist each run two.

This corrects a natural assumption. The pattern is not "one full-viewport canvas behind
everything" — it is **several purpose-specific canvases composited with the DOM**: one for
a background field, one for a foreground effect, a 2D one for cheap overlays. Separating
them lets each run at its own resolution and pause independently.

### 3. Type is the ownable layer — near-universally
Custom, licensed or self-hosted faces appear on **eight of ten**: Fort, LocomotiveNew,
Obys, jws, sauce, therma, Saol Display, Neue Montreal. **Not one site used Inter.**

This corroborates the skills' "avoid Inter as default" from a completely independent
direction. At the top of the market the typeface is the primary differentiator, and it is
the one layer that cannot be cloned by copying CSS. Unseen pairs an editorial serif
(Saol Display) against a neutral grotesque (Neue Montreal) — that serif-display-plus-
neutral-body pairing recurs across high-end work and is a cheap way to buy distinctiveness
without a custom commission.

### 4. Video over imagery, at the extreme end
darkroom.engineering serves **zero images and four videos**. Four of the ten serve **zero
images at all**, carrying everything in canvas and type. The assumption that a portfolio is
a grid of stills is not how this tier works.

### 5. Modern colour is shipping
darkroom.engineering computes its background as `lab(0 0 0)` — CSS Color 4, not hex.
Perceptually-uniform spaces (`lab`, `oklch`) are in production. `oklch` makes generating a
tonal palette with even *perceived* lightness trivial, which is precisely what AI-chosen
palettes usually get wrong.

### 6. Library detection fails on bundled sites — and that matters
Nine of ten exposed **no** library globals. Everything is bundled and tree-shaken.

- Any claim of the form "this site uses GSAP" based on runtime sniffing is unreliable.
  Stack attribution needs network-level or source-map evidence, or the author saying so.
- **Do not trust "detected stack" claims** — in this corpus or any other — unless the
  provenance is the author's own repository. Where studios open-source their own site
  (basement.studio, Studio Freight/darkroom), that is the trustworthy path, and it is why
  those repos are disproportionately valuable.

### 7. The accessibility finding, corrected
**Three of ten have no `<h1>` at all** (bruno-simon, obys.agency, aristidebenoist), and one
more has a placeholder `<h1>Home</h1>` that carries no information.

An earlier draft of this document, based on the first five sites, overstated this as a
near-universal failure. With ten sites the honest reading is narrower but still real:
**the most canvas-dominant sites are the ones that drop semantic structure.** All three
failures are sites where the experience *is* the canvas. Sites that kept a DOM-led
architecture (darkroom, basement, locomotive, resn) kept their heading structure.

That is a more useful finding than the original overstatement, because it identifies the
actual trade-off: the risk arrives with canvas-dominance, not with ambition. And the
corpus's own `webgl-image-plane` pattern shows the trade-off is avoidable — the same visual
result is achievable with the semantic layer intact.

---

## Generalized patterns derived

- **Structural minimalism as a design constraint.** Cap DOM nodes as an explicit budget.
  It forces composition over accumulation.
- **Multi-canvas composition.** Several purpose-specific canvases at independent
  resolutions, composited with the DOM — not one monolithic scene.
- **Type-first differentiation.** Choose the typeface before the palette and before the
  motion. Least copyable, most identity-carrying decision available.
- **Serif display + neutral grotesque** as a distinctiveness lever when a custom
  commission is out of reach.
- **Silent looping video as the default media primitive**, images as the exception.
- **Perceptual colour spaces** (`oklch`/`lab`) for palettes with even perceived steps.
- **Canvas-dominance is where semantics die** — so when the canvas carries the experience,
  the DOM layer needs deliberate design, not whatever is left over.
- **Open-source-your-own-site** as a studio strategy: portfolio and credible technique
  reference in one, and the only *reliable* source of stack attribution for researchers.

---

## Caveats

- Ten sites is a small sample. These are observations, not statistics.
- Measurements are taken ~3s after navigation. An earlier pass without that wait recorded
  aristidebenoist.com at 43 nodes — a hydration artifact, since corrected to 2,089. Any
  single figure here could still be affected by late-loading content.
- Font family names are as computed by the browser and may be aliases rather than the
  licensed name of the face.
- Canvas contexts were counted at load; sites may create or destroy more during interaction.
