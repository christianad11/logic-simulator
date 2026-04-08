// ── App Controller ─────────────────────────────────────────────────────────

const exprInput  = document.getElementById('expr-input');
const computeBtn = document.getElementById('compute-btn');
const clearBtn   = document.getElementById('clear-btn');
const errorMsg   = document.getElementById('error-msg');
const results    = document.getElementById('results');

// ── Tab Switching ──────────────────────────────────────────────────────────

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-pane').forEach(p =>
    p.classList.toggle('hidden', p.id !== `pane-${name}`));

  if (name === 'circuit') {
    // Give the pane time to become visible before resizing canvas
    setTimeout(() => {
      const canvas = document.getElementById('circuit-canvas');
      if (canvas) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width  = rect.width;
        canvas.height = Math.max(rect.height, 420);
        cbRender();
      }
    }, 30);
  }
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Event Listeners ────────────────────────────────────────────────────────

computeBtn.addEventListener('click', run);
exprInput.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
clearBtn.addEventListener('click', () => {
  exprInput.value = '';
  results.classList.add('hidden');
  showError(null);
  exprInput.focus();
});

document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    exprInput.value = btn.dataset.expr;
    run();
  });
});

document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    navigator.clipboard.writeText(target.textContent).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  });
});

document.getElementById('export-csv-btn').addEventListener('click', exportCSV);

// ── Main Computation ───────────────────────────────────────────────────────

function run() {
  const expr = exprInput.value.trim();
  if (!expr) { showError('Please enter a Boolean expression.'); return; }

  try {
    showError(null);
    const tt = buildTruthTable(expr);
    const result = minimize(tt);

    renderTruthTable(tt);
    renderKmap(tt, result.minterms, result.maxterms);
    renderResults(result);

    results.classList.remove('hidden');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    showError(e.message);
    results.classList.add('hidden');
  }
}

// ── Truth Table Renderer ───────────────────────────────────────────────────

function renderTruthTable(tt) {
  const table = document.getElementById('truth-table');
  table.innerHTML = '';
  const { vars, rows } = tt;

  const thead = table.createTHead();
  const hr = thead.insertRow();
  vars.forEach(v => { const th = document.createElement('th'); th.textContent = v; hr.appendChild(th); });
  const thF = document.createElement('th'); thF.textContent = 'F'; hr.appendChild(thF);

  const tbody = table.createTBody();
  rows.forEach(row => {
    const tr = tbody.insertRow();
    tr.classList.add(row.output === 1 ? 'row-one' : 'row-zero');
    vars.forEach(v => { const td = tr.insertCell(); td.textContent = row.vals[v]; });
    const tdF = tr.insertCell(); tdF.textContent = row.output;
  });
}

// ── Results Renderer ───────────────────────────────────────────────────────

function renderResults(result) {
  document.getElementById('sop-result').textContent = result.sop;
  document.getElementById('pos-result').textContent = result.pos;
  document.getElementById('minterms-list').textContent =
    result.minterms.length ? `Σm(${result.minterms.join(', ')})` : 'none';
  document.getElementById('maxterms-list').textContent =
    result.maxterms.length ? `ΠM(${result.maxterms.join(', ')})` : 'none';
}

// ── Error Display ──────────────────────────────────────────────────────────

function showError(msg) {
  if (!msg) { errorMsg.classList.add('hidden'); errorMsg.textContent = ''; }
  else       { errorMsg.textContent = msg; errorMsg.classList.remove('hidden'); }
}

// ── CSV Export ─────────────────────────────────────────────────────────────

function exportCSV() {
  const table = document.getElementById('truth-table');
  if (!table.rows.length) return;
  const lines = [];
  for (const row of table.rows) {
    const cols = Array.from(row.cells.length ? row.cells : row.querySelectorAll('th,td'));
    lines.push(cols.map(c => c.textContent).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'truth_table.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Boot ───────────────────────────────────────────────────────────────────

initCircuitBuilder();
