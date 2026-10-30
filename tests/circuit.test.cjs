const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const sandbox = { document: { getElementById: () => null } };
vm.createContext(sandbox);
vm.runInContext(readFileSync('circuit.js', 'utf8') + '\nthis.CB = CB;', sandbox);
const { CB } = sandbox;
function setup(type, values, pin) {
  CB.gates = values.map((simValue, i) => ({ id: i + 1, type: 'INPUT', simValue, varName: 'ABC'[i] }));
  CB.gates.push({ id: 10, type, x: 100, y: 100 }, { id: 11, type: 'OUTPUT' });
  CB.wires = values.map((_, i) => ({ fromId: i + 1, toId: 10, toPinIdx: i }));
  CB.wires.push({ fromId: 10, fromPinIdx: pin, toId: 11, toPinIdx: 0 });
  sandbox.cbEval();
}
for (const [type, n] of [['HALF_ADDER', 2], ['FULL_ADDER', 3]]) {
  for (let mask = 0; mask < 2 ** n; mask++) {
    const bits = Array.from({ length: n }, (_, i) => (mask >> i) & 1);
    const total = bits.reduce((a, b) => a + b, 0);
    for (let pin = 0; pin < 2; pin++) {
      setup(type, bits, pin);
      const expected = pin ? total >> 1 : total & 1;
      assert.equal(CB.evalMap[11], expected);
      const expr = sandbox.cbExtractExpression();
      const actual = vm.runInNewContext(expr, Object.fromEntries(bits.map((v, i) => ['ABC'[i], v])));
      assert.equal(actual, expected);
      const p = sandbox.gatePins(CB.gates.find(g => g.id === 10)).outputs[pin];
      assert.equal(sandbox.getPinAt(p.x, p.y).idx, pin);
    }
  }
  setup(type, Array(n).fill(null), 1);
  assert.equal(CB.evalMap[11], null);
}
// Carry from a half adder feeds a full adder.
setup('HALF_ADDER', [1, 1], 1);
CB.gates.push({ id: 12, type: 'FULL_ADDER' });
CB.wires.push({ fromId: 1, toId: 12, toPinIdx: 0 },
  { fromId: 2, toId: 12, toPinIdx: 1 },
  { fromId: 10, fromPinIdx: 1, toId: 12, toPinIdx: 2 });
sandbox.cbEval();
assert.equal(sandbox.cbSignal(12, 0), 1);
assert.equal(sandbox.cbSignal(12, 1), 1);
for (const [type, expected] of [['AND', 1], ['OR', 1], ['XOR', 0], ['NAND', 0], ['NOR', 0], ['XNOR', 1]]) {
  setup(type, [1, 1], 0);
  assert.equal(CB.evalMap[11], expected);
}
console.log('PASS: all adder truth-table rows, expression extraction, output pin selection, unknown inputs, carry chaining, and basic gate regressions');
