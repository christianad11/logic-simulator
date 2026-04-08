/* layer1-physics.js — Semiconductor Physics (Canvas) */
(function () {
  let _sim;
  let _canvas, _ctx;
  let _rafId = null;
  let _active = false;
  let _step = 1;
  let _voltage = 0;         // -3 to +3
  let _showFieldLines = true;
  let _particles = [];      // {x,y,vx,vy,life,decay,color,r,type}
  let _lastTime = 0;
  let _spawnTimer = 0;

  /* ── Particle helpers ── */
  function spawnParticle(x, y, vx, vy, color, type) {
    _particles.push({
      x, y, vx, vy, color,
      r: type === 'electron' ? 4 : 5,
      life: 1.0,
      decay: 0.005 + Math.random() * 0.004,
      type
    });
  }

  function tickParticles(dt) {
    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.life -= p.decay;
      if (p.life <= 0) _particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of _particles) {
      _ctx.save();
      _ctx.globalAlpha = Math.max(0, p.life);
      _ctx.shadowColor = p.color;
      _ctx.shadowBlur = 6;
      _ctx.beginPath();
      _ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      _ctx.fillStyle = p.color;
      _ctx.fill();
      _ctx.restore();
    }
  }

  /* ── Canvas drawing ── */
  function drawFrame(timestamp) {
    if (!_active) return;
    const dt = Math.min(timestamp - _lastTime, 50);
    _lastTime = timestamp;
    _spawnTimer += dt;

    const W = _canvas.width;
    const H = _canvas.height;
    _ctx.clearRect(0, 0, W, H);

    // Determine zone widths
    const mid     = W / 2;
    const depW    = computeDepletionWidth(W);
    const depLeft = mid - depW / 2;
    const depRight= mid + depW / 2;

    // ── Background regions ──
    if (_step >= 2) {
      // P-type region (left)
      const pg = _ctx.createLinearGradient(0, 0, depLeft, 0);
      pg.addColorStop(0, '#2d0f0f');
      pg.addColorStop(1, '#3b1a1a');
      _ctx.fillStyle = pg;
      _ctx.fillRect(0, 0, depLeft, H);

      // N-type region (right)
      const ng = _ctx.createLinearGradient(depRight, 0, W, 0);
      ng.addColorStop(0, '#1a2a3b');
      ng.addColorStop(1, '#0f1a2d');
      _ctx.fillStyle = ng;
      _ctx.fillRect(depRight, 0, W - depRight, H);
    } else {
      // Intrinsic silicon
      _ctx.fillStyle = '#1a1d2e';
      _ctx.fillRect(0, 0, W, H);
    }

    // Depletion zone
    if (_step >= 4 && depW > 0) {
      const dg = _ctx.createLinearGradient(depLeft, 0, depRight, 0);
      dg.addColorStop(0, 'rgba(124,58,237,0.12)');
      dg.addColorStop(0.5, 'rgba(124,58,237,0.25)');
      dg.addColorStop(1, 'rgba(124,58,237,0.12)');
      _ctx.fillStyle = dg;
      _ctx.fillRect(depLeft, 0, depW, H);

      // Depletion zone border lines
      _ctx.strokeStyle = 'rgba(124,58,237,0.6)';
      _ctx.lineWidth = 1.5;
      _ctx.setLineDash([4, 6]);
      _ctx.beginPath(); _ctx.moveTo(depLeft, 0);  _ctx.lineTo(depLeft, H);  _ctx.stroke();
      _ctx.beginPath(); _ctx.moveTo(depRight, 0); _ctx.lineTo(depRight, H); _ctx.stroke();
      _ctx.setLineDash([]);
    }

    // ── Silicon lattice (step 1) ──
    if (_step === 1) {
      drawLattice(W, H);
    }

    // ── Fixed ions ──
    if (_step >= 4) {
      drawFixedIons(depLeft, depRight, H, mid);
    }

    // ── Region labels ──
    if (_step >= 2) {
      const lx = depLeft / 2, rx = (depRight + W) / 2;
      drawLabel(_ctx, 'P-type', lx, 28, '#f87171', 14);
      drawLabel(_ctx, 'N-type', rx, 28, '#60a5fa', 14);
      if (_step >= 3) {
        drawLabel(_ctx, '(holes  h⁺)', lx, 48, '#f8717188', 11);
        drawLabel(_ctx, '(electrons  e⁻)', rx, 48, '#60a5fa88', 11);
      }
    }

    // ── Field lines ──
    if (_showFieldLines && _step >= 5 && depW > 4) {
      drawFieldLines(depLeft, depRight, H);
    }

    // ── Particles ──
    if (_step >= 2) {
      spawnParticlesForStep(dt, depLeft, depRight, W, H, mid);
    }
    tickParticles(dt);
    drawParticles();

    // ── Bias voltage indicator ──
    if (_step >= 6 || _step === 7) {
      drawVoltageIndicator(W, H);
    }

    _rafId = requestAnimationFrame(drawFrame);
  }

  function drawLattice(W, H) {
    const spacing = 36;
    const offsetX = (W % spacing) / 2;
    const offsetY = (H % spacing) / 2;
    _ctx.strokeStyle = '#2e3250';
    _ctx.lineWidth = 1;
    for (let x = offsetX; x < W; x += spacing) {
      for (let y = offsetY; y < H; y += spacing) {
        // Si atom
        _ctx.beginPath();
        _ctx.arc(x, y, 4, 0, Math.PI * 2);
        _ctx.fillStyle = '#6c63ff44';
        _ctx.fill();
        _ctx.strokeStyle = '#6c63ff';
        _ctx.lineWidth = 1;
        _ctx.stroke();
        // Bonds
        _ctx.strokeStyle = '#2e3250';
        _ctx.lineWidth = 1;
        if (x + spacing < W) { _ctx.beginPath(); _ctx.moveTo(x+4,y); _ctx.lineTo(x+spacing-4,y); _ctx.stroke(); }
        if (y + spacing < H) { _ctx.beginPath(); _ctx.moveTo(x,y+4); _ctx.lineTo(x,y+spacing-4); _ctx.stroke(); }
      }
    }
    // Label
    _ctx.fillStyle = '#9294a8';
    _ctx.font = '12px "Segoe UI", sans-serif';
    _ctx.textAlign = 'center';
    _ctx.fillText('Intrinsic Silicon — each atom shares 4 covalent bonds', W/2, H - 12);
  }

  function drawFixedIons(depLeft, depRight, H, mid) {
    const spacing = 40;
    // Acceptor ions (–) in P depletion edge
    _ctx.fillStyle = '#a78bfa';
    _ctx.font = 'bold 12px monospace';
    _ctx.textAlign = 'center';
    for (let x = depLeft + 10; x < mid - 10; x += spacing) {
      for (let y = 30; y < H - 30; y += spacing) {
        _ctx.fillText('⊖', x, y + 4);
      }
    }
    // Donor ions (+) in N depletion edge
    _ctx.fillStyle = '#fbbf24';
    for (let x = mid + 10; x < depRight - 10; x += spacing) {
      for (let y = 30; y < H - 30; y += spacing) {
        _ctx.fillText('⊕', x, y + 4);
      }
    }
  }

  function drawFieldLines(depLeft, depRight, H) {
    const numLines = 5;
    const spacing = H / (numLines + 1);
    _ctx.strokeStyle = 'rgba(251,191,36,0.6)';
    _ctx.lineWidth = 1.5;
    _ctx.setLineDash([4, 4]);
    for (let i = 1; i <= numLines; i++) {
      const y = spacing * i;
      _ctx.beginPath();
      _ctx.moveTo(depRight, y);
      _ctx.lineTo(depLeft, y);
      _ctx.stroke();
      // Arrow tip
      _ctx.setLineDash([]);
      _ctx.beginPath();
      _ctx.moveTo(depLeft + 10, y - 5);
      _ctx.lineTo(depLeft, y);
      _ctx.lineTo(depLeft + 10, y + 5);
      _ctx.stroke();
      _ctx.setLineDash([4, 4]);
    }
    _ctx.setLineDash([]);
    drawLabel(_ctx, 'Built-in E field →', (depLeft + depRight) / 2, H - 10, '#fbbf24', 10);
  }

  function drawVoltageIndicator(W, H) {
    const label = _voltage > 0.5 ? `Forward Bias: +${(_voltage).toFixed(1)}V`
                : _voltage < -0.5 ? `Reverse Bias: ${(_voltage).toFixed(1)}V`
                : 'No Bias: 0V';
    const color = _voltage > 0.5 ? '#43e97b' : _voltage < -0.5 ? '#ff4d6d' : '#9294a8';
    drawLabel(_ctx, label, W / 2, H - 12, color, 13);
  }

  /* ── Spawn particles based on step + voltage ── */
  function spawnParticlesForStep(dt, depLeft, depRight, W, H, mid) {
    if (_spawnTimer < 120) return;
    _spawnTimer = 0;

    const forwardBias = _voltage > 0.5 && _step >= 6;
    const reverseBias = _voltage < -0.5 && _step >= 7;
    const equilibrium = !forwardBias && !reverseBias && _step >= 4;
    const count = 1;

    // P-type holes (right-moving diffusion in equilibrium, right-moving in forward bias)
    if (_step >= 2) {
      const px = Math.random() * (depLeft - 40) + 10;
      const py = Math.random() * (H - 40) + 20;
      let vx = 0, vy = (Math.random() - 0.5) * 0.4;
      if (forwardBias) vx = 1.2 + Math.random() * 0.8; // holes move → toward N
      else if (equilibrium) vx = (Math.random() - 0.5) * 0.3;
      else if (_step < 4) vx = (Math.random() - 0.5) * 0.5;
      spawnParticle(px, py, vx, vy, '#f87171', 'hole');
    }

    // N-type electrons (left-moving in forward bias)
    if (_step >= 3) {
      const px = W - Math.random() * (W - depRight - 40) - 10;
      const py = Math.random() * (H - 40) + 20;
      let vx = 0, vy = (Math.random() - 0.5) * 0.4;
      if (forwardBias) vx = -(1.2 + Math.random() * 0.8); // electrons move ← toward P
      else if (equilibrium) vx = (Math.random() - 0.5) * 0.3;
      else if (_step < 4) vx = (Math.random() - 0.5) * 0.5;
      spawnParticle(px, py, vx, vy, '#60a5fa', 'electron');
    }
  }

  function drawLabel(ctx, text, x, y, color, size) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${size || 12}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /* ── Depletion width based on voltage and step ── */
  function computeDepletionWidth(W) {
    if (_step < 4) return 0;
    const base = W * 0.12;
    // Reverse bias → wider; Forward bias → narrower
    const v = Utils.clamp(_voltage, -3, 3);
    const factor = _step === 5 ? 1.0 : (_step === 6 ? Math.max(0.1, 1 - v * 0.3) : (_step === 7 ? 1 + (-v) * 0.3 : 1.0));
    return Math.max(4, base * factor);
  }

  /* ── Step info texts ── */
  const STEP_INFO = [
    'Pure silicon forms a crystal lattice. Each Si atom shares 4 covalent bonds with neighbors. At room temperature, very few electrons break free — silicon is a poor conductor.',
    'P-type doping: Adding boron (3 valence electrons) creates "holes" — positive charge carriers where a bond electron is missing. The left region is now P-type.',
    'N-type doping: Adding phosphorus (5 valence electrons) donates free electrons to the crystal. The right region is now N-type with excess electrons.',
    'P-N Junction: When P and N regions meet, electrons from N diffuse into P and fill holes, creating a depletion zone devoid of free carriers.',
    'Depletion Zone: Fixed ions left behind create a built-in electric field pointing from N → P. This field prevents further diffusion at equilibrium.',
    'Forward Bias: A positive voltage on P shrinks the depletion zone, allowing electrons and holes to flow across — current flows! This is how a diode conducts.',
    'Reverse Bias: A negative voltage on P widens the depletion zone, blocking all current. The diode acts as an open circuit. Drag the voltage slider!'
  ];

  /* ── init ── */
  function init(sim) {
    _sim = sim;

    // Voltage slider
    const slider = document.getElementById('physics-voltage');
    const valEl  = document.getElementById('physics-voltage-val');
    if (slider) {
      slider.addEventListener('input', () => {
        _voltage = parseInt(slider.value) / 10;
        if (valEl) valEl.textContent = _voltage.toFixed(1) + ' V';
        // Force step 6 or 7 if biasing
        if (_voltage > 0.5 && _step < 6) {
          _step = 6;
          if (_sim) { _sim.currentStep = 6; _sim._updateUI(); _sim.setStepInfo(STEP_INFO[5]); }
        } else if (_voltage < -0.5 && _step < 7) {
          _step = 7;
          if (_sim) { _sim.currentStep = 7; _sim._updateUI(); _sim.setStepInfo(STEP_INFO[6]); }
        }
      });
    }

    // Field lines toggle
    const flBtn = document.getElementById('physics-fieldlines');
    if (flBtn) flBtn.addEventListener('click', () => {
      _showFieldLines = !_showFieldLines;
      flBtn.textContent = _showFieldLines ? 'ON' : 'OFF';
      flBtn.classList.toggle('active', _showFieldLines);
    });

    // Reset
    const resetBtn = document.getElementById('physics-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      _voltage = 0;
      _step = 1;
      _particles = [];
      if (slider) slider.value = 0;
      if (valEl)  valEl.textContent = '0.0 V';
      if (_sim) { _sim.currentStep = 1; _sim._updateUI(); _sim.setStepInfo(STEP_INFO[0]); }
    });

    sim.on('layer-ready', function (d) {
      if (d.layer === 1) {
        _active = true;
        _step = 1;
        _particles = [];
        _voltage = 0;
        _lastTime = performance.now();
        sim.setTotalSteps(7);
        sim.setStepInfo(STEP_INFO[0]);
        resizeCanvas();
        if (_rafId) cancelAnimationFrame(_rafId);
        _rafId = requestAnimationFrame(drawFrame);
      }
    });

    sim.on('layer-change', function (d) {
      if (d.from === 1) {
        _active = false;
        if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
      }
    });

    sim.on('step-change', function (d) {
      if (d.layer === 1) {
        _step = d.step;
        _particles = [];
        sim.setStepInfo(STEP_INFO[d.step - 1] || STEP_INFO[0]);
      }
    });

    // Canvas resize
    window.addEventListener('resize', () => {
      if (_active) resizeCanvas();
    });
  }

  function resizeCanvas() {
    _canvas = document.getElementById('physics-canvas');
    if (!_canvas) return;
    const parent = _canvas.parentElement;
    _canvas.width  = parent.clientWidth;
    _canvas.height = parent.clientHeight - 36; // minus label bar
    _ctx = _canvas.getContext('2d');
  }

  window.Layer1Physics = { init };
})();
