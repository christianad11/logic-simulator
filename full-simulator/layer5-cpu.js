/* layer5-cpu.js — CPU Components: 4-bit ALU + Register File */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let _sim;
  let _regs = [0b0011, 0b0101, 0b0010, 0b0000]; // R0–R3
  let _op   = 'ADD';
  let _step  = 1;
  let _animTimer = null;

  /* ── SVG helpers ── */
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, x, y, attrs, parent) {
    const e = el('text', Object.assign({x, y, fill:'#9294a8','font-size':11,'text-anchor':'middle','font-family':"'Segoe UI',sans-serif"}, attrs), parent);
    e.textContent = t; return e;
  }
  function box(svg, x, y, w, h, opts) {
    return el('rect', Object.assign({x, y, width:w, height:h, rx:opts&&opts.rx||6, fill:'#1a1d2e', stroke:'#2e3250','stroke-width':2}, opts||{}), svg);
  }
  function wire(svg, x1, y1, x2, y2, color, animated, sw) {
    const pts = (x1!==x2 && y1!==y2) ? `${x1},${y1} ${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}` : `${x1},${y1} ${x2},${y2}`;
    const e = el('polyline', {points:pts, stroke:color||'#2e3250', 'stroke-width':sw||2, fill:'none','stroke-linecap':'round','stroke-linejoin':'round'}, svg);
    if (animated) e.classList.add('wire-animated');
    return e;
  }
  function SC(v) { return v===1?'#43e97b':v===0?'#ff4d6d':'#9294a8'; }

  function toBin(v, bits) {
    return (v >>> 0).toString(2).padStart(bits, '0');
  }

  /* ── ALU compute ── */
  function aluCompute(a, b, op) {
    const mask = 0xF;
    let r = 0;
    if (op === 'ADD') r = (a + b) & mask;
    if (op === 'AND') r = a & b;
    if (op === 'OR')  r = a | b;
    return {
      result: r,
      zero:   r === 0 ? 1 : 0,
      carry:  (op === 'ADD' && (a + b) > 15) ? 1 : 0
    };
  }

  /* ── Layout constants ── */
  const RF = { x: 30, y: 60, w: 200, h: 280 };    // Register File
  const AL = { x: 380, y: 100, w: 160, h: 240 };   // ALU
  const REGS = ['R0','R1','R2','R3'];

  /* ── Draw the full CPU diagram ── */
  function draw(svg, step, highlightedElements) {
    svg.innerHTML = '';
    const HL = highlightedElements || {};

    // ── Register File ──
    const rfColor = HL.regfile ? '#6c63ff' : '#2e3250';
    box(svg, RF.x, RF.y, RF.w, RF.h, {stroke:rfColor,'stroke-width':HL.regfile?2.5:2});
    txt('Register File', RF.x + RF.w/2, RF.y - 10, {fill:rfColor,'font-size':12,'font-weight':'700'}, svg);

    const regH = (RF.h - 20) / 4;
    REGS.forEach((name, i) => {
      const ry = RF.y + 10 + i * regH;
      const rColor = HL[`reg${i}`] ? '#6c63ff' : '#2e3250';
      el('rect', {x:RF.x+8,y:ry,width:RF.w-16,height:regH-6,rx:5,fill:'#252840',stroke:rColor,'stroke-width':HL[`reg${i}`]?2:1.5}, svg);

      // Register name
      txt(name, RF.x+26, ry+regH/2+4, {fill:rColor,'font-size':11,'font-weight':'700','text-anchor':'middle'}, svg);

      // Bits display
      const binVal = toBin(_regs[i], 4);
      const bitX = RF.x + 50;
      for (let b = 0; b < 4; b++) {
        const bv = parseInt(binVal[b]);
        const bx = bitX + b * 22;
        el('rect', {x:bx,y:ry+4,width:18,height:regH-14,rx:3,fill:'#0f1117',stroke:bv?'#43e97b44':'#2e3250'}, svg);
        txt(binVal[b], bx+9, ry+regH/2+4, {fill:bv?'#43e97b':'#9294a8','font-size':11,'font-weight':'700'}, svg);
      }

      // Decimal value
      txt(`(${_regs[i]})`, RF.x+RF.w-16, ry+regH/2+4, {fill:'#9294a880','font-size':9,'text-anchor':'end'}, svg);
    });

    // ── ALU block (trapezoid) ──
    const ax = AL.x, ay = AL.y, aw = AL.w, ah = AL.h;
    const indent = 24;
    const aluPts = `${ax+indent},${ay} ${ax+aw-indent},${ay} ${ax+aw},${ay+ah} ${ax},${ay+ah}`;
    const aluColor = HL.alu ? '#ff6584' : '#2e3250';
    el('polygon', {points:aluPts, fill:'#1a1d2e', stroke:aluColor,'stroke-width':HL.alu?2.5:2}, svg);
    txt('ALU', ax+aw/2, ay+ah/2+4, {fill:aluColor,'font-size':14,'font-weight':'700'}, svg);

    // ALU op label
    const opColor = HL.op ? '#f59e0b' : '#9294a8';
    txt(_op, ax+aw/2, ay+ah/2+22, {fill:opColor,'font-size':11,'font-weight':'700'}, svg);

    // ALU labels: A, B inputs; Result output
    txt('A', ax-10, ay+ah*0.3+4, {fill:'#9294a8','font-size':10,'text-anchor':'end'}, svg);
    txt('B', ax-10, ay+ah*0.7+4, {fill:'#9294a8','font-size':10,'text-anchor':'end'}, svg);
    txt('Result', ax+aw+8, ay+ah/2+4, {fill:'#9294a8','font-size':10,'text-anchor':'start'}, svg);
    txt('OpCode', ax+aw/2, ay-12, {fill:opColor,'font-size':9}, svg);

    // ── Wires ──
    // R1 → ALU A
    const r1OutX = RF.x + RF.w;
    const r1Y = RF.y + 10 + 1 * ((RF.h-20)/4) + ((RF.h-20)/4)/2 - 4;
    const aluAY = ay + ah * 0.3;
    const wA_color = HL.busA ? '#6c63ff' : '#2e3250';
    wire(svg, r1OutX, r1Y, ax, aluAY, wA_color, HL.busA && HL.busA==='animated', 2.5);
    if (HL.busA) {
      txt(`R1=${toBin(_regs[1],4)}`, (r1OutX+ax)/2, r1Y - 8, {fill:wA_color,'font-size':9}, svg);
    }

    // R2 → ALU B
    const r2OutX = RF.x + RF.w;
    const r2Y = RF.y + 10 + 2 * ((RF.h-20)/4) + ((RF.h-20)/4)/2 - 4;
    const aluBY = ay + ah * 0.7;
    const wB_color = HL.busB ? '#6c63ff' : '#2e3250';
    wire(svg, r2OutX, r2Y, ax, aluBY, wB_color, HL.busB && HL.busB==='animated', 2.5);
    if (HL.busB) {
      txt(`R2=${toBin(_regs[2],4)}`, (r2OutX+ax)/2, r2Y + 14, {fill:wB_color,'font-size':9}, svg);
    }

    // Result → R0
    const resX = ax + aw;
    const resY = ay + ah / 2;
    const r0Y  = RF.y + 10 + 0 * ((RF.h-20)/4) + ((RF.h-20)/4)/2 - 4;
    const wR_color = HL.busResult ? '#43e97b' : '#2e3250';
    wire(svg, resX, resY, 650, resY, wR_color, HL.busResult==='animated', 2.5);
    wire(svg, 650, resY, 650, r0Y, wR_color, HL.busResult==='animated', 2.5);
    wire(svg, 650, r0Y, r1OutX, r0Y, wR_color, HL.busResult==='animated', 2.5);

    // Result value box (right of ALU)
    if (HL.result !== undefined) {
      const rv = HL.result;
      box(svg, 600, ay+ah/2-18, 90, 36, {stroke:'#43e97b'});
      txt(toBin(rv,4), 645, ay+ah/2+4, {fill:'#43e97b','font-size':13,'font-weight':'700'}, svg);
      txt(`(${rv})`, 645, ay+ah/2+18, {fill:'#43e97b88','font-size':9}, svg);
      txt('Result', 645, ay+ah/2-24, {fill:'#43e97b','font-size':9}, svg);
    }

    // Flags
    if (HL.flags !== undefined) {
      const { zero, carry } = HL.flags;
      box(svg, 600, ay+ah+20, 90, 50, {stroke:'#9294a8'});
      txt('Flags', 645, ay+ah+30, {fill:'#9294a8','font-size':9}, svg);
      txt(`Zero=${zero}  Carry=${carry}`, 645, ay+ah+52, {fill: zero ? '#43e97b' : '#9294a8','font-size':9,'font-weight':'700'}, svg);
    }

    // OpCode wire (top)
    wire(svg, ax+aw/2, 55, ax+aw/2, ay, opColor, false, 2);
    el('circle', {cx:ax+aw/2,cy:55,r:5,fill:opColor}, svg);

    // Operation inputs box
    box(svg, ax+aw/2-40, 20, 80, 35, {stroke:opColor});
    txt(_op, ax+aw/2, 41, {fill:opColor,'font-size':11,'font-weight':'700'}, svg);
    txt('OpCode', ax+aw/2, 16, {fill:'#9294a8','font-size':8}, svg);

    // Step label at bottom
    txt(STEP_INFO[Math.min(step,10)-1] ? '' : '', 400, 470, {fill:'#9294a8','font-size':10}, svg);

    // Ripple carry detail (step 8)
    if (HL.ripple) drawRippleCarry(svg, ax, ay, aw, ah);
  }

  function drawRippleCarry(svg, ax, ay, aw, ah) {
    const n = 4;
    const faW = 35, faH = 30, gap = 8;
    const totalW = n * faW + (n-1) * gap;
    const startX = ax + (aw - totalW) / 2;
    const fY = ay + ah / 2 - 15;

    for (let i = 0; i < n; i++) {
      const fx = startX + i * (faW + gap);
      el('rect', {x:fx,y:fY,width:faW,height:faH,rx:4,fill:'#252840',stroke:'#6c63ff','stroke-width':1.5}, svg);
      txt('FA', fx+faW/2, fY+faH/2+4, {fill:'#6c63ff','font-size':8}, svg);
      txt(`b${3-i}`, fx+faW/2, fY-5, {fill:'#9294a8','font-size':7}, svg);
      if (i > 0) {
        el('line', {x1:fx-gap,y1:fY+faH/2,x2:fx,y2:fY+faH/2,stroke:'#f59e0b','stroke-width':1.5}, svg);
        txt('c', fx-gap/2, fY+faH/2-4, {fill:'#f59e0b','font-size':7}, svg);
      }
    }
    txt('← Ripple carry propagation', startX+totalW/2, fY+faH+16, {fill:'#f59e0b','font-size':9}, svg);
  }

  /* ── Step info texts ── */
  const STEP_INFO = [
    'CPU Overview: A 4-bit CPU with a register file (R0–R3) and an ALU. The ALU performs arithmetic and logic operations on values stored in registers.',
    'Register File: 4 registers (R0–R3), each storing 4 bits. Initial values: R0=0011(3), R1=0101(5), R2=0010(2), R3=0000(0). Registers are the CPU\'s fastest storage.',
    'ALU Block: The Arithmetic Logic Unit is the computational heart. Built from the adders and gates you saw in layers 3 and 4. It can ADD, AND, and OR 4-bit values.',
    'ALU Internals: 4 Full Adder stages wired in ripple-carry configuration handle addition. AND/OR paths use parallel gate arrays.',
    'Reading R1: R1=0101 (decimal 5) is selected from the register file and driven onto the A-input bus of the ALU.',
    'Reading R2: R2=0010 (decimal 2) is selected and driven onto the B-input bus. Both operands are now at the ALU inputs.',
    `Operation Code: The ${_op} operation is selected. This sets the ALU control signals to route signals through the correct computational path.`,
    'Executing ADD: The 4 full adder stages compute the sum bit-by-bit. Each stage waits for the carry-out from the previous — ripple carry propagation.',
    'Result Ready: Result = 0111 (decimal 7). Zero flag = 0 (result is non-zero). Carry flag = 0 (no overflow beyond 4 bits for 5+2).',
    'Writeback: Result 0111 travels back along the result bus to be written into the destination register R0. R0 is updated from 0011 to 0111.'
  ];

  /* ── Animate ADD ── */
  function runAnimation(svg) {
    if (_animTimer) clearTimeout(_animTimer);
    const alu = aluCompute(_regs[1], _regs[2], _op);
    const steps = [
      { delay:0,   hl:{regfile:true, reg1:true} },
      { delay:600, hl:{regfile:true, reg1:true, busA:true} },
      { delay:1200, hl:{regfile:true, reg1:true, reg2:true, busA:true, busB:true} },
      { delay:1800, hl:{regfile:true, reg1:true, reg2:true, busA:true, busB:true, alu:true, op:true, ripple:true} },
      { delay:2800, hl:{regfile:true, reg1:true, reg2:true, busA:true, busB:true, alu:true, op:true, result:alu.result} },
      { delay:3500, hl:{regfile:true, reg0:true, reg1:true, reg2:true, busA:true, busB:true, alu:true, result:alu.result, busResult:true, flags:alu} },
      { delay:4500, hl:{regfile:true, reg0:true, result:alu.result, flags:alu} }
    ];

    steps.forEach(({delay, hl}, i) => {
      _animTimer = setTimeout(() => {
        // On last step, update R0
        if (i === steps.length - 1) {
          _regs[0] = alu.result;
          updateRegDisplay();
          if (_sim) _sim.setStepInfo(`Done! R0 = R1 ${_op} R2 = ${_regs[1]} ${_op} ${_regs[2]} = ${alu.result} (${toBin(alu.result,4)})`);
        } else {
          if (_sim) _sim.setStepInfo(STEP_INFO[Math.min(i+4, STEP_INFO.length-1)]);
        }
        draw(svg, _step, hl);
      }, delay);
    });
  }

  /* ── Update register display panel ── */
  function updateRegDisplay() {
    const cont = document.getElementById('reg-display');
    if (!cont) return;
    cont.innerHTML = '';
    REGS.forEach((name, i) => {
      const row = document.createElement('div');
      row.className = 'reg-row';
      row.innerHTML = `<span class="reg-name">${name}</span>
        <div class="reg-bits" id="reg-bits-${i}"></div>
        <span class="reg-val">${_regs[i]}</span>`;
      cont.appendChild(row);

      const bitsDiv = document.getElementById(`reg-bits-${i}`);
      const binVal = toBin(_regs[i], 4);
      for (let b = 0; b < 4; b++) {
        const bit = document.createElement('div');
        bit.className = 'reg-bit ' + (binVal[b]==='1'?'b1':'');
        bit.textContent = binVal[b];
        bit.title = `Toggle bit ${3-b}`;
        const bi = b, ri = i;
        bit.addEventListener('click', () => {
          const mask = 1 << (3 - bi);
          _regs[ri] ^= mask;
          updateRegDisplay();
          draw(document.getElementById('cpu-svg'), _step, {});
        });
        bitsDiv.appendChild(bit);
      }
    });
  }

  function init(sim) {
    _sim = sim;

    // Operation buttons
    document.querySelectorAll('[data-op]').forEach(btn => {
      if (!btn.closest('#cpu-op-card')) return;
      btn.addEventListener('click', () => {
        _op = btn.dataset.op;
        document.querySelectorAll('[data-op]').forEach(b => {
          if (b.closest('#cpu-op-card')) b.classList.toggle('active', b.dataset.op === _op);
        });
        draw(document.getElementById('cpu-svg'), _step, {});
      });
    });

    // Run ALU button
    const runBtn = document.getElementById('cpu-run');
    if (runBtn) runBtn.addEventListener('click', () => {
      const svg = document.getElementById('cpu-svg');
      const resCard = document.getElementById('cpu-result-card');
      const resDiv  = document.getElementById('cpu-result');
      if (resCard) resCard.style.display = '';
      runAnimation(svg);
      const alu = aluCompute(_regs[1], _regs[2], _op);
      if (resDiv) {
        resDiv.innerHTML = `
          <div class="output-line"><span class="output-key">Result</span><span class="output-val high">${toBin(alu.result,4)} (${alu.result})</span></div>
          <div class="output-line"><span class="output-key">Zero</span><span class="output-val ${alu.zero?'high':'low'}">${alu.zero}</span></div>
          <div class="output-line"><span class="output-key">Carry</span><span class="output-val ${alu.carry?'high':'low'}">${alu.carry}</span></div>
        `;
      }
    });

    sim.on('layer-ready', function (d) {
      if (d.layer === 5) {
        _step = 1;
        _regs = [0b0011, 0b0101, 0b0010, 0b0000];
        sim.setTotalSteps(10);
        updateRegDisplay();
        const svg = document.getElementById('cpu-svg');
        if (svg) draw(svg, 1, {});
        sim.setStepInfo(STEP_INFO[0]);
        const resCard = document.getElementById('cpu-result-card');
        if (resCard) resCard.style.display = 'none';
      }
    });

    sim.on('step-change', function (d) {
      if (d.layer === 5) {
        _step = d.step;
        const svg = document.getElementById('cpu-svg');
        if (!svg) return;
        sim.setStepInfo(STEP_INFO[Math.min(d.step, STEP_INFO.length) - 1]);

        const hlMap = [
          {},
          {regfile:true},
          {alu:true},
          {alu:true, ripple:true},
          {regfile:true, reg1:true, busA:true},
          {regfile:true, reg1:true, reg2:true, busA:true, busB:true},
          {alu:true, op:true},
          {alu:true, op:true, ripple:true},
          {alu:true, result: aluCompute(_regs[1],_regs[2],_op).result, flags: aluCompute(_regs[1],_regs[2],_op)},
          {regfile:true, reg0:true, busResult:true, result: aluCompute(_regs[1],_regs[2],_op).result}
        ];
        draw(svg, d.step, hlMap[d.step - 1] || {});
      }
    });
  }

  window.Layer5CPU = { init };
})();
