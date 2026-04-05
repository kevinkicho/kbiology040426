# kbiology — Learning Features Design
**Date:** 2026-04-04
**Status:** Approved
**Project dir:** `C:\Users\kevin\OneDrive\Desktop\kbiology040426\`

---

## 1. Scope

Two independent learning features added to the existing kbiology Nobel Frontier app:

1. **Quiz Mode** — adaptive per-module quiz as a 6th tab in every module
2. **Global Search** — hub search bar upgraded to full-content cross-module search

Comparison view was considered and explicitly dropped: side-by-side Nobel topic comparison inevitably forces shallow introductory-level connections rather than frontier-level depth. The existing Connections tab handles cross-Nobel relationships appropriately.

---

## 2. Architecture

Pure HTML/JS, no build step. Follows existing project pattern.

### New files
```
shared/quiz-engine.js         # Adaptive quiz engine (shared across all 10 modules)
shared/quiz-engine.css        # Quiz tab styles
shared/search-index.js        # Pre-built search index for all 10 modules
```

### Modified files
```
index.html                    # Global search upgrade
modules/2015_antiparasitic.html   # Add Quiz tab + QUIZ_DATA + SEARCH_DATA
modules/2016_autophagy.html
modules/2017_circadian.html
modules/2018_immunotherapy.html
modules/2019_hif_oxygen.html
modules/2020_hepatitis_c.html
modules/2021_trp_channels.html
modules/2022_paleogenomics.html
modules/2023_mrna.html
modules/2024_microrna.html
```

---

## 3. Quiz Mode

### 3.1 Location
A 6th tab `🎯 Quiz` added to every module's header tab row, after the existing Connections tab. Scoped entirely to that module's content — no cross-module questions.

### 3.2 Question Sources (per module)
Each module defines a `QUIZ_DATA` array with questions drawn from 4 sources:

| Source | Example question |
|---|---|
| Glossary terms | "What is the function of PfKelch13 in artemisinin resistance?" |
| Mechanism phases | "In which phase does endosomal escape occur in the mRNA vaccine pathway?" |
| Molecule roles | "What is the mechanism of action of sofosbuvir against NS5B?" |
| Nobel facts | "Which laureate isolated avermectin from Streptomyces avermitilis?" |

Minimum 12 questions per module (3 per source category).

### 3.3 Adaptive Engine (shared/quiz-engine.js)

**Round 1 — Multiple Choice:**
- 4 options per question (1 correct + 3 distractors drawn from same module)
- On correct: green highlight, brief explanation shown, advance
- On wrong: red highlight, correct answer revealed with grad-level explanation, question added to miss queue

**Round 2 — Flashcard Review:**
- Triggered after Round 1 completes if miss queue is non-empty
- Front: term or concept
- Back: full definition/explanation + level badge (grad/res/frontier)
- Self-rating buttons: **Again** · **Got it**
- "Again" re-queues, "Got it" removes from queue
- Round ends when queue is empty

**Completion screen:**
- Score (e.g. "9/12 correct")
- Weak areas list (terms to revisit)
- "Review weak cards" button — re-enters flashcard round with missed items only

### 3.4 Persistence (localStorage)
Key: `kbiology-quiz-{year}` (e.g. `kbiology-quiz-2023`)
Stores: `{ score, total, weakTerms: [], lastPlayed: timestamp }`

Quiz tab shows score badge if previously completed: e.g. `🎯 Quiz  9/12`.

### 3.5 Quiz Tab HTML Structure
```html
<div class="tab-panel" id="panel-quiz">
  <div id="quiz-shell"></div>  <!-- quiz-engine.js renders into this -->
</div>
```

Quiz engine is initialized on tab click:
```javascript
if (tab.dataset.tab === 'quiz') QuizEngine.init('quiz-shell', QUIZ_DATA, m.year);
```

### 3.6 quiz-engine.css
Styles for: `.qz-card`, `.qz-option`, `.qz-option.correct`, `.qz-option.wrong`, `.qz-flash-front`, `.qz-flash-back`, `.qz-score`, `.qz-rating-row`, `.qz-badge`.

Dark theme consistent with `theme.css`. Accent color inherited from module's `--accent` CSS variable.

---

## 4. Global Search

### 4.1 Location
Existing `#search-input` on the hub, currently searches only module titles/years/tags. Upgraded to search all content.

### 4.2 shared/search-index.js
A single JS file that defines `window.SEARCH_INDEX` — an array of entries built from all 10 modules' static data:

```javascript
window.SEARCH_INDEX = [
  { year: 2023, tab: 'glossary',   title: 'N1-Methylpseudouridine (m1Ψ)',   body: 'TLR evasion, translational stability...', file: 'modules/2023_mrna.html' },
  { year: 2023, tab: 'molecules',  title: 'SM-102 (ionizable lipid)',         body: 'pKa ~6.6, endosomal escape...', file: 'modules/2023_mrna.html' },
  { year: 2023, tab: 'frontiers',  title: 'saRNA cancer vaccine pipeline',    body: 'Self-amplifying RNA, 10-fold lower dose...', file: 'modules/2023_mrna.html' },
  // ... ~150 entries total across all 10 modules
];
```

Each entry has: `year`, `tab` (glossary/molecules/mechanisms/frontiers), `title`, `body` (searchable text), `file` (relative path to module).

### 4.3 Search UI Upgrade (index.html)

**Search logic:** On input, filter `SEARCH_INDEX` by matching `title + body` against query (case-insensitive). Group results by tab type. Show top 8 results max.

**Results dropdown:**
- Appears below `#search-input`, `position:absolute`, `z-index:9999`
- Groups: `Glossary`, `Molecules`, `Mechanisms`, `Frontiers` — each with count badge
- Each result row: module year badge + title + body snippet (first 60 chars)
- Click → `window.location.href = entry.file + '#tab=' + entry.tab`
  - Module page reads `location.hash` on load and auto-switches to the correct tab

**When query is empty:** Reverts to existing title/year/tag card filtering behavior (no dropdown).

**Keyboard:** `↓/↑` navigates results, `Enter` opens top result, `Escape` closes dropdown.

### 4.4 Module-side hash handling
Each module adds at the end of its init script:
```javascript
const hash = location.hash.replace('#tab=', '');
if (hash && document.getElementById('panel-' + hash)) {
  document.querySelector('[data-tab="' + hash + '"]')?.click();
}
```

---

## 5. Content Standards

- All quiz questions must be graduate-level — no "what is DNA" questions
- Distractors must be plausible (other molecules/terms from same module, not random)
- Flashcard backs must include mechanism detail, not just a one-line definition
- Search index body text must be substantive enough to match synonyms (e.g. "pseudouridine" matches "m1Ψ" entries)

---

## 6. Build Order

1. `shared/quiz-engine.css` + `shared/quiz-engine.js` (engine first, no module deps)
2. Quiz tab + `QUIZ_DATA` added to `2023_mrna.html` (template/reference)
3. Quiz tab + `QUIZ_DATA` added to remaining 9 modules (can be parallelized)
4. `shared/search-index.js` (generated by a build script `build-search-index.py` that reads each module's `QUIZ_DATA`, `MODULE_MOLS`, and `GLOSS` augmentation block and writes the index as a static JS file)
5. `index.html` global search upgrade
6. Hash-based tab navigation in all 10 modules
