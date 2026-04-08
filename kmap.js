// ── K-map Rendering ────────────────────────────────────────────────────────

// Gray code sequences
const GRAY2 = [0, 1];
const GRAY4 = [0, 1, 3, 2]; // 00, 01, 11, 10

/**
 * Render a K-map for 2–6 variables into #kmap-container.
 * For >4 vars we show a text-based representation.
 */
function renderKmap(truthTable, minterms, maxterms) {
  const container = document.getElementById('kmap-container');
  const legend = document.getElementById('kmap-legend');
  container.innerHTML = '';

  const { vars, rows } = truthTable;
  const n = vars.length;

  if (n === 1) {
    render1VarKmap(container, vars, rows);
    legend.classList.remove('hidden');
    return;
  }
  if (n === 2) {
    render2VarKmap(container, vars, rows);
    legend.classList.remove('hidden');
    return;
  }
  if (n === 3) {
    render3VarKmap(container, vars, rows);
    legend.classList.remove('hidden');
    return;
  }
  if (n === 4) {
    render4VarKmap(container, vars, rows);
    legend.classList.remove('hidden');
    return;
  }

  // 5-6 vars: text-based
  legend.classList.add('hidden');
  const note = document.createElement('p');
  note.className = 'kmap-note';
  note.textContent = `K-map display is only supported for up to 4 variables. Showing minterm list for ${n} variables.`;
  container.appendChild(note);
  const info = document.createElement('p');
  info.className = 'kmap-note mono';
  info.textContent = `Minterms: ${minterms.join(', ')}   Maxterms: ${maxterms.join(', ')}`;
  container.appendChild(info);
}

// ── helpers ────────────────────────────────────────────────────────────────

function outputAt(rows, indexMap) {
  return idx => {
    const row = rows[idx];
    return row ? row.output : 0;
  };
}

function makeCell(value) {
  const td = document.createElement('td');
  td.textContent = value;
  td.classList.add(value === 1 ? 'val-1' : 'val-0');
  return td;
}

function makeHeaderCell(text, isCorner) {
  const th = document.createElement('th');
  th.textContent = text;
  if (isCorner) th.classList.add('kmap-corner');
  return th;
}

// ── 1 variable ─────────────────────────────────────────────────────────────
function render1VarKmap(container, vars, rows) {
  const wrap = document.createElement('div');
  wrap.className = 'kmap-wrap';

  const label = document.createElement('div');
  label.className = 'kmap-var-label';
  label.textContent = vars[0];
  wrap.appendChild(label);

  const table = document.createElement('table');
  table.className = 'kmap-table';

  const thead = table.createTHead();
  const hr = thead.insertRow();
  hr.appendChild(makeHeaderCell('', true));
  hr.appendChild(makeHeaderCell('0'));
  hr.appendChild(makeHeaderCell('1'));

  const tbody = table.createTBody();
  const tr = tbody.insertRow();
  const thLabel = document.createElement('th');
  thLabel.textContent = 'F';
  tr.appendChild(thLabel);
  tr.appendChild(makeCell(rows[0].output));
  tr.appendChild(makeCell(rows[1].output));

  wrap.appendChild(table);
  container.appendChild(wrap);
}

// ── 2 variables ────────────────────────────────────────────────────────────
function render2VarKmap(container, vars, rows) {
  // rows: AB = 00,01,10,11 → indices 0,1,2,3
  // K-map: rows=A (0,1), cols=B (0,1) — trivial, no gray needed for 2x2
  const wrap = document.createElement('div');
  wrap.className = 'kmap-wrap';

  const label = document.createElement('div');
  label.className = 'kmap-var-label';
  label.textContent = `↓${vars[0]}  ${vars[1]}→`;
  wrap.appendChild(label);

  const table = document.createElement('table');
  table.className = 'kmap-table';
  const thead = table.createTHead();
  const hr = thead.insertRow();
  hr.appendChild(makeHeaderCell(`${vars[0]}\\${vars[1]}`, true));
  hr.appendChild(makeHeaderCell('0'));
  hr.appendChild(makeHeaderCell('1'));

  const tbody = table.createTBody();
  for (const a of [0, 1]) {
    const tr = tbody.insertRow();
    const thLabel = document.createElement('th');
    thLabel.textContent = String(a);
    tr.appendChild(thLabel);
    for (const b of [0, 1]) {
      const idx = (a << 1) | b;
      tr.appendChild(makeCell(rows[idx].output));
    }
  }

  wrap.appendChild(table);
  container.appendChild(wrap);
}

// ── 3 variables ────────────────────────────────────────────────────────────
function render3VarKmap(container, vars, rows) {
  // Standard: rows=A (0,1), cols=BC gray (00,01,11,10)
  const [A, B, C] = vars;
  const colGray = GRAY4; // 4 columns for BC

  const wrap = document.createElement('div');
  wrap.className = 'kmap-wrap';

  const label = document.createElement('div');
  label.className = 'kmap-var-label';
  label.textContent = `↓${A}  ${B}${C}→`;
  wrap.appendChild(label);

  const table = document.createElement('table');
  table.className = 'kmap-table';

  const thead = table.createTHead();
  const hr = thead.insertRow();
  hr.appendChild(makeHeaderCell(`${A}\\${B}${C}`, true));
  for (const g of colGray) hr.appendChild(makeHeaderCell(g.toString(2).padStart(2, '0')));

  const tbody = table.createTBody();
  for (const a of [0, 1]) {
    const tr = tbody.insertRow();
    const thLabel = document.createElement('th');
    thLabel.textContent = String(a);
    tr.appendChild(thLabel);
    for (const bc of colGray) {
      const b = (bc >> 1) & 1;
      const c = bc & 1;
      const idx = (a << 2) | (b << 1) | c;
      tr.appendChild(makeCell(rows[idx].output));
    }
  }

  wrap.appendChild(table);
  container.appendChild(wrap);
}

// ── 4 variables ────────────────────────────────────────────────────────────
function render4VarKmap(container, vars, rows) {
  // Rows = AB gray (00,01,11,10), Cols = CD gray (00,01,11,10)
  const [A, B, C, D] = vars;

  const wrap = document.createElement('div');
  wrap.className = 'kmap-wrap';

  const label = document.createElement('div');
  label.className = 'kmap-var-label';
  label.textContent = `↓${A}${B}  ${C}${D}→`;
  wrap.appendChild(label);

  const table = document.createElement('table');
  table.className = 'kmap-table';

  const thead = table.createTHead();
  const hr = thead.insertRow();
  hr.appendChild(makeHeaderCell(`${A}${B}\\${C}${D}`, true));
  for (const g of GRAY4) hr.appendChild(makeHeaderCell(g.toString(2).padStart(2, '0')));

  const tbody = table.createTBody();
  for (const ab of GRAY4) {
    const a = (ab >> 1) & 1;
    const b = ab & 1;
    const tr = tbody.insertRow();
    const thLabel = document.createElement('th');
    thLabel.textContent = ab.toString(2).padStart(2, '0');
    tr.appendChild(thLabel);
    for (const cd of GRAY4) {
      const c = (cd >> 1) & 1;
      const d = cd & 1;
      const idx = (a << 3) | (b << 2) | (c << 1) | d;
      tr.appendChild(makeCell(rows[idx].output));
    }
  }

  wrap.appendChild(table);
  container.appendChild(wrap);
}
