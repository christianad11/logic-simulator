/* simulator.js — SimulatorState: event bus + step engine */
(function () {

  const LAYER_NAMES = {
    1: 'Semiconductor Physics',
    2: 'MOSFET Transistor',
    3: 'Logic Gates',
    4: 'Combinational Circuits',
    5: 'CPU Components',
    6: 'Instruction Execution'
  };

  class SimulatorState {
    constructor() {
      this.currentLayer = 1;
      this.currentStep  = 1;
      this.totalSteps   = 1;
      this.autoPlaying  = false;
      this._autoTimer   = null;
      this._handlers    = {};

      // Per-layer mutable state
      this.state = {
        layers: {
          1: { voltage: 0, showFieldLines: true },
          2: { gateHigh: false, showDepletion: true },
          3: { activeGate: 'NOT', inputA: 0, inputB: 0 },
          4: { activeCircuit: 'half-adder', inputA: 0, inputB: 0, inputCin: 0, inputSel: 0 },
          5: { operation: 'ADD', registers: [0b0011, 0b0101, 0b0010, 0b0000] },
          6: { instruction: 'ADD', regR1: 5, regR2: 2 }
        }
      };
    }

    /* ── Event bus ── */
    on(event, fn) {
      if (!this._handlers[event]) this._handlers[event] = [];
      this._handlers[event].push(fn);
    }
    off(event, fn) {
      if (!this._handlers[event]) return;
      this._handlers[event] = this._handlers[event].filter(h => h !== fn);
    }
    emit(event, data) {
      (this._handlers[event] || []).forEach(fn => fn(data));
    }

    /* ── Layer navigation ── */
    goToLayer(n) {
      if (n < 1 || n > 6) return;
      if (n === this.currentLayer) return;

      this.stopAutoPlay();
      const from = this.currentLayer;
      this.emit('layer-change', { from, to: n });

      // Show transition overlay
      const overlay = document.getElementById('transition-overlay');
      const label   = document.getElementById('transition-label');
      if (overlay && label) {
        label.textContent = `Layer ${n}: ${LAYER_NAMES[n]}`;
        overlay.classList.remove('hidden');
        // Recreate zoom ring to restart animation
        const ring = overlay.querySelector('.transition-zoom-ring');
        if (ring) {
          ring.style.animation = 'none';
          void ring.offsetWidth;
          ring.style.animation = '';
        }
        setTimeout(() => {
          overlay.classList.add('hidden');
          this._activateLayer(n);
        }, 580);
      } else {
        this._activateLayer(n);
      }
    }

    _activateLayer(n) {
      this.currentLayer = n;
      this.currentStep  = 1;
      this.totalSteps   = 1;

      // Show/hide layer sections
      document.querySelectorAll('.layer-section').forEach(s => s.classList.remove('active'));
      const sec = document.getElementById(`layer-${n}`);
      if (sec) sec.classList.add('active');

      // Update nav buttons
      document.querySelectorAll('.layer-nav-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.layer) === n);
      });

      this.emit('layer-ready', { layer: n });
      this._updateUI();
    }

    /* ── Step navigation ── */
    nextStep() {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.emit('step-change', { layer: this.currentLayer, step: this.currentStep, total: this.totalSteps });
        this._updateUI();
      } else {
        // Auto-advance to next layer if at last step
        if (this.currentLayer < 6) {
          this.goToLayer(this.currentLayer + 1);
        } else {
          this.stopAutoPlay();
        }
      }
    }

    prevStep() {
      if (this.currentStep > 1) {
        this.currentStep--;
        this.emit('step-change', { layer: this.currentLayer, step: this.currentStep, total: this.totalSteps });
        this._updateUI();
      } else if (this.currentLayer > 1) {
        this.goToLayer(this.currentLayer - 1);
      }
    }

    setTotalSteps(n) {
      this.totalSteps = n;
      this._updateUI();
    }

    setStepInfo(text) {
      const el = document.getElementById('info-text');
      if (el) el.textContent = text;
    }

    /* ── Auto-play ── */
    startAutoPlay(intervalMs) {
      if (this.autoPlaying) { this.stopAutoPlay(); return; }
      this.autoPlaying = true;
      const btn = document.getElementById('btn-auto-play');
      if (btn) { btn.textContent = '⏸ Pause'; btn.classList.add('playing'); }
      this._autoTimer = setInterval(() => {
        this.nextStep();
        if (!this.autoPlaying) return;
      }, intervalMs || 1800);
    }

    stopAutoPlay() {
      if (!this.autoPlaying) return;
      this.autoPlaying = false;
      clearInterval(this._autoTimer);
      this._autoTimer = null;
      const btn = document.getElementById('btn-auto-play');
      if (btn) { btn.textContent = '▶ Play'; btn.classList.remove('playing'); }
    }

    /* ── UI sync ── */
    _updateUI() {
      const cur   = document.getElementById('step-current');
      const total = document.getElementById('step-total');
      const prev  = document.getElementById('btn-prev-step');
      const next  = document.getElementById('btn-next-step');
      const pl    = document.getElementById('btn-prev-layer');
      const nl    = document.getElementById('btn-next-layer');

      if (cur)   cur.textContent   = this.currentStep;
      if (total) total.textContent = this.totalSteps;
      if (prev)  prev.disabled     = (this.currentStep === 1 && this.currentLayer === 1);
      if (next)  next.disabled     = false;
      if (pl)    pl.disabled       = (this.currentLayer === 1);
      if (nl)    nl.disabled       = (this.currentLayer === 6);
    }

    layerName(n) { return LAYER_NAMES[n || this.currentLayer]; }
  }

  window.SIM = new SimulatorState();
  window.LAYER_NAMES = LAYER_NAMES;
})();
