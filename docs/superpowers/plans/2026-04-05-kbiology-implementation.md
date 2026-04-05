# kbiology Nobel Frontier — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a graduate-level interactive visual learning tool for the 10 Nobel Medicine & Physiology prizes 2015–2025, with animated mechanisms, molecule modals backed by local NIH data, and a hub mission-control page.

**Architecture:** Pure HTML/JS (no build step), shared infrastructure in `/shared/`, one module HTML per Nobel discovery in `/modules/`, local JSON data cache in `/data/` pre-populated by `fetch_data.py`. The molecule modal engine lives in `shared/molecule-modal.js`. Modules declare data arrays; the engine handles all rendering. All glossary terms in prose, property labels, and chip text use `.gtip[data-gloss]` for hover tooltips with longest-match + see-also linking.

**Tech Stack:** HTML5 Canvas 2D, vanilla JS ES6+, CSS custom properties, Python 3 + requests for data fetching, Python http.server for local serving.

**Spec:** `docs/superpowers/specs/2026-04-05-kbiology-design.md`

**Additional features locked in during brainstorming:**
- Property row labels (Resolution, Kd, pKa, Cancer relevance, etc.) carry `.gtip` tooltips
- Badge/chip text (translation initiation, m7G cap reader, etc.) carry `.gtip` tooltips
- Glossary engine uses **longest-match** algorithm: hovering "pseudouridine-modified mRNA" shows the most specific entry + "See also: mRNA" link inside the pinned tooltip
- Charge bar / pin timeout: **5 seconds** everywhere (hub chips, glossary tooltips, molecule modal header bar)

---

## File Map

```
kbiology040426/
├── index.html                         hub — Nobel timeline, filter chips, particle bg
├── serve.py                           python serve.py [port] — local HTTP server
├── fetch_data.py                      one-time NIH data fetcher
├── data/
│   ├── molecules_manifest.json        seed list of CIDs, PDB IDs, PMIDs to fetch
│   ├── compounds.json                 output: PubChem compound data
│   ├── proteins.json                  output: RCSB PDB metadata
│   └── papers.json                    output: PubMed abstracts
├── shared/
│   ├── theme.css                      CSS variables, layout helpers, shared classes
│   ├── auto-start.js                  ported from Penrose — RAF scaler, animation watchdog
│   ├── glossary-data.js               ~60 seed terms + per-module augmentation via Object.assign
│   ├── glossary-tooltip.js            ported+extended from Penrose: 5s pin, longest-match, see-also
│   ├── molecule-modal.js              MolModal.open(molData) engine — all 5 visualization tabs
│   └── molecule-modal.css             modal overlay styles
└── modules/
    ├── 2023_mrna.html                 TEMPLATE — canonical reference for all other modules
    ├── 2018_immunotherapy.html
    ├── 2024_microrna.html
    ├── 2019_hif_oxygen.html
    ├── 2016_autophagy.html
    ├── 2021_trp_channels.html
    ├── 2017_circadian.html
    ├── 2022_paleogenomics.html
    ├── 2020_hepatitis_c.html
    └── 2015_antiparasitic.html
```

---

## Wave 1 — Foundation (sequential, single session)

---

### Task 1: Project Scaffold + serve.py

**Files:**
- Create: `serve.py`
- Create: `.gitignore`
- Create: `data/`, `shared/`, `modules/` directories

- [ ] **Step 1: Create directories and serve.py**

```bash
cd "C:/Users/kevin/OneDrive/Desktop/kbiology040426"
mkdir -p data shared modules docs/superpowers/plans docs/superpowers/specs
```

```python
# serve.py
import http.server, socketserver, webbrowser, sys, os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({'.js': 'application/javascript', '.json': 'application/json'})

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    url = f"http://localhost:{PORT}"
    print(f"kbiology serving at {url}  (Ctrl+C to stop)")
    webbrowser.open(url)
    httpd.serve_forever()
```

- [ ] **Step 2: Create .gitignore**

```
__pycache__/
*.pyc
.superpowers/
data/compounds.json
data/proteins.json
data/papers.json
```

- [ ] **Step 3: Verify server starts**

```bash
python serve.py
# Expected: browser opens http://localhost:8080 showing directory listing
# Ctrl+C to stop
```

- [ ] **Step 4: git init and commit**

```bash
git init
git add serve.py .gitignore
git commit -m "feat: project scaffold"
```

---

### Task 2: shared/theme.css

**Files:** Create: `shared/theme.css`

- [ ] **Step 1: Create theme.css with CSS custom properties**

```css
/* shared/theme.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:#05050f; --bg2:#08082a; --bg3:#0b0b1e; --bg4:#0f0f28;
  --border:#1c1c44; --border2:#0f0f28;
  --text:#c0c0ea; --dim:#55558a; --muted:#33335a; --bright:#e8e8ff;
  --green:#00ff99; --cyan:#00e5ff; --gold:#ffd700; --pink:#ff4488;
  --orange:#ff8844; --teal:#44ffcc; --blue:#88aaff; --violet:#aa77ff;
  --good:#00ff99; --warn:#ffd700; --bad:#ff4444;
}

body { background:var(--bg); color:var(--text); font-family:'Segoe UI',system-ui,sans-serif; font-size:13px; line-height:1.5; }

h1 { font-size:1.4rem; color:var(--green); text-shadow:0 0 24px rgba(0,255,153,.35); letter-spacing:.06em; }
h2 { font-size:1.1rem; color:var(--green); letter-spacing:.05em; }
h3 { font-size:.9rem;  color:var(--bright); }
.subtitle { font-size:.75rem; color:var(--dim); }
.sec-lbl  { font-size:.62rem; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:5px; display:block; }

.panel-card { background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:10px 12px; }
.panel-title { font-size:.7rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin-bottom:7px; display:flex; align-items:center; gap:6px; }
.panel-title-bar { width:8px; height:2px; border-radius:1px; flex-shrink:0; }
.panel-body { font-size:.75rem; color:#8888b0; line-height:1.6; }
.panel-body strong { color:var(--text); }
.panel-body em { color:var(--green); font-style:normal; }

.prop-row { display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid var(--border2); font-size:.72rem; }
.prop-row:last-child { border-bottom:none; }
.prop-key { color:var(--dim); }
.prop-val { font-family:monospace; font-size:.7rem; color:var(--text); }
.prop-val.good { color:var(--good); }
.prop-val.warn { color:var(--warn); }
.prop-val.bad  { color:var(--bad);  }

.mol-chip { display:inline-flex; align-items:center; gap:6px; background:var(--bg4); border:1px solid var(--border); border-radius:5px; padding:4px 10px; font-size:.72rem; color:#8888b0; cursor:pointer; transition:.15s; }
.mol-chip:hover { border-color:var(--cyan); color:var(--cyan); }
.mol-chip.protein:hover { border-color:var(--violet); color:var(--violet); }
.mol-chip.lipid:hover   { border-color:var(--orange); color:var(--orange); }
.mol-chip.small:hover   { border-color:var(--gold);   color:var(--gold);   }

.tabs { display:flex; gap:2px; }
.tab { padding:6px 16px; border:1px solid transparent; border-bottom:none; background:transparent; color:var(--muted); font-size:.78rem; border-radius:5px 5px 0 0; cursor:pointer; transition:.15s; position:relative; top:1px; user-select:none; }
.tab:hover { color:var(--text); background:var(--bg3); }
.tab.active { color:var(--green); background:var(--bg3); border-color:var(--border); }
.tab-dot { display:inline-block; width:5px; height:5px; border-radius:50%; margin-right:5px; vertical-align:middle; opacity:.7; }

.btn { padding:5px 10px; background:var(--bg4); border:1px solid var(--border); color:var(--dim); border-radius:4px; font-size:.72rem; cursor:pointer; transition:.15s; }
.btn:hover { border-color:var(--green); color:var(--green); }
.btn.primary { border-color:rgba(0,255,153,.3); color:var(--green); background:rgba(0,255,153,.05); }
.btn-row { display:flex; gap:4px; flex-wrap:wrap; }

input[type=range] { width:100%; accent-color:var(--green); margin-top:3px; }
select { background:var(--bg4); border:1px solid var(--border); color:var(--text); padding:4px 8px; border-radius:4px; font-size:.78rem; width:100%; cursor:pointer; }
.val-disp { font-size:.75rem; margin-top:3px; font-family:monospace; color:var(--green); }

.callout { background:rgba(0,255,153,.04); border:1px solid rgba(0,255,153,.18); border-radius:5px; padding:9px 11px; font-size:.76rem; line-height:1.55; }
.callout strong { color:var(--green); }

.sidebar-block { margin-bottom:14px; }
.ctrl-row { display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid var(--border2); font-size:.71rem; }
.ctrl-row:last-child { border-bottom:none; }
.ctrl-lbl { color:var(--dim); }
.ctrl-val { color:var(--green); font-family:monospace; font-size:.7rem; }

/* Glossary tooltip trigger — applied by glossary-tooltip.js to [data-gloss] spans */
.gtip { border-bottom:1px dashed rgba(0,229,255,.4); cursor:help; color:inherit; white-space:nowrap; }
.gtip:hover { color:var(--cyan); border-bottom-color:var(--cyan); }

.ref-item { background:var(--bg4); border-left:2px solid var(--border); padding:6px 8px; border-radius:0 4px 4px 0; margin-bottom:5px; cursor:pointer; transition:.15s; }
.ref-item:hover { border-left-color:var(--green); }
.ref-year    { font-size:.6rem; color:var(--muted); font-family:monospace; }
.ref-title   { font-size:.68rem; color:#8888b0; line-height:1.4; margin-top:1px; }
.ref-journal { font-size:.6rem; color:#44447a; margin-top:2px; font-style:italic; }

::-webkit-scrollbar       { width:5px; height:5px; }
::-webkit-scrollbar-track { background:var(--bg2); }
::-webkit-scrollbar-thumb { background:#2a2a55; border-radius:3px; }
::-webkit-scrollbar-thumb:hover { background:#3a3a77; }
```

- [ ] **Step 2: Commit**

```bash
git add shared/theme.css
git commit -m "feat: shared dark theme CSS"
```

---

### Task 3: shared/auto-start.js

**Files:** Copy from Penrose project (unchanged).

- [ ] **Step 1: Copy**

```bash
cp "C:/Users/kevin/OneDrive/Desktop/ktopologymath040226/auto-start.js" \
   "C:/Users/kevin/OneDrive/Desktop/kbiology040426/shared/auto-start.js"
```

- [ ] **Step 2: Verify**

```bash
grep -c "animSpeed\|_rafReset" shared/auto-start.js
# Expected: >= 2
```

- [ ] **Step 3: Commit**

```bash
git add shared/auto-start.js
git commit -m "feat: port auto-start animation engine from Penrose"
```

---

### Task 4: shared/glossary-tooltip.js (extended with longest-match + see-also)

**Files:**
- Copy: `ktopologymath040226/glossary-tooltip.js` → `shared/glossary-tooltip.js`
- Modify: 3s → 5s timeout; add longest-match algorithm; add see-also link

- [ ] **Step 1: Copy base from Penrose**

```bash
cp "C:/Users/kevin/OneDrive/Desktop/ktopologymath040226/glossary-tooltip.js" \
   "C:/Users/kevin/OneDrive/Desktop/kbiology040426/shared/glossary-tooltip.js"
```

- [ ] **Step 2: Change pin timeout from 3000ms to 5000ms**

Open `shared/glossary-tooltip.js`. Find the `setTimeout` that transitions to `pinned` state. Change:
```javascript
// Find this line (exact text may vary slightly):
setTimeout(pin, 3000);
// Change to:
setTimeout(pin, 5000);
```
Also find `animation:gtip-charge 3s linear` in the CSS string and change `3s` to `5s`.

- [ ] **Step 3: Add longest-match term detection**

After the existing `init()` function, add the `longestMatch()` helper. Find the line where `data-gloss` attribute is read and replace it with the longest-match lookup:

```javascript
// Add this helper function before init():
function longestMatch(text) {
  const GLOSS = window.GLOSS || {};
  const lower = text.toLowerCase().trim();
  // Try progressively shorter prefixes (longest match wins)
  const words = lower.split(/\s+/);
  for (let len = words.length; len >= 1; len--) {
    const phrase = words.slice(0, len).join(' ');
    const key = Object.keys(GLOSS).find(k => k.toLowerCase() === phrase);
    if (key) return { key, entry: GLOSS[key], matchLen: len };
  }
  return null;
}

// Add this to find see-also terms (sub-terms of a compound term):
function seeAlsoTerms(text) {
  const GLOSS = window.GLOSS || {};
  const lower = text.toLowerCase().trim();
  return Object.keys(GLOSS).filter(k => {
    const kl = k.toLowerCase();
    return kl !== lower && lower.includes(kl) && kl.length > 3;
  }).map(k => ({ key: k, entry: GLOSS[k] }));
}
```

- [ ] **Step 4: Update tooltip content builder to include see-also links**

Inside the tooltip show function, after building the main definition content, add see-also links when sub-terms exist:

```javascript
// Inside the function that builds tooltip HTML content:
// After setting tp-def text, add:
const alsoTerms = seeAlsoTerms(hoverText);
if (alsoTerms.length > 0) {
  const alsoDiv = document.createElement('div');
  alsoDiv.style.cssText = 'margin-top:6px;font-size:10px;color:#44447a;border-top:1px solid #1c1c44;padding-top:5px';
  const alsoLabel = document.createTextNode('See also: ');
  alsoDiv.appendChild(alsoLabel);
  alsoTerms.forEach((t, i) => {
    const link = document.createElement('span');
    link.style.cssText = 'color:#00e5ff;cursor:pointer;text-decoration:underline;margin-right:6px';
    link.textContent = t.entry.term || t.key;
    link.addEventListener('click', () => { /* show nested tooltip or scroll to term */ });
    alsoDiv.appendChild(link);
    if (i < alsoTerms.length - 1) alsoDiv.appendChild(document.createTextNode(', '));
  });
  tooltipEl.appendChild(alsoDiv);
}
```

- [ ] **Step 5: Update badge styles — add `[frontier]` badge, keep `[grad]` and `[res]`**

In the CSS string within the file, replace `.tp-badge.ug` with:
```javascript
'#gtip-popup .tp-badge.frontier{background:#ff448814;color:#ff4488;border:1px solid #ff448828}',
```

- [ ] **Step 6: Verify with test page**

Create `shared/tooltip-test.html`:

```html
<!DOCTYPE html><html><head>
<link rel="stylesheet" href="theme.css">
</head><body style="padding:40px;background:#05050f;color:#c0c0ea">
<p>Hover these terms:</p>
<p style="margin-top:20px;line-height:2.5">
  <span data-gloss="m1psi">N1-methylpseudouridine (m1Psi)</span> |
  <span data-gloss="lnp">lipid nanoparticle (LNP)</span> |
  <span data-gloss="pd1">PD-1 checkpoint</span>
</p>
<script>
window.GLOSS = {
  'm1psi':{ term:'N1-methylpseudouridine (m1Psi)', level:'res',
    def:'Nucleoside mod replacing uridine in mRNA. Blocks TLR innate recognition; increases ribosome processivity 10x. The Kariko/Weissman Nobel insight.' },
  'lnp':  { term:'Lipid nanoparticle (LNP)', level:'grad',
    def:'~80-100 nm delivery vehicle: ionizable lipid + DSPC + cholesterol + PEG-lipid. Endosomal escape via re-protonation at pH 5.5.' },
  'pd1':  { term:'PD-1 (PDCD1)', level:'res',
    def:'Programmed cell death protein 1 — inhibitory T cell checkpoint. Target of nivolumab, pembrolizumab.' },
  'checkpoint': { term:'Checkpoint', level:'grad',
    def:'Molecular brake on T cell activity. CTLA-4 attenuates priming; PD-1 attenuates effector function.' }
};
</script>
<script src="glossary-tooltip.js"></script>
</body></html>
```

```bash
python serve.py
# Open http://localhost:8080/shared/tooltip-test.html
# Hover "N1-methylpseudouridine (m1Psi)" — charge bar fills over 5 seconds, pins
# Hover "PD-1 checkpoint" — should show PD-1 entry AND "See also: checkpoint" link
```

- [ ] **Step 7: Commit**

```bash
git add shared/glossary-tooltip.js
git commit -m "feat: tooltip engine — 5s pin, longest-match, see-also sub-term links"
```

---

### Task 5: shared/glossary-data.js

**Files:** Create: `shared/glossary-data.js`

- [ ] **Step 1: Create with ~40 seed terms at grad/res/frontier levels**

```javascript
// shared/glossary-data.js
// All terms: level is 'grad', 'res', or 'frontier'. No 'ug' — content is graduate+ only.
// Modules augment with: Object.assign(window.GLOSS, { termKey: {...} });

window.GLOSS = {
  // ── Property label terms (shown in molecule modal prop rows) ──
  'resolution':     { term:'Resolution (cryo-EM / X-ray)', level:'grad', def:'Minimum resolvable distance in Angstroms (Å). <2.5 Å = near-atomic (individual atoms visible). 2.5–3.5 Å = medium (secondary structure clear). >4 Å = low (domain arrangement only). Nobel structures typically 2.5–3.5 Å.' },
  'kd':             { term:'Dissociation constant (Kd)', level:'grad', def:'Equilibrium binding affinity: Kd = [A][B]/[AB]. Lower Kd = tighter binding. pM (10⁻¹²) = antibody-antigen; nM = drug-receptor typical; μM = weak/transient. eIF4E-m7GTP Kd ~2 nM.' },
  'xlogp':          { term:'XLogP (lipophilicity)', level:'grad', def:'Calculated partition coefficient (octanol/water). XLogP > 5 = too lipophilic (poor solubility). XLogP < 0 = hydrophilic. Lipinski rule: ≤ 5. Governs membrane permeability and oral bioavailability.' },
  'pka':            { term:'Apparent pKa (ionizable lipid)', level:'res', def:'pH at which the ionizable lipid is 50% protonated. Optimal pKa for LNP ~6.2–6.8: neutral at plasma pH 7.4 (low toxicity), cationic at endosomal pH 5.5 (membrane disruption and mRNA escape).' },
  'tpsa':           { term:'Topological Polar Surface Area (TPSA)', level:'grad', def:'Sum of surface areas of polar atoms. TPSA > 140 Å² = poor CNS penetration. TPSA < 60 Å² = good oral absorption. Used in Veber rules for oral bioavailability prediction alongside rotatable bond count.' },
  'hbd':            { term:'H-Bond Donors (HBD)', level:'grad', def:'Count of NH and OH groups capable of donating hydrogen bonds. Lipinski rule: ≤ 5. Excess HBDs reduce membrane permeability by stabilizing aqueous solvation shell around molecule.' },
  'hba':            { term:'H-Bond Acceptors (HBA)', level:'grad', def:'Count of N and O atoms capable of accepting hydrogen bonds. Lipinski rule: ≤ 10. Combined with HBD, governs aqueous solubility vs membrane permeability balance.' },
  'cancer relevance': { term:'Cancer relevance', level:'res', def:'Degree to which this molecule or pathway is implicated in oncogenesis, tumor progression, or therapeutic targeting. eIF4E is overexpressed in >30% of human cancers; mTORC1 hyperactivation is among the most common oncogenic alterations.' },
  'biodegradable':  { term:'Biodegradability (lipids)', level:'grad', def:'Ionizable lipids with ester bonds in their tails are hydrolyzed by plasma and hepatic esterases, generating metabolites cleared renally. Non-biodegradable lipids accumulate in liver — critical safety distinction for repeat dosing of mRNA therapeutics.' },

  // ── Chip / badge text terms ──
  'translation initiation': { term:'Translation initiation', level:'grad', def:'Rate-limiting step in eukaryotic protein synthesis. The 43S pre-initiation complex (40S + eIF2-GTP-Met-tRNA) scans 5\'UTR for AUG start codon. Cap-dependent: requires eIF4E binding m7G cap. Rate controlled by eIF2α phosphorylation (integrated stress response) and mTORC1 activity.' },
  'm7g cap':        { term:'m7G cap (5\' cap)', level:'grad', def:'7-methylguanosine linked 5\'→5\' to mRNA via triphosphate bridge. Recognized by eIF4E (cytoplasmic translation) and CBP20/80 (nuclear export/splicing). Required for cap-dependent translation. Absent in HCV (IRES-dependent) and mitochondrial mRNAs.' },
  'cap reader':     { term:'Cap reader / cap-binding protein', level:'grad', def:'Protein containing a cap-binding domain that recognizes m7G via pi-stacking between conserved tryptophan residues (eIF4E: W56 and W102). Selectivity for m7G over unmethylated G is ~100-fold. eIF4E is rate-limiting for cap-dependent translation.' },
  'tlr evasion':    { term:'TLR evasion (mRNA)', level:'res', def:'Strategy to prevent exogenous mRNA from activating innate immune Toll-like receptors (TLR3, TLR7, TLR8). Pseudouridine/m1Ψ modification sterically occludes the TLR binding groove. Critical for therapeutic mRNA — unmodified mRNA induces type I interferon response degrading the transcript before translation.' },
  'endosomal escape': { term:'Endosomal escape', level:'res', def:'Rate-limiting step in LNP-mediated mRNA delivery. After endocytosis, LNPs must rupture the endosomal membrane before lysosomal acidification (pH <5) degrades cargo. Ionizable lipids achieve ~1-2% escape efficiency — sufficient due to ribosomal amplification of protein output. Key determinant of potency.' },
  'structural protein': { term:'Structural protein (virus)', level:'grad', def:'Viral protein forming the physical particle architecture (capsid, envelope, spike). In SARS-CoV-2: S (spike), E (envelope), M (membrane), N (nucleocapsid). Spike is the sole mRNA vaccine antigen — its prefusion conformation contains the dominant neutralizing epitopes.' },
  'vaccine antigen': { term:'Vaccine antigen', level:'grad', def:'Molecular target chosen to elicit protective immunity. For mRNA vaccines: the SARS-CoV-2 spike protein (prefusion-stabilized). Selection criteria: surface-exposed, abundant, functional conservation across strains, accessible to neutralizing antibody epitopes, amenable to stabilization.' },
  'lnp delivery':   { term:'LNP delivery platform', level:'res', def:'Lipid nanoparticle system enabling in vivo mRNA delivery. Standard 4-component: ionizable lipid (mRNA binding), DSPC (bilayer), cholesterol (fusion), PEG-lipid (stability). Intramuscular injection leads to local expression + dendritic cell uptake. Liver tropism via ApoE adsorption enables hepatic applications.' },
  'Nobel 2023':     { term:'Nobel Prize in Medicine 2023', level:'grad', def:'Awarded to Katalin Karikó and Drew Weissman for discoveries enabling effective mRNA vaccines against COVID-19. Specifically honored: nucleoside base modification (pseudouridine) suppressing innate immune activation of therapeutic mRNA. Combined with LNP delivery technology (not explicitly co-honored).' },
  'rbd-ace2 binding': { term:'RBD–ACE2 binding', level:'res', def:'Interaction between the SARS-CoV-2 spike receptor-binding domain (RBD, residues 319–541) and human ACE2 (angiotensin-converting enzyme 2). Kd ~15 nM for SARS-CoV-2 vs ~200 nM for SARS-CoV-1, explaining higher transmissibility. Furin cleavage at S1/S2 is required for full activation.' },

  // ── Core biology terms ──
  'pd1':            { term:'PD-1 (PDCD1)', level:'res', def:'Programmed cell death protein 1 — inhibitory receptor on activated T cells. Binds PD-L1/PD-L2 on tumor cells and APCs, delivering ITIM/ITSM-mediated suppressive signals. Target of nivolumab (BMS-936558) and pembrolizumab (MK-3475). 2018 Nobel.' },
  'ctla4':          { term:'CTLA-4', level:'res', def:'Cytotoxic T-lymphocyte antigen 4 — constitutively expressed on Tregs, transiently upregulated on activated T cells. Competes with CD28 for CD80/CD86 (B7) ligands with ~10-20× higher affinity. Attenuates T cell priming in lymph node. Target of ipilimumab. 2018 Nobel.' },
  'lnp':            { term:'Lipid nanoparticle (LNP)', level:'grad', def:'~80-100 nm delivery nanoparticle for mRNA therapeutics. Four components: (1) ionizable lipid — mRNA binding and endosomal escape; (2) DSPC — bilayer stability; (3) cholesterol — fusion; (4) PEG-lipid — stealth and colloidal stability. Ionizable lipid pKa ~6.6 is the key design parameter.' },
  'm1psi':          { term:'N1-methylpseudouridine (m1Ψ)', level:'res', def:'Nucleoside modification replacing all uridines in therapeutic mRNA. The N1-methyl group occludes the TLR3/7/8 binding groove abolishing innate immune activation. Paradoxically increases ribosome processivity ~10×. The Karikó/Weissman insight that enabled clinical mRNA therapeutics. 2023 Nobel.' },
  'codon_opt':      { term:'Codon optimization', level:'grad', def:'Replacing synonymous codons with those preferred by human ribosomes, maximizing translational speed and reducing ribosome stalling. Can increase protein output 10× for therapeutic mRNA. LinearDesign and CodonBERT (ML models) now outperform rule-based approaches by jointly optimizing stability (MFE) and efficiency.' },
  'gcreaction':     { term:'Germinal center reaction', level:'res', def:'Iterative affinity maturation in lymph node B cell follicles. B cells expressing higher-affinity BCR variants are selected; somatic hypermutation generates diversity. mRNA vaccines drive unusually strong GC reactions vs protein subunit vaccines, correlating with durable antibody responses.' },
  'prefusion':      { term:'Prefusion stabilization (2P)', level:'res', def:'K986P/V987P proline substitutions in SARS-CoV-2 spike heptad repeat 1 — from the McLellan lab. Lock the trimer in its prefusion conformation post-recombinant expression. Without 2P, spike undergoes post-fusion collapse, losing the RBD and NTD neutralizing epitopes. Used in all approved COVID vaccines.' },
  'hif1a':          { term:'HIF-1α', level:'grad', def:'Hypoxia-inducible factor 1α. Continuously synthesized under normoxia but immediately hydroxylated by PHD enzymes (using O₂ as substrate) → VHL recognition → ubiquitination → 26S proteasomal degradation. Under hypoxia: PHD inactive → HIF-1α accumulates → transcribes VEGF-A, EPO, LDHA, PDK1.' },
  'vhl':            { term:'VHL (pVHL)', level:'grad', def:'Von Hippel-Lindau tumor suppressor. Component of the CRL2-VHL E3 ubiquitin ligase. Recognizes hydroxylated prolines P402 and P564 on HIF-1α via its β-domain. Loss-of-function mutations in >90% of clear-cell renal carcinoma — the oncogenic mechanism. 2019 Nobel.' },
  'phd':            { term:'PHD enzymes (EGLN1-3)', level:'res', def:'Prolyl hydroxylase domain enzymes — O₂/2-OG/Fe²⁺-dependent dioxygenases. PHD2 (EGLN1) is the primary HIF-1α hydroxylase (P564). Activity directly proportional to O₂ concentration — the molecular O₂ sensor. Inhibited by 2-OG competitors (succinate, fumarate from IDH/SDH mutations in cancer). 2019 Nobel.' },
  'atg':            { term:'ATG proteins', level:'grad', def:'Autophagy-related gene products (~20 core). ULK1 complex: initiation kinase released by mTORC1 inhibition. PI3K complex (VPS34/Beclin-1/ATG14): PI3P generation at omegasome. ATG5-ATG12/ATG16L1: E3 ligase conjugating LC3-I to PE → LC3-II. ATG9: lipid scramblase for phagophore membrane expansion. 2016 Nobel.' },
  'lc3':            { term:'LC3/ATG8 (LC3-II)', level:'grad', def:'Ubiquitin-like modifier covalently attached to PE (phosphatidylethanolamine) on autophagosome inner and outer membranes. LC3-I (cytosolic) → LC3-II (membrane-bound) conversion is the canonical autophagosome assay. LC3-II recruits autophagy receptors (p62/SQSTM1) via LIR (LC3-interacting region) motifs. 2016 Nobel.' },
  'microrna':       { term:'microRNA (miRNA)', level:'grad', def:'~22 nt endogenous non-coding RNA. Processed from pri-miRNA (Drosha/DGCR8) → pre-miRNA (Dicer) → miRNA duplex → RISC loading (AGO2). Guide strand base-pairs 3\'UTR of target mRNAs: perfect complementarity = cleavage; imperfect = translational repression + deadenylation. ~2,500 human miRNAs, >60% of coding genes regulated. 2024 Nobel.' },
  'rnai':           { term:'RNA interference (RNAi)', level:'grad', def:'Post-transcriptional gene silencing by small RNAs loaded into RISC (RNA-induced silencing complex). AGO2 is the catalytic slicer for siRNA. miRNA uses AGO1-4. Harnessed therapeutically: inclisiran (siRNA for PCSK9/LDL-C), givosiran (ALAS1), lumasiran (HAO1). 2006 Fire/Mello Nobel.' },
  'trpv1':          { term:'TRPV1', level:'grad', def:'Transient receptor potential vanilloid 1 — tetrameric nonselective cation channel (Ca²⁺/Na⁺/K⁺). Gated by heat >43°C, capsaicin (vanilloid pocket in TM4-TM5), protons (pH<6), and endocannabinoids. Located on unmyelinated C-fiber nociceptors. Ca²⁺ influx triggers action potential. 2021 Nobel.' },
  'piezo2':         { term:'PIEZO2', level:'grad', def:'Mechanosensitive ion channel — homotrimer of ~2,521 aa/subunit with 38 transmembrane helices per subunit. Gated by membrane tension during cell deformation. On dorsal root ganglion neurons: mediates touch discrimination, proprioception, breathing-triggered Hering-Breuer reflex. PIEZO2 mutations cause FADS and proprioceptive ataxia. 2021 Nobel.' },
  'clock_bmal1':    { term:'CLOCK:BMAL1 heterodimer', level:'grad', def:'Core positive limb of circadian feedback loop. CLOCK:BMAL1 bHLH-PAS heterodimer binds E-box elements to transcribe PER1/2/3, CRY1/2, REV-ERBα/β, and ~10% of the transcriptome. CLOCK has intrinsic HAT (histone acetyltransferase) activity acetylating BMAL1-K537 and H3K9. 2017 Nobel.' },
  'ns5b':           { term:'NS5B polymerase', level:'grad', def:'HCV RNA-dependent RNA polymerase — thumb/palm/fingers fold with GDD active site motif. Lacks proofreading → quasispecies diversity. Target of sofosbuvir (UTP analog nucleotide prodrug, chain terminator). NS5B activity is essential; loss-of-function mutations are lethal to virus. 2020 Nobel.' },
  'daa':            { term:'Direct-acting antivirals (DAAs)', level:'grad', def:'HCV drugs targeting viral proteins directly: NS3/4A serine protease inhibitors (glecaprevir, grazoprevir), NS5A replication complex inhibitors (pibrentasvir, ledipasvir), NS5B polymerase inhibitors (sofosbuvir). Pan-genotypic combinations achieve >97% SVR12 — functional cure — in 8-12 weeks. 2020 Nobel downstream.' },
  'ancient_dna':    { term:'Ancient DNA (aDNA)', level:'res', def:'DNA from paleontological/archaeological specimens. Highly fragmented (mean ~50 bp), cytosine deamination at overhangs (C→T at 5\', G→A at 3\') is an authentication signature. Requires strict clean-room extraction, bleach treatment, single-stranded library protocols. Pääbo\'s Vindija Neanderthal genome: ~4 billion bp at 1.3× coverage. 2022 Nobel.' },
  'admixture':      { term:'ADMIXTURE / D-statistics', level:'res', def:'Population genomics tools for detecting archaic admixture. ADMIXTURE (ML) estimates ancestry proportions. D-statistics (ABBA-BABA test) tests for excess shared derived alleles between modern humans and Neanderthals vs outgroup — detects gene flow. ~2% Neanderthal ancestry in non-African modern humans, ~4-6% Denisovan in Melanesians. 2022 Nobel.' },
  'alphafold3':     { term:'AlphaFold3 (2024)', level:'frontier', def:'DeepMind diffusion-based model (2024) predicting structures of protein complexes including protein-nucleic acid and protein-small molecule interactions. Enables virtual screening and structure-based drug design without crystallography. Database covers >200M structures. Transforming drug discovery pipeline speed.' },
};
```

- [ ] **Step 2: Verify term count**

```bash
grep -c "level:" shared/glossary-data.js
# Expected: >= 40
```

- [ ] **Step 3: Commit**

```bash
git add shared/glossary-data.js
git commit -m "feat: biology glossary — 40+ grad/res/frontier terms including property labels and chip text"
```

---

### Task 6: shared/molecule-modal.css + shared/molecule-modal.js

**Files:**
- Create: `shared/molecule-modal.css`
- Create: `shared/molecule-modal.js`

The modal engine exposes one function: `MolModal.open(molData)`. All DOM creation uses `document.createElement` — no innerHTML. Modules pass molecule data objects; the engine builds all 5 tabs.

- [ ] **Step 1: Create shared/molecule-modal.css**

```css
/* shared/molecule-modal.css */
#mol-overlay {
  display:none; position:fixed; inset:0; z-index:9999;
  background:rgba(0,0,0,.78); backdrop-filter:blur(5px);
  align-items:center; justify-content:center; padding:16px;
}
#mol-overlay.open { display:flex; }

#mol-shell {
  background:var(--bg2); border:1px solid var(--border); border-radius:12px;
  width:100%; max-width:920px; max-height:90vh; overflow:hidden;
  display:flex; flex-direction:column;
  box-shadow:0 20px 80px rgba(0,0,0,.9);
  animation:molIn .2s ease;
}
@keyframes molIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

#mol-hdr {
  background:linear-gradient(135deg,var(--bg) 0%,var(--bg2) 60%,var(--bg) 100%);
  padding:14px 16px 0; border-bottom:1px solid var(--border);
  flex-shrink:0; position:relative; overflow:hidden;
}
#mol-charge-bar {
  position:absolute; top:0; left:0; height:3px;
  background:linear-gradient(90deg,var(--mol-color,#00e5ff) 0%,#fff 50%,var(--mol-color,#00e5ff) 100%);
  box-shadow:0 0 14px var(--mol-color,#00e5ff),0 0 28px rgba(255,255,255,.35);
  border-radius:12px 12px 0 0; animation:molcharge .8s ease forwards;
}
@keyframes molcharge { from{width:0%} to{width:100%} }

.mol-hdr-row { display:flex; align-items:flex-start; gap:12px; margin-bottom:10px; }
.mol-hdr-icon { width:46px; height:46px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.6rem; flex-shrink:0; border:1px solid var(--border); }
.mol-hdr-meta { flex:1; }
.mol-hdr-name { font-size:1.05rem; font-weight:700; color:var(--bright); letter-spacing:.04em; }
.mol-hdr-sub  { font-size:.7rem; color:var(--dim); margin-top:2px; font-family:monospace; }
.mol-badges   { display:flex; gap:5px; flex-wrap:wrap; margin-top:5px; }
.mol-badge    { font-size:.6rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:2px 8px; border-radius:4px; border:1px solid; }
.mol-close    { background:none; border:none; color:var(--muted); font-size:1.2rem; cursor:pointer; padding:4px 8px; border-radius:4px; transition:.15s; flex-shrink:0; }
.mol-close:hover { color:var(--text); background:var(--border); }

.mol-viz-tabs { display:flex; gap:2px; }
.mol-viz-tab  { padding:6px 14px; border:1px solid transparent; border-bottom:none; background:transparent; color:var(--muted); font-size:.74rem; border-radius:5px 5px 0 0; cursor:pointer; transition:.15s; position:relative; top:1px; user-select:none; }
.mol-viz-tab:hover  { color:var(--text); background:var(--bg3); }
.mol-viz-tab.active { color:var(--mol-color,var(--cyan)); background:var(--bg3); border-color:var(--border); }

#mol-body { flex:1; overflow-y:auto; background:var(--bg3); }

.mol-panel { display:none; padding:14px 16px; }
.mol-panel.active { display:grid; gap:12px; }

.mol-canvas-wrap { background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:8px; display:flex; align-items:center; justify-content:center; min-height:200px; position:relative; }
.mol-canvas-lbl  { position:absolute; bottom:7px; left:50%; transform:translateX(-50%); font-size:.6rem; color:var(--muted); font-family:monospace; white-space:nowrap; }
.mol-prop-sect   { background:var(--bg4); border:1px solid var(--border); border-radius:6px; padding:10px 11px; }
.mol-prop-title  { font-size:.62rem; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:7px; }
.mol-mech        { font-size:.74rem; color:#8888b0; line-height:1.6; }

.mol-interaction-wrap { background:var(--bg); border:1px solid var(--border); border-radius:8px; min-height:280px; display:flex; align-items:center; justify-content:center; position:relative; }
.mol-legend      { display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:6px; }
.mol-leg-item    { display:flex; align-items:center; gap:6px; font-size:.7rem; color:#8888b0; }
.mol-leg-dot     { width:10px; height:10px; border-radius:50%; flex-shrink:0; }

.mol-paper-item  { padding:10px 12px; border-bottom:1px solid var(--border2); cursor:pointer; transition:.1s; }
.mol-paper-item:hover { background:var(--bg4); }
.mol-paper-meta  { display:flex; gap:8px; align-items:center; margin-bottom:4px; }
.mol-paper-year  { font-size:.62rem; font-family:monospace; color:var(--muted); background:var(--bg); padding:1px 6px; border-radius:3px; border:1px solid var(--border); }
.mol-paper-jrnl  { font-size:.62rem; color:#44447a; font-style:italic; }
.mol-paper-if    { font-size:.6rem; color:var(--gold); border:1px solid rgba(255,215,0,.2); background:rgba(255,215,0,.05); padding:1px 5px; border-radius:3px; }
.mol-paper-title { font-size:.76rem; color:var(--text); line-height:1.4; margin-bottom:3px; }
.mol-paper-abs   { font-size:.7rem; color:var(--dim); line-height:1.5; }

.mol-rel-card    { background:var(--bg4); border:1px solid var(--border); border-radius:7px; padding:10px; cursor:pointer; transition:.15s; text-align:center; }
.mol-rel-card:hover { border-color:var(--mol-color,var(--cyan)); background:var(--bg); }
.mol-rel-icon { font-size:1.5rem; margin-bottom:5px; }
.mol-rel-name { font-size:.74rem; color:var(--text); font-weight:600; margin-bottom:3px; }
.mol-rel-role { font-size:.65rem; color:var(--dim); line-height:1.4; }
.mol-rel-id   { font-size:.6rem; color:var(--muted); font-family:monospace; margin-top:4px; }

.mol-domain-map { background:var(--bg4); border:1px solid var(--border); border-radius:8px; padding:10px; }
.mol-domain-row { display:flex; align-items:flex-start; gap:8px; padding:5px 0; border-bottom:1px solid var(--border2); font-size:.7rem; }
.mol-domain-row:last-child { border-bottom:none; }
.mol-domain-seg  { width:16px; height:12px; border-radius:2px; flex-shrink:0; margin-top:2px; }
.mol-domain-name { color:var(--text); font-size:.71rem; font-weight:600; }
.mol-domain-pos  { font-family:monospace; color:var(--muted); font-size:.62rem; }
.mol-domain-fn   { color:var(--dim); font-size:.65px; margin-top:1px; }

#mol-foot { background:var(--bg); border-top:1px solid var(--border); padding:8px 16px; display:flex; align-items:center; gap:10px; flex-shrink:0; }
.mol-foot-link   { font-size:.7rem; color:var(--cyan); text-decoration:none; transition:.15s; }
.mol-foot-link:hover { color:var(--bright); }
.mol-foot-sep    { color:var(--border); }
.mol-foot-source { font-size:.62rem; color:var(--muted); margin-left:auto; }
```

- [ ] **Step 2: Create shared/molecule-modal.js**

```javascript
// shared/molecule-modal.js — MolModal engine for kbiology
// Public API: MolModal.open(molData), MolModal.close()
// All DOM creation via createElement — no innerHTML.

(function () {
  'use strict';

  function mk(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function clr(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function ensureDOM() {
    if (document.getElementById('mol-overlay')) return;
    const ov = mk('div'); ov.id = 'mol-overlay';
    const sh = mk('div'); sh.id = 'mol-shell';
    const hdr= mk('div'); hdr.id= 'mol-hdr';
    const bar= mk('div'); bar.id= 'mol-charge-bar';
    const row= mk('div','mol-hdr-row');
    const ico= mk('div','mol-hdr-icon'); ico.id='mol-icon';
    const meta=mk('div','mol-hdr-meta');
    const nm = mk('div','mol-hdr-name'); nm.id='mol-name';
    const sub= mk('div','mol-hdr-sub');  sub.id='mol-sub';
    const bdg= mk('div','mol-badges');   bdg.id='mol-badges';
    const cls= mk('button','mol-close'); cls.textContent='✕'; cls.id='mol-close';
    const vzT= mk('div','mol-viz-tabs'); vzT.id='mol-viz-tabs';
    meta.appendChild(nm); meta.appendChild(sub); meta.appendChild(bdg);
    row.appendChild(ico); row.appendChild(meta); row.appendChild(cls);
    hdr.appendChild(bar); hdr.appendChild(row); hdr.appendChild(vzT);
    const body=mk('div'); body.id='mol-body';
    const foot=mk('div'); foot.id='mol-foot';
    const nihA=mk('a','mol-foot-link','NIH \u2197'); nihA.id='mol-nih'; nihA.target='_blank'; nihA.rel='noopener';
    const s1=mk('span','mol-foot-sep','|');
    const pcA=mk('a','mol-foot-link','PubChem \u2197'); pcA.id='mol-pubchem'; pcA.target='_blank'; pcA.rel='noopener';
    const s2=mk('span','mol-foot-sep','|');
    const pdbA=mk('a','mol-foot-link','PDB \u2197'); pdbA.id='mol-pdb'; pdbA.target='_blank'; pdbA.rel='noopener';
    const src=mk('span','mol-foot-source','Data: local NIH cache \u00b7 fetch_data.py');
    foot.appendChild(nihA); foot.appendChild(s1); foot.appendChild(pcA);
    foot.appendChild(s2); foot.appendChild(pdbA); foot.appendChild(src);
    sh.appendChild(hdr); sh.appendChild(body); sh.appendChild(foot);
    ov.appendChild(sh); document.body.appendChild(ov);
    cls.addEventListener('click', MolModal.close);
    ov.addEventListener('click', function(e){ if(e.target===ov) MolModal.close(); });
  }

  // ── Canvas renderers ────────────────────────────────────────────────────────
  function drawStructure(cv, mol) {
    const ctx=cv.getContext('2d'), W=cv.width, H=cv.height, c=mol.color||'#00e5ff';
    ctx.fillStyle='#07071e'; ctx.fillRect(0,0,W,H);
    if (!mol.is_protein) {
      const cx=W*.45, cy=H/2, r=Math.min(W,H)*.28;
      ctx.strokeStyle=c; ctx.lineWidth=2;
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}
      ctx.closePath(); ctx.stroke();
      for(let i=0;i<6;i++){
        const a=Math.PI/3*i-Math.PI/6;
        ctx.beginPath();ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a));ctx.lineTo(cx+(r+22)*Math.cos(a),cy+(r+22)*Math.sin(a));ctx.stroke();
        ctx.beginPath();ctx.arc(cx+(r+22)*Math.cos(a),cy+(r+22)*Math.sin(a),4,0,Math.PI*2);ctx.fillStyle=c+'bb';ctx.fill();
      }
    } else {
      ctx.strokeStyle=c+'88'; ctx.lineWidth=2;
      for(let h=0;h<3;h++){const ox=60+h*100;ctx.beginPath();for(let t=0;t<Math.PI*3.5;t+=0.12){const x=ox+18*Math.cos(t),y=30+t*18;t===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}
      ctx.strokeStyle=c; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(30,H-25); ctx.lineTo(W-30,H-25); ctx.stroke();
    }
    ctx.fillStyle=c+'99'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText(mol.type||'molecule', W/2, H-8);
  }

  function drawInteraction(cv, map) {
    const ctx=cv.getContext('2d'), W=cv.width, H=cv.height;
    ctx.fillStyle='#07071e'; ctx.fillRect(0,0,W,H);
    const ns={}, sx=W/500, sy=H/320;
    (map.nodes||[]).forEach(n=>{ ns[n.id]=n; });
    (map.edges||[]).forEach(e=>{
      const a=ns[e.from], b=ns[e.to]; if(!a||!b) return;
      ctx.strokeStyle=e.color||'#555577'; ctx.lineWidth=e.dashed?1.5:2.5;
      ctx.setLineDash(e.dashed?[5,4]:[]); ctx.beginPath();
      ctx.moveTo(a.x*sx,a.y*sy); ctx.lineTo(b.x*sx,b.y*sy); ctx.stroke(); ctx.setLineDash([]);
      if(e.label){const mx=(a.x+b.x)/2*sx,my=(a.y+b.y)/2*sy; ctx.fillStyle=(e.color||'#555577')+'cc'; ctx.font='9px monospace'; ctx.textAlign='center'; e.label.split('\n').forEach((ln,i,arr)=>ctx.fillText(ln,mx,my+(i-arr.length/2+.5)*12));}
    });
    (map.nodes||[]).forEach(n=>{
      const x=n.x*sx,y=n.y*sy,r=(n.r||28)*Math.min(sx,sy);
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=n.color+'22';ctx.fill(); ctx.strokeStyle=n.color;ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle=n.color; ctx.font='bold 10px sans-serif'; ctx.textAlign='center';
      (n.label||'').split('\n').forEach((ln,i,arr)=>ctx.fillText(ln,x,y+(i-arr.length/2+.5)*13));
      if(n.sub){ctx.fillStyle=n.color+'88';ctx.font='8px sans-serif';ctx.fillText(n.sub,x,y+r+11);}
    });
  }

  function drawDomainBar(cv, domains) {
    const ctx=cv.getContext('2d'), W=cv.width, H=cv.height;
    ctx.fillStyle='#07071e'; ctx.fillRect(0,0,W,H);
    if(!domains||!domains.length) return;
    const bX=30,bY=H/2-12,bW=W-60,bH=22,seg=(bW-domains.length*2)/domains.length;
    domains.forEach((d,i)=>{
      const x=bX+i*(seg+2);
      ctx.fillStyle=d.color+'cc'; ctx.fillRect(x,bY,seg,bH);
      ctx.strokeStyle=d.color; ctx.lineWidth=1.5; ctx.strokeRect(x,bY,seg,bH);
      ctx.fillStyle=d.color; ctx.font='8px monospace'; ctx.textAlign='center';
      ctx.fillText((d.name||'').split(' ')[0],x+seg/2,bY+bH+13);
    });
    ctx.fillStyle='#33335a'; ctx.font='9px monospace'; ctx.textAlign='left'; ctx.fillText('N',bX-12,bY+bH/2+3);
    ctx.textAlign='right'; ctx.fillText('C',bX+bW+12,bY+bH/2+3);
  }

  // ── Panel builders ──────────────────────────────────────────────────────────
  function buildStructurePanel(mol) {
    const wrap=mk('div','mol-panel active'); wrap.style.gridTemplateColumns='1fr 1fr';
    const left=mk('div'); left.style.cssText='display:flex;flex-direction:column;gap:8px';
    const cw=mk('div','mol-canvas-wrap'); cw.style.minHeight='200px';
    const cv=mk('canvas'); cv.width=300; cv.height=190;
    const lbl=mk('div','mol-canvas-lbl'); lbl.textContent=(mol.is_protein?'Protein ribbon · PDB '+(mol.pdb_id||''):'2D structure · CID '+(mol.pubchem_cid||''));
    cw.appendChild(cv); cw.appendChild(lbl); drawStructure(cv,mol);
    const mech=mk('div','mol-prop-sect');
    mech.appendChild(mk('div','mol-prop-title','Function & Mechanism'));
    mech.appendChild(mk('div','mol-mech',mol.mechanism||''));
    left.appendChild(cw); left.appendChild(mech);
    const right=mk('div'); right.style.cssText='display:flex;flex-direction:column;gap:8px';
    const ps=mk('div','mol-prop-sect');
    ps.appendChild(mk('div','mol-prop-title','Physicochemical Properties'));
    Object.entries(mol.properties||{}).forEach(([k,v])=>{
      const row=mk('div','prop-row');
      const keySpan=mk('span','prop-key');
      // Add glossary tooltip to property labels
      const glossKey = k.toLowerCase().replace(/\s*\(.*\)/, '').trim();
      if(window.GLOSS && window.GLOSS[glossKey]) {
        keySpan.className='prop-key gtip'; keySpan.dataset.gloss=glossKey;
      }
      keySpan.textContent=k;
      const valSpan=mk('span','prop-val '+((mol.property_flags||{})[k]||''),v);
      row.appendChild(keySpan); row.appendChild(valSpan); ps.appendChild(row);
    });
    right.appendChild(ps);
    wrap.appendChild(left); wrap.appendChild(right);
    return wrap;
  }

  function buildInteractionPanel(mol) {
    const wrap=mk('div','mol-panel active'); wrap.style.cssText='display:flex;flex-direction:column;gap:10px';
    const iw=mk('div','mol-interaction-wrap'); iw.style.minHeight='280px';
    const cv=mk('canvas'); cv.width=520; cv.height=280;
    const lbl=mk('div','mol-canvas-lbl'); lbl.textContent=(mol.interaction||{}).title||'Interaction map';
    iw.appendChild(cv); iw.appendChild(lbl);
    if(mol.interaction) drawInteraction(cv,mol.interaction);
    wrap.appendChild(iw);
    const leg=mk('div','mol-legend');
    [{color:mol.color,label:'This molecule'},{color:'#8888b0',label:'Partner'},{color:'#00ff99',label:'Activation'},{color:'#ff4444',label:'Inhibition'}].forEach(it=>{
      const li=mk('div','mol-leg-item'); const dot=mk('div','mol-leg-dot'); dot.style.background=it.color;
      li.appendChild(dot); li.appendChild(mk('span','',it.label)); leg.appendChild(li);
    });
    wrap.appendChild(leg);
    return wrap;
  }

  function buildPapersPanel(mol) {
    const wrap=mk('div','mol-panel active'); wrap.style.display='block';
    (mol.papers||[]).forEach(p=>{
      const item=mk('div','mol-paper-item');
      const meta=mk('div','mol-paper-meta');
      meta.appendChild(mk('span','mol-paper-year',p.year));
      meta.appendChild(mk('span','mol-paper-jrnl',p.journal));
      if(p.impact) meta.appendChild(mk('span','mol-paper-if',p.impact));
      item.appendChild(meta);
      item.appendChild(mk('div','mol-paper-title',p.title));
      item.appendChild(mk('div','mol-paper-abs',p.abstract));
      wrap.appendChild(item);
    });
    return wrap;
  }

  function buildRelMolsPanel(mol) {
    const wrap=mk('div','mol-panel active'); wrap.style.gridTemplateColumns='repeat(3,1fr)';
    (mol.rel_molecules||[]).forEach(m=>{
      const card=mk('div','mol-rel-card');
      card.appendChild(mk('div','mol-rel-icon',m.icon||''));
      card.appendChild(mk('div','mol-rel-name',m.name));
      card.appendChild(mk('div','mol-rel-role',m.role));
      card.appendChild(mk('div','mol-rel-id',m.id||''));
      wrap.appendChild(card);
    });
    return wrap;
  }

  function buildDomainPanel(mol) {
    const wrap=mk('div','mol-panel active'); wrap.style.gridTemplateColumns='1fr 260px';
    const rw=mk('div','mol-interaction-wrap'); rw.style.minHeight='240px';
    const cv=mk('canvas'); cv.width=400; cv.height=240;
    const lbl=mk('div','mol-canvas-lbl'); lbl.textContent='Domain architecture';
    rw.appendChild(cv); rw.appendChild(lbl); drawDomainBar(cv,mol.domains);
    const dm=mk('div','mol-domain-map');
    dm.appendChild(mk('div','sec-lbl','Functional Domains'));
    (mol.domains||[]).forEach(d=>{
      const row=mk('div','mol-domain-row');
      const seg=mk('div','mol-domain-seg'); seg.style.background=d.color;
      const info=mk('div'); info.style.flex='1';
      info.appendChild(mk('div','mol-domain-name',d.name));
      info.appendChild(mk('div','mol-domain-pos','aa '+(d.pos||'')));
      info.appendChild(mk('div','mol-domain-fn',d.fn||''));
      row.appendChild(seg); row.appendChild(info); dm.appendChild(row);
    });
    wrap.appendChild(rw); wrap.appendChild(dm);
    return wrap;
  }

  const TABS = [
    {id:'structure',   label:'Structure + Properties', build:buildStructurePanel},
    {id:'interaction', label:'Interaction Map',         build:buildInteractionPanel},
    {id:'papers',      label:'Key Papers',              build:buildPapersPanel},
    {id:'rel_mols',    label:'Related Molecules',       build:buildRelMolsPanel},
    {id:'domains',     label:'Domain Map',              build:buildDomainPanel, proteinsOnly:true},
  ];

  window.MolModal = {
    open(mol) {
      ensureDOM();
      const shell=document.getElementById('mol-shell');
      shell.style.setProperty('--mol-color', mol.color||'#00e5ff');
      const ico=document.getElementById('mol-icon');
      ico.textContent=mol.icon||''; ico.style.background=(mol.color||'#00e5ff')+'18'; ico.style.borderColor=(mol.color||'#00e5ff')+'44';
      document.getElementById('mol-name').textContent=mol.name||'';
      document.getElementById('mol-sub').textContent=mol.sub||'';
      const bdg=document.getElementById('mol-badges'); clr(bdg);
      (mol.badges||[]).forEach(b=>{ const s=mk('span','mol-badge',b.text); s.style.color=b.color; s.style.borderColor=b.color+'44'; s.style.background=b.color+'10'; bdg.appendChild(s); });
      // Restart charge bar
      const bar=document.getElementById('mol-charge-bar');
      bar.style.background='linear-gradient(90deg,'+((mol.color||'#00e5ff'))+' 0%,#fff 50%,'+(mol.color||'#00e5ff')+' 100%)';
      bar.style.boxShadow='0 0 14px '+(mol.color||'#00e5ff')+',0 0 28px rgba(255,255,255,.35)';
      bar.style.animation='none'; void bar.offsetWidth; bar.style.animation='';
      // Tabs
      const vzT=document.getElementById('mol-viz-tabs'); clr(vzT);
      const activeTabs=TABS.filter(t=>!t.proteinsOnly||mol.is_protein);
      activeTabs.forEach((t,i)=>{
        const btn=mk('div','mol-viz-tab'+(i===0?' active':''),t.label);
        btn.addEventListener('click',()=>{
          document.querySelectorAll('.mol-viz-tab').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          const body=document.getElementById('mol-body'); clr(body); body.appendChild(t.build(mol));
        });
        vzT.appendChild(btn);
      });
      const body=document.getElementById('mol-body'); clr(body); body.appendChild(activeTabs[0].build(mol));
      document.getElementById('mol-nih').href    =mol.nih_link||'#';
      document.getElementById('mol-pubchem').href=mol.pubchem_link||(mol.pubchem_cid?'https://pubchem.ncbi.nlm.nih.gov/compound/'+mol.pubchem_cid:'#');
      document.getElementById('mol-pdb').href    =mol.pdb_link||(mol.pdb_id?'https://www.rcsb.org/structure/'+mol.pdb_id:'#');
      document.getElementById('mol-overlay').classList.add('open');
    },
    close() { const ov=document.getElementById('mol-overlay'); if(ov) ov.classList.remove('open'); }
  };
})();
```

- [ ] **Step 3: Verify API**

```bash
grep "MolModal\." shared/molecule-modal.js
# Expected: MolModal.open and MolModal.close
grep "createElement\|textContent" shared/molecule-modal.js | wc -l
# Expected: >= 20 (confirms DOM-only approach)
```

- [ ] **Step 4: Commit**

```bash
git add shared/molecule-modal.css shared/molecule-modal.js
git commit -m "feat: molecule modal engine — 5-tab pipeline, DOM-only, property label tooltips"
```

---

### Task 7: fetch_data.py + data/molecules_manifest.json

**Files:**
- Create: `fetch_data.py`
- Create: `data/molecules_manifest.json`

- [ ] **Step 1: Create data/molecules_manifest.json**

```json
{
  "compounds": [
    {"cid":135398513,"name":"N1-methylpseudouridine","topic":"2023_mrna"},
    {"cid":137500165,"name":"SM-102",                "topic":"2023_mrna"},
    {"cid":5497103,  "name":"DSPC",                  "topic":"2023_mrna"},
    {"cid":2723949,  "name":"capsaicin",             "topic":"2021_trp"},
    {"cid":107689,   "name":"ivermectin",            "topic":"2015_antiparasitic"},
    {"cid":68827,    "name":"artemisinin",           "topic":"2015_antiparasitic"},
    {"cid":45375808, "name":"sofosbuvir",            "topic":"2020_hcv"},
    {"cid":67683433, "name":"glecaprevir",           "topic":"2020_hcv"}
  ],
  "proteins": [
    {"pdb_id":"6VSB", "name":"SARS-CoV-2 spike prefusion","topic":"2023_mrna"},
    {"pdb_id":"1EJ1", "name":"eIF4E cap-binding",         "topic":"2023_mrna"},
    {"pdb_id":"4ZQK", "name":"PD-1/PD-L1 complex",       "topic":"2018_immunotherapy"},
    {"pdb_id":"3OSS", "name":"CTLA-4/B7-1",              "topic":"2018_immunotherapy"},
    {"pdb_id":"5GGS", "name":"TRPV1",                    "topic":"2021_trp"},
    {"pdb_id":"1LM8", "name":"HIF-1a PAS-B",             "topic":"2019_hif"},
    {"pdb_id":"1LQB", "name":"VHL/HIF peptide",          "topic":"2019_hif"},
    {"pdb_id":"4OLA", "name":"Argonaute-2 (AGO2)",       "topic":"2024_microrna"},
    {"pdb_id":"1QSY", "name":"HCV NS5B polymerase",      "topic":"2020_hcv"},
    {"pdb_id":"3RHW", "name":"GluCl channel",            "topic":"2015_antiparasitic"}
  ],
  "pubmed_ids": [
    {"pmid":16111902,"topic":"2023_mrna",        "note":"Kariko 2005 pseudouridine"},
    {"pmid":18439535,"topic":"2023_mrna",        "note":"Kariko 2008 superior mRNA vector"},
    {"pmid":20525419,"topic":"2018_immunotherapy","note":"Hodi 2010 ipilimumab"},
    {"pmid":22658416,"topic":"2018_immunotherapy","note":"Topalian 2012 anti-PD-1"},
    {"pmid":23543530,"topic":"2016_autophagy",   "note":"Mizushima autophagy review"},
    {"pmid":20951344,"topic":"2019_hif",         "note":"Semenza HIF review"},
    {"pmid":23792629,"topic":"2024_microrna",    "note":"Ambros lin-4 miRNA"},
    {"pmid":26360583,"topic":"2021_trp",         "note":"Julius TRP channels review"}
  ]
}
```

- [ ] **Step 2: Create fetch_data.py**

```python
#!/usr/bin/env python3
"""
fetch_data.py — Pre-fetch NIH data for kbiology.
Run once: python fetch_data.py
Requires: pip install requests
"""
import json, time, sys
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("Run: pip install requests")

DATA = Path(__file__).parent / "data"
DATA.mkdir(exist_ok=True)
MANIFEST = json.loads((DATA / "molecules_manifest.json").read_text())
HDR = {"User-Agent": "kbiology-learning-tool/1.0 (educational)"}

def pubchem(cid):
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/MolecularFormula,MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,TPSA,IUPACName/JSON"
    try:
        r = requests.get(url, headers=HDR, timeout=10); r.raise_for_status()
        p = r.json()["PropertyTable"]["Properties"][0]
    except Exception as e:
        print(f"  WARN CID {cid}: {e}"); p = {}
    time.sleep(0.4)
    return {"cid":cid,"formula":p.get("MolecularFormula",""),"weight":p.get("MolecularWeight",""),
            "xlogp":p.get("XLogP",""),"hbd":p.get("HBondDonorCount",""),"hba":p.get("HBondAcceptorCount",""),
            "tpsa":p.get("TPSA",""),"iupac":p.get("IUPACName",""),
            "url":f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}"}

def pdb(pid):
    url = f"https://data.rcsb.org/rest/v1/core/entry/{pid.upper()}"
    try:
        r = requests.get(url, headers=HDR, timeout=10); r.raise_for_status(); d = r.json()
        res = (d.get("refine",[{}])[0] or {}).get("ls_d_res_high","")
    except Exception as e:
        print(f"  WARN PDB {pid}: {e}"); d = {}; res = ""
    time.sleep(0.4)
    return {"pdb_id":pid.upper(),"title":d.get("struct",{}).get("title",""),
            "method":(d.get("exptl",[{}])[0] or {}).get("method",""),"resolution":res,
            "url":f"https://www.rcsb.org/structure/{pid.upper()}"}

def pubmed(pmid):
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={pmid}&retmode=xml"
    try:
        import xml.etree.ElementTree as ET
        r = requests.get(url, headers=HDR, timeout=15); r.raise_for_status()
        root = ET.fromstring(r.text); art = root.find(".//Article")
        title = art.findtext("ArticleTitle","") if art else ""
        abstract = " ".join(t.text or "" for t in root.findall(".//AbstractText"))
        year = (root.findtext(".//PubDate/Year") or "")
        journal = (art.findtext(".//Journal/Title","") if art else "")
    except Exception as e:
        print(f"  WARN PMID {pmid}: {e}"); title=abstract=year=journal=""
    time.sleep(0.4)
    return {"pmid":pmid,"title":title,"abstract":abstract,"year":year,"journal":journal,
            "url":f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"}

print("=== kbiology fetch_data.py ===")
print(f"\nFetching {len(MANIFEST['compounds'])} compounds...")
compounds = {str(c["cid"]): {**pubchem(c["cid"]), "topic":c["topic"]} for c in (print(f"  {c['cid']} {c['name']}") or [c] for c in MANIFEST["compounds"])}
print(f"\nFetching {len(MANIFEST['proteins'])} proteins...")
proteins  = {p["pdb_id"].upper(): {**pdb(p["pdb_id"]), "topic":p["topic"]} for p in (print(f"  PDB {p['pdb_id']}") or [p] for p in MANIFEST["proteins"])}
print(f"\nFetching {len(MANIFEST['pubmed_ids'])} papers...")
papers    = {str(p["pmid"]): {**pubmed(p["pmid"]), "topic":p["topic"]} for p in (print(f"  PMID {p['pmid']}") or [p] for p in MANIFEST["pubmed_ids"])}

(DATA/"compounds.json").write_text(json.dumps(compounds, indent=2))
(DATA/"proteins.json").write_text(json.dumps(proteins,  indent=2))
(DATA/"papers.json").write_text(json.dumps(papers,     indent=2))
print(f"\nDone. compounds: {len(compounds)}, proteins: {len(proteins)}, papers: {len(papers)}")
```

- [ ] **Step 3: Install requests and run**

```bash
pip install requests
python fetch_data.py
# Expected final line: Done. compounds: 8, proteins: 10, papers: 8
```

- [ ] **Step 4: Verify output**

```bash
python -c "import json; d=json.load(open('data/compounds.json')); print(list(d.keys()))"
# Expected: list of CID strings e.g. ['135398513', '137500165', ...]
```

- [ ] **Step 5: Commit**

```bash
git add fetch_data.py data/molecules_manifest.json
git commit -m "feat: NIH data fetcher (PubChem/PDB/PubMed) with local JSON cache"
```

---

### Task 8: index.html — Hub

**Files:** Create: `index.html`

The hub reads entirely from a `MODULES` config array and a `CATEGORIES` object — extensibility is built in. New Nobel year = one entry in `MODULES`, one new module file.

- [ ] **Step 1: Create index.html**

Structure: particle canvas background → hub header (title + search) → filter row (chips with 5s Warhammer modals) → Nobel timeline (10 cards on rail) → progress bar footer.

Key implementation notes for the implementing agent:

**MODULES array** (drives everything — timeline cards, filter behavior, progress):
```javascript
const MODULES = [
  {year:2015,title:'Avermectin & Artemisinin', icon:'🧫',category:'pharmacology',tag:'Pharmacology',file:'modules/2015_antiparasitic.html'},
  {year:2016,title:'Autophagy Mechanisms',     icon:'♻️',category:'cell',         tag:'Cell Bio',    file:'modules/2016_autophagy.html'},
  {year:2017,title:'Circadian Clocks',          icon:'🕐',category:'genetics',     tag:'Genetics',    file:'modules/2017_circadian.html'},
  {year:2018,title:'Checkpoint Immunotherapy',  icon:'🎯',category:'immunology',   tag:'Immunology',  file:'modules/2018_immunotherapy.html'},
  {year:2019,title:'HIF / O₂ Sensing',          icon:'⚗️',category:'cell',         tag:'Cell Bio',    file:'modules/2019_hif_oxygen.html'},
  {year:2020,title:'Hepatitis C Virus',          icon:'🦠',category:'biotech',      tag:'Virology',    file:'modules/2020_hepatitis_c.html'},
  {year:2021,title:'TRP Channels',               icon:'🌡️',category:'neuroscience', tag:'Neuroscience',file:'modules/2021_trp_channels.html'},
  {year:2022,title:'Paleogenomics',              icon:'🦴',category:'genetics',     tag:'Genomics',    file:'modules/2022_paleogenomics.html'},
  {year:2023,title:'mRNA Vaccines',              icon:'💉',category:'biotech',      tag:'Biotech',     file:'modules/2023_mrna.html'},
  {year:2024,title:'microRNA',                   icon:'🔬',category:'genetics',     tag:'Genomics',    file:'modules/2024_microrna.html'},
];
```

**CATEGORIES object** (drives filter chips and their 5-second Warhammer modals):
Each category entry has: `{ name, color, desc, link }` — same pattern shown in brainstorming mockup.

**Chip modal behavior** (5-second charge bar, identical to glossary-tooltip engine):
- `mouseenter`: start chip modal + setTimeout 5000ms → add `pinned` class
- `mouseleave` (if not pinned): clear timer + hide modal
- `click` elsewhere: unpin + hide

**Particle background**: 55 particles, colors from category palette, slow drift, opacity oscillation.

**localStorage key**: `'kbiology-visited'` — stores Set of year integers.

- [ ] **Step 2: Verify hub**

```bash
python serve.py
# http://localhost:8080
# Expected: 10 Nobel cards visible, particle background animating
# Hover chip 5+ seconds → modal pins
# Click card → new tab (404 ok — module not yet built)
# Re-open hub → visited cards show ✓
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: hub — Nobel timeline, Warhammer chip modals, particle bg, localStorage progress"
```

---

### Task 9: modules/2023_mrna.html — Template Module

**Files:** Create: `modules/2023_mrna.html`

This is the **canonical template** all Wave 2 agents copy. Must be complete and polished. Every structural pattern used here is reproduced verbatim in modules 2–10 (substituting topic content).

**Module layout** (same structure for all 10):
```
mod-hdr (header with back link, year, title, laureates, tags, 5 tab buttons)
mod-body (flex row):
  sidebar (left, 196px) — animation controls, layer toggles, topic-specific sliders
  main (flex:1) — tab content panels (only active panel visible)
  rsidebar (right, 208px) — key molecules list, landmark papers, external links
```

**Five tab panels:**
1. `#tab-mechanism` (default active): canvas-wrap (240px) + phase-lbl + annotation panels
2. `#tab-story`: narrative panel-cards, no canvas needed
3. `#tab-molecules`: mol-grid (CSS grid of mol-card elements)
4. `#tab-frontiers`: frontier-group sections with frontier-item cards
5. `#tab-connections`: connections-wrap canvas (force-directed network)

**MODULE_MOLS array** (drives molecule grid, right sidebar, and mol-chip tooltips in mechanism panels):
```javascript
// Each entry is passed directly to MolModal.open(mol)
// See Appendix: MolModal.open() Schema at end of this plan
const MODULE_MOLS = [
  { id:'psu', icon:'🔵', color:'#00e5ff', type:'Small Molecule', is_protein:false,
    name:'N1-Methylpseudouridine (m1Ψ)', sub:'PubChem CID: 135398513 · C₁₀H₁₄N₂O₆',
    badges:[{text:'mRNA mod',color:'#00e5ff'},{text:'TLR evasion',color:'#00ff99'},{text:'Nobel 2023',color:'#ffd700'}],
    pubchem_cid:135398513, pdb_id:null,
    nih_link:'https://pubchem.ncbi.nlm.nih.gov/compound/135398513',
    mechanism:'Replaces every uridine in mRNA. N1-methyl group occludes TLR3/7/8 binding groove — abolishes innate immune activation while paradoxically increasing ribosome processivity ~10×.',
    properties:{'MW':'258.23 g/mol','Formula':'C₁₀H₁₄N₂O₆','XLogP':'-2.1','HBD':'3','HBA':'7','TPSA':'119 Å²','Lipinski':'Pass'},
    property_flags:{'XLogP':'good','Lipinski':'good'},
    interaction:{ title:'m1Ψ vs Uridine: TLR7 Recognition',
      nodes:[
        {id:'u',  x:120,y:120,r:26,color:'#ff4444',label:'Uridine',  sub:'TLR7 binds'},
        {id:'psu',x:380,y:120,r:26,color:'#00ff99',label:'m1Ψ',     sub:'TLR7 blocked'},
        {id:'tlr',x:250,y:260,r:32,color:'#ffd700',label:'TLR7',    sub:'innate sensor'},
        {id:'rib',x:250,y:20, r:28,color:'#aa77ff',label:'Ribosome',sub:'translates both'},
      ],
      edges:[
        {from:'u',  to:'tlr',color:'#ff4444',label:'activates →\ninnate alarm',dashed:false},
        {from:'psu',to:'tlr',color:'#33334a',label:'no binding\n(blocked)',     dashed:true},
        {from:'u',  to:'rib',color:'#8888b0',label:'translates',                dashed:true},
        {from:'psu',to:'rib',color:'#00ff99',label:'10× faster',                dashed:false},
      ]
    },
    papers:[
      {year:'2005',journal:'Immunity',impact:'IF 43',title:'Suppression of RNA Recognition by Toll-like Receptors: The Impact of Nucleoside Modification',abstract:'First demonstration that pseudouridine modification suppresses TLR innate activation. The founding paper of therapeutic mRNA.'},
      {year:'2008',journal:'Mol Ther',impact:'IF 12',title:'Incorporation of Pseudouridine Into mRNA Yields Superior Nonimmunogenic Vector',abstract:'Modified mRNA is both non-immunogenic AND produces more protein — the dual benefit enabling clinical development.'},
    ],
    rel_molecules:[
      {icon:'🔵',name:'Pseudouridine (Ψ)',role:'Parent compound\nunmethylated',id:'CID 65058'},
      {icon:'🧬',name:'Uridine',          role:'Natural\nTLR-activating',      id:'CID 6029'},
    ]
  },
  { id:'spike', icon:'🟣', color:'#aa77ff', type:'Protein · Homotrimer', is_protein:true,
    name:'Spike Protein (prefusion-stabilized 2P)', sub:'PDB: 6VSB · 1273 aa/chain',
    badges:[{text:'Vaccine antigen',color:'#aa77ff'},{text:'RBD–ACE2 binding',color:'#ff4488'},{text:'Nobel 2023',color:'#ffd700'}],
    pubchem_cid:null, pdb_id:'6VSB',
    nih_link:'https://www.rcsb.org/structure/6VSB',
    mechanism:'K986P/V987P (2P) prolines lock spike in prefusion conformation — preserving the RBD and NTD neutralizing epitopes that collapse in the post-fusion state.',
    properties:{'PDB':'6VSB','Resolution':'2.8 Å (cryo-EM)','Chain':'Homotrimer','MW':'~440 kDa','2P mutations':'K986P / V987P','ACE2 Kd':'~15 nM','Glycosylation':'22 sites/chain'},
    property_flags:{'Resolution':'good','2P mutations':'good'},
    interaction:{ title:'Spike–ACE2 and Immune Targeting',
      nodes:[
        {id:'sp',  x:220,y:150,r:36,color:'#aa77ff',label:'Spike\nRBD',sub:'opens/closes'},
        {id:'ace2',x:390,y:100,r:26,color:'#ff4488',label:'ACE2',    sub:'host receptor'},
        {id:'nab', x:390,y:220,r:22,color:'#00ff99',label:'NAb',     sub:'neutralizing Ab'},
        {id:'mhc', x:60, y:90, r:22,color:'#ffd700',label:'MHC-I',  sub:'peptide display'},
        {id:'ctl', x:60, y:210,r:22,color:'#00e5ff',label:'CTL',     sub:'CD8+ T cell'},
      ],
      edges:[
        {from:'sp', to:'ace2',color:'#ff4488',label:'viral entry',   dashed:false},
        {from:'nab',to:'sp',  color:'#00ff99',label:'blocks ACE2',   dashed:false},
        {from:'sp', to:'mhc', color:'#ffd700',label:'MHC-I peptides',dashed:true},
        {from:'mhc',to:'ctl', color:'#00e5ff',label:'CTL activation',dashed:false},
      ]
    },
    papers:[
      {year:'2020',journal:'Science',impact:'IF 56',title:'Cryo-EM structure of the 2019-nCoV spike in the prefusion conformation',abstract:'First spike structure at 2.8A. 2P stabilization and 10-20x higher ACE2 affinity than SARS-CoV-1.'},
      {year:'2020',journal:'NEJM',  impact:'IF 176',title:'An mRNA Vaccine against SARS-CoV-2 — Phase 1 (mRNA-1273)',abstract:'First human mRNA vaccine trial. Robust neutralizing antibody and T cell responses.'},
    ],
    rel_molecules:[{icon:'🔴',name:'ACE2',role:'Host receptor\nentry target',id:'PDB: 1R42'},{icon:'🟢',name:'Furin',role:'S1/S2 cleavage',id:'PDB: 4RYD'}],
    domains:[
      {color:'#ff4488',name:'N-terminal domain (NTD)',pos:'14–685',   fn:'Alternative receptor binding; supersite for non-RBD Abs'},
      {color:'#aa77ff',name:'Receptor-binding domain (RBD)',pos:'319–541',fn:'ACE2 contact; primary neutralizing epitope'},
      {color:'#ffd700',name:'Furin cleavage (S1/S2)',pos:'682–685',   fn:'RRAR — absent in SARS-CoV-1; key virulence factor'},
      {color:'#00e5ff',name:'Fusion peptide',pos:'816–833',           fn:'Membrane fusion; conserved across betacoronaviruses'},
      {color:'#00ff99',name:'Heptad repeats (HR1+2)',pos:'912–1162',  fn:'2P mutations here; 6-helix bundle post-fusion'},
    ]
  },
  { id:'sm102', icon:'🟠', color:'#ff8844', type:'Lipid · Ionizable', is_protein:false,
    name:'SM-102 (ionizable lipid)', sub:'PubChem CID: 137500165 · Moderna LNP core',
    badges:[{text:'Ionizable lipid',color:'#ff8844'},{text:'LNP delivery',color:'#aa77ff'},{text:'pKa ~6.6',color:'#00e5ff'}],
    pubchem_cid:137500165, pdb_id:null,
    nih_link:'https://pubchem.ncbi.nlm.nih.gov/compound/137500165',
    mechanism:'Neutral at pH 7.4 (low toxicity). Re-protonates in endosome (pH 5.5) causing membrane disruption and mRNA cytoplasmic release. pKa ~6.6 is the key design parameter.',
    properties:{'MW':'710.2 g/mol','Formula':'C₄₄H₈₇NO₅','pKa':'~6.6','pH 7.4 charge':'Neutral','pH 5.5 charge':'Cationic','XLogP':'~12','Biodegradable':'Yes (ester bonds)'},
    property_flags:{'pH 7.4 charge':'good','Biodegradable':'good','XLogP':'warn'},
    interaction:{ title:'SM-102 pH-Dependent Ionization',
      nodes:[
        {id:'acid',x:100,y:100,r:26,color:'#ff8844',label:'pH 4\nFormulation',sub:'cationic'},
        {id:'neut',x:300,y:100,r:26,color:'#00ff99',label:'pH 7.4\nBlood',   sub:'neutral'},
        {id:'endo',x:200,y:240,r:26,color:'#ff4488',label:'pH 5.5\nEndosome',sub:'re-protonated'},
        {id:'mrna',x:380,y:220,r:22,color:'#00e5ff',label:'mRNA',            sub:'released'},
      ],
      edges:[
        {from:'acid',to:'neut',color:'#8888b0',label:'pH rise',               dashed:false},
        {from:'neut',to:'endo',color:'#ff4488',label:'endocytosis\npH drops', dashed:false},
        {from:'endo',to:'mrna',color:'#00e5ff',label:'membrane disruption',   dashed:false},
      ]
    },
    papers:[
      {year:'2019',journal:'J Am Chem Soc',impact:'IF 16',title:'Role of lipid components in LNPs for vaccines and gene therapy',abstract:'Optimal ionizable lipid pKa window 6.2-6.8 matches endosomal pH kinetics for maximum cytoplasmic delivery.'},
      {year:'2021',journal:'NEJM',impact:'IF 176',title:'Efficacy and Safety of mRNA-1273 (COVE trial)',abstract:'94.1% efficacy vs COVID-19. Clinical validation of SM-102 LNP platform.'},
    ],
    rel_molecules:[
      {icon:'🟡',name:'ALC-0315',  role:'Pfizer/BioNTech ionizable lipid',id:'CID 2311914'},
      {icon:'🔵',name:'DSPC',      role:'Helper lipid\nbilayer stability', id:'CID 5497103'},
    ]
  },
];
```

**Mechanism panels** (5 entries, one panel-card per phase, each can have a `mol` reference for a clickable chip):
```javascript
const PHASES = [
  { title:'Phase 1 — mRNA Design & Codon Optimization', color:'#00ff99', mol:'psu',
    // prose uses data-gloss spans for glossary tooltips:
    // e.g.: <span class="gtip" data-gloss="codon_opt">codon-optimized</span>
  },
  { title:'Phase 2 — LNP Formulation', color:'#00e5ff', mol:'sm102' },
  { title:'Phase 3 — Endosomal Escape', color:'#ffd700', mol:null },
  { title:'Phase 4 — Translation & Spike Biogenesis', color:'#aa77ff', mol:'spike' },
  { title:'Phase 5 — Adaptive Immune Priming', color:'#ff4488', mol:null },
];
```

**Canvas animation** (5 phases, 60fps rAF loop):
- Phase 0: animated mRNA helix with colored nucleoside dots (toggle U vs m1Ψ)
- Phase 1: LNP circle with inner mRNA coil
- Phase 2: endosome escape animation (orbiting escaped mRNA dot)
- Phase 3: ribosome (two arcs) + mRNA line + rising spike dot
- Phase 4: three immune cells orbiting central spike

**Story tab** content highlights: Karikó's 30-year road (1990 mRNA proof of concept → 2005 pseudouridine insight → 2020 COVID deployment → 2023 Nobel).

**Frontiers tab** content: mRNA-4157 cancer vaccine Phase IIb; saRNA (self-amplifying); circular RNA; LNP organ tropism AI; codon optimization ML (LinearDesign, CodonBERT).

**Connections tab** (force-directed canvas): 6 nodes — mRNA (center) + 2018 Immunotherapy + 2024 microRNA + 2019 HIF + 2016 Autophagy + 2020 HCV — edges with relationship labels.

**Shared scripts** (load in this order at bottom of body):
```html
<script src="../shared/glossary-data.js"></script>
<script src="../shared/glossary-tooltip.js"></script>
<script src="../shared/molecule-modal.js"></script>
<script src="../shared/auto-start.js"></script>
```

- [ ] **Step 2: Verify**

```bash
python serve.py
# Open http://localhost:8080/modules/2023_mrna.html
# Verify: all 5 tabs switch, canvas animation runs, mol chips open modals,
#         molecule modal has 5 viz tabs, property labels show glossary tooltips,
#         badge text shows glossary tooltips, connections canvas renders
```

- [ ] **Step 3: Commit**

```bash
git add modules/2023_mrna.html
git commit -m "feat: 2023 mRNA template module — all 5 tabs, molecule modals, glossary tooltips"
```

---

## Wave 2 — Nine Parallel Modules

> **Run all 9 tasks simultaneously** using `superpowers:dispatching-parallel-agents`.
>
> **Each agent MUST:**
> 1. Read `modules/2023_mrna.html` completely before writing anything
> 2. Copy the full HTML structure verbatim
> 3. Substitute only: year, title, laureates, header tags/colors, MODULE_MOLS array, PHASES array, animation code, story/frontiers/connections content
> 4. Keep verbatim: all CSS classes, sidebar layout, tab switching JS, rsidebar structure, shared script tags
> 5. Add topic-specific glossary terms via `Object.assign(window.GLOSS, {...})` before loading glossary-tooltip.js
> 6. All `.gtip[data-gloss]` spans in prose reference keys in either `shared/glossary-data.js` or the module's local Object.assign block

---

### Task 10: modules/2018_immunotherapy.html

**Topic:** PD-1 / CTLA-4 checkpoint blockade | Allison & Honjo | Color: `#ff4488`

**MODULE_MOLS:**
- `ctla4`: CTLA-4 protein — PDB 3OSS — `#ff4488` — is_protein:true — domains: [ligand binding domain (Ig-V), stalk, TM domain] — interaction: CTLA-4 vs CD28 competing for B7-1/B7-2; ipilimumab blocking CTLA-4
- `pd1`: PD-1 protein — PDB 4ZQK — `#ff8844` — is_protein:true — domains: [extracellular IgV domain, stalk, TM, ITSM, ITIM] — interaction: PD-1/PD-L1 complex; pembrolizumab blocking PD-1
- `ipilimumab`: anti-CTLA-4 antibody — `#00ff99` — is_protein:false — properties: {Type:'IgG1κ mAb', Target:'CTLA-4', Kd:'~6 nM', FDA approved:'2011', Indication:'Melanoma (adjuvant+metastatic)'}
- `pembrolizumab`: anti-PD-1 antibody — `#00e5ff` — is_protein:false — properties: {Type:'humanized IgG4κ', Target:'PD-1', FDA approved:'2014 (accelerated)', Indications:'>40 cancer types', Mechanism:'Blocks PD-1/PD-L1 and PD-1/PD-L2'}

**PHASES (5):**
1. T cell priming — APC presents peptide:MHC, CD28 co-stimulation activates naïve T cell
2. CTLA-4 braking — CTLA-4 upregulated post-activation, outcompetes CD28 for B7, attenuates priming
3. Tumor PD-L1 upregulation — IFN-γ from TILs induces PD-L1 on tumor; PD-1 on TILs binds PD-L1 → exhaustion
4. Checkpoint blockade — ipilimumab blocks CTLA-4:B7; pembrolizumab blocks PD-1:PD-L1
5. Anti-tumor response — unleashed CTLs expand, infiltrate tumor, release granzyme/perforin → tumor regression

**Canvas animation:** Cell diagrams with receptor/ligand stick figures and antibody blocking symbols (Y-shapes blocking edges).

**Story:** Allison 1995 mouse tumor cure; Honjo 1992 PD-1 discovery; 10-year gap to clinical translation; first ipilimumab trial 2010; combination therapy discovery; irAEs and their management.

**Frontiers:** CAR-T + checkpoint combination; bispecific PD-1×CTLA-4 antibodies (AstraZeneca); TIL therapy (lifileucel, FDA 2024); resistance via beta-2-microglobulin loss; AI-predicted biomarkers (TMB, MSI-H, IFN-γ signature).

**Local glossary additions:**
```javascript
Object.assign(window.GLOSS, {
  'itim': { term:'ITIM (Immunoreceptor Tyrosine-based Inhibitory Motif)', level:'res', def:'6-aa motif I/L/VxYxxL/V in cytoplasmic tails of inhibitory receptors (PD-1, CTLA-4, KIR). When phosphorylated, recruits SHP-1/SHP-2 phosphatases that dephosphorylate TCR signaling components.' },
  'cd28': { term:'CD28 co-stimulatory receptor', level:'grad', def:'T cell co-stimulatory receptor — binds CD80/CD86 (B7-1/B7-2) on APCs. PI3K/AKT/mTOR activation via CD28 provides the second signal for full T cell activation. Without CD28, TCR signal alone induces anergy.' },
  'tme':  { term:'Tumor microenvironment (TME)', level:'res', def:'Complex milieu of cancer cells, CAFs, TAMs, TILs, MDSCs, vasculature, and ECM. Immunosuppressive TME features: high Tregs, M2 macrophages, IDO expression, TGF-β, VEGF. Principal driver of checkpoint therapy resistance.' },
});
```

- [ ] **Step 1: Create modules/2018_immunotherapy.html** (copy template, substitute content as specified)
- [ ] **Step 2: Verify** — all 5 tabs load, CTLA-4 domain map shows 3 domains, ipilimumab properties table visible, Frontiers tab shows CAR-T and bispecific items
- [ ] **Step 3: Commit** `git commit -m "feat: 2018 checkpoint immunotherapy module"`

---

### Task 11: modules/2024_microrna.html

**Topic:** microRNA discovery | Ambros & Ruvkun | Color: `#aa77ff`

**MODULE_MOLS:**
- `lin4_mirna`: lin-4 miRNA — `#aa77ff` — is_protein:false — type:'ncRNA ~22 nt' — properties: {Length:'22 nt', Target:'lin-14 3\'UTR', Organism:'C. elegans', Discovery:'1993 Ambros lab', Conservation:'Not conserved (C. elegans specific)'}
- `let7_mirna`: let-7 miRNA — `#ffd700` — is_protein:false — type:'ncRNA ~21 nt' — properties: {Length:'21 nt', Target:'lin-41 3\'UTR', Conservation:'Across all bilaterians', Discovery:'Reinhart et al. 2000', Human orthologs:'13 let-7 family members'}
- `ago2`: AGO2 (Argonaute-2) — PDB 4OLA — `#00e5ff` — is_protein:true — domains: [N domain, PAZ domain (3' end anchor), MID domain (5' phosphate), PIWI domain (slicer RNase H fold)]
- `dicer1`: DICER1 — PDB 2QVW — `#00ff99` — is_protein:true — domains: [Helicase, PAZ, Platform, RNase IIIa, RNase IIIb, dsRBD]

**PHASES (5):** pri-miRNA transcription → Drosha/DGCR8 nuclear cleavage → Exportin-5 export → Dicer cytoplasmic cleavage → RISC loading + 3'UTR silencing

**Story:** Ambros 1993 lin-4 (thought to be worm quirk); Ruvkun lin-14 translational repression; let-7 in 2000; "conservation shock"; 2001 Science papers establishing general mechanism; miRBase growth to 2,500+ human miRNAs.

**Frontiers:** miravirsen (miR-122 antagomir for HCV — Phase II); inclisiran structure (siRNA vs miRNA differences); liquid biopsy with circulating miRNAs; TargetScan deep learning updates; ceRNA hypothesis and circular RNA competition; miRNA sponges as therapeutic strategy.

**Local glossary additions:**
```javascript
Object.assign(window.GLOSS, {
  'risc':    { term:'RISC (RNA-induced silencing complex)', level:'grad', def:'AGO2-centered effector complex loaded with ~22 nt guide strand. Guide base-pairs target mRNA 3\'UTR via seed sequence (nt 2-7). Perfect match: AGO2 slices. Imperfect: GW182/TNRC6 recruits CCR4-NOT deadenylase complex → translational repression + mRNA decay.' },
  'seed_seq':{ term:'Seed sequence (miRNA)', level:'res', def:'Nucleotides 2-7 of the miRNA 5\' end — the primary determinant of target specificity. 7mer-A1, 7mer-m8, and 8mer sites provide progressively stronger repression. ~60% of conserved mammalian miRNA targets have perfect seed matches.' },
  'cerna':   { term:'ceRNA hypothesis', level:'frontier', def:'Competing endogenous RNA — lncRNAs, circRNAs, and pseudogene transcripts acting as miRNA sponges by harboring miRNA response elements, sequestering miRNAs from their mRNA targets. Controversial (requires high ceRNA:miRNA ratio to be physiologically relevant). Active research area 2024.' },
});
```

- [ ] **Step 1: Create modules/2024_microrna.html**
- [ ] **Step 2: Verify** — AGO2 domain map (4 domains), let-7 conservation note in Story, miravirsen in Frontiers
- [ ] **Step 3: Commit** `git commit -m "feat: 2024 microRNA module — lin-4/let-7 RISC pathway"`

---

### Task 12: modules/2019_hif_oxygen.html

**Topic:** HIF / oxygen sensing | Kaelin, Ratcliffe, Semenza | Color: `#ff8844`

**MODULE_MOLS:**
- `hif1a_prot`: HIF-1α — PDB 1LM8 — `#ff8844` — is_protein:true — domains: [bHLH (DNA binding), PAS-A, PAS-B (dimerization), TAD-N (P402 hydroxylation site), ODD (P564), TAD-C]
- `vhl_prot`: pVHL — PDB 1LQB — `#00e5ff` — is_protein:true — domains: [β-domain (HIF-1α binding via elongin), α-domain (elongin B/C binding)]
- `phd2_prot`: PHD2/EGLN1 — PDB 2HBT — `#aa77ff` — is_protein:true — domains: [MYND-type zinc finger, catalytic domain (cupin fold, Fe²⁺/2-OG binding)]
- `belzutifan`: Belzutifan (HIF-2α inhibitor) — `#00ff99` — is_protein:false — properties: {MW:'383.4 g/mol', Target:'HIF-2α PAS-B domain', FDA approved:'2021', Indication:'VHL-mutant ccRCC; tuberous sclerosis', Mechanism:'Disrupts HIF-2α:ARNT dimerization'}

**PHASES (5):** Normoxia PHD2 hydroxylation → VHL recognition of hydroxyproline → ubiquitination + proteasomal degradation → Hypoxia PHD2 inactive → HIF target gene transcription (VEGF, EPO, LDHA, PDK1)

**Story:** Semenza HIF-1 discovery 1991; Ratcliffe's VHL-HIF connection; Kaelin's clear-cell RCC research; three-way competition; altitude physiology and tumor survival as the same pathway.

**Frontiers:** Belzutifan FDA 2021 (first HIF inhibitor); PHD inhibitors for anemia (roxadustat, vadadustat — approved in China/Europe); HIF-2α in tumor immunosuppression; PROTAC degraders targeting HIF; HIF in ischemic preconditioning.

**Local glossary additions:**
```javascript
Object.assign(window.GLOSS, {
  'hydroxylation': { term:'Prolyl hydroxylation (HIF)', level:'grad', def:'PHD enzymes modify Pro402 and Pro564 of HIF-1α using O₂, 2-oxoglutarate (2-OG), and Fe²⁺ as co-substrates, generating 4-hydroxyproline. This modification is recognized by VHL with Kd ~1 μM (hydroxylated) vs >1 mM (unmodified) — 1000-fold selectivity.' },
  'vegf_a':  { term:'VEGF-A', level:'grad', def:'Vascular endothelial growth factor A — principal HIF-1α target gene. Binds VEGFR1 (decoy) and VEGFR2 (signaling) on endothelial cells driving angiogenesis, permeability, and endothelial survival. Target of bevacizumab (anti-VEGF mAb) and VEGFR TKIs (sunitinib, pazopanib).' },
  'clear_cell_rcc': { term:'Clear-cell renal cell carcinoma (ccRCC)', level:'res', def:'Most common kidney cancer (~75% of RCC). VHL tumor suppressor mutated/methylated in >90% of cases, constitutively activating HIF-1α/2α. Characterized by lipid/glycogen accumulation (clear cytoplasm). Highly angiogenic, sensitive to VEGFR TKIs and HIF-2α inhibitors.' },
});
```

- [ ] **Step 1: Create modules/2019_hif_oxygen.html**
- [ ] **Step 2: Verify** — PHD2 3D domain map shows cupin fold domain, belzutifan FDA 2021 in Frontiers
- [ ] **Step 3: Commit** `git commit -m "feat: 2019 HIF/oxygen sensing module"`

---

### Task 13: modules/2016_autophagy.html

**Topic:** Autophagy mechanisms | Yoshinori Ohsumi | Color: `#00e5ff`

**MODULE_MOLS:**
- `ulk1_cplx`: ULK1 kinase complex — PDB 4WNO — `#00e5ff` — is_protein:true — domains: [N-term kinase domain, serine-rich region, LIR motif, EAT/MIT domain]
- `atg5_12`: ATG5-ATG12 conjugate — PDB 2DYP — `#ffd700` — is_protein:true — domains: [ATG12 (ubiquitin-like fold), ATG5 N-lobe, ATG5 C-lobe] — note: covalent conjugate via Gly-Lys isopeptide bond
- `lc3b`: LC3B — PDB 1UGM — `#00ff99` — is_protein:true — domains: [Ubl fold, LIR-binding hydrophobic pockets (HP1/HP2), G120 lipidation site]
- `p62_sqstm1`: p62/SQSTM1 — PDB 2JY7 — `#aa77ff` — is_protein:true — domains: [PB1 oligomerization, ZZ zinc finger, NLS, LIR (LC3-binding), UBA (ubiquitin-binding), KIR (Keap1-interacting)]

**PHASES (5):** mTORC1 inhibition → ULK1 complex activation → PI3K/VPS34 PI3P generation + phagophore nucleation → ATG5-ATG12/ATG16L1 LC3 lipidation + membrane elongation → p62 cargo recruitment + lysosomal fusion

**Story:** Ohsumi 1992 yeast vacuole screen; ATG gene identification; mammalian autophagy; LC3-II Western blot as standard assay; Ohsumi working alone in small lab; Nobel awarded for understanding starvation response mechanism.

**Frontiers:** Autophagy in cancer (dual role); hydroxychloroquine (HCQ) + chemotherapy trials for autophagy inhibition; selective autophagy (mitophagy via PINK1/Parkin, ER-phagy via FAM134B, xenophagy); TFEB nuclear translocation as lysosomal biogenesis regulator + drug target; autophagy in protein aggregation diseases (Huntington's, ALS).

**Local glossary additions:**
```javascript
Object.assign(window.GLOSS, {
  'pi3p': { term:'PI3P (phosphatidylinositol 3-phosphate)', level:'grad', def:'Phosphoinositide lipid generated by VPS34 (Class III PI3K) at phagophore nucleation sites (ER-mitochondria contacts, also recycling endosomes). PI3P recruits WIPI2 and DFCP1 containing FYVE/PX domains to initiate autophagosome biogenesis.' },
  'lir':  { term:'LIR motif (LC3-interacting region)', level:'res', def:'Conserved sequence W/F/Y-x-x-L/I/V in autophagy receptors (p62, NDP52, OPTN). Docks into HP1 (W/F/Y) and HP2 (L/I/V) hydrophobic pockets on LC3/GABARAP family members. The molecular bridge between ubiquitinated cargo and autophagosome membrane.' },
  'mitophagy': { term:'Mitophagy', level:'res', def:'Selective autophagic degradation of damaged mitochondria. PINK1/Parkin pathway: PINK1 accumulates on depolarized mitochondria (lost import) → recruits/activates Parkin E3 ligase → ubiquitinates OMM proteins → NDP52/OPTN autophagy receptors → LC3 on growing autophagosome.' },
});
```

- [ ] **Step 1: Create modules/2016_autophagy.html**
- [ ] **Step 2: Verify** — p62 multi-domain map, LC3 lipidation animation, HCQ + chemotherapy in Frontiers
- [ ] **Step 3: Commit** `git commit -m "feat: 2016 autophagy module — ATG proteins, LC3-II, lysosomal degradation"`

---

### Task 14: modules/2021_trp_channels.html

**Topic:** TRP channels / thermosensation / mechanosensation | Julius & Patapoutian | Color: `#ff8844`

**MODULE_MOLS:**
- `trpv1_prot`: TRPV1 — PDB 5GGS — `#ff8844` — is_protein:true — domains: [Ankyrin repeat domain (6×), S1-S4 voltage-sensor-like, S5-S6 pore domain, TRP helix, capsaicin-binding pocket (TM4-TM5 linker)]
- `piezo2_prot`: PIEZO2 — PDB 6KG7 — `#00e5ff` — is_protein:true — domains: [38 TM helices/subunit, peripheral blade units (each: 4 THU units), beam, anchor, CTD/pore module] — note: homotrimer 3×2521 aa
- `capsaicin`: Capsaicin — PubChem CID 1548943 — `#ffd700` — is_protein:false — properties: {MW:'305.4 g/mol', Source:'Capsicum peppers', EC50 (TRPV1):'~300 nM', Vanilloid binding site:'TM4-TM5 linker', Clinical use:'Qutenza patch (8%) neuropathic pain'}
- `rtx`: Resiniferatoxin (RTX) — PubChem CID 107794 — `#ff4488` — is_protein:false — properties: {MW:'628.7 g/mol', Potency vs capsaicin:'~10,000×', Use:'Intrathecal pain ablation trials', Source:'Euphorbia resinifera resin', Selectivity:'TRPV1 only (vs capsaicin cross-reactivity)'}

**PHASES (5):** Resting TRPV1 closed → Heat activation >43°C (membrane conformational change) → Capsaicin binding vanilloid pocket → PIEZO2 membrane deformation gating → Action potential propagation along nociceptor fiber

**Story:** Julius 1997 capsaicin expression screen (TRPV1 cloning from DRG cDNA library); Patapoutian 2010 poking cells screen leading to PIEZO1/2; how a pepper compound revealed heat sensation mechanism; PIEZO mutations in hereditary lymphedema and fetal akinesia.

**Frontiers:** TRPV1 antagonists for non-opioid analgesia (AstraZeneca AZD1386 — hyperthermia side effect problem); Qutenza (8% capsaicin patch, FDA approved); PIEZO1 agonist Yoda1 for sickle cell disease (GBT601 clinical trials); cryo-EM structures enabling structure-based TRPV1 drug design; TRPA1 role in itch and COVID-19 cough.

**Local glossary additions:**
```javascript
Object.assign(window.GLOSS, {
  'nociceptor': { term:'Nociceptor', level:'grad', def:'High-threshold sensory neuron responding to noxious stimuli. C-fibers (unmyelinated, 0.5-2 m/s): slow burning pain, temperature. Aδ-fibers (thinly myelinated, 5-30 m/s): fast sharp pain. TRP channels are primary transducers; voltage-gated Nav1.7/1.8/1.9 amplify and propagate. DRG and trigeminal ganglia cell bodies.' },
  'vanilloid':  { term:'Vanilloid pocket', level:'res', def:'Hydrophobic binding site on TRPV1 formed by TM4-TM5 linker residues Y511, S512, T550, E570, R557 (rat). Capsaicin, RTX, and endocannabinoids (anandamide) bind here via hydrogen bonding (vanillyl OH) and hydrophobic contacts. First identified by Julius lab through TRPV1 chimera studies.' },
  'piezo_blade':{ term:'PIEZO blade units (THU)', level:'frontier', def:'PIEZO channels consist of peripheral blade units (each = 4 transmembrane helix units or THU) arranged as propeller-like arms. Membrane tension transmitted through blades to central pore. Cryo-EM shows propeller-like architecture; molecular dynamics suggests the blades indent the bilayer to sense curvature change.' },
});
```

- [ ] **Step 1: Create modules/2021_trp_channels.html**
- [ ] **Step 2: Verify** — TRPV1 5-domain map, RTX vs capsaicin potency comparison in properties, Qutenza in Frontiers
- [ ] **Step 3: Commit** `git commit -m "feat: 2021 TRP channels module — TRPV1, PIEZO2, nociception"`

---

### Task 15: modules/2017_circadian.html

**Topic:** Circadian rhythm molecular mechanisms | Hall, Rosbash, Young | Color: `#ffd700`

**MODULE_MOLS:**
- `clock_bmal1_prot`: CLOCK:BMAL1 — PDB 4F3L — `#ffd700` — is_protein:true — domains: [CLOCK bHLH, CLOCK PAS-A, CLOCK PAS-B, BMAL1 bHLH, BMAL1 PAS-A, BMAL1 PAS-B, BMAL1 TAD (BMAL1-K537 acetylation site)]
- `per2_prot`: PER2 — PDB 3GDI — `#00e5ff` — is_protein:true — domains: [PAS-A, PAS-B (binds CRY1), CLD (CKIδ binding domain), NES, NLS, CC helix]
- `cry1_prot`: CRY1 — PDB 4MX3 — `#aa77ff` — is_protein:true — domains: [Photolyase homology region (PHR), C-terminal tail (CTT, disorder → order on CLOCK binding)]
- `ck1delta`: CKIδ (CSNK1D) — PDB 1CKJ — `#ff8844` — is_protein:true — domains: [N-lobe (kinase), C-lobe, activation segment, C-terminal regulatory domain (autoinhibitory)]

**PHASES (5):** CLOCK:BMAL1 drives PER/CRY transcription (E-box binding) → PER/CRY cytoplasmic accumulation → CKIδ phosphorylates PER (targeting for slow degradation) → PER:CRY nuclear complex represses CLOCK:BMAL1 → PER/CRY degradation resets cycle (~24h)

**Story:** Hall 1984 Drosophila period gene; Rosbash 1988 PER protein feedback loop hypothesis; Young timeless and doubletime (CKIδ homolog); how a fly gene explains jet lag; BMAL1 knockout mice (arrhythmic, obese, shortened lifespan); light entrainment via CRY degradation pathway.

**Frontiers:** Chronopharmacology (cancer chemotherapy timed to circadian phase — TIME-C trial); CKIδ inhibitors for familial advanced sleep phase syndrome (FASPS); BMAL1 in metabolic syndrome; shift work epidemiology (IARC Group 2A carcinogen); AI-based personalized dosing timing platforms; mTORC1-clock interaction for cancer metabolism.

**Local glossary additions:**
```javascript
Object.assign(window.GLOSS, {
  'ebox':       { term:'E-box (enhancer box)', level:'grad', def:'Palindromic DNA motif CACGTG bound by bHLH (basic helix-loop-helix) transcription factors. CLOCK:BMAL1 heterodimer binds canonical E-boxes in promoters of PER1/2/3, CRY1/2, REV-ERBα/β, and ~5,000 circadian output genes including VEGF, p21, metabolic enzymes.' },
  'fasps':      { term:'Familial Advanced Sleep Phase Syndrome (FASPS)', level:'res', def:'Autosomal dominant circadian disorder: sleep onset ~9:30pm, wake ~4:30am, no jetlag. Caused by PER2-S662G mutation (reduces CKIδ phosphorylation, extends PER2 half-life → shortened free-running period). CKIδ-T44A missense also reported. Proof-of-concept for circadian clock as drug target.' },
  'zeitgeber':  { term:'Zeitgeber (time-giver)', level:'grad', def:'Environmental cue entraining the circadian clock to the ~24h light-dark cycle. Principal zeitgeber: light (via melanopsin retinal ganglion cells → suprachiasmatic nucleus → CRY degradation). Secondary: temperature, food timing, exercise. SCN is the master pacemaker synchronizing peripheral tissue clocks.' },
});
```

- [ ] **Step 1: Create modules/2017_circadian.html**
- [ ] **Step 2: Verify** — PER2 oscillation animation (sine wave particle orbit), CKIδ phosphorylation slide, FASPS in Story, chronopharmacology in Frontiers
- [ ] **Step 3: Commit** `git commit -m "feat: 2017 circadian module — CLOCK/BMAL1/PER/CRY feedback oscillator"`

---

### Task 16: modules/2022_paleogenomics.html

**Topic:** Discoveries on genomes of extinct hominins and human evolution | Svante Pääbo | Color: `#ffd700`

**Note for implementing agent:** This module's molecules are conceptual/computational rather than chemical. Adapt the mol-card and MolModal.open() accordingly: Structure + Properties tab shows aDNA damage pattern diagram (canvas bar chart of deamination frequency vs read position) instead of bond structure. Interaction Map shows phylogenetic/admixture network.

**MODULE_MOLS:**
- `adna_damage`: Ancient DNA damage pattern — `#ffd700` — is_protein:false — type:'aDNA authentication' — properties: {Fragmentation:'Mean ~50 bp','5\' C→T':'~30% at position 1','3\' G→A':'~20% at position 1', Age range:'Viable: 50,000+ years (permafrost); <10,000 (tropical)',Contamination:'Modern DNA typically >90%'}
- `neanderthal_genome`: Neanderthal nuclear genome — `#00e5ff` — is_protein:false — type:'Paleogenomic dataset' — properties: {Source:'Vindija 33.19 cave, Croatia',Coverage:'~52× (2013 high-coverage)',Divergence:'Homo sapiens — ~600,000 ya MCA','Neanderthal admixture in modern humans':'~1.8-2.6% (non-Africans)','Denisovan admixture':'~4-6% Melanesians'}
- `epas1_allele`: EPAS1 Tibetan altitude allele — `#aa77ff` — is_protein:false — type:'Introgressed variant' — properties: {Gene:'EPAS1 (HIF-2α)','Source':'Denisovan introgression','Effect':'Reduced erythropoiesis at high altitude (protective)','Allele frequency in Tibetans':'>80%','Absent in Han Chinese':'<1%'}
- `admixture_tool`: D-statistics / ADMIXTURE — `#00ff99` — is_protein:false — type:'Bioinformatics tool' — properties: {Method:'ABBA-BABA test (D-statistics)','Detects':'Excess shared derived alleles between test and archaic vs outgroup','ADMIXTURE':'Maximum likelihood ancestry proportions from SNPs','Key paper':'Green et al. Science 2010','Software':'ADMIXTURE v1.3, PLINK, EIGENSOFT'}

**PHASES (5):** Ancient specimen → DNA extraction (silica spin column, bleach pre-treatment) → library preparation (end repair, adapter ligation, UDG treatment) → hybridization capture (modern human bait probes) → bioinformatic authentication (damage pattern analysis, contamination estimate) + admixture inference

**Story:** Pääbo 1984 Egyptian mummy (retracted, but founded field); 1997 Feldhofer Neanderthal mtDNA; 2006–2010 Neanderthal nuclear genome project; Denisovan finger bone 2010 (whole genome from single phalanx); admixture discovery; EPAS1 altitude adaptation; reaction to finding Neanderthal DNA in living people.

**Frontiers:** Proteomics (collagen sequences survive >1.7 million years — Homo antecessor 2020); ancient pathogen genomics (Black Death Yersinia pestis, Spanish flu H1N1 1918); tropical soil aDNA; Denisovan introgression in OAS1 (COVID-19 protection), TRPM8 (cold sensing), KCNQ3; AI for contamination filtering in aDNA pipelines.

**Local glossary additions:**
```javascript
Object.assign(window.GLOSS, {
  'adna_auth':  { term:'aDNA authentication criteria', level:'res', def:'Requirements to validate ancient DNA: (1) C→T deamination at 5\' ends (>10%); (2) short fragment lengths (<100 bp modal); (3) phylogenetically reasonable sequence; (4) independent replication; (5) contamination estimate <1% (mtDNA) or <5% (nuclear) by quantifying modern human reads. Strict clean-room extraction mandatory.' },
  'introgression': { term:'Archaic introgression', level:'res', def:'Gene flow from archaic hominins (Neanderthals, Denisovans) into anatomically modern humans after their divergence ~600 kya. Detected by D-statistics. ~2% Neanderthal in non-Africans; ~4-6% Denisovan in Melanesians. Adaptive variants retained: EPAS1 (altitude), OAS1 (antiviral), TRPM8 (cold). Deleterious variants purged.' },
  'beagle_imputation': { term:'Genotype imputation (BEAGLE)', level:'res', def:'Statistical method inferring unobserved genotypes from nearby SNPs using reference haplotype panels. Essential for low-coverage ancient genomes. BEAGLE 5.4 can impute ~7M SNPs from 0.1× coverage aDNA, enabling GWAS of ancient samples. Critical for connecting archaic introgression to disease risk variants.' },
});
```

- [ ] **Step 1: Create modules/2022_paleogenomics.html** — adapt Structure tab to show aDNA damage pattern chart; Interaction Map shows phylogenetic admixture network
- [ ] **Step 2: Verify** — aDNA damage chart canvas renders, Denisovan EPAS1 allele in molecules tab, tropical soil proteomics in Frontiers
- [ ] **Step 3: Commit** `git commit -m "feat: 2022 paleogenomics module — Neanderthal/Denisovan aDNA admixture"`

---

### Task 17: modules/2020_hepatitis_c.html

**Topic:** HCV discovery | Alter, Houghton, Rice | Color: `#44ffcc`

**MODULE_MOLS:**
- `ns5b_pol`: HCV NS5B polymerase — PDB 1QSY — `#44ffcc` — is_protein:true — domains: [fingers (NTP entry), palm (GDD catalytic triad), thumb (processivity/allosteric site), β-loop (GT occludes NTP channel in apo form)]
- `ns3_prot`: HCV NS3/4A protease-helicase — PDB 1A1R — `#ffd700` — is_protein:true — domains: [Protease (chymotrypsin-like), Helicase domain 1, Helicase domain 2, Helicase domain 3 (RecA-like folds)]
- `sofosbuvir`: Sofosbuvir — PubChem CID 45375808 — `#00ff99` — is_protein:false — properties: {MW:'529.5 g/mol', 'Prodrug activation':'Hepatic cathepsin A + histidine triad nucleotide-binding protein','Active metabolite':'GS-461203 (nucleoside triphosphate)','Mechanism':'Chain terminator — no 3\'-OH for extension','Resistance barrier':'Very high (S282T mutation)','SVR12':'~95-99% in combination'}
- `glecaprevir`: Glecaprevir — PubChem CID 67683433 — `#00e5ff` — is_protein:false — properties: {MW:'838.6 g/mol', Target:'NS3/4A protease', Pan-genotypic:'Yes (GT1-6)', Generation:'3rd (macrocyclic)', Partner:'Pibrentasvir (NS5A inhibitor)', 'Regimen duration':'8 weeks treatment-naive'}

**PHASES (5):** HCV virion binding (E1/E2 → CD81/SR-BI/CLDN1/OCLN) → Uncoating + IRES-mediated translation (cap-independent) → NS3/4A polyprotein processing → NS5B replication complex at ER membranes → DAA combination therapy (NS3/4A + NS5A + NS5B triple blockade)

**Story:** Alter 1975 non-A, non-B hepatitis in transfusion recipients; Houghton 1989 HCV cDNA cloning from chimpanzee; Rice 1997 chimeric infectious clone proving causation; blood supply safety crisis; 170 million chronically infected globally; DAA revolution making cure possible.

**Frontiers:** WHO 2030 HCV elimination target (72% reduction in new infections, 65% reduction in mortality); HCV vaccine challenge (no approved vaccine; NS3/NS5A quasispecies diversity); HBV cure (HCV as model — similar approaches using RNAi, capsid inhibitors, TLR8 agonists); HCV in oncology (HCV eradication reduces HCC risk 70%); CAR-T for viral reservoirs.

**Local glossary additions:**
```javascript
Object.assign(window.GLOSS, {
  'ires':   { term:'IRES (Internal Ribosome Entry Site)', level:'grad', def:'Structured RNA element recruiting ribosomes to begin translation without 5\' cap recognition. HCV IRES (type III): directly contacts 40S subunit and eIF3; bypasses eIF4E requirement. Allows viral translation when cap-dependent translation is suppressed during cellular stress. Also found in picornaviruses, HIV, and stress-responsive cellular mRNAs.' },
  'svr12':  { term:'SVR12 (sustained virologic response at 12 weeks)', level:'grad', def:'Undetectable HCV RNA at 12 weeks post-treatment completion — the operational definition of HCV cure. Functionally: <15 IU/mL by PCR assay. SVR12 is durable in >99.9% of patients; relapse is extremely rare. Pan-genotypic DAA regimens achieve SVR12 in 95-99% of treatment-naive patients.' },
  'ns5a':   { term:'NS5A (HCV replication complex)', level:'res', def:'Multifunctional HCV non-structural protein — phosphoprotein with no enzymatic activity but essential for replication complex formation, virion assembly, and IFN resistance. Domain I: RNA binding and oligomerization. Domains II/III: membrane association, NS5B interaction, apolipoprotein E interaction for particle assembly. Target of ledipasvir, pibrentasvir, velpatasvir.' },
});
```

- [ ] **Step 1: Create modules/2020_hepatitis_c.html**
- [ ] **Step 2: Verify** — NS5B GDD catalytic triad in domain map, sofosbuvir prodrug activation note in properties, WHO 2030 elimination target in Frontiers
- [ ] **Step 3: Commit** `git commit -m "feat: 2020 HCV module — NS3/NS5B targets, sofosbuvir, curative DAA platform"`

---

### Task 18: modules/2015_antiparasitic.html

**Topic:** Avermectin & Artemisinin | Campbell, Ōmura, Tu | Color: `#aa77ff`

**MODULE_MOLS:**
- `ivermectin`: Ivermectin — PubChem CID 6321424 — `#aa77ff` — is_protein:false — properties: {MW:'875.1 g/mol (B1a)', Source:'Streptomyces avermitilis (Ōmura)', Mechanism:'GluCl channel positive allosteric modulator', EC50:'~50 nM (AVR-14/GLC-1)', Bioavailability:'Oral ~72% (veterinary)', 'Clinical use':'Onchocerciasis, lymphatic filariasis, strongyloidiasis, scabies'}
- `artemisinin`: Artemisinin — PubChem CID 68827 — `#ffd700` — is_protein:false — properties: {MW:'282.3 g/mol', Source:'Artemisia annua (sweet wormwood)', 'Activated by':'Fe²⁺ (heme in parasite food vacuole)', Target:'PfKRS1 (lysyl-tRNA synthetase), multiple Fe²⁺-rich proteins', Mechanism:'Endoperoxide → carbon-centered radical alkylation', 'Extraction temperature':'35°C (critical — Tu insight)', Resistance:'PfKelch13 mutations → partial resistance'}
- `glucl_channel`: GluCl channel — PDB 3RHW — `#00e5ff` — is_protein:true — domains: [Extracellular domain (ECD, ivermectin binding site at TM2-TM3 interface), Transmembrane domain (TMD, 4 helices/subunit, M2 lines pore), Intracellular domain (ICD)]
- `pfkelch13`: P. falciparum Kelch13 — PDB 4YY8 — `#ff4488` — is_protein:true — domains: [BTB-POZ dimerization, BACK domain, 6× Kelch propeller (β-propeller blade)]

**PHASES (5):** Ōmura soil sample collection (Streptomyces avermitilis isolation) → Avermectin isolation + structure determination → Ivermectin mechanism (GluCl binding, Cl⁻ influx, hyperpolarization, paralysis) → Artemisinin extraction at 35°C (Tu's critical insight from cryogenic ether extraction) → Artemisinin activation (heme Fe²⁺ + endoperoxide → radical → PfKRS1 alkylation)

**Story:** Ōmura's 50,000 soil samples from Kawana Golf Course; Campbell's chemist eye at Merck; Tu's Cultural Revolution-era clandestine Project 523 (1967); the 1972 extraction — all previous extractions failed because boiling inactivated the active compound; tu's 4th-century Ge Hong herbal text insight; Merck Mectizan donation program; ~300 million ivermectin doses annually.

**Frontiers:** Ivermectin in oncology (MDM2 degradation, WNT/β-catenin, P-gp inhibition — Phase II trials); dihydroartemisinin in cancer (reactive oxygen species, mitophagy induction — Phase II for AML); next-generation ACTs vs PfKelch13-resistant parasites in Southeast Asia; soil microbiome AI-guided discovery (Streptomyces genome mining); CRISPR gene drive for malaria vector control.

**Local glossary additions:**
```javascript
Object.assign(window.GLOSS, {
  'glucl': { term:'GluCl channel (glutamate-gated Cl⁻ channel)', level:'grad', def:'Invertebrate-specific Cys-loop ligand-gated ion channel. Pentameric Cl⁻ channel gated by glutamate (endogenous) or ivermectin (allosteric). Expressed in pharyngeal and body wall muscles and neurons of nematodes and insects. Mammalian homologs (GABA-A, glycine receptor) are not effectively targeted by ivermectin at therapeutic doses — the selectivity basis.' },
  'endoperoxide': { term:'Endoperoxide bridge (artemisinin)', level:'res', def:'The 1,2,4-trioxane ring containing the -O-O- peroxide bridge is the pharmacophore of artemisinin. Fe²⁺ from heme (released during parasite hemoglobin digestion) homolytically cleaves the endoperoxide, generating carbon-centered and oxygen-centered free radicals. These alkylate heme, PfKRS1, PfEXP2, and other Fe²⁺-rich parasite proteins. The parasite cannot escape its own heme metabolism.' },
  'act':    { term:'ACT (Artemisinin Combination Therapy)', level:'grad', def:'WHO-recommended first-line malaria treatment: artesunate (artemisinin derivative) + partner drug (lumefantrine, amodiaquine, piperaquine, mefloquine, or pyronaridine). Artemisinin rapidly reduces parasitemia; partner drug eliminates residual parasites. Combination prevents resistance. Pfkelch13 mutations cause partial artemisinin resistance (delayed clearance) in Southeast Asia — major public health concern.' },
});
```

- [ ] **Step 1: Create modules/2015_antiparasitic.html**
- [ ] **Step 2: Verify** — GluCl 3-domain map, artemisinin endoperoxide radical animation, PfKelch13 resistance in Frontiers, Mectizan donation program in Story
- [ ] **Step 3: Commit** `git commit -m "feat: 2015 antiparasitic module — avermectin/ivermectin and artemisinin mechanisms"`

---

### Task 19: Integration Verification

**Files:** No new files.

- [ ] **Step 1: Open hub and verify all 10 cards**

```bash
python serve.py
# http://localhost:8080 — verify 10 Nobel cards on timeline
```

- [ ] **Step 2: Verify each module opens correctly (spot-check 3)**

Open modules/2023_mrna.html, modules/2018_immunotherapy.html, modules/2024_microrna.html.
For each: verify 5 tabs work, molecule modal opens (check all 5 viz tabs), back link returns to hub.

- [ ] **Step 3: Verify glossary tooltips**

In any module: hover a `.gtip` term for 5 seconds → charge bar fills → pins. Hover a compound term ("pseudouridine-modified mRNA") → main entry shown + "See also" link.

- [ ] **Step 4: Verify property label tooltips**

Open molecule modal → Structure + Properties tab → hover "Resolution" label on a protein entry → tooltip appears with grad-level definition.

- [ ] **Step 5: Verify localStorage progress**

Open 3 modules, return to hub — 3 cards show ✓, progress bar at 30%, stat shows 3/10.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: kbiology Nobel Frontier complete — 10 modules, hub, NIH data, glossary tooltips"
```

---

## Appendix: MolModal.open() Data Schema

```javascript
MolModal.open({
  // Required
  id:           'string',           // unique key within module
  name:         'string',           // display name
  icon:         '🔵',              // emoji
  color:        '#00e5ff',          // accent hex color
  type:         'Small Molecule',   // display type string
  is_protein:   false,              // true = shows Domain Map tab

  // Identification
  sub:          'PubChem CID: ...',
  pubchem_cid:  135398513,          // number or null
  pdb_id:       null,               // string (e.g., '6VSB') or null
  nih_link:     'https://...',
  pubchem_link: 'https://...',      // auto-generated if pubchem_cid present
  pdb_link:     'https://...',      // auto-generated if pdb_id present

  // Header badges [{text, color}]
  badges: [{ text: 'mRNA mod', color: '#00e5ff' }],

  // Structure + Properties tab
  properties:     { 'MW': '258 g/mol', 'XLogP': '-2.1', ... },
  property_flags: { 'XLogP': 'good' },   // 'good' | 'warn' | 'bad'
  mechanism:      'string',              // paragraph describing function

  // Interaction Map tab
  interaction: {
    title: 'string',
    nodes: [{ id, x, y, r, color, label, sub }],  // x/y in 0-500 / 0-320 space
    edges: [{ from, to, color, label, dashed }]
  },

  // Key Papers tab [{year, journal, impact, title, abstract}]
  papers: [...],

  // Related Molecules tab [{icon, name, role, id}]
  rel_molecules: [...],

  // Domain Map tab — proteins only [{color, name, pos, fn}]
  domains: [...],
});
```

---

## Appendix: Per-Module Glossary Augmentation Pattern

```javascript
// Add at top of <script> in each module, before loading shared/glossary-data.js:
// (Or as inline script immediately before loading glossary-tooltip.js)
// This pattern ensures module-specific terms are available for .gtip spans in that module.

// Example for any module:
Object.assign(window.GLOSS = window.GLOSS || {}, {
  'your_term': {
    term: 'Your Term (full name)',
    level: 'grad',   // 'grad' | 'res' | 'frontier'
    def: 'Graduate-level definition. Assume the reader has a bioengineering degree and knows central dogma, cell biology, and basic biochemistry. Explain the mechanistic detail, regulatory significance, and research relevance.'
  }
});
```
