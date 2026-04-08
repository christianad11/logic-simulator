// ── Boolean Expression Parser & Evaluator ──────────────────────────────────

/**
 * Tokenize a boolean expression.
 * Supported: & (AND), | (OR), ~ (NOT), ^ (XOR), (, ), variable names (A-Z single letters)
 */
function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[A-Za-z]/.test(ch)) {
      // single-letter variables only
      tokens.push({ type: 'VAR', value: ch.toUpperCase() });
      i++;
    } else if (ch === '~' || ch === '!') {
      tokens.push({ type: 'NOT' });
      i++;
    } else if (ch === '&' || ch === '*') {
      tokens.push({ type: 'AND' });
      i++;
    } else if (ch === '|' || ch === '+') {
      tokens.push({ type: 'OR' });
      i++;
    } else if (ch === '^') {
      tokens.push({ type: 'XOR' });
      i++;
    } else if (ch === '(') {
      tokens.push({ type: 'LPAREN' });
      i++;
    } else if (ch === ')') {
      tokens.push({ type: 'RPAREN' });
      i++;
    } else if (ch === '0' || ch === '1') {
      tokens.push({ type: 'CONST', value: parseInt(ch) });
      i++;
    } else {
      throw new Error(`Unknown character: '${ch}'`);
    }
  }
  return tokens;
}

/**
 * Recursive descent parser → AST
 * Grammar:
 *   expr   → xor ( '|' xor )*
 *   xor    → and ( '^' and )*
 *   and    → not ( '&' not )*
 *   not    → '~' not | primary
 *   primary→ VAR | CONST | '(' expr ')'
 */
function parse(tokens) {
  let pos = 0;

  function peek() { return tokens[pos]; }
  function consume(type) {
    const t = tokens[pos];
    if (type && (!t || t.type !== type)) throw new Error(`Expected ${type}, got ${t ? t.type : 'EOF'}`);
    pos++;
    return t;
  }

  function parseExpr() {
    let node = parseXor();
    while (peek() && peek().type === 'OR') {
      consume('OR');
      const right = parseXor();
      node = { type: 'OR', left: node, right };
    }
    return node;
  }

  function parseXor() {
    let node = parseAnd();
    while (peek() && peek().type === 'XOR') {
      consume('XOR');
      const right = parseAnd();
      node = { type: 'XOR', left: node, right };
    }
    return node;
  }

  function parseAnd() {
    let node = parseNot();
    while (peek() && peek().type === 'AND') {
      consume('AND');
      const right = parseNot();
      node = { type: 'AND', left: node, right };
    }
    return node;
  }

  function parseNot() {
    if (peek() && peek().type === 'NOT') {
      consume('NOT');
      const operand = parseNot();
      return { type: 'NOT', operand };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.type === 'VAR') {
      consume('VAR');
      return { type: 'VAR', value: t.value };
    }
    if (t.type === 'CONST') {
      consume('CONST');
      return { type: 'CONST', value: t.value };
    }
    if (t.type === 'LPAREN') {
      consume('LPAREN');
      const node = parseExpr();
      consume('RPAREN');
      return node;
    }
    throw new Error(`Unexpected token: ${t.type}`);
  }

  const ast = parseExpr();
  if (pos !== tokens.length) throw new Error('Unexpected tokens after expression');
  return ast;
}

function evaluate(ast, env) {
  switch (ast.type) {
    case 'VAR':   return env[ast.value] ? 1 : 0;
    case 'CONST': return ast.value;
    case 'NOT':   return evaluate(ast.operand, env) ? 0 : 1;
    case 'AND':   return (evaluate(ast.left, env) & evaluate(ast.right, env));
    case 'OR':    return (evaluate(ast.left, env) | evaluate(ast.right, env));
    case 'XOR':   return (evaluate(ast.left, env) ^ evaluate(ast.right, env));
    default: throw new Error(`Unknown AST node: ${ast.type}`);
  }
}

function getVars(ast, vars = new Set()) {
  if (ast.type === 'VAR') vars.add(ast.value);
  if (ast.left) getVars(ast.left, vars);
  if (ast.right) getVars(ast.right, vars);
  if (ast.operand) getVars(ast.operand, vars);
  return vars;
}

/**
 * Build truth table rows.
 * Returns { vars: [...], rows: [{vals:{A:0,...}, output:0|1}] }
 */
function buildTruthTable(exprStr) {
  const tokens = tokenize(exprStr);
  const ast = parse(tokens);
  const vars = Array.from(getVars(ast)).sort();
  const n = vars.length;
  if (n === 0) throw new Error('No variables found in expression');
  if (n > 6) throw new Error('Maximum 6 variables supported');

  const rows = [];
  for (let i = 0; i < (1 << n); i++) {
    const env = {};
    vars.forEach((v, idx) => { env[v] = (i >> (n - 1 - idx)) & 1; });
    rows.push({ vals: env, output: evaluate(ast, env), index: i });
  }
  return { vars, rows };
}

// ── Quine-McCluskey Minimization ───────────────────────────────────────────

function countOnes(n) {
  let c = 0;
  while (n) { c += n & 1; n >>= 1; }
  return c;
}

function diffBits(a, b) {
  const x = a ^ b;
  return countOnes(x);
}

/**
 * QM algorithm.
 * @param {number[]} minterms - indices where function = 1
 * @param {number[]} dontcares - indices where function = X (optional)
 * @param {number} numVars
 * @returns {string[]} array of prime implicant strings (e.g. "1-01")
 */
function quinnMcCluskey(minterms, dontcares, numVars) {
  if (minterms.length === 0) return [];
  const all = [...minterms, ...dontcares];

  // Each implicant: { mask (bits covered by '-'), val, minterms: Set }
  function makeImpl(val, mask, terms) {
    return { val, mask, terms: new Set(terms) };
  }

  // Group by number of 1-bits in value (ignoring mask positions)
  function groupByOnes(impls) {
    const g = {};
    for (const im of impls) {
      const ones = countOnes(im.val & ~im.mask);
      if (!g[ones]) g[ones] = [];
      g[ones].push(im);
    }
    return g;
  }

  let current = all.map(m => makeImpl(m, 0, [m]));
  const primeImplicants = [];

  while (current.length > 0) {
    const groups = groupByOnes(current);
    const keys = Object.keys(groups).map(Number).sort((a, b) => a - b);
    const used = new Set();
    const next = [];

    for (let gi = 0; gi < keys.length - 1; gi++) {
      const g1 = groups[keys[gi]];
      const g2 = groups[keys[gi + 1]];
      for (const a of g1) {
        for (const b of g2) {
          if (a.mask !== b.mask) continue;
          const diff = a.val ^ b.val;
          if (countOnes(diff) === 1) {
            used.add(a);
            used.add(b);
            const newMask = a.mask | diff;
            const newVal = a.val & ~diff;
            // Check for duplicate
            const exists = next.some(x => x.val === newVal && x.mask === newMask);
            if (!exists) {
              next.push(makeImpl(newVal, newMask, [...a.terms, ...b.terms]));
            }
          }
        }
      }
    }

    for (const im of current) {
      if (!used.has(im)) primeImplicants.push(im);
    }
    current = next;
  }

  // Convert to string pattern
  return primeImplicants.map(im => {
    let s = '';
    for (let b = numVars - 1; b >= 0; b--) {
      if ((im.mask >> b) & 1) s += '-';
      else s += (im.val >> b) & 1 ? '1' : '0';
    }
    return { pattern: s, terms: im.terms };
  });
}

/**
 * Greedy essential prime implicant cover.
 */
function coverMinterms(minterms, primeImplicants) {
  if (minterms.length === 0) return [];
  const mintermSet = new Set(minterms);
  const uncovered = new Set(minterms);
  const selected = [];

  // Find essential PIs
  for (const m of minterms) {
    const covering = primeImplicants.filter(pi => pi.terms.has(m));
    if (covering.length === 1) {
      const pi = covering[0];
      if (!selected.includes(pi)) {
        selected.push(pi);
        for (const t of pi.terms) uncovered.delete(t);
      }
    }
  }

  // Greedily cover remaining
  while (uncovered.size > 0) {
    // Find PI covering most uncovered minterms
    let best = null, bestCount = 0;
    for (const pi of primeImplicants) {
      if (selected.includes(pi)) continue;
      const count = [...pi.terms].filter(t => uncovered.has(t)).length;
      if (count > bestCount) { bestCount = count; best = pi; }
    }
    if (!best) break;
    selected.push(best);
    for (const t of best.terms) uncovered.delete(t);
  }

  return selected;
}

/**
 * Convert prime implicant pattern to SOP term string.
 * pattern: e.g. "1-01", vars: ["A","B","C","D"]
 */
function patternToSOP(pattern, vars) {
  const parts = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '-') continue;
    if (pattern[i] === '1') parts.push(vars[i]);
    else parts.push('~' + vars[i]);
  }
  if (parts.length === 0) return '1';
  return parts.join('');
}

/**
 * Convert prime implicant pattern to POS term string.
 * For POS minimization we group 0s; the pattern refers to 0-value positions.
 */
function patternToPOS(pattern, vars) {
  const parts = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '-') continue;
    // In POS, 0 → literal (non-complemented), 1 → complemented literal
    if (pattern[i] === '0') parts.push(vars[i]);
    else parts.push('~' + vars[i]);
  }
  if (parts.length === 0) return '0';
  if (parts.length === 1) return parts[0];
  return '(' + parts.join(' | ') + ')';
}

/**
 * Full minimization: returns { sop, pos, minterms, maxterms }
 */
function minimize(truthTable) {
  const { vars, rows } = truthTable;
  const n = vars.length;
  const minterms = rows.filter(r => r.output === 1).map(r => r.index);
  const maxterms = rows.filter(r => r.output === 0).map(r => r.index);

  // SOP
  let sopStr;
  if (minterms.length === 0) {
    sopStr = '0';
  } else if (minterms.length === rows.length) {
    sopStr = '1';
  } else {
    const pis = quinnMcCluskey(minterms, [], n);
    const cover = coverMinterms(minterms, pis);
    const terms = cover.map(pi => patternToSOP(pi.pattern, vars));
    sopStr = terms.join(' | ') || '0';
  }

  // POS — minimize maxterms
  let posStr;
  if (maxterms.length === 0) {
    posStr = '1';
  } else if (maxterms.length === rows.length) {
    posStr = '0';
  } else {
    const pis = quinnMcCluskey(maxterms, [], n);
    const cover = coverMinterms(maxterms, pis);
    const terms = cover.map(pi => patternToPOS(pi.pattern, vars));
    posStr = terms.join(' & ') || '1';
  }

  return { sop: sopStr, pos: posStr, minterms, maxterms, vars };
}
