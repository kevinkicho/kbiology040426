// shared/molecule-modal.js — MolModal engine for kbiology
// Public API: MolModal.open(molData), MolModal.close()
// Unified single-scroll layout — no tabs.

(function () {
  'use strict';

  // ── 3Dmol.js lazy loader ─────────────────────────────────────────────────
  let _3dmolReady = false;
  let _3dmolCallbacks = [];
  function ensure3Dmol(cb) {
    if (window.$3Dmol) { cb(); return; }
    _3dmolCallbacks.push(cb);
    if (_3dmolReady) return;
    _3dmolReady = true;
    const s = document.createElement('script');
    s.src = 'https://3dmol.csb.pitt.edu/build/3Dmol-min.js';
    s.onload = function() { _3dmolCallbacks.forEach(fn => fn()); _3dmolCallbacks = []; };
    s.onerror = function() { _3dmolCallbacks.forEach(fn => fn(null)); _3dmolCallbacks = []; };
    document.head.appendChild(s);
  }

  function mk(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function clr(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function secLabel(text, color) {
    const s = mk('div', 'mol-uni-sec');
    const bar = mk('span', 'mol-uni-sec-bar');
    bar.style.background = color || 'var(--border)';
    const t = mk('span', 'mol-uni-sec-txt', text);
    s.appendChild(bar); s.appendChild(t);
    return s;
  }

  // ── DOM scaffold (created once) ──────────────────────────────────────────
  function ensureDOM() {
    if (document.getElementById('mol-overlay')) return;
    const ov = mk('div'); ov.id = 'mol-overlay';
    const sh = mk('div'); sh.id = 'mol-shell';
    const hdr = mk('div'); hdr.id = 'mol-hdr';
    const row = mk('div', 'mol-hdr-row');
    const ico = mk('div', 'mol-hdr-icon'); ico.id = 'mol-icon';
    const meta = mk('div', 'mol-hdr-meta');
    const nm  = mk('div', 'mol-hdr-name'); nm.id  = 'mol-name';
    const sub = mk('div', 'mol-hdr-sub');  sub.id = 'mol-sub';
    const bdg = mk('div', 'mol-badges');   bdg.id = 'mol-badges';
    const cls = mk('button', 'mol-close'); cls.textContent = '\u2715'; cls.id = 'mol-close';
    meta.appendChild(nm); meta.appendChild(sub); meta.appendChild(bdg);
    row.appendChild(ico); row.appendChild(meta); row.appendChild(cls);
    hdr.appendChild(row);
    const body = mk('div'); body.id = 'mol-body';
    const foot = mk('div'); foot.id = 'mol-foot';
    const nihA  = mk('a', 'mol-foot-link', 'NIH \u2197');     nihA.id  = 'mol-nih';     nihA.target = '_blank'; nihA.rel = 'noopener';
    const s1    = mk('span', 'mol-foot-sep', '|');
    const pcA   = mk('a', 'mol-foot-link', 'PubChem \u2197'); pcA.id   = 'mol-pubchem'; pcA.target  = '_blank'; pcA.rel = 'noopener';
    const s2    = mk('span', 'mol-foot-sep', '|');
    const pdbA  = mk('a', 'mol-foot-link', 'PDB \u2197');     pdbA.id  = 'mol-pdb';     pdbA.target = '_blank'; pdbA.rel = 'noopener';
    const src   = mk('span', 'mol-foot-source', 'Data: local NIH cache \u00b7 fetch_data.py');
    foot.appendChild(nihA); foot.appendChild(s1); foot.appendChild(pcA);
    foot.appendChild(s2); foot.appendChild(pdbA); foot.appendChild(src);
    sh.appendChild(hdr); sh.appendChild(body); sh.appendChild(foot);
    ov.appendChild(sh); document.body.appendChild(ov);
    cls.addEventListener('click', MolModal.close);
    ov.addEventListener('click', function(e) { if (e.target === ov) MolModal.close(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') MolModal.close(); });
  }

  // ── Canvas renderers ─────────────────────────────────────────────────────

  // HiDPI setup — call once per canvas before first draw; returns logical {W, H}
  function setupHiDPI(cv) {
    const dpr = window.devicePixelRatio || 1;
    const W = cv.width, H = cv.height;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.getContext('2d').scale(dpr, dpr);
    return { W, H };
  }

  // Compute scale+pan to fit all node circles inside the canvas with padding
  function computeZoomFit(map, W, H) {
    const sx = W / 500, sy = H / 320, nodes = map.nodes || [];
    if (!nodes.length) return { scale: 1, panX: 0, panY: 0 };
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    nodes.forEach(n => {
      const cx = n.x * sx, cy = n.y * sy, r = (n.r || 28) * Math.min(sx, sy);
      x0 = Math.min(x0, cx - r); x1 = Math.max(x1, cx + r);
      y0 = Math.min(y0, cy - r); y1 = Math.max(y1, cy + r);
    });
    const pad = 24;
    const s = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
    return { scale: s, panX: W / 2 - (x0 + x1) / 2 * s, panY: H / 2 - (y0 + y1) / 2 * s };
  }

  // Draw the interaction map with a given pan/zoom transform
  function drawInteraction(cv, map, W, H, tx) {
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#07071e'; ctx.fillRect(0, 0, W, H);  // background (pre-transform)

    const sx = W / 500, sy = H / 320, ns = {};
    (map.nodes || []).forEach(n => { ns[n.id] = n; });
    function sc(n) { return { x: n.x * sx, y: n.y * sy, r: (n.r || 28) * Math.min(sx, sy) }; }

    ctx.save();
    if (tx) { ctx.translate(tx.panX, tx.panY); ctx.scale(tx.scale, tx.scale); }

    // Pass 1 — lines perimeter-to-perimeter, arrowheads on directed (solid) edges
    (map.edges || []).forEach(e => {
      const a = ns[e.from], b = ns[e.to]; if (!a || !b) return;
      const sa = sc(a), sb = sc(b);
      const ang = Math.atan2(sb.y - sa.y, sb.x - sa.x);
      const x1 = sa.x + sa.r * Math.cos(ang), y1 = sa.y + sa.r * Math.sin(ang);
      const x2 = sb.x - sb.r * Math.cos(ang), y2 = sb.y - sb.r * Math.sin(ang);
      ctx.strokeStyle = e.color || '#555577';
      ctx.lineWidth = e.dashed ? 1.5 : 2;
      ctx.setLineDash(e.dashed ? [5, 4] : []);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
      if (!e.dashed) {
        const aLen = 9, aAng = Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - aLen * Math.cos(ang - aAng), y2 - aLen * Math.sin(ang - aAng));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - aLen * Math.cos(ang + aAng), y2 - aLen * Math.sin(ang + aAng));
        ctx.stroke();
      }
    });

    // Pass 2 — node circles
    (map.nodes || []).forEach(n => {
      const { x, y, r } = sc(n);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.color + '33'; ctx.fill();
      ctx.strokeStyle = n.color; ctx.lineWidth = 2; ctx.stroke();
    });

    // Pass 3 — text on top
    ctx.textAlign = 'center';
    (map.nodes || []).forEach(n => {
      const { x, y, r } = sc(n);
      const lines = (n.label || '').split('\n');
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = n.color;
      lines.forEach((ln, i, arr) => ctx.fillText(ln, x, y + (i - arr.length / 2 + .5) * 13));
      if (n.sub) {
        ctx.font = '8px sans-serif'; ctx.fillStyle = n.color + '99';
        ctx.fillText(n.sub, x, y + r + 11);
      }
    });
    (map.edges || []).forEach(e => {
      if (!e.label) return;
      const a = ns[e.from], b = ns[e.to]; if (!a || !b) return;
      const sa = sc(a), sb = sc(b);
      const mx = (sa.x + sb.x) / 2, my = (sa.y + sb.y) / 2;
      const lines = e.label.split('\n');
      ctx.font = '9px monospace'; ctx.textAlign = 'center';
      lines.forEach((ln, i, arr) => {
        const ly = my + (i - arr.length / 2 + .5) * 12;
        const tw = ctx.measureText(ln).width;
        ctx.fillStyle = '#07071ecc';
        ctx.fillRect(mx - tw / 2 - 2, ly - 9, tw + 4, 12);
      });
      // Strip existing alpha suffix (e.g. #ff444466 → #ff4444) so label is always fully visible
      const baseClr = (e.color || '#555577').replace(/#([0-9a-fA-F]{6})[0-9a-fA-F]{2}$/, '#$1');
      ctx.fillStyle = baseClr;
      lines.forEach((ln, i, arr) => ctx.fillText(ln, mx, my + (i - arr.length / 2 + .5) * 12));
    });

    ctx.restore();
  }

  // Attach pan (drag) + zoom (wheel) to an interaction-map canvas
  function attachPanZoom(cv, map, W, H, state) {
    cv.style.cursor = 'grab';
    let startX, startY, startPX, startPY;

    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);  // keeps events on canvas even outside bounds
      startX = e.clientX; startY = e.clientY;
      startPX = state.panX; startPY = state.panY;
      cv.style.cursor = 'grabbing';
    });
    cv.addEventListener('pointermove', e => {
      if (!e.buttons) return;
      state.panX = startPX + (e.clientX - startX);
      state.panY = startPY + (e.clientY - startY);
      drawInteraction(cv, map, W, H, state);
    });
    cv.addEventListener('pointerup', () => { cv.style.cursor = 'grab'; });

    cv.addEventListener('wheel', e => {
      e.preventDefault();  // block page scroll while hovering canvas
      const rect = cv.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top)  * (H / rect.height);
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      // Keep the point under the cursor fixed while scaling
      state.panX = mx + (state.panX - mx) * f;
      state.panY = my + (state.panY - my) * f;
      state.scale *= f;
      drawInteraction(cv, map, W, H, state);
    }, { passive: false });
  }

  function drawDomainBar(cv, domains) {
    const dpr = window.devicePixelRatio || 1;
    const W = cv.width, H = cv.height;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    ctx.fillStyle = '#07071e'; ctx.fillRect(0, 0, W, H);
    if (!domains || !domains.length) return;
    const bX = 30, bY = H / 2 - 12, bW = W - 60, bH = 22, seg = (bW - domains.length * 2) / domains.length;
    domains.forEach((d, i) => {
      const x = bX + i * (seg + 2);
      ctx.fillStyle = d.color + 'cc'; ctx.fillRect(x, bY, seg, bH);
      ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.strokeRect(x, bY, seg, bH);
      ctx.fillStyle = d.color; ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillText((d.name || '').split(' ')[0], x + seg / 2, bY + bH + 13);
    });
    ctx.fillStyle = '#33335a'; ctx.font = '9px monospace';
    ctx.textAlign = 'left';  ctx.fillText('N', bX - 12, bY + bH / 2 + 3);
    ctx.textAlign = 'right'; ctx.fillText('C', bX + bW + 12, bY + bH / 2 + 3);
  }

  // ── Inline 3Dmol viewer ───────────────────────────────────────────────────
  function buildInline3D(container, mol) {
    const spinner = mk('div', 'mol-3d-spinner');
    spinner.textContent = 'Loading 3D\u2026';
    container.style.position = 'relative';
    container.appendChild(spinner);
    const viewDiv = mk('div');
    viewDiv.style.cssText = 'width:100%;height:100%;';
    container.appendChild(viewDiv);

    ensure3Dmol(function() {
      if (!window.$3Dmol) { spinner.textContent = '3Dmol unavailable'; return; }
      requestAnimationFrame(function() {
        const viewer = window.$3Dmol.createViewer(viewDiv, { backgroundColor: '0x07071e', antialias: true });
        const molColor = mol.color || '#00e5ff';
        function onLoaded() {
          spinner.style.display = 'none';
          if (mol.is_protein) {
            viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
            viewer.zoomTo(); viewer.render();  // fit to backbone before surface inflates bbox
            viewer.addSurface(window.$3Dmol.SurfaceType.VDW, { opacity: 0.06, color: molColor });
            viewer.render();
          } else {
            viewer.setStyle({}, { stick: { colorscheme: 'rasmol', radius: 0.15 } });
            viewer.setStyle({ elem: 'C' }, { stick: { color: molColor, radius: 0.15 } });
            viewer.zoomTo(); viewer.render();
          }
        }
        if (mol.is_protein && mol.pdb_id) {
          fetch('https://files.rcsb.org/view/' + mol.pdb_id + '.pdb')
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
            .then(d => { viewer.addModel(d, 'pdb'); onLoaded(); })
            .catch(e => { spinner.textContent = 'Load failed: ' + e.message; spinner.style.animation = 'none'; });
        } else if (mol.pubchem_cid) {
          fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/' + mol.pubchem_cid + '/SDF?record_type=3d')
            .then(r => { if (!r.ok) throw new Error('no 3D conformer'); return r.text(); })
            .then(d => { viewer.addModel(d, 'sdf'); onLoaded(); })
            .catch(e => { spinner.textContent = 'Load failed: ' + e.message; spinner.style.animation = 'none'; });
        }
      });
    });
  }

  // ── Related molecule helpers ──────────────────────────────────────────────
  function parseRelId(idStr) {
    if (!idStr) return { cid: null, pdbId: null };
    const cidM = idStr.match(/CID\s+(\d+)/i);
    const pdbM = idStr.match(/PDB:?\s*([A-Z0-9]{4})/i);
    return { cid: cidM ? parseInt(cidM[1]) : null, pdbId: pdbM ? pdbM[1].toUpperCase() : null };
  }

  function openRelMol(m) {
    const { cid, pdbId } = parseRelId(m.id);
    // First: look up the full molecule record from the current page's data
    const pageMols = window.MODULE_MOLS;
    if (pageMols) {
      const full = pageMols.find(mol =>
        (pdbId && mol.pdb_id === pdbId) ||
        (cid   && mol.pubchem_cid === cid)
      );
      if (full) { MolModal.open(full); return; }
    }
    // Fallback: open a minimal stub if the molecule isn't on this page
    MolModal.open({
      name: m.name, icon: m.icon || '\u2B21', color: m.color || '#88aaff',
      is_protein: !!pdbId, pubchem_cid: cid, pdb_id: pdbId, sub: m.id || '',
      badges: [], type: pdbId ? 'Protein' : 'Small Molecule',
      mechanism: (m.role || '').replace(/\n/g, ' \u00b7 '),
      properties: cid ? { 'PubChem CID': String(cid) } : (pdbId ? { 'PDB ID': pdbId } : {}),
      property_flags: {}, papers: [], rel_molecules: [],
    });
  }

  // ── Unified single-scroll panel ───────────────────────────────────────────
  function buildUnifiedPanel(mol) {
    const wrap = mk('div', 'mol-unified');
    const c = mol.color || '#00e5ff';

    // ── Section 1: Visualization + Properties ──────────────────────────────
    wrap.appendChild(secLabel('Molecular Structure', c));
    const topGrid = mk('div', 'mol-uni-top');
    const vizCol  = mk('div', 'mol-uni-viz');
    const propCol = mk('div', 'mol-uni-prop-col');

    if (mol.pubchem_cid) {
      // Small molecule: 2D bond diagram on top, 3D viewer below
      const imgWrap = mk('div', 'mol-struct-img-wrap');
      const img = mk('img', 'mol-struct-img');
      img.src = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/' + mol.pubchem_cid + '/PNG';
      img.alt = '2D structure';
      img.onerror = function() { imgWrap.style.display = 'none'; };
      imgWrap.appendChild(img);
      const lbl2d = mk('div', 'mol-canvas-lbl');
      lbl2d.textContent = '2D structure \u00b7 CID ' + mol.pubchem_cid + ' \u00b7 PubChem';
      const imgCard = mk('div', 'mol-uni-img-card');
      imgCard.appendChild(imgWrap); imgCard.appendChild(lbl2d);
      vizCol.appendChild(imgCard);

      // Mini 3D viewer
      const v3d = mk('div', 'mol-uni-3d-mini');
      buildInline3D(v3d, mol);
      const lbl3d = mk('div', 'mol-canvas-lbl');
      lbl3d.textContent = '3D conformer \u00b7 drag to rotate \u00b7 scroll to zoom';
      v3d.appendChild(lbl3d);
      vizCol.appendChild(v3d);

    } else if (mol.pdb_id) {
      // Protein: full 3D viewer
      const v3d = mk('div', 'mol-uni-3d-protein');
      buildInline3D(v3d, mol);
      const lbl = mk('div', 'mol-canvas-lbl');
      lbl.textContent = '3D \u00b7 PDB ' + mol.pdb_id + ' \u00b7 drag to rotate \u00b7 scroll to zoom';
      v3d.appendChild(lbl);
      vizCol.appendChild(v3d);
    } else {
      vizCol.appendChild(mk('div', 'mol-struct-ph', 'No structure ID available.'));
    }

    // Properties table
    const ps = mk('div', 'mol-prop-sect');
    ps.appendChild(mk('div', 'mol-prop-title', 'Physicochemical Properties'));
    const entries = Object.entries(mol.properties || {});
    if (entries.length) {
      entries.forEach(([k, v]) => {
        const row = mk('div', 'prop-row');
        const keySpan = mk('span', 'prop-key');
        const glossKey = k.toLowerCase().replace(/\s*\(.*\)/, '').trim();
        if (window.GLOSS && window.GLOSS[glossKey]) { keySpan.className = 'prop-key gtip'; keySpan.dataset.gloss = glossKey; }
        keySpan.textContent = k;
        const valSpan = mk('span', 'prop-val ' + ((mol.property_flags || {})[k] || ''), v);
        row.appendChild(keySpan); row.appendChild(valSpan); ps.appendChild(row);
      });
    } else {
      ps.appendChild(mk('div', 'mol-struct-ph', 'No properties data.'));
    }
    propCol.appendChild(ps);

    // Mechanism
    if (mol.mechanism) {
      const mech = mk('div', 'mol-prop-sect');
      mech.appendChild(mk('div', 'mol-prop-title', 'Function & Mechanism'));
      mech.appendChild(mk('div', 'mol-mech', mol.mechanism));
      propCol.appendChild(mech);
    }

    topGrid.appendChild(vizCol); topGrid.appendChild(propCol);
    wrap.appendChild(topGrid);

    // ── Section 2: Interaction Map ─────────────────────────────────────────
    if (mol.interaction) {
      wrap.appendChild(secLabel('Interaction Map', c));
      const iw = mk('div', 'mol-interaction-wrap');
      // Title: absolute overlay — transparent bg, uses mol accent color
      if (mol.interaction.title) {
        const td = mk('div', 'mol-imap-title', mol.interaction.title);
        td.style.color = c + '66';
        iw.appendChild(td);
      }
      const cv = mk('canvas'); cv.width = 680; cv.height = 310;
      cv.style.cssText = 'display:block;cursor:grab;';
      iw.appendChild(cv);
      const { W, H } = setupHiDPI(cv);
      const tx = computeZoomFit(mol.interaction, W, H);
      drawInteraction(cv, mol.interaction, W, H, tx);
      attachPanZoom(cv, mol.interaction, W, H, tx);
      wrap.appendChild(iw);
      const leg = mk('div', 'mol-legend');
      [{ color: c, label: 'This molecule' }, { color: '#8888b0', label: 'Partner' },
       { color: '#00ff99', label: 'Activation' }, { color: '#ff4444', label: 'Inhibition' }].forEach(it => {
        const li = mk('div', 'mol-leg-item'); const dot = mk('div', 'mol-leg-dot'); dot.style.background = it.color;
        li.appendChild(dot); li.appendChild(mk('span', '', it.label)); leg.appendChild(li);
      });
      wrap.appendChild(leg);
    }

    // ── Section 3: Domain Map (proteins only) ─────────────────────────────
    if (mol.is_protein && mol.domains && mol.domains.length) {
      wrap.appendChild(secLabel('Domain Architecture', c));
      const domGrid = mk('div', 'mol-uni-domain-grid');
      const rw = mk('div', 'mol-interaction-wrap'); rw.style.minHeight = '200px';
      const cv = mk('canvas'); cv.width = 400; cv.height = 160;
      const lbl = mk('div', 'mol-canvas-lbl'); lbl.textContent = 'Domain architecture';
      rw.appendChild(cv); rw.appendChild(lbl); drawDomainBar(cv, mol.domains);
      const dm = mk('div', 'mol-domain-map');
      dm.appendChild(mk('div', 'sec-lbl', 'Functional Domains'));
      mol.domains.forEach(d => {
        const row = mk('div', 'mol-domain-row');
        const seg = mk('div', 'mol-domain-seg'); seg.style.background = d.color;
        const info = mk('div'); info.style.flex = '1';
        info.appendChild(mk('div', 'mol-domain-name', d.name));
        info.appendChild(mk('div', 'mol-domain-pos', 'aa ' + (d.pos || '')));
        info.appendChild(mk('div', 'mol-domain-fn', d.fn || ''));
        row.appendChild(seg); row.appendChild(info); dm.appendChild(row);
      });
      domGrid.appendChild(rw); domGrid.appendChild(dm);
      wrap.appendChild(domGrid);
    }

    // ── Section 4: Key Papers ─────────────────────────────────────────────
    if (mol.papers && mol.papers.length) {
      wrap.appendChild(secLabel('Key Papers', c));
      mol.papers.forEach(p => {
        const item = mk('div', 'mol-paper-item');
        const meta = mk('div', 'mol-paper-meta');
        meta.appendChild(mk('span', 'mol-paper-year', p.year));
        meta.appendChild(mk('span', 'mol-paper-jrnl', p.journal));
        if (p.impact) meta.appendChild(mk('span', 'mol-paper-if', p.impact));
        item.appendChild(meta);
        item.appendChild(mk('div', 'mol-paper-title', p.title));
        item.appendChild(mk('div', 'mol-paper-abs', p.abstract));
        wrap.appendChild(item);
      });
    }

    // ── Section 5: Related Molecules ──────────────────────────────────────
    if (mol.rel_molecules && mol.rel_molecules.length) {
      wrap.appendChild(secLabel('Related Molecules', c));
      const relGrid = mk('div', 'mol-uni-rel-grid');
      mol.rel_molecules.forEach(m => {
        const { cid, pdbId } = parseRelId(m.id);
        const navigable = !!(cid || pdbId);
        const card = mk('div', 'mol-rel-card' + (navigable ? ' navigable' : ''));
        card.appendChild(mk('div', 'mol-rel-icon', m.icon || ''));
        card.appendChild(mk('div', 'mol-rel-name', m.name));
        card.appendChild(mk('div', 'mol-rel-role', m.role));
        card.appendChild(mk('div', 'mol-rel-id', m.id || ''));
        if (navigable) card.addEventListener('click', function() { openRelMol(m); });
        relGrid.appendChild(card);
      });
      wrap.appendChild(relGrid);
    }

    return wrap;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.MolModal = {
    open: function(mol) {
      ensureDOM();
      const shell = document.getElementById('mol-shell');
      shell.style.setProperty('--mol-color', mol.color || '#00e5ff');
      const ico = document.getElementById('mol-icon');
      ico.textContent = mol.icon || ''; ico.style.background = (mol.color || '#00e5ff') + '18'; ico.style.borderColor = (mol.color || '#00e5ff') + '44';
      document.getElementById('mol-name').textContent = mol.name || '';
      document.getElementById('mol-sub').textContent  = mol.sub  || '';
      const bdg = document.getElementById('mol-badges'); clr(bdg);
      (mol.badges || []).forEach(function(b) {
        const s = mk('span', 'mol-badge', b.text);
        s.style.color = b.color; s.style.borderColor = b.color + '44'; s.style.background = b.color + '10';
        bdg.appendChild(s);
      });
      const body = document.getElementById('mol-body'); clr(body);
      body.appendChild(buildUnifiedPanel(mol));
      function setFootLink(id, url) {
        const a = document.getElementById(id);
        if (url) { a.href = url; a.style.display = ''; a.style.pointerEvents = ''; }
        else { a.removeAttribute('href'); a.style.display = 'none'; }
      }
      // Separator spans: hide if both adjacent links are hidden
      setFootLink('mol-nih',     mol.nih_link || null);
      setFootLink('mol-pubchem', mol.pubchem_link || (mol.pubchem_cid ? 'https://pubchem.ncbi.nlm.nih.gov/compound/' + mol.pubchem_cid : null));
      setFootLink('mol-pdb',     mol.pdb_link     || (mol.pdb_id      ? 'https://www.rcsb.org/structure/'             + mol.pdb_id      : null));
      // Show/hide separators based on visible neighbours
      document.querySelectorAll('#mol-foot .mol-foot-sep').forEach(sep => {
        const prev = sep.previousElementSibling, next = sep.nextElementSibling;
        sep.style.display = (prev && prev.style.display !== 'none' && next && next.style.display !== 'none') ? '' : 'none';
      });
      document.getElementById('mol-overlay').classList.add('open');
    },
    close: function() { const ov = document.getElementById('mol-overlay'); if (ov) ov.classList.remove('open'); },
  };
})();
