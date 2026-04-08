/* layer6-execution.js — Instruction Execution Pipeline */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let _sim;
  let _op  = 'ADD';
  let _r1  = 5;    // decimal
  let _r2  = 2;
  let _step = 1;

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
  function box(svg, x, y, w, h, color, opts) {
    return el('rect', Object.assign({x, y, width:w, height:h, rx:opts&&opts.rx||6, fill:'#1a1d2e', stroke:color||'#2e3250','stroke-width':2}, opts||{}), svg);
  }
  function wire(svg, x1, y1, x2, y2, color, animated, sw) {
    const mid = (x1+x2)/2;
    const pts = (x1!==x2 && y1!==y2) ? `${x1},${y1} ${mid},${y1} ${mid},${y2} ${x2},${y2}` : `${x1},${y1} ${x2},${y2}`;
    const e = el('polyline', {points:pts,stroke:color||'#2e3250','stroke-width':sw||2,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'}, svg);
    if (animated) e.classList.add('wire-animated');
    return e;
  }
  function arrowTip(svg, x, y, dir, color) {
    const d = dir === 'right' ? `M ${x-8},${y-5} L ${x},${y} L ${x-8},${y+5}`
            : dir === 'left'  ? `M ${x+8},${y-5} L ${x},${y} L ${x+8},${y+5}`
            : dir === 'down'  ? `M ${x-5},${y-8} L ${x},${y} L ${x+5},${y-8}`
            : `M ${x-5},${y+8} L ${x},${y} L ${x+5},${y+8}`;
    el('path', {d, fill:'none', stroke:color||'#6c63ff','stroke-width':2,'stroke-linecap':'round'}, svg);
  }

  function toBin(v, bits) { return (v>>>0).toString(2).padStart(bits,'0'); }
  function toHex(v) { return '0x' + (v>>>0).toString(16).padStart(2,'0').toUpperCase(); }

  function compute() {
    const mask = 0xF;
    let r = 0;
    if (_op==='ADD') r = (_r1+_r2)&mask;
    if (_op==='AND') r = _r1&_r2;
    if (_op==='OR')  r = _r1|_r2;
    return r;
  }

  /* ── Layout ── */
  const PC   = {x:20,  y:60, w:80,  h:50};
  const IMEM = {x:20,  y:175,w:80,  h:60};
  const IR   = {x:20,  y:295,w:80,  h:50};
  const DEC  = {x:200, y:155,w:120, h:80};
  const RFILE= {x:380, y:80, w:140, h:160};
  const ALU  = {x:600, y:160,w:110, h:120};
  const WB   = {x:380, y:290,w:140, h:60};

  /* ── Component colors by step ── */
  function componentColor(comp, step) {
    // Returns color based on which pipeline stage we are in
    if (step >= 1 && step <= 3) {
      if (comp==='pc')    return step>=1?'#f59e0b':'#2e3250';
      if (comp==='imem')  return step>=2?'#f59e0b':'#2e3250';
      if (comp==='ir')    return step>=3?'#06b6d4':'#2e3250';
    }
    if (step >= 4 && step <= 6) {
      if (comp==='dec')   return '#6c63ff';
      if (comp==='ir')    return step>=4?'#6c63ff':'#2e3250';
      if (comp==='rfile') return step>=6?'#6c63ff':'#2e3250';
    }
    if (step >= 7 && step <= 9) {
      if (comp==='alu')   return '#ff6584';
      if (comp==='rfile') return step>=7?'#2e3250':'#2e3250';
    }
    if (step >= 10) {
      if (comp==='wb')    return '#43e97b';
      if (comp==='rfile') return '#43e97b';
    }
    return '#2e3250';
  }

  function hl(comp, step) { return componentColor(comp,step) !== '#2e3250'; }

  /* ── Main draw ── */
  function draw(svg, step) {
    svg.innerHTML = '';

    const pcC  = componentColor('pc',step);
    const imC  = componentColor('imem',step);
    const irC  = componentColor('ir',step);
    const decC = componentColor('dec',step);
    const rfC  = componentColor('rfile',step);
    const aluC = componentColor('alu',step);
    const wbC  = componentColor('wb',step);

    const res = compute();
    const r1b = toBin(_r1,4), r2b = toBin(_r2,4), resb = toBin(res,4);

    // ── PC ──
    box(svg, PC.x, PC.y, PC.w, PC.h, pcC);
    txt('PC', PC.x+PC.w/2, PC.y-8, {fill:pcC,'font-size':10,'font-weight':'700'}, svg);
    const pcVal = step>=12 ? '0x04' : '0x00';
    txt(pcVal, PC.x+PC.w/2, PC.y+PC.h/2+5, {fill:pcC,'font-size':13,'font-weight':'700'}, svg);

    // PC → address bus → Instruction Memory
    const pcBusColor = step>=2?'#f59e0b':'#2e3250';
    wire(svg, PC.x+PC.w/2, PC.y+PC.h, PC.x+PC.w/2, IMEM.y, pcBusColor, step===2, 2.5);
    if (step>=2) {
      arrowTip(svg, PC.x+PC.w/2, IMEM.y, 'down', pcBusColor);
      txt('addr bus', PC.x+PC.w/2+28, (PC.y+PC.h+IMEM.y)/2, {fill:pcBusColor,'font-size':9}, svg);
    }

    // ── Instruction Memory ──
    box(svg, IMEM.x, IMEM.y, IMEM.w, IMEM.h, imC);
    txt('Instruction', IMEM.x+IMEM.w/2, IMEM.y+20, {fill:imC,'font-size':10,'font-weight':'700'}, svg);
    txt('Memory', IMEM.x+IMEM.w/2, IMEM.y+34, {fill:imC,'font-size':10}, svg);
    if (step>=3) {
      txt('[0x00]', IMEM.x+IMEM.w/2, IMEM.y+50, {fill:imC,'font-size':9}, svg);
    }

    // Instruction memory → IR (data bus)
    const dataBusColor = step>=3?'#06b6d4':'#2e3250';
    wire(svg, IMEM.x+IMEM.w/2, IMEM.y+IMEM.h, IMEM.x+IMEM.w/2, IR.y, dataBusColor, step===3, 2.5);
    if (step>=3) arrowTip(svg, IMEM.x+IMEM.w/2, IR.y, 'down', dataBusColor);

    // ── Instruction Register (IR) ──
    box(svg, IR.x, IR.y, IR.w, IR.h, irC);
    txt('IR', IR.x+IR.w/2, IR.y-8, {fill:irC,'font-size':10,'font-weight':'700'}, svg);
    if (step>=3) {
      // Show instruction bits: opcode|Rd|Rs1|Rs2
      const opBit = _op==='ADD'?'00':_op==='AND'?'01':'10';
      txt(`${opBit}|00|01|10`, IR.x+IR.w/2, IR.y+IR.h/2+4, {fill:irC,'font-size':9.5,'font-weight':'700'}, svg);
    } else {
      txt('—', IR.x+IR.w/2, IR.y+IR.h/2+4, {fill:'#2e3250','font-size':13}, svg);
    }

    // IR → Decoder
    const irDecColor = step>=4?'#6c63ff':'#2e3250';
    wire(svg, IR.x+IR.w, IR.y+IR.h/2, DEC.x, DEC.y+DEC.h/2, irDecColor, step===4, 2.5);
    if (step>=4) arrowTip(svg, DEC.x, DEC.y+DEC.h/2, 'right', irDecColor);

    // ── Decoder ──
    box(svg, DEC.x, DEC.y, DEC.w, DEC.h, decC);
    txt('Control', DEC.x+DEC.w/2, DEC.y+25, {fill:decC,'font-size':10,'font-weight':'700'}, svg);
    txt('Unit', DEC.x+DEC.w/2, DEC.y+41, {fill:decC,'font-size':10}, svg);
    if (step>=5) {
      txt(`ALU_OP=${_op}`, DEC.x+DEC.w/2, DEC.y+58, {fill:decC,'font-size':9}, svg);
      txt('Rd=R0, Rs1=R1', DEC.x+DEC.w/2, DEC.y+72, {fill:decC,'font-size':8.5}, svg);
    }

    // Decoder → Register File (read select)
    const decRfColor = step>=6?'#6c63ff':'#2e3250';
    wire(svg, DEC.x+DEC.w, DEC.y+DEC.h/2, RFILE.x, RFILE.y+RFILE.h/2-30, decRfColor, step===6, 2);
    if (step>=6) arrowTip(svg, RFILE.x, RFILE.y+RFILE.h/2-30, 'right', decRfColor);

    // Decoder → ALU (opcode)
    const decAluColor = step>=7?'#f59e0b':'#2e3250';
    wire(svg, DEC.x+DEC.w/2, DEC.y, DEC.x+DEC.w/2, DEC.y-30, decAluColor, false, 1.5);
    wire(svg, DEC.x+DEC.w/2, DEC.y-30, ALU.x+ALU.w/2, DEC.y-30, decAluColor, step===7, 1.5);
    wire(svg, ALU.x+ALU.w/2, DEC.y-30, ALU.x+ALU.w/2, ALU.y, decAluColor, step===7, 1.5);
    if (step>=7) {
      txt(_op, (DEC.x+DEC.w/2+ALU.x+ALU.w/2)/2, DEC.y-36, {fill:decAluColor,'font-size':9,'font-weight':'700'}, svg);
    }

    // ── Register File ──
    box(svg, RFILE.x, RFILE.y, RFILE.w, RFILE.h, rfC);
    txt('Register File', RFILE.x+RFILE.w/2, RFILE.y-10, {fill:rfC,'font-size':10,'font-weight':'700'}, svg);
    const regvals = [
      step>=11 ? res : 0,
      _r1, _r2, 0
    ];
    ['R0','R1','R2','R3'].forEach((rn, i) => {
      const ry = RFILE.y+14+i*34;
      const rc = (i===1&&step>=6)?'#6c63ff':(i===2&&step>=6)?'#6c63ff':(i===0&&step>=10)?'#43e97b':rfC;
      el('rect', {x:RFILE.x+8,y:ry,width:RFILE.w-16,height:28,rx:4,fill:'#252840',stroke:rc,'stroke-width':rc!==rfC?2:1}, svg);
      txt(rn, RFILE.x+22, ry+18, {fill:rc,'font-size':10,'font-weight':'700','text-anchor':'middle'}, svg);
      const bv = toBin(regvals[i],4);
      txt(bv, RFILE.x+RFILE.w/2+8, ry+18, {fill:rc,'font-size':11,'font-weight':'700','font-family':'Consolas,monospace'}, svg);
      txt(`(${regvals[i]})`, RFILE.x+RFILE.w-10, ry+18, {fill:rc+'88','font-size':8,'text-anchor':'end'}, svg);
    });

    // Register file → ALU (buses A and B)
    const busAColor = step>=7?'#6c63ff':'#2e3250';
    const busBColor = step>=7?'#6c63ff':'#2e3250';
    wire(svg, RFILE.x+RFILE.w, RFILE.y+40, ALU.x, ALU.y+ALU.h*0.3, busAColor, step===7, 2.5);
    if (step>=7) {
      arrowTip(svg, ALU.x, ALU.y+ALU.h*0.3, 'right', busAColor);
      txt(`A=${r1b}`, (RFILE.x+RFILE.w+ALU.x)/2, RFILE.y+34, {fill:busAColor,'font-size':9}, svg);
    }
    wire(svg, RFILE.x+RFILE.w, RFILE.y+100, ALU.x, ALU.y+ALU.h*0.7, busBColor, step===7, 2.5);
    if (step>=7) {
      arrowTip(svg, ALU.x, ALU.y+ALU.h*0.7, 'right', busBColor);
      txt(`B=${r2b}`, (RFILE.x+RFILE.w+ALU.x)/2, RFILE.y+108, {fill:busBColor,'font-size':9}, svg);
    }

    // ── ALU ──
    const alux=ALU.x,aluy=ALU.y,aluw=ALU.w,aluh=ALU.h,ind=20;
    const aluPts = `${alux+ind},${aluy} ${alux+aluw-ind},${aluy} ${alux+aluw},${aluy+aluh} ${alux},${aluy+aluh}`;
    el('polygon', {points:aluPts,fill:'#1a1d2e',stroke:aluC,'stroke-width':aluC!=='#2e3250'?2.5:2}, svg);
    txt('ALU', alux+aluw/2, aluy+aluh/2+4, {fill:aluC,'font-size':13,'font-weight':'700'}, svg);
    if (step>=8) {
      txt(_op, alux+aluw/2, aluy+aluh/2+20, {fill:'#f59e0b','font-size':10,'font-weight':'700'}, svg);
    }
    if (step>=9) {
      txt(resb, alux+aluw/2, aluy+aluh/2-12, {fill:'#43e97b','font-size':11,'font-weight':'700','font-family':'Consolas,monospace'}, svg);
    }

    // ALU → result
    const resColor = step>=9?'#43e97b':'#2e3250';
    wire(svg, ALU.x+ALU.w, ALU.y+ALU.h/2, ALU.x+ALU.w+60, ALU.y+ALU.h/2, resColor, step===9, 2.5);
    if (step>=9) {
      arrowTip(svg, ALU.x+ALU.w+60, ALU.y+ALU.h/2, 'right', resColor);
      box(svg, ALU.x+ALU.w+60, ALU.y+ALU.h/2-18, 80, 36, '#43e97b');
      txt(resb, ALU.x+ALU.w+100, ALU.y+ALU.h/2+5, {fill:'#43e97b','font-size':13,'font-weight':'700','font-family':'Consolas,monospace'}, svg);
      txt(`(${res})`, ALU.x+ALU.w+100, ALU.y+ALU.h/2+20, {fill:'#43e97b88','font-size':8}, svg);
    }

    // Result → writeback → R0
    const wbColor = step>=10?'#43e97b':'#2e3250';
    wire(svg, ALU.x+ALU.w+100, ALU.y+ALU.h/2, ALU.x+ALU.w+100, WB.y+WB.h/2, wbColor, step===10, 2.5);
    wire(svg, ALU.x+ALU.w+100, WB.y+WB.h/2, WB.x+WB.w, WB.y+WB.h/2, wbColor, step===10, 2.5);

    // ── Writeback box ──
    box(svg, WB.x, WB.y, WB.w, WB.h, wbColor);
    txt('Write Back', WB.x+WB.w/2, WB.y+WB.h/2+4, {fill:wbColor,'font-size':10,'font-weight':'700'}, svg);
    if (step>=10) {
      txt('→ R0', WB.x+WB.w/2, WB.y+WB.h/2+18, {fill:wbColor,'font-size':9}, svg);
    }
    wire(svg, WB.x, WB.y+WB.h/2, RFILE.x+RFILE.w, RFILE.y+12, wbColor, step===11, 2.5);
    if (step>=11) arrowTip(svg, RFILE.x+RFILE.w, RFILE.y+12, 'right', wbColor);

    // PC increment arrow (step 12)
    if (step >= 12) {
      wire(svg, PC.x+PC.w/2, PC.y, PC.x+PC.w/2, PC.y-20, '#98d843', true, 2);
      txt('PC+4', PC.x+PC.w/2, PC.y-26, {fill:'#98d843','font-size':9,'font-weight':'700'}, svg);
    }

    // ── Bottom instruction display ──
    const instrColor = '#e8eaf6';
    txt(`Instruction: ${_op} R0, R1, R2`, 400, 415, {fill:instrColor,'font-size':12,'font-weight':'700','text-anchor':'middle'}, svg);
    txt(`R1=${toBin(_r1,4)}(${_r1})  R2=${toBin(_r2,4)}(${_r2})  →  R0=${step>=11?toBin(res,4):'????'}(${step>=11?res:'?'})`, 400, 432, {fill:'#9294a8','font-size':10,'text-anchor':'middle'}, svg);

    // Fetch bracket
    if (step<=3) {
      el('line', {x1:5,y1:55,x2:5,y2:360,stroke:'#f59e0b','stroke-width':2,'stroke-dasharray':'3 4'}, svg);
      txt('Fetch', 14, 200, {fill:'#f59e0b','font-size':9,'writing-mode':'tb'}, svg);
    }
  }

  /* ── Pipeline stage tracker ── */
  function updatePipeline(step) {
    const stages = {
      'ps-fetch':     [1,2,3],
      'ps-decode':    [4,5,6],
      'ps-execute':   [7,8,9],
      'ps-writeback': [10,11,12]
    };
    for (const [id, range] of Object.entries(stages)) {
      const el2 = document.getElementById(id);
      if (el2) el2.classList.toggle('active', step >= range[0] && step <= range[2]);
    }
  }

  /* ── Step info texts ── */
  function stepInfo(step) {
    const res = compute();
    const r1b = toBin(_r1,4), r2b = toBin(_r2,4), resb = toBin(res,4);
    const opBit = _op==='ADD'?'00':_op==='AND'?'01':'10';
    return [
      `FETCH Stage (1/3): Program Counter (PC) = 0x00. The PC holds the address of the next instruction to execute.`,
      `FETCH Stage (2/3): PC drives address 0x00 onto the address bus. Instruction Memory begins reading that location.`,
      `FETCH Stage (3/3): Instruction bits arrive: [${opBit}|00|01|10] = opcode|Rd=R0|Rs1=R1|Rs2=R2. Stored in Instruction Register (IR).`,
      `DECODE Stage (1/3): The Control Unit reads the IR and splits it into fields. Opcode ${opBit} → ${_op} operation.`,
      `DECODE Stage (2/3): Control signals generated: ALU_OP=${_op}, ReadReg1=R1, ReadReg2=R2, WriteReg=R0.`,
      `DECODE Stage (3/3): Register file reads R1=${r1b}(${_r1}) and R2=${r2b}(${_r2}). Both values travel to ALU inputs.`,
      `EXECUTE Stage (1/3): ALU receives operands — A=${r1b} (${_r1}) from R1, B=${r2b} (${_r2}) from R2.`,
      `EXECUTE Stage (2/3): ALU computes ${_r1} ${_op} ${_r2}. ${_op==='ADD'?'Ripple carry propagates through 4 full adder stages.':'Gate arrays compute bitwise operation.'}`,
      `EXECUTE Stage (3/3): Result = ${resb} (${res}). Zero flag = ${res===0?1:0}. Carry flag = ${_op==='ADD'&&(_r1+_r2)>15?1:0}.`,
      `WRITEBACK Stage (1/3): Result ${resb} travels from ALU output back along the result bus to the register file.`,
      `WRITEBACK Stage (2/3): R0 is updated → R0 = ${resb} (${res}). The instruction ${_op} R0, R1, R2 is complete!`,
      `WRITEBACK Stage (3/3): PC increments to 0x04, ready for the next instruction. Full cycle complete: R0 = R1 ${_op} R2 = ${_r1} ${_op_sym()} ${_r2} = ${res}.`
    ][step-1] || '';
  }

  function _op_sym() {
    if (_op==='ADD') return '+';
    if (_op==='AND') return '&';
    if (_op==='OR')  return '|';
  }

  /* ── init ── */
  function init(sim) {
    _sim = sim;

    // Op buttons
    document.querySelectorAll('[data-execop]').forEach(btn => {
      btn.addEventListener('click', () => {
        _op = btn.dataset.execop;
        document.querySelectorAll('[data-execop]').forEach(b => b.classList.toggle('active', b.dataset.execop===_op));
        // Update instruction label
        const lbl = document.querySelector('#layer-6 .canvas-label code');
        if (lbl) lbl.textContent = `${_op} R0, R1, R2`;
        draw(document.getElementById('execution-svg'), _step);
        if (_sim) _sim.setStepInfo(stepInfo(_step));
      });
    });

    // R1/R2 presets
    const r1Input = document.getElementById('exec-r1');
    const r2Input = document.getElementById('exec-r2');
    if (r1Input) r1Input.addEventListener('input', () => {
      _r1 = Math.max(0, Math.min(15, parseInt(r1Input.value)||0));
      draw(document.getElementById('execution-svg'), _step);
    });
    if (r2Input) r2Input.addEventListener('input', () => {
      _r2 = Math.max(0, Math.min(15, parseInt(r2Input.value)||0));
      draw(document.getElementById('execution-svg'), _step);
    });

    // Reset
    const resetBtn = document.getElementById('exec-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      _step = 1;
      if (_sim) { _sim.currentStep = 1; _sim._updateUI(); }
      draw(document.getElementById('execution-svg'), 1);
      updatePipeline(1);
      if (_sim) _sim.setStepInfo(stepInfo(1));
      const resCard = document.getElementById('exec-result-card');
      if (resCard) resCard.style.display = 'none';
    });

    sim.on('layer-ready', function (d) {
      if (d.layer === 6) {
        _step = 1;
        _op = 'ADD'; _r1 = 5; _r2 = 2;
        sim.setTotalSteps(12);
        draw(document.getElementById('execution-svg'), 1);
        updatePipeline(1);
        sim.setStepInfo(stepInfo(1));
        const resCard = document.getElementById('exec-result-card');
        if (resCard) resCard.style.display = 'none';
        // Sync op buttons
        document.querySelectorAll('[data-execop]').forEach(b => b.classList.toggle('active', b.dataset.execop==='ADD'));
        const r1El = document.getElementById('exec-r1');
        const r2El = document.getElementById('exec-r2');
        if (r1El) r1El.value = 5;
        if (r2El) r2El.value = 2;
      }
    });

    sim.on('step-change', function (d) {
      if (d.layer === 6) {
        _step = d.step;
        draw(document.getElementById('execution-svg'), d.step);
        updatePipeline(d.step);
        if (_sim) _sim.setStepInfo(stepInfo(d.step));

        // Show result when writeback starts
        if (d.step >= 11) {
          const resCard = document.getElementById('exec-result-card');
          const resDiv  = document.getElementById('exec-result');
          if (resCard) resCard.style.display = '';
          if (resDiv) {
            const res = compute();
            resDiv.innerHTML = `
              <div class="output-line"><span class="output-key">R0 =</span><span class="output-val high">${toBin(res,4)} (${res})</span></div>
              <div class="output-line"><span class="output-key">R1 ${_op_sym()} R2</span><span class="output-val high">${_r1} ${_op_sym()} ${_r2} = ${res}</span></div>
            `;
          }
        }
      }
    });
  }

  window.Layer6Execution = { init };
})();
