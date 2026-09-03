<!-- Reference for the creative-web skill. Extracted from
     research/design_intelligence.md, which is the full document and the place to edit. -->

# Anti-slop and escaping defaults

## 4. The anti-generic filter

Skills converge on a near-identical list of AI tells. Treating these as *banned by
default, permitted only when deliberately argued for* is what the brief means by
"authored rather than generated."

**Visual**
- AI-purple / blue-violet SaaS gradients
- Centered hero over a dark mesh gradient
- Glassmorphism applied to everything
- Meaningless glowing borders; floating orbs with no referent
- Uniform border radius everywhere (esp. 24px on everything)
- Pure black `#000000` — `stitch-design-taste`: use off-black, zinc-950, or charcoal
- Arbitrary Three.js objects added purely to look impressive

**Layout**
- Three equal feature cards
- Generic bento grids used as a default rather than a decision
- Every section fading up on scroll
- Hero text + dashboard screenshot
- Oversized pill buttons everywhere
- `design-taste-frontend`: *"Use cards ONLY when elevation communicates real hierarchy.
  Otherwise group with `border-t`, `divide-y`, or negative space."*

**Typography**
- Inter as an unconsidered default (*"AVOID Inter as default"*)
- Em-dash as a general-purpose separator — several skills ban it outright in
  headlines, eyebrows, labels, button text, captions, and quote attribution
- Serif fonts in dashboards

**Content**
- The "Jane Doe" effect — obviously fake names, logos, and testimonials
- Filler phrases and fake statistics in the hero
- `gpt-taste`: nothing floating on the hero text, no pill-tags under the hero, no raw
  stats in the hero

**Structure**
- `NEVER` spam arbitrary `z-50` / `z-10`. Keep a documented z-index scale.
- Never hand-roll SVG icons — install a library or compose from primitives.

The generative question to ask against any of these, from the brief and echoed by
`frontend-design`'s restraint section: **"What would a strong human art director do
differently here?"**

### 4.1 What "slop" actually is

The best definition found anywhere in this research, from `no-ai-design-slop`:

> **"Slop is not a color, font, gradient, card, or animation. It is a choice made by
> reflex rather than for the product."**

This reframes the whole problem from *style* to *process*, and it matters because it means
the §4 list above is not a list of banned things. A gradient, a serif, a dark theme, a
glass effect, a card, an animation — each can be exactly right when chosen for a reason.
`audit-ai-design-slop` is explicit that you must **"not reject a visual technique in
isolation"** and must **"not guess whether AI made the design."** The defect is unreasoned
reflex, not the technique.

### 4.2 The Removal Test

A falsifiable five-step procedure to run on any suspect element:

1. **Name it precisely** — "the selected state", "the radial spotlight", "the nested card".
2. **State its job.**
3. **Remove it mentally.**
4. **If clarity survives or improves, delete it.** Default to subtraction.
5. **Only replace if deletion causes real loss** — and any replacement must inherit the
   product's existing language rather than introduce a new visual concept.

Treat a choice as suspect when *several* of these are true (not any one): it could be
pasted into an unrelated product unchanged; it repeats a familiar generated-design pattern;
it conflicts with the local system or nearby sections; it communicates no information,
state, hierarchy or brand meaning; it competes with content or weakens trust.

### 4.3 High-signal clusters — diagnose the root cause, not the symptoms

The most reusable structural idea in the anti-slop material: these defects co-occur, and
each cluster has **one** root cause. Fix that once rather than filing every instance.

| Cluster | Co-occurring symptoms |
|---|---|
| **Generic AI SaaS** | tracked eyebrow + oversized headline + purple gradient + radial lights + glass cards + icon tiles + bento grid + vague copy |
| **Card apocalypse** | nested cards + pill labels + redundant borders + extreme radii |
| **Motion theater** | hidden-at-rest content + identical reveals + marquee + pulsing statuses + scale-on-hover + no reduced-motion path |
| **Fake sophistication** | monospaced micro-labels + decorative grid + fake dashboard + invented metrics + browser chrome |

Governing rule: *"Do not count isolated matches… Fix the root cause once. Do not treat
every repeated instance as a separate design idea."* When reviewing, cap output at five to
eight highest-impact findings and group repeated instances into one systemic finding —
which prevents the nitpick-flooding that makes most automated design review useless.

Prioritise P0 (blocks completion / severe a11y / deceptive proof) → P1 (materially harms
comprehension, trust or navigation) → P2 (repeated slop weakening hierarchy or identity) →
P3 (minor polish).

### 4.4 Fabricated proof is a correctness bug, not a style issue

Several sources converge here and it is worth stating separately because it has legal and
ethical weight, not just aesthetic weight: no invented testimonials, no fake customer
logos, no invented partnerships, no fabricated metrics, no "generated people presented as
real customers", no static status dressed up with a pulsing dot to imply live data, no
fake blinking cursor on non-editable copy. `build-awwwards-quality-sites` additionally
forbids reusing, tracing or closely reproducing reference assets, source code, identity or
copy — which is the same Bucket A / Bucket B line this research operates under.

---


## 6. Restraint — where the corpus is most emphatic

The brief's §15 is corroborated by nearly every strong skill:

- `brandkit`: *"Do not make every panel equally loud."* / *"Use empty space to create
  intelligence."*
- `frontend-design`: an entire section titled "Restraint and self-critique."
- `imagegen-frontend-mobile`: *"do not overload the first viewport... do not fill it
  with extra stats, chips, tags, or pills... do not bury the main CTA."*
- `redesign-existing-projects`: *"Always one filled button + one ghost button."*

The operating principle: **motion and ornament must create hierarchy, storytelling,
tactility or delight.** Anything that does none of those four is subtraction disguised
as addition. A page where everything glows has no hierarchy; a page where one thing
glows has a focal point.

---


## 9.5 Escaping your own defaults — the most important section here

Two skills (`auteur`, `scroll-craft`) independently identified the failure this whole
research project exists to solve, and they solve it further than anything else found.

### The reflex ladder

Avoiding the obvious cliche is no longer enough, because **the avoidance move has itself
become a cliche.** `auteur` makes this a procedure to run before writing code:

1. **First order.** Complete honestly: *"An AI told to design a <category> site would
   produce <palette, type, layout>."* If your plan matches, discard it.
2. **Second order.** *"An AI told to* avoid *that would produce <...>."* If your plan matches
   **that**, discard it too. Its verdict: *"The second reflex is saturated for every major
   category as of 2026."*

| Category | 1st-order reflex (dead) | 2nd-order reflex (also dead) | Live escape |
|---|---|---|---|
| AI / dev tool | dark bg, purple-blue glow, terminal type | editorial serif on off-white "anti-SaaS" | physical-material metaphor; single drenched hue; blueprint density |
| Fintech | navy + gold, trust badges, glass cards | terminal-native dark mode | ledger/print heritage + modern motion; numerals that mean something |
| SaaS B2B | blue gradient hero, 3 cards, hero-metric | cream editorial with serif headlines | product-as-hero (real annotated UI); mono-hue drench |
| Wellness | sage + beige + airy serif | clinical ultra-white minimal | saturated botanical; candle-lit dark; documentary photography |
| Luxury | black + gold + thin serif | ultra-minimal white void | drenched jewel tone; cinematic letterbox |

The cream/warm-beige editorial look is named as slop by **six independent sources** in this
corpus, and the purple-to-blue gradient by **seven** (one skill simply calls it "the lila
ban"). `auteur` is the only one to make it programmatically testable: OKLCH
*L 0.84-0.97, C < 0.06, hue 40-100*. Its purple-gradient test is likewise numeric - both
stops in hue 250-290.

### Third order: your own signature

The subtler failure is repeating *yourself* across builds. `auteur` measured its own
showcase output and found: eight of nine builds dark (three within 0.002 of each other at
mean L = 0.177), the same mono typeface independently chosen twice, amber accent three
times, one header layout in seven of nine, a counter-footer in six.

> *"None of those is a mistake. All of them together are a signature - and a signature is
> exactly what a client did not order."*

Its rule: the plan must name **at least two** house tells being deliberately broken this
time - *"Breaking one is coincidence; two is a decision."*

`scroll-craft` solves the same problem differently, with a persistent cross-build registry
(`FINGERPRINTS.md`) recording each past build's grammar, nav, hero device, act sequence,
close and signature move. Hard gate: **the new plan must differ from every prior row on at
least 4 of 6 dimensions** - against each row individually. Notably, its authors caught their
own tool converging (all four prior builds landed in the same act-count band) and promoted
that band to a tracked dimension.

**Two independent teams built anti-self-repetition machinery. Nothing else in the corpus
does this, and it is the difference between a tool that avoids cliches and one that avoids
becoming one.**

### Structural rules worth stealing wholesale

From `scroll-craft`, for narrative scroll pages:

- **Feeling curve before device.** Author one emotion plus its on-screen cause per act
  *before* choosing any technique - *"a device chosen before the feeling is a device looking
  for a reason."* Feeling is not energy: *"on a loud page the quiet act can be the most
  intense."*
- **Exactly one engineered peak.** Zero peaks or three competing ones are both failures. The
  peak gets the most scroll room, the largest span, and the silence before it.
- *"Five sections that behave identically are one section shown five times."* Two adjacent
  acts with the same feeling means one is filler.
- **Budgets:** total page 8-14 viewport-heights (*"longer is not more immersive, it is
  slower"*); at least 4 distinct device families; never the same device twice in a row; **at
  most two video-scrub acts** - *"the third one stops being a surprise."*
- **One style preamble, reused verbatim** across every asset prompt. *"Reusing it word for
  word is what makes eight separately generated assets look like one shoot. Paraphrasing it
  is what makes them look like eight prompts."*

`auteur` adds the counterpart for product work: a multi-screen system should have **no**
peak at all - there the failure mode is drift, not boredom. The two skills agree, and
together they say peaks are a property of narrative pages specifically.

### Measurement rules, not just targets

- **Contrast on the worst frame.** For text over a scrubbed video, measure contrast on the
  composited page at the *brightest frame under each line* - not against a static swatch.
- **Fullscreen passes are priced per pixel, not per object.** Bloom, grain, DoF and any
  full-frame shader - not geometry - are what blow the frame budget.
- **A performance number counts only at DPR 2 on a production build.** DPR 1 quarters the
  cost of every fullscreen pass and a dev server roughly doubles frame time.
- **"Cheerful drift"** - handed a near-monochrome reference, image models return a
  friendlier, bluer, more saturated version, and the drift survives with the reference
  on screen. Record the reference's mean OKLCH chroma as a *number* and check the output
  against it, *"because 'looks about right' is exactly the judgement that drifted."*
- **Check the greyscale.** If the subject dissolves into its own field (light hero on light
  ground) it reads as a smudge; the value collision is unmissable in greyscale and easy to
  miss in colour.
- **Encode for scrubbing, not playback.** Scroll-scrubbed video needs a dense GOP, because
  seeking walks from the previous keyframe. A normal web encode plays fine and scrubs like
  mud.
- **Automated verification has a hard ceiling.** `scroll-craft` reports a build that passed
  four green automated rounds while the hero clip sat frozen on a real iPhone - headless
  Chrome cannot reproduce a device's video decoder, autoplay policy, Low Power Mode or touch
  scrolling. Real-device testing is not optional. And the harness *"cannot tell you the
  composition is good, the motion is smooth, or the page means anything."*

### The feel check

After the harness passes: scroll the page cold, write one word per act, diff against the
intended feeling curve. Where they disagree, **the page is wrong, not the brief.**

Five yes/no questions from `auteur` to close on:

- Could a stranger guess the category from the palette alone? *(If yes, reflex won.)*
- Do any two sections open identically? *(If yes, vary one.)*
- Would deleting the third font / colour / pattern hurt? *(If no, delete it.)*

---
