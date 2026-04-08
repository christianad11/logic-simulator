/* main.js — bootstrap, DOM wiring, keyboard shortcuts */
window.addEventListener('DOMContentLoaded', function () {
  const SIM = window.SIM;

  /* ── Init all layer modules ── */
  window.Layer1Physics   && Layer1Physics.init(SIM);
  window.Layer2Transistor && Layer2Transistor.init(SIM);
  window.Layer3Gates     && Layer3Gates.init(SIM);
  window.Layer4Circuits  && Layer4Circuits.init(SIM);
  window.Layer5CPU       && Layer5CPU.init(SIM);
  window.Layer6Execution && Layer6Execution.init(SIM);

  /* ── Layer nav buttons ── */
  document.querySelectorAll('.layer-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      SIM.goToLayer(parseInt(btn.dataset.layer));
    });
  });

  /* ── Step buttons ── */
  document.getElementById('btn-prev-step').addEventListener('click', () => SIM.prevStep());
  document.getElementById('btn-next-step').addEventListener('click', () => SIM.nextStep());

  document.getElementById('btn-prev-layer').addEventListener('click', () => {
    SIM.goToLayer(SIM.currentLayer - 1);
  });
  document.getElementById('btn-next-layer').addEventListener('click', () => {
    SIM.goToLayer(SIM.currentLayer + 1);
  });

  document.getElementById('btn-auto-play').addEventListener('click', () => {
    SIM.startAutoPlay(1800);
  });

  /* ── Keyboard shortcuts ── */
  document.addEventListener('keydown', function (e) {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowRight': case 'l': SIM.nextStep(); break;
      case 'ArrowLeft':  case 'h': SIM.prevStep(); break;
      case ' ':
        e.preventDefault();
        SIM.startAutoPlay(1800);
        break;
      case '1': case '2': case '3': case '4': case '5': case '6':
        SIM.goToLayer(parseInt(e.key));
        break;
    }
  });

  /* ── Start on layer 1 ── */
  // Manually trigger layer-ready for layer 1 (it's already active in HTML)
  SIM._updateUI();
  SIM.emit('layer-ready', { layer: 1 });
});
