<!-- Reference for the creative-web skill. Extracted from
     research/design_intelligence.md, which is the full document and the place to edit. -->

# Accessibility

## 8. Accessibility as a design constraint

Not a retrofit. The rules that actually bite on creative work:

- `prefers-reduced-motion` must produce a *designed* alternative, not a broken page.
- Canvas/WebGL content needs a **semantic DOM layer underneath** — real headings,
  real links, real text. The canvas is decoration over a document.
- Keyboard navigation must reach everything, and **focus must be visible** — creative
  sites overwhelmingly fail here by removing outlines without replacing them.
- Scroll-jacking is a motion-sickness risk; give an escape.
- Pointer-only interactions (magnetic cursors, hover reveals) need a touch and a
  keyboard path to the same content.
- Contrast holds in *both* themes.

Experimental design should **degrade gracefully**, which is a design problem, not an
engineering afterthought.

---
