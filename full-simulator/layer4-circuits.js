/* layer4-circuits.js — Combinational Circuits */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let _sim;
  let _circuit = 'half-adder';
  let _inputs  = { A: 0, B: 0, Cin: 0, Sel: 0 };

  /* ── SVG helpers ── */
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, x, y, attrs, parent) {
    const e = el('text', Object.assign({ x, y, fill:'#9294a8','font-size':11,'text-anchor':'middle','font-family':"'Segoe UI',sans-serif"}, attrs), parent);
    e.textContent = t; return e;
  }
  const SC = Utils.signalColor;

  /* ── Draw a labeled gate box ── */
  function gateBox(svg, type, cx, cy, w, h, value) {
    const c = SC(value);
    el('rect', {x:cx-w/2,y:cy-h/2,width:w,height:h,rx:6,fill:'#1a1d2e',stroke:c,'stroke-width':2}, svg);
    txt(type, cx, cy+4, {fill:c,'font-size':12,'font-weight':'700'}, svg);
    return {left: cx-w/2, right: cx+w/2, top: cy-h/2, bottom: cy+h/2, cx, cy};
  }

  /* ── Wire with optional animation ── */
  function wire(svg, x1, y1, x2, y2, v, anim) {
    const c = SC(v);
    const pts = [];
    if (x1 !== x2 && y1 !== y2) {
      const mx = (x1+x2)/2;
      pts.push(`${x1},${y1}`, `${mx},${y1}`, `${mx},${y2}`, `${x2},${y2}`);
    } else {
      pts.push(`${x1},${y1}`, `${x2},${y2}`);
    }
    const e = el('polyline', {points:pts.join(' '),stroke:c,'stroke-width':2.5,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'}, svg);
    if (anim) e.classList.add('wire-animated');
    return e;
  }
  function dot(svg, x, y, v) { el('circle',{cx:x,cy:y,r:4,fill:SC(v)},svg); }
  function pin(svg, x, y, label, anchor, v) {
    el('circle',{cx:x,cy:y,r:4,fill:SC(v)},svg);
    txt(label, x + (anchor==='start'?8:anchor==='end'?-8:0), y+4, {fill:SC(v),'font-size':13,'font-weight':'700','text-anchor':anchor},svg);
  }

  /* ─────────────── HALF ADDER ─────────────── */
  function drawHalfAdder(svg, A, B) {
    const sum   = A ^ B;
    const carry = A & B;
    svg.innerHTML = '';

    // Inputs
    pin(svg, 40, 160, 'A', 'start', A);
    pin(svg, 40, 220, 'B', 'start', B);

    // A wire
    wire(svg, 62, 160, 240, 160, A);
    wire(svg, 62, 220, 240, 220, B);

    // junction dots
    dot(svg, 160, 160, A);
    dot(svg, 160, 220, B);

    // XOR gate → Sum
    const xorG = gateBox(svg, 'XOR', 330, 175, 80, 50, sum);
    wire(svg, 240, 160, xorG.left, 160, A);
    wire(svg, xorG.left, 160, xorG.left, 175-12, A);
    wire(svg, 240, 220, xorG.left, 220, B);
    wire(svg, xorG.left, 220, xorG.left, 175+12, B);
    wire(svg, xorG.right, 175, 620, 175, sum);
    pin(svg, 620, 175, 'Sum = '+sum, 'start', sum);

    // AND gate → Carry
    const andG = gateBox(svg, 'AND', 330, 290, 80, 50, carry);
    wire(svg, 160, 160, 160, 290-12, A);
    wire(svg, 160, 290-12, andG.left, 290-12, A);
    wire(svg, 160, 220, 160, 290+12, B);
    wire(svg, 160, 290+12, andG.left, 290+12, B);
    wire(svg, andG.right, 290, 620, 290, carry);
    pin(svg, 620, 290, 'Carry = '+carry, 'start', carry);

    // Title
    txt('Half Adder', 360, 22, {fill:'#6c63ff','font-size':15,'font-weight':'700','text-anchor':'middle'}, svg);
    txt(`${A} + ${B} = ${carry}${sum} (binary)`, 360, 42, {fill:'#9294a8','font-size':11,'text-anchor':'middle'}, svg);

    // Legend
    txt('XOR → Sum bit', 360, 370, {fill:'#43e97b','font-size':10}, svg);
    txt('AND → Carry bit', 360, 385, {fill:'#9294a8','font-size':10}, svg);
  }

  /* ─────────────── FULL ADDER ─────────────── */
  function drawFullAdder(svg, A, B, Cin) {
    // HA1: A XOR B = P, A AND B = G
    const P = A ^ B;
    const G = A & B;
    // HA2: P XOR Cin = Sum, P AND Cin = Q
    const Sum = P ^ Cin;
    const Q   = P & Cin;
    // Cout = G OR Q
    const Cout = G | Q;

    svg.innerHTML = '';

    // Inputs
    pin(svg, 30, 120, 'A',   'start', A);
    pin(svg, 30, 170, 'B',   'start', B);
    pin(svg, 30, 280, 'Cin', 'start', Cin);

    // Input wires
    wire(svg, 54, 120, 130, 120, A);
    wire(svg, 54, 170, 130, 170, B);
    wire(svg, 54, 280, 390, 280, Cin);

    // HA1 box
    const ha1 = gateBox(svg, 'HA₁', 195, 145, 130, 70, P);
    txt('A XOR B = P', 195, 130, {fill:SC(P),'font-size':9,'text-anchor':'middle'}, svg);
    wire(svg, 130, 120, ha1.left, 120, A);
    wire(svg, ha1.left, 120, ha1.left, 138, A);
    wire(svg, 130, 170, ha1.left, 170, B);
    wire(svg, ha1.left, 170, ha1.left, 152, B);

    // P wire out of HA1 (top output = XOR = P)
    wire(svg, ha1.right, 135, 380, 135, P);
    txt('P='+P, 370, 128, {fill:SC(P),'font-size':9,'text-anchor':'end'}, svg);

    // G wire out of HA1 (bottom = AND = G)
    wire(svg, ha1.right, 155, 460, 155, G);
    txt('G='+G, 385, 148, {fill:SC(G),'font-size':9,'text-anchor':'start'}, svg);

    // HA2 box
    const ha2 = gateBox(svg, 'HA₂', 480, 200, 130, 70, Sum);
    txt('P XOR Cin = Sum', 480, 185, {fill:SC(Sum),'font-size':9,'text-anchor':'middle'}, svg);
    wire(svg, 380, 135, ha2.left, 135, P);
    wire(svg, ha2.left, 135, ha2.left, 192, P);
    wire(svg, 390, 280, ha2.left, 280, Cin);
    wire(svg, ha2.left, 280, ha2.left, 208, Cin);

    // Sum out
    wire(svg, ha2.right, 190, 695, 190, Sum);
    pin(svg, 695, 190, 'Sum='+Sum, 'start', Sum);

    // Q wire (AND of P,Cin)
    wire(svg, ha2.right, 210, 600, 210, Q);
    txt('Q='+Q, 610, 207, {fill:SC(Q),'font-size':9,'text-anchor':'start'}, svg);

    // OR gate for Cout
    const orG = gateBox(svg, 'OR', 590, 300, 80, 50, Cout);
    wire(svg, 460, 155, 460, 300-12, G);
    wire(svg, 460, 300-12, orG.left, 300-12, G);
    wire(svg, 600, 210, 600, 300+12, Q);
    wire(svg, 600, 300+12, orG.left, 300+12, Q);
    wire(svg, orG.right, 300, 695, 300, Cout);
    pin(svg, 695, 300, 'Cout='+Cout, 'start', Cout);

    // Title
    txt('Full Adder', 360, 18, {fill:'#6c63ff','font-size':14,'font-weight':'700'}, svg);
    txt(`${A}+${B}+${Cin} = ${Cout}${Sum} (Cout=MSB)`, 360, 36, {fill:'#9294a8','font-size':10}, svg);
  }

  /* ─────────────── 2:1 MUX ─────────────── */
  function drawMUX(svg, D0, D1, S) {
    const Y = S === 0 ? D0 : D1;
    svg.innerHTML = '';

    // Inputs
    pin(svg, 40, 140, 'D0', 'start', D0);
    pin(svg, 40, 210, 'D1', 'start', D1);
    pin(svg, 200, 330, 'S', 'start', S);

    // AND gate for D0 path (D0 AND ~S)
    const notS = S === 0 ? 1 : 0;
    const D0path = D0 & notS;
    const D1path = D1 & S;

    const and1 = gateBox(svg, 'AND', 310, 155, 80, 46, D0path);
    wire(svg, 63, 140, and1.left, 140, D0);
    wire(svg, and1.left, 140, and1.left, 148, D0);

    // ~S bubble for AND1 second input
    wire(svg, 63, 140, 63, 340, D0);
    wire(svg, 200, 330, 200, 340, S);
    el('circle', {cx:200,cy:295,r:5,fill:'#1a1d2e',stroke:'#9294a8','stroke-width':1.5}, svg);
    wire(svg, 200, 290, and1.left, 290, S);
    wire(svg, and1.left, 290, and1.left, 162, S);
    txt('~S', 170, 295, {fill:SC(notS),'font-size':10}, svg);

    // AND gate for D1 path (D1 AND S)
    const and2 = gateBox(svg, 'AND', 310, 240, 80, 46, D1path);
    wire(svg, 64, 210, and2.left, 210, D1);
    wire(svg, and2.left, 210, and2.left, 233, D1);
    wire(svg, 200, 330, 200, 247, S);
    wire(svg, 200, 247, and2.left, 247, S);

    // OR gate
    const orG = gateBox(svg, 'OR', 490, 197, 80, 46, Y);
    wire(svg, and1.right, 155, orG.left, 155, D0path);
    wire(svg, orG.left, 155, orG.left, 190, D0path);
    wire(svg, and2.right, 240, orG.left, 240, D1path);
    wire(svg, orG.left, 240, orG.left, 204, D1path);

    // Output
    wire(svg, orG.right, 197, 660, 197, Y);
    pin(svg, 660, 197, 'Y = '+Y, 'start', Y);

    // S vertical wire to both ANDs
    wire(svg, 200, 330, 200, 247, S);

    // Title
    txt('2:1 Multiplexer', 360, 20, {fill:'#6c63ff','font-size':14,'font-weight':'700'}, svg);
    txt('Y = (D0·~S) + (D1·S)', 360, 38, {fill:'#9294a8','font-size':10}, svg);
    txt(`S=${S}: selecting D${S}=${S===0?D0:D1} → Y=${Y}`, 360, 370, {fill:SC(Y),'font-size':11,'font-weight':'700'}, svg);
  }

  /* ── Compute outputs ── */
  function getOutputs() {
    const {A, B, Cin, Sel} = _inputs;
    if (_circuit === 'half-adder') return { Sum: A^B, Carry: A&B };
    if (_circuit === 'full-adder') {
      const P=A^B, G=A&B, Sum2=P^Cin, Q=P&Cin;
      return { Sum: Sum2, Cout: G|Q };
    }
    if (_circuit === 'mux') return { Y: Sel===0 ? A : B };
    return {};
  }

  /* ── Update output display ── */
  function updateOutput() {
    const el2 = document.getElementById('circuits-output');
    if (!el2) return;
    const out = getOutputs();
    let html = '';
    for (const [k, v] of Object.entries(out)) {
      html += `<div class="output-line">
        <span class="output-key">${k}</span>
        <span class="output-val ${v===1?'high':'low'}">${v}</span>
      </div>`;
    }
    el2.innerHTML = html;
  }

  /* ── Render ── */
  function render(animated) {
    const svg = document.getElementById('circuits-svg');
    if (!svg) return;
    const {A, B, Cin, Sel} = _inputs;
    if (_circuit === 'half-adder') drawHalfAdder(svg, A, B);
    if (_circuit === 'full-adder') drawFullAdder(svg, A, B, Cin);
    if (_circuit === 'mux')        drawMUX(svg, A, B, Sel);
    updateOutput();

    // Step info
    if (_sim) {
      const o = getOutputs();
      const vals = Object.entries(o).map(([k,v])=>`${k}=${v}`).join(', ');
      const inps = Object.entries(_inputs)
        .filter(([k]) => _circuit==='mux' ? ['A','B','Sel'].includes(k) : _circuit==='half-adder' ? ['A','B'].includes(k) : true)
        .map(([k,v])=>`${k}=${v}`).join(', ');
      _sim.setStepInfo(`Inputs: ${inps} → Outputs: ${vals}`);
    }
  }

  /* ── init ── */
  function init(sim) {
    _sim = sim;

    // Circuit tabs
    document.querySelectorAll('#circuits-tabs .sublayer-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#circuits-tabs .sublayer-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        _circuit = tab.dataset.circuit;
        _inputs = {A:0, B:0, Cin:0, Sel:0};
        // Reset buttons
        document.querySelectorAll('[data-cinput]').forEach(b => {
          b.classList.toggle('active', b.dataset.val==='0');
        });
        // Show/hide Cin & Sel rows
        const cinRow = document.getElementById('cin-row');
        const selRow = document.getElementById('sel-row');
        if (cinRow) cinRow.style.display = (_circuit === 'full-adder') ? '' : 'none';
        if (selRow) selRow.style.display = (_circuit === 'mux') ? '' : 'none';
        render();
      });
    });

    // Input toggles
    document.querySelectorAll('[data-cinput]').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = btn.dataset.cinput;
        const val = parseInt(btn.dataset.val);
        _inputs[inp] = val;
        document.querySelectorAll(`[data-cinput="${inp}"]`).forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.val) === val);
        });
        render();
      });
    });

    // Compute button (animated re-render)
    const compBtn = document.getElementById('circuits-compute');
    if (compBtn) compBtn.addEventListener('click', () => render(true));

    sim.on('layer-ready', function (d) {
      if (d.layer === 4) {
        sim.setTotalSteps(3);
        // Set initial visibility
        const cinRow = document.getElementById('cin-row');
        if (cinRow) cinRow.style.display = 'none';
        const selRow = document.getElementById('sel-row');
        if (selRow) selRow.style.display = 'none';
        render();
        sim.setStepInfo('Combinational Circuits: These circuits combine logic gates to perform useful computations like addition and data selection.');
      }
    });

    sim.on('step-change', function (d) {
      if (d.layer === 4) render();
    });
  }

  window.Layer4Circuits = { init };
})();
