/* layer2-transistor.js — MOSFET Transistor layer */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let _sim, _gateHigh = false, _showDepletion = true, _step = 1;
  let _vgsAnim = null;
  let _currentVgs = 0;

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

  /* ── Draw MOSFET cross-section ── */
  function drawMOSFET(svg, step, vgs) {
    svg.innerHTML = '';

    const on = (step >= 5) && _gateHigh;
    const thresh = (step >= 4);
    const rising = (step === 3);

    // ─── Substrate (P-type) ───
    el('rect', {x:60,y:100,width:500,height:250,rx:10,fill:'#2a1a2e',stroke:'#7c3aed','stroke-width':2}, svg);
    txt('P-type Substrate', 310, 360, {fill:'#a78bfa','font-size':11}, svg);

    // ─── Source N+ region (left) ───
    el('rect', {x:90,y:80,width:120,height:80,rx:6,fill:'#1a2e3a',stroke:'#06b6d4','stroke-width':2}, svg);
    txt('N⁺', 150, 125, {fill:'#06b6d4','font-size':14,'font-weight':'700'}, svg);
    txt('Source', 150, 142, {fill:'#06b6d4','font-size':10}, svg);

    // ─── Drain N+ region (right) ───
    el('rect', {x:410,y:80,width:120,height:80,rx:6,fill:'#1a2e3a',stroke:'#06b6d4','stroke-width':2}, svg);
    txt('N⁺', 470, 125, {fill:'#06b6d4','font-size':14,'font-weight':'700'}, svg);
    txt('Drain', 470, 142, {fill:'#06b6d4','font-size':10}, svg);

    // ─── Channel region ───
    const chanColor = on ? '#06b6d4' : (thresh ? '#f59e0b' : '#4b5563');
    el('rect', {x:210,y:80,width:200,height:30,rx:4,fill:chanColor,'fill-opacity':on?0.5:0.25,stroke:chanColor,'stroke-width':1.5}, svg);
    txt(on ? 'Channel (ON)' : (thresh ? 'Channel (threshold)' : 'Channel (depleted)'), 310, 100, {fill:chanColor,'font-size':10,'font-weight':on?'700':'400'}, svg);

    // ─── Gate Oxide (SiO2) ───
    el('rect', {x:210,y:58,width:200,height:22,rx:3,fill:'#bfdbfe','fill-opacity':0.25,stroke:'#93c5fd','stroke-width':1.5}, svg);
    txt('Gate Oxide (SiO₂)', 310, 72, {fill:'#93c5fd','font-size':9,'font-style':'italic'}, svg);

    // ─── Gate electrode ───
    const gateColor = _gateHigh ? '#f59e0b' : '#9294a8';
    el('rect', {x:210,y:28,width:200,height:30,rx:4,fill:'#252840',stroke:gateColor,'stroke-width':2.5}, svg);
    txt('Gate (G)', 310, 47, {fill:gateColor,'font-size':11,'font-weight':'700'}, svg);

    // ─── Depletion zone overlay (shown when not on) ───
    if (_showDepletion && !on) {
      const depW = 200, depAlpha = thresh ? 0.15 : 0.3;
      el('rect', {x:210,y:80,width:depW,height:80,fill:'#7c3aed','fill-opacity':depAlpha}, svg);
      if (step >= 4) txt('Inversion layer forming', 310, 165, {fill:'#a78bfa','font-size':9,'font-style':'italic'}, svg);
    }

    // ─── Terminals and wires ───
    // Source wire (up)
    el('line', {x1:150,y1:80,x2:150,y2:30,stroke:'#06b6d4','stroke-width':2.5}, svg);
    el('circle', {cx:150,cy:30,r:5,fill:'#06b6d4'}, svg);
    txt('S', 132, 24, {fill:'#06b6d4','font-size':12,'font-weight':'700','text-anchor':'middle'}, svg);

    // Drain wire (up)
    el('line', {x1:470,y1:80,x2:470,y2:30,stroke:'#06b6d4','stroke-width':2.5}, svg);
    el('circle', {cx:470,cy:30,r:5,fill:'#06b6d4'}, svg);
    txt('D', 488, 24, {fill:'#06b6d4','font-size':12,'font-weight':'700','text-anchor':'middle'}, svg);

    // Gate wire (up from gate electrode)
    el('line', {x1:310,y1:28,x2:310,y2:10,stroke:gateColor,'stroke-width':2.5}, svg);
    el('circle', {cx:310,cy:10,r:5,fill:gateColor}, svg);
    txt('G', 325, 10, {fill:gateColor,'font-size':12,'font-weight':'700','text-anchor':'start'}, svg);

    // Vgs label
    const vgsText = rising ? `Vgs = ${vgs.toFixed(1)} V` : (_gateHigh ? 'Vgs = 3.0 V' : 'Vgs = 0.0 V');
    txt(vgsText, 310, 385, {fill:gateColor,'font-size':13,'font-weight':'700'}, svg);

    // ─── Current flow (when ON) ───
    if (on) {
      const pts = '210,95 250,95 290,95 330,95 370,95 410,95';
      const flowLine = el('polyline', {points:pts,stroke:'#fbbf24','stroke-width':3,fill:'none','stroke-linecap':'round'}, svg);
      flowLine.classList.add('wire-animated');
      txt('I_DS →', 310, 92, {fill:'#fbbf24','font-size':9,'font-style':'italic'}, svg);
    }

    // ─── Vgs arrow ───
    if (step >= 2) {
      const color = _gateHigh ? '#f59e0b' : '#9294a8';
      el('line', {x1:550,y1:43,x2:480,y2:43,stroke:color,'stroke-width':1.5,'stroke-dasharray':'4 3'}, svg);
      el('line', {x1:550,y1:20,x2:550,y2:60,stroke:color,'stroke-width':1.5}, svg);
      txt('Vgs', 570, 44, {fill:color,'font-size':10}, svg);
    }

    // ─── Step label ───
    const stepLabels = [
      'N-Channel MOSFET: Gate voltage controls drain-source current.',
      'Gate = 0V: Below threshold. No inversion layer. Device OFF.',
      `Gate voltage rising: Vgs = ${vgs.toFixed(1)}V → electrons accumulate under oxide.`,
      'Threshold voltage reached: inversion layer starts forming.',
      'Gate = HIGH (3V): Strong inversion. Channel fully formed. Device ON.',
      'As a digital switch: Gate HIGH = 1 (closed), Gate LOW = 0 (open).'
    ];
    if (step >= 1 && step <= 6) {
      txt(stepLabels[step-1], 310, 410, {fill:'#e8eaf6','font-size':10.5,'text-anchor':'middle'}, svg);
    }
  }

  /* ── Draw MOSFET switch symbol ── */
  function drawSymbol(svg, on) {
    const c = on ? '#43e97b' : '#ff4d6d';
    svg.innerHTML = '';
    // Body
    el('line', {x1:80,y1:70,x2:80,y2:70,stroke:c}, svg);
    // Gate line
    el('line', {x1:10,y1:70,x2:50,y2:70,stroke:'#9294a8','stroke-width':2}, svg);
    el('line', {x1:50,y1:50,x2:50,y2:90,stroke:'#9294a8','stroke-width':3}, svg);
    // Oxide gap
    el('line', {x1:58,y1:50,x2:58,y2:90,stroke:'#93c5fd','stroke-width':2.5}, svg);
    // Channel (body)
    el('line', {x1:66,y1:50,x2:66,y2:90,stroke:c,'stroke-width':2.5}, svg);
    // Source/Drain
    el('line', {x1:66,y1:55,x2:150,y2:55,stroke:'#06b6d4','stroke-width':2}, svg);
    el('line', {x1:66,y1:85,x2:150,y2:85,stroke:'#06b6d4','stroke-width':2}, svg);
    el('line', {x1:150,y1:55,x2:150,y2:85,stroke:'#06b6d4','stroke-width':2}, svg);
    // Arrow
    el('line', {x1:150,y1:70,x2:160,y2:70,stroke:'#06b6d4','stroke-width':2}, svg);
    if (on) {
      // Current arrow
      const flowLine = el('line', {x1:66,y1:55,x2:66,y2:85,stroke:'#fbbf24','stroke-width':3}, svg);
      flowLine.classList.add('element-pulse');
    }
    txt(on ? 'ON' : 'OFF', 120, 115, {fill:c,'font-size':13,'font-weight':'700'}, svg);
    txt('G', 22, 75, {fill:'#9294a8','font-size':11}, svg);
    txt('D', 152, 50, {fill:'#06b6d4','font-size':10,'text-anchor':'start'}, svg);
    txt('S', 152, 90, {fill:'#06b6d4','font-size':10,'text-anchor':'start'}, svg);
  }

  /* ── Step info texts ── */
  const STEP_INFO = [
    'MOSFET Overview: An N-channel MOSFET has three terminals — Gate (G), Source (S), and Drain (D). The gate voltage controls whether current flows from drain to source.',
    'Gate = 0V (OFF): No voltage on the gate means no inversion layer forms between source and drain. The depletion region blocks current. Ids = 0.',
    'Gate voltage rising: A positive gate voltage attracts electrons to the region beneath the gate oxide, beginning to form a conductive path (inversion layer).',
    'Threshold voltage (Vth ≈ 1V): Enough electrons have accumulated to form a continuous inversion layer. The transistor is at the edge of turning ON.',
    'Gate = HIGH (3V): Well above threshold. A strong inversion layer (channel) connects source to drain. Current Ids flows freely — transistor is fully ON.',
    'Digital switch abstraction: We use the MOSFET as a switch. Gate HIGH = switch closed = logic 1. Gate LOW = switch open = logic 0. This is the foundation of all digital logic!'
  ];

  /* ── Step render ── */
  function renderStep(step) {
    const svg = document.getElementById('transistor-svg');
    const symSvg = document.getElementById('mosfet-symbol-svg');
    if (!svg) return;

    let vgs = 0;
    if (step === 1 || step === 2) vgs = 0;
    if (step === 3) vgs = _currentVgs;
    if (step === 4) vgs = 1.0;
    if (step >= 5) vgs = _gateHigh ? 3.0 : 0.0;

    drawMOSFET(svg, step, vgs);
    if (symSvg) drawSymbol(symSvg, _gateHigh && step >= 5);

    if (_sim) _sim.setStepInfo(STEP_INFO[step - 1] || STEP_INFO[0]);

    // Update controls UI
    const statusEl = document.getElementById('transistor-status');
    const vgsEl    = document.getElementById('transistor-vgs');
    if (statusEl) {
      const isOn = _gateHigh && step >= 5;
      statusEl.textContent = isOn ? 'ON' : 'OFF';
      statusEl.className = 'status-badge ' + (isOn ? 'on' : 'off');
    }
    if (vgsEl) vgsEl.textContent = vgs.toFixed(1) + ' V';
  }

  /* ── Animate rising Vgs for step 3 ── */
  function animateRisingVgs() {
    if (_vgsAnim) clearInterval(_vgsAnim);
    _currentVgs = 0;
    _vgsAnim = setInterval(() => {
      _currentVgs = Math.min(3.0, _currentVgs + 0.1);
      renderStep(3);
      if (_currentVgs >= 1.0) {
        clearInterval(_vgsAnim);
        _vgsAnim = null;
      }
    }, 80);
  }

  /* ── init ── */
  function init(sim) {
    _sim = sim;

    // Gate toggle buttons
    const btnLow  = document.getElementById('transistor-low');
    const btnHigh = document.getElementById('transistor-high');
    const btnDep  = document.getElementById('transistor-depletion');

    if (btnLow) btnLow.addEventListener('click', () => {
      _gateHigh = false;
      btnLow.classList.add('active');
      btnHigh.classList.remove('active');
      renderStep(_step);
    });
    if (btnHigh) btnHigh.addEventListener('click', () => {
      _gateHigh = true;
      btnHigh.classList.add('active');
      btnLow.classList.remove('active');
      _step = 5;
      if (_sim) { _sim.currentStep = 5; _sim._updateUI(); }
      renderStep(_step);
    });
    if (btnDep) btnDep.addEventListener('click', () => {
      _showDepletion = !_showDepletion;
      btnDep.textContent = _showDepletion ? 'ON' : 'OFF';
      btnDep.classList.toggle('active', _showDepletion);
      renderStep(_step);
    });

    sim.on('layer-ready', function (d) {
      if (d.layer === 2) {
        _step = 1;
        _gateHigh = false;
        _showDepletion = true;
        sim.setTotalSteps(6);
        renderStep(1);
      }
    });

    sim.on('step-change', function (d) {
      if (d.layer === 2) {
        _step = d.step;
        if (d.step === 3) animateRisingVgs();
        else renderStep(d.step);
        // Update button state based on step
        if (d.step >= 5) {
          if (btnHigh) { btnHigh.classList.add('active'); btnLow && btnLow.classList.remove('active'); }
          _gateHigh = true;
        } else {
          if (btnLow) { btnLow.classList.add('active'); btnHigh && btnHigh.classList.remove('active'); }
          _gateHigh = false;
        }
      }
    });
  }

  window.Layer2Transistor = { init };
})();
