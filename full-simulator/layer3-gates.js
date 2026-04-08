/* layer3-gates.js — Logic Gates layer */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let _sim, _activeGate = 'NOT', _inputA = 0, _inputB = 0;

  const GATE_INFO = {
    NOT: {
      desc: 'A NOT gate (inverter) is a CMOS circuit with one PMOS + one NMOS transistor. When input is LOW, PMOS pulls output HIGH. When input is HIGH, NMOS pulls output LOW.',
      headers: ['A', 'OUT'],
      rows: [[0,1],[1,0]]
    },
    AND: {
      desc: 'An AND gate uses 2 NMOS in series (pull-down) + 2 PMOS in parallel (pull-up). Output is HIGH only when both inputs are HIGH.',
      headers: ['A', 'B', 'OUT'],
      rows: [[0,0,0],[0,1,0],[1,0,0],[1,1,1]]
    },
    OR: {
      desc: 'An OR gate is built as a NOR gate followed by an inverter. 2 NMOS in parallel + 2 PMOS in series form the NOR, then a NOT inverts the result.',
      headers: ['A', 'B', 'OUT'],
      rows: [[0,0,0],[0,1,1],[1,0,1],[1,1,1]]
    }
  };

  /* ── Compute output ── */
  function compute(gate, a, b) {
    if (gate === 'NOT') return a === 0 ? 1 : 0;
    if (gate === 'AND') return (a === 1 && b === 1) ? 1 : 0;
    if (gate === 'OR')  return (a === 1 || b === 1) ? 1 : 0;
  }

  function activeRow(gate, a, b) {
    if (gate === 'NOT') return a;
    if (gate === 'AND') return a*2+b;
    if (gate === 'OR')  return a*2+b;
  }

  /* ── SVG Drawing helpers ── */
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k,v] of Object.entries(attrs||{})) e.setAttribute(k,v);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, x, y, attrs, parent) {
    const e = el('text', Object.assign({x,y,fill:'#9294a8','font-size':11,'text-anchor':'middle','font-family':"'Segoe UI',sans-serif"}, attrs), parent);
    e.textContent = t; return e;
  }

  const SC = Utils.signalColor;

  /* ─────────────── NOT Gate Drawing ─────────────── */
  function drawNOT(svg, a) {
    const out = compute('NOT', a, 0);
    svg.innerHTML = '';

    // VDD rail
    el('line', {x1:240,y1:20,x2:380,y2:20,stroke:'#9294a8','stroke-width':2,'stroke-dasharray':'4 4'}, svg);
    txt('VDD', 410, 25, {fill:'#fbbf24','font-weight':'700'}, svg);

    // GND rail
    el('line', {x1:240,y1:380,x2:380,y2:380,stroke:'#9294a8','stroke-width':2,'stroke-dasharray':'4 4'}, svg);
    txt('GND', 410, 384, {fill:'#9294a8'}, svg);

    // ─── PMOS (top) ───
    // source to VDD
    const pmosColor = (a === 0) ? '#43e97b' : '#9294a8';
    el('line', {x1:310,y1:20,x2:310,y2:110,stroke:pmosColor,'stroke-width':2.5}, svg);
    // PMOS body
    el('rect', {x:280,y:110,width:60,height:50,rx:6,fill:'#1a1d2e',stroke:pmosColor,'stroke-width':2}, svg);
    txt('PMOS', 310, 140, {fill:pmosColor,'font-size':12,'font-weight':'700'}, svg);
    txt('M1', 310, 128, {fill:pmosColor,'font-size':10}, svg);
    // gate line (PMOS — bubble means inverting)
    el('line', {x1:220,y1:135,x2:280,y2:135,stroke:'#9294a8','stroke-width':2}, svg);
    el('circle', {cx:275,cy:135,r:5,fill:'#1a1d2e',stroke:'#9294a8','stroke-width':1.5}, svg);

    // ─── NMOS (bottom) ───
    const nmosColor = (a === 1) ? '#43e97b' : '#9294a8';
    // drain from PMOS to NMOS
    el('line', {x1:310,y1:160,x2:310,y2:240,stroke: out === 1 ? '#43e97b' : '#ff4d6d','stroke-width':2.5}, svg);
    el('rect', {x:280,y:240,width:60,height:50,rx:6,fill:'#1a1d2e',stroke:nmosColor,'stroke-width':2}, svg);
    txt('NMOS', 310, 270, {fill:nmosColor,'font-size':12,'font-weight':'700'}, svg);
    txt('M2', 310, 258, {fill:nmosColor,'font-size':10}, svg);
    // gate line (NMOS)
    el('line', {x1:220,y1:265,x2:280,y2:265,stroke:'#9294a8','stroke-width':2}, svg);
    // source to GND
    el('line', {x1:310,y1:290,x2:310,y2:380,stroke:'#9294a8','stroke-width':2.5}, svg);

    // ─── Input wire (connects both gates) ───
    el('line', {x1:220,y1:135,x2:220,y2:265,stroke: SC(a),'stroke-width':2.5}, svg);
    el('line', {x1:120,y1:200,x2:220,y2:200,stroke: SC(a),'stroke-width':2.5}, svg);
    el('line', {x1:220,y1:200,x2:220,y2:135,stroke: SC(a),'stroke-width':1.5,'stroke-dasharray':'3 3'}, svg);
    el('line', {x1:220,y1:200,x2:220,y2:265,stroke: SC(a),'stroke-width':1.5,'stroke-dasharray':'3 3'}, svg);
    txt('A', 100, 204, {fill: SC(a),'font-size':14,'font-weight':'700','text-anchor':'middle'}, svg);
    const inCirc = el('circle', {cx:220,cy:200,r:4,fill: SC(a)}, svg);

    // ─── Output wire ───
    el('line', {x1:310,y1:200,x2:580,y2:200,stroke: SC(out),'stroke-width':2.5}, svg);
    el('circle', {cx:310,cy:200,r:4,fill: SC(out)}, svg);
    txt('OUT', 595, 204, {fill: SC(out),'font-size':14,'font-weight':'700','text-anchor':'start'}, svg);

    // ─── IEEE Gate symbol (right side) ───
    const gx = 480, gy = 160;
    Utils.drawGateSymbol(svg, 'NOT', gx+28, gy+20, {scale:0.9, stroke: SC(out)});

    // Labels
    txt('CMOS Inverter', 310, 12, {fill:'#9294a8','font-size':10,'font-style':'italic'}, svg);
    txt(`Input A = ${a}`, 140, 380, {fill: SC(a),'font-size':11}, svg);
    txt(`Output = ${out}`, 490, 380, {fill: SC(out),'font-size':11,'font-weight':'700'}, svg);
  }

  /* ─────────────── AND Gate Drawing ─────────────── */
  function drawAND(svg, a, b) {
    const out = compute('AND', a, b);
    svg.innerHTML = '';

    // VDD
    el('line', {x1:210,y1:20,x2:380,y2:20,stroke:'#9294a8','stroke-width':2,'stroke-dasharray':'4 4'}, svg);
    txt('VDD', 410, 25, {fill:'#fbbf24','font-weight':'700'}, svg);
    // GND
    el('line', {x1:210,y1:380,x2:380,y2:380,stroke:'#9294a8','stroke-width':2,'stroke-dasharray':'4 4'}, svg);
    txt('GND', 410, 384, {fill:'#9294a8'}, svg);

    // ─── Pull-up: 2 PMOS in parallel ───
    const p1c = (a === 0) ? '#43e97b' : '#9294a8';
    const p2c = (b === 0) ? '#43e97b' : '#9294a8';

    // PMOS M3 (left)
    el('line', {x1:270,y1:20,x2:270,y2:80,stroke:p1c,'stroke-width':2}, svg);
    el('rect', {x:248,y:80,width:44,height:40,rx:5,fill:'#1a1d2e',stroke:p1c,'stroke-width':2}, svg);
    txt('M3', 270, 103, {fill:p1c,'font-size':10}, svg);
    el('line', {x1:210,y1:100,x2:248,y2:100,stroke:'#9294a8','stroke-width':1.5}, svg);
    el('circle', {cx:244,cy:100,r:4,fill:'#1a1d2e',stroke:'#9294a8','stroke-width':1.5}, svg);
    el('line', {x1:270,y1:120,x2:270,y2:148,stroke:p1c,'stroke-width':2}, svg);

    // PMOS M4 (right)
    el('line', {x1:350,y1:20,x2:350,y2:80,stroke:p2c,'stroke-width':2}, svg);
    el('rect', {x:328,y:80,width:44,height:40,rx:5,fill:'#1a1d2e',stroke:p2c,'stroke-width':2}, svg);
    txt('M4', 350, 103, {fill:p2c,'font-size':10}, svg);
    el('line', {x1:410,y1:100,x2:372,y2:100,stroke:'#9294a8','stroke-width':1.5}, svg);
    el('circle', {cx:376,cy:100,r:4,fill:'#1a1d2e',stroke:'#9294a8','stroke-width':1.5}, svg);
    el('line', {x1:350,y1:120,x2:350,y2:148,stroke:p2c,'stroke-width':2}, svg);

    // Join PMOS outputs
    el('line', {x1:270,y1:148,x2:350,y2:148,stroke: SC(out),'stroke-width':2.5}, svg);
    el('line', {x1:310,y1:148,x2:310,y2:200,stroke: SC(out),'stroke-width':2.5}, svg);

    // ─── Pull-down: 2 NMOS in series ───
    const n1c = (a === 1) ? '#43e97b' : '#9294a8';
    const n2c = (b === 1) ? '#43e97b' : '#9294a8';

    // NMOS M1 (top)
    el('line', {x1:310,y1:200,x2:310,y2:230,stroke: SC(out),'stroke-width':2.5}, svg);
    el('rect', {x:285,y:230,width:50,height:42,rx:5,fill:'#1a1d2e',stroke:n1c,'stroke-width':2}, svg);
    txt('M1', 310, 254, {fill:n1c,'font-size':10}, svg);
    el('line', {x1:210,y1:251,x2:285,y2:251,stroke:'#9294a8','stroke-width':1.5}, svg);
    el('line', {x1:310,y1:272,x2:310,y2:300,stroke:'#9294a8','stroke-width':2}, svg);

    // NMOS M2 (bottom)
    el('rect', {x:285,y:300,width:50,height:42,rx:5,fill:'#1a1d2e',stroke:n2c,'stroke-width':2}, svg);
    txt('M2', 310, 324, {fill:n2c,'font-size':10}, svg);
    el('line', {x1:410,y1:321,x2:335,y2:321,stroke:'#9294a8','stroke-width':1.5}, svg);
    el('line', {x1:310,y1:342,x2:310,y2:380,stroke:'#9294a8','stroke-width':2}, svg);

    // ─── Input wires ───
    // Input A → left side (gates of M3 via bubble, M1)
    el('line', {x1:80,y1:160,x2:210,y2:160,stroke: SC(a),'stroke-width':2.5}, svg);
    el('line', {x1:210,y1:100,x2:210,y2:251,stroke: SC(a),'stroke-width':2}, svg);
    el('circle', {cx:210,cy:160,r:4,fill: SC(a)}, svg);
    txt('A', 62, 164, {fill: SC(a),'font-size':14,'font-weight':'700'}, svg);

    // Input B → right side (gates of M4 via bubble, M2)
    el('line', {x1:80,y1:220,x2:410,y2:220,stroke: SC(b),'stroke-width':2.5}, svg);
    el('line', {x1:410,y1:100,x2:410,y2:321,stroke: SC(b),'stroke-width':2}, svg);
    el('circle', {cx:410,cy:220,r:4,fill: SC(b)}, svg);
    txt('B', 62, 224, {fill: SC(b),'font-size':14,'font-weight':'700'}, svg);

    // ─── Output ───
    el('line', {x1:310,y1:148,x2:620,y2:148,stroke: SC(out),'stroke-width':2.5}, svg);
    el('line', {x1:620,y1:148,x2:620,y2:200,stroke: SC(out),'stroke-width':2}, svg);
    txt('OUT', 635, 204, {fill: SC(out),'font-size':14,'font-weight':'700','text-anchor':'start'}, svg);
    el('circle', {cx:310,cy:148,r:4,fill: SC(out)}, svg);

    // ─── IEEE AND gate symbol ───
    Utils.drawGateSymbol(svg, 'AND', 560, 200, {scale:0.9, stroke: SC(out)});

    txt('A=' + a + ' B=' + b, 165, 380, {fill:'#9294a8','font-size':11}, svg);
    txt('OUT=' + out, 500, 380, {fill: SC(out),'font-size':12,'font-weight':'700'}, svg);
  }

  /* ─────────────── OR Gate Drawing ─────────────── */
  function drawOR(svg, a, b) {
    const out = compute('OR', a, b);
    const nor  = (a===0 && b===0) ? 1 : 0; // NOR output before inverter
    svg.innerHTML = '';

    txt('NOR stage', 220, 15, {fill:'#9294a8','font-size':10,'font-style':'italic'}, svg);
    txt('NOT stage', 510, 15, {fill:'#9294a8','font-size':10,'font-style':'italic'}, svg);

    // VDD / GND
    el('line', {x1:150,y1:25,x2:380,y2:25,stroke:'#9294a8','stroke-width':1.5,'stroke-dasharray':'4 4'}, svg);
    el('line', {x1:150,y1:375,x2:380,y2:375,stroke:'#9294a8','stroke-width':1.5,'stroke-dasharray':'4 4'}, svg);
    txt('VDD', 135, 29, {fill:'#fbbf24','font-size':10,'font-weight':'700'}, svg);
    txt('GND', 135, 379, {fill:'#9294a8','font-size':10}, svg);

    // ─── Pull-up: 2 PMOS in series ───
    const p1c = (a === 0) ? '#43e97b' : '#9294a8';
    const p2c = (b === 0) ? '#43e97b' : '#9294a8';

    el('line', {x1:270,y1:25,x2:270,y2:70,stroke:p1c,'stroke-width':2}, svg);
    el('rect', {x:247,y:70,width:46,height:38,rx:5,fill:'#1a1d2e',stroke:p1c,'stroke-width':2}, svg);
    txt('M3', 270, 91, {fill:p1c,'font-size':10}, svg);
    el('line', {x1:200,y1:89,x2:247,y2:89,stroke:'#9294a8','stroke-width':1.5}, svg);
    el('circle', {cx:243,cy:89,r:4,fill:'#1a1d2e',stroke:'#9294a8','stroke-width':1.5}, svg);
    el('line', {x1:270,y1:108,x2:270,y2:136,stroke:p1c,'stroke-width':2}, svg);

    el('rect', {x:247,y:136,width:46,height:38,rx:5,fill:'#1a1d2e',stroke:p2c,'stroke-width':2}, svg);
    txt('M4', 270, 157, {fill:p2c,'font-size':10}, svg);
    el('line', {x1:340,y1:155,x2:293,y2:155,stroke:'#9294a8','stroke-width':1.5}, svg);
    el('circle', {cx:297,cy:155,r:4,fill:'#1a1d2e',stroke:'#9294a8','stroke-width':1.5}, svg);
    el('line', {x1:270,y1:174,x2:270,y2:200,stroke: SC(nor),'stroke-width':2.5}, svg);

    // ─── Pull-down: 2 NMOS in parallel ───
    const n1c = (a === 1) ? '#43e97b' : '#9294a8';
    const n2c = (b === 1) ? '#43e97b' : '#9294a8';

    el('line', {x1:235,y1:200,x2:235,y2:230,stroke:n1c,'stroke-width':2}, svg);
    el('rect', {x:212,y:230,width:46,height:38,rx:5,fill:'#1a1d2e',stroke:n1c,'stroke-width':2}, svg);
    txt('M1', 235, 251, {fill:n1c,'font-size':10}, svg);
    el('line', {x1:200,y1:249,x2:212,y2:249,stroke:'#9294a8','stroke-width':1.5}, svg);
    el('line', {x1:235,y1:268,x2:235,y2:375,stroke:'#9294a8','stroke-width':2}, svg);

    el('line', {x1:305,y1:200,x2:305,y2:230,stroke:n2c,'stroke-width':2}, svg);
    el('rect', {x:282,y:230,width:46,height:38,rx:5,fill:'#1a1d2e',stroke:n2c,'stroke-width':2}, svg);
    txt('M2', 305, 251, {fill:n2c,'font-size':10}, svg);
    el('line', {x1:340,y1:249,x2:328,y2:249,stroke:'#9294a8','stroke-width':1.5}, svg);
    el('line', {x1:305,y1:268,x2:305,y2:375,stroke:'#9294a8','stroke-width':2}, svg);

    // Join NOR parallel outputs + node
    el('line', {x1:235,y1:200,x2:305,y2:200,stroke: SC(nor),'stroke-width':2.5}, svg);
    el('line', {x1:270,y1:174,x2:270,y2:200,stroke: SC(nor),'stroke-width':2.5}, svg);
    el('line', {x1:270,y1:200,x2:270,y2:200,stroke: SC(nor),'stroke-width':2.5}, svg);
    el('circle', {cx:270,cy:200,r:4,fill: SC(nor)}, svg);

    // NOR output wire to inverter
    el('line', {x1:270,y1:200,x2:410,y2:200,stroke: SC(nor),'stroke-width':2.5}, svg);

    // ─── Inverter stage ───
    const inv_vdd_c = (nor === 0) ? '#43e97b' : '#9294a8';
    const inv_nmos_c = (nor === 1) ? '#43e97b' : '#9294a8';

    el('line', {x1:490,y1:25,x2:490,y2:375,stroke:'#9294a8','stroke-width':1,'stroke-dasharray':'2 6','opacity':'0.4'}, svg);
    el('line', {x1:490,y1:25,x2:560,y2:25,stroke:'#9294a8','stroke-width':1.5,'stroke-dasharray':'4 4'}, svg);
    el('line', {x1:490,y1:375,x2:560,y2:375,stroke:'#9294a8','stroke-width':1.5,'stroke-dasharray':'4 4'}, svg);

    el('line', {x1:530,y1:25,x2:530,y2:110,stroke:inv_vdd_c,'stroke-width':2}, svg);
    el('rect', {x:507,y:110,width:46,height:40,rx:5,fill:'#1a1d2e',stroke:inv_vdd_c,'stroke-width':2}, svg);
    txt('PMOS', 530, 131, {fill:inv_vdd_c,'font-size':9}, svg);
    el('line', {x1:410,y1:130,x2:507,y2:130,stroke: SC(nor),'stroke-width':1.5}, svg);
    el('circle', {cx:503,cy:130,r:4,fill:'#1a1d2e',stroke:'#9294a8','stroke-width':1.5}, svg);
    el('line', {x1:530,y1:150,x2:530,y2:200,stroke: SC(out),'stroke-width':2.5}, svg);

    el('rect', {x:507,y:220,width:46,height:40,rx:5,fill:'#1a1d2e',stroke:inv_nmos_c,'stroke-width':2}, svg);
    txt('NMOS', 530, 241, {fill:inv_nmos_c,'font-size':9}, svg);
    el('line', {x1:410,y1:240,x2:507,y2:240,stroke: SC(nor),'stroke-width':1.5}, svg);
    el('line', {x1:530,y1:260,x2:530,y2:375,stroke:'#9294a8','stroke-width':2}, svg);

    el('line', {x1:530,y1:200,x2:530,y2:220,stroke: SC(out),'stroke-width':2.5}, svg);
    el('circle', {cx:530,cy:200,r:4,fill: SC(out)}, svg);

    // Output
    el('line', {x1:530,y1:200,x2:680,y2:200,stroke: SC(out),'stroke-width':2.5}, svg);
    txt('OUT', 690, 204, {fill: SC(out),'font-size':14,'font-weight':'700','text-anchor':'start'}, svg);

    // ─── Input wires ───
    el('line', {x1:80,y1:170,x2:200,y2:170,stroke: SC(a),'stroke-width':2.5}, svg);
    el('line', {x1:200,y1:89,x2:200,y2:249,stroke: SC(a),'stroke-width':2}, svg);
    el('circle', {cx:200,cy:170,r:4,fill: SC(a)}, svg);
    txt('A', 62, 174, {fill: SC(a),'font-size':14,'font-weight':'700'}, svg);

    el('line', {x1:80,y1:210,x2:340,y2:210,stroke: SC(b),'stroke-width':2.5}, svg);
    el('line', {x1:340,y1:155,x2:340,y2:249,stroke: SC(b),'stroke-width':2}, svg);
    el('circle', {cx:340,cy:210,r:4,fill: SC(b)}, svg);
    txt('B', 62, 214, {fill: SC(b),'font-size':14,'font-weight':'700'}, svg);

    // ─── IEEE OR symbol ───
    Utils.drawGateSymbol(svg, 'OR', 638, 195, {scale:0.85, stroke: SC(out)});

    txt('A=' + a + ' B=' + b, 165, 390, {fill:'#9294a8','font-size':11}, svg);
    txt('NOR=' + nor + ' → NOT → OUT=' + out, 430, 390, {fill: SC(out),'font-size':11,'font-weight':'700'}, svg);
  }

  /* ── Render current gate ── */
  function render() {
    const svg = document.getElementById('gates-svg');
    if (!svg) return;

    const info = GATE_INFO[_activeGate];
    const out  = compute(_activeGate, _inputA, _inputB);

    // Draw transistor diagram
    if (_activeGate === 'NOT') drawNOT(svg, _inputA);
    if (_activeGate === 'AND') drawAND(svg, _inputA, _inputB);
    if (_activeGate === 'OR')  drawOR(svg, _inputA, _inputB);

    // Truth table
    const ttEl = document.getElementById('gates-truth-table');
    if (ttEl) {
      const ar = activeRow(_activeGate, _inputA, _inputB);
      ttEl.innerHTML = Utils.buildTruthTableHTML(info.headers, info.rows, ar);
    }

    // Output badge
    const outEl = document.getElementById('gates-output');
    if (outEl) {
      outEl.textContent = out;
      outEl.style.color = Utils.signalColor(out);
    }

    // Description
    const descEl = document.getElementById('gates-description');
    if (descEl) descEl.textContent = info.desc;

    // Show/hide B input row
    const bRow = document.getElementById('input-b-row');
    if (bRow) bRow.style.display = (_activeGate === 'NOT') ? 'none' : '';

    // Step info
    const stepTexts = {
      NOT: ['NOT Gate: A CMOS inverter uses two complementary transistors. When one conducts, the other is cut off — giving a perfect logic inversion.', `Input A=${_inputA}: ${_inputA===0?'PMOS conducts (VDD→OUT), NMOS cuts off → Output = 1':'NMOS conducts (OUT→GND), PMOS cuts off → Output = 0'}`],
      AND: ['AND Gate: Two NMOS transistors in series form the pull-down network. Both must be ON for current to flow to GND (output LOW). Two parallel PMOS pull output HIGH otherwise.', `A=${_inputA}, B=${_inputB}: ${out===1?'Both NMOS ON → pull-down active → Output = 1':'At least one NMOS OFF → pull-up active → Output = 0'}`],
      OR:  ['OR Gate: Built as NOR + NOT. A NOR gate uses 2 parallel NMOS (pull-down) and 2 series PMOS (pull-up), then the output is inverted.', `A=${_inputA}, B=${_inputB}: NOR=${compute(_activeGate,_inputA,_inputB)===1?0:1} → after NOT → Output = ${out}`]
    };
    if (_sim) {
      const texts = stepTexts[_activeGate];
      _sim.setStepInfo(texts[1] || texts[0]);
    }
  }

  /* ── init ── */
  function init(sim) {
    _sim = sim;

    /* tab switching */
    document.querySelectorAll('#gates-tabs .sublayer-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#gates-tabs .sublayer-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        _activeGate = tab.dataset.gate;
        sim.state.layers[3].activeGate = _activeGate;
        _inputA = 0; _inputB = 0;
        // Reset input buttons
        document.querySelectorAll('[data-input]').forEach(b => {
          b.classList.toggle('active', b.dataset.val === '0');
        });
        render();
      });
    });

    /* input toggles */
    document.querySelectorAll('[data-input]').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = btn.dataset.input;
        const val = parseInt(btn.dataset.val);
        if (inp === 'A') _inputA = val;
        if (inp === 'B') _inputB = val;
        // Update button states
        document.querySelectorAll(`[data-input="${inp}"]`).forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.val) === val);
        });
        render();
      });
    });

    sim.on('layer-ready', function (d) {
      if (d.layer === 3) {
        sim.setTotalSteps(2);
        render();
        sim.setStepInfo('Logic Gates: See how transistors implement Boolean logic. Use the tabs to explore NOT, AND, and OR gates.');
      }
    });

    sim.on('step-change', function (d) {
      if (d.layer === 3) render();
    });
  }

  window.Layer3Gates = { init };
})();
