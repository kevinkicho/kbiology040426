// auto-start.js — auto-start animations on page load and tab switch
// Works by finding the first "start animation" button in the active panel and clicking it.
// Also includes a watchdog that detects stalled animations and restarts them.
// Injected into every module; safe to run on any module page.

// ── Global animation speed (0.1–1.0). Set by speed slider; read by rAF scaler.
window.animSpeed = parseFloat(sessionStorage.getItem('ktour-speed') || '1');

// ── rAF timestamp scaler ──────────────────────────────────────────────────────
// Replaces requestAnimationFrame so canvas animations respect window.animSpeed.
// Modules compute deltaTime = (t - lastT); scaling t scales their effective speed.
(function () {
  const _origRAF = window.requestAnimationFrame.bind(window);
  let _vt = null, _rt = null;
  window.requestAnimationFrame = function (cb) {
    return _origRAF(function (realNow) {
      if (_rt === null) { _rt = realNow; _vt = realNow; }
      _vt += (realNow - _rt) * (window.animSpeed !== undefined ? window.animSpeed : 1.0);
      _rt = realNow;
      cb(_vt);
    });
  };
  // Exposed so the speed slider can reset the real-time anchor after a speed change,
  // preventing a large pending delta from the interval between slider moves.
  window._rafReset = function () { _rt = null; };
})();

(function () {
  'use strict';

  // Text patterns that indicate a "start" button
  const START_RE = /^(▶|▸|▷|►|\u25b6|\u25ba)|\b(animate|start|begin|play|run\s+sim|launch|show\s+anim)/i;
  // Text patterns to SKIP (buttons that would do the wrong thing)
  const SKIP_RE  = /stop|pause|reset|slow|fast|cool|heat|clear|undo|reverse|toggle|sweep|loop|tour/i;

  // 1×1 scratch canvas owned by auto-start — always has willReadFrequently.
  // Reading pixels from a foreign canvas via drawImage avoids inheriting its
  // context options (which are locked at first creation and can't be changed).
  const _scratch = document.createElement('canvas');
  _scratch.width = _scratch.height = 1;
  const _scratchCtx = _scratch.getContext('2d', { willReadFrequently: true });

  /** Sample one pixel from sourceCanvas at (x, y) without touching its context. */
  function _samplePixel(sourceCanvas, x, y) {
    _scratchCtx.clearRect(0, 0, 1, 1);
    _scratchCtx.drawImage(sourceCanvas, x, y, 1, 1, 0, 0, 1, 1);
    return _scratchCtx.getImageData(0, 0, 1, 1).data;
  }

  /** Check if any visible canvas in root already has non-background content. */
  function canvasIsLive(root) {
    const cvs = Array.from((root || document.body).querySelectorAll('canvas'))
      .filter(c => c.offsetParent !== null && c.width > 0 && c.height > 0);
    for (const cv of cvs) {
      try {
        const w = cv.width, h = cv.height;
        const mid  = _samplePixel(cv, Math.floor(w / 2), Math.floor(h / 2));
        const edge = _samplePixel(cv, Math.floor(w * 0.1), Math.floor(h * 0.1));
        // If more than 2 distinct pixel colors exist → content is drawn
        if (mid[0] !== edge[0] || mid[1] !== edge[1] || mid[2] !== edge[2]) return true;
      } catch { /* tainted cross-origin canvas — skip */ }
    }
    return false;
  }

  /**
   * Take a compact fingerprint of the active canvas (4 corner pixels + center).
   * Returns null if no usable canvas is found.
   */
  function canvasFingerprint(root) {
    const cv = Array.from((root || document.body).querySelectorAll('canvas'))
      .find(c => c.offsetParent !== null && c.width > 0 && c.height > 0);
    if (!cv) return null;
    try {
      const w = cv.width, h = cv.height;
      const pts = [
        [Math.floor(w * 0.1), Math.floor(h * 0.1)],
        [Math.floor(w * 0.9), Math.floor(h * 0.1)],
        [Math.floor(w * 0.5), Math.floor(h * 0.5)],
        [Math.floor(w * 0.1), Math.floor(h * 0.9)],
        [Math.floor(w * 0.9), Math.floor(h * 0.9)],
      ];
      return pts.map(([x, y]) => {
        const d = _samplePixel(cv, x, y);
        return `${d[0]},${d[1]},${d[2]},${d[3]}`;
      }).join('|');
    } catch { return null; }
  }

  /**
   * Find and click the best "start animation" button within `root`.
   * Returns true if a button was clicked.
   */
  function autoStart(root) {
    if (!root) return false;
    const buttons = Array.from(root.querySelectorAll('button'));
    for (const btn of buttons) {
      const text = btn.textContent.trim();
      if (!START_RE.test(text)) continue;
      if (SKIP_RE.test(text))  continue;
      if (!btn.offsetParent)   continue; // hidden
      // Skip if already in "active/running" state
      if (btn.classList.contains('active')) continue;
      // Skip if the button itself contains a stop/pause symbol (already running variant)
      if (/⏸|pause|stop/i.test(text)) continue;

      btn.click();
      return true;
    }
    // No start button found — only skip if canvas already has content
    if (canvasIsLive(root)) return false;
    return false;
  }

  /** Find the currently visible panel / workspace. */
  function activePanel() {
    // Try common active panel selectors used across modules
    const tries = [
      '.workspace:not([style*="display: none"])',
      '.panel.active',
      '.pane.active',
      '.tab-pane.active',
      '#panel0',
      '[id^="panel"]:not([style*="display: none"])',
      '[id^="tab-content"]:not([style*="display: none"])',
      'main',
    ];
    for (const sel of tries) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el;
    }
    return document.body;
  }

  // ── Public API — lets tour.js and other scripts trigger animation ────────────
  window._kanim = {
    start: function () { return autoStart(activePanel()); },
    panel: activePanel,
  };

  // ── Animate button UI ─────────────────────────────────────────────────────────
  function injectAnimateButton() {
    const tabBar = document.querySelector('.tabs');
    if (!tabBar || document.getElementById('kanim-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'kanim-btn';
    btn.textContent = '▶ Animate';
    btn.title = 'Replay animation';
    btn.style.cssText =
      'background:#0a1a1a;color:var(--cyan,#00f5ff);' +
      'border:1px solid rgba(0,245,255,0.35);border-radius:4px;' +
      'padding:3px 11px;font-size:.74rem;cursor:pointer;' +
      'flex-shrink:0;margin-right:6px;align-self:center';
    btn.addEventListener('click', function () {
      autoStart(activePanel());
    });

    // Insert before speed control (or append if absent)
    const speedCtrl = document.getElementById('ktour-speed-ctrl');
    if (speedCtrl) {
      tabBar.insertBefore(btn, speedCtrl);
    } else {
      tabBar.appendChild(btn);
    }
  }

  // ── Speed control UI ─────────────────────────────────────────────────────────
  function injectSpeedControl() {
    const tabBar = document.querySelector('.tabs');
    if (!tabBar || document.getElementById('ktour-speed-ctrl')) return;

    const ctrl   = document.createElement('div');
    const slider = document.createElement('input');
    const label  = document.createElement('span');
    const lbl    = document.createElement('span');

    ctrl.id = 'ktour-speed-ctrl';
    ctrl.style.cssText =
      'margin-left:auto;display:flex;align-items:center;gap:7px;' +
      'font-family:monospace;font-size:.74rem;color:var(--cyan,#00f5ff);' +
      'padding:0 10px;flex-shrink:0';

    lbl.textContent = 'speed';
    lbl.style.cssText = 'opacity:.6;font-size:.72rem';

    slider.id   = 'ktour-speed-slider';
    slider.type = 'range';
    slider.min  = '0.1';
    slider.max  = '1';
    slider.step = '0.05';
    slider.value = String(window.animSpeed);
    slider.style.cssText = 'width:64px;accent-color:var(--cyan,#00f5ff)';

    label.id = 'ktour-speed-val';
    label.style.cssText = 'min-width:32px;text-align:right';
    label.textContent = window.animSpeed.toFixed(1) + '\xd7';

    ctrl.appendChild(lbl);
    ctrl.appendChild(slider);
    ctrl.appendChild(label);
    tabBar.appendChild(ctrl);

    slider.addEventListener('input', function () {
      window.animSpeed = parseFloat(slider.value);
      window._rafReset && window._rafReset();
      label.textContent = window.animSpeed.toFixed(1) + '\xd7';
      sessionStorage.setItem('ktour-speed', String(window.animSpeed));
    });
  }

  // ── Tour script loader ────────────────────────────────────────────────────────
  function loadTourScripts() {
    var base = '';
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src.indexOf('auto-start.js') !== -1) {
        var _u = new URL(scripts[i].src);
        base = _u.href.slice(0, _u.href.lastIndexOf('/') + 1);
        break;
      }
    }

    function inject(src, onload) {
      if (document.querySelector('script[src*="' + src + '"]')) {
        if (onload) onload();
        return;
      }
      var s = document.createElement('script');
      s.src = base + src;
      if (onload) s.onload = onload;
      document.head.appendChild(s);
    }

    inject('tour-data.js', function () { inject('tour.js'); });
  }

  // ── Prev / Next module navigation bar ────────────────────────────────────
  const MODULE_LIST = [
    '01_complex_explorer.html','02_penrose_tiling.html','03_mandelbrot.html',
    '04_hyperbolic.html','05_fourier.html','06_complex_calculus.html',
    '07_spinors_lie.html','08_spacetime.html','09_quantum.html',
    '10_lagrangian.html','11_dirac.html','12_gauge_theory.html',
    '13_cosmology.html','14_diff_geometry.html','15_quaternions.html',
    '16_diff_forms.html','17_fiber_bundles.html','18_infinity.html',
    '19_general_relativity.html','20_thermodynamics.html',
    '21_quantum_measurement.html','22_path_integrals.html',
    '23_twistor_theory.html','24_loop_quantum_gravity.html',
    '25_higgs_field.html','25_string_theory.html','26_number_systems.html',
    '27_visual_calculus.html','28_ccc_or.html','29_symplectic.html',
    '30_spinor_calculus.html','31_instantons.html','32_representation_theory.html',
    '33_cohomology.html','34_riemann_zeta.html','35_black_holes.html',
    '36_riemann_surfaces.html','37_maxwell.html','38_standard_model.html',
    '39_quantum_field_theory.html','40_chaos.html','41_homotopy.html',
    '42_clifford_algebras.html','43_conformal_field_theory.html','44_twistors.html',
    '45_bell_theorem.html','46_gravitational_waves.html','47_quantum_optics.html',
    '48_topological_matter.html','49_quantum_networks.html',
    '50_semiconductor_quantum.html','51_photonics_fiber.html',
    '52_category_theory.html','53_attosecond.html','54_trapped_ions.html',
    '55_neutrino_oscillations.html','56_muon_g2.html','57_nuclear_fusion.html',
    '58_dark_energy.html','59_spin_glasses.html','60_penrose_singularity.html',
  ];

  function injectNavBar() {
    const filename = location.pathname.split('/').filter(Boolean).pop() || '';
    const idx = MODULE_LIST.indexOf(filename);
    if (idx === -1) return; // not a module page

    const prev = idx > 0 ? MODULE_LIST[idx - 1] : null;
    const next = idx < MODULE_LIST.length - 1 ? MODULE_LIST[idx + 1] : null;

    const label = f => f.replace(/\.html$/, '').replace(/_/g, ' ')
      .replace(/^(\d+)\s/, (_, n) => n.padStart(2, '0') + ' ');

    const bar = document.createElement('div');
    bar.id = 'kmod-nav';
    bar.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;z-index:800;' +
      'display:flex;align-items:center;justify-content:space-between;' +
      'padding:0 16px;height:38px;' +
      'background:rgba(5,5,15,0.92);backdrop-filter:blur(8px);' +
      'border-top:1px solid #1c1c44;font-size:.72rem;font-family:inherit;';

    function makeLink(file, dir) {
      const a = document.createElement('a');
      a.href = '/' + file;
      a.style.cssText =
        'color:#55558a;text-decoration:none;display:flex;align-items:center;' +
        'gap:6px;padding:6px 10px;border-radius:4px;transition:.15s;' +
        'max-width:38%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
      a.onmouseover = () => { a.style.color = '#00e5ff'; a.style.background = 'rgba(0,229,255,.06)'; };
      a.onmouseout  = () => { a.style.color = '#55558a'; a.style.background = ''; };
      const arrow = document.createElement('span');
      arrow.textContent = dir === 'prev' ? '←' : '→';
      arrow.style.flexShrink = '0';
      const txt = document.createElement('span');
      txt.textContent = label(file);
      txt.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      if (dir === 'prev') { a.appendChild(arrow); a.appendChild(txt); }
      else                { a.appendChild(txt);   a.appendChild(arrow); }
      return a;
    }

    const homeLink = document.createElement('a');
    homeLink.href = '/';
    homeLink.style.cssText =
      'color:#33334a;text-decoration:none;font-size:.65rem;letter-spacing:.06em;' +
      'text-transform:uppercase;padding:4px 8px;border-radius:3px;transition:.15s;flex-shrink:0;';
    homeLink.textContent = '⌂ Home';
    homeLink.onmouseover = () => { homeLink.style.color = '#00e5ff'; };
    homeLink.onmouseout  = () => { homeLink.style.color = '#33334a'; };

    bar.appendChild(prev ? makeLink(prev, 'prev') : document.createElement('span'));
    bar.appendChild(homeLink);
    bar.appendChild(next ? makeLink(next, 'next') : document.createElement('span'));

    document.body.appendChild(bar);

    // Add bottom padding so the nav bar doesn't cover content
    document.body.style.paddingBottom = '38px';
  }

  /** Run auto-start once canvas is sized (after layout). */
  function triggerAutoStart() {
    injectNavBar();
    injectSpeedControl();
    injectAnimateButton();
    loadTourScripts();
    setTimeout(() => {
      autoStart(activePanel());
    }, 420); // 420ms: enough for layout + first RAF frame
  }

  // ── Auto-start on page load ─────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', triggerAutoStart);
  } else {
    triggerAutoStart();
  }

  // ── Auto-start on tab switch ────────────────────────────────────────────
  // Listen for clicks on tab buttons, then find & start the animation in
  // the newly visible panel after it renders.
  document.addEventListener('click', function (e) {
    // Only react to tab-style buttons
    const tabBtn = e.target.closest('.tab, .tab-btn, [role="tab"], .tab-button');
    if (!tabBtn) return;

    // Give the tab-switch handler time to show the new panel
    setTimeout(() => {
      autoStart(activePanel());
    }, 380);
  }, true); // capture phase so we run after the tab handler

  // ── Animation watchdog — detects stalled loops and restarts them ────────
  // Checks every 12 seconds whether the active canvas has changed.
  // If it looks frozen for 2 consecutive checks (~24 s), tries to restart.
  let lastFp = null;
  let frozenCount = 0;

  function watchdogTick() {
    const panel = activePanel();
    const fp = canvasFingerprint(panel);

    if (fp === null) {
      // No drawable canvas visible — reset and wait
      lastFp = null;
      frozenCount = 0;
      return;
    }

    if (fp === lastFp) {
      frozenCount++;
      if (frozenCount >= 2) {
        // Canvas has been identical for ~24s — try to restart
        frozenCount = 0;
        lastFp = null;
        // First, try clicking a start button
        if (!autoStart(panel)) {
          // If no start button found, try clicking any active tab to force a re-init
          const activeTab = document.querySelector('.tab.active, .tab-btn.active, [role="tab"][aria-selected="true"]');
          if (activeTab) activeTab.click();
        }
      }
    } else {
      // Canvas changed — animation is alive, reset counter
      frozenCount = 0;
      lastFp = fp;
    }
  }

  // Start watchdog after initial load delay, then run on interval
  setTimeout(() => {
    lastFp = canvasFingerprint(activePanel());
    setInterval(watchdogTick, 12000);
  }, 5000); // wait 5s for initial animations to settle before first snapshot

})();
