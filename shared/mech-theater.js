/* mech-theater.js — Theater mode, keyboard shortcuts, phase dot nav
   Auto-initialises on any module page that has #mech-canvas + PHASES */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  /* ── helpers ─────────────────────────────────────────────────── */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) Object.assign(node, props);
    if (props && props.style && typeof props.style === 'object') {
      Object.assign(node.style, props.style);
    }
    (children || []).forEach(c => c && node.appendChild(
      typeof c === 'string' ? document.createTextNode(c) : c
    ));
    return node;
  }
  function cls(node, ...classes) { node.classList.add(...classes); return node; }

  /* ── main ────────────────────────────────────────────────────── */
  function init() {
    const cv      = document.getElementById('mech-canvas');
    const cw      = document.getElementById('canvas-wrap');
    const playBtn = document.getElementById('btn-play');
    const phSlider = document.getElementById('phase-slider');
    const spSlider = document.getElementById('speed-slider');
    const phLabel  = document.getElementById('phase-label');
    if (!cv || !cw) return;

    // Shared phase-dot and theater-bar features depend on a module-scoped
    // `PHASES` array. Guard rails below tolerate its absence, but a missing
    // definition is almost always a bug — surface it so it doesn't go silent.
    if (typeof PHASES === 'undefined') {
      console.warn('[mech-theater] PHASES is undefined — phase dots and theater pips will be skipped for this module.');
    }

    /* ── 1. HUD overlay ───────────────────────────────────────── */
    const vizPhaseName = el('span', { id: 'viz-phase-name', className: 'viz-phase-name' });
    const theaterBtn   = el('button', {
      id: 'btn-theater', className: 'viz-icon-btn',
      title: 'Theater mode  (T)', textContent: '⛶'
    });
    const hudBtns = el('div', { className: 'viz-hud-btns' }, [theaterBtn]);
    const hud     = el('div', { className: 'viz-hud' }, [vizPhaseName, hudBtns]);
    cw.appendChild(hud);

    /* Keep HUD label in sync with sidebar phase label */
    function syncHudLabel() {
      vizPhaseName.textContent = phLabel ? phLabel.textContent : '';
    }
    if (phLabel) {
      new MutationObserver(syncHudLabel)
        .observe(phLabel, { childList: true, characterData: true, subtree: true });
    }
    syncHudLabel();

    /* ── 2. Theater mode ──────────────────────────────────────── */
    let backdrop   = null;
    let theaterBar = null;

    function buildTheaterBar() {
      if (theaterBar) return;

      /* Phase pips row */
      const pipsWrap = el('div', { className: 'phase-pill' });
      if (typeof PHASES !== 'undefined') {
        PHASES.forEach((ph, i) => {
          const pip = el('div', { className: 'phase-pip' + (i === 0 ? ' active' : '') });
          if (i === 0) pip.style.background = ph.color;
          pip.title = ph.label.split('—').slice(1).join('—').trim();
          pip.addEventListener('click', () => switchPhase(i));
          pipsWrap.appendChild(pip);
        });
      }

      const theaterPhaseName = el('span', { className: 'theater-phase-name' });

      /* Speed control clone */
      const spClone = el('input');
      spClone.type = 'range'; spClone.min = 1; spClone.max = 5; spClone.step = 1;
      spClone.value = spSlider ? spSlider.value : 3;
      Object.assign(spClone.style, { width: '70px', accentColor: 'var(--green)' });
      const spVal = el('span', { className: 'speed-val',
        textContent: (spSlider ? spSlider.value : 3) + '\u00d7' });
      spClone.addEventListener('input', () => {
        spVal.textContent = spClone.value + '\u00d7';
        if (spSlider) { spSlider.value = spClone.value; spSlider.dispatchEvent(new Event('input')); }
      });
      if (spSlider) {
        spSlider.addEventListener('input', () => {
          spClone.value = spSlider.value;
          spVal.textContent = spSlider.value + '\u00d7';
        });
      }
      const speedLbl = el('span', { className: 'muted-txt', textContent: 'Speed' });
      Object.assign(speedLbl.style, { fontSize: '.68rem', color: 'var(--muted)' });
      const speedGrp = el('div', { className: 'speed-grp' }, [speedLbl, spClone, spVal]);

      const exitBtn = el('button', {
        className: 'viz-icon-btn',
        title: 'Exit theater (Esc or T)',
        textContent: '\u22a0'
      });
      Object.assign(exitBtn.style, { fontSize: '1rem' });
      exitBtn.addEventListener('click', exitTheater);

      const kbHint = el('span', { className: 'kbd-hint', textContent: 'Esc' });

      theaterBar = el('div', { className: 'viz-theater-bar' },
        [pipsWrap, theaterPhaseName, speedGrp, exitBtn, kbHint]);
      cw.appendChild(theaterBar);

      /* Sync theater bar with phase changes */
      function syncTheaterPhase() {
        theaterPhaseName.textContent = phLabel ? phLabel.textContent : '';
        if (typeof PHASES === 'undefined') return;
        const cur = typeof animPhase !== 'undefined' ? animPhase : 0;
        theaterBar.querySelectorAll('.phase-pip').forEach((pip, j) => {
          pip.classList.toggle('active', j === cur);
          pip.style.background = j <= cur ? PHASES[j].color : '';
        });
      }
      if (phLabel) {
        new MutationObserver(syncTheaterPhase)
          .observe(phLabel, { childList: true, characterData: true, subtree: true });
      }
      syncTheaterPhase();
    }

    function enterTheater() {
      buildTheaterBar();
      backdrop = el('div', { className: 'theater-backdrop' });
      backdrop.addEventListener('click', exitTheater);
      document.body.appendChild(backdrop);
      document.body.style.overflow = 'hidden';
      cw.classList.add('theater-mode');
      theaterBtn.textContent = '\u22a0';
      theaterBtn.title = 'Exit theater (Esc)';
      // CSS handles the visual scale-up — no redraw needed,
      // which preserves text sizes and content legibility.
    }

    function exitTheater() {
      if (backdrop) { backdrop.remove(); backdrop = null; }
      document.body.style.overflow = '';
      cw.classList.remove('theater-mode');
      theaterBtn.textContent = '\u26f6';
      theaterBtn.title = 'Theater mode (T)';
    }

    function toggleTheater() {
      cw.classList.contains('theater-mode') ? exitTheater() : enterTheater();
    }

    theaterBtn.addEventListener('click', toggleTheater);

    /* ── 3. Phase dot navigation ──────────────────────────────── */
    if (typeof PHASES !== 'undefined') buildPhaseDots();

    function buildPhaseDots() {
      const nav = el('div', { className: 'phase-nav', id: 'phase-nav' });

      PHASES.forEach((ph, i) => {
        if (i > 0) {
          const fill = el('div', { className: 'phase-connector-fill', id: 'pcf-' + i });
          fill.style.background = ph.color;
          nav.appendChild(el('div', { className: 'phase-connector' }, [fill]));
        }

        const dot = el('div', {
          className: 'phase-dot' + (i === 0 ? ' active' : ''),
          id: 'pd-' + i,
          textContent: String(i)
        });
        if (i === 0) {
          dot.style.borderColor = ph.color;
          dot.style.background  = ph.color;
          dot.style.color       = '#07071e';
        }

        const parts = ph.label.split('\u2014');
        const shortLbl = parts.length > 1
          ? parts[1].trim().split(' ').slice(0, 3).join('\u00a0')
          : 'Phase\u00a0' + i;
        const lbl = el('div', { className: 'phase-dot-label', textContent: shortLbl });

        const wrap = el('div', {
          className: 'phase-dot-wrap' + (i === 0 ? ' active' : ''),
          id: 'pdw-' + i
        }, [dot, lbl]);
        wrap.addEventListener('click', () => switchPhase(i));
        nav.appendChild(wrap);
      });

      cw.parentNode.insertBefore(nav, cw.nextSibling);
    }

    function switchPhase(i) {
      if (phSlider) {
        phSlider.value = i;
        phSlider.dispatchEvent(new Event('input'));
      }
      updateDots(i);
    }

    function updateDots(i) {
      if (typeof PHASES === 'undefined') return;
      PHASES.forEach((ph, j) => {
        const wrap = document.getElementById('pdw-' + j);
        const dot  = document.getElementById('pd-'  + j);
        if (!wrap || !dot) return;
        const isActive = j === i, isPast = j < i;
        wrap.classList.toggle('active', isActive);
        dot.classList.toggle('active', isActive);
        dot.style.borderColor = (isActive || isPast) ? ph.color : '';
        dot.style.background  = isActive ? ph.color : (isPast ? ph.color + '33' : '');
        dot.style.color       = isActive ? '#07071e' : '';
        const fill = document.getElementById('pcf-' + j);
        if (fill) fill.style.width = j <= i ? '100%' : '0%';
      });
    }

    if (phSlider) phSlider.addEventListener('input', () => updateDots(+phSlider.value));

    /* ── 4. Keyboard shortcuts ────────────────────────────────── */
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 't': case 'T': toggleTheater(); break;
        case 'Escape':
          if (cw.classList.contains('theater-mode')) exitTheater(); break;
        case ' ':
          e.preventDefault();
          if (playBtn) playBtn.click();
          break;
        case 'ArrowRight':
          if (phSlider && +phSlider.value < +phSlider.max) switchPhase(+phSlider.value + 1);
          break;
        case 'ArrowLeft':
          if (phSlider && +phSlider.value > 0) switchPhase(+phSlider.value - 1);
          break;
      }
    });
  }
})();
