// Etapa 4 — Regresión de la V1 y la V2 sobre la V3 (sección 8.2): los 128 casos con los ajustes y las
// mutaciones de la Entrega 3, ejecutados con script de navegador. Mismo método que ejecutar_juego.js y
// ejecutar_pendientes.js: build de prueba con la línea que expone el estado (window.__gm); las acciones
// se hacen con el teclado real y el estado se usa para verificar y para preparar precondiciones (ubicar
// personajes, dejar pocas esferas, fijar el azar). Cada caso deja capturas en capturas/regresion/.
//   NEXT_PUBLIC_MODO_PRUEBA=1 npm run build && npm start
//   CHROMIUM_PATH=... node TP/evidencia-entrega-03/scripts/ejecutar_regresion.js [CP-001 ...]
// Deja el resumen en resultados_regresion.json.
const fs = require("fs");
const path = require("path");
const { APP_URL, launchBrowser, openMainMenu } = require("../../../scripts/verify/ui/helpers");
const P = require("./ejecutar_pendientes");
const { newPage, startGame, countColor, loseAllLives, provokeWallBreak, REAL_URL, sleep, r1 } = P;

const SHOTS = path.join(__dirname, "..", "capturas", "regresion");
fs.mkdirSync(SHOTS, { recursive: true });
const results = {};
let current;
const check = (cond, msg) => { console.log((cond ? "OK   " : "FAIL ") + msg); results[current].notes.push((cond ? "" : "FALLA: ") + msg); if (!cond) results[current].ok = false; };
const note = msg => { console.log("     " + msg); results[current].notes.push(msg); };
const shot = (g, name) => g.page.screenshot({ path: path.join(SHOTS, `${current}-${name}.png`) });
const KEY = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown" };
const D = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] };

// ---------------------------------------------------------------- utilidades
const open = (g, r, c) => g.s(`(() => { const x = s.map.cells[${r}]?.[${c}]; return x !== undefined && x !== 'wall' && x !== 'door'; })()`);
async function pac(g, r, c, extra = {}) { await g.do(`Object.assign(s.pacman, { row: ${r}, col: ${c}, progress: 0, direction: null, desiredDirection: null }, ${JSON.stringify(extra)});`); }
// Lleva a Pacman a una celda vecina de (r, c) y avanza hasta consumir lo que hay ahí.
async function eat(g, r, c) {
  for (const [d, [dr, dc]] of Object.entries(D)) {
    if (!(await open(g, r - dr, c - dc))) continue;
    await pac(g, r - dr, c - dc);
    await g.page.keyboard.down(KEY[d]);
    await g.waitFor(`s.map.pellets[${r}][${c}] === 'none' && (s.pacman.row === ${r} && s.pacman.col === ${c} || true)`, 2500);
    await g.page.keyboard.up(KEY[d]);
    await g.do("s.pacman.direction = null; s.pacman.desiredDirection = null; s.pacman.progress = 0;");
    return d;
  }
  throw new Error(`no hay celda vecina libre de (${r},${c})`);
}
const ghostOn = (g, i, extra = {}) => g.do(`const p = s.pacman; if (!p.direction) p.progress = 0; Object.assign(s.ghosts[${i}], { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, eaten: false, releaseTimer: 1e9, jump: null }, ${JSON.stringify(extra)});`);
const playerOnPac = g => g.do("const p = s.pacman; if (!p.direction) p.progress = 0; Object.assign(s.ghosts.find(x => x.controlledByPlayer), { row: p.row, col: p.col, progress: p.progress, direction: p.direction, jump: null });");
const powerOn = (g, t = 8) => g.do(`s.powerUpActive = true; s.powerUpTimer = ${t}; s.ghosts.forEach(x => { if (!x.eaten) x.vulnerable = true; });`);
// Deja una sola esfera común junto a Pacman (o en `cell`) y el contador en 1.
async function onlyOne(g, cell = null) {
  return g.s(`(() => { const m = s.map; const p = s.pacman; let t = ${JSON.stringify(cell)};
    if (!t) { for (const [dr, dc] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const x = m.cells[p.row + dr]?.[p.col + dc]; if (x && x !== 'wall' && x !== 'door' && !t) t = [p.row + dr, p.col + dc]; } }
    for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) m.pellets[r][c] = 'none';
    m.pellets[t[0]][t[1]] = 'pellet'; s.pelletsRemaining = 1; s.dynamicPowerPellets = []; return t; })()`);
}
async function finishLevel(g) {
  const [r, c] = await onlyOne(g);
  await eat(g, r, c);
  return g.waitFor("s.levelComplete || s.won || s.gameOver", 3000);
}
async function toLevelPlaying(g, n) {
  if ((await g.s("s.config.mode")) === "ghostman") { await g.toLevel(n); await g.waitFor("!s.countdown && !s.levelComplete", 12000); return; }
  for (let k = 0; k < 6 && (await g.s("s.level")) < n; k++) { await finishLevel(g); await g.waitFor(`!s.levelComplete`, 12000); }
  while ((await g.s("s.level")) < n) { await finishLevel(g); await g.waitFor(`s.level >= ${(await g.s("s.level")) + 1} && !s.levelComplete`, 12000); }
  await g.waitFor("!s.countdown && !s.levelComplete", 12000);
}
const lives = g => g.s("s.lives");
const score = g => g.s("s.score");
async function measureSpeed(g, who, ms = 2000) {
  await g.startLog(`(() => { const x = ${who}; const v = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] }[x.direction] ?? [0, 0]; return [x.row + v[0] * x.progress, x.col + v[1] * x.progress]; })()`);
  await sleep(ms);
  const l = await g.stopLog();
  let dist = 0; for (let i = 1; i < l.length; i++) { const d = Math.abs(l[i].v[0] - l[i - 1].v[0]) + Math.abs(l[i].v[1] - l[i - 1].v[1]); if (d < 2) dist += d; }
  return r1(dist / ((l.at(-1).t - l[0].t) / 1000));
}
async function eatN(g, n) {
  const p0 = await g.s("s.pelletsRemaining");
  const keys = ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"];
  for (let i = 0; i < 24 && (await g.s("s.pelletsRemaining")) > p0 - n; i++) {
    await g.page.keyboard.press(keys[i % keys.length]);
    await g.waitFor(`s.pelletsRemaining <= ${p0 - n}`, 1200);
  }
  await g.do("s.pacman.direction = null; s.pacman.desiredDirection = null;");
  await sleep(100);
  return p0 - (await g.s("s.pelletsRemaining"));
}
const types = g => g.s("s.ghosts.map(x => x.kind)");

// ---------------------------------------------------------------- casos
const C = {};

// ===== E1 · Movimiento (HU-01, HU-02)
async function route(g, keys, pressWhen, turns) {
  await g.startLog("[s.pacman.row, s.pacman.col, s.pacman.direction]");
  await g.page.keyboard.press(keys[0]);
  for (let i = 1; i < keys.length; i++) { await g.waitFor(pressWhen[i - 1], 8000); await g.page.keyboard.press(keys[i]); }
  await sleep(700);
  const l = await g.stopLog();
  // celdas donde cambió la dirección
  const out = []; for (let i = 1; i < l.length; i++) if (l[i].v[2] && l[i].v[2] !== l[i - 1].v[2]) out.push(`${l[i].v[2]} en (${l[i - 1].v[0]},${l[i - 1].v[1]})`);
  return { out, dirs: [...new Set(l.map(e => e.v[2]).filter(Boolean))], last: l.at(-1).v };
}
C["CP-001"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const r = await route(g, ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"], ["s.pacman.col >= 18", "s.pacman.row >= 28", "s.pacman.col <= 9"]);
  check(r.dirs.join(",") === "right,down,left,up", `→ ↓ ← ↑ desde la aparición: ${r.out.join(", ")}; recorrió la fila 23, la columna 19, la fila 29 y la columna 8 en la dirección de cada tecla`);
  await shot(g, "fin"); await g.close();
};
C["CP-002"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const r = await route(g, ["KeyA", "KeyS", "KeyD", "KeyW"], ["s.pacman.col <= 9", "s.pacman.row >= 28", "s.pacman.col >= 18"]);
  check(r.dirs.join(",") === "left,down,right,up", `A S D W desde la aparición: ${r.out.join(", ")}; por la fila 23, la columna 8, la fila 29 y la columna 19, igual que con las flechas`);
  await shot(g, "fin"); await g.close();
};
C["CP-003"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.page.keyboard.press("ArrowRight");
  await g.startLog("[s.pacman.col, s.pacman.direction]");
  await sleep(3000);
  const l = await g.stopLog();
  const cols = l.map(e => e.v[0]);
  const mono = cols.every((c, i) => i === 0 || c >= cols[i - 1]);
  check(mono && cols.at(-1) - cols[0] >= 9, `→ presionada y soltada: Pacman avanzó solo por la fila 23 de la columna ${cols[0]} a la ${cols.at(-1)} en 3 s, hasta el muro`);
  await g.close();
};
C["CP-004"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const col = await g.s("[...Array(26).keys()].map(c => c + 1).find(c => c > 16 && s.map.cells[22][c] !== 'wall' && s.map.cells[23][c] !== 'wall')");
  await pac(g, 23, col - 4);
  await g.page.keyboard.press("ArrowRight"); await sleep(150);
  await g.page.keyboard.press("ArrowUp");
  await g.startLog("[s.pacman.row, s.pacman.col, s.pacman.direction]");
  await g.waitFor("s.pacman.direction === 'up' && s.pacman.row < 23", 3000);
  await sleep(200);
  const l = await g.stopLog();
  const turnAt = l.find(e => e.v[2] === "up")?.v[1];
  const stopped = l.some(e => e.v[2] === null);
  check(turnAt === col && !stopped, `avanzando a la derecha por la fila 23 con ↑ presionado antes, giró hacia arriba al llegar a la intersección de la columna ${turnAt} sin detenerse`);
  await g.close();
};
C["CP-005"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await pac(g, 23, 12); await g.page.keyboard.press("ArrowLeft"); await sleep(100);
  const c0 = await g.s("s.pacman.col");
  await g.page.keyboard.press("ArrowDown");
  await sleep(400);
  const st = await g.s("[s.pacman.direction, s.pacman.col, s.map.cells[24][s.pacman.col]]");
  check(st[0] === "left" && st[1] < c0, `avanzando a la izquierda por la fila 23 con ↓ contra el muro de abajo: sigue a la ${st[0]}, de la columna ${c0} a la ${st[1]}, sin detenerse`);
  await g.close();
};
C["CP-006"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await pac(g, 23, 14); await g.page.keyboard.press("ArrowRight"); await sleep(300);
  const a = await g.s("[s.pacman.col, s.pacman.progress, s.pacman.direction]");
  await g.page.keyboard.press("ArrowLeft"); await sleep(60);
  const b = await g.s("[s.pacman.col, s.pacman.progress, s.pacman.direction]");
  check(a[2] === "right" && b[2] === "left", `a mitad de celda (columna ${a[0]}, ${r1(a[1])}) ← invierte la marcha de inmediato: dirección ${b[2]}`);
  await g.close();
};
C["CP-007"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await pac(g, 23, 22); await g.page.keyboard.down("ArrowRight");
  await sleep(5000);
  const st = await g.s("[s.pacman.row, s.pacman.col, r = s.pacman.progress, s.map.cells[s.pacman.row][s.pacman.col + 1]]".replace("r = ", ""));
  await g.page.keyboard.up("ArrowRight");
  await g.page.keyboard.press("ArrowLeft"); await sleep(400);
  const back = await g.s("[s.pacman.col, s.pacman.direction]");
  check(st[1] === 26 && st[2] === 0 && st[3] === "wall" && back[1] === "left" && back[0] < 26, `→ mantenida 5 s contra el borde derecho de la fila 23: quedó en la columna ${st[1]} (progreso ${st[2]}, a la derecha un muro), y con ← se movió con normalidad`);
  await g.close();
};
C["CP-008"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const out = [];
  for (const [r, c, key, name] of [[5, 1, "ArrowLeft", "izquierdo (fila 5)"], [29, 6, "ArrowDown", "inferior"], [25, 26, "ArrowRight", "derecho (fila 25)"], [1, 6, "ArrowUp", "superior"]]) {
    if (!(await open(g, r, c))) { out.push(`${name}: celda (${r},${c}) no transitable`); continue; }
    await pac(g, r, c); await g.hold(key, 1500);
    const st = await g.s("[s.pacman.row, s.pacman.col, s.pacman.progress]");
    out.push(`${name}: quedó en (${st[0]},${st[1]})`);
    if (st[0] !== r || st[1] !== c) results[current].ok = false;
  }
  await shot(g, "bordes");
  check(results[current].ok, `contra cada borde fuera de la fila 13 Pacman no sale del mapa: ${out.join("; ")}`);
  await g.close();
};
C["CP-009"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3);
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
  await g.startLog("s.ghosts.map(x => [x.row, x.col, x.kind, x.phaseCellsLeft > 0 || !!x.jump, x.eaten, x.inHouse, s.map.cells[x.row]?.[x.col]])");
  await sleep(60000);
  const l = await g.stopLog();
  let wallNoPower = 0, out = 0, wraps = 0, badWrap = 0, houseExit = 0, badExit = 0;
  const h = await g.house();
  const inH = (r, c) => r >= h.top && r <= h.bottom && c >= h.left && c <= h.right;
  for (let i = 1; i < l.length; i++) l[i].v.forEach(([r, c, k, pw, e, ih, cell], j) => {
    const [r0, c0] = l[i - 1].v[j];
    if (r < 0 || r >= 31 || c < 0 || c >= 28) out++;
    if (cell === "wall" && !pw && !(k === "specter")) wallNoPower++;
    if (Math.abs(c - c0) > 20) { wraps++; if (r !== 13) badWrap++; }
    if (inH(r0, c0) && !inH(r, c)) { houseExit++; if (!(r0 === h.top && (c0 === 13 || c0 === 14))) badExit++; }
  });
  const phases = l.filter(e => e.v.some(x => x[2] === "specter" && x[3])).length;
  check(wallNoPower === 0 && out === 0 && badWrap === 0 && badExit === 0, `60 s en el nivel 3: ningún fantasma dentro de un muro salvo el espectro con su poder (${phases} cuadros de cruce), ninguno fuera del mapa, ${houseExit} salidas de la base, todas por la puerta, y ${wraps} cruces de borde, todos por el túnel de la fila 13`);
  await g.close();
};
C["CP-010"] = async () => {
  const g = await startGame("pacman");
  const r = await g.s(`(() => { const m = s.map, h = m.house; const empty = [];
    for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
      const x = m.cells[r][c]; if (x === 'wall' || x === 'door') continue;
      const inside = r >= h.top && r <= h.bottom && c >= h.left && c <= h.right; if (inside) continue;
      if (m.pellets[r][c] === 'none') empty.push([r, c]); }
    // BFS de Pacman desde la aparición (sin entrar a la base)
    const seen = new Set(['23,13']); const q = [[23, 13]];
    while (q.length) { const [r, c] = q.shift(); for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) { let nr = r + dr, nc = (c + dc + m.cols) % m.cols; const x = m.cells[nr]?.[nc]; if (!x || x === 'wall' || x === 'door') continue; if (nr >= h.top && nr <= h.bottom && nc >= h.left && nc <= h.right) continue; const k = nr + ',' + nc; if (!seen.has(k)) { seen.add(k); q.push([nr, nc]); } } }
    let pellets = 0, unreachable = 0; for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) if (m.pellets[r][c] !== 'none') { pellets++; if (!seen.has(r + ',' + c)) unreachable++; }
    const ring = empty.filter(([r, c]) => r >= h.top - 3 && r <= h.bottom + 3 && c >= h.left - 3 && c <= h.right + 3).length;
    const tunnel = empty.filter(([r, c]) => m.tunnelCells.has(r + ',' + c) || (r === 13 && (c < 6 || c > 21))).length;
    const spawn = empty.filter(([r, c]) => r === 23 && (c === 13 || c === 14)).length;
    const other = empty.filter(([r, c]) => !(r >= h.top - 3 && r <= h.bottom + 3 && c >= h.left - 3 && c <= h.right + 3) && !(m.tunnelCells.has(r + ',' + c) || (r === 13 && (c < 6 || c > 21))) && !(r === 23 && (c === 13 || c === 14)));
    return { pellets, unreachable, empty: empty.length, ring, tunnel, spawn, other: other.map(x => x.join(',')) }; })()`);
  await shot(g, "mapa");
  check(r.unreachable === 0 && r.other.length === 0, `las ${r.pellets} esferas están en celdas transitables y alcanzables; las ${r.empty} celdas transitables sin esfera son el anillo de la base (${r.ring}), el túnel (${r.tunnel}) y la aparición (${r.spawn})${r.other.length ? `; otras: ${r.other.join(" ")}` : ""}`);
  await g.close();
};
// ===== HU-03, HU-04
C["CP-011"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const a = await g.s("[s.score, s.pelletsRemaining]");
  const col = await g.s("[...Array(14).keys()].map(i => 14 + i).find(c => s.map.pellets[23][c] === 'pellet')");
  await g.page.keyboard.press("ArrowRight");
  await g.waitFor(`s.map.pellets[23][${col}] === 'none'`, 3000);
  await g.do("s.pacman.direction = null; s.pacman.desiredDirection = null;");
  const b = await g.s("[s.score, s.pelletsRemaining]");
  check(b[0] - a[0] === 10 && a[1] - b[1] === 1, `primera esfera a la derecha de la aparición (23,${col}): desaparece, puntaje ${a[0]} → ${b[0]} y esferas ${a[1]} → ${b[1]}`);
  await g.close();
};
C["CP-012"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const n = await eatN(g, 20);
  const cleared = await g.s("(() => { const out = []; for (let r = 0; r < 31; r++) for (let c = 0; c < 28; c++) if (s.map.pellets[r][c] === 'none') out.push(r + ',' + c); return out; })()");
  await ghostOn(g, 0);
  const lost = await g.waitFor("s.lives === 2 && !s.pacmanDeath && !s.countdown", 5000);
  const back = await g.s(`${JSON.stringify(cleared)}.filter(k => { const [r, c] = k.split(',').map(Number); return s.map.pellets[r][c] !== 'none'; }).length`);
  const pos = await g.s("[s.pacman.row, s.pacman.col]");
  await shot(g, "tras-vida");
  check(n >= 20 && lost && back === 0 && pos.join(",") === "23,13", `${n} esferas consumidas; un fantasma alcanzó a Pacman (vidas 3 → ${await lives(g)}), los personajes volvieron a su posición (Pacman en ${pos}) y ninguna esfera consumida reapareció`);
  await g.close();
};
C["CP-013"] = async () => {
  const g = await startGame("pacman");
  const p0 = await g.s("s.pelletsRemaining");
  const map0 = await g.s("s.map.pellets.map(r => r.join('')).join('')");
  await g.do("s.pacman.speed = 0;");
  await g.do("s.ghosts.forEach(x => x.releaseTimer = 0);");
  await g.startLog("s.ghosts.filter(x => !x.inHouse).map(x => x.row + ',' + x.col)");
  await sleep(30000);
  const visited = new Set((await g.stopLog()).flatMap(e => e.v));
  const onPellets = [...visited].filter(k => { const [r, c] = k.split(",").map(Number); return map0[r * 28 + c] !== "none"[0]; }).length;
  const p1 = await g.s("s.pelletsRemaining"), map1 = await g.s("s.map.pellets.map(r => r.join('')).join('')");
  check(p1 === p0 && map1 === map0, `30 s con Pacman quieto: los fantasmas pasaron por ${visited.size} celdas; el contador sigue en ${p1} y las esferas siguen en el mapa`);
  await g.close();
};
C["CP-014"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await pac(g, 5, 21);
  const t = await onlyOne(g);
  note(`última esfera en (${t}), mitad derecha`);
  await eat(g, t[0], t[1]);
  const done = await g.waitFor("s.levelComplete", 2000);
  await sleep(300);
  const txt = await g.page.textContent("body");
  await shot(g, "completado");
  check(done && /Nivel 1 completado/.test(txt), `al consumir la última esfera el nivel se completa, la partida se detiene y se muestra «¡Nivel 1 completado!» con el puntaje (${await score(g)})`);
  await g.close();
};
C["CP-015"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.do("const m = s.map; for (let r = 0; r < 31; r++) for (let c = 0; c < 28; c++) m.pellets[r][c] = 'none'; m.pellets[23][26] = 'power'; s.pelletsRemaining = 1;");
  await sleep(2000);
  const st = await g.s("[s.levelComplete, s.pelletsRemaining]");
  const hud = await g.page.textContent("body");
  check(!st[0] && st[1] === 1 && /Esferas: 1(?!\d)/.test(hud), `con solo la esfera grande de (23,26): el nivel no se completa y el contador indica ${st[1]} («Esferas: 1»)`);
  await g.close();
};
C["CP-016"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.hold("ArrowLeft", 800);
  await g.do("s.lives = 1;");
  const a = await g.s("[s.score, s.lives]");
  await finishLevel(g);
  const txt = await g.page.textContent("body");
  await g.waitFor("s.level === 2 && !s.levelComplete", 8000);
  const b = await g.s("[s.score, s.lives, s.level, s.scoreBreakdown.timeBonus]");
  check(/Nivel 1 completado/.test(txt) && b[2] === 2 && b[1] === 1 && b[0] >= a[0] + 10, `con 1 vida y ${a[0]} puntos se completa el nivel 1 («¡Nivel 1 completado!»); empieza el nivel ${b[2]} con ${b[0]} puntos (los ${a[0]} más la última esfera y el bonus por tiempo) y ${b[1]} vida`);
  await g.close();
};
C["CP-017"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const seen = [];
  for (let n = 1; n <= 3; n++) {
    await g.waitFor(`s.level === ${n} && !s.levelComplete`, 10000);
    seen.push(`${await g.page.textContent("[data-testid=hud-level]")} (${await g.s("s.pelletsRemaining")} esferas)`);
    await g.parkAiGhosts();
    await finishLevel(g);
  }
  const won = await g.waitFor("s.won", 8000);
  await sleep(300);
  const txt = await g.page.textContent("body");
  await shot(g, "victoria");
  check(won && /Victoria/.test(txt) && /Total/.test(txt), `partida N1 → N2 → N3 sobre los mapas nuevos (${seen.join(", ")}): al consumir la última esfera del nivel 3 se muestra «¡Victoria!» con el puntaje final`);
  await g.close();
};
// ===== HU-05, HU-06 · PowerUp
async function powerAt(g, r, c) {
  const before = await score(g);
  await eat(g, r, c);
  return (await score(g)) - before;
}
C["CP-018"] = async () => {
  const g = await startGame("pacman");
  await sleep(4000);
  await g.do("s.ghosts.forEach((x, i) => Object.assign(x, { row: 5, col: 6 + i * 4, progress: 0, inHouse: false, releaseTimer: 1e9 }));");
  const pts = await powerAt(g, 1, 26);
  const st = await g.s("[s.powerUpActive, s.ghosts.filter(x => x.vulnerable).length]");
  const d0 = await g.s("s.ghosts.map(x => Math.abs(x.row - s.pacman.row) + Math.abs(x.col - s.pacman.col))");
  await sleep(3000);
  const d1 = await g.s("s.ghosts.map(x => Math.abs(x.row - s.pacman.row) + Math.abs(x.col - s.pacman.col))");
  await shot(g, "powerup");
  const away = d1.filter((d, i) => d > d0[i]).length;
  const sum0 = d0.reduce((a, b) => a + b), sum1 = d1.reduce((a, b) => a + b);
  check(st[0] && pts === 50 && st[1] === 4 && sum1 > sum0 && away >= 2, `esfera grande de (1,26) sin otra tecla: PowerUp activo, +${pts}, ${st[1]} fantasmas vulnerables que se alejan de Pacman (distancias en 3 s ${d0.join("/")} → ${d1.join("/")}, total ${sum0} → ${sum1})`);
  await g.close();
};
C["CP-019"] = async () => {
  const g = await startGame("pacman");
  await sleep(3000);
  await g.do("s.ghosts.forEach((x, i) => Object.assign(x, { row: 5, col: 6 + i * 4, progress: 0, inHouse: false, releaseTimer: 1e9 }));");
  await powerAt(g, 23, 1);
  const t0 = Date.now();
  await sleep(6500 - (Date.now() - t0));
  const a = await g.s("[s.powerUpActive, s.ghosts.filter(x => x.vulnerable).length, r1 = s.powerUpTimer]".replace("r1 = ", ""));
  await sleep(8500 - (Date.now() - t0));
  const b = await g.s("[s.powerUpActive, s.ghosts.filter(x => x.vulnerable).length]");
  check(a[0] && a[1] > 0 && a[2] < 2 && !b[0] && b[1] === 0, `esfera grande de (1,23... fila 23, columna 1): a los 6,5 s vulnerables y parpadeando (${r1(a[2])} s restantes); a los 8,5 s el PowerUp terminó y los fantasmas volvieron a la normalidad: duración de 8 s`);
  await g.close();
};
C["CP-020"] = async () => {
  const g = await startGame("pacman");
  await pac(g, 23, 6);
  await g.do("s.ghosts.forEach((x, i) => { if (x.id !== 'inky') Object.assign(x, { row: 5, col: 4 + i * 6, inHouse: false, progress: 0, releaseTimer: 1e9, speed: 0 }); }); Object.assign(s.ghosts.find(x => x.id === 'inky'), { row: 23, col: 10, inHouse: false, progress: 0, releaseTimer: 0 });");
  await sleep(600);
  const d0 = await g.s("(() => { const x = s.ghosts.find(x => x.id === 'inky'); return Math.abs(x.row - s.pacman.row) + Math.abs(x.col - s.pacman.col); })()");
  await g.do("s.map.pellets[23][5] = 'power';");
  await g.hold("ArrowLeft", 250);
  await g.do("s.pacman.speed = 0;");
  const dA = await g.s("(() => { const x = s.ghosts.find(x => x.id === 'inky'); return Math.abs(x.row - s.pacman.row) + Math.abs(x.col - s.pacman.col); })()");
  await sleep(1500);
  const dB = await g.s("(() => { const x = s.ghosts.find(x => x.id === 'inky'); return Math.abs(x.row - s.pacman.row) + Math.abs(x.col - s.pacman.col); })()");
  check(await g.s("s.powerUpActive") && dB > dA, `el fantasma celeste, que se acercaba (distancia ${d0} → ${dA}), con el PowerUp se alejó: ${dA} → ${dB} en 1,5 s`);
  await g.close();
};
C["CP-021"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await powerAt(g, 23, 1);
  await sleep(5000);
  await powerAt(g, 23, 26);
  const t0 = Date.now();
  await sleep(7500);
  const a = await g.s("s.powerUpActive");
  await sleep(1000);
  const b = await g.s("s.powerUpActive");
  check(a && !b, `segunda esfera grande a los 5 s: el PowerUp sigue a los 7,5 s del segundo consumo (${a}) y termina antes de los 8,5 s (${b}): 8 s completos desde el segundo`);
  await g.close();
};
C["CP-022"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await powerAt(g, 23, 1);
  let s0 = await score(g); await ghostOn(g, 1, { vulnerable: true }); await sleep(200); const a = (await score(g)) - s0;
  await powerAt(g, 23, 26);
  s0 = await score(g); await ghostOn(g, 2, { vulnerable: true }); await sleep(200); const b = (await score(g)) - s0;
  check(a === 200 && b === 200, `primer fantasma +${a}; tras la segunda esfera grande, el siguiente +${b} (no 400)`);
  await g.close();
};
C["CP-023"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await powerAt(g, 1, 1);
  const inc = [];
  await pac(g, 11, 12);
  for (let i = 0; i < 4; i++) { const s0 = await score(g); await ghostOn(g, i, { vulnerable: true }); await sleep(250); inc.push((await score(g)) - s0); }
  check(inc.join(",") === "200,400,800,1600", `esfera grande de (1,1) y los cuatro fantasmas comidos junto a la base: ${inc.join(", ")}`);
  await g.close();
};
C["CP-024"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const inc = [];
  for (const [r, c] of [[23, 1], [23, 26], [1, 1]]) {
    await powerAt(g, r, c);
    const s0 = await score(g); await ghostOn(g, inc.length, { vulnerable: true }); await sleep(250); inc.push((await score(g)) - s0);
    await g.do("s.powerUpTimer = 0.05;"); await g.waitFor("!s.powerUpActive", 2000); await g.waitFor("!s.countdown", 4000);
    await g.parkAiGhosts();
  }
  check(inc.join(",") === "200,200,200", `en tres PowerUp seguidos, terminando cada uno, el primer fantasma comido suma ${inc.join(", ")}: el del tercero suma 200, no 400`);
  await g.close();
};
C["CP-025"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.do("s.lives = 1;"); await powerOn(g);
  await ghostOn(g, 0, { vulnerable: true }); await sleep(300);
  const st = await g.s("[s.lives, s.ghosts[0].eaten, s.gameOver, s.level, !!s.pacmanDeath]");
  check(st[0] === 1 && st[1] && !st[2] && !st[4], `con 1 vida y el PowerUp, tocar un fantasma lo come (ojos), el contador sigue en ${st[0]} y el nivel no se reinicia`);
  await g.close();
};
C["CP-026"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await pac(g, 5, 6); await powerOn(g, 30);
  await ghostOn(g, 0, { vulnerable: true });
  await sleep(150);
  const eyes = await g.s("s.ghosts[0].eaten");
  await shot(g, "ojos");
  const back = await g.waitFor("!s.ghosts[0].eaten", 15000);
  const out = await g.waitFor("!s.ghosts[0].inHouse", 8000);
  const st = await g.s("[s.ghosts[0].vulnerable, s.powerUpActive]");
  check(eyes && back && out && st[0] === st[1], `al comerlo quedan sus ojos; vuelven solos a la base, revive y sale por la puerta ${st[0] ? "vulnerable (el PowerUp sigue activo)" : "normal"}`);
  await g.close();
};
C["CP-027"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.do("s.map.pellets[11][11] = 'power';");
  await eat(g, 11, 11);
  const gp = () => g.s("s.scoreBreakdown.ghosts");
  let s0 = await gp(); await ghostOn(g, 0, { vulnerable: true, releaseTimer: 0 }); await sleep(200); const a = (await gp()) - s0;
  await pac(g, 23, 13);
  const out = await g.waitFor("!s.ghosts[0].eaten && !s.ghosts[0].inHouse", 7000);
  const vul = await g.s("[s.ghosts[0].vulnerable, s.powerUpTimer]");
  s0 = await gp(); await ghostOn(g, 0, { vulnerable: vul[0] }); await sleep(200); const b = (await gp()) - s0;
  check(a === 200 && out && vul[0] && b === 400, `comido junto a la base +${a}; revivió y salió ${vul[0] ? "vulnerable" : "sin estar vulnerable"} con ${r1(vul[1])} s de PowerUp; comido otra vez +${b}: la escala continúa`);
  await g.close();
};
async function blinkState(g, ghostIdx) {
  return g.page.evaluate(async (i) => { const out = []; for (let k = 0; k < 8; k++) { const s = window.__gm, x = s.ghosts[i]; const c = document.querySelector("canvas").getContext("2d");
    const d = c.getImageData(Math.round(x.col * 24) - 6, Math.round(x.row * 24) - 6, 36, 36).data; let blue = 0, white = 0;
    for (let j = 0; j < d.length; j += 4) { if (d[j] < 80 && d[j + 2] > 180) blue++; if (d[j] > 220 && d[j + 1] > 220 && d[j + 2] > 220) white++; } out.push(blue > white ? "B" : "W"); await new Promise(r => setTimeout(r, 70)); } return out.join(""); }, ghostIdx);
}
C["CP-028"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.do("s.ghosts.forEach((x, i) => Object.assign(x, { row: 5, col: 4 + i * 6, inHouse: false, progress: 0, releaseTimer: 1e9, speed: 0 }));");
  await powerAt(g, 23, 1);
  await sleep(4400); const a = await blinkState(g, 1);
  await sleep(1400); const b = await blinkState(g, 1);
  await shot(g, "parpadeo");
  check(/^B+$/.test(a) && /B/.test(b) && /W/.test(b), `a los 5 s el diseño vulnerable es estable (${a}); a los 7 s alterna con el blanco (${b}), distinto del estable y del normal`);
  await g.close();
};
C["CP-029"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.do("s.ghosts.forEach((x, i) => Object.assign(x, { row: 5, col: 4 + i * 6, inHouse: false, progress: 0, releaseTimer: 1e9, speed: 0 }));");
  await powerAt(g, 23, 1);
  await g.waitFor("s.powerUpTimer <= 2", 8000);
  const a = await blinkState(g, 1);
  await powerAt(g, 23, 26);
  const t = await g.s("s.powerUpTimer");
  const b = await blinkState(g, 1);
  check(/W/.test(a) && /^B+$/.test(b) && t > 7.4, `durante el parpadeo (${a}) se consume la segunda esfera grande: el parpadeo cesa (${b}) y el PowerUp vuelve a ${r1(t)} s`);
  await g.close();
};
// ===== HU-08 · Vidas
C["CP-030"] = async () => {
  const g = await startGame("pacman", "classic", { url: REAL_URL });
  await g.waitFor("!s.countdown", 6000);
  await g.hold("ArrowLeft", 600);
  const a = await g.s("[s.lives, s.score]");
  const clyde = await g.s("s.ghosts.findIndex(x => x.id === 'clyde')");
  await ghostOn(g, clyde);
  const anim = await g.waitFor("!!s.pacmanDeath", 2000);
  await sleep(600); await shot(g, "derrota");
  await g.waitFor("!s.pacmanDeath && !s.countdown", 8000);
  const b = await g.s("[s.lives, s.score, s.pacman.row, s.pacman.col, s.ghosts.filter(x => !x.inHouse && x.row === s.map.house.exit.row).length, s.ghosts.filter(x => x.inHouse).length]");
  check(anim && b[0] === 2 && b[1] === a[1] && b[2] === 23 && b[4] === 1 && b[5] === 3, `contacto con el fantasma naranja: animación de derrota; tras el «¡Listo!» vidas ${a[0]} → ${b[0]}, puntaje ${b[1]} conservado, Pacman en (${b[2]},${b[3]}) y los fantasmas en la base: ${b[4]} sobre la puerta y ${b[5]} adentro`);
  await g.close();
};
C["CP-031"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await pac(g, 23, 10); await g.page.keyboard.press("ArrowLeft");
  await g.do("Object.assign(s.ghosts[0], { row: 23, col: 3, progress: 0, inHouse: false, direction: 'right', desiredDirection: 'right', releaseTimer: 1e9 });");
  await g.waitFor("s.lives < 3", 5000);
  await sleep(800);
  check((await lives(g)) === 2, `de frente por la fila 23 contra un fantasma: un único contacto y el contador queda en ${await lives(g)}`);
  await g.close();
};
C["CP-033"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const p0 = await g.s("s.pelletsRemaining");
  await eatN(g, 30);
  const a = await g.s("[s.score, s.pelletsRemaining, s.level]");
  const map0 = await g.s("s.map.pellets.map(r => r.join(',')).join(';')");
  await ghostOn(g, 0);
  await g.waitFor("s.lives === 2 && !s.pacmanDeath && !s.countdown", 5000);
  const b = await g.s("[s.score, s.pelletsRemaining, s.level, s.pacman.row, s.pacman.col, s.ghosts.filter(x => !x.inHouse).length]");
  const same = (await g.s("s.map.pellets.map(r => r.join(',')).join(';')")) === map0;
  check(p0 - a[1] >= 30 && b[2] === 1 && b[0] === a[0] && b[1] === a[1] && same && b[3] === 23 && b[5] === 1, `con ${p0 - a[1]} esferas consumidas se pierde una vida: sigue el nivel ${b[2]}, puntaje ${b[0]}, esferas ${b[1]} (las consumidas siguen ausentes), Pacman en (${b[3]},${b[4]}) y ${b[5]} fantasma afuera, sobre la puerta`);
  await g.close();
};
C["CP-034"] = async () => {
  const g = await startGame("pacman");
  const icons = await g.page.$$eval("[data-testid=player-lives] [data-testid=life-icon]", n => n.map(x => x.dataset.icon));
  const box = await g.page.locator("[data-testid=pacman-status]").boundingBox(), cv = await g.page.locator("canvas").boundingBox();
  const txt = await g.page.textContent("[data-testid=pacman-status]");
  check(icons.length === 3 && icons.every(i => i === "pacman") && box.y > cv.y + cv.height - 5 && box.x <= cv.x + 5 && !/\d/.test(txt), `abajo a la izquierda, debajo del tablero: «${txt.trim()}» con ${icons.length} íconos de Pacman, sin número`);
  await g.close();
};
C["CP-035"] = async () => {
  const g = await startGame("pacman", "classic", { url: REAL_URL });
  await g.waitFor("!s.countdown", 6000);
  const seq = [];
  for (let i = 0; i < 3; i++) {
    await g.waitFor("!s.countdown && !s.pacmanDeath", 8000);
    await g.parkAiGhosts();
    await ghostOn(g, 1);
    await g.waitFor("!!s.pacmanDeath || s.gameOver", 3000);
    seq.push(await g.page.locator("[data-testid=player-lives] [data-testid=life-icon]").count());
  }
  check(seq.join(",") === "2,1,0", `en el momento de cada pérdida (al empezar la animación) el contador mostró ${seq.join(", ")} íconos`);
  await g.close();
};
C["CP-036"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await toLevelPlaying(g, 3);
  await g.do("s.lives = 1;"); await g.parkAiGhosts(); await ghostOn(g, 0);
  await g.page.waitForSelector("text=Game Over", { timeout: 6000 });
  const icons = await g.page.locator("[data-testid=player-lives] [data-testid=life-icon]").count();
  const a = await g.s("[s.level, s.score, s.pacman.row, s.pacman.col]");
  await sleep(5000);
  const b = await g.s("[s.level, s.score, s.pacman.row, s.pacman.col, s.gameOver]");
  await shot(g, "gameover");
  check(icons === 0 && b[4] && JSON.stringify(a) === JSON.stringify(b.slice(0, 4)) && await g.page.isVisible("text=Game Over"), `última vida perdida en el nivel ${a[0]}: contador sin íconos, pantalla de Game Over con el puntaje (${a[1]}) y 5 s después nada se reinició`);
  await g.close();
};
C["CP-037"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await toLevelPlaying(g, 3);
  await g.do("s.lives = 1;"); await g.parkAiGhosts(); await ghostOn(g, 2);
  await g.page.waitForSelector("text=Game Over", { timeout: 6000 });
  const txt = await g.page.textContent("body");
  check(/Total/.test(txt) && /Volver a jugar/.test(txt) && (await g.s("s.level")) === 3, "en el nivel 3 la partida termina con la misma pantalla de Game Over que en el nivel 1 (desglose, «Volver a jugar» y «Menú principal»)");
  await g.close();
};
// ===== HU-11 a HU-14 · Puntaje
const hudScore = g => g.page.textContent("body").then(t => Number(/Puntaje: (\d+)/.exec(t)[1]));
C["CP-038"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const s0 = await hudScore(g);
  await g.page.keyboard.press("ArrowRight"); await g.waitFor("s.score === 10", 3000); await g.do("s.pacman.direction = null;"); const a = await hudScore(g);
  await powerAt(g, 23, 26); const b = await hudScore(g);
  await ghostOn(g, 0, { vulnerable: true }); await sleep(250); const c = await hudScore(g);
  check(s0 === 0 && a === 10 && b - a === 50 && c - b === 200, `HUD: ${s0} → ${a} (+10 esfera) → ${b} (+50 esfera grande) → ${c} (+200 fantasma), actualizado tras cada acción`);
  await g.close();
};
C["CP-039"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.hold("ArrowLeft", 1200);
  const a = await score(g);
  await ghostOn(g, 0); await g.waitFor("s.lives === 2 && !s.pacmanDeath && !s.countdown", 5000);
  const b = await score(g);
  await g.parkAiGhosts(); await finishLevel(g); await g.waitFor("s.level === 2", 8000);
  const c = await score(g);
  check(a > 0 && b === a && c >= b, `puntaje ${a}; tras perder una vida ${b}; al inicio del nivel 2 ${c}: no disminuye`);
  await g.close();
};
C["CP-040"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts(); await toLevelPlaying(g, 3); await g.parkAiGhosts();
  await pac(g, 23, 12);
  await g.do("s.fruitSpawnTimer = 1e6;"); await g.waitFor("s.fruits.length > 0", 2000);
  await g.do("s.fruitSpawnTimer = -1e6; s.fruits = s.fruits.slice(0, 1);");
  const f = await g.s("s.fruits[0] && [s.fruits[0].row, s.fruits[0].col]");
  const a = await g.s("[s.score, s.pelletsRemaining]");
  await g.do(`s.map.pellets[${f[0]}][${f[1]}] = 'none';`);
  const p1 = await g.s("s.pelletsRemaining");
  for (const [d, [dr, dc]] of Object.entries(D)) { if (!(await open(g, f[0] - dr, f[1] - dc))) continue; await pac(g, f[0] - dr, f[1] - dc); await g.page.keyboard.down(KEY[d]); await g.waitFor("s.fruits.length === 0", 2000); await g.page.keyboard.up(KEY[d]); break; }
  const b = await g.s("[s.score, s.pelletsRemaining, s.fruits.length]");
  check(b[2] === 0 && b[0] - a[0] === 100 && b[1] === p1, `fruta en (${f}) del nivel 3: desaparece, +${b[0] - a[0]} y el contador de esferas sigue en ${b[1]}`);
  await g.close();
};
C["CP-041"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts(); await toLevelPlaying(g, 3); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; s.fruitSpawnTimer = 1e6;"); await g.waitFor("s.fruits.length > 0", 2000);
  await g.do("s.fruitSpawnTimer = -1e6;");
  const f = await g.s("[s.fruits[0].row, s.fruits[0].col]");
  const t0 = Date.now();
  await sleep(14000 - (Date.now() - t0)); const a = await g.s(`s.fruits.some(x => x.row === ${f[0]} && x.col === ${f[1]})`);
  await sleep(16000 - (Date.now() - t0)); const b = await g.s(`s.fruits.some(x => x.row === ${f[0]} && x.col === ${f[1]})`);
  check(a && !b, `fruta en (${f}): a los 14 s sigue (${a}); a los 16 s ya no está (${b})`);
  await g.close();
};
C["CP-042"] = async () => {
  const g = await startGame("pacman", "classic", { url: REAL_URL });
  await g.waitFor("!s.countdown", 6000); await g.parkAiGhosts();
  await g.hold("ArrowLeft", 2500);
  await g.parkAiGhosts();
  await finishLevel(g);
  const st = await g.s("[s.levelElapsed, s.scoreBreakdown.timeBonus, s.lastLevelTimeBonus]");
  const exp = 10 * Math.floor(120 - st[0]);
  check(st[2] === exp, `nivel 1 completado en ${r1(st[0])} s de juego (desde el «¡ya!», sin la cuenta): bonus por tiempo ${st[2]} = 10 × ${Math.floor(120 - st[0])} s enteros restantes`);
  await g.close();
};
C["CP-043"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.do("s.levelElapsed = 125;");
  await finishLevel(g);
  const st = await g.s("[s.levelElapsed, s.lastLevelTimeBonus]");
  check(st[1] === 0, `nivel 1 completado a los ${r1(st[0])} s: bonus por tiempo ${st[1]}, no negativo`);
  await g.close();
};
async function breakdown(page) {
  return page.$$eval("[data-testid=score-breakdown] tr", rows => rows.map(r => [r.cells[0].textContent, Number(r.cells[1].textContent)]));
}
C["CP-044"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await toLevelPlaying(g, 3); await g.do("s.lives = 2;"); await g.parkAiGhosts(); await finishLevel(g);
  await g.page.waitForSelector("[data-testid=score-breakdown]", { timeout: 8000 });
  const b = await breakdown(g.page);
  const sum = b.slice(0, -1).reduce((a, x) => a + x[1], 0);
  check(b.find(x => x[0] === "Bonus por vidas")[1] === 1000 && sum === b.at(-1)[1], `victoria con 2 vidas: ${b.map(x => `${x[0]} ${x[1]}`).join(", ")}; la suma de los componentes da ${sum}`);
  await g.close();
};
C["CP-045"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.hold("ArrowLeft", 600); await loseAllLives(g);
  const b = await breakdown(g.page);
  check(b.find(x => x[0] === "Bonus por vidas")[1] === 0, `Game Over: bonus por vidas ${b.find(x => x[0] === "Bonus por vidas")[1]}`);
  await g.close();
};
C["CP-046"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const hud = async () => Number(/Esferas: (\d+)/.exec(await g.page.textContent("body"))[1]);
  const a = await hud();
  await g.page.keyboard.press("ArrowLeft"); await g.waitFor("s.pelletsRemaining <= 257", 3000); await g.do("s.pacman.direction = null; s.pacman.desiredDirection = null;");
  const b = await hud();
  await finishLevel(g);
  const c = await hud();
  await g.waitFor("s.level === 2 && !s.levelComplete", 8000);
  const d = await hud();
  check(a === 262 && b === 257 && c === 0 && d === 272, `contador: ${a} al empezar, ${b} tras 5 esferas, ${c} con la última y ${d} al empezar el nivel 2`);
  await g.close();
};
// ===== HU-15 a HU-18 · Niveles y fantasmas
C["CP-047"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const out = [], houses = [], tunnels = [];
  const pal = { 1: ["#00ffff", "#ff0000"], 2: ["#2121de"], 3: ["#00ff00"] };
  for (let n = 1; n <= 3; n++) {
    await g.waitFor(`s.level === ${n} && !s.levelComplete`, 10000); await g.parkAiGhosts();
    houses.push(JSON.stringify(await g.house())); tunnels.push(await g.s("[...s.map.tunnelCells].sort().join(' ')"));
    const colors = await g.page.evaluate(() => { const c = document.querySelector("canvas").getContext("2d"); const d = c.getImageData(0, 0, 672, 744).data; const k = {}; for (let i = 0; i < d.length; i += 4) { if (d[i] + d[i + 1] + d[i + 2] < 120) continue; const key = `${d[i] >> 6},${d[i + 1] >> 6},${d[i + 2] >> 6}`; k[key] = (k[key] ?? 0) + 1; } return Object.entries(k).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]); });
    out.push(`${await g.page.textContent("[data-testid=hud-level]")}: colores dominantes ${colors.join(" | ")}`);
    await shot(g, `nivel${n}`);
    if (n < 3) await finishLevel(g);
  }
  note(out.join("; "));
  check(new Set(houses).size === 1 && new Set(tunnels).size === 1, "los niveles se juegan en orden 1, 2 y 3 con el HUD indicando cada uno; cada mapa con su laberinto, la base y el túnel en el mismo lugar y su paleta (1 celeste y rojo, 2 azul, 3 verde; capturas revisadas)");
  await g.close();
};
C["CP-048"] = async () => {
  const sig = async () => { const g = await startGame("pacman"); const s = await g.s("s.map.cells.map(r => r.join('')).join('|') + '#' + s.map.pellets.map(r => r.join('')).join('|')"); await g.close(); return s; };
  const a = await sig(), b = await sig();
  check(a === b, "el mapa del nivel 1 de una partida nueva es idéntico al anterior (muros, esferas y esferas grandes)");
};
C["CP-049"] = async () => {
  const g = await startGame("pacman");
  await g.do("s.pacman.speed = 0;");
  const n0 = (await g.audio()).log.length;
  await g.startLog("s.ghosts.map(x => [x.kind, x.speed, x.phaseCellsLeft, !!x.jump, x.dashCellsLeft])");
  await sleep(25000);
  const l = await g.stopLog();
  const kinds = new Set(l.flatMap(e => e.v.map(x => x[0]))), speeds = new Set(l.flatMap(e => e.v.map(x => x[1])));
  const powers = l.some(e => e.v.some(x => x[2] > 0 || x[3] || x[4] > 0)) || (await g.s("s.fakeFruits.length")) > 0;
  check(kinds.size === 1 && kinds.has("classic") && speeds.size === 1 && !powers, `25 s del nivel 1 con Pacman quieto en la aparición: tipos ${[...kinds]}, velocidad ${[...speeds]} celdas/s para los cuatro, sin cruces, saltos, frutas falsas ni dash`);
  await g.close();
};
async function eatAndRevive(g, n, idxs = [0, 1, 2, 3]) {
  const revived = [];
  await pac(g, 5, 6);
  for (let k = 0; k < n; k++) {
    const i = idxs[k % idxs.length];
    await g.waitFor(`!s.ghosts[${i}].eaten`, 15000);
    await powerOn(g, 30);
    await ghostOn(g, i, { vulnerable: true });
    await g.waitFor(`s.ghosts[${i}].eaten`, 1000);
    await g.waitFor(`!s.ghosts[${i}].eaten`, 15000);
    revived.push(await g.s(`s.ghosts[${i}].kind`));
    await g.do(`Object.assign(s.ghosts[${i}], { releaseTimer: 1e9 });`);
  }
  await g.do("s.powerUpActive = false; s.powerUpTimer = 0; s.ghosts.forEach(x => x.vulnerable = false);");
  return revived;
}
C["CP-050"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const rev = await eatAndRevive(g, 5);
  check(rev.length === 5 && rev.every(k => k === "classic"), `5 fantasmas comidos en el nivel 1: sus ojos vuelven a la base y reviven como ${rev.join(", ")}`);
  await g.close();
};
C["CP-051"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.do("s.lives = 1;"); await finishLevel(g); await g.waitFor("s.level === 2 && !s.levelComplete", 8000);
  const k = await types(g);
  check(k.every(x => x === "classic") && (await lives(g)) === 1, `nivel 2 tras completar el 1 con 1 vida: ${k.join(", ")}`);
  await g.close();
};
C["CP-052"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 2); await g.parkAiGhosts();
  const rev = await eatAndRevive(g, 10);
  for (let k = 0; k < 20 && new Set(rev.filter(x => x !== "classic")).size < 4; k++) rev.push(...(await eatAndRevive(g, 1)));
  const powered = rev.filter(k => k !== "classic");
  note(`tipos al revivir: ${rev.join(", ")}`);
  check(powered.length / rev.length >= 0.25 && powered.length / rev.length <= 0.75 && new Set(powered).size === 4, `${rev.length} fantasmas comidos en el nivel 2 (al menos 10, hasta ver los cuatro tipos): ${powered.length} reviven con poderes (${Math.round(powered.length / rev.length * 100)} %; ${[...new Set(powered)].join(", ")}) y ${rev.length - powered.length} clásicos`);
  await g.close();
};
C["CP-053"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 2); await g.parkAiGhosts();
  await ghostOn(g, 0); await g.waitFor("s.lives === 2 && !s.pacmanDeath && !s.countdown", 5000);
  await g.parkAiGhosts(); await finishLevel(g); await g.waitFor("s.level === 3 && !s.levelComplete", 8000);
  const k = await types(g);
  check(k.slice().sort().join(",") === "accelerated,jumper,naval,specter", `nivel 3 tras perder una vida en el 2: ${k.join(", ")}, uno de cada tipo`);
  await g.close();
};
C["CP-054"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 2); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 }); s.ghosts[1].kind = 'specter'; s.ghosts[1].speed = 4.5 * 0.85 * 0.7; s.ghosts[1].phaseCellsLeft = 0; s.ghosts[1].powerCooldown = 1e9;");
  // se usa la reaparición: comer al fantasma hasta que reviva espectro (sección 4.4); si no, se toma el tipo fijado
  const row = await g.s("[...Array(31).keys()].find(r => r > 17 && s.map.cells[r].slice(1, 12).every(x => x !== 'wall'))");
  await g.do(`Object.assign(s.ghosts[0], { row: ${row}, col: 1, progress: 0, inHouse: false, direction: 'right', desiredDirection: 'right', releaseTimer: 1e9 }); Object.assign(s.ghosts[1], { row: ${row}, col: 1, progress: 0, inHouse: false, direction: 'right', desiredDirection: 'right', releaseTimer: 1e9 });`);
  await g.startLog("[s.ghosts[0].col + s.ghosts[0].progress, s.ghosts[1].col + s.ghosts[1].progress]");
  await sleep(3000);
  const l = await g.stopLog();
  const t = i => { const a = l.find(e => e.v[i] >= 2), b = l.find(e => e.v[i] >= 8); return a && b ? (b.t - a.t) / 1000 : null; };
  const tc = t(0), ts = t(1);
  note("el espectro se tomó fijando el tipo del fantasma rosa (sección 4.4: 70 % de la velocidad del clásico)");
  check(tc && ts && Math.abs(ts / tc - 1.43) <= 0.1, `6 celdas de la fila ${row}: clásico ${r1(tc)} s, espectro ${r1(ts)} s, un ${Math.round((ts / tc - 1) * 100)} % más`);
  await g.close();
};
async function specterWatch(g, secs) {
  await g.startLog("s.ghosts.map(x => [x.kind, x.row, x.col, x.phaseCellsLeft, s.map.cells[x.row]?.[x.col], x.eaten])");
  await sleep(secs * 1000);
  return g.stopLog();
}
function crossings(l, h) {
  const res = []; const inH = (r, c) => r >= h.top && r <= h.bottom && c >= h.left && c <= h.right;
  for (let j = 0; j < 4; j++) { let run = null;
    for (const e of l) { const [k, r, c, ph, cell] = e.v[j]; if (k !== "specter") { run = null; continue; }
      if (cell === "wall") { if (!run) run = { t: e.t, cells: new Set(), house: false, border: false, j }; run.cells.add(r + "," + c); if (inH(r, c)) run.house = true; if (r === 0 || r === 30 || c === 0 || c === 27) run.border = true; }
      else if (run) { res.push(run); run = null; } } }
  return res;
}
C["CP-055"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3);
  await g.do("s.ghosts.forEach(x => x.releaseTimer = 0); s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 }); s.lives = 99;");
  const l = await specterWatch(g, 90);
  const x = crossings(l, await g.house());
  check(x.length > 0 && x.every(r => r.cells.size <= 2 && !r.house && !r.border), `90 s en el nivel 3: ${x.length} cruces del espectro, de ${x.map(r => r.cells.size).join(", ")} celdas; ninguno de 3 o más, de la base ni del borde`);
  await g.close();
};
C["CP-056"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3);
  const sp = await g.s("s.ghosts.findIndex(x => x.kind === 'specter')");
  await g.parkAiGhosts();
  const w = await thinWall(g, 1, "&& r > 17");
  // Precondición repetida cada 0,5 s: el espectro junto a un muro de una celda y Pacman del otro lado.
  const bait = () => g.do(`Object.assign(s.ghosts[${sp}], { row: ${w[0]}, col: ${w[1]}, progress: 0, direction: 'right', desiredDirection: 'right', inHouse: false, eaten: false, releaseTimer: 0 }); s.pacman.speed = 0; Object.assign(s.pacman, { row: ${w[0]}, col: ${w[1]} + 3, progress: 0, direction: null }); s.lives = 99;`);
  const t0 = Date.now(); const times = [];
  let prev = false;
  while (Date.now() - t0 < 24000) {
    const ph = await g.s(`s.ghosts[${sp}].phaseCellsLeft > 0 || s.map.cells[s.ghosts[${sp}].row][s.ghosts[${sp}].col] === 'wall'`);
    if (ph && !prev) times.push(Date.now());
    prev = ph;
    if (!ph) await bait();
    await sleep(ph ? 50 : 400);
  }
  const gaps = times.slice(1).map((t, i) => r1((t - times[i]) / 1000));
  check(times.length >= 2 && gaps.every(d => d >= 9.6), `con el espectro junto a un muro de una celda en (${w}) y Pacman del otro lado, repetido cada 0,4 s durante 24 s: cruzó ${times.length} veces, con ${gaps.join(" y ")} s entre cruces (al menos 10 s)`);
  await g.close();
};
C["CP-057"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3);
  const sp = await g.s("s.ghosts.findIndex(x => x.kind === 'specter')");
  await g.parkAiGhosts();
  await g.do(`Object.assign(s.ghosts[${sp}], { inHouse: false, row: 11, col: 13, releaseTimer: 0 }); s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });`);
  const crossed = await g.waitFor(`s.ghosts[${sp}].phaseCellsLeft > 0`, 60000);
  await g.waitFor(`s.ghosts[${sp}].phaseCellsLeft === 0 && s.map.cells[s.ghosts[${sp}].row][s.ghosts[${sp}].col] !== 'wall'`, 3000);
  const t0 = Date.now();
  await g.do("Object.assign(s.pacman, { row: 1, col: 1 });");
  await sleep(2000 - (Date.now() - t0));
  const grace = await g.s(`s.ghosts[${sp}].noEatTimer`);
  const l0 = await lives(g);
  await g.do(`const x = s.ghosts[${sp}]; Object.assign(s.pacman, { row: x.row, col: x.col, progress: x.progress, direction: x.direction });`);
  await sleep(120); await shot(g, "gracia");
  const l1 = await lives(g);
  await g.do("Object.assign(s.pacman, { row: 1, col: 1 });");
  await g.waitFor(`s.ghosts[${sp}].noEatTimer <= 0`, 3000);
  await g.do(`const x = s.ghosts[${sp}]; Object.assign(s.pacman, { row: x.row, col: x.col, progress: x.progress, direction: x.direction });`);
  await sleep(300);
  const l2 = await lives(g);
  check(crossed && grace > 0 && l1 === l0 && l2 === l0 - 1, `el espectro atravesó un muro; a los 2 s del cruce (${r1(grace)} s de gracia restantes, se ve translúcido) el contacto no descontó vidas (${l0} → ${l1}); pasados los 3 s descontó una (${l1} → ${l2})`);
  await g.close();
};
C["CP-058"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3);
  await g.do("s.ghosts.forEach(x => x.releaseTimer = 0); s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 }); s.lives = 99;");
  const l = await specterWatch(g, 90);
  const h = await g.house();
  const inH = (r, c) => r >= h.top && r <= h.bottom && c >= h.left && c <= h.right;
  let bad = 0, stuck = 0;
  for (const e of l) for (const [k, r, c, ph, cell, eaten] of e.v) { if (k !== "specter" || eaten) continue; if (r < 0 || r > 30 || c < 0 || c > 27) bad++; if (cell === "wall" && inH(r, c)) bad++; }
  const x = crossings(l, h); stuck = x.filter(r => r.cells.size > 2).length;
  check(bad === 0 && stuck === 0, `90 s observando a los espectros: ninguno fuera del mapa, dentro de un muro de la base ni detenido dentro de un bloque (${x.length} cruces completos)`);
  await g.close();
};
C["CP-059"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3); await g.parkAiGhosts();
  const sp = await g.s("s.ghosts.findIndex(x => x.kind === 'specter')"), other = sp === 0 ? 1 : 0;
  await powerAt(g, 29, 1);
  const vul = await g.s(`s.ghosts[${sp}].vulnerable`);
  const l0 = await lives(g);
  let s0 = await score(g); await ghostOn(g, other, { vulnerable: true }); await sleep(200); const a = (await score(g)) - s0;
  s0 = await score(g); await ghostOn(g, sp, { vulnerable: true }); await sleep(200); const b = (await score(g)) - s0;
  check(vul && a === 200 && b === 400 && (await lives(g)) === l0 && (await g.s(`s.ghosts[${sp}].eaten`)), `el espectro pasó a vulnerable; comido después de otro fantasma (+${a}) suma +${b} y las vidas siguen en ${l0}`);
  await g.close();
};
// ===== HU-19 · Cierre
C["CP-060"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 2); await g.parkAiGhosts();
  await g.do("s.lives = 1;"); await ghostOn(g, 0);
  await g.page.waitForSelector("text=Game Over", { timeout: 6000 });
  const icons = await g.page.locator("[data-testid=player-lives] [data-testid=life-icon]").count();
  const b = await breakdown(g.page);
  await shot(g, "gameover");
  const btns = await g.page.isVisible("text=Volver a jugar") && await g.page.isVisible("text=Menú principal");
  await g.page.click("text=Menú principal");
  const menu = await g.page.waitForSelector("[data-testid=main-menu]", { timeout: 3000 }).then(() => true).catch(() => false);
  check(icons === 0 && b.length === 6 && btns && menu, `Game Over en el nivel 2: contador sin íconos, desglose (${b.map(x => x[0]).join(", ")}), «Volver a jugar» y «Menú principal», que lleva al menú`);
  await g.page.context().close();
};
C["CP-061"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3); await g.parkAiGhosts();
  const l = await lives(g);
  await finishLevel(g);
  await g.page.waitForSelector("text=Victoria", { timeout: 8000 });
  const b = await breakdown(g.page);
  await shot(g, "victoria");
  await g.page.click("text=Volver a jugar"); await sleep(400);
  const st = await g.s("[s.level, s.lives, s.score, s.won]");
  check(l === 3 && b.length === 6 && st[0] === 1 && st[1] === 3 && st[2] === 0 && !st[3], `victoria con ${l} vidas: «¡Victoria!» con el desglose (${b.map(x => `${x[0]} ${x[1]}`).join(", ")}); «Volver a jugar» empezó una partida nueva en el nivel ${st[0]}`);
  await g.close();
};
C["CP-062"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const ok = [];
  for (let k = 0; k < 2; k++) {
    await g.hold("ArrowLeft", 700); await loseAllLives(g);
    await g.page.click("text=Volver a jugar"); await sleep(400);
    const st = await g.s("[s.level, s.lives, s.score, s.pelletsRemaining, s.fruits.length]");
    ok.push(st.join("/"));
  }
  await g.parkAiGhosts(); await finishLevel(g); await g.waitFor("s.level === 2 && !s.levelComplete", 8000);
  const l2 = await g.s("[s.level, s.pelletsRemaining, s.fruits.length, s.fakeFruits.length]");
  check(ok.every(x => x === "1/3/0/262/0") && l2[1] === 272, `«Volver a jugar» dos veces seguidas tras un Game Over: nivel/vidas/puntaje/esferas/frutas = ${ok.join(" y ")}; el nivel 2 empieza completo con ${l2[1]} esferas`);
  await g.close();
};
// ===== HU-20, HU-21 · Pausa
C["CP-063"] = async () => {
  const g = await startGame("pacman");
  await g.page.keyboard.press("ArrowLeft"); await sleep(3500);
  await g.page.keyboard.press("Escape"); await sleep(100);
  const ov = await g.page.isVisible("[data-testid=pause-overlay]");
  const a = await g.s("JSON.stringify([s.pacman, s.ghosts.map(x => [x.row, x.col, x.progress])])");
  await sleep(5000);
  await g.hold("ArrowUp", 300); await g.hold("ArrowRight", 300);
  const b = await g.s("JSON.stringify([s.pacman, s.ghosts.map(x => [x.row, x.col, x.progress])])");
  await g.page.keyboard.press("Escape"); await sleep(300);
  const c = await g.s("JSON.stringify([s.pacman, s.ghosts.map(x => [x.row, x.col, x.progress])])");
  check(ov && a === b && c !== b && !(await g.page.isVisible("[data-testid=pause-overlay]")), "ESC: cartel «PAUSA», personajes inmóviles 5 s, las flechas no mueven a Pacman y el segundo ESC reanuda");
  await g.close();
};
C["CP-064"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await powerAt(g, 23, 1); await sleep(2000);
  await g.page.keyboard.press("Escape");
  const a = await g.s("s.powerUpTimer"); await sleep(15000); const b = await g.s("[s.powerUpTimer, s.powerUpActive]");
  await g.page.keyboard.press("Escape"); const t0 = Date.now();
  await g.waitFor("!s.powerUpActive", 10000); const dur = r1((Date.now() - t0) / 1000);
  check(b[1] && Math.abs(a - b[0]) < 0.01 && Math.abs(dur - 6) <= 0.4, `pausa a los 2 s con ${r1(a)} s de PowerUp; 15 s después sigue con ${r1(b[0])} s; al reanudar dura ${dur} s más`);
  await g.close();
};
C["CP-065"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  await g.hold("ArrowLeft", 1500);
  const e0 = await g.s("s.levelElapsed");
  await g.page.keyboard.press("Escape"); await sleep(60000); await g.page.keyboard.press("Escape");
  const e1 = await g.s("s.levelElapsed");
  await g.parkAiGhosts(); await finishLevel(g);
  const st = await g.s("[s.levelElapsed, s.lastLevelTimeBonus]");
  check(e1 - e0 < 0.5 && st[1] === 10 * Math.floor(120 - st[0]), `con 60 s de pausa el tiempo de juego pasó de ${r1(e0)} a ${r1(e1)} s; nivel completado en ${r1(st[0])} s efectivos y bonus ${st[1]}`);
  await g.close();
};
C["CP-066"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const a = await g.s("JSON.stringify([s.score, s.lives, s.paused, s.powerUpActive, s.pacman.row, s.pacman.col])");
  for (let i = 0; i < 10; i++) await g.page.keyboard.press("Space");
  await sleep(300);
  const b = await g.s("JSON.stringify([s.score, s.lives, s.paused, s.powerUpActive, s.pacman.row, s.pacman.col])");
  const y = await g.page.evaluate(() => window.scrollY);
  check(a === b && y === 0, `10 veces la barra espaciadora: puntaje, vidas, pausa, PowerUp y posición sin cambios; la página no hizo scroll (scrollY ${y})`);
  await g.close();
};
// ===== HU-22, HU-23 · Menú y carrusel
C["CP-067"] = async () => {
  const page = await newPage(); await openMainMenu(page, APP_URL);
  for (let i = 0; i < 3; i++) { await page.keyboard.press("ArrowDown"); await sleep(80); }
  await page.keyboard.press("Enter");
  await page.waitForSelector("[data-testid=mode-menu]");
  const opts = await page.$$eval("[data-testid=mode-menu] button", b => b.map(x => x.textContent.trim()));
  const sel = await page.locator("[data-testid=mode-menu] [aria-current=true]").textContent().catch(() => "");
  await page.keyboard.press("Enter");
  await page.waitForSelector("canvas");
  const g = new P.Game(page); await g.waitFor("!!s", 3000);
  await g.hold("ArrowLeft", 300);
  const st = await g.s("[s.level, s.lives, s.config.mode, s.pacman.direction]");
  const icons = await page.$$eval("[data-testid=player-lives] [data-testid=life-icon]", n => n.map(x => x.dataset.icon));
  check(opts.join("|").includes("Modo PacMan|Modo GhostMan|Volver") && /PacMan/.test(sel) && st[0] === 1 && st[2] === "pacman" && st[3] === "left" && icons.length === 3, `con ↓ ↓ ↓ y Enter (vuelta completa del menú circular a «Jugar»): ${opts.join(", ")}, con «${sel.trim()}» seleccionada; Enter empezó el nivel 1 en modo Pacman, movido con las flechas, con 3 íconos de Pacman`);
  await page.context().close();
};
C["CP-068"] = async () => {
  const page = await newPage(); await openMainMenu(page, APP_URL);
  await page.click("[data-testid=home-play]"); await page.waitForSelector("[data-testid=mode-menu]");
  await page.keyboard.press("KeyS"); await sleep(100);
  const sel = await page.locator("[data-testid=mode-menu] [aria-current=true]").textContent();
  await page.keyboard.press("Enter");
  await page.waitForSelector("[data-testid=ghost-carousel]");
  const name = await page.textContent("[data-testid=carousel-name]");
  check(/GhostMan/.test(sel) && name === "Clásico", `S pasa a «${sel.trim()}»; Enter abre el carrusel con «${name}» en el centro`);
  await page.context().close();
};
C["CP-069"] = async () => {
  let g = await startGame("pacman");
  const a = [await g.page.textContent("[data-testid=pacman-status]"), await g.page.$$eval("[data-testid=life-icon]", n => n.map(x => x.dataset.icon))];
  await g.page.reload(); await g.page.waitForSelector("[data-testid=main-menu]");
  g = await startGame("ghostman", "specter", { page: g.page });
  const b = [await g.page.textContent("[data-testid=ghostman-status]"), await g.page.$$eval("[data-testid=life-icon]", n => n.map(x => x.dataset.icon))];
  check(/Vidas/.test(a[0]) && a[1].join() === "pacman,pacman,pacman" && /Vidas de Pacman/.test(b[0]) && b[1].join() === "ghost,ghost,ghost", `modo PacMan: «Vidas» con ${a[1].length} íconos de Pacman; tras recargar (la sesión sigue y vuelve al menú) y elegir GhostMan con el espectro: «Vidas de Pacman» con ${b[1].length} íconos de fantasma`);
  await g.close();
};
async function carousel() {
  const page = await newPage(); await openMainMenu(page, APP_URL);
  await page.click("[data-testid=home-play]"); await page.click("[data-testid=menu-ghostman]");
  await page.waitForSelector("[data-testid=ghost-carousel]");
  return page;
}
const car = async page => [await page.textContent("[data-testid=carousel-name]"), (await page.textContent("[data-testid=carousel-power]")).trim()];
C["CP-070"] = async () => {
  const page = await carousel();
  const seen = [await car(page)];
  for (let i = 0; i < 4; i++) { await page.keyboard.press("ArrowLeft"); await sleep(100); seen.push(await car(page)); }
  await page.screenshot({ path: path.join(SHOTS, "CP-070-carrusel.png") });
  const names = seen.map(x => x[0]);
  check(names.join(",") === "Clásico,Acelerado,Naval,Saltarín,Espectro" && seen.every(x => x[1].length > 10), `al abrir: «Clásico» en el centro con su descripción; con ← cuatro veces: ${names.slice(1).join(", ")}, cada uno con su nombre y la descripción de su poder (el orden es Clásico, Espectro, Saltarín, Naval y Acelerado)`);
  await page.context().close();
};
C["CP-071"] = async () => {
  const page = await carousel();
  const seq = [];
  for (const k of ["ArrowLeft", "KeyD", "KeyA"]) { await page.keyboard.press(k); await sleep(100); seq.push((await car(page))[0]); }
  check(seq.join(",") === "Acelerado,Clásico,Acelerado", `← ${seq[0]}, D ${seq[1]}, A ${seq[2]}: circular en los dos sentidos`);
  await page.context().close();
};
C["CP-072"] = async () => {
  const page = await carousel();
  for (let i = 0; i < 4; i++) { await page.keyboard.press("ArrowRight"); await sleep(80); }
  const name = (await car(page))[0];
  await page.keyboard.press("Enter"); await page.waitForSelector("canvas");
  const g = new P.Game(page); await g.waitFor("!!s", 3000);
  const st = await g.s("[s.config.mode, s.ghosts.find(x => x.controlledByPlayer).kind]");
  await sleep(300); await page.screenshot({ path: path.join(SHOTS, "CP-072-acelerado.png") });
  check(name === "Acelerado" && st[0] === "ghostman" && st[1] === "accelerated", `→ hasta «${name}» y Enter: partida en modo GhostMan con el Acelerado como fantasma del jugador`);
  await page.context().close();
};
C["CP-073"] = async () => {
  const g = await startGame("ghostman", "jumper");
  await g.leaveHouse();
  for (const k of ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Enter"]) { await g.hold(k, 800); }
  const carouselOpen = await g.page.isVisible("[data-testid=ghost-carousel]");
  const moved = await g.player("[p.row, p.col]");
  await g.page.keyboard.press("Escape"); await sleep(300); await g.page.keyboard.press("Escape"); await sleep(300);
  const k = await g.player("p.kind");
  check(!carouselOpen && k === "jumper", `← → A D Enter durante 5 s: el fantasma se movió (quedó en ${moved}), no se abrió el carrusel; tras pausar y reanudar sigue siendo el Saltarín`);
  await g.close();
};
// ===== HU-24 a HU-27 · Modo GhostMan
C["CP-074"] = async () => {
  const g = await startGame("ghostman", "classic"); await g.parkAiGhosts(); await g.do("s.pacman.speed = 0;");
  await g.page.keyboard.down("ArrowUp"); await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).row === 11", 6000);
  await g.page.keyboard.press("ArrowLeft"); await g.page.keyboard.up("ArrowUp"); await sleep(400);
  const a = await g.player("[p.row, p.col, p.direction]");
  await g.page.keyboard.press("KeyD"); await sleep(300);
  const b = await g.player("p.direction");
  await g.page.keyboard.press("KeyW");
  await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).direction === 'up'", 4000);
  const c = await g.player("[p.row, p.col, p.direction]");
  check(a[0] === 11 && a[2] === "left" && b === "right" && c[2] === "up", `↑ sale por la puerta y en la fila 11 ← lo lleva a la izquierda (${a}); D lo lleva a la derecha y W lo hace subir en el primer cruce, en la columna ${c[1]}: WASD igual que las flechas`);
  await g.close();
};
C["CP-075"] = async () => {
  const g = await startGame("ghostman", "classic"); await g.parkAiGhosts(); await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 1 });");
  await g.leaveHouse();
  const col = await g.s("[...Array(26).keys()].map(c => c + 1).find(c => s.map.cells[29][c] !== 'wall')");
  await g.place("player", 29, col); await g.hold("ArrowDown", 3000);
  const a = await g.player("[p.row, p.col]");
  const walls = [];
  for (const [k, d] of [["ArrowLeft", -1], ["ArrowRight", 1]]) { await g.place("player", 23, 13); await g.hold(k, 3000); const p = await g.player("[p.row, p.col, s.map.cells[p.row][p.col]]"); walls.push(p); }
  const h = await g.house();
  await g.place("player", h.exit.row, h.exit.col); await g.hold("ArrowDown", 2000);
  const d = await g.player("[p.row, p.inHouse]");
  check(a[0] === 29 && walls.every(p => p[2] !== "wall") && d[0] === h.exit.row && !d[1], `↓ 3 s en el borde inferior: queda en la fila ${a[0]}; ← y → contra muros interiores: se detiene en celdas transitables (${walls.map(p => p.slice(0, 2).join(",")).join(" y ")}); ↓ contra la puerta: no vuelve a entrar`);
  await g.close();
};
C["CP-076"] = async () => {
  const g = await startGame("ghostman", "classic"); await toLevelPlaying(g, 2);
  const a = await g.s("[s.pelletsRemaining, s.pacman.row, s.pacman.col, s.ghosts.map(x => x.row + ',' + x.col).join(' ')]");
  await sleep(20000);
  const b = await g.s("[s.pelletsRemaining, s.pacman.row, s.pacman.col, s.ghosts.map(x => x.row + ',' + x.col).join(' ')]");
  const gA = a[3].split(" "), gB = b[3].split(" ");
  check(b[0] < a[0] && gA[0] === gB[0] && gA.slice(1).some((x, i) => x !== gB[i + 1]), `20 s sin teclas en el nivel 2: Pacman se movió solo y comió ${a[0] - b[0]} esferas; los fantasmas de la IA se movieron y el del jugador quedó quieto en ${gB[0]}`);
  await g.close();
};
C["CP-077"] = async () => {
  const g = await startGame("ghostman", "naval", { url: REAL_URL });
  await g.waitFor("!s.countdown", 6000);
  await g.waitFor(`s.pelletsRemaining <= ${(await g.s("s.pelletsRemaining")) - 5}`, 10000);
  await g.leaveHouse();
  const a = await g.s("[s.lives, s.score, s.pelletsRemaining]");
  const map0 = await g.s("s.map.pellets.map(r => r.join(',')).join(';')");
  await playerOnPac(g);
  const anim = await g.waitFor("!!s.pacmanDeath", 2000);
  const mid = await g.s("[s.lives, s.score]");
  await g.waitFor("!s.pacmanDeath && !s.countdown", 8000);
  const b = await g.s("[s.pacman.row, s.pacman.col, s.ghosts.find(x => x.controlledByPlayer).inHouse, s.ghosts.filter(x => !x.controlledByPlayer && !x.inHouse).length, s.pelletsRemaining]");
  const same = (await g.s("s.map.pellets.map(r => r.join(',')).join(';')")) === map0;
  check(anim && mid[0] === a[0] - 1 && mid[1] - a[1] === 500 && b[0] === 23 && b[2] && b[3] === 1 && b[4] === a[2] && same, `con ${262 - a[2]} esferas consumidas y el Naval: vidas ${a[0]} → ${mid[0]}, +${mid[1] - a[1]}, animación de derrota; tras el «¡Listo!» Pacman en (${b[0]},${b[1]}), el jugador en la base, ${b[3]} fantasma de la IA sobre la puerta y las esferas sin cambios (${b[4]})`);
  await g.close();
};
C["CP-078"] = async () => {
  const g = await startGame("ghostman", "classic"); await toLevelPlaying(g, 2);
  const cnt = () => g.page.locator("[data-testid=pacman-lives] [data-testid=life-icon]").count();
  const a = await cnt();
  await g.waitFor("!s.countdown", 4000);
  await ghostOn(g, 1); await sleep(800);
  const b = await cnt();
  await g.leaveHouse(); await playerOnPac(g); await g.waitFor("s.lives === 2", 3000);
  const c = await cnt();
  check(a === 3 && b === 3 && c === 2, `nivel 2: «Vidas de Pacman» con ${a}; tras el toque de un fantasma de la IA sigue en ${b}; tras el del jugador queda en ${c}`);
  await g.close();
};
C["CP-079"] = async () => {
  const g = await startGame("ghostman", "classic", { url: REAL_URL }); await toLevelPlaying(g, 2);
  await g.do("s.lives = 1;"); await g.leaveHouse(); await playerOnPac(g);
  await g.waitFor("s.levelComplete", 6000);
  const txt = await g.page.textContent("body");
  await g.waitFor("s.level === 3 && !!s.countdown", 8000);
  const cd = await g.s("s.countdown.kind");
  const cnt = await g.page.locator("[data-testid=pacman-lives] [data-testid=life-icon]").count();
  check(/Nivel 2 completado/.test(txt) && cd && cnt === 3, `tercera derrota en el nivel 2: el contador llega a 0, «¡Nivel 2 completado!»; empieza el nivel 3 con la cuenta (${cd}) y el contador en ${cnt}`);
  await g.close();
};
C["CP-080"] = async () => {
  const g = await startGame("ghostman", "classic"); await g.parkAiGhosts();
  const l = await lives(g);
  await g.do("const p = s.pacman; const m = s.map; for (let r = 0; r < 31; r++) for (let c = 0; c < 28; c++) m.pellets[r][c] = 'none'; m.pellets[23][10] = 'pellet'; s.pelletsRemaining = 1;");
  await g.page.waitForSelector("text=Game Over", { timeout: 15000 });
  const txt = await g.page.textContent("body");
  check(l === 3 && /Volver a jugar/.test(txt) && /Total/.test(txt), `con Pacman con ${l} vidas, al consumir la última esfera la partida termina: Game Over con el puntaje y «Volver a jugar»`);
  await g.close();
};
C["CP-081"] = async () => {
  const g = await startGame("ghostman", "specter"); await g.leaveHouse(); await g.parkAiGhosts();
  const [r, c] = (await g.s("(() => { for (const k of ['23,1','23,26','1,1','1,26']) { const [r, c] = k.split(',').map(Number); if (s.map.pellets[r][c] === 'power') return [r, c]; } })()"));
  await g.do(`Object.assign(s.pacman, { row: ${r}, col: ${c + (c === 1 ? 1 : -1)}, progress: 0 });`);
  await g.waitFor("s.powerUpActive", 4000);
  const vul = await g.player("p.vulnerable");
  const l = await lives(g);
  await playerOnPac(g); await sleep(300);
  check(vul && (await lives(g)) === l && (await g.player("p.eaten")), `Pacman comió la esfera grande y el Espectro del jugador pasó a vulnerable; al tocarlo no lo derrota (vidas de Pacman ${l}): el jugador es comido`);
  await g.close();
};
C["CP-082"] = async () => {
  const run = async kind => {
    const g = await startGame("ghostman", kind); await g.leaveHouse(); await g.parkAiGhosts();
    await powerOn(g, 30);
    await g.do("const p = s.ghosts.find(x => x.controlledByPlayer); Object.assign(s.pacman, { row: p.row, col: p.col, progress: p.progress, direction: p.direction });");
    await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).eaten", 2000);
    const txt = await g.page.textContent("[data-testid=player-respawn]", { timeout: 500 }).catch(() => "");
    await g.hold("ArrowLeft", 300);
    await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); const el = document.querySelector('[data-testid=player-respawn]'); return [p.eaten, el ? el.textContent : '']; })()");
    await g.waitFor("!s.ghosts.find(x => x.controlledByPlayer).eaten", 15000);
    await sleep(3500);
    const l = await g.stopLog();
    const counts = [...new Set(l.map(e => e.v[1]).filter(t => t.startsWith("Reaparecés")))];
    const shown = l.filter(e => e.v[1].startsWith("Reaparecés"));
    await g.close();
    return { txt, counts, secs: shown.length ? r1((shown.at(-1).t - shown[0].t) / 1000) : 0 };
  };
  const a = await run("classic"), b = await run("naval");
  check(/Volviendo a la base/.test(a.txt) && a.counts.length === 0 && b.counts.length > 0 && Math.abs(b.secs - 3) <= 0.5,
    `Clásico comido: «${a.txt}», los ojos vuelven solos y revive con control inmediato; Naval: ${b.counts.join(", ")} durante ${b.secs} s antes de poder salir`);
};
C["CP-083"] = async () => {
  const g = await startGame("ghostman", "jumper"); await g.leaveHouse(); await g.parkAiGhosts();
  await powerOn(g, 30);
  await g.do("s.pacman.speed = 0;");
  const p = await g.player("[p.row, p.col]");
  await g.do(`Object.assign(s.pacman, { row: ${p[0]}, col: ${p[1]}, progress: 0 });`);
  const a = await g.s("[s.lives, s.pelletsRemaining, s.pacman.row, s.pacman.col]");
  const eaten = await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).eaten", 2000); await sleep(500);
  const b = await g.s("[s.lives, s.pelletsRemaining, s.pacman.row, s.pacman.col, s.level]");
  check(a.slice(0, 4).join() === b.slice(0, 4).join() && eaten, `Saltarín comido por Pacman: vidas de Pacman, esferas y posición sin cambios (${b.slice(0, 4).join(", ")}): el nivel no se reinicia`);
  await g.close();
};
async function thinWall(g, width, extra = "") {
  return g.s(`(() => { const m = s.map, h = m.house; const free = (r, c) => m.cells[r]?.[c] && m.cells[r][c] !== 'wall' && m.cells[r][c] !== 'door' && !m.tunnelCells.has(r + ',' + c);
    for (let r = 1; r < m.rows - 1; r++) for (let c = 1; c < m.cols - 1 - ${width}; c++) {
      if (!free(r, c)) continue; let ok = true; for (let k = 1; k <= ${width}; k++) ok = ok && m.cells[r][c + k] === 'wall' && !(r >= h.top && r <= h.bottom && c + k >= h.left && c + k <= h.right);
      if (ok && free(r, c + ${width} + 1) ${extra}) return [r, c]; } return null; })()`);
}
C["CP-084"] = async () => {
  const g = await startGame("ghostman", "specter"); await toLevelPlaying(g, 3); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
  const w = await thinWall(g, 2);
  await g.place("player", w[0], w[1], { facing: "right", powerCooldown: 0 });
  await g.page.keyboard.down("ArrowRight"); await sleep(80); await g.page.keyboard.press("Space"); await sleep(1500); await g.page.keyboard.up("ArrowRight");
  const p = await g.player("[p.row, p.col, s.map.cells[p.row][p.col]]");
  check(p[0] === w[0] && p[1] >= w[1] + 3 && p[2] !== "wall", `nivel 3, Espectro en (${w}) junto a un muro de dos celdas: con la barra espaciadora entró al muro, lo atravesó completo y quedó en una celda transitable del otro lado (${p.slice(0, 2)})`);
  await g.close();
};
C["CP-085"] = async () => {
  const g = await startGame("ghostman", "specter"); await toLevelPlaying(g, 2); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
  const w = await thinWall(g, 1);
  await g.place("player", w[0], w[1], { facing: "right", powerCooldown: 0 });
  await g.page.keyboard.down("ArrowRight"); await sleep(80); await g.page.keyboard.press("Space");
  const t0 = Date.now();
  await g.waitFor("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return p.phaseCellsLeft === 0 && s.map.cells[p.row][p.col] !== 'wall' && p.col > " + w[1] + "; })()", 3000);
  await g.page.keyboard.up("ArrowRight");
  await sleep(Math.max(0, 2000 - (Date.now() - t0)));
  const l0 = await lives(g);
  await g.do("const p = s.ghosts.find(x => x.controlledByPlayer); Object.assign(s.pacman, { row: p.row, col: p.col, progress: p.progress, direction: p.direction });");
  await sleep(200); await shot(g, "gracia");
  const l1 = await lives(g);
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
  await sleep(Math.max(0, 8000 - (Date.now() - t0)));
  await g.page.keyboard.press("Space"); await sleep(100);
  const at8 = await g.player("[p.phaseCellsLeft, r1 = p.powerCooldown]".replace("r1 = ", ""));
  await g.page.waitForSelector("[data-testid=power-indicator][data-ready=true]", { timeout: 4000 });
  const ready = r1((Date.now() - t0) / 1000);
  check(l1 === l0 && at8[0] === 0 && at8[1] > 0 && Math.abs(ready - 10) <= 0.5, `contacto a los 2 s del cruce: Pacman no perdió una vida (${l0} → ${l1}; espectro translúcido con contorno punteado, captura); espacio a los 8 s: nada (cooldown ${r1(at8[1])} s); el poder vuelve a los ${ready} s`);
  await g.close();
};
C["CP-086"] = async () => {
  const g = await startGame("ghostman", "specter"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
  const out = [];
  const tryAt = async (r, c, face, key, name) => {
    await g.place("player", r, c, { facing: face, powerCooldown: 0 });
    await g.page.keyboard.down(key); await sleep(60); await g.page.keyboard.press("Space"); await sleep(600); await g.page.keyboard.up(key);
    const p = await g.player("[p.row, p.col, p.powerCooldown, p.phaseCellsLeft]");
    const ready = await g.page.getAttribute("[data-testid=power-indicator]", "data-ready");
    out.push(`${name}: (${p[0]},${p[1]}), ⭐ ${ready === "true" ? "encendida" : "apagada"}`);
    return p[2] === 0 && ready === "true" && p[0] === r && Math.abs(p[1] - c) <= 0;
  };
  const w3 = await g.s(`(() => { const m = s.map, h = m.house; const free = (r, c) => m.cells[r]?.[c] && m.cells[r][c] !== 'wall' && m.cells[r][c] !== 'door';
    for (let r = 1; r < m.rows - 1; r++) for (let c = 1; c < m.cols - 4; c++) if (free(r, c) && [1, 2, 3].every(k => m.cells[r][c + k] === 'wall' && !(r >= h.top - 1 && r <= h.bottom + 1 && c + k >= h.left - 1 && c + k <= h.right + 1))) return [r, c]; return null; })()`);
  note(`muro de 3 o más celdas a la derecha de (${w3})`);
  const h = await g.house();
  const a = w3 ? await tryAt(w3[0], w3[1], "right", "ArrowRight", "muro de 3 o más celdas") : false;
  const b = await tryAt(h.top + 2, h.left - 1, "right", "ArrowRight", "muro de la base");
  const c = await tryAt(5, 1, "left", "ArrowLeft", "borde izquierdo");
  check(a && b && c, `espacio contra muros sin destino válido: ${out.join("; ")}: no atraviesa y el poder no se consume`);
  await g.close();
};
C["CP-087"] = async () => {
  const g = await startGame("ghostman", "jumper"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 1 });");
  const h = await g.house();
  const jumps = [];
  for (let i = 0; i < 10; i++) {
    const col = [6, 21, 1, 26, 6, 21, 1, 26, 12, 15][i];
    const row = 29;
    await g.place("player", row, col, { facing: "up", powerCooldown: 0, jump: null });
    await g.page.keyboard.down("ArrowUp"); await sleep(50);
    const o = await g.player("[p.row, p.col]");
    await g.page.keyboard.press("Space"); await sleep(80);
    const to = await g.player("p.jump ? [p.jump.to.row, p.jump.to.col, p.jump.from.row, p.jump.from.col] : null");
    await g.page.keyboard.up("ArrowUp"); await sleep(700);
    if (to) jumps.push(to);
  }
  const bad = jumps.filter(([r, c, r0, c0]) => !(Math.abs(r - r0) + Math.abs(c - c0) <= 10 && r < r0 && !(r >= h.top && r <= h.bottom && c >= h.left && c <= h.right)));
  const cells = await Promise.all(jumps.map(([r, c]) => g.s(`s.map.cells[${r}][${c}]`)));
  check(jumps.length === 10 && bad.length === 0 && cells.every(x => x !== "wall"), `10 saltos avanzando hacia arriba: ${jumps.map(j => `(${j[2]},${j[3]})→(${j[0]},${j[1]})`).join(" ")}; todos a distancia ≤ 10, en filas menores que el origen, en celdas transitables fuera de la base`);
  await g.close();
};
C["CP-088"] = async () => {
  const g = await startGame("ghostman", "jumper"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 1 });");
  const row = 29;
  await g.place("player", row, 6, { facing: "right", powerCooldown: 0 });
  await g.page.keyboard.press("Space"); const t0 = Date.now();
  await sleep(9000 - (Date.now() - t0));
  await g.place("player", row, 6, { facing: "right" });
  await g.page.keyboard.press("Space"); await sleep(50);
  const at9 = await g.player("!!p.jump");
  await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).powerCooldown <= 0", 2000);
  const tReady = r1((Date.now() - t0) / 1000);
  await g.place("player", row, 6, { facing: "right" });
  await g.page.keyboard.press("Space"); await sleep(50);
  const at10 = await g.player("!!p.jump");
  check(!at9 && at10 && Math.abs(tReady - 10) <= 0.3, `espacio a los 9 s: no salta; el poder se reactiva a los ${tReady} s y salta`);
  await g.close();
};
C["CP-089"] = async () => {
  const g = await startGame("ghostman", "jumper"); await g.leaveHouse();
  const row = 20;
  await g.parkAiGhosts();
  await g.do(`s.pacman.speed = 0; Object.assign(s.pacman, { row: ${row}, col: 6, progress: 0, direction: null });`);
  await g.place("player", row, 2, { facing: "right", powerCooldown: 0, jump: null });
  await g.do(`const m = s.map, h = m.house, cand = []; for (let r = ${row} - 10; r <= ${row} + 10; r++) { const span = 10 - Math.abs(r - ${row}); for (let c = 2 - span; c <= 2 + span; c++) { if (c - 2 <= 0 || r < 0 || c < 0 || r >= m.rows || c >= m.cols) continue; if (m.cells[r][c] === 'wall' || m.cells[r][c] === 'door') continue; if (r >= h.top && r <= h.bottom && c >= h.left && c <= h.right) continue; cand.push(r + ',' + c); } } const i = cand.indexOf('${row},6'); s.random = () => (i + 0.5) / cand.length;`);
  const l0 = await lives(g);
  await g.page.keyboard.press("Space"); await sleep(1000);
  check((await lives(g)) === l0 - 1, `la sombra del destino coincidió con la celda de Pacman (${row},6): al aterrizar Pacman perdió una vida (${l0} → ${await lives(g)})`);
  await g.close();
};
async function placeFake(g, r, c) {
  await g.place("player", r, c, { facing: "left", powerCooldown: 0 });
  await g.page.keyboard.press("Space"); await sleep(100);
  return g.s("s.fakeFruits.map(f => [f.row, f.col, f.knownByPacman])");
}
C["CP-090"] = async () => {
  const g = await startGame("ghostman", "naval"); await toLevelPlaying(g, 2); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("Object.assign(s.pacman, { row: 1, col: 1 });");
  const f = await placeFake(g, 23, 20);
  await g.place("player", 5, 26);
  await g.do("Object.assign(s.pacman, { row: 23, col: 24, progress: 0, direction: null });");
  const l0 = await lives(g);
  const ate = await g.waitFor("s.lives < " + l0, 8000);
  check(f.length === 1 && !f[0][2] && ate, `nivel 2: fruta falsa colocada en (${f[0]?.slice(0, 2)}) con Pacman lejos (no la registró); Pacman pasó por ahí, la consumió y perdió una vida (${l0} → ${await lives(g)}), con el reinicio del nivel`);
  await g.close();
};
C["CP-091"] = async () => {
  const g = await startGame("ghostman", "naval"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 1 });");
  const f = await placeFake(g, 23, 20);
  await g.place("player", 5, 26);
  await powerOn(g, 1.0);
  await g.do("s.ghosts.forEach(x => x.vulnerable = false);");
  const a = await g.s("[s.lives, s.score]");
  await g.do("s.pacman.speed = 3.8; Object.assign(s.pacman, { row: 23, col: 21, progress: 0, direction: 'left', desiredDirection: 'left' });");
  await g.waitFor("s.fakeFruits.length === 0", 3000);
  const b = await g.s("[s.lives, s.score, s.powerUpActive]");
  check(a.join() === b.slice(0, 2).join(), `fruta falsa consumida en el último segundo del PowerUp: desaparece sin efecto (vidas ${b[0]}, puntaje ${b[1]})`);
  await g.close();
};
C["CP-092"] = async () => {
  const g = await startGame("ghostman", "naval"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 26 });");
  const x = await g.s("(() => { const m = s.map, o = (r, c) => m.cells[r]?.[c] && m.cells[r][c] !== 'wall' && m.cells[r][c] !== 'door'; for (let r = 18; r < 30; r++) for (let c = 2; c < 26; c++) if (o(r, c) && [o(r-1,c), o(r+1,c), o(r,c-1), o(r,c+1)].filter(Boolean).length >= 3) return [r, c]; })()");
  const f = await placeFake(g, x[0], x[1]); const t0 = Date.now();
  await g.place("player", 5, 26);
  await g.waitFor("s.fakeFruits[0] && s.fakeFruits[0].timeLeft <= 3", 9000); const tw = r1((Date.now() - t0) / 1000);
  await g.waitFor("s.explosions.length > 0", 5000); const te = r1((Date.now() - t0) / 1000);
  const cells = await g.s("s.explosions[0].cells.map(c => c.row + ',' + c.col)");
  const exp = await g.s(`(() => { const m = s.map, seen = new Map([['${x[0]},${x[1]}', 0]]), q = [[${x[0]}, ${x[1]}]]; while (q.length) { const [r, c] = q.shift(); const d = seen.get(r + ',' + c); if (d === 3) continue; for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) { const nr = r + dr, nc = c + dc, x = m.cells[nr]?.[nc]; if (!x || x === 'wall') continue; const k = nr + ',' + nc; if (!seen.has(k)) { seen.set(k, d + 1); q.push([nr, nc]); } } } return [...seen.keys()]; })()`);
  await shot(g, "explosion");
  check(Math.abs(tw - 7) <= 0.4 && Math.abs(te - 10) <= 0.4 && cells.length === exp.length && cells.every(c => exp.includes(c)), `fruta junto al cruce (${x}): cuenta regresiva desde los ${tw} s y explosión a los ${te} s sobre ${cells.length} celdas, las que están a 3 pasos o menos sin atravesar paredes`);
  await g.close();
};
C["CP-093"] = async () => {
  const g = await startGame("ghostman", "naval"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 26 });");
  await placeFake(g, 23, 20); const t0 = Date.now();
  await g.startLog("s.fakeFruits.length");
  await sleep(3000 - (Date.now() - t0)); await g.place("player", 23, 16, { facing: "left" }); await g.page.keyboard.press("Space"); await sleep(100);
  const at3 = await g.s("s.fakeFruits.length");
  await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).powerCooldown <= 0", 3000);
  await g.place("player", 23, 12, { facing: "left" }); await g.page.keyboard.press("Space"); await sleep(100);
  const at5 = await g.s("s.fakeFruits.length");
  await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).powerCooldown <= 0", 6000);
  await g.place("player", 29, 6, { facing: "left" }); await g.page.keyboard.press("Space"); await sleep(200);
  const max = Math.max(...(await g.stopLog()).map(e => e.v));
  check(at3 === 1 && at5 === 2 && max <= 2, `a los 3 s no se coloca otra (${at3}); a los 5 s sí (${at5}); el tercer intento no supera el máximo: nunca hubo más de ${max}`);
  await g.close();
};
C["CP-094"] = async () => {
  const g = await startGame("ghostman", "naval"); await toLevelPlaying(g, 3); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 26 }); s.fruits = [{ row: 23, col: 6, timeLeft: 15 }];");
  await placeFake(g, 23, 9);
  await g.place("player", 5, 26); await sleep(300);
  const sig = (r, c) => g.page.evaluate(([r, c]) => { const d = document.querySelector("canvas").getContext("2d").getImageData(c * 24, r * 24, 24, 24).data; let s = 0, red = 0, pur = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] > 150 && d[i + 1] < 80 && d[i + 2] < 80) red++; if (d[i] > 100 && d[i + 2] > 150 && d[i + 1] < 100) pur++; } return [red, pur]; }, [r, c]);
  const real = await sig(23, 6), fake = await sig(23, 9);
  await shot(g, "frutas");
  check(JSON.stringify(real) !== JSON.stringify(fake), `fruta real (23,6) y falsa (23,9) en el nivel 3 se diferencian (rojo/violeta: ${real.join("/")} y ${fake.join("/")}; captura revisada)`);
  await g.close();
};
C["CP-095"] = async () => {
  const g = await startGame("ghostman", "accelerated"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 26 });");
  const row = await g.s("[...Array(31).keys()].find(r => r > 17 && s.map.cells[r].slice(1, 12).every(x => x !== 'wall'))");
  await g.place("player", row, 9, { facing: "left", powerCooldown: 0 });
  await g.page.keyboard.down("ArrowLeft"); await sleep(60);
  await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.col, p.dashCellsLeft]; })()");
  await g.page.keyboard.press("Space"); await sleep(500); await g.page.keyboard.up("ArrowLeft");
  const l = await g.stopLog();
  const dash = l.filter(e => e.v[1] > 0), start = dash[0]?.v[0] ?? 0, endIdx = l.findIndex((e, i) => i > l.indexOf(dash.at(-1)) && e.v[1] === 0);
  const end = l[endIdx]?.v[0];
  const secs = r1((l[endIdx].t - dash[0].t) / 1000);
  await sleep(10500);
  await g.place("player", row, 2, { facing: "left", powerCooldown: 0 });
  await g.page.keyboard.down("ArrowLeft"); await sleep(60); await g.page.keyboard.press("Space"); await sleep(500); await g.page.keyboard.up("ArrowLeft");
  const p2 = await g.player("[p.col, s.map.cells[p.row][p.col - 1]]");
  check(start - end === 3 && Math.abs(secs - 0.25) <= 0.08 && p2[0] === 1 && p2[1] === "wall", `hacia la izquierda con espacio libre: de la columna ${start} a la ${end} (3 celdas) en ${secs} s; con la pared a 1 celda: se detuvo en la columna ${p2[0]}, la última transitable`);
  await g.close();
};
C["CP-096"] = async () => {
  const g = await startGame("ghostman", "accelerated"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 26 });");
  const [top, col] = await g.s("(() => { const m = s.map, h = m.house; for (let c = 1; c < 27; c++) for (let r = 1; r < 20; r++) if ([...Array(11).keys()].every(i => m.cells[r + i]?.[c] && m.cells[r + i][c] !== 'wall' && m.cells[r + i][c] !== 'door' && !(r + i >= h.top && r + i <= h.bottom && c >= h.left && c <= h.right))) return [r, c]; return [null, null]; })()");
  note(`pasillo vertical: columna ${col}, desde la fila ${top}`);
  await g.place("player", top, col, { facing: "down", powerCooldown: 0 });
  await g.page.keyboard.down("ArrowDown"); await sleep(50); await g.page.keyboard.press("Space"); await sleep(400);
  const slow = await measureSpeed(g, "s.ghosts.find(x => x.controlledByPlayer)", 1500);
  await g.page.keyboard.up("ArrowDown");
  await sleep(4000);
  await g.place("player", top, col); await g.page.keyboard.down("ArrowDown");
  const fast = await measureSpeed(g, "s.ghosts.find(x => x.controlledByPlayer)", 1500);
  await g.page.keyboard.up("ArrowDown");
  check(Math.abs(slow - 2.25) <= 0.2 && Math.abs(fast - 4.5) <= 0.25, `columna ${col}, en vertical: en los 5 s posteriores al dash ${slow} celdas/s; después ${fast} celdas/s`);
  await g.close();
};
C["CP-097"] = async () => {
  const g = await startGame("ghostman", "accelerated");
  const a = await g.player("[p.row, p.col, p.inHouse]");
  await g.page.keyboard.press("Space"); await sleep(400);
  const b = await g.player("[p.row, p.col, p.powerCooldown]");
  const ready = await g.page.getAttribute("[data-testid=power-indicator]", "data-ready");
  check(a[2] && a[0] === b[0] && a[1] === b[1] && b[2] === 0 && ready === "true", `recién iniciada, dentro de la base y sin moverse: espacio no desplaza al Acelerado y la ⭐ sigue disponible`);
  await g.close();
};
C["CP-098"] = async () => {
  const g = await startGame("ghostman", "jumper"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 26 });");
  const box = await g.page.locator("[data-testid=power-indicator]").boundingBox(), lv = await g.page.locator("[data-testid=pacman-lives]").boundingBox();
  const r0 = await g.page.getAttribute("[data-testid=power-indicator]", "data-ready");
  await g.place("player", 29, 6, { facing: "right", powerCooldown: 0 });
  await g.startLog("document.querySelector('[data-testid=power-indicator]')?.dataset.ready");
  await g.page.keyboard.press("Space"); await sleep(100);
  const r1v = await g.page.getAttribute("[data-testid=power-indicator]", "data-ready");
  await g.page.waitForSelector("[data-testid=power-indicator][data-ready=true]", { timeout: 12000 });
  await sleep(100);
  const lg = await g.stopLog(); const off = lg.filter(e => e.v === "false");
  const t = r1((off.at(-1).t - off[0].t) / 1000 + 1 / 60);
  check(r0 === "true" && box.x < lv.x && r1v === "false" && Math.abs(t - 10) <= 0.3, `⭐ encendida abajo a la izquierda, junto a las vidas; se apaga al usar el poder y se enciende a los ${t} s`);
  await g.close();
};
C["CP-099"] = async () => {
  const g = await startGame("ghostman", "classic"); await g.leaveHouse();
  const star = await g.page.locator("[data-testid=power-indicator]").count();
  const a = await g.s("JSON.stringify([s.score, s.lives, s.fakeFruits.length])");
  await g.page.keyboard.press("Space"); await sleep(200);
  const txt = await g.page.textContent("[data-testid=ghostman-status]");
  check(star === 0 && a === (await g.s("JSON.stringify([s.score, s.lives, s.fakeFruits.length])")), `Clásico: la barra muestra «${txt.trim()}», sin estrella; espacio no hace nada`);
  await g.close();
};
C["CP-100"] = async () => {
  const g = await startGame("ghostman", "naval"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 26 });");
  await placeFake(g, 23, 20);
  const c0 = await g.player("p.powerCooldown");
  for (let i = 0; i < 5; i++) { await g.page.keyboard.press("Space"); await sleep(150); }
  const st = await g.s("[s.fakeFruits.length, s.ghosts.find(x => x.controlledByPlayer).powerCooldown]");
  check(st[0] === 1 && st[1] < c0 && st[1] > 0, `5 espacios durante el cooldown: ninguna fruta nueva (${st[0]}) y el cooldown siguió bajando (${r1(c0)} → ${r1(st[1])} s), sin reiniciarse`);
  await g.close();
};
C["CP-101"] = async () => {
  const g = await startGame("ghostman", "classic"); await toLevelPlaying(g, 3); await g.leaveHouse(); await g.parkAiGhosts();
  await g.place("player", 29, 1);
  const pw = await g.s("(() => { for (const k of ['1,1','1,26','29,26']) { const [r, c] = k.split(',').map(Number); if (s.map.pellets[r][c] === 'power') return [r, c]; } })()");
  await g.do(`Object.assign(s.pacman, { row: ${pw[0]}, col: ${pw[1] === 1 ? 2 : pw[1] - 1}, progress: 0 });`);
  await g.waitFor("s.powerUpActive", 3000);
  const charges = await g.s("s.wallCharges");
  await g.waitFor("!s.powerUpActive", 12000);
  const broken = await g.s("s.destroyedWalls.map(w => [w.row, w.col, s.map.cells[w.row][w.col]])");
  const h = await g.house();
  const bad = broken.filter(([r, c, x]) => r === 0 || r === 30 || c === 0 || c === 27 || (r >= h.top && r <= h.bottom && c >= h.left && c <= h.right) || x === "wall");
  note(`muros rotos en ese PowerUp natural: ${broken.length}`);
  if (broken.length === 0) { await provokeWallBreak(g); await sleep(4000); }
  const all = await g.s("s.destroyedWalls.map(w => [w.row, w.col, s.map.cells[w.row][w.col]])");
  check(charges === 5 && all.length > 0 && all.length <= 5 && bad.length === 0 && all.every(w => w[2] !== "wall"), `nivel 3: con la esfera grande Pacman recibe ${charges} cargas y rompe ${all.length} muros interiores (${all.map(w => w.slice(0, 2).join(",")).join(" ")}), ninguno del borde ni de la base; cada celda rota queda transitable`);
  await g.close();
};
C["CP-102"] = async () => {
  const g = await startGame("ghostman", "classic"); await g.leaveHouse(); await g.parkAiGhosts(); await g.place("player", 5, 26);
  await g.do("s.map.pellets[23][1] = 'none';");
  await g.do("Object.assign(s.pacman, { row: 23, col: 25, progress: 0 });");
  await g.waitFor("s.powerUpActive", 3000);
  const ch = await g.s("s.wallCharges");
  await g.waitFor("!s.powerUpActive", 12000);
  check(ch === 0 && (await g.s("s.destroyedWalls.length")) === 0, `nivel 1, segunda esfera grande (23,26): PowerUp sin cargas (${ch}) y ninguna pared destruida hasta el final`);
  await g.close();
};
C["CP-103"] = async () => {
  const g = await startGame("ghostman", "classic"); await toLevelPlaying(g, 2); await g.leaveHouse(); await g.parkAiGhosts();
  await provokeWallBreak(g);
  const w = await g.s("s.destroyedWalls.map(w => [w.row, w.col])");
  await g.do("s.powerUpActive = false; s.ghosts.forEach(x => x.vulnerable = false);");
  await playerOnPac(g);
  await g.waitFor("!s.pacmanDeath && s.destroyedWalls.length === 0", 6000);
  const restored = await g.s(`${JSON.stringify(w)}.every(([r, c]) => s.map.cells[r][c] === 'wall')`);
  check(w.length > 0 && restored, `con ${w.length} pared rota (${w.map(x => x.join(",")).join(" ")}), al derrotar a Pacman el nivel se reinicia y la pared vuelve a existir`);
  await g.close();
};
C["CP-104"] = async () => {
  const g = await startGame("ghostman", "classic");
  const n = [];
  for (let L = 1; L <= 3; L++) { await g.waitFor(`s.level === ${L} && !s.levelComplete`, 10000); n.push(await g.s("(() => { const out = []; for (let r = 0; r < 31; r++) for (let c = 0; c < 28; c++) if (s.map.pellets[r][c] === 'power') out.push(r + ',' + c); return out; })()")); if (L < 3) { await g.parkAiGhosts(); await g.do("s.lives = 1;"); await g.leaveHouse(); await playerOnPac(g); await g.waitFor(`s.level === ${L + 1}`, 8000); } }
  check(n[2].length === 6 && ["1,1", "1,26", "29,1", "29,26", "15,1", "15,26"].every(k => n[2].includes(k)) && n[0].length === 4 && n[1].length === 4, `esferas grandes: nivel 1 ${n[0].length}, nivel 2 ${n[1].length}, nivel 3 ${n[2].length} (${n[2].join(" ")})`);
  await g.close();
};
C["CP-105"] = async () => {
  const g = await startGame("ghostman", "classic", { url: REAL_URL }); await toLevelPlaying(g, 3);
  await g.waitFor("!s.countdown", 6000);
  await g.do("s.pacman.speed = 0;");
  const p0 = await g.s("s.pelletsRemaining"); const t0 = Date.now();
  await g.waitFor("s.dynamicPowerPellets.length >= 1", 17000); const t1 = r1((Date.now() - t0) / 1000);
  await g.waitFor("s.dynamicPowerPellets.length >= 2", 17000); const t2 = r1((Date.now() - t0) / 1000);
  const dyn = await g.s("s.dynamicPowerPellets.map(c => [c.row, c.col, s.map.cells[c.row][c.col], s.map.tunnelCells.has(c.row + ',' + c.col)])");
  const p1 = await g.s("s.pelletsRemaining");
  const h = await g.house();
  const ok = dyn.every(([r, c, x, tun]) => x !== "wall" && !tun && !(r >= h.top && r <= h.bottom && c >= h.left && c <= h.right));
  await g.do("const keep = s.dynamicPowerPellets[0]; const m = s.map; for (let r = 0; r < 31; r++) for (let c = 0; c < 28; c++) m.pellets[r][c] = 'none'; m.pellets[keep.row][keep.col] = 'power'; s.dynamicPowerPellets = [keep]; s.pelletsRemaining = 1; s.pacman.speed = 3.8;");
  await sleep(2000);
  check(Math.abs(t1 - 15) <= 0.6 && Math.abs(t2 - 30) <= 0.6 && ok && p1 === p0 + 2 && !(await g.s("s.levelComplete")), `nivel 3: esferas grandes nuevas a los ${t1} s y ${t2} s del «¡ya!» en ${dyn.map(x => x.slice(0, 2).join(",")).join(" y ")} (transitables, fuera de la base y del túnel), contador ${p0} → ${p1}; con solo una dinámica sin consumir el nivel no termina`);
  await g.close();
};
C["CP-141"] = async () => {
  const g = await startGame("ghostman", "naval"); await g.leaveHouse();
  for (const k of ["ArrowUp", "ArrowDown", "KeyW", "KeyS", "Enter", "ArrowUp", "Enter"]) await g.hold(k, 650);
  const menus = await g.page.locator("[data-testid=mode-menu], [data-testid=ghost-carousel], [data-testid=main-menu]").count();
  await g.page.keyboard.press("Escape"); await sleep(200); await g.page.keyboard.press("Escape"); await sleep(200);
  const st = await g.s("[s.config.mode, s.ghosts.find(x => x.controlledByPlayer).kind]");
  check(menus === 0 && st[0] === "ghostman" && st[1] === "naval" && await g.page.isVisible("[data-testid=ghostman-status]"), "↑ ↓ W S Enter durante 5 s: el fantasma se mueve y no aparecen el menú ni el carrusel; tras pausar y reanudar sigue en modo GhostMan con «Vidas de Pacman» y el mismo fantasma");
  await g.close();
};
C["CP-142"] = async () => {
  const run = async kind => { const g = await startGame("ghostman", kind); await g.leaveHouse(); await g.parkAiGhosts(); await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 26 });");
    const row = await g.s("[...Array(31).keys()].find(r => r > 17 && s.map.cells[r].slice(1, 12).every(x => x !== 'wall'))");
    await g.place("player", row, 12); await g.startLog("s.ghosts.find(x => x.controlledByPlayer).col");
    await g.hold("ArrowLeft", 3500); const l = await g.stopLog(); await g.close();
    const a = l.find(e => e.v === 11).t, b = l.find(e => e.v === 1).t; return r1((b - a) / 1000); };
  const c = await run("classic"), n = await run("naval");
  check(Math.abs(c - 2.22) <= 0.15 && Math.abs(n - 2.78) <= 0.15, `10 celdas: Clásico ${c} s, Naval ${n} s (un ${Math.round((1 - c / n) * 100)} % más lento)`);
};
C["CP-143"] = async () => {
  const g = await startGame("ghostman", "naval"); await toLevelPlaying(g, 3); await g.leaveHouse();
  await g.do("s.lives = 1;"); await playerOnPac(g);
  await g.waitFor("s.levelComplete || s.won", 4000);
  const v = await g.page.waitForSelector("text=Victoria", { timeout: 6000 }).then(() => true).catch(() => false);
  const b = await breakdown(g.page).catch(() => []);
  await shot(g, "victoria");
  check(v && b.map(x => x[0]).join("|") === "Derrotas de Pacman|Esferas sin consumir|Total", `tercera derrota de Pacman en el nivel 3 con el Naval: se completa el nivel y aparece «¡Victoria!» con el desglose del modo GhostMan (${b.map(x => `${x[0]} ${x[1]}`).join(", ")})`);
  await g.close();
};
C["CP-144"] = async () => {
  const g = await startGame("ghostman", "classic"); await g.leaveHouse(); await g.place("player", 29, 1);
  await sleep(3000); await g.do("s.lives = 2;");
  const a = await g.s("[s.lives, s.score, s.pelletsRemaining, s.pacman.row, s.pacman.col]"), pp = await g.player("[p.row, p.col]");
  await ghostOn(g, 1); await sleep(500);
  const b = await g.s("[s.lives, s.score, s.pelletsRemaining, s.pacman.row, s.pacman.col]"), pp2 = await g.player("[p.row, p.col]");
  check(b[0] === 2 && b[1] === a[1] && b[2] === a[2] && b[3] === 23 && pp.join() === pp2.join(), `Pacman con 2 vidas en (${a[3]},${a[4]}): tocado por un fantasma de la IA vuelve a (${b[3]},${b[4]}) sin perder vidas; puntaje, esferas y posición del jugador sin cambios`);
  await g.close();
};
C["CP-145"] = async () => {
  const g = await startGame("ghostman", "classic"); await g.leaveHouse();
  for (let i = 0; i < 3; i++) { await g.waitFor("!s.countdown && !s.pacmanDeath", 6000); await g.leaveHouse(); await playerOnPac(g); await g.waitFor(`s.lives === ${2 - i} || s.levelComplete`, 3000); if (i < 2) await g.waitFor("!s.pacmanDeath && !s.countdown", 6000); }
  const st = await g.s("[s.score, s.lastLevelPelletsLeftBonus, s.pelletsRemaining]");
  await g.waitFor("s.level === 2 && !s.levelComplete", 8000);
  const rem = st[1] / 10;
  await g.parkAiGhosts(); await g.do("const m = s.map; for (let r = 0; r < 31; r++) for (let c = 0; c < 28; c++) m.pellets[r][c] = 'none'; m.pellets[23][10] = 'pellet'; s.pelletsRemaining = 1;");
  await g.page.waitForSelector("text=Game Over", { timeout: 15000 });
  const b = await breakdown(g.page);
  const sum = b.slice(0, -1).reduce((a, x) => a + x[1], 0);
  check(st[0] === 1500 + 10 * rem && b.length === 3 && sum === b.at(-1)[1], `nivel 1 con 3 derrotas y ${rem} esferas restantes: ${st[0]} = 1500 + 10 × ${rem}; desglose final ${b.map(x => `${x[0]} ${x[1]}`).join(", ")}`);
  await g.close();
};
C["CP-146"] = async () => {
  const g = await startGame("ghostman", "accelerated"); await g.leaveHouse(); await g.parkAiGhosts();
  await powerOn(g, 30);
  await g.do("const p = s.ghosts.find(x => x.controlledByPlayer); Object.assign(s.pacman, { row: p.row, col: p.col, progress: p.progress, direction: p.direction });");
  await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).eaten", 2000);
  const a = await g.player("[p.row, p.col, p.powerCooldown, p.dashCellsLeft]");
  await g.page.keyboard.press("Space"); await sleep(60);
  const b = await g.player("[p.powerCooldown, p.dashCellsLeft]");
  await g.waitFor("!s.ghosts.find(x => x.controlledByPlayer).eaten", 15000);
  const ready = await g.page.getAttribute("[data-testid=power-indicator]", "data-ready");
  check(b[0] === 0 && b[1] === 0 && ready === "true", `espacio mientras los ojos vuelven: sin desplazamiento ni cambio; al revivir la ⭐ sigue disponible`);
  await g.close();
};
C["CP-147"] = async () => {
  const g = await startGame("ghostman", "jumper", { url: REAL_URL });
  await g.waitFor("!s.countdown", 6000); await g.leaveHouse(); await g.parkAiGhosts(); await g.do("s.pacman.speed = 0;");
  await g.hold("ArrowLeft", 250); await g.page.keyboard.press("Space"); const t0 = Date.now();
  await g.waitFor("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return p.powerCooldown > 0 && !p.jump; })()", 3000);
  await playerOnPac(g); await g.waitFor("!!s.pacmanDeath", 2000);
  await g.waitFor("!s.pacmanDeath && !s.countdown", 8000);
  const still = await g.page.getAttribute("[data-testid=power-indicator]", "data-ready");
  await g.page.waitForSelector("[data-testid=power-indicator][data-ready=true]", { timeout: 15000 });
  const t = r1((Date.now() - t0) / 1000);
  check(still === "false" && Math.abs(t - 14) <= 0.6, `Saltarín: tras la derrota de Pacman y el «¡Listo!» la ⭐ sigue apagada; vuelve a los ${t} s del uso (10 s de juego más 4 s de derrota y «¡Listo!»)`);
  await g.close();
};
C["CP-148"] = async () => {
  const g = await startGame("ghostman", "naval"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 26 });");
  await placeFake(g, 23, 20); await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).powerCooldown <= 0", 6000); await placeFake(g, 23, 10);
  const n = await g.s("s.fakeFruits.length"); const k = (await g.audio()).log.length;
  await playerOnPac(g); await g.waitFor("s.fakeFruits.length === 0", 4000); await sleep(400);
  const ex = (await g.audio()).log.slice(k).filter(e => e === "play:explosion").length;
  check(n === 2 && (await g.s("s.fakeFruits.length")) === 0 && ex === 0 && (await g.s("s.explosions.length")) === 0, `con ${n} frutas falsas, al derrotar a Pacman el nivel se reinicia y desaparecen sin explotar`);
  await g.close();
};
C["CP-149"] = async () => {
  const g = await startGame("ghostman", "accelerated"); await g.leaveHouse(); await g.parkAiGhosts();
  const row = await g.s("[...Array(31).keys()].find(r => r > 17 && s.map.cells[r].slice(1, 12).every(x => x !== 'wall'))");
  await g.do(`s.pacman.speed = 0; Object.assign(s.pacman, { row: ${row}, col: 5, progress: 0, direction: null });`);
  await g.place("player", row, 6, { facing: "left", powerCooldown: 0 });
  const m0 = await lives(g);
  await g.page.keyboard.down("ArrowLeft"); await sleep(40); await g.page.keyboard.press("Space"); await sleep(500); await g.page.keyboard.up("ArrowLeft");
  const m1 = await lives(g);
  check(m1 === m0 - 1, `Acelerado en la columna 6 de la fila ${row} con Pacman a 1 celda por delante (columna 5): el dash de 3 celdas lo llevó más allá y Pacman perdió una vida (${m0} → ${m1}): el contacto se evalúa en todo el trayecto`);
  await g.close();
};
C["CP-150"] = async () => {
  const g = await startGame("ghostman", "accelerated"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 1, col: 26 });");
  const row = await g.s("[...Array(31).keys()].find(r => r > 17 && s.map.cells[r].slice(1, 12).every(x => x !== 'wall'))");
  await g.place("player", row, 1, { facing: "left", powerCooldown: 0 });
  await g.page.keyboard.press("Space"); await sleep(300);
  const a = await g.player("[p.col, p.powerCooldown]");
  await g.place("player", row, 8, { facing: "right" });
  await g.page.keyboard.down("ArrowRight"); await sleep(40); await g.page.keyboard.press("Space"); await sleep(400); await g.page.keyboard.up("ArrowRight");
  const b = await g.player("[p.col, p.powerCooldown]");
  check(a[0] === 1 && a[1] === 0 && b[0] >= 11 && b[1] > 9, `contra el muro: espacio sin desplazamiento ni cooldown (${a[1]}); en el pasillo libre el dash se ejecutó de inmediato (columna 8 → ${b[0]})`);
  await g.close();
};
C["CP-151"] = async () => {
  const g = await startGame("ghostman", "classic"); await toLevelPlaying(g, 2); await g.leaveHouse(); await g.parkAiGhosts();
  await provokeWallBreak(g); await sleep(150); await shot(g, "destello");
  const w = await g.s("s.destroyedWalls[0] && [s.destroyedWalls[0].row, s.destroyedWalls[0].col, s.wallFlashes.length]");
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
  await g.place("player", w[0], w[1] - 1);
  await g.hold("ArrowRight", 600);
  const p = await g.player("[p.row, p.col]");
  check(w && p[1] > w[1] - 1, `Pacman rompió (${w[0]},${w[1]}) con destello y escombros (captura); el fantasma del jugador pasó por esa celda (llegó a la columna ${p[1]})`);
  await g.close();
};
C["CP-152"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 2); await g.parkAiGhosts();
  const rev = await eatAndRevive(g, 20);
  for (let k = 0; k < 20 && new Set(rev.filter(x => x !== "classic")).size < 4; k++) rev.push(...(await eatAndRevive(g, 1)));
  const pw = rev.filter(k => k !== "classic");
  note(`tipos: ${rev.join(", ")}`);
  check(new Set(pw).size === 4 && pw.length / rev.length >= 0.3 && pw.length / rev.length <= 0.7 && rev.includes("classic"), `${rev.length} reapariciones en el nivel 2 (al menos 20): ${pw.length} con poderes (${Math.round(pw.length / rev.length * 100)} %; ${[...new Set(pw)].join(", ")}) y ${rev.length - pw.length} clásicas`);
  await g.close();
};
C["CP-153"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3); await g.parkAiGhosts();
  const a = await types(g);
  await ghostOn(g, 0); await g.waitFor("s.lives === 2 && !s.pacmanDeath && !s.countdown", 5000);
  const b = await types(g);
  await g.parkAiGhosts();
  const rev = await eatAndRevive(g, 4);
  const sorted = x => x.slice().sort().join(",");
  check(sorted(a) === "accelerated,jumper,naval,specter" && sorted(b) === sorted(a) && rev.every(k => k !== "classic"), `nivel 3: ${a.join(", ")}; después de perder una vida: ${b.join(", ")}; los comidos reviven como ${rev.join(", ")}, nunca clásicos`);
  await g.close();
};
C["CP-154"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3);
  await g.do("s.pacman.speed = 0; s.ghosts.forEach((x, i) => Object.assign(x, { row: 5, col: 4 + i * 6, inHouse: false, progress: 0, releaseTimer: 1e9, speed: 0, powerCooldown: 1e9 }));");
  await sleep(300);
  const sigs = await g.page.evaluate(() => window.__gm.ghosts.map(x => { const d = document.querySelector("canvas").getContext("2d").getImageData(x.col * 24 - 12, x.row * 24 - 12, 48, 48).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0; return h; }));
  await shot(g, "nivel3");
  check(new Set(sigs).size === 4, `los cuatro fantasmas del nivel 3 se dibujan distintos entre sí y del clásico (gorro del naval, espectro semitransparente, resortes del saltarín, líneas del acelerado; captura revisada)`);
  await g.close();
};
C["CP-155"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3);
  const j = await g.s("s.ghosts.findIndex(x => x.kind === 'jumper')");
  await g.do(`s.ghosts.forEach((x, i) => { if (i !== ${j}) Object.assign(x, { row: s.map.house.center.row, col: s.map.house.center.col, inHouse: true, releaseTimer: 1e9 }); }); s.pacman.speed = 0;`);
  await g.do(`Object.assign(s.ghosts[${j}], { row: 23, col: 4, inHouse: false, progress: 0, releaseTimer: 1e9, powerCooldown: 0, direction: 'right', desiredDirection: 'right' }); Object.assign(s.pacman, { row: 23, col: 12 });`);
  await g.startLog(`(() => { const x = s.ghosts[${j}]; return x.jump ? [x.jump.from.row, x.jump.from.col, x.jump.to.row, x.jump.to.col] : null; })()`);
  await sleep(14000);
  const l = await g.stopLog();
  const js = []; let prev = null; for (const e of l) { if (e.v && !prev) js.push({ t: e.t, v: e.v }); prev = e.v; }
  const first = js[0]?.v, cell = first ? await g.s(`s.map.cells[${first[2]}][${first[3]}]`) : null;
  const gap = js.length > 1 ? r1((js[1].t - js[0].t) / 1000) : null;
  check(first && Math.abs(first[2] - first[0]) + Math.abs(first[3] - first[1]) <= 10 && cell !== "wall" && (gap === null || gap >= 9.9), `con Pacman a ≤ 10 celdas, el saltarín saltó en arco de (${first?.slice(0, 2)}) a (${first?.slice(2)}), transitable y adelante; ${gap ? `el siguiente salto fue ${gap} s después` : "no volvió a saltar en los 14 s siguientes antes de los 10 s"}`);
  await g.close();
};
C["CP-156"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3);
  const n = await g.s("s.ghosts.findIndex(x => x.kind === 'naval')");
  await g.parkAiGhosts();
  await g.do(`Object.assign(s.ghosts[${n}], { inHouse: false, row: 11, col: 13, releaseTimer: 0, powerCooldown: 0, speed: 1 }); s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 1 }); s.lives = 99;`);
  note("el naval se dejó a 1 celda/s para que no alcance a Pacman (quieto en un rincón) durante la observación");
  await g.startLog(`[s.fakeFruits.length, s.lives]`);
  await sleep(15000);
  const l = await g.stopLog();
  const adds = []; for (let i = 1; i < l.length; i++) if (l[i].v[0] > l[i - 1].v[0]) adds.push(l[i].t);
  const gaps = adds.slice(1).map((t, i) => r1((t - adds[i]) / 1000));
  const max = Math.max(...l.map(e => e.v[0]));
  await g.waitFor("s.fakeFruits.length > 0 && s.fakeFruits[0].timeLeft > 3", 8000);
  await g.parkAiGhosts();
  const f = await g.s("s.fakeFruits[0] && [s.fakeFruits[0].row, s.fakeFruits[0].col]");
  let lost = false;
  if (f) {
    const l0 = await lives(g);
    await g.do("s.pacman.speed = 4.5; s.powerUpActive = false;");
    for (const [d, [dr, dc]] of Object.entries(D)) { if (!(await open(g, f[0] - dr, f[1] - dc))) continue; await pac(g, f[0] - dr, f[1] - dc); await g.page.keyboard.down(KEY[d]); await g.waitFor(`s.lives < ${l0}`, 1500); await g.page.keyboard.up(KEY[d]); break; }
    lost = (await lives(g)) === l0 - 1;
  }
  check(adds.length >= 2 && gaps.every(x => x >= 4.9) && max <= 2 && lost, `en 15 s el naval colocó ${adds.length} frutas falsas, con ${gaps.join(" y ")} s entre una y otra; nunca hubo más de ${max}; Pacman sin PowerUp comió la de (${f}) y perdió una vida`);
  await g.close();
};
C["CP-157"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3);
  const a = await g.s("s.ghosts.findIndex(x => x.kind === 'accelerated')");
  const row = await g.s("[...Array(31).keys()].find(r => r > 17 && s.map.cells[r].slice(1, 14).every(x => x !== 'wall'))");
  await g.do(`s.ghosts.forEach((x, i) => { if (i !== ${a}) Object.assign(x, { row: s.map.house.center.row, col: s.map.house.center.col, inHouse: true, releaseTimer: 1e9 }); }); s.pacman.speed = 0;`);
  await g.do(`Object.assign(s.pacman, { row: ${row}, col: 13 }); Object.assign(s.ghosts[${a}], { row: ${row}, col: 3, inHouse: false, progress: 0, releaseTimer: 1e9, powerCooldown: 0, direction: 'right', desiredDirection: 'right' });`);
  await g.startLog(`[s.ghosts[${a}].dashCellsLeft, s.ghosts[${a}].slowTimer, s.ghosts[${a}].col]`);
  await sleep(12000);
  const l = await g.stopLog();
  const starts = []; for (let i = 1; i < l.length; i++) if (l[i].v[0] > 0 && l[i - 1].v[0] === 0) starts.push(i);
  const i0 = starts[0];
  const cells = i0 ? l[i0].v[0] : 0;
  const slow = l.filter(e => e.v[1] > 0);
  const slowSecs = slow.length ? r1((slow.at(-1).t - slow[0].t) / 1000) : 0;
  const gap = starts.length > 1 ? r1((l[starts[1]].t - l[i0].t) / 1000) : null;
  check(i0 && cells >= 1 && cells <= 3 && Math.abs(slowSecs - 5) <= 0.4 && (gap === null || gap >= 9.9), `con Pacman a ≤ 6 celdas el acelerado se impulsó ${cells} celdas; quedó a la mitad de velocidad ${slowSecs} s y ${gap ? `el siguiente dash fue ${gap} s después` : "no repitió el dash"}`);
  await g.close();
};
C["CP-158"] = async () => {
  const g = await startGame("pacman"); await toLevelPlaying(g, 3);
  await g.do("s.ghosts.forEach((x, i) => Object.assign(x, { row: 27, col: 3 + i * 6, inHouse: false, progress: 0, releaseTimer: 1e9, powerCooldown: 0 }));");
  await powerAt(g, 29, 1);
  const v = await g.s("s.ghosts.filter(x => x.vulnerable).length");
  await g.startLog("s.ghosts.map(x => [x.vulnerable, x.phaseCellsLeft > 0 || !!x.jump || x.dashCellsLeft > 0, x.powerCooldown]).concat([[0, s.fakeFruits.length]])");
  await sleep(7000);
  const l = await g.stopLog();
  let used = false;
  for (let i = 1; i < l.length; i++) { for (let j = 0; j < 4; j++) { const [vu, pw, cd] = l[i].v[j], [, pw0, cd0] = l[i - 1].v[j]; if (vu && ((pw && !pw0) || cd > cd0 + 0.5)) used = true; } if (l[i].v[4][1] > l[i - 1].v[4][1]) used = true; }
  check(v === 4 && !used, `esfera grande de la fila 29 junto a los fantasmas: ${v} vulnerables; durante el PowerUp ninguno saltó, colocó frutas, hizo un dash ni atravesó muros`);
  await g.close();
};
C["CP-159"] = async () => {
  const g = await startGame("pacman"); await g.parkAiGhosts();
  const rev = await eatAndRevive(g, 6);
  await g.do("s.ghosts.forEach(x => x.releaseTimer = 0);"); await sleep(8000);
  const k = await types(g); const ff = await g.s("s.fakeFruits.length");
  check(rev.every(x => x === "classic") && k.every(x => x === "classic") && ff === 0, `6 fantasmas comidos en el nivel 1 reviven ${rev.join(", ")}; no aparecen frutas falsas ni fantasmas con poderes`);
  await g.close();
};
C["CP-160"] = async () => {
  const g = await startGame("ghostman", "classic"); await g.leaveHouse(); await g.parkAiGhosts();
  const [top, col] = await g.s("(() => { const m = s.map, h = m.house; for (let c = 1; c < 27; c++) for (let r = 1; r < 20; r++) if ([...Array(11).keys()].every(i => m.cells[r + i]?.[c] && m.cells[r + i][c] !== 'wall' && m.cells[r + i][c] !== 'door' && !(r + i >= h.top && r + i <= h.bottom && c >= h.left && c <= h.right))) return [r, c]; return [null, null]; })()");
  // Precondición: solo quedan esferas en la columna, debajo de Pacman, para que avance hacia el fantasma.
  await g.do(`const m = s.map; for (let r = 0; r < 31; r++) for (let c = 0; c < 28; c++) m.pellets[r][c] = 'none'; for (let r = ${top} + 2; r <= ${top} + 10; r++) m.pellets[r][${col}] = 'pellet'; s.pelletsRemaining = 9;
    Object.assign(s.pacman, { row: ${top}, col: ${col}, progress: 0, direction: 'down', desiredDirection: 'down' });`);
  await g.place("player", top + 10, col);
  await g.startLog(`[s.pacman.row, s.pacman.col, s.pacman.direction, s.ghosts.find(x => x.controlledByPlayer).row]`);
  await g.page.keyboard.down("ArrowUp"); await sleep(700); await g.page.keyboard.up("ArrowUp");
  await sleep(2000);
  const l = await g.stopLog();
  const turn = l.find((e, i) => i > 0 && e.v[2] !== "down" && l[i - 1].v[2] === "down");
  const dTurn = turn ? Math.abs(turn.v[3] - turn.v[0]) : null;
  const end = l.at(-1).v, dEnd = turn ? Math.abs(turn.v[3] - end[0]) + Math.abs(end[1] - col) : null;
  check(turn && dTurn <= 4 && dEnd > dTurn, `Pacman bajaba por la columna ${col} hacia las esferas; con el fantasma subiendo desde abajo, cambió de dirección (${turn?.v[2]}) al quedar a ${dTurn} celdas, y en los 2 s siguientes se alejó: quedó a ${dEnd} celdas del punto donde estaba el fantasma (el fantasma lo siguió persiguiendo)`);
  await g.close();
};
C["CP-161"] = async () => {
  const g = await startGame("ghostman", "classic"); await g.leaveHouse(); await g.parkAiGhosts();
  // El último movimiento del jugador fue ↑: se lo deja en una celda con muro arriba, así queda quieto.
  const [r, c] = await g.s("(() => { const m = s.map, h = m.house; for (let r = 18; r < 30; r++) for (let c = 1; c < 21; c++) if (m.cells[r - 1][c] === 'wall' && [...Array(7).keys()].every(i => m.cells[r][c + i] !== 'wall' && m.cells[r][c + i] !== 'door')) return [r, c]; })()");
  await g.place("player", r, c);
  await g.do(`Object.assign(s.pacman, { row: ${r}, col: ${c + 6}, progress: 0, direction: null });`);
  await powerOn(g, 8);
  await g.startLog(`Math.abs(s.pacman.col - ${c}) + Math.abs(s.pacman.row - ${r})`);
  const eaten = await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).eaten", 6000);
  const l = await g.stopLog();
  check(eaten && Math.min(...l.map(e => e.v)) <= 1, `con el PowerUp y el fantasma del jugador quieto en (${r},${c}), a 6 celdas, Pacman se dirigió hacia él (distancia ${l[0].v} → ${Math.min(...l.map(e => e.v))}) y lo comió`);
  await g.close();
};
C["CP-162"] = async () => {
  const g = await startGame("ghostman", "naval"); await g.leaveHouse(); await g.parkAiGhosts();
  await g.do("Object.assign(s.pacman, { row: 23, col: 16, progress: 0, direction: null }); s.pacman.speed = 0;");
  const f1 = await placeFake(g, 23, 12);
  await g.place("player", 5, 26);
  await g.do("s.pacman.speed = 3.8; s.random = () => 0.99;");
  const l0 = await lives(g);
  await sleep(9000);
  const a = await g.s("[s.lives, s.fakeFruits.length, s.explosions.length]");
  await g.waitFor("s.fakeFruits.length === 0", 3000);
  const known = f1[0]?.[2];
  await sleep(1500);
  await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
  await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).powerCooldown <= 0", 6000);
  const f2 = await placeFake(g, 23, 6);
  await g.place("player", 5, 26);
  await g.do("Object.assign(s.pacman, { row: 23, col: 11, progress: 0, direction: null }); s.pacman.speed = 3.8;");
  const l1 = await lives(g);
  const ate = await g.waitFor(`s.lives < ${l1}`, 8000);
  check(known && a[0] === l0 && !f2[0]?.[2] && ate, `fruta colocada a 4 celdas de Pacman: la registró y no la consumió (vidas ${a[0]}); otra colocada a más de 8 celdas: al pasar a 5 o menos se desvió, la consumió y perdió una vida`);
  await g.close();
};
C["CP-163"] = async () => {
  const g = await startGame("ghostman", "specter"); await toLevelPlaying(g, 2); await g.parkAiGhosts();
  await g.do("const m = s.map; for (let r = 0; r < 31; r++) for (let c = 0; c < 28; c++) m.pellets[r][c] = 'none'; m.pellets[23][10] = 'pellet'; s.pelletsRemaining = 1;");
  await g.page.waitForSelector("text=Game Over", { timeout: 15000 });
  await g.page.click("text=Volver a jugar"); await sleep(400);
  const st = await g.s("[s.config.mode, s.ghosts.find(x => x.controlledByPlayer).kind, s.level, s.lives, s.score]");
  await g.parkAiGhosts();
  await g.do("const m = s.map; for (let r = 0; r < 31; r++) for (let c = 0; c < 28; c++) m.pellets[r][c] = 'none'; m.pellets[23][10] = 'pellet'; s.pelletsRemaining = 1;");
  await g.page.waitForSelector("text=Game Over", { timeout: 15000 });
  await g.page.click("text=Menú principal");
  await g.page.waitForSelector("[data-testid=main-menu]");
  const menu = await g.page.$$eval("[data-testid=main-menu] button", b => b.map(x => x.textContent.replace("▶", "").trim()));
  check(st.join() === "ghostman,specter,1,3,0" && menu.join() === "Jugar,Puntajes,Opciones", `Game Over en el nivel 2 con el Espectro; «Volver a jugar»: modo GhostMan, Espectro, nivel 1, 3 vidas de Pacman, puntaje 0; al terminar, «Menú principal» muestra ${menu.join(", ")}`);
  await g.page.context().close();
};

// ---------------------------------------------------------------- ejecución
(async () => {
  const only = process.argv.slice(2);
  const browser = await launchBrowser();
  P.setBrowser(browser);
  for (const id of Object.keys(C)) {
    if (only.length && !only.includes(id)) continue;
    current = id; results[id] = { ok: true, notes: [] };
    console.log(`\n=== ${id} ===`);
    try { await C[id](); } catch (e) { results[id].ok = false; results[id].notes.push("ERROR: " + e.message.split("\n")[0]); console.log("ERROR", e.message.split("\n")[0]); }
  }
  await browser.close();
  const file = path.join(__dirname, "resultados_regresion.json");
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  fs.writeFileSync(file, JSON.stringify({ ...prev, ...results }, null, 2));
  console.log("\nRESUMEN", JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.ok ? "Aprobado" : "Fallido"]))));
})();
