<!-- Reference for the creative-web skill. Extracted from
     research/design_intelligence.md, which is the full document and the place to edit. -->

# 3D and performance

## 7. Performance as a design constraint

Expensive creative patterns need four versions, decided up front, not retrofitted:

| Tier | What it means |
|---|---|
| **Full** | Desktop, discrete GPU, hero interaction at full fidelity |
| **Mobile** | Reduced particle counts, lower DPR cap, simplified shaders, fewer draw calls |
| **Low-power** | Static or CSS-only substitute; no continuous RAF loop |
| **No-motion** | `prefers-reduced-motion` — the design must still *read* |

Techniques the corpus points to: lazy WebGL init (never boot a canvas above the fold
before it is needed), dynamic imports, Draco/Meshopt geometry compression, KTX2 texture
compression, LOD, instancing, draw-call reduction, DPR adaptation (`min(devicePixelRatio, 2)`),
OffscreenCanvas + workers, and progressive enhancement of the DOM underneath the canvas.

Targets: hardware-accelerated transforms only (`transform`/`opacity`), and Core Web
Vitals treated as pass/fail rather than aspirational.

### 7.1 Hard numbers for 3D work

From the Three.js skill pack — the most useful numeric artifact in the corpus, because
"is this scene too heavy?" is otherwise pure guesswork. Read from `renderer.info`.

| Metric | Target (60 FPS) | Warning | Critical |
|---|---|---|---|
| Draw calls | < 100 | 100–500 | > 500 |
| Triangles | < 1M | 1M–3M | > 3M |
| Textures (GPU) | < 50 | 50–200 | > 200 |
| Shader programs | < 20 | 20–50 | > 50 |
| Frame time | < 16.6ms | 16.6–33ms | > 33ms |

Accompanying rules that decide architecture rather than tuning:

- **Cap device pixel ratio**: `Math.min(devicePixelRatio, 2)`. At DPR 3 a phone renders 9×
  the pixels of a 1× display — over 18 million per frame — and *"the visual difference
  between 2× and 3× is imperceptible."* This is the single highest-leverage line in mobile
  WebGL.
- **Instancing ladder**: < 10 instances, plain `Mesh`; 10–100, either, profile it;
  100–10,000, **always** `InstancedMesh`; > 10,000, instancing plus spatial subdivision or
  `BatchedMesh`. Never merge geometries that need independent transforms, materials, or
  raycast targets — merging is a one-way door.
- **LOD**: at least three levels, and triangle count must drop **≥ 50%** between each.
- **Disposal**: always dispose on permanent removal, scene switch, model unload or
  component unmount; never on temporary hide (`visible = false`), and only when *all*
  users of a shared geometry/material are done.
- **Lights are budgeted by platform**: mobile 3–4 lights and at most 1 shadow caster
  (directional only); desktop 8–16 lights, 2–3 casters. **Never use point-light shadows on
  mobile** — each costs six shadow-map renders because it is a cubemap.
- **Materials are cost-gated**: never reach for `MeshPhysicalMaterial` when
  `MeshStandardMaterial` suffices; reserve Physical for clearcoat/transmission/sheen.
  `MeshBasicMaterial` has zero lighting cost.
- **Post-processing has a mandatory pass order**: RenderPass first → geometry passes
  (SSAO/GTAO/SSR) → effect passes (bloom/DoF/outline) → anti-aliasing → colour grading →
  **OutputPass last**. Omitting OutputPass silently skips tone mapping and colour-space
  conversion. On mobile, prefer no post-processing at all and bake the effect.
- **Camera FOV is a genre decision, not a default**: general 50–75°, product viewer 35–45°
  (less distortion), architectural 60–90°, cinematic 20–35° (telephoto compression). Never
  set `near` to 0, and keep the near/far ratio under about 1:10000 to avoid z-fighting.

---
