/* start-page plugin: Calculator (trigger "==")
   Safe expression engine — no eval(). Exact fractions via BigInt rationals where
   possible; expressions pretty-rendered with stacked fractions, superscript
   exponents and radical signs. Part of start-page (MIT). */

const CSS = `
.calcp { height: 100%; display: flex; flex-direction: column; font-size: 1.02rem; color: var(--fg, #f4f6fb); }
.calcp .live { min-height: 3.2rem; flex: none; display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; padding: 0.55rem 1rem 0.45rem; }
.calcp .ph { color: rgba(244,246,251,0.38); font-size: 0.83rem; }
.calcp .err { color: rgba(244,246,251,0.45); font-size: 0.85rem; }
.calcp .tape { flex: 1; overflow-y: auto; padding: 0.25rem 0.6rem 0.5rem; border-top: 1px solid rgba(255,255,255,0.09); display: flex; flex-direction: column; gap: 0.15rem; }
.calcp .row { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; cursor: pointer; border-radius: 8px; padding: 0.28rem 0.45rem; }
.calcp .row:hover { background: rgba(255,255,255,0.07); }
.calcp .ex { opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.calcp .res { color: #8ab4ff; font-variant-numeric: tabular-nums; white-space: nowrap; }
.calcp .dim { opacity: 0.55; }
.calcp .copied { color: #7de0a0; font-size: 0.72rem; margin-left: 0.45rem; }
.calcp .frac { display: inline-block; vertical-align: -0.65em; text-align: center; line-height: 1.15; margin: 0 0.14em; }
.calcp .frac > span { display: block; padding: 0 0.3em; }
.calcp .frac .fn { border-bottom: 1px solid currentColor; }
.calcp sup { font-size: 0.7em; }
.calcp .rt { white-space: nowrap; }
.calcp .rt .rtv { border-top: 1px solid currentColor; padding: 0 0.18em; }
`;

const PH = `<span class="ph">1/3 + 1/6 &nbsp;·&nbsp; 2^10 &nbsp;·&nbsp; 15% of 240 &nbsp;·&nbsp; sin(π/6) &nbsp;·&nbsp; 5! &nbsp;·&nbsp; ans</span>`;

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
      else throw new Error("unknown: " + t.v);
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

/* ============================ plugin ============================ */
let api = null, liveEl = null, tapeEl = null, styleEl = null;
let ansVal = { n: 0n, d: 1n };

function compute(text) {
  const t = text.trim();
  if (!t) return null;
  const ast = parse(tokenize(t));
  return { ast, val: eval_(ast, { ans: ansVal }) };
}
function errMsg(e) {
  if (e && e.message === "div0") return "division by zero";
  if (e && (e.message === "undefined" || /needs/.test(e.message || ""))) return e.message;
  return "…";
}

const plugin = {
  hints: [["↵", "add to tape"], ["ans", "last result"], ["click", "copy result"]],
  mount(root, hostApi) {
    api = hostApi;
    styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
    root.innerHTML = `<div class="calcp"><div class="live">${PH}</div><div class="tape"></div></div>`;
    liveEl = root.querySelector(".live");
    tapeEl = root.querySelector(".tape");
  },
  onInput(text) {
    if (!text.trim()) { liveEl.innerHTML = PH; return; }
    try {
      const r = compute(text);
      const f = fmtVal(r.val);
      liveEl.innerHTML = `<span class="ex">${rx(r.ast, 0)}</span><span class="res">= ${f.html}</span>`;
    } catch (e) {
      liveEl.innerHTML = `<span class="err">${errMsg(e)}</span>`;
    }
  },
  onEnter(text) {
    let r;
    try { r = compute(text); } catch { return; }
    if (!r) return;
    const f = fmtVal(r.val);
    ansVal = r.val;
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span class="ex">${rx(r.ast, 0)}</span><span class="res">= ${f.html}</span>`;
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
    api = liveEl = tapeEl = null;
    ansVal = { n: 0n, d: 1n };
  },
};
export default plugin;
