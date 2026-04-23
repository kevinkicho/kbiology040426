# Known Limitations

A candid map of where *kbiology Nobel Frontier* stops being rigorous — so contributors don't mistake design tradeoffs for bugs, and don't ship changes that quietly depend on things that aren't actually true.

> **Scope.** This file is about the current repo, not future plans. If a limitation is fixed, delete the bullet rather than editing it in place. If a new one appears, add it with a date.

---

## 1. Scientific content is curated, not peer-reviewed

Every module is a *teaching narrative* about a Nobel discovery, not a literature review. Mechanism animations are stylised — the cartoon PD-1/PD-L1 synapse in `2018_immunotherapy.html` is a pedagogical cartoon, not a structurally faithful render of PDB 4ZQK. Specifically:

- Phase timings are dramatic, not kinetic. Autophagosome biogenesis doesn't happen in 5 equal beats.
- Stoichiometries are suggestive (e.g. 1 ULK1 ≈ 1 autophagosome) rather than accurate.
- The "Frontiers" tab reflects the author's reading as of early 2026 and will drift.

Do not cite a canvas frame in a paper. Do cite the linked PubMed IDs.

---

## 2. Data is a snapshot, not a live feed

`fetch_data.py` is a one-shot script. `data/*.json` is whatever the last human ran. Every output file now carries a `_meta.fetched_at` ISO-8601 UTC timestamp and each network call retries with exponential backoff (3 tries, 0.5s/1s/2s), so you can tell how old a snapshot is and transient failures don't shred the file. What's still missing:

- No scheduled refresh — the site will happily serve a year-old `resolution` field until someone re-runs `python fetch_data.py`.
- No schema validation on the output. A renamed RCSB field would still silently become `""` everywhere.
- The site itself doesn't yet read `_meta.fetched_at` — so the staleness info exists but isn't surfaced to the reader.
- The site also doesn't yet read `data/*.json` at all (dormant data; only `molecules_manifest.json` is in use). When modules start consuming it, they'll need to skip the `_meta` key when iterating.

---

## 3. The 10 module HTMLs are copy-paste siblings

Each of `modules/20{15..24}_*.html` is ~50–70kB and re-declares the same sidebar, tab strip, canvas scaffolding, and a module-specific `PHASES` array + `mechDraw()` closure. Shared behaviour lives in `shared/*.js`, but shared *markup* does not. Effect:

- A layout tweak is a 10-file edit.
- A regression can be introduced in one module without the others noticing.
- There is no automated test that all 10 modules satisfy the contract `mech-theater.js` expects (`#mech-canvas`, `#canvas-wrap`, `PHASES`, `animPhase`, optional `#btn-play`/sliders).

A template consolidation is on the todo list but not done.

---

## 4. Animations depend on undeclared globals

`shared/mech-theater.js` reads `PHASES` and `animPhase` off the enclosing script scope (see `mech-theater.js:61, 112, 153`). A `console.warn` now fires when `PHASES` is missing, so silent no-ops are at least visible in devtools. Residual concerns:

- The naming still couples shared code to a convention, not an API. A refactor to ES modules would need a compatibility shim.
- `animSpeed` is a global too, and is monkey-patched onto `requestAnimationFrame` in `auto-start.js:12-26`. Any third-party script that grabs `requestAnimationFrame` *before* `auto-start.js` loads will run at real time.

---

## 5. Auto-start heuristics can misfire

`auto-start.js` auto-clicks the first button matching `START_RE` and uses pixel-sampling to detect "is this canvas already live?" (`auto-start.js:51-60`). Known failure modes:

- A module whose phase 0 happens to be a near-uniform colour (all-black background, no particles yet) looks "dead" to the sampler and gets restarted even when the loop is fine.
- `START_RE` matches on visible button text. Change a button label to "Go" or localise to another language and auto-start silently stops working.
- If a module's play button is inside a not-yet-rendered tab panel, the first auto-start attempt misses it; the watchdog covers this but adds latency.

---

## 6. Theater mode is CSS-scaled, not re-rendered

We consciously chose CSS transform scaling over re-drawing at a larger resolution (README §Canvas Animation Architecture). Tradeoffs:

- Fonts and gradients stay crisp at ~1.5× on most displays but can look slightly soft on 4K monitors at >2× browser zoom.
- Click coordinates inside the canvas are in the **unscaled** space. Any future interactive canvas (hover tooltips on a pathway) will need to invert the CSS transform.
- The theater backdrop traps focus visually but not programmatically — a screen reader can still tab into hidden DOM behind it.

---

## 7. Accessibility is partial

- Keyboard shortcuts exist (Space / ← → / T / Esc) but are not announced anywhere in the UI beyond a button tooltip.
- The animated canvases have no text alternative. A blind user gets the "Story" and "Molecules" tabs but not the mechanism narrative.
- Colour is load-bearing for category identification (chips + card `--cc` accent). The text tag is also present, so this degrades gracefully, but there is no high-contrast mode.
- Glossary tooltips require hover — the 5-second pin gesture doesn't have a keyboard equivalent.

---

## 8. Progress tracking is local-only and coarse

`localStorage['kbiology-visited']` records years a card was clicked — not time spent, tabs visited, or whether the user read anything. A **Reset progress** link on the hub now lets users clear state after accidental clicks. Still pending:

- Clearing browser data outside the app still resets progress with no warning.
- Two browsers or two profiles = two independent progress states.
- There is no un-visit-one-card UI — reset is all-or-nothing.

---

## 9. Browser and device assumptions

- Desktop-first. The sidebar + main + canvas layout collapses awkwardly below ~900px; there is no mobile breakpoint story.
- `CanvasRenderingContext2D.roundRect` is used in three modules (2015, 2021, 2022). `shared/roundrect-polyfill.js` now ships and is loaded from those modules' `<head>` — so Safari <16 and old Chromium/Firefox get the rounded corners the art expects. Other modules don't call `roundRect`; if you add it somewhere new, remember to include the polyfill script tag.
- 3Dmol.js is lazy-loaded from a CDN in `molecule-modal.js:17`. Offline users get molecule metadata but no 3D viewer.

---

## 10. No CI, no tests, no linter

There is no `package.json`, no `pyproject.toml`, no pre-commit. Breakages in a shared JS file will only surface when someone manually loads each module in a browser. Lint failures, broken links, and missing glossary keys are caught by eyeball only.

---

## When in doubt

- **"Is it a bug or a limitation?"** If it surprises a contributor reading the code, it's a bug — fix it. If it surprises a user reading the content, it's a limitation — document it here.
- **"Should I add it to this file?"** Only if it would mislead someone who didn't write the code. Don't document choices that are obvious from reading `shared/`.
