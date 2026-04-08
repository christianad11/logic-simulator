/* utils.js — shared drawing utilities */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  /* ── SVGBuilder ── */
  function SVGBuilder(parent) {
    this._parent = parent;
  }
  SVGBuilder.prototype._el = function (tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    this._parent.appendChild(el);
    return el;
  };
  SVGBuilder.prototype.rect = function (x, y, w, h, attrs) {
    return this._el('rect', Object.assign({ x, y, width: w, height: h }, attrs));
  };
  SVGBuilder.prototype.circle = function (cx, cy, r, attrs) {
    return this._el('circle', Object.assign({ cx, cy, r }, attrs));
  };
  SVGBuilder.prototype.line = function (x1, y1, x2, y2, attrs) {
    return this._el('line', Object.assign({ x1, y1, x2, y2 }, attrs));
  };
  SVGBuilder.prototype.path = function (d, attrs) {
    return this._el('path', Object.assign({ d }, attrs));
  };
  SVGBuilder.prototype.text = function (txt, x, y, attrs) {
    const el = this._el('text', Object.assign({ x, y }, attrs));
    el.textContent = txt;
    return el;
  };
  SVGBuilder.prototype.g = function (attrs) {
    const el = this._el('g', attrs);
    return new SVGBuilder(el);
  };
  SVGBuilder.prototype.el = function () { return this._parent; };
  SVGBuilder.prototype.clear = function () {
    while (this._parent.firstChild) this._parent.removeChild(this._parent.firstChild);
    return this;
  };

  /* helper: create SVGBuilder wrapping an existing element */
  function svgOf(el) { return new SVGBuilder(el); }

  /* ── Signal color ── */
  function signalColor(v) {
    if (v === 1) return '#43e97b';
    if (v === 0) return '#ff4d6d';
    return '#9294a8';
  }

  /* ── Draw IEEE gate symbol ──
     type: 'AND','OR','NOT','XOR','NAND','NOR','XNOR','BUF'
     Returns the <g> element appended to parent SVG element `svg`.
  */
  function drawGateSymbol(svg, type, cx, cy, opts) {
    opts = opts || {};
    const scale = opts.scale || 1;
    const W = 56 * scale, H = 40 * scale;
    const x = cx - W / 2, y = cy - H / 2;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${x},${y})`);
    svg.appendChild(g);

    const stroke = opts.stroke || '#9294a8';
    const fill   = opts.fill   || '#1a1d2e';
    const sw     = opts.strokeWidth || 1.8 * scale;

    function _el(tag, attrs) {
      const el = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      g.appendChild(el);
      return el;
    }

    const hasB = !['NOT','BUF'].includes(type);
    const isBubble = ['NOT','NAND','NOR','XNOR'].includes(type);
    const bubbleR = 4 * scale;
    const bodyW = W - (isBubble ? bubbleR * 2 : 0);

    switch (type) {
      case 'AND': case 'NAND': {
        const bx = isBubble ? 0 : 0;
        const bw = bodyW;
        const bh = H;
        // D-shape: rect left + arc right
        const d = `M ${bx},${0} L ${bx + bw * 0.45},${0}
                   A ${bh/2} ${bh/2} 0 0 1 ${bx + bw * 0.45},${bh}
                   L ${bx},${bh} Z`;
        _el('path', { d, fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' });
        if (isBubble) _el('circle', { cx: bodyW + bubbleR, cy: H/2, r: bubbleR, fill, stroke, 'stroke-width': sw });
        break;
      }
      case 'OR': case 'NOR': {
        const d = `M 0,0 Q ${W*0.3} 0 ${bodyW},${H/2}
                   Q ${W*0.3} ${H} 0,${H}
                   Q ${W*0.25} ${H/2} 0,0 Z`;
        _el('path', { d, fill, stroke, 'stroke-width': sw });
        if (isBubble) _el('circle', { cx: bodyW + bubbleR, cy: H/2, r: bubbleR, fill, stroke, 'stroke-width': sw });
        break;
      }
      case 'XOR': case 'XNOR': {
        const d = `M 6,0 Q ${W*0.3} 0 ${bodyW},${H/2}
                   Q ${W*0.3} ${H} 6,${H}
                   Q ${6+W*0.25} ${H/2} 6,0 Z`;
        _el('path', { d, fill, stroke, 'stroke-width': sw });
        // extra curve
        const d2 = `M 0,0 Q ${W*0.2} ${H/2} 0,${H}`;
        _el('path', { d: d2, fill: 'none', stroke, 'stroke-width': sw });
        if (isBubble) _el('circle', { cx: bodyW + bubbleR, cy: H/2, r: bubbleR, fill, stroke, 'stroke-width': sw });
        break;
      }
      case 'NOT': {
        const d = `M 0,0 L ${bodyW},${H/2} L 0,${H} Z`;
        _el('path', { d, fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' });
        _el('circle', { cx: bodyW + bubbleR, cy: H/2, r: bubbleR, fill, stroke, 'stroke-width': sw });
        break;
      }
      case 'BUF': {
        const d = `M 0,0 L ${W},${H/2} L 0,${H} Z`;
        _el('path', { d, fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' });
        break;
      }
    }

    // Input pin stubs
    if (hasB) {
      _el('line', { x1: -12*scale, y1: H*0.33, x2: 0, y2: H*0.33, stroke, 'stroke-width': sw });
      _el('line', { x1: -12*scale, y1: H*0.67, x2: 0, y2: H*0.67, stroke, 'stroke-width': sw });
    } else {
      _el('line', { x1: -12*scale, y1: H/2, x2: 0, y2: H/2, stroke, 'stroke-width': sw });
    }
    // Output pin stub
    const outX = isBubble ? bodyW + bubbleR * 2 : bodyW;
    _el('line', { x1: outX, y1: H/2, x2: outX + 12*scale, y2: H/2, stroke, 'stroke-width': sw });

    return g;
  }

  /* ── Draw orthogonal wire ── */
  function drawWire(svg, x1, y1, x2, y2, value, animated) {
    const el = document.createElementNS(NS, 'polyline');
    const mx = (x1 + x2) / 2;
    el.setAttribute('points', `${x1},${y1} ${mx},${y1} ${mx},${y2} ${x2},${y2}`);
    el.setAttribute('stroke', signalColor(value));
    el.setAttribute('stroke-width', '2');
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    if (animated) el.classList.add('wire-animated');
    svg.appendChild(el);
    return el;
  }

  /* ── Draw straight wire ── */
  function drawLine(svg, x1, y1, x2, y2, value, animated, strokeWidth) {
    const el = document.createElementNS(NS, 'line');
    el.setAttribute('x1', x1); el.setAttribute('y1', y1);
    el.setAttribute('x2', x2); el.setAttribute('y2', y2);
    el.setAttribute('stroke', signalColor(value));
    el.setAttribute('stroke-width', strokeWidth || 2);
    el.setAttribute('stroke-linecap', 'round');
    if (animated) el.classList.add('wire-animated');
    svg.appendChild(el);
    return el;
  }

  /* ── SVG text helper ── */
  function svgText(svg, txt, x, y, opts) {
    const el = document.createElementNS(NS, 'text');
    el.setAttribute('x', x);
    el.setAttribute('y', y);
    el.setAttribute('fill', opts.fill || '#9294a8');
    el.setAttribute('font-size', opts.fontSize || 12);
    el.setAttribute('font-family', opts.fontFamily || "'Segoe UI', sans-serif");
    el.setAttribute('font-weight', opts.fontWeight || 'normal');
    el.setAttribute('text-anchor', opts.anchor || 'middle');
    el.setAttribute('dominant-baseline', opts.baseline || 'auto');
    el.textContent = txt;
    svg.appendChild(el);
    return el;
  }

  /* ── SVG rect helper ── */
  function svgRect(svg, x, y, w, h, opts) {
    const el = document.createElementNS(NS, 'rect');
    el.setAttribute('x', x); el.setAttribute('y', y);
    el.setAttribute('width', w); el.setAttribute('height', h);
    for (const [k, v] of Object.entries(opts || {})) el.setAttribute(k, v);
    svg.appendChild(el);
    return el;
  }

  /* ── SVG group helper ── */
  function svgGroup(svg, attrs) {
    const el = document.createElementNS(NS, 'g');
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    svg.appendChild(el);
    return el;
  }

  /* ── Build truth table HTML ── */
  function buildTruthTableHTML(headers, rows, activeRow) {
    let html = '<table><thead><tr>';
    for (const h of headers) html += `<th>${h}</th>`;
    html += '</tr></thead><tbody>';
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cls = i === activeRow ? ' class="active-row"' : '';
      html += `<tr${cls}>`;
      for (let j = 0; j < row.length; j++) {
        const v = row[j];
        const vc = (j === row.length - 1) ? (v === 1 ? ' class="val-1"' : ' class="val-0"') : '';
        html += `<td${vc}>${v}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  /* ── CanvasParticles ── */
  function CanvasParticles() {
    this.particles = [];
  }
  CanvasParticles.prototype.spawn = function (x, y, vx, vy, color, radius) {
    this.particles.push({
      x, y, vx, vy, color,
      radius: radius || 4,
      life: 1.0,
      decay: 0.008 + Math.random() * 0.006
    });
  };
  CanvasParticles.prototype.tick = function () {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  };
  CanvasParticles.prototype.draw = function (ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }
  };
  CanvasParticles.prototype.clear = function () { this.particles = []; };

  /* ── AnimQueue ── */
  function AnimQueue() {
    this._queue = [];
    this._timer = null;
  }
  AnimQueue.prototype.add = function (delay, fn) {
    this._queue.push({ delay, fn });
    return this;
  };
  AnimQueue.prototype.run = function () {
    this.cancel();
    let total = 0;
    for (const item of this._queue) {
      total += item.delay;
      (function (fn, t) {
        item._tid = setTimeout(fn, t);
      })(item.fn, total);
    }
    return this;
  };
  AnimQueue.prototype.cancel = function () {
    for (const item of this._queue) clearTimeout(item._tid);
    return this;
  };

  /* ── lerp / clamp ── */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ── Exports ── */
  window.Utils = {
    SVGBuilder, svgOf,
    signalColor,
    drawGateSymbol, drawWire, drawLine,
    svgText, svgRect, svgGroup,
    buildTruthTableHTML,
    CanvasParticles, AnimQueue,
    lerp, clamp,
    NS
  };
})();
