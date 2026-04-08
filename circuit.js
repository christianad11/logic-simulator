// ── Logic Circuit Builder ──────────────────────────────────────────────────

const GATE_DEF = {
  INPUT:  { inputs: 0, label: 'IN',   color: '#6c63ff' },
  OUTPUT: { inputs: 1, label: 'OUT',  color: '#ff6584' },
  AND:    { inputs: 2, label: 'AND',  color: '#43e97b' },
  OR:     { inputs: 2, label: 'OR',   color: '#98d843' },
  NOT:    { inputs: 1, label: 'NOT',  color: '#e943e9' },
  XOR:    { inputs: 2, label: 'XOR',  color: '#43b0e9' },
  NAND:   { inputs: 2, label: 'NAND', color: '#e9e943' },
  NOR:    { inputs: 2, label: 'NOR',  color: '#e97b43' },
  XNOR:   { inputs: 2, label: 'XNOR', color: '#43e9e9' },
};

const GW   = 88;   // gate width
const PHP  = 15;   // pin hit radius
const PR   = 6;    // pin draw radius
const SNAP = 20;   // grid snap

function gateH(type) {
  const n = GATE_DEF[type].inputs;
  return n === 0 ? 40 : n === 1 ? 48 : 64;
}

// ── State ──────────────────────────────────────────────────────────────────

const CB = {
  gates:    [],
  wires:    [],
  nextId:   1,
  nextVar:  0,      // index into A-Z for INPUT labels
  evalMap:  {},     // gateId → 0|1|null

  dragging: null,   // { id, dx, dy }
  wiring:   null,   // { gateId, type:'output'|'input', idx? }
  mouseX:   0,
  mouseY:   0,
  clickStart: null, // for INPUT tap detection

  canvas: null,
  ctx:    null,
};

// ── Gate / Wire operations ─────────────────────────────────────────────────

function cbAddGate(type) {
  const canvas = CB.canvas;
  const cx = Math.round((canvas.width  / 2 - GW / 2)        / SNAP) * SNAP;
  const cy = Math.round((canvas.height / 2 - gateH(type)/2) / SNAP) * SNAP;
  const gate = { id: CB.nextId++, type, x: cx, y: cy };
  if (type === 'INPUT') {
    gate.varName  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[CB.nextVar % 26];
    gate.simValue = null;   // null = unknown (gray)
    CB.nextVar++;
  }
  CB.gates.push(gate);
  cbEval();
  cbRender();
}

function cbDeleteGate(id) {
  CB.gates = CB.gates.filter(g => g.id !== id);
  CB.wires = CB.wires.filter(w => w.fromId !== id && w.toId !== id);
  if (CB.wiring && CB.wiring.gateId === id) CB.wiring = null;
  cbEval();
  cbRender();
}

function cbAddWire(fromId, toId, toPinIdx) {
  // One driver per input pin
  CB.wires = CB.wires.filter(w => !(w.toId === toId && w.toPinIdx === toPinIdx));
  // Prevent self-loops
  if (fromId === toId) return;
  CB.wires.push({ id: CB.nextId++, fromId, toId, toPinIdx });
  cbEval();
  cbRender();
}

function cbDeleteWire(id) {
  CB.wires = CB.wires.filter(w => w.id !== id);
  cbEval();
  cbRender();
}

// ── Pin geometry ───────────────────────────────────────────────────────────

function gatePins(gate) {
  const h = gateH(gate.type);
  const n = GATE_DEF[gate.type].inputs;
  const inputs = [];
  if (n === 1) {
    inputs.push({ x: gate.x, y: gate.y + h / 2 });
  } else if (n === 2) {
    inputs.push({ x: gate.x, y: gate.y + Math.round(h * 0.33) });
    inputs.push({ x: gate.x, y: gate.y + Math.round(h * 0.67) });
  }
  const output = gate.type !== 'OUTPUT'
    ? { x: gate.x + GW, y: gate.y + h / 2 }
    : null;
  return { inputs, output };
}

// ── Evaluation ─────────────────────────────────────────────────────────────

function cbEval() {
  CB.evalMap = {};
  const visiting = new Set();

  function ev(gateId) {
    if (CB.evalMap[gateId] !== undefined) return CB.evalMap[gateId];
    if (visiting.has(gateId)) { CB.evalMap[gateId] = null; return null; }
    visiting.add(gateId);

    const gate = CB.gates.find(g => g.id === gateId);
    if (!gate) { visiting.delete(gateId); return null; }

    if (gate.type === 'INPUT') {
      CB.evalMap[gateId] = gate.simValue;
      visiting.delete(gateId);
      return gate.simValue;
    }

    const n = GATE_DEF[gate.type].inputs;
    const vals = [];
    for (let i = 0; i < n; i++) {
      const w = CB.wires.find(w => w.toId === gateId && w.toPinIdx === i);
      if (!w) { CB.evalMap[gateId] = null; visiting.delete(gateId); return null; }
      const v = ev(w.fromId);
      if (v === null) { CB.evalMap[gateId] = null; visiting.delete(gateId); return null; }
      vals.push(v);
    }

    let out;
    switch (gate.type) {
      case 'OUTPUT': out = vals[0]; break;
      case 'NOT':    out = vals[0] ? 0 : 1; break;
      case 'AND':    out = vals[0] & vals[1]; break;
      case 'OR':     out = vals[0] | vals[1]; break;
      case 'XOR':    out = vals[0] ^ vals[1]; break;
      case 'NAND':   out = (vals[0] & vals[1]) ? 0 : 1; break;
      case 'NOR':    out = (vals[0] | vals[1]) ? 0 : 1; break;
      case 'XNOR':   out = (vals[0] ^ vals[1]) ? 0 : 1; break;
      default:       out = null;
    }
    CB.evalMap[gateId] = out;
    visiting.delete(gateId);
    return out;
  }

  for (const g of CB.gates) ev(g.id);
}

// ── Expression extraction ──────────────────────────────────────────────────

function cbExtractExpression() {
  const out = CB.gates.find(g => g.type === 'OUTPUT');
  if (!out) throw new Error('No OUTPUT gate. Add one to your circuit.');

  const seen = new Set();
  function expr(gateId) {
    if (seen.has(gateId)) throw new Error('Cycle detected in circuit.');
    seen.add(gateId);
    const gate = CB.gates.find(g => g.id === gateId);
    if (!gate) throw new Error('Broken wire (source gate missing).');

    if (gate.type === 'INPUT') { seen.delete(gateId); return gate.varName || 'A'; }

    const n = GATE_DEF[gate.type].inputs;
    const sub = [];
    for (let i = 0; i < n; i++) {
      const w = CB.wires.find(w => w.toId === gateId && w.toPinIdx === i);
      if (!w) throw new Error(`"${GATE_DEF[gate.type].label}" gate has unconnected input ${i + 1}.`);
      sub.push(expr(w.fromId));
    }
    seen.delete(gateId);

    switch (gate.type) {
      case 'OUTPUT': return sub[0];
      case 'NOT':    return `~${sub[0]}`;
      case 'AND':    return `(${sub[0]} & ${sub[1]})`;
      case 'OR':     return `(${sub[0]} | ${sub[1]})`;
      case 'XOR':    return `(${sub[0]} ^ ${sub[1]})`;
      case 'NAND':   return `~(${sub[0]} & ${sub[1]})`;
      case 'NOR':    return `~(${sub[0]} | ${sub[1]})`;
      case 'XNOR':   return `~(${sub[0]} ^ ${sub[1]})`;
    }
  }
  return expr(out.id);
}

// ── Rendering ──────────────────────────────────────────────────────────────

function cbRender() {
  const { canvas, ctx } = CB;
  if (!canvas || !ctx) return;
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#0b0d16';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = '#161929';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += SNAP) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += SNAP) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Wires
  for (const wire of CB.wires) drawWire(ctx, wire);

  // Pending wire
  if (CB.wiring) drawPendingWire(ctx);

  // Gates
  for (const gate of CB.gates) drawGate(ctx, gate);

  // Status bar
  updateStatus();
}

function sigColor(val) {
  if (val === 1) return '#43e97b';
  if (val === 0) return '#ff4d6d';
  return '#3a4060';
}

function drawWire(ctx, wire) {
  const fg = CB.gates.find(g => g.id === wire.fromId);
  const tg = CB.gates.find(g => g.id === wire.toId);
  if (!fg || !tg) return;
  const fp = gatePins(fg).output;
  const tp = gatePins(tg).inputs[wire.toPinIdx];
  if (!fp || !tp) return;

  const val = CB.evalMap[wire.fromId];
  const col = sigColor(val);
  const cpx = (fp.x + tp.x) / 2;

  ctx.beginPath();
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = val !== null ? col : 'transparent';
  ctx.shadowBlur  = val !== null ? 5 : 0;
  ctx.moveTo(fp.x, fp.y);
  ctx.bezierCurveTo(cpx, fp.y, cpx, tp.y, tp.x, tp.y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawPendingWire(ctx) {
  const { wiring, mouseX, mouseY } = CB;
  const gate = CB.gates.find(g => g.id === wiring.gateId);
  if (!gate) return;
  const pins = gatePins(gate);
  const src = wiring.type === 'output' ? pins.output : pins.inputs[wiring.idx];
  if (!src) return;

  const cpx = (src.x + mouseX) / 2;
  ctx.beginPath();
  ctx.strokeStyle = '#6c63ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.shadowColor = '#6c63ff';
  ctx.shadowBlur  = 6;
  ctx.moveTo(src.x, src.y);
  ctx.bezierCurveTo(cpx, src.y, cpx, mouseY, mouseX, mouseY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
}

function drawGate(ctx, gate) {
  const h   = gateH(gate.type);
  const col = GATE_DEF[gate.type].color;
  const pins = gatePins(gate);

  // Drop shadow glow
  ctx.shadowColor = col + '55';
  ctx.shadowBlur  = 14;

  // Body
  ctx.fillStyle   = '#181b2e';
  ctx.strokeStyle = col;
  ctx.lineWidth   = 2;
  roundRect(ctx, gate.x, gate.y, GW, h, 9);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Gate label
  const lbl = gate.type === 'INPUT' ? (gate.varName || 'IN') : GATE_DEF[gate.type].label;
  ctx.fillStyle    = col;
  ctx.font         = 'bold 13px Consolas, monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lbl, gate.x + GW / 2, gate.y + h / 2 - (gate.type === 'INPUT' ? 7 : 0));

  // Sim value badge for INPUT / OUTPUT
  if (gate.type === 'INPUT') {
    const v = gate.simValue;
    const badge = v === null ? '?' : String(v);
    ctx.font = '11px Consolas, monospace';
    ctx.fillStyle = v === 1 ? '#43e97b' : v === 0 ? '#ff4d6d' : '#555a7a';
    ctx.fillText(badge, gate.x + GW / 2, gate.y + h / 2 + 9);
  }
  if (gate.type === 'OUTPUT') {
    const v = CB.evalMap[gate.id];
    if (v !== null && v !== undefined) {
      ctx.font = 'bold 13px Consolas, monospace';
      ctx.fillStyle = v === 1 ? '#43e97b' : '#ff4d6d';
      ctx.fillText(`F=${v}`, gate.x + GW / 2, gate.y + h / 2 + 14);
    }
  }

  // Input pins
  for (const p of pins.inputs) {
    const connected = CB.wires.some(w => w.toId === gate.id && CB.gates.find(g => g.id === w.fromId) &&
      gatePins(CB.gates.find(g => g.id === w.fromId)).output &&
      Math.abs(gatePins(CB.gates.find(g => g.id === w.fromId)).output.x - p.x) < 50);
    drawPin(ctx, p, '#3a4070');
  }

  // Output pin
  if (pins.output) {
    const ov = CB.evalMap[gate.id];
    drawPin(ctx, pins.output, sigColor(ov));
  }
}

function drawPin(ctx, pos, fill) {
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, PR, 0, Math.PI * 2);
  ctx.fillStyle   = fill;
  ctx.strokeStyle = '#0b0d16';
  ctx.lineWidth   = 1.5;
  ctx.fill();
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x,     y,     x + r,   y,         r);
  ctx.closePath();
}

// ── Hit testing ────────────────────────────────────────────────────────────

function getGateAt(x, y) {
  for (let i = CB.gates.length - 1; i >= 0; i--) {
    const g = CB.gates[i];
    const h = gateH(g.type);
    if (x >= g.x && x <= g.x + GW && y >= g.y && y <= g.y + h) return g;
  }
  return null;
}

function getPinAt(x, y) {
  for (const gate of CB.gates) {
    const { inputs, output } = gatePins(gate);
    for (let i = 0; i < inputs.length; i++) {
      if (Math.hypot(x - inputs[i].x, y - inputs[i].y) <= PHP)
        return { gateId: gate.id, type: 'input', idx: i };
    }
    if (output && Math.hypot(x - output.x, y - output.y) <= PHP)
      return { gateId: gate.id, type: 'output' };
  }
  return null;
}

function getWireAt(x, y) {
  for (const wire of CB.wires) {
    const fg = CB.gates.find(g => g.id === wire.fromId);
    const tg = CB.gates.find(g => g.id === wire.toId);
    if (!fg || !tg) continue;
    const fp = gatePins(fg).output;
    const tp = gatePins(tg).inputs[wire.toPinIdx];
    if (!fp || !tp) continue;
    const cpx = (fp.x + tp.x) / 2;
    for (let t = 0; t <= 1; t += 0.04) {
      const bx = bezier(fp.x, cpx, cpx, tp.x, t);
      const by = bezier(fp.y, fp.y, tp.y, tp.y, t);
      if (Math.hypot(x - bx, y - by) < 8) return wire;
    }
  }
  return null;
}

function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

function canvasPos(e) {
  const r = CB.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (CB.canvas.width  / r.width),
    y: (e.clientY - r.top)  * (CB.canvas.height / r.height),
  };
}

// ── Mouse events ───────────────────────────────────────────────────────────

function onCBMouseDown(e) {
  e.preventDefault();
  const { x, y } = canvasPos(e);
  CB.clickStart = { x, y };

  if (e.button === 2) {
    const gate = getGateAt(x, y);
    if (gate) { cbDeleteGate(gate.id); return; }
    const wire = getWireAt(x, y);
    if (wire) { cbDeleteWire(wire.id); return; }
    return;
  }

  // Pin click takes priority
  const pin = getPinAt(x, y);
  if (pin) {
    if (CB.wiring) {
      const from = CB.wiring;
      if (from.type === 'output' && pin.type === 'input')
        cbAddWire(from.gateId, pin.gateId, pin.idx);
      else if (from.type === 'input' && pin.type === 'output')
        cbAddWire(pin.gateId, from.gateId, from.idx);
      CB.wiring = null;
    } else {
      CB.wiring = pin;
    }
    CB.clickStart = null;
    cbRender();
    return;
  }

  // Cancel wiring if clicking empty space
  if (CB.wiring) { CB.wiring = null; cbRender(); CB.clickStart = null; return; }

  // Start dragging
  const gate = getGateAt(x, y);
  if (gate) CB.dragging = { id: gate.id, dx: x - gate.x, dy: y - gate.y };
}

function onCBMouseMove(e) {
  const { x, y } = canvasPos(e);
  CB.mouseX = x;
  CB.mouseY = y;

  if (CB.dragging) {
    const gate = CB.gates.find(g => g.id === CB.dragging.id);
    if (gate) {
      gate.x = Math.round((x - CB.dragging.dx) / SNAP) * SNAP;
      gate.y = Math.round((y - CB.dragging.dy) / SNAP) * SNAP;
      cbEval();
    }
  }
  cbRender();
}

function onCBMouseUp(e) {
  const { x, y } = canvasPos(e);

  // Tap on INPUT gate body (no significant drag) → toggle simValue
  if (CB.dragging && CB.clickStart) {
    const moved = Math.hypot(x - CB.clickStart.x, y - CB.clickStart.y);
    if (moved < 4) {
      const gate = CB.gates.find(g => g.id === CB.dragging.id);
      if (gate && gate.type === 'INPUT') {
        gate.simValue = gate.simValue === null ? 0 : gate.simValue === 0 ? 1 : null;
        cbEval();
        cbRender();
      }
    }
  }

  CB.dragging   = null;
  CB.clickStart = null;
}

// ── Status bar ─────────────────────────────────────────────────────────────

function updateStatus() {
  const el = document.getElementById('circuit-status');
  if (!el) return;
  const nGates = CB.gates.length;
  const nWires = CB.wires.length;
  const hasOut = CB.gates.some(g => g.type === 'OUTPUT');
  const simInputs = CB.gates.filter(g => g.type === 'INPUT' && g.simValue !== null);

  let msg = `${nGates} gate${nGates !== 1 ? 's' : ''} · ${nWires} wire${nWires !== 1 ? 's' : ''}`;
  if (!hasOut && nGates > 0) msg += ' · ⚠ Add OUTPUT gate';
  if (CB.wiring) msg += ' · 🔌 Wiring — click a pin to connect, Esc to cancel';
  if (simInputs.length > 0) msg += ` · Sim: ${simInputs.map(g => `${g.varName}=${g.simValue}`).join(', ')}`;
  el.textContent = msg;
}

// ── Circuit error display ──────────────────────────────────────────────────

function showCircuitError(msg) {
  const el = document.getElementById('circuit-error');
  if (!el) return;
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); }
  else     { el.textContent = ''; el.classList.add('hidden'); }
}

// ── Init ───────────────────────────────────────────────────────────────────

function initCircuitBuilder() {
  const canvas = document.getElementById('circuit-canvas');
  if (!canvas) return;
  CB.canvas = canvas;
  CB.ctx    = canvas.getContext('2d');

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = Math.max(rect.height, 420);
    cbRender();
  }
  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('mousedown',   onCBMouseDown);
  canvas.addEventListener('mousemove',   onCBMouseMove);
  canvas.addEventListener('mouseup',     onCBMouseUp);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { CB.wiring = null; cbRender(); }
  });

  // Palette
  document.querySelectorAll('.gate-palette-btn').forEach(btn => {
    btn.addEventListener('click', () => cbAddGate(btn.dataset.gate));
  });

  // Analyze
  document.getElementById('analyze-circuit-btn').addEventListener('click', () => {
    showCircuitError(null);
    try {
      const expr = cbExtractExpression();
      document.getElementById('expr-input').value = expr;
      switchTab('expression');
      run();
    } catch (err) {
      showCircuitError(err.message);
    }
  });

  // Clear
  document.getElementById('clear-circuit-btn').addEventListener('click', () => {
    CB.gates = []; CB.wires = []; CB.nextVar = 0; CB.evalMap = {};
    showCircuitError(null);
    cbRender();
  });

  cbRender();
}
