#!/usr/bin/env node
/**
 * slopscan — an executable taste gate.
 *
 * Turns the consensus rules of the creative-web corpus into a failing test. Colour bans
 * are evaluated in OKLCH (perceptual) rather than by matching hex strings, so a banned
 * look cannot slip through by being a slightly different shade.
 *
 * Usage:  node slopscan.mjs <dir> [--json] [--warn-only]
 * Escape: /* creative-web-allow: RULE_ID -- reason *\/   (same line, or the line above)
 *
 * Exit 0 = clean (or warnings only). Exit 1 = at least one ERROR.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.argv[2] || ".";
const JSON_OUT = process.argv.includes("--json");
const WARN_ONLY = process.argv.includes("--warn-only");

const EXT = new Set([".css",".scss",".sass",".less",".js",".jsx",".ts",".tsx",".html",".svelte",".vue",".astro"]);
const SKIP = new Set(["node_modules",".git","dist","build",".next",".nuxt","out","coverage",".astro","vendor",".venv"]);

/* ---------- colour: sRGB -> OKLCH ------------------------------------- */
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

function rgbToOklch(r, g, b) {
  const lr = srgbToLinear(r / 255), lg = srgbToLinear(g / 255), lb = srgbToLinear(b / 255);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

function parseColor(tok) {
  tok = tok.trim().toLowerCase();
  let m = tok.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
    if (h.length >= 6) {
      return rgbToOklch(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
    }
  }
  m = tok.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (m) return rgbToOklch(+m[1], +m[2], +m[3]);
  m = tok.match(/^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/);
  if (m) { let L = +m[1]; if (tok.includes("%")) L /= 100; return { L, C: +m[2], H: +m[3] }; }
  return null;
}

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|oklch\([^)]*\)/g;

/* ---------- rules ------------------------------------------------------ */
const findings = [];
function add(sev, rule, file, line, msg, ctx) {
  findings.push({ sev, rule, file, line, msg, ctx: (ctx || "").trim().slice(0, 110) });
}

// A rule is silenced by an allow-comment on its own line or the line above.
function allowed(lines, i, rule) {
  const probe = (lines[i] || "") + " " + (lines[i - 1] || "");
  const m = probe.match(/creative-web-allow:\s*([A-Z_,\s]+)/);
  if (!m) return false;
  return m[1].split(/[,\s]+/).filter(Boolean).includes(rule);
}

/**
 * Strip comments before matching code rules.
 * Found by running this scanner on its own skill's demo build: a CSS comment reading
 * "never scale(0)" was reported as a scale(0) violation. A gate that fires on prose
 * about the rule teaches people to disable the gate.
 */
function stripComments(src) {
  const out = src.split(/\r?\n/);
  let inBlock = false;
  return out.map((line) => {
    let s = "";
    for (let i = 0; i < line.length; i++) {
      const two = line.slice(i, i + 2);
      if (inBlock) {
        if (two === "*/") { inBlock = false; i++; s += "  "; } else s += " ";
        continue;
      }
      if (two === "/*") { inBlock = true; i++; s += "  "; continue; }
      if (two === "//") { s += " ".repeat(line.length - i); break; }
      if (line.slice(i, i + 4) === "<!--") {
        const end = line.indexOf("-->", i);
        if (end === -1) { s += " ".repeat(line.length - i); break; }
        s += " ".repeat(end + 3 - i); i = end + 2; continue;
      }
      s += line[i];
    }
    return s;
  });
}

function scanFile(file, src) {
  const lines = src.split(/\r?\n/);
  const code = stripComments(src);   // same line count; comments blanked out
  const isStyle = /\.(css|scss|sass|less)$/.test(file);
  const isMarkupish = /\.(jsx|tsx|html|svelte|vue|astro)$/.test(file);

  code.forEach((raw, i) => {
    const line = raw;
    const low = line.toLowerCase();
    const n = i + 1;
    // Match against stripped code, but report the ORIGINAL line as context.
    const R = (sev, rule, msg) => { if (!allowed(lines, i, rule)) add(sev, rule, file, n, msg, lines[i]); };

    if (/transition\s*:\s*all\b|transition-property\s*:\s*all\b/.test(low))
      R("ERROR", "TRANSITION_ALL", "transition: all — enumerate the properties; this animates layout by accident");

    if (/transition[^;]*\b(width|height|top|left|right|bottom|margin|padding)\b\s*[\d.]*s?/.test(low)
        && !/transform|opacity/.test(low.split(":")[1] || ""))
      R("ERROR", "ANIMATE_LAYOUT", "animating a layout property — use transform/opacity (8+ sources)");

    if (/(scale\(\s*0\s*\)|scale3d\(\s*0\s*,|scale\s*:\s*0\s*[;,}])/.test(low))
      R("ERROR", "SCALE_ZERO", "scale(0) entrance reads as a bug — use scale(0.95)");

    if (/\b(transition|animation)[^;]*\bease-in\b/.test(low) && !/ease-in-out/.test(low))
      R("ERROR", "EASE_IN", "ease-in on UI motion delays movement exactly when the user is watching");

    if (/-webkit-background-clip\s*:\s*text|background-clip\s*:\s*text/.test(low))
      R("WARN", "GRADIENT_TEXT", "gradient text is a named AI tell unless deliberately argued for");

    // duration > 300ms on something that reads as UI feedback
    const dur = low.match(/\b(transition|animation)[^;]*?(\d+)ms/);
    if (dur && +dur[2] > 300 && !/keyframes|hero|intro|reveal|scroll/.test(low))
      R("WARN", "SLOW_UI", `${dur[2]}ms — UI feedback should stay under 300ms; narrative motion may exceed it`);

    if (/font-family\s*:\s*['"]?Inter\b/i.test(line))
      R("WARN", "INTER_DEFAULT", "Inter as first family reads as a non-decision — 0 of 10 measured award sites used it");

    // colours
    const gradient = /gradient\(/.test(low);
    const cols = (line.match(COLOR_RE) || []).map(parseColor).filter(Boolean);
    if (gradient && cols.length >= 2) {
      // The source skill publishes this band as hue 250-290, but measured against the
      // actual palette everyone reaches for it is too narrow at the purple end:
      // violet-500 #8b5cf6 is H 292.7 and purple-600 #7c3aed is H 293.0, so the canonical
      // purple->indigo gradient escapes its own ban. Widened to 255-310, with a chroma
      // floor so desaturated near-neutrals in that hue range do not trip it.
      const lila = cols.filter((c) => c.H >= 255 && c.H <= 310 && c.C > 0.08);
      if (lila.length >= 2)
        R("ERROR", "LILA_GRADIENT", "purple→blue gradient (both stops OKLCH hue 255–310, C>0.08) — the most-named AI tell (7 sources)");
    }
    if (/background(-color)?\s*:/.test(low)) {
      for (const c of cols) {
        if (c.L >= 0.84 && c.L <= 0.97 && c.C < 0.06 && c.H >= 40 && c.H <= 100)
          R("WARN", "CREAM_GROUND", "cream/warm-beige ground — the saturated 2nd-order reflex (6 sources)");
        if (c.L < 0.02 && c.C < 0.02)
          R("WARN", "PURE_BLACK", "pure black ground — use off-black (measured sites use #010102-class values)");
      }
    }

    if (isMarkupish && /—/.test(line) && !/\/\/|\/\*|\*/.test(line.trim().slice(0, 2)))
      R("WARN", "EM_DASH", "em dash in visible copy — use a period, comma, colon or parentheses");

    const z = line.match(/z-index\s*:\s*(\d+)/);
    if (z && !["0","1","10","100"].includes(z[1]) && +z[1] > 1)
      R("WARN", "ZINDEX_ADHOC", `z-index: ${z[1]} — keep a documented scale rather than ad-hoc values`);
  });

  return { isStyle, isMarkupish };
}

/* ---------- walk ------------------------------------------------------- */
const files = [];
(function walk(dir) {
  let ents;
  try { ents = readdirSync(dir); } catch { return; }
  for (const e of ents) {
    if (SKIP.has(e) || e.startsWith(".") && e !== ".claude") continue;
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p);
    else if (EXT.has(extname(e))) files.push(p);
  }
})(ROOT);

let sawMotion = false, sawReducedMotion = false, sawKeyframes = false;
const fonts = new Set();

for (const f of files) {
  let src; try { src = readFileSync(f, "utf8"); } catch { continue; }
  const rel = relative(ROOT, f) || f;
  if (/transition\s*:|animation\s*:|@keyframes|animate\(|useSpring|gsap\.|framer-motion|motion\./.test(src)) sawMotion = true;
  if (/prefers-reduced-motion/.test(src)) sawReducedMotion = true;
  if (/@keyframes/.test(src)) sawKeyframes = true;
  for (const m of src.matchAll(/font-family\s*:\s*([^;{}\n]+)/g)) {
    const first = m[1].split(",")[0].replace(/['"]/g, "").trim();
    if (first && !/^(inherit|initial|unset|var\(|sans-serif|serif|monospace|system-ui)/i.test(first)) fonts.add(first);
  }
  scanFile(rel, src);
}

if (sawMotion && !sawReducedMotion)
  add("ERROR", "NO_REDUCED_MOTION", "(project)", 0,
      "motion present but no prefers-reduced-motion anywhere — must render a complete stable final state, not a faster animation (6 sources)");

if (fonts.size > 3)
  add("WARN", "FONT_SPRAWL", "(project)", 0, `${fonts.size} font families (${[...fonts].slice(0,5).join(", ")}…) — two is the working maximum`);

/* ---------- report ----------------------------------------------------- */
const errors = findings.filter((f) => f.sev === "ERROR");
const warns = findings.filter((f) => f.sev === "WARN");

if (JSON_OUT) {
  console.log(JSON.stringify({ files: files.length, errors: errors.length, warnings: warns.length, findings }, null, 2));
} else {
  const byRule = new Map();
  for (const f of findings) { if (!byRule.has(f.rule)) byRule.set(f.rule, []); byRule.get(f.rule).push(f); }
  if (!findings.length) console.log(`slopscan: clean — ${files.length} files, 0 findings`);
  for (const [rule, list] of [...byRule.entries()].sort((a, b) => (a[1][0].sev === "ERROR" ? -1 : 1))) {
    const sev = list[0].sev;
    console.log(`\n${sev === "ERROR" ? "✗ ERROR" : "! warn "}  ${rule}  (${list.length})`);
    console.log(`   ${list[0].msg}`);
    for (const f of list.slice(0, 6)) console.log(`   ${f.file}:${f.line}  ${f.ctx}`);
    if (list.length > 6) console.log(`   …and ${list.length - 6} more`);
  }
  console.log(`\nslopscan: ${files.length} files · ${errors.length} error(s) · ${warns.length} warning(s)`);
  if (errors.length) console.log("Fix them, or annotate with /* creative-web-allow: RULE_ID -- reason */");
}

process.exit(errors.length && !WARN_ONLY ? 1 : 0);
