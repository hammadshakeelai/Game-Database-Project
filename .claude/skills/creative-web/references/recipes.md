# Prompt Recipes

Reusable build instructions for a coding agent. Each recipe specifies **design intention,
visual behaviour, interaction, implementation, fallback, performance strategy, mobile
behaviour and accessibility strategy** — the eight fields §14 of the brief asks for.

These are written to be pasted into an agent prompt more or less verbatim. They assume the
agent has also read `design_intelligence.md`.

**Preamble to prepend to any recipe:**

> Before writing code, output a one-line Design Read: the emotion, the visual metaphor,
> and the single hero interaction. Set VARIANCE / MOTION / DENSITY explicitly. Name the one
> aesthetic risk you are taking. Then list what you are deliberately leaving *still*.
> Do not use: AI-purple gradients, centered hero over dark mesh, three equal feature cards,
> uniform 24px radii, glassmorphism by default, Inter as an unconsidered default, em-dashes
> as separators, or floating orbs. If you use any of them, justify it in one sentence.

---

## R1 — Cinematic scroll-controlled 3D product reveal

**Design intention.** The product arrives as an object in space, not an image on a page.
Scroll is a camera operator, not a scrollbar. The visitor should feel they are moving
*around* something rather than moving a page.

**Visual behaviour.** A single pinned viewport. The model rotates and dollies along a
scripted path as scroll advances. Three or four beats, each holding briefly so the eye can
rest. Lighting shifts between beats. Type enters per beat, out of the model's negative space.

**Interaction.** Scroll scrubs. Pointer adds a small parallax offset to the camera
(±2 degrees) so the scene feels alive when the visitor is still. No orbit control — free
rotation destroys art direction.

**Implementation.** R3F + Drei `ScrollControls`, or GSAP ScrollTrigger with `scrub: 1`
driving a camera along a `CatmullRomCurve3`. Model as glTF, Draco-compressed, KTX2 textures.
Beats as normalized progress markers, `useTransform` per beat. Postprocessing limited to one
effect that carries meaning (usually DOF, to direct attention).

**Fallback.** No WebGL → a pre-rendered image sequence scrubbed on canvas. No JS → a static
hero image plus the copy, laid out properly.

**Performance.** Lazy-init the canvas via IntersectionObserver. DPR `min(dpr, 2)`.
Pause the RAF loop when off-screen or `document.hidden`. Budget: model under 2 MB
compressed. Preload before the pin engages, never during.

**Mobile.** Shorten the path, drop postprocessing, DPR cap 1.5, reduce pin distance so the
section does not feel endless. Below 480px, prefer the image-sequence fallback outright.

**Accessibility.** Content lives in real DOM sections behind the canvas. Never trap scroll —
one flick should always escape. `prefers-reduced-motion` jumps between beats rather than
scrubbing. Keyboard reaches every beat's text.

---

## R2 — Editorial portfolio whose images become WebGL planes

**Design intention.** A perfectly ordinary, well-typeset editorial page that behaves
extraordinarily. The layout is the design; the shader is the atmosphere.

**Visual behaviour.** Images are DOM elements with correct alt text and layout. A single
full-viewport canvas mirrors each image's bounding box with a textured plane. On scroll,
planes displace subtly with velocity. On hover, a displacement map warps toward the cursor.

**Interaction.** Hover distorts locally and settles elastically. Scroll velocity drives a
shared uniform so the whole page deforms together.

**Implementation.** Orthographic camera sized to viewport pixels; sync plane positions from
`getBoundingClientRect` on scroll and resize. Lenis for smoothed scroll. One `ShaderMaterial`
shared across planes with per-instance uniforms. Hide the DOM `<img>` with `opacity: 0` — do
**not** `display: none`, or you lose layout and semantics.

**Fallback.** WebGL unavailable or reduced-motion → set images back to `opacity: 1` and
remove the canvas. The page is complete without it. **This is the pattern's core virtue.**

**Performance.** Only upload textures for planes near the viewport. Reuse geometry.
Cap DPR at 2. Recompute rects on resize only, using a throttled observer.

**Mobile.** Below a width threshold, skip the canvas entirely — the DOM version is the
mobile design, not a degraded one.

**Accessibility.** Fully accessible by construction: real images, real alt text, real
reading order. Canvas is `aria-hidden`.

---

## R3 — Cursor-reactive liquid distortion

**Design intention.** The surface is a material that remembers being touched. Presence,
not decoration.

**Visual behaviour.** Cursor movement pushes a velocity field. The field advects and decays,
leaving a wake that dissipates over ~1.5s. Applied as refraction over a background.

**Interaction.** Pointer velocity injects force. Faster movement, stronger displacement.
Idle → the surface settles to rest.

**Implementation.** Two ping-pong render targets holding velocity. Each frame: advect,
inject force at pointer, apply dissipation, then use the field as a displacement lookup in
the final pass. `OGL` or raw Three.js. Half-resolution simulation buffer is plenty.

**Fallback.** Static gradient background with a CSS radial highlight following the cursor.

**Performance.** Simulation at 1/2 or 1/4 resolution — this is the whole optimisation.
Stop simulating when the pointer has been idle and the field has decayed below a threshold.

**Mobile.** Drive from touch position during drags; otherwise leave static. Consider
disabling entirely — it is a pointer idiom.

**Accessibility.** Decorative only. Must never affect text contrast — check the extremes.
Disabled under reduced-motion.

---

## R4 — Infinite spatial gallery

**Design intention.** Browsing is wandering. No pagination, no end, no "page 2".

**Visual behaviour.** A boundless plane of media. Items scale slightly toward the viewport
centre. Motion carries inertia; drag has weight. The grid wraps invisibly.

**Interaction.** Drag to pan with momentum. Click an item to zoom to it. Escape returns to
the field.

**Implementation.** Track camera offset; position items with a modulo so they wrap. Recycle
a fixed pool of tiles — never instantiate per item. Instanced meshes in Three.js, or
transformed DOM for smaller sets. Momentum via a spring on the offset.

**Fallback.** A conventional responsive grid with the same items.

**Performance.** Fixed tile pool is the point — cost is constant regardless of collection
size. Cull anything outside the viewport plus one tile of margin.

**Mobile.** Touch-drag is natural. Reduce visible tile count; increase tile size.

**Accessibility.** Provide a linear list view toggle. Keyboard arrows move between items.
Focus must be visible and must scroll the item into view.

---

## R5 — Typography whose variable axis responds to pointer velocity

**Design intention.** Type that responds to the reader's energy. Restrained — the effect
should be noticed on the second visit, not the first.

**Visual behaviour.** Weight (and optionally width/slant) rises with pointer or scroll
velocity and settles back with spring damping. Range stays inside legible bounds.

**Interaction.** Move fast, type thickens. Stop, it settles. Optional per-character
distance falloff so the axis peaks nearest the cursor.

**Implementation.** `useVelocity(useScroll())` or a pointer-velocity hook → `useSpring` →
`useTransform` to the axis range → `font-variation-settings`. Never route this through
`useState`. For per-character falloff, split text once and drive each glyph from a shared
motion value.

**Fallback.** Static mid-range axis value. Non-variable font → a fixed weight.

**Performance.** Very cheap. The only risk is per-glyph splitting on long text — cap it to
headings.

**Mobile.** Drive from scroll velocity instead of pointer. Works well.

**Accessibility.** Never let weight drop below readable or contrast fall below AA. Freeze
to the mid value under reduced-motion. Keep the original text node intact for screen
readers and `aria-hidden` the split copy.

---

## R6 — Sticky scene narrative (scrollytelling)

**Design intention.** Explain something in sequence, where the visual is continuous and the
words advance through it.

**Visual behaviour.** One pinned visual; text panels pass over or beside it. Each step
mutates the visual — data changes, camera moves, a layer highlights.

**Interaction.** Scroll advances steps. Steps snap softly at boundaries but never trap.

**Implementation.** `position: sticky` for the visual plus IntersectionObserver per step
(Scrollama is the mature choice) — cheaper and more robust than pinning. Reserve GSAP
ScrollTrigger for genuine scrub work.

**Fallback.** Steps become a normal stacked article with the visual repeated per step.

**Performance.** Prefer discrete state changes to continuous scrubbing where the story
allows — dramatically cheaper and often reads better.

**Mobile.** Text below the visual, not beside it. Each step must fit one viewport with the
visual still visible. Shorten step distances substantially.

**Accessibility.** Steps are real sections in reading order. No scroll hijacking. Any data
shown visually also exists as a table or text summary.

---

## R7 — Liquid page transition with a persistent WebGL scene

**Design intention.** The site is one continuous space. Navigation is movement within it,
not replacement of it.

**Visual behaviour.** On navigation, a shaped wipe covers the swap while the 3D background
continues moving, retargeting its camera to the new route's state.

**Interaction.** Any nav click. Transition must not block input for longer than ~500ms.

**Implementation.** Hoist the canvas above the router so it never unmounts. Each route
declares a target camera/scene state; tween on navigation. Use the View Transitions API for
the DOM layer where supported, falling back to a manual overlay.

**Fallback.** Plain cross-fade. No JS → ordinary full page loads.

**Performance.** One long-lived WebGL context is a significant win — no re-initialisation
per route. Preload the next route's assets on link hover.

**Mobile.** Shorten to under 400ms. Long transitions read as jank on touch.

**Accessibility.** Move focus to the new page's `<h1>` after transition and announce the
change via a live region. Skip the overlay under reduced-motion but still move focus.

---

## R8 — Reduced-motion as a designed second state

**Design intention.** Treat `prefers-reduced-motion` as an alternate art direction rather
than a switch that removes things. Per §18 and the gap identified in `novel_combinations.md`,
almost nobody does this — which makes it differentiating as well as correct.

**Visual behaviour.** The motion-rich version trades kinetics for composition: stronger type
hierarchy, more decisive colour, a still hero image chosen to be beautiful in itself, more
generous whitespace where motion used to carry the eye.

**Interaction.** All the same affordances; state changes are instant or cross-faded.

**Implementation.** Author the still version *first* as the base layer, then add motion
inside `@media (prefers-motion: no-preference)`. This inverts the usual order and is why the
still version usually ends up broken — it is written as a subtraction rather than a design.

**Fallback.** This *is* the fallback — and it should be good enough to ship on its own.

**Performance.** Substantially cheaper. Use the same branch for low-power/low-battery tiers.

**Mobile.** Often the better default on low-end devices regardless of user preference.

**Accessibility.** The entire point. Verify hierarchy still reads without motion cueing it.
