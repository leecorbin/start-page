/* start-page plugin: Arcade (trigger "::")
   A tiny launcher + three casual games — 2048, Snake, Tetris — drawn on one
   canvas. Keyboard-driven (arrows / WASD, space), best scores in localStorage.
   Type "::snake" / "::2048" / "::tetris" to jump straight in. Part of start-page (MIT). */

const RF = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, sans-serif';
const FG = "#f4f6fb", MUT = "rgba(244,246,251,0.5)", DIM = "rgba(244,246,251,0.3)", ACC = "#5b9bff", GRN = "#7de0a0";

const CSS = `
.arc-home { height: 100%; display: flex; flex-direction: column; box-sizing: border-box; padding: 15px 17px; color: ${FG}; font-family: ${RF}; }
.arc-head { display: flex; align-items: baseline; gap: 0.6rem; margin: 0.1rem 0.2rem 0.8rem; }
.arc-title { font-size: 1.06rem; font-weight: 600; }
.arc-sub { font-size: 0.76rem; color: ${MUT}; }
.arc-cards { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.7rem; min-height: 0; }
.arc-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.42rem; background: rgba(255,255,255,0.05); border: 1px solid var(--field-border, rgba(255,255,255,0.12)); border-radius: 14px; color: ${FG}; cursor: pointer; padding: 0.8rem 0.6rem; font: inherit; transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease; }
.arc-card:hover, .arc-card.sel { background: rgba(91,155,255,0.14); border-color: rgba(91,155,255,0.5); transform: translateY(-2px); }
.arc-ic { width: 44px; height: 44px; display: grid; place-items: center; color: #9fb4d8; transition: color 0.15s ease; }
.arc-ic svg { width: 100%; height: 100%; }
.arc-card:hover .arc-ic, .arc-card.sel .arc-ic { color: ${ACC}; }
.arc-name { font-size: 0.98rem; font-weight: 600; }
.arc-tip { font-size: 0.72rem; color: ${MUT}; text-align: center; }
.arc-best { font-size: 0.72rem; color: ${GRN}; min-height: 0.9rem; }
.arc-stage { position: absolute; inset: 0; }
.arc-stage canvas { display: block; }
`;

const ICONS = {
  "2048": `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2" opacity=".55"/><rect x="3" y="13" width="8" height="8" rx="2" opacity=".55"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>`,
  snake: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h9"/><circle cx="19" cy="5.5" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  tetris: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="9" width="5.6" height="5.6" rx="1.2"/><rect x="9.2" y="9" width="5.6" height="5.6" rx="1.2"/><rect x="15.4" y="9" width="5.6" height="5.6" rx="1.2"/><rect x="9.2" y="2.8" width="5.6" height="5.6" rx="1.2"/></svg>`,
};
const SVG = {
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
  restart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 2.6-6.3"/><path d="M3 4.5V9h4.5"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5.5" width="3.6" height="13" rx="1.2"/><rect x="13.4" y="5.5" width="3.6" height="13" rx="1.2"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.2l11 6.8-11 6.8z"/></svg>`,
};

/* ---------- best scores ---------- */
const KEY = "startpage:arcade";
const loadBest = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let best = loadBest();
function saveBest(id, score) {
  if (score > (best[id] || 0)) { best[id] = score; try { localStorage.setItem(KEY, JSON.stringify(best)); } catch {} return true; }
  return false;
}
const rand = (n) => Math.random() * n | 0;

/* ---------- shell state ---------- */
let api = null, root = null, styleEl = null, canvas = null, ctx = null;
let W = 600, H = 300, stageH = 300, dpr = 1, raf = 0, lastT = 0;
let view = "home", cur = null, paused = false, selIdx = 0, pauseBtn = null;

const GAMES = [
  { id: "2048", name: "2048", h: 384, tip: "join tiles to 2048", make: make2048 },
  { id: "snake", name: "Snake", h: 360, tip: "eat, grow, don't bite", make: makeSnake },
  { id: "tetris", name: "Tetris", h: 472, tip: "clear the lines", make: makeTetris },
];

/* ---------- canvas helpers (logical px; dpr handled in fit) ---------- */
function fit() {
  if (!canvas) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = root.clientWidth || 600; H = stageH;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function RR(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fillRR(x, y, w, h, r, col) { RR(x, y, w, h, r); ctx.fillStyle = col; ctx.fill(); }
function T(s, x, y, size, col, align, weight) {
  ctx.fillStyle = col; ctx.font = `${weight || 600} ${size}px ${RF}`;
  ctx.textAlign = align || "left"; ctx.textBaseline = "middle"; ctx.fillText(s, x, y);
}
// a glossy game block: rounded fill + a soft top sheen
function block(x, y, s, col) {
  const r = Math.max(2, s * 0.16), p = Math.max(0.5, s * 0.06);
  fillRR(x + p, y + p, s - 2 * p, s - 2 * p, r, col);
  ctx.save(); RR(x + p, y + p, s - 2 * p, s - 2 * p, r); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x, y, s, s * 0.42);
  ctx.restore();
}

/* ============================ 2048 ============================ */
const C2048 = { 2: "#36405a", 4: "#3f5374", 8: "#4f74b6", 16: ACC, 32: "#6f8be8", 64: "#8a7be8", 128: "#b873d6", 256: "#d56fa8", 512: "#e0896f", 1024: "#e0b56f", 2048: GRN };
// compress + merge one row toward index 0 (pure)
function slide2048(v) {
  const f = v.filter((x) => x), o = []; let gain = 0;
  for (let i = 0; i < f.length; i++) { if (f[i] === f[i + 1]) { o.push(f[i] * 2); gain += f[i] * 2; i++; } else o.push(f[i]); }
  while (o.length < 4) o.push(0);
  return { o, gain, moved: o.some((x, i) => x !== v[i]) };
}
function make2048() {
  const self = { id: "2048", score: 0, over: false, newBest: false };
  let g, anim;
  function spawn() { const e = []; for (let i = 0; i < 16; i++) if (!g[i]) e.push(i); if (!e.length) return; const i = e[rand(e.length)]; g[i] = Math.random() < 0.9 ? 2 : 4; anim[i] = 1; }
  function canMove() { for (let i = 0; i < 16; i++) { if (!g[i]) return true; const x = i % 4, y = i / 4 | 0; if (x < 3 && g[i] === g[i + 1]) return true; if (y < 3 && g[i] === g[i + 4]) return true; } return false; }
  self.reset = () => { g = Array(16).fill(0); anim = Array(16).fill(0); self.score = 0; self.over = false; self.newBest = false; spawn(); spawn(); };
  self.input = (k) => {
    if (self.over || !{ left: 1, right: 1, up: 1, down: 1 }[k]) return;
    let moved = false, gain = 0;
    for (let row = 0; row < 4; row++) {
      const idx = [];
      for (let j = 0; j < 4; j++) idx.push(k === "left" ? row * 4 + j : k === "right" ? row * 4 + (3 - j) : k === "up" ? j * 4 + row : (3 - j) * 4 + row);
      const r = slide2048(idx.map((i) => g[i]));
      if (r.moved) { moved = true; gain += r.gain; idx.forEach((i, j) => { if (r.o[j] && r.o[j] !== g[i]) anim[i] = 1; g[i] = r.o[j]; }); }
    }
    if (moved) { self.score += gain; spawn(); if (!canMove()) { self.over = true; self.newBest = saveBest("2048", self.score); } }
  };
  self.update = (dt) => { for (let i = 0; i < 16; i++) if (anim[i] > 0) anim[i] = Math.max(0, anim[i] - dt * 7); };
  self.draw = () => {
    const pad = 16, side = Math.min(W * 0.34, 190), leftW = W - side;
    const bs = Math.min(H - 2 * pad, leftW - 2 * pad), bx = (leftW - bs) / 2, by = (H - bs) / 2;
    const gap = bs * 0.028, cs = (bs - gap * 5) / 4;
    fillRR(bx, by, bs, bs, 14, "rgba(255,255,255,0.05)");
    for (let i = 0; i < 16; i++) {
      const x = bx + gap + (i % 4) * (cs + gap), y = by + gap + (i / 4 | 0) * (cs + gap);
      fillRR(x, y, cs, cs, cs * 0.14, "rgba(255,255,255,0.04)");
      const v = g[i]; if (!v) continue;
      const sc = 1 - 0.42 * anim[i], d = cs * (1 - sc) / 2;
      block(x + d, y + d, cs * sc, C2048[v] || GRN);
      const light = v >= 1024, fs = cs * (v < 100 ? 0.42 : v < 1000 ? 0.33 : 0.27);
      T(v, x + cs / 2, y + cs / 2 + 1, fs * sc, light ? "#10161f" : FG, "center", 700);
    }
    const sx = leftW + 6, top = by + 4;
    T("2048", sx, top + 8, 21, FG, "left", 700);
    T("SCORE", sx, top + 46, 11, DIM, "left", 700);
    T(self.score, sx, top + 68, 22, ACC, "left", 700);
    T("BEST", sx, top + 100, 11, DIM, "left", 700);
    T(best["2048"] || 0, sx, top + 121, 17, GRN, "left", 700);
    T("← ↑ → ↓  slide", sx, by + bs - 18, 11.5, MUT, "left");
    T("R restart · esc back", sx, by + bs - 2, 11.5, MUT, "left");
  };
  self.reset();
  return self;
}

/* ============================ Snake ============================ */
function makeSnake() {
  const self = { id: "snake", score: 0, over: false, newBest: false };
  const HEAD = 24, PADX = 16, PADY = 12;
  let cols, rows, snake, dir, nd, food, acc, speed;
  function place() { let p; do { p = { x: rand(cols), y: rand(rows) }; } while (snake.some((s) => s.x === p.x && s.y === p.y)); return p; }
  function geom() { const cs = Math.min((W - 2 * PADX) / cols, (H - HEAD - 2 * PADY) / rows); const gw = cs * cols, gh = cs * rows; return { cs, gw, gh, ox: (W - gw) / 2, oy: HEAD + PADY + ((H - HEAD - PADY) - gh) / 2 }; }
  self.reset = () => {
    cols = Math.max(16, Math.floor((W - 2 * PADX) / 22)); rows = Math.max(9, Math.floor((H - HEAD - 2 * PADY) / 22));
    const cx = cols / 2 | 0, cy = rows / 2 | 0;
    snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }, { x: cx - 3, y: cy }];
    dir = { x: 1, y: 0 }; nd = dir; food = place(); acc = 0; speed = 7; self.score = 0; self.over = false; self.newBest = false;
  };
  self.input = (k) => { const d = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[k]; if (!d || (d.x === -dir.x && d.y === -dir.y)) return; nd = d; };
  function tick() {
    dir = nd; const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= cols || h.y >= rows || snake.some((s) => s.x === h.x && s.y === h.y)) { self.over = true; self.newBest = saveBest("snake", self.score); return; }
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) { self.score += 1; speed = Math.min(15, 7 + self.score * 0.35); food = place(); } else snake.pop();
  }
  self.update = (dt) => { acc += dt; const iv = 1 / speed; while (acc >= iv) { acc -= iv; tick(); if (self.over) return; } };
  self.draw = () => {
    const { cs, gw, gh, ox, oy } = geom();
    T("Snake", PADX, HEAD / 2 + 5, 15, FG, "left", 700);
    T(`score ${self.score}`, W - PADX, HEAD / 2 + 5, 13, ACC, "right", 700);
    T(`best ${best.snake || 0}`, W - PADX - 92, HEAD / 2 + 5, 12, GRN, "right");
    fillRR(ox - 6, oy - 6, gw + 12, gh + 12, 12, "rgba(255,255,255,0.035)");
    // food — a soft glowing dot
    const fx = ox + food.x * cs + cs / 2, fy = oy + food.y * cs + cs / 2;
    const gr = ctx.createRadialGradient(fx, fy, 1, fx, fy, cs * 0.9); gr.addColorStop(0, "rgba(91,155,255,0.5)"); gr.addColorStop(1, "rgba(91,155,255,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(fx, fy, cs * 0.9, 0, 7); ctx.fill();
    ctx.fillStyle = ACC; ctx.beginPath(); ctx.arc(fx, fy, cs * 0.3, 0, 7); ctx.fill();
    // snake — head bright, body easing to a deeper green
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i], t = i / Math.max(1, snake.length - 1);
      const col = i === 0 ? "#aef0c6" : `rgb(${Math.round(125 - t * 55)},${Math.round(224 - t * 96)},${Math.round(160 - t * 64)})`;
      block(ox + s.x * cs, oy + s.y * cs, cs, col);
    }
  };
  self.reset();
  return self;
}

/* ============================ Tetris ============================ */
const COLS = 10, ROWS = 18;
const PIECES = [
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],   // I
  [[1, 1], [1, 1]],                                           // O
  [[0, 1, 0], [1, 1, 1], [0, 0, 0]],                          // T
  [[0, 1, 1], [1, 1, 0], [0, 0, 0]],                          // S
  [[1, 1, 0], [0, 1, 1], [0, 0, 0]],                          // Z
  [[1, 0, 0], [1, 1, 1], [0, 0, 0]],                          // J
  [[0, 0, 1], [1, 1, 1], [0, 0, 0]],                          // L
];
const TC = [ACC, GRN, "#b873d6", "#e0b56f", "#e0896f", "#6f8be8", "#d56fa8"];
const rotCW = (m) => m.map((r, i) => r.map((_, j) => m[m.length - 1 - j][i]));   // rotate a square matrix clockwise (pure)
function makeTetris() {
  const self = { id: "tetris", score: 0, over: false, newBest: false, lines: 0 };
  let bd, piece, nextP, acc, iv;
  const level = () => Math.floor(self.lines / 10);
  const speed = () => Math.max(0.07, 0.8 - level() * 0.08);
  function newPiece() { const i = rand(7), m = PIECES[i].map((r) => r.slice()); return { m, c: i, x: Math.floor((COLS - m[0].length) / 2), y: 0 }; }
  function hits(m, px, py) {
    for (let i = 0; i < m.length; i++) for (let j = 0; j < m[i].length; j++) if (m[i][j]) {
      const x = px + j, y = py + i;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && bd[y][x]) return true;
    }
    return false;
  }
  function lock() {
    piece.m.forEach((r, i) => r.forEach((v, j) => { if (v) { const y = piece.y + i, x = piece.x + j; if (y >= 0) bd[y][x] = piece.c + 1; } }));
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) if (bd[y].every((c) => c)) { bd.splice(y, 1); bd.unshift(Array(COLS).fill(0)); cleared++; y++; }
    if (cleared) { self.lines += cleared; self.score += [0, 40, 100, 300, 1200][cleared] * (level() + 1); iv = speed(); }
    piece = nextP; nextP = newPiece();
    if (hits(piece.m, piece.x, piece.y)) { self.over = true; self.newBest = saveBest("tetris", self.score); }
  }
  self.reset = () => { bd = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); self.score = 0; self.lines = 0; self.over = false; self.newBest = false; acc = 0; iv = 0.8; piece = newPiece(); nextP = newPiece(); };
  self.input = (k) => {
    if (self.over) return;
    if (k === "left" && !hits(piece.m, piece.x - 1, piece.y)) piece.x--;
    else if (k === "right" && !hits(piece.m, piece.x + 1, piece.y)) piece.x++;
    else if (k === "down") { if (!hits(piece.m, piece.x, piece.y + 1)) { piece.y++; self.score += 1; } }
    else if (k === "up") { const r = rotCW(piece.m); for (const dx of [0, -1, 1, -2, 2]) if (!hits(r, piece.x + dx, piece.y)) { piece.m = r; piece.x += dx; break; } }
    else if (k === "space") { while (!hits(piece.m, piece.x, piece.y + 1)) { piece.y++; self.score += 2; } lock(); }
  };
  self.update = (dt) => { acc += dt; if (acc >= iv) { acc = 0; if (!hits(piece.m, piece.x, piece.y + 1)) piece.y++; else lock(); } };
  function ghostY() { let y = piece.y; while (!hits(piece.m, piece.x, y + 1)) y++; return y; }
  self.draw = () => {
    const pad = 14, cell = Math.min((H - 2 * pad) / ROWS, (W * 0.42 - 2 * pad) / COLS);
    const ww = cell * COLS, wh = cell * ROWS, wx = pad + 12, wy = (H - wh) / 2;
    fillRR(wx - 5, wy - 5, ww + 10, wh + 10, 10, "rgba(255,255,255,0.045)");
    ctx.save(); RR(wx, wy, ww, wh, 4); ctx.clip();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (bd[y][x]) block(wx + x * cell, wy + y * cell, cell, TC[bd[y][x] - 1]);
    const gy = ghostY();
    piece.m.forEach((r, i) => r.forEach((v, j) => { if (v && gy + i >= 0) { fillRR(wx + (piece.x + j) * cell + cell * 0.08, wy + (gy + i) * cell + cell * 0.08, cell * 0.84, cell * 0.84, cell * 0.16, "rgba(255,255,255,0.08)"); } }));
    piece.m.forEach((r, i) => r.forEach((v, j) => { if (v && piece.y + i >= 0) block(wx + (piece.x + j) * cell, wy + (piece.y + i) * cell, cell, TC[piece.c]); }));
    ctx.restore();
    // sidebar
    const sx = wx + ww + 26;
    T("NEXT", sx, wy + 8, 11, DIM, "left", 700);
    const ns = Math.min(cell, 20), nm = nextP.m, nw = nm[0].length * ns, nh = nm.length * ns;
    fillRR(sx, wy + 18, 4.4 * ns, 3.2 * ns, 8, "rgba(255,255,255,0.04)");
    const nox = sx + (4.4 * ns - nw) / 2, noy = wy + 18 + (3.2 * ns - nh) / 2;
    nm.forEach((r, i) => r.forEach((v, j) => { if (v) block(nox + j * ns, noy + i * ns, ns, TC[nextP.c]); }));
    let yy = wy + 18 + 3.2 * ns + 26;
    for (const [lab, val, col] of [["SCORE", self.score, ACC], ["LINES", self.lines, FG], ["LEVEL", level() + 1, GRN]]) {
      T(lab, sx, yy, 11, DIM, "left", 700); T(val, sx, yy + 20, 19, col, "left", 700); yy += 48;
    }
    T("← → move · ↑ rotate", sx, wy + wh - 16, 11, MUT, "left");
    T("space drop · R restart", sx, wy + wh - 1, 11, MUT, "left");
  };
  self.reset();
  return self;
}

/* ============================ shell ============================ */
function overlay(title, sub) {
  ctx.fillStyle = "rgba(10,14,20,0.62)"; ctx.fillRect(0, 0, W, H);
  T(title, W / 2, H / 2 - 12, 26, FG, "center", 700);
  T(sub, W / 2, H / 2 + 18, 13, MUT, "center");
}
function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  cur.draw();
  if (paused) overlay("Paused", "P or ▶ to resume");
  else if (cur.over) overlay("Game over", `score ${cur.score}${cur.newBest ? "  ·  new best!" : ""}   —   ↵ or R to play again`);
}
function frame(ts) {
  if (view === "home" || !cur) { raf = 0; return; }
  if (!lastT) lastT = ts;
  let dt = (ts - lastT) / 1000; lastT = ts; if (dt > 0.05) dt = 0.05;
  if (!paused && !cur.over) cur.update(dt);
  draw();
  if (paused || cur.over) { raf = 0; return; }   // freeze; resume re-arms the loop
  raf = requestAnimationFrame(frame);
}
function startLoop() { if (raf) cancelAnimationFrame(raf); lastT = 0; raf = requestAnimationFrame(frame); }
function updatePauseBtn() { if (pauseBtn) pauseBtn.innerHTML = paused ? SVG.play : SVG.pause; }
function togglePause() { if (!cur || cur.over) return; paused = !paused; updatePauseBtn(); paused ? draw() : startLoop(); }

function homeHTML() {
  return `<div class="arc-home"><div class="arc-head"><span class="arc-title">Arcade</span><span class="arc-sub">pick a game · arrows &amp; space</span></div>
    <div class="arc-cards">${GAMES.map((g, i) => `<button class="arc-card${i === selIdx ? " sel" : ""}" data-id="${g.id}"><span class="arc-ic">${ICONS[g.id]}</span><span class="arc-name">${g.name}</span><span class="arc-tip">${g.tip}</span><span class="arc-best">${best[g.id] ? "best " + best[g.id] : ""}</span></button>`).join("")}</div></div>`;
}
function hi() { root.querySelectorAll(".arc-card").forEach((b, i) => b.classList.toggle("sel", i === selIdx)); }
function showHome() {
  view = "home"; cur = null; paused = false; if (raf) { cancelAnimationFrame(raf); raf = 0; }
  canvas = null; ctx = null; pauseBtn = null;
  api.setButtons([]);
  stageH = 300; api.setHeight(300);
  root.innerHTML = homeHTML();
  root.querySelectorAll(".arc-card").forEach((b) => {
    b.onmouseenter = () => { selIdx = GAMES.findIndex((x) => x.id === b.dataset.id); hi(); };
    b.onclick = () => { selIdx = GAMES.findIndex((x) => x.id === b.dataset.id); launch(GAMES[selIdx]); };
  });
}
function launch(g) {
  view = g.id; paused = false;
  root.innerHTML = '<div class="arc-stage"><canvas></canvas></div>';
  canvas = root.querySelector("canvas"); ctx = canvas.getContext("2d");
  stageH = g.h; api.setHeight(g.h); fit();
  cur = g.make();
  const btns = api.setButtons([
    { svg: SVG.back, title: "Back to games (esc)", label: "Back to games", onClick: showHome },
    { svg: SVG.pause, title: "Pause (P)", label: "Pause", onClick: togglePause },
    { svg: SVG.restart, title: "Restart (R)", label: "Restart", onClick: () => { if (cur) { cur.reset(); paused = false; updatePauseBtn(); startLoop(); } } },
  ]);
  pauseBtn = btns[1];
  startLoop();
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;                      // ⌘/, ⌘L … pass through
  const ae = document.activeElement;
  if (ae && ae.closest && ae.closest("#panel,.modal")) return;          // don't steal typing from settings/modals
  const k = e.key;
  if (k === "Escape") { if (view !== "home") { e.preventDefault(); e.stopPropagation(); showHome(); } return; }  // esc: game→launcher, launcher→close
  e.preventDefault(); e.stopPropagation();                             // from here the arcade owns the key
  if (k === "Enter") { if (view === "home") launch(GAMES[selIdx]); else if (cur && cur.over) { cur.reset(); paused = false; updatePauseBtn(); startLoop(); } return; }
  if (view === "home") {
    if (k === " ") { launch(GAMES[selIdx]); return; }
    const n = { ArrowLeft: -1, a: -1, A: -1, ArrowUp: -1, ArrowRight: 1, d: 1, D: 1, ArrowDown: 1 }[k];
    if (n) { selIdx = (selIdx + n + GAMES.length) % GAMES.length; hi(); }
    return;
  }
  if (k === "r" || k === "R") { cur.reset(); paused = false; updatePauseBtn(); startLoop(); return; }
  if (k === "p" || k === "P") { togglePause(); return; }
  if (paused || cur.over) return;
  const m = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", " ": "space" }[k];
  if (m) cur.input(m);
}
let onResize = null;

const HELP = `
<p>A tiny arcade — three casual games on one little screen. Open it with <kbd>::</kbd>,
or jump straight in with <kbd>::snake</kbd>, <kbd>::2048</kbd>, <kbd>::tetris</kbd>.</p>
<table class="help-keys">
  <tr><td><kbd>← ↑ → ↓</kbd> / <kbd>WASD</kbd></td><td>move (and rotate, in Tetris)</td></tr>
  <tr><td><kbd>space</kbd></td><td>hard-drop in Tetris · launch a game from the menu</td></tr>
  <tr><td><kbd>R</kbd></td><td>restart · <kbd>P</kbd> pause</td></tr>
  <tr><td><kbd>esc</kbd></td><td>back to the menu (again to close)</td></tr>
</table>
<p>Best scores are saved on this device. The Back / Pause / Restart buttons sit on the search box.</p>`;

const plugin = {
  hints: [["↔↕", "move"], ["space", "drop"], ["R", "restart"], ["P", "pause"]],
  help: HELP,
  mount(rootEl, hostApi) {
    api = hostApi; root = rootEl;
    styleEl = document.createElement("style"); styleEl.textContent = CSS; document.head.appendChild(styleEl);
    best = loadBest(); selIdx = 0;
    onResize = () => { fit(); if (cur) draw(); };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    const q = (api.getInput() || "").trim().toLowerCase(); api.setInput("");
    const hit = q && GAMES.find((g) => g.id.startsWith(q) || g.name.toLowerCase().startsWith(q));
    hit ? launch(hit) : showHome();
  },
  onInput(text) { if (text) api.setInput(""); },   // games don't take typed input — keep the box clean
  unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    window.removeEventListener("keydown", onKey, true);
    if (onResize) window.removeEventListener("resize", onResize);
    if (styleEl) styleEl.remove();
    api = root = canvas = ctx = styleEl = cur = pauseBtn = onResize = null;
    view = "home"; paused = false;
  },
};
export default plugin;
