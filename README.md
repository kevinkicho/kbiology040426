# kbiology Nobel Frontier

An interactive biology education platform exploring 10 Nobel Prize-winning discoveries in Physiology or Medicine (2015–2024). Each module features rich animated mechanism visualizations, curated scientific content, molecular data, and research frontiers.

**Live site:** [kevinkicho.github.io/kbiology040426](https://kevinkicho.github.io/kbiology040426) *(if GitHub Pages enabled)*  
**Local dev:** `python serve.py` → [http://localhost:8090](http://localhost:8090)

---

## Modules

| Year | Discovery | Laureate(s) |
|------|-----------|-------------|
| 2015 | Avermectin & Artemisinin | Campbell, Ōmura, Tu |
| 2016 | Autophagy | Ohsumi |
| 2017 | Circadian Clock | Hall, Rosbash, Young |
| 2018 | Cancer Immunotherapy (CTLA-4/PD-1) | Allison, Honjo |
| 2019 | HIF & Oxygen Sensing | Kaelin, Ratcliffe, Semenza |
| 2020 | Hepatitis C Virus | Alter, Houghton, Rice |
| 2021 | TRP Channels — Thermosensation & Mechanosensation | Julius, Patapoutian |
| 2022 | Paleogenomics — Ancient DNA | Pääbo |
| 2023 | mRNA Vaccine Technology | Karikó, Weissman |
| 2024 | microRNA & Gene Regulation | Ambros, Ruvkun |

---

## Features

### Mechanism Animations
Every module has a 5-phase canvas animation telling the biological story:
- **Lipid bilayer cross-sections** with embedded protein structures
- **Directed particle flows** — ions, molecules, radicals — with glow effects
- **State-responsive annotations** that appear as biological events progress
- **Nested cellular context** (RBC → parasite → vacuole; nucleus → cytoplasm; etc.)

### Visualization UI
- **Theater mode** — press `⛶` or `T` to expand the canvas full-screen (~1.5× scale)
- **Phase dot navigation** — click numbered dots to jump between animation phases
- **Keyboard shortcuts**: `Space` play/pause, `←`/`→` switch phases, `Esc` exit theater
- **420px canvas height** with cyan hover-glow border

### Content
Each module includes:
- **Mechanism tab** — animated canvas + 5 expandable phase explanation panels
- **Story tab** — chronological discovery narrative
- **Molecules tab** — key molecular players with PDB/PubChem links
- **Frontiers tab** — current research directions and open questions
- **Connections tab** — interactive graph linking related Nobel discoveries
- **Glossary tooltips** — hover any underlined term for inline definition
- **NIH/PubMed data** — live-fetched landmark papers (via `fetch_data.py`)

---

## Project Structure

```
kbiology040426/
├── index.html              # Hub page — 10 module cards
├── serve.py                # Local dev server (port 8090)
├── fetch_data.py           # NIH PubMed data fetcher
├── data/                   # Fetched paper/citation data
├── docs/                   # Design specs
├── modules/
│   ├── 2015_antiparasitic.html
│   ├── 2016_autophagy.html
│   ├── 2017_circadian.html
│   ├── 2018_immunotherapy.html
│   ├── 2019_hif_oxygen.html
│   ├── 2020_hepatitis_c.html
│   ├── 2021_trp_channels.html
│   ├── 2022_paleogenomics.html
│   ├── 2023_mrna.html
│   └── 2024_microrna.html
└── shared/
    ├── theme.css           # Global design tokens & base styles
    ├── module-layout.css   # Shared module layout (canvas, theater, phase dots)
    ├── mech-theater.js     # Theater mode + keyboard shortcuts + phase navigation
    ├── molecule-modal.css  # Molecule detail modal styles
    ├── molecule-modal.js   # Molecule modal logic
    ├── connections.js      # Nobel connection graph renderer
    ├── glossary-data.js    # Glossary term definitions
    ├── glossary-tooltip.js # Hover tooltip injector
    └── auto-start.js       # Animation auto-start on page load
```

---

## Canvas Animation Architecture

Each module's `mechDraw(phase, t)` function follows a layered painter's algorithm:

1. **Background** — radial/linear gradient setting the biological environment
2. **Membranes** — lipid bilayer drawn with phospholipid heads, tail lines, and hydrophobic core gradient
3. **Proteins** — embedded in membrane using `roundRect` helices, ellipses, and domain shapes
4. **Particles** — ions/molecules as radial-gradient glows moving through the scene
5. **Annotations** — text labels with dark backdrop, appearing conditionally on state thresholds

Shared helpers per module: `label()`, `particle()`, `drawMembrane()`, `drawChannel()`.

Theater mode uses **CSS scaling** (not canvas redraw) — the canvas internal resolution stays fixed while CSS stretches it, making all text and graphics proportionally larger without any drawing code changes.

---

## Local Development

```bash
# Serve locally
python serve.py
# → http://localhost:8090

# Fetch latest NIH paper data
python fetch_data.py
```

No build step required — pure HTML/CSS/JS, zero dependencies.

---

## Tech Stack

- **Vanilla HTML/CSS/JS** — no frameworks, no bundler
- **Canvas 2D API** — all animations drawn with `CanvasRenderingContext2D`
- **CSS custom properties** — design tokens in `shared/theme.css`
- **NIH E-utilities API** — paper metadata via `fetch_data.py`
- **`roundRect` polyfill** — included for cross-browser canvas compatibility
