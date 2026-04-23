// roundrect-polyfill.js — CanvasRenderingContext2D.roundRect for older browsers.
// Native since Chrome 99 / Firefox 113 / Safari 16. Safe no-op on newer engines.
// Matches the native signature: (x, y, w, h, radii) where radii is a number,
// [all] / [tl+br, tr+bl] / [tl, tr+bl, br] / [tl, tr, br, bl], or DOMPointInit list.
// Supports negative width/height (mirrors the rectangle) per spec.
(function () {
  'use strict';
  if (typeof CanvasRenderingContext2D === 'undefined') return;
  if (CanvasRenderingContext2D.prototype.roundRect) return;

  function toCorners(radii) {
    if (radii === undefined || radii === null) radii = 0;
    if (typeof radii === 'number') radii = [radii];
    if (!Array.isArray(radii)) radii = [0];
    switch (radii.length) {
      case 1: return [radii[0], radii[0], radii[0], radii[0]];
      case 2: return [radii[0], radii[1], radii[0], radii[1]];
      case 3: return [radii[0], radii[1], radii[2], radii[1]];
      case 4: return radii.slice(0, 4);
      default: return [0, 0, 0, 0];
    }
  }

  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    var c = toCorners(radii).map(function (r) { return Math.max(0, +r || 0); });
    // Clamp each radius so adjacent corners don't overlap.
    var aw = Math.abs(w), ah = Math.abs(h);
    var maxR = Math.min(aw, ah) / 2;
    c = c.map(function (r) { return Math.min(r, maxR); });
    var tl = c[0], tr = c[1], br = c[2], bl = c[3];
    // Negative w/h flip the rectangle (matches native spec).
    var sx = w < 0 ? -1 : 1, sy = h < 0 ? -1 : 1;
    this.moveTo(x + tl * sx, y);
    this.lineTo(x + w - tr * sx, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr * sy);
    this.lineTo(x + w, y + h - br * sy);
    this.quadraticCurveTo(x + w, y + h, x + w - br * sx, y + h);
    this.lineTo(x + bl * sx, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl * sy);
    this.lineTo(x, y + tl * sy);
    this.quadraticCurveTo(x, y, x + tl * sx, y);
  };
})();
