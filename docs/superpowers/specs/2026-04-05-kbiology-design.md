# kbiology — Nobel Frontier: Design Spec
**Date:** 2026-04-05  
**Status:** Approved  
**Project dir:** `C:\Users\kevin\OneDrive\Desktop\kbiology040426\`

---

## 1. Vision

An interactive, graduate/post-doc level visual learning tool covering the 10 Nobel Medicine & Physiology prizes from 2015–2025. Content is pitched at a researcher/engineer who has bioengineering undergraduate training, clinical lab and pharmacy experience, and wants to engage with the frontier of medicine, biotech, computational biology, and pharmaceutical science — not introductory biology.

The app is deliberately **content-maximalist**: lots of modals, multiple visualization pipelines per topic, animated mechanisms, molecular intelligence pulled from NIH public databases (cached locally), and a guided-tour system auto-starting on every module.

---

## 2. Architecture — Option C (Hybrid Hub + Per-Topic Modules)

### 2.1 Approach
Pure HTML/JS (no build step, no framework) matching the user's existing `ktopologymath040426` Penrose project pattern. A Python data fetcher pre-pulls NIH data once and caches it as local JSON. App reads local files at runtime — zero API dependency during use.

### 2.2 File Structure

```
kbiology040426/
├── index.html                        # Hub — animated Nobel timeline mission control
├── serve.py                          # One-liner: python serve.py to launch
├── fetch_data.py                     # One-time NIH data fetcher (PubChem/PDB/PubMed)
│
├── data/                             # Local NIH data cache (written by fetch_data.py)
│   ├── 2015_antiparasitic.json
│   ├── 2016_autophagy.json
│   ├── 2017_circadian.json
│   ├── 2018_immunotherapy.json
│   ├── 2019_hif_oxygen.json
│   ├── 2020_hepatitis_c.json
│   ├── 2021_trp_channels.json
│   ├── 2022_paleogenomics.json
│   ├── 2023_mrna.json
│   └── 2024_microrna.json
│
├── shared/                           # Shared infrastructure (all modules load these)
│   ├── glossary-data.js              # Graduate-level bio/medicine glossary (~300 terms)
│   ├── glossary-tooltip.js           # Tooltip engine (ported + extended from Penrose)
│   ├── auto-start.js                 # Animation auto-start + RAF speed scaler (ported)
│   └── theme.css                     # Shared dark theme + biology color palette
│
└── modules/                          # One HTML file per Nobel discovery
    ├── 2015_antiparasitic.html
    ├── 2016_autophagy.html
    ├── 2017_circadian.html
    ├── 2018_immunotherapy.html
    ├── 2019_hif_oxygen.html
    ├── 2020_hepatitis_c.html
    ├── 2021_trp_channels.html
    ├── 2022_paleogenomics.html
    ├── 2023_mrna.html
    └── 2024_microrna.html
```

---

## 3. Hub (index.html)

### 3.1 Visual Design
- Dark theme (`#05050f` background), bioluminescent accent palette
- Animated particle background (floating glowing dots, slow drift)
- Nobel timeline 2015→2025 as primary navigation: 10 cards on a glowing horizontal rail
- Each card: year badge, emoji icon, topic name, category tag, color-coded by domain
- Hover: card pulses, shows animated preview of the module's key concept
- Click: opens module in new tab
- localStorage: visited cards get a ✓ badge; progress bar fills as modules are explored

### 3.2 Filter Chips
- Categories: All / Immunology / Cell Biology / Genetics-Genomics / Pharmacology / Neuroscience / Biotech-Virology / Computational Bio
- **Hover behavior:** chip modal appears immediately on hover, follows cursor
- **Charge bar:** Warhammer Total War-style glowing border fills over **5 seconds**; on pin, border blazes full color and modal stays open after cursor leaves
- Chip modal contents: category name, count badge, description (graduate-level, no basic biology), list of specific Nobel year/topics in that category, NIH link
- Click elsewhere to dismiss pinned modal

### 3.3 Color Palette
| Category | Color |
|---|---|
| Immunology | `#ff4488` |
| Cell Biology | `#00e5ff` |
| Genetics / Genomics | `#ffd700` |
| Pharmacology | `#aa77ff` |
| Neuroscience | `#ff8844` |
| Biotech / Virology | `#44ffcc` |
| Computational Bio | `#88aaff` |

### 3.4 Extensibility
- Categories, module metadata, and timeline cards are all driven from a `MODULES` config array in `index.html` — adding a new Nobel year = one new entry in the array, one new module file
- Hub UI panels (e.g., quiz mode, comparison view, AI summary, research threads) are designed as collapsible sections below the timeline, each with a feature flag; they can be activated later without touching the timeline or module files

---

## 4. Module Structure (all 10 modules share this template)

### 4.1 Header
- Year badge, prize title, laureate names, category tags
- Back arrow to hub

### 4.2 Five Tabs

#### Tab 1 — Story
- Narrative of the discovery: the researchers, the key experiments, funding struggles, "aha moment", path to Nobel
- Animated timeline visualization: horizontal scrollable events with dates and descriptions
- Tooltips on all technical terms (from `shared/glossary-data.js`)
- No undergraduate-level explanation of basic concepts; assumes familiarity with molecular biology fundamentals

#### Tab 2 — Mechanism
- **Main canvas animation**: the core biological process animated step-by-step (60fps, Canvas 2D)
- Phase-by-phase auto-tour via `shared/auto-start.js`
- Left sidebar: animation controls (phase slider, speed, layer toggles per topic)
- Annotated breakdown panels below canvas: one `panel-card` per phase with gradient-accented title, graduate-level prose, tooltip-marked terms, and molecule chips
- Molecule chips in panel text are clickable → open molecule modal (see §5)

#### Tab 3 — Molecules
- Grid of all key molecular players for the discovery
- Each molecule card: icon, name, type badge (small molecule / protein / lipid / nucleic acid), PubChem CID or PDB ID, brief role
- Click any card → opens full molecule modal (§5)
- 2D structure sketched on canvas from local PubChem SDF data
- Protein cards show simplified ribbon diagram from PDB data

#### Tab 4 — Frontiers
- **What is happening RIGHT NOW (2026)**: active clinical trials, recent publications, AI/ML applications, unsolved questions
- Organized sections: Clinical Pipeline / AI & Computational Approaches / Open Questions / Industry Applications
- Each item is annotated and linked to source (local data from PubMed fetch)
- Focus on pharmaceutical production, bioengineering, and computational biology angles

#### Tab 5 — Connections
- Network graph (Canvas 2D force-directed): this Nobel discovery as central node, connected to:
  - Other Nobel prizes it influenced or was influenced by
  - Key diseases / drug targets it enabled
  - Major clinical drugs/therapies it led to
  - Current research threads
- Hover a node → info tooltip; click → navigate to that module or external link

### 4.3 Shared Sidebar Elements
- **Right sidebar**: key molecules list (icon, name, PDB/PubChem ID, role), landmark papers (year, journal, IF, title, abstract snippet), NIH/external links

---

## 5. Molecule Modal (shared across all modules)

Triggered by clicking any molecule chip or molecule card. Full-screen overlay with backdrop blur.

### 5.1 Modal Header
- Warhammer charge bar fires on open (5-second fill, glows in molecule's accent color)
- Molecule icon, name, sub-identifier (PubChem CID / PDB ID / UniProt), type/category badges
- Close button

### 5.2 Five Visualization Tabs

| Tab | Content |
|---|---|
| Structure + Properties | Canvas 2D bond diagram (from PubChem SDF JSON) + physicochemical property table with color-flagged values (good/warn/bad) + mechanism prose |
| Interaction Map | Node-edge network canvas showing molecular interactions, binding partners, activation/inhibition relationships |
| Key Papers | 3–5 landmark papers: year, journal, impact factor, full title, annotated abstract |
| Related Molecules | Cards for structurally/functionally related compounds — each clickable to open their own modal |
| Domain Map | Proteins only: linear domain architecture bar (colored segments) + domain function table |

### 5.3 Modal Footer
- Links to NIH source, PubChem entry, RCSB PDB entry (all open new tab)
- "Data: local NIH cache · fetched via fetch_data.py" provenance note

---

## 6. Data Layer

### 6.1 Local JSON Schema (per topic)
```json
{
  "topic": "mrna_vaccines",
  "year": 2023,
  "laureates": ["Katalin Karikó", "Drew Weissman"],
  "category": ["biotech", "pharmacology"],
  "molecules": [
    {
      "id": "psu",
      "name": "N1-Methylpseudouridine",
      "type": "small_molecule",
      "pubchem_cid": 135398513,
      "pdb_id": null,
      "color": "#00e5ff",
      "role": "TLR evasion + translational stability",
      "properties": { ... },
      "mechanism": "...",
      "papers": [ ... ],
      "rel_molecules": [ ... ]
    }
  ],
  "papers": [ ... ],
  "frontiers": { ... }
}
```

### 6.2 fetch_data.py — NIH Data Sources
| Source | API | Data fetched |
|---|---|---|
| PubChem | `pubchem.ncbi.nlm.nih.gov/rest/pug/` | Compound properties, 2D SDF structure, synonyms |
| RCSB PDB | `data.rcsb.org/rest/v1/core/entry/{id}` | Protein metadata, resolution, organism, method |
| PubMed E-utilities | `eutils.ncbi.nlm.nih.gov/entrez/eutils/` | Paper abstracts, authors, journal, publication date |
| UniProt | `rest.uniprot.org/uniprotkb/{id}` | Protein function, post-translational modifications, disease associations |

`fetch_data.py` is run once (or re-run to refresh). Writes all fetched data to `/data/` as JSON. No API keys required for any of these sources. Rate limiting handled with `time.sleep(0.5)` between requests.

---

## 7. Shared Infrastructure

### 7.1 glossary-tooltip.js (extended from Penrose)
- Same charge-bar mechanic: hover → bar fills → pin after **5 seconds** → stays open on cursor leave
- Academic level badges: `[grad]` (graduate level), `[res]` (research/postdoc), `[frontier]` (cutting edge 2024–2026)
- No `[ug]` undergraduate badge — all content is graduate+ by design
- Biology-specific term categories: molecular biology, structural biology, pharmacology, immunology, genomics, computational biology

### 7.2 auto-start.js (ported from Penrose, unchanged)
- RAF speed scaler, animation watchdog, auto-click of first "▶" button on tab switch
- Shared verbatim — no modifications needed

### 7.3 theme.css
- CSS variables for all colors, consistent dark background palette
- Biology accent: bioluminescent greens (`#00ff99`), deep cyan (`#00e5ff`), plasma pink (`#ff4488`)
- Typography: Segoe UI / system-ui, monospace for data values
- Shared `.panel-card`, `.prop-row`, `.mol-chip`, `.sec-lbl` utility classes

---

## 8. Ten Nobel Modules — Content Priorities

### Build order (start with highest biotech/pharma/compbio relevance):
1. **2023 — mRNA Vaccines** (Karikó, Weissman): pseudouridine modification, LNP formulation, codon optimization, cancer vaccine pipeline
2. **2018 — Checkpoint Immunotherapy** (Allison, Honjo): CTLA-4/PD-1 biology, tumor microenvironment, combination therapy, CAR-T adjacency
3. **2024 — microRNA** (Ambros, Ruvkun): lin-4/let-7, post-transcriptional silencing, ceRNA networks, miRNA therapeutics pipeline
4. **2019 — HIF/Oxygen Sensing** (Kaelin, Ratcliffe, Semenza): PHD/VHL pathway, hypoxia in tumors, HIF inhibitors in drug pipeline
5. **2016 — Autophagy** (Ohsumi): ATG proteins, mTOR-AMPK control, autophagy in cancer and neurodegeneration, drug targets
6. **2021 — TRP Channels** (Julius, Patapoutian): TRPV1/PIEZO1/2, capsaicin mechanism, mechanosensation, pain drug targets
7. **2017 — Circadian Clocks** (Hall, Rosbash, Young): CLOCK/BMAL1/PER/CRY feedback loop, chronopharmacology, shift work pathology
8. **2022 — Paleogenomics** (Pääbo): ancient DNA extraction, Neanderthal admixture, ADMIXTURE/ALDER tools, archaic introgression in disease risk
9. **2020 — Hepatitis C** (Alter, Houghton, Rice): HCV replication cycle, NS3/NS5A/NS5B targets, pan-genotypic DAAs, cure rates
10. **2015 — Antiparasitic Drugs** (Campbell, Ōmura, Tu): avermectin/ivermectin mechanism, artemisinin-PfKRS1 target, natural product drug discovery

---

## 9. Parallel Agent Strategy

Each module is fully independent once shared infrastructure exists. Build in two waves:

**Wave 1 — Foundation (sequential, single agent):**
- `index.html` hub
- `shared/` (glossary-data.js, glossary-tooltip.js, auto-start.js, theme.css)
- `fetch_data.py` + `serve.py`
- First module (`2023_mrna.html`) as template/reference

**Wave 2 — Modules (9 agents in parallel, each owns one module):**
- Each agent reads the completed `2023_mrna.html` as the template
- Each agent receives its topic data, molecule list, and visualization spec
- All 9 modules built simultaneously

---

## 10. Content Standards (enforced across all modules)

- **No undergraduate-level explanations**: assume familiarity with central dogma, cell biology, basic genetics
- **Graduate-level baseline**: explain the mechanistic details, regulatory logic, and experimental evidence
- **Research frontier**: each module has a Frontiers tab focused on 2024–2026 developments
- **Tooltip level**: all technical terms use `[grad]` or `[res]` or `[frontier]` badges — never `[ug]`
- **Visualization over text**: every concept that can be animated or diagrammed, should be
- **NIH provenance**: all molecular data links back to PubChem/PDB/PubMed sources
- **Pharmaceutical/biotech angle**: always include drug development, clinical translation, or engineering application sections
