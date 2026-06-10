/* start-page plugin: Calculator (trigger "==")
   Safe expression engine — no eval(). Exact fractions via BigInt rationals where
   possible; expressions pretty-rendered with stacked fractions, superscript
   exponents and radical signs. Variables (x = 5) and graphing (y = x^2, or any
   expression with an unset x) included. Part of start-page (MIT). */

const CSS = `
.calcp { height: 100%; display: flex; flex-direction: column; font-size: 1.02rem; color: var(--fg, #f4f6fb); }
.calcp .live { min-height: 3.2rem; flex: none; display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; padding: 0.55rem 1rem 0.45rem; }
.calcp .ph { color: rgba(244,246,251,0.38); font-size: 0.83rem; }
.calcp .err { color: rgba(244,246,251,0.45); font-size: 0.85rem; }
.calcp .tape { flex: 1; overflow-y: auto; padding: 0.25rem 0.6rem 0.5rem; border-top: 1px solid rgba(255,255,255,0.09); display: flex; flex-direction: column; gap: 0.15rem; }
.calcp .row { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; cursor: pointer; border-radius: 8px; padding: 0.28rem 0.45rem; }
.calcp .row:hover { background: rgba(255,255,255,0.07); }
.calcp .ex { opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.calcp .res { color: var(--accent, #5b8def); font-weight: 600; text-shadow: 0 1px 3px rgba(0,0,0,0.4); font-variant-numeric: tabular-nums; white-space: nowrap; }
.calcp .dim { opacity: 0.55; }
.calcp .copied { color: #7de0a0; font-size: 0.72rem; margin-left: 0.45rem; }
.calcp .frac { display: inline-block; vertical-align: -0.65em; text-align: center; line-height: 1.15; margin: 0 0.14em; }
.calcp .frac > span { display: block; padding: 0 0.3em; }
.calcp .frac .fn { border-bottom: 1px solid currentColor; }
.calcp sup { font-size: 0.7em; }
.calcp .rt { white-space: nowrap; }
.calcp .rt .rtv { border-top: 1px solid currentColor; padding: 0 0.18em; }
.calcp .graph { flex: 1; min-height: 0; padding: 0 0.7rem 0.55rem; position: relative; }
.calcp .gwrap svg { width: 100%; height: auto; display: block; }
.calcp .gzoom { position: absolute; right: 16px; bottom: 12px; display: flex; gap: 4px; }
.calcp .gz { width: 24px; height: 24px; padding: 0; border-radius: 7px; border: 1px solid rgba(255,255,255,0.16); background: rgba(20,24,32,0.55); color: rgba(255,255,255,0.65); font: inherit; font-size: 14px; line-height: 1; cursor: pointer; }
.calcp .gz:hover { background: rgba(255,255,255,0.14); color: #fff; }
.calcp .tape[hidden], .calcp .graph[hidden] { display: none; }
.calcp .gax { stroke: rgba(255,255,255,0.22); stroke-width: 1; }
.calcp .ggrid { stroke: rgba(255,255,255,0.08); stroke-width: 1; }
.calcp .gcurve { stroke: var(--accent, #5b8def); stroke-width: 2.2; fill: none; stroke-linejoin: round; stroke-linecap: round; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.35)); }
.calcp .glabel { fill: rgba(244,246,251,0.45); font-size: 10px; font-family: ui-monospace, monospace; }
`;

const PH = `<span class="ph">1/3 + 1/6 &nbsp;·&nbsp; 2^10 &nbsp;·&nbsp; 15% of 240 &nbsp;·&nbsp; x = 5 &nbsp;·&nbsp; y = x^2 − 3 &nbsp;·&nbsp; ans</span>`;

/* ============================ tokenizer ============================ */
const FUNCS = {
  sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
};
const CONSTS = { pi: Math.PI, e: Math.E };

function tokenize(src) {
  const s = src.toLowerCase()
    .replace(/×/g, "*").replace(/[÷∕]/g, "/").replace(/−/g, "-").replace(/,/g, "")
    .replace(/π/g, " pi ").replace(/√/g, " sqrt ").replace(/\bof\b/g, "*");
  const toks = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const t = s.slice(i, j);
      if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) throw new Error("bad number");
      toks.push({ k: "num", v: t }); i = j; continue;
    }
    if (/[a-z]/.test(c)) { let j = i; while (j < s.length && /[a-z]/.test(s[j])) j++; toks.push({ k: "id", v: s.slice(i, j) }); i = j; continue; }
    if ("+-*/^()%!".includes(c)) { toks.push({ k: c }); i++; continue; }
    throw new Error("bad char");
  }
  return toks;
}

/* ============================ parser (Pratt) ============================ */
function parse(toks) {
  let p = 0;
  const peek = () => toks[p];
  function expr(min) {
    let left = atom();
    for (;;) {
      const t = peek(); if (!t) break;
      let op, prec, ra = false, imp = false;
      if (t.k === "+" || t.k === "-") { op = t.k; prec = 1; }
      else if (t.k === "*" || t.k === "/") { op = t.k; prec = 2; }
      else if (t.k === "^") { op = "^"; prec = 3; ra = true; }
      else if (t.k === "num" || t.k === "id" || t.k === "(") { op = "*"; prec = 2; imp = true; }  // implicit ×
      else break;
      if (prec < min) break;
      if (!imp) p++;
      left = { t: "bin", op, a: left, b: expr(ra ? prec : prec + 1), imp };
    }
    return left;
  }
  function atom() {
    const t = peek(); if (!t) throw new Error("eof");
    let node;
    if (t.k === "-") { p++; return { t: "neg", a: expr(3) }; }
    if (t.k === "+") { p++; return expr(3); }
    if (t.k === "num") { p++; node = { t: "num", v: t.v }; }
    else if (t.k === "id") {
      p++;
      if (FUNCS[t.v]) {
        if (peek() && peek().k === "(") {
          p++; const a = expr(1);
          if (!peek() || peek().k !== ")") throw new Error(") expected"); p++;
          node = { t: "call", fn: t.v, a };
        } else node = { t: "call", fn: t.v, a: expr(3) };
      }
      else if (t.v in CONSTS || t.v === "ans") node = { t: "const", name: t.v };
      else node = { t: "var", name: t.v };
    }
    else if (t.k === "(") {
      p++; const a = expr(1);
      if (!peek() || peek().k !== ")") throw new Error(") expected"); p++;
      node = { t: "group", a };
    }
    else throw new Error("unexpected");
    for (;;) {
      const n = peek();
      if (n && n.k === "%") { p++; node = { t: "pct", a: node }; }
      else if (n && n.k === "!") { p++; node = { t: "fact", a: node }; }
      else break;
    }
    return node;
  }
  const root = expr(1);
  if (p !== toks.length) throw new Error("trailing");
  return root;
}

/* ============================ rational arithmetic ============================ */
const LIM = 10n ** 48n;
function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const r = a % b; a = b; b = r; } return a; }
function rat(n, d = 1n) {
  if (d === 0n) throw new Error("div0");
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d) || 1n;
  n /= g; d /= g;
  if (n > LIM || -n > LIM || d > LIM) return { f: Number(n) / Number(d) };
  return { n, d };
}
const isRat = (v) => v.f === undefined;
const toF = (v) => (isRat(v) ? Number(v.n) / Number(v.d) : v.f);
function fromDec(str) {
  const [a, b = ""] = str.split(".");
  return rat(BigInt((a || "0") + b), 10n ** BigInt(b.length));
}
const rAdd = (x, y) => (isRat(x) && isRat(y) ? rat(x.n * y.d + y.n * x.d, x.d * y.d) : { f: toF(x) + toF(y) });
const rSub = (x, y) => (isRat(x) && isRat(y) ? rat(x.n * y.d - y.n * x.d, x.d * y.d) : { f: toF(x) - toF(y) });
const rMul = (x, y) => (isRat(x) && isRat(y) ? rat(x.n * y.n, x.d * y.d) : { f: toF(x) * toF(y) });
function rDiv(x, y) {
  if (isRat(x) && isRat(y)) { if (y.n === 0n) throw new Error("div0"); return rat(x.n * y.d, x.d * y.n); }
  const f = toF(y); if (f === 0) throw new Error("div0");
  return { f: toF(x) / f };
}
function rPow(x, y) {
  if (isRat(x) && isRat(y) && y.d === 1n && y.n < 200n && y.n > -200n) {
    let e = y.n, base = x;
    if (e < 0n) { if (x.n === 0n) throw new Error("div0"); base = rat(x.d, x.n); e = -e; }
    let acc = rat(1n);
    for (let i = 0n; i < e; i++) { acc = rMul(acc, base); if (!isRat(acc)) break; }
    if (isRat(acc)) return acc;
  }
  const r = Math.pow(toF(x), toF(y));
  if (!isFinite(r) || isNaN(r)) throw new Error("undefined");
  return { f: r };
}

function eval_(node, env) {
  switch (node.t) {
    case "num": return node.v.includes(".") ? fromDec(node.v) : rat(BigInt(node.v));
    case "const": return node.name === "ans" ? env.ans : { f: CONSTS[node.name] };
    case "var": {
      const v = env.vars && env.vars[node.name];
      if (!v) throw new Error(node.name + " is not defined");
      return v;
    }
    case "group": return eval_(node.a, env);
    case "neg": { const v = eval_(node.a, env); return isRat(v) ? rat(-v.n, v.d) : { f: -v.f }; }
    case "pct": return rDiv(eval_(node.a, env), rat(100n));
    case "fact": {
      const v = eval_(node.a, env);
      if (!isRat(v) || v.d !== 1n || v.n < 0n || v.n > 500n) throw new Error("! needs an integer 0–500");
      let acc = 1n; for (let i = 2n; i <= v.n; i++) acc *= i;
      return rat(acc);
    }
    case "call": {
      const v = eval_(node.a, env);
      if (node.fn === "abs" && isRat(v)) return rat(v.n < 0n ? -v.n : v.n, v.d);
      const r = FUNCS[node.fn](toF(v));
      if (!isFinite(r) || isNaN(r)) throw new Error("undefined");
      return { f: r };
    }
    case "bin": {
      const a = eval_(node.a, env), b = eval_(node.b, env);
      switch (node.op) {
        case "+": return rAdd(a, b);
        case "-": return rSub(a, b);
        case "*": return rMul(a, b);
        case "/": return rDiv(a, b);
        case "^": return rPow(a, b);
      }
    }
  }
  throw new Error("?");
}

/* ============================ formatting ============================ */
const trim = (s) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
function fmtFloat(x) {
  if (!isFinite(x) || isNaN(x)) return { html: "undefined", copy: "undefined" };
  if (x === 0) return { html: "0", copy: "0" };
  const ax = Math.abs(x);
  if (ax >= 1e10 || ax < 1e-7) {
    const [m, e] = x.toExponential(8).split("e");
    return { html: `${trim(m)}×10<sup>${+e}</sup>`, copy: `${trim(m)}e${+e}` };
  }
  const s = trim(x.toPrecision(11));
  return { html: s, copy: s };
}
function isFiniteDec(d) { while (d % 2n === 0n) d /= 2n; while (d % 5n === 0n) d /= 5n; return d === 1n; }
function fmtVal(v) {
  if (!isRat(v)) return fmtFloat(v.f);
  if (v.d === 1n) { const s = v.n.toString(); return { html: s, copy: s }; }
  const neg = v.n < 0n, nn = neg ? -v.n : v.n;
  const dec = fmtFloat(Number(v.n) / Number(v.d));
  const sign = neg ? "−" : "";
  return {
    html: `${sign}<span class="frac"><span class="fn">${nn}</span><span class="fd">${v.d}</span></span> <span class="dim">${isFiniteDec(v.d) ? "=" : "≈"} ${dec.html}</span>`,
    copy: dec.copy,
  };
}

/* ============================ pretty-render ============================ */
const escTxt = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
function rx(node, pp) {
  switch (node.t) {
    case "num": return escTxt(node.v);
    case "const": return node.name === "pi" ? "π" : node.name;
    case "var": return "<em>" + escTxt(node.name) + "</em>";
    case "group": return rx(node.a, pp);
    case "neg": { const h = "−" + rx(node.a, 2.6); return pp > 2 ? "(" + h + ")" : h; }
    case "pct": return rx(node.a, 4) + "%";
    case "fact": return rx(node.a, 4) + "!";
    case "call":
      if (node.fn === "sqrt") return `<span class="rt">√<span class="rtv">${rx(node.a, 0)}</span></span>`;
      return node.fn + "(" + rx(node.a, 0) + ")";
    case "bin": {
      if (node.op === "/")
        return `<span class="frac"><span class="fn">${rx(node.a, 0)}</span><span class="fd">${rx(node.b, 0)}</span></span>`;
      if (node.op === "^") {
        let base = rx(node.a, 4);
        if (node.a.t === "bin" && node.a.op === "/") base = "(" + base + ")";
        return base + "<sup>" + rx(node.b, 0) + "</sup>";
      }
      if (node.op === "*") {
        const sep = node.imp ? ((node.b.t === "num" || (node.b.t === "bin" && node.b.op === "/")) ? "·" : "") : "×";
        const h = rx(node.a, 2) + sep + rx(node.b, 2.5);
        return 2 < pp ? "(" + h + ")" : h;
      }
      const h = rx(node.a, 1) + " " + (node.op === "-" ? "−" : "+") + " " + rx(node.b, 1.5);
      return 1 < pp ? "(" + h + ")" : h;
    }
  }
  return "?";
}

/* ============================ analysis: value / assign / graph ============================ */
let ansVal = { n: 0n, d: 1n };
let VARS = {};
const RESERVED = new Set([...Object.keys(FUNCS), "pi", "e", "ans", "y", "of"]);

function freeVars(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (node.t === "var" && !(node.name in VARS)) out.add(node.name);
  if (node.a) freeVars(node.a, out);
  if (node.b) freeVars(node.b, out);
  return out;
}
const envBase = () => ({ ans: ansVal, vars: VARS });

function analyze(text) {
  const t = text.trim();
  if (!t) return null;
  const m = t.match(/^([a-zA-Z]+)\s*=(?!=)\s*(.+)$/);
  if (m) {
    const name = m[1].toLowerCase();
    const ast = parse(tokenize(m[2]));
    if (name === "y") return { kind: "graph", ast };
    if (RESERVED.has(name)) throw new Error("“" + name + "” is reserved");
    const fv = freeVars(ast);
    if (fv.size) throw new Error(fv.values().next().value + " is not defined");
    return { kind: "assign", name, ast, val: eval_(ast, envBase()) };
  }
  const ast = parse(tokenize(t));
  const fv = freeVars(ast);
  // A real expression in an unset x graphs implicitly; a lone "x" doesn't
  // (you're probably mid-way through typing "x = 5"). y= always graphs.
  if (fv.size === 1 && fv.has("x") && ast.t !== "var") return { kind: "graph", ast };
  if (fv.size) throw new Error(fv.values().next().value + " is not defined");
  return { kind: "value", ast, val: eval_(ast, envBase()) };
}

/* ============================ graphing ============================ */
let xMin = -10, xMax = 10, lastAst = null;
const GW = 560, GH = 250, GP = 10;
const snum = (v) => String(Number(v.toPrecision(3)));
const niceStep = (raw) => { const mag = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / mag; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag; };
function buildGraph(ast) {
  const N = 240, pts = [];
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    let y = NaN;
    try { y = toF(eval_(ast, { ans: ansVal, vars: Object.assign({}, VARS, { x: { f: x } }) })); } catch {}
    pts.push([x, isFinite(y) ? y : NaN]);
  }
  const ys = pts.map((p) => p[1]).filter((v) => !isNaN(v)).sort((a, b) => a - b);
  if (!ys.length) throw new Error("nothing to plot");
  const fullLo = ys[0], fullHi = ys[ys.length - 1];
  let lo = ys[Math.floor(ys.length * 0.04)], hi = ys[Math.ceil(ys.length * 0.96) - 1];
  // True range for smooth functions; percentile range only to tame asymptotes.
  if (!(hi > lo) || fullHi - fullLo <= 3 * (hi - lo)) { lo = fullLo; hi = fullHi; }
  if (!(hi > lo)) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;   // breathing room; bounds stay raw so zoom scales smoothly
  const px = (x) => GP + ((x - xMin) / (xMax - xMin)) * (GW - 2 * GP);
  const py = (y) => GH - GP - ((y - lo) / (hi - lo)) * (GH - 2 * GP);
  const span = hi - lo, limHi = hi + span, limLo = lo - span;
  const segs = []; let cur = [];
  for (const [x, y] of pts) {
    if (isNaN(y) || y > limHi || y < limLo) { if (cur.length > 1) segs.push(cur); cur = []; continue; }
    cur.push(px(x).toFixed(1) + "," + py(y).toFixed(1));
  }
  if (cur.length > 1) segs.push(cur);
  if (!segs.length) throw new Error("nothing to plot");
  const grid = (min, max, toPix, horiz) => {
    const st = niceStep((max - min) / 5); let out = "";
    for (let k = Math.ceil(min / st); k <= Math.floor(max / st); k++) {
      const v = k * st; if (Math.abs(v) < st * 1e-6) continue;   // 0 is the axis itself
      const p = +toPix(v).toFixed(1);
      out += horiz
        ? `<line class="ggrid" x1="${GP}" y1="${p}" x2="${GW - GP}" y2="${p}"/><text class="glabel" x="${GP + 2}" y="${p - 3}">${snum(v)}</text>`
        : `<line class="ggrid" x1="${p}" y1="${GP}" x2="${p}" y2="${GH - GP}"/><text class="glabel" x="${p}" y="${GH - GP - 3}" text-anchor="middle">${snum(v)}</text>`;
    }
    return out;
  };
  let svg = `<svg viewBox="0 0 ${GW} ${GH}" xmlns="http://www.w3.org/2000/svg">`;
  svg += grid(lo, hi, py, true) + grid(xMin, xMax, px, false);
  if (xMin <= 0 && 0 <= xMax) svg += `<line class="gax" x1="${px(0)}" y1="${GP}" x2="${px(0)}" y2="${GH - GP}"/>`;
  if (lo <= 0 && 0 <= hi) svg += `<line class="gax" x1="${GP}" y1="${py(0)}" x2="${GW - GP}" y2="${py(0)}"/>`;
  svg += segs.map((s) => `<polyline class="gcurve" points="${s.join(" ")}"/>`).join("");
  svg += `</svg>`;
  return svg;
}

function showGraph(ast) {
  lastAst = ast;
  gwrapEl.innerHTML = buildGraph(ast);
  liveEl.innerHTML = `<span class="ex"><em>y</em> = ${rx(ast, 0)}</span><span class="dim">${snum(xMin)} ≤ <em>x</em> ≤ ${snum(xMax)}</span>`;
}
function setXSpan(span) {
  span = Math.min(1e6, Math.max(1e-3, span));
  const c = (xMin + xMax) / 2;
  xMin = c - span / 2;
  xMax = c + span / 2;
  if (lastAst) showGraph(lastAst);
}
const zoomBy = (f) => setXSpan((xMax - xMin) * f);

/* ============================ plugin ============================ */
let api = null, liveEl = null, tapeEl = null, graphEl = null, gwrapEl = null, styleEl = null;
let graphMode = false;

function setGraphMode(on) {
  if (on === graphMode) return;
  graphMode = on;
  tapeEl.hidden = on;
  graphEl.hidden = !on;
  api.setHeight(on ? 392 : 210);
}
function errMsg(e) {
  const m = (e && e.message) || "";
  if (m === "div0") return "division by zero";
  if (m === "undefined" || /needs|defined|reserved|plot/.test(m)) return m;
  return "…";
}

const HELP = `
<p>Type expressions straight into the search box — the result renders live below,
and exact fractions stay exact (<em>1/3 + 1/6</em> gives ½, with the decimal alongside).</p>
<h3>Operators</h3>
<table class="help-keys">
  <tr><td><kbd>+ − × ÷</kbd></td><td>arithmetic (<kbd>*</kbd> and <kbd>/</kbd> work too)</td></tr>
  <tr><td><kbd>^</kbd></td><td>powers — 2^10</td></tr>
  <tr><td><kbd>%</kbd></td><td>percent — 15% of 240</td></tr>
  <tr><td><kbd>!</kbd></td><td>factorial — 5!</td></tr>
  <tr><td><kbd>( )</kbd></td><td>grouping; implicit multiply works — 2π, 2(3+4)</td></tr>
</table>
<h3>Variables &amp; graphs</h3>
<table class="help-keys">
  <tr><td><kbd>x = 5</kbd></td><td>set a variable (↵ to store it), then use it — x^2 + 1</td></tr>
  <tr><td><kbd>y = x^2 − 3</kbd></td><td>graph it; any expression with an <em>unset</em> x plots too (−10 ≤ x ≤ 10 to start)</td></tr>
  <tr><td><kbd>+ − ⟲</kbd></td><td>zoom the x-window — scrolling or pinching on the graph works too; y auto-fits</td></tr>
</table>
<h3>Functions &amp; constants</h3>
<table class="help-keys">
  <tr><td><kbd>sqrt abs</kbd></td><td>√ works too — sqrt(2)</td></tr>
  <tr><td><kbd>sin cos tan</kbd></td><td>radians; asin, acos, atan</td></tr>
  <tr><td><kbd>ln log exp</kbd></td><td>natural log, log₁₀, eˣ</td></tr>
  <tr><td><kbd>floor ceil round</kbd></td><td>rounding</td></tr>
  <tr><td><kbd>π e ans</kbd></td><td>constants — ans is the last tape result</td></tr>
</table>
<h3>Tape</h3>
<table class="help-keys">
  <tr><td><kbd>↵</kbd></td><td>commit the expression to the tape (graphs stay live)</td></tr>
  <tr><td><kbd>click</kbd></td><td>copy a result</td></tr>
  <tr><td><kbd>esc</kbd></td><td>back to the omnibox</td></tr>
</table>`;

const plugin = {
  hints: [["↵", "add to tape"], ["y=", "graph"], ["ans", "last result"], ["click", "copy"]],
  help: HELP,
  mount(root, hostApi) {
    api = hostApi;
    styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
    root.innerHTML = `<div class="calcp"><div class="live">${PH}</div><div class="graph" hidden><div class="gwrap"></div><div class="gzoom"><button type="button" class="gz" title="Zoom in">+</button><button type="button" class="gz" title="Zoom out">−</button><button type="button" class="gz" title="Reset zoom">⟲</button></div></div><div class="tape"></div></div>`;
    liveEl = root.querySelector(".live");
    tapeEl = root.querySelector(".tape");
    graphEl = root.querySelector(".graph");
    gwrapEl = root.querySelector(".gwrap");
    graphMode = false;
    const [zin, zout, zreset] = root.querySelectorAll(".gz");
    zin.onclick = () => zoomBy(0.5);
    zout.onclick = () => zoomBy(2);
    zreset.onclick = () => { xMin = -10; xMax = 10; if (lastAst) showGraph(lastAst); };
    // scroll wheel zooms; Safari trackpad pinch comes through gesture events
    graphEl.addEventListener("wheel", (e) => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * 0.0015)); }, { passive: false });
    let pinchBase = null;
    graphEl.addEventListener("gesturestart", (e) => { e.preventDefault(); pinchBase = xMax - xMin; });
    graphEl.addEventListener("gesturechange", (e) => { e.preventDefault(); if (pinchBase && e.scale) setXSpan(pinchBase / e.scale); });
    graphEl.addEventListener("gestureend", () => { pinchBase = null; });
  },
  onInput(text) {
    if (!text.trim()) { setGraphMode(false); liveEl.innerHTML = PH; return; }
    try {
      const r = analyze(text);
      if (r.kind === "graph") {
        showGraph(r.ast);
        setGraphMode(true);
        return;
      }
      setGraphMode(false);
      const f = fmtVal(r.val);
      const lhs = r.kind === "assign" ? `<em>${r.name}</em> = ` : "";
      liveEl.innerHTML = `<span class="ex">${lhs}${rx(r.ast, 0)}</span><span class="res">= ${f.html}</span>`;
    } catch (e) {
      // keep the current mode while mid-edit so the panel doesn't bounce
      liveEl.innerHTML = `<span class="err">${errMsg(e)}</span>`;
    }
  },
  onEnter(text) {
    let r;
    try { r = analyze(text); } catch { return; }
    if (!r || r.kind === "graph") return;   // graphs are live-only
    const f = fmtVal(r.val);
    ansVal = r.val;
    if (r.kind === "assign") VARS[r.name] = r.val;
    const lhs = r.kind === "assign" ? `<em>${r.name}</em> = ` : "";
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span class="ex">${lhs}${rx(r.ast, 0)}</span><span class="res">= ${f.html}</span>`;
    row.title = "Copy " + f.copy;
    row.onclick = () => {
      try { navigator.clipboard.writeText(f.copy); } catch {}
      const c = document.createElement("span");
      c.className = "copied"; c.textContent = "copied";
      row.querySelector(".res").appendChild(c);
      setTimeout(() => c.remove(), 900);
    };
    tapeEl.prepend(row);
    api.setInput("");
    plugin.onInput("");
  },
  unmount() {
    if (styleEl) styleEl.remove();
    api = liveEl = tapeEl = graphEl = gwrapEl = null;
    graphMode = false;
    ansVal = { n: 0n, d: 1n };
    VARS = {};
    xMin = -10; xMax = 10; lastAst = null;
  },
};
export default plugin;
