// shared/connections.js — interactive connection-map renderer
// Usage: window.initConnMap(cv, nodes, edges, W, H)
// Each module defines its own nodes/edges and calls this after computing W/H.

(function () {
  'use strict';

  window.initConnMap = function (cv, nodes, edges, W, H) {
    H = H || 360;
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

    // Pan + zoom
    cv.style.cursor = 'grab';
    var sx, sy, spx, spy;
    cv.addEventListener('pointerdown', function (e) {
      cv.setPointerCapture(e.pointerId);
      sx = e.clientX; sy = e.clientY;
      spx = tx.panX;  spy = tx.panY;
      cv.style.cursor = 'grabbing';
    });
    cv.addEventListener('pointermove', function (e) {
      if (!e.buttons) return;
      tx.panX = spx + (e.clientX - sx);
      tx.panY = spy + (e.clientY - sy);
      draw();
    });
    cv.addEventListener('pointerup', function () { cv.style.cursor = 'grab'; });
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
