// shared/connections.js — interactive connection-map renderer
// Usage: window.initConnMap(cv, nodes, edges, W, H)
// Each module defines its own nodes/edges and calls this after computing W/H.

(function () {
  'use strict';

  // Year-to-module map mirrors the list in index.html. A node whose `sub`
  // field is a matching year becomes a navigable cross-link without any
  // change to per-module code.
  var YEAR_TO_MODULE = {
    '2015': '2015_antiparasitic.html',
    '2016': '2016_autophagy.html',
    '2017': '2017_circadian.html',
    '2018': '2018_immunotherapy.html',
    '2019': '2019_hif_oxygen.html',
    '2020': '2020_hepatitis_c.html',
    '2021': '2021_trp_channels.html',
    '2022': '2022_paleogenomics.html',
    '2023': '2023_mrna.html',
    '2024': '2024_microrna.html',
  };

  function deriveHref(n) {
    if (n.href) return n.href;
    var key = (n.sub || '').trim();
    var file = YEAR_TO_MODULE[key];
    if (!file) return null;
    // Suppress self-links so clicking the current module's own node is a no-op.
    if (location.pathname.replace(/\\/g, '/').endsWith('/modules/' + file)) return null;
    return file;
  }

  window.initConnMap = function (cv, nodes, edges, W, H) {
    H = H || 360;
    nodes.forEach(function (n) { n.href = deriveHref(n); });
    // HiDPI setup
    const dpr = window.devicePixelRatio || 1;
    cv.width  = W * dpr;
    cv.height = H * dpr;
    cv.style.width  = W + 'px';
    cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    // Zoom-fit: find bounding box of all node circles, then scale+center
    const tx = (function () {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      nodes.forEach(function (n) {
        x0 = Math.min(x0, n.x - n.r); x1 = Math.max(x1, n.x + n.r);
        y0 = Math.min(y0, n.y - n.r); y1 = Math.max(y1, n.y + n.r);
      });
      var pad = 28;
      var s = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
      return { scale: s, panX: W / 2 - (x0 + x1) / 2 * s, panY: H / 2 - (y0 + y1) / 2 * s };
    }());

    function draw() {
      ctx.fillStyle = '#07071e';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(tx.panX, tx.panY);
      ctx.scale(tx.scale, tx.scale);

      var ns = {};
      nodes.forEach(function (n) { ns[n.id] = n; });

      // Pass 1 — edges
      edges.forEach(function (e) {
        var a = ns[e.from], b = ns[e.to];
        if (!a || !b) return;
        // Strip any alpha suffix so line is fully visible
        var lineColor = (e.color || '#555577').replace(/#([0-9a-fA-F]{6})[0-9a-fA-F]{2}$/, '#$1') + 'bb';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Pass 2 — node circles
      nodes.forEach(function (n) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color + '2a';
        ctx.fill();
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Pass 3 — edge labels with dark backdrop
      ctx.textAlign = 'center';
      edges.forEach(function (e) {
        if (!e.label) return;
        var a = ns[e.from], b = ns[e.to];
        if (!a || !b) return;
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var lines = e.label.split('\n');
        ctx.font = '9px monospace';
        lines.forEach(function (ln, i, arr) {
          var ly = my + (i - arr.length / 2 + 0.5) * 12;
          var tw = ctx.measureText(ln).width;
          ctx.fillStyle = '#07071ecc';
          ctx.fillRect(mx - tw / 2 - 3, ly - 9, tw + 6, 13);
        });
        // Strip alpha suffix for full-brightness label text
        var labelColor = (e.color || '#555577').replace(/#([0-9a-fA-F]{6})[0-9a-fA-F]{2}$/, '#$1');
        ctx.fillStyle = labelColor;
        lines.forEach(function (ln, i, arr) {
          ctx.fillText(ln, mx, my + (i - arr.length / 2 + 0.5) * 12);
        });
      });

      // Pass 4 — node labels + sub-labels
      nodes.forEach(function (n) {
        var lines = (n.label || '').split('\n');
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = n.color;
        ctx.textAlign = 'center';
        lines.forEach(function (ln, i, arr) {
          ctx.fillText(ln, n.x, n.y + (i - arr.length / 2 + 0.5) * 13);
        });
        if (n.sub) {
          ctx.font = '8px monospace';
          ctx.fillStyle = n.color + 'cc';
          ctx.fillText(n.sub, n.x, n.y + n.r + 12);
        }
      });

      ctx.restore();
    }

    draw();

    // Hit-test: world-space coords → topmost node under pointer (or null).
    // Nodes may supply an optional `href` to become navigable.
    function nodeAt(clientX, clientY) {
      var rect = cv.getBoundingClientRect();
      var lx = (clientX - rect.left) * (W / rect.width);
      var ly = (clientY - rect.top)  * (H / rect.height);
      var wx = (lx - tx.panX) / tx.scale;
      var wy = (ly - tx.panY) / tx.scale;
      // Reverse iteration so the visually-topmost node wins.
      for (var i = nodes.length - 1; i >= 0; i--) {
        var n = nodes[i];
        if (!n.href) continue;
        var dx = wx - n.x, dy = wy - n.y;
        if (dx * dx + dy * dy <= n.r * n.r) return n;
      }
      return null;
    }

    // Pan + zoom + click-to-navigate
    cv.style.cursor = 'grab';
    var sx, sy, spx, spy, didDrag = false;
    var DRAG_PX = 4;
    cv.addEventListener('pointerdown', function (e) {
      cv.setPointerCapture(e.pointerId);
      sx = e.clientX; sy = e.clientY;
      spx = tx.panX;  spy = tx.panY;
      didDrag = false;
      cv.style.cursor = 'grabbing';
    });
    cv.addEventListener('pointermove', function (e) {
      if (e.buttons) {
        if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > DRAG_PX) didDrag = true;
        tx.panX = spx + (e.clientX - sx);
        tx.panY = spy + (e.clientY - sy);
        draw();
      } else {
        // Hover feedback — pointer turns into a hand over navigable nodes.
        cv.style.cursor = nodeAt(e.clientX, e.clientY) ? 'pointer' : 'grab';
      }
    });
    cv.addEventListener('pointerup', function (e) {
      cv.style.cursor = 'grab';
      if (didDrag) return;
      var hit = nodeAt(e.clientX, e.clientY);
      if (hit && hit.href) window.location.href = hit.href;
    });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      var rect = cv.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (W / rect.width);
      var my = (e.clientY - rect.top)  * (H / rect.height);
      var f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      tx.panX = mx + (tx.panX - mx) * f;
      tx.panY = my + (tx.panY - my) * f;
      tx.scale *= f;
      draw();
    }, { passive: false });
  };
}());
