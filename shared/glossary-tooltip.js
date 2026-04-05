// glossary-tooltip.js — global term tooltips for kbiology modules
// Requires glossary-data.js (window.GLOSS) to be loaded first.
// GLOSS format: {termKey: {term, level, def}}
(function () {
  'use strict';

  if (location.pathname.replace(/\\/g, '/').endsWith('glossary.html')) return;

  // ── CSS ──────────────────────────────────────────────────────────────────────
  const CSS = [
    // term underline
    '.gtip{border-bottom:1px dashed rgba(0,229,255,.45);cursor:help;color:inherit;white-space:nowrap}',
    '.gtip:hover{color:#00e5ff;border-bottom-color:#00e5ff}',
    // popup shell — overflow:hidden clips the charge bar to rounded corners
    '#gtip-popup{',
      'display:none;position:fixed;z-index:99999;',
      'max-width:290px;min-width:180px;',
      'background:#0b0b1e;border:1px solid #1c1c44;border-radius:9px;',
      'padding:14px 13px 10px;',   // extra top padding for charge bar
      'box-shadow:0 8px 40px rgba(0,0,0,.8);',
      'font-family:"Segoe UI",system-ui,sans-serif;',
      'font-size:11.5px;line-height:1.55;color:#c0c0ea;',
      'pointer-events:none;overflow:hidden;}',
    '#gtip-popup.vis{display:block}',
    // charge bar (Warhammer-style top-border fill)
    '#gtip-popup .tp-bar{',
      'position:absolute;top:0;left:0;',
      'height:2px;width:0%;',
      'background:linear-gradient(90deg,#00e5ff 0%,#ffd700 55%,#ff88cc 100%);',
      'box-shadow:0 0 8px rgba(0,229,255,.7),0 0 14px rgba(255,215,0,.35);',
      'opacity:0;border-radius:9px 9px 0 0;',
      'pointer-events:none;}',
    // counting state: animate bar — Change C: 5s
    '#gtip-popup.counting .tp-bar{opacity:1;animation:gtip-charge 5s linear forwards}',
    // pinned state: bar full, bright; popup border lit; pointer-events on
    '#gtip-popup.pinned .tp-bar{opacity:1;width:100%;animation:none;',
      'background:#00e5ff;box-shadow:0 0 16px rgba(0,229,255,.95);}',
    '#gtip-popup.pinned{pointer-events:auto;border-color:rgba(0,229,255,.55);',
      'box-shadow:0 8px 40px rgba(0,0,0,.8),0 0 24px rgba(0,229,255,.12);}',
    '@keyframes gtip-charge{from{width:0%}to{width:100%}}',
    // close button (appears only when pinned)
    '#gtip-popup .tp-close{',
      'display:none;position:absolute;top:5px;right:8px;',
      'width:16px;height:16px;',
      'background:none;border:none;color:#44446a;cursor:pointer;',
      'font-size:13px;line-height:1;padding:0;font-family:inherit;',
      'align-items:center;justify-content:center;}',
    '#gtip-popup.pinned .tp-close{display:flex;}',
    '#gtip-popup .tp-close:hover{color:#c0c0ea}',
    // content
    '#gtip-popup .tp-title{font-size:12.5px;font-weight:700;color:#e8e8ff;',
      'margin-bottom:4px;display:flex;align-items:center;gap:6px;}',
    '#gtip-popup .tp-badge{font-size:8.5px;font-weight:700;letter-spacing:.07em;',
      'text-transform:uppercase;padding:1px 5px;border-radius:3px;flex-shrink:0}',
    '#gtip-popup .tp-badge.ug{background:#00ff9914;color:#00ff99;border:1px solid #00ff9928}',
    '#gtip-popup .tp-badge.grad{background:#ffd70014;color:#ffd700;border:1px solid #ffd70028}',
    '#gtip-popup .tp-badge.res{background:#ff44ff14;color:#ff44ff;border:1px solid #ff44ff28}',
    // Change D: frontier badge
    '#gtip-popup .tp-badge.frontier{background:#ff448814;color:#ff4488;border:1px solid #ff448828}',
    '#gtip-popup .tp-def{color:#8888b0;margin-bottom:7px}',
    '#gtip-popup .tp-link{color:#00e5ff;text-decoration:none;font-size:10.5px}',
    '#gtip-popup .tp-link:hover{text-decoration:underline}',
    '#gtip-popup .tp-hint{font-size:9px;color:#33335a;margin-top:6px;',
      'transition:opacity .3s}',
    '#gtip-popup.counting .tp-hint{opacity:0}',
    '#gtip-popup.pinned .tp-hint{display:none}',
  ].join('');

  // ── SKIP TAGS ────────────────────────────────────────────────────────────────
  const SKIP = new Set([
    'SCRIPT','STYLE','CANVAS','SVG','INPUT','TEXTAREA','SELECT',
    'CODE','PRE','MATH','KBD','BUTTON'
  ]);

  function mk(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  // Change E: see-also helper
  function seeAlsoTerms(text) {
    const G = window.GLOSS || {};
    const lower = text.toLowerCase().trim();
    return Object.keys(G).filter(k => {
      const kl = k.toLowerCase();
      return kl !== lower && lower.includes(kl) && kl.length > 3;
    }).map(k => ({ key: k, entry: G[k] }));
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────
  function init() {
    const GLOSS = window.GLOSS;
    // Change A: kbiology object format
    if (!GLOSS || typeof GLOSS !== 'object' || !Object.keys(GLOSS).length) return;

    // GLOSS is {termKey: {term, level, def}} — convert to Maps
    const byKey      = new Map(Object.entries(GLOSS).map(([k, v]) => [k, {...v, key:k}]));
    const titleToKey = new Map();
    Object.entries(GLOSS).forEach(([k, v]) => {
      titleToKey.set((v.term || k).toLowerCase(), k);
      // Also index the key itself (for data-gloss lookups)
      titleToKey.set(k.toLowerCase(), k);
    });

    const terms = [...titleToKey.keys()]
      .filter(t => t.length >= 3)
      .sort((a, b) => b.length - a.length);

    if (!terms.length) return;

    const escaped  = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const reSource = '(?<![\\w\\-])(' + escaped.join('|') + ')(?![\\w\\-])';
    const re       = new RegExp(reSource, 'gi');

    // ── Inject CSS ────────────────────────────────────────────────────────────
    const style = mk('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // ── Build popup (safe DOM only) ───────────────────────────────────────────
    const popup  = mk('div'); popup.id = 'gtip-popup';

    // Charge bar
    const bar = mk('div', 'tp-bar');
    popup.appendChild(bar);

    // Close button (×)
    const closeBtn = mk('button', 'tp-close');
    closeBtn.textContent = '\u00d7';
    closeBtn.setAttribute('aria-label', 'Close');
    popup.appendChild(closeBtn);

    // Content
    const titleRow = mk('div', 'tp-title');
    const pName    = mk('span', 'tp-name');
    const pBadge   = mk('span', 'tp-badge');
    titleRow.appendChild(pName);
    titleRow.appendChild(pBadge);

    const pDef  = mk('div', 'tp-def');
    const pLink = mk('a',   'tp-link');
    pLink.textContent = 'Full entry in Glossary \u2192';

    const pHint = mk('div', 'tp-hint');
    pHint.textContent = 'Hold 5s to pin';

    popup.appendChild(titleRow);
    popup.appendChild(pDef);
    popup.appendChild(pLink);
    popup.appendChild(pHint);
    document.body.appendChild(popup);

    // ── Pin state ─────────────────────────────────────────────────────────────
    let pinTimer    = null;
    let isPinned    = false;
    let currentSpan = null;

    function startCounting(span) {
      // Cancel any existing countdown
      if (pinTimer) { clearTimeout(pinTimer); pinTimer = null; }

      // Reset animation by removing counting class, forcing reflow, re-adding
      popup.classList.remove('counting', 'pinned');
      isPinned = false;
      bar.offsetWidth; // force reflow to restart animation

      currentSpan = span;
      updateContent(span);
      popup.classList.add('vis', 'counting');
      positionPopup(span);

      // Change C: 5000ms pin timeout
      pinTimer = setTimeout(() => {
        pinTimer = null;
        popup.classList.remove('counting');
        popup.classList.add('pinned');
        isPinned = true;
      }, 5000);
    }

    function unpin() {
      if (pinTimer) { clearTimeout(pinTimer); pinTimer = null; }
      popup.classList.remove('vis', 'counting', 'pinned');
      isPinned    = false;
      currentSpan = null;
    }

    function updateContent(span) {
      const key = span.dataset.gkey;
      const g = byKey.get(key);
      if (!g) return;
      // Change B: use term instead of title
      pName.textContent  = g.term || g.title || key;
      pBadge.textContent = (g.level || 'grad').toUpperCase();
      pBadge.className   = 'tp-badge ' + (g.level || 'grad');
      pDef.textContent   = g.def ? (g.def.length > 200 ? g.def.slice(0, 200) + '\u2026' : g.def) : '';
      pLink.href         = 'glossary.html#g-' + key;

      // Change E: remove any previous see-also section
      const prevAlso = popup.querySelector('.tp-also');
      if (prevAlso) prevAlso.parentNode.removeChild(prevAlso);

      // Add see-also if sub-terms exist
      const hoverText = g.term || g.title || key;
      const alsoTerms = seeAlsoTerms(hoverText);
      if (alsoTerms.length > 0) {
        const alsoDiv = document.createElement('div');
        alsoDiv.className = 'tp-also';
        alsoDiv.style.cssText = 'margin-top:6px;font-size:10px;color:#44447a;border-top:1px solid #1c1c44;padding-top:5px';
        alsoDiv.appendChild(document.createTextNode('See also: '));
        alsoTerms.forEach((t, i) => {
          if (i > 0) alsoDiv.appendChild(document.createTextNode(', '));
          const link = document.createElement('span');
          link.style.cssText = 'color:#00e5ff;cursor:pointer;text-decoration:underline';
          link.textContent = (t.entry && (t.entry.term || t.entry.title)) || t.key;
          alsoDiv.appendChild(link);
        });
        popup.appendChild(alsoDiv);
      }
    }

    function positionPopup(span) {
      const r   = span.getBoundingClientRect();
      const pw  = 290, ph = 130;
      let left  = r.left;
      let top   = r.top - ph - 10;
      if (top < 8)                            top  = r.bottom + 8;
      if (left + pw > window.innerWidth - 8)  left = window.innerWidth - pw - 8;
      if (left < 8)                           left = 8;
      popup.style.left = left + 'px';
      popup.style.top  = top  + 'px';
    }

    // ── Event listeners ───────────────────────────────────────────────────────
    document.body.addEventListener('mouseover', e => {
      const span = e.target.closest('.gtip');
      if (!span) return;
      if (span === currentSpan) return; // same span, ignore
      startCounting(span);
    });

    document.body.addEventListener('mouseout', e => {
      if (isPinned) return; // pinned → ignore mouse-outs
      const leaving = e.target.closest('.gtip');
      if (!leaving) return;
      const to = e.relatedTarget;
      if (to && leaving.contains(to)) return; // still inside
      // Moving to popup itself is ok (won't happen since pointer-events:none unless pinned)
      if (pinTimer) { clearTimeout(pinTimer); pinTimer = null; }
      popup.classList.remove('vis', 'counting');
      currentSpan = null;
    });

    // Click anywhere outside pinned popup → unpin
    document.addEventListener('click', e => {
      if (!isPinned) return;
      if (popup.contains(e.target)) return;
      if (e.target.closest('.gtip')) return;
      unpin();
    });

    // Close button
    closeBtn.addEventListener('click', e => {
      e.stopPropagation();
      unpin();
    });

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && (isPinned || popup.classList.contains('vis'))) unpin();
    });

    // ── Text scanner ──────────────────────────────────────────────────────────
    function shouldSkip(el, root) {
      let cur = el;
      while (cur && cur !== root) {
        if (SKIP.has(cur.tagName)) return true;
        const cl = cur.classList;
        if (cl.contains('gtip') || cl.contains('katex') || cl.contains('katex-html')) return true;
        if (cur.hasAttribute('data-nogloss')) return true;
        cur = cur.parentElement;
      }
      return false;
    }

    function scanNode(root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const hits   = [];
      let node;
      while ((node = walker.nextNode()) && hits.length < 120) { // cap at 120 nodes
        const text = node.textContent;
        if (text.trim().length < 4) continue;
        if (text.length > 800) continue; // skip large blobs
        if (!re.test(text)) { re.lastIndex = 0; continue; }
        re.lastIndex = 0;
        if (shouldSkip(node.parentElement, root)) continue;
        hits.push(node);
      }

      let totalWraps = 0;
      hits.forEach(textNode => {
        if (totalWraps > 250) return; // global cap — prevent DOM explosion
        const text    = textNode.textContent;
        const frag    = document.createDocumentFragment();
        const matchRe = new RegExp(reSource, 'gi');
        let last = 0;

        Array.from(text.matchAll(matchRe)).forEach(m => {
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          const key = titleToKey.get(m[0].toLowerCase());
          if (key) {
            const span = mk('span', 'gtip');
            span.dataset.gkey = key;
            span.textContent  = m[0];
            frag.appendChild(span);
            totalWraps++;
          } else {
            frag.appendChild(document.createTextNode(m[0]));
          }
          last = m.index + m[0].length;
        });

        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        textNode.parentNode.replaceChild(frag, textNode);
      });
    }

    // Allow a page to opt out of scanning entirely via <body data-nogloss>
    if (!document.body.hasAttribute('data-nogloss')) {
      // Use idle callback so the scanner doesn't block animation frames;
      // fall back to setTimeout in browsers without requestIdleCallback.
      const schedule = window.requestIdleCallback
        ? cb => requestIdleCallback(cb, { timeout: 2000 })
        : cb => setTimeout(cb, 800);
      schedule(() => scanNode(document.body));
    }

    // Change F: wire up explicit data-gloss attributes (e.g., molecule modal property labels)
    function wireDataGloss(root) {
      root.querySelectorAll('[data-gloss]').forEach(el => {
        if (el.classList.contains('gtip')) return; // already wired
        el.classList.add('gtip');
        el.dataset.gkey = el.dataset.gloss;
      });
    }
    wireDataGloss(document.body);
    // Observe future DOM additions (e.g., molecule modal opens)
    const obs = new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1) wireDataGloss(n);
      }));
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();
