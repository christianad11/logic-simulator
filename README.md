# Logic Circuit Simulator

An interactive browser-based educational tool for learning digital logic — from boolean algebra and Karnaugh maps all the way down to transistor physics and CPU execution pipelines.

Built as a personal project to consolidate concepts from Electronics, Logic Design, and Digital Electronics coursework.

**[Live Demo →](https://christianad11.github.io/logic-simulator)**

---

## Tools

### Boolean Expression Analyzer & Circuit Builder
> `index.html`

| Feature | Description |
|--------|-------------|
| **Expression Analyzer** | Parse and evaluate any boolean expression with up to 6 variables |
| **Truth Table** | Auto-generated for all input combinations, color-coded by output |
| **Karnaugh Map** | Visual K-map for 2–4 variables, groupings for SOP/POS simplification |
| **Minimization** | Quine-McCluskey algorithm outputs minimized SOP and POS forms with minterms/maxterms |
| **Circuit Builder** | Drag-and-drop interactive canvas — place gates, wire them, and simulate in real time |
| **CSV Export** | Download the truth table as a `.csv` file |

**Supported operators:**

| Operator | Symbols |
|----------|---------|
| AND | `&`, `*`, `AND` |
| OR | `\|`, `+`, `OR` |
| NOT | `~`, `!`, `NOT` |
| XOR | `^`, `XOR` |

**Circuit gates:** INPUT, OUTPUT, AND, OR, NOT, XOR, NAND, NOR, XNOR

---

### From Silicon to Code — Interactive Abstraction Layers
> `full-simulator/index.html`

A 6-layer walkthrough of how computers work from the ground up:

| Layer | Topic | What You See |
|-------|-------|-------------|
| **1 — Semiconductor** | P/N junction physics | Particle simulation of electrons & holes; adjustable bias voltage; depletion zone and electric field lines |
| **2 — Transistor** | N-Channel MOSFET | Cross-section SVG diagram; gate voltage control; ON/OFF state visualization |
| **3 — Logic Gates** | NOT, AND, OR | Interactive input toggles; live output; embedded truth tables |
| **4 — Combinational Circuits** | Half-adder, Full-adder, 2:1 MUX | Input controls; output visualization; step-through computation |
| **5 — CPU Components** | 4-bit ALU + Register file | Operation selection (ADD / AND / OR); register contents display; ALU execution |
| **6 — Instruction Execution** | Fetch → Decode → Execute → Writeback | Full pipeline visualization; step-by-step stage animation |

**Navigation:** Layer buttons · Previous/Next steps · Auto-play · Keyboard shortcuts (`←→` arrows, `1`–`6` keys, `Space`)

---

## Screenshots

> *(Add screenshots here after deploying — drag images into the GitHub editor or place them in a `screenshots/` folder)*

---

## Running Locally

No build step, no dependencies — just open the HTML files directly in a browser.

```bash
git clone https://github.com/christianad11/logic-simulator.git
cd logic-simulator

# Open the main tool
open index.html

# Open the abstraction layer simulator
open full-simulator/index.html
```

Or use VS Code's Live Server extension for auto-reload during development.

---

## Deploying to GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Set Source to `Deploy from a branch` → branch: `main`, folder: `/ (root)`
4. Save — your site will be live at:
   ```
   https://christianad11.github.io/logic-simulator/
   ```
5. The Full Simulator is at:
   ```
   https://christianad11.github.io/logic-simulator/full-simulator/
   ```

> Replace `YOUR-USERNAME` with your GitHub username in the live demo link at the top of this README once deployed.

---

## Deploying to Netlify (alternative)

1. Go to [netlify.com](https://netlify.com) → **Add new site → Deploy manually**
2. Drag and drop the project folder
3. Your site goes live instantly with a `*.netlify.app` URL
4. Optionally connect your GitHub repo for automatic deploys on push

---

## Tech Stack

- **Vanilla JavaScript (ES6+)** — no frameworks, no dependencies
- **HTML5 Canvas** — particle physics simulation (Layer 1)
- **SVG** — gate symbols, transistor diagram, circuit schematics, CPU/pipeline diagrams
- **CSS3** — dark theme, responsive layout, gradient animations
- **Algorithms:** Quine-McCluskey minimization, recursive-descent boolean parser, K-map grouping

---

## Project Structure

```
logic-circuit-simulator/
├── index.html              # Boolean Analyzer + Circuit Builder UI
├── app.js                  # Tab switching, truth table & K-map rendering, CSV export
├── logic.js                # Boolean parser, AST evaluator, Quine-McCluskey minimizer
├── circuit.js              # Interactive circuit canvas — gates, wiring, simulation
├── kmap.js                 # Karnaugh map renderer (1–6 variables)
├── style.css               # Main app styles
└── full-simulator/
    ├── index.html          # "From Silicon to Code" UI
    ├── main.js             # DOM init, keyboard shortcuts
    ├── simulator.js        # Layer/step navigation, auto-play, event bus
    ├── utils.js            # SVG helpers, gate symbol drawing
    ├── layer1-physics.js   # P/N junction particle simulation
    ├── layer2-transistor.js# MOSFET cross-section visualization
    ├── layer3-gates.js     # Interactive NOT/AND/OR gates with truth tables
    ├── layer4-circuits.js  # Half-adder, full-adder, MUX
    ├── layer5-cpu.js       # 4-bit ALU + register file
    ├── layer6-execution.js # Instruction pipeline (Fetch/Decode/Execute/Writeback)
    └── style.css           # Full Simulator styles
```

---

## Concepts Covered

This project touches on topics from three courses:

**Electronics**
- Semiconductor physics (P-type / N-type doping)
- P/N junction, depletion region, bias voltage
- MOSFET operation (enhancement mode, threshold voltage)

**Logic Design**
- Boolean algebra and operator precedence
- Truth table construction
- Karnaugh maps and visual grouping
- Sum of Products (SOP) / Product of Sums (POS)
- Quine-McCluskey minimization algorithm
- Minterms and maxterms notation

**Digital Electronics**
- Logic gate implementations (AND, OR, NOT, XOR, NAND, NOR, XNOR)
- Combinational circuit design (half-adder, full-adder, multiplexer)
- ALU architecture and operations
- Register files
- CPU instruction pipeline stages

---

## License

MIT — free to use, modify, and share.
