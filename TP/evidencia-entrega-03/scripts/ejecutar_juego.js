// Etapa 4 — Ejecución con script de navegador de los casos de juego de la V3 de prioridad Alta:
// CP-164 a CP-168, CP-170, CP-172 y CP-175 (HU-44, HU-45).
//
// Igual que en el ciclo 2 (evidencia-entrega-02/README.md), hace falta un build con una línea extra en
// src/app/GameCanvas.tsx, justo antes de `const input = createKeyboardDirectionInput(`:
//
//   (window as unknown as { __gm: GameState }).__gm = state; // solo para la ejecución de pruebas
//
// La línea expone el estado del juego para verificar los resultados y preparar precondiciones (ubicar
// a un personaje, dejar a los fantasmas de la IA en la base, pasar de nivel); no forma parte del código
// entregado ni del commit bajo prueba. Las acciones del caso se hacen con el teclado real.
//   NEXT_PUBLIC_MODO_PRUEBA=1 npm run build && npm start
//   CHROMIUM_PATH=... node TP/evidencia-entrega-03/scripts/ejecutar_juego.js [CP-164 ...]
const fs = require("fs");
const path = require("path");
const { BASE_URL, APP_URL, launchBrowser, openMainMenu } = require("../../../scripts/verify/ui/helpers");

const SHOTS = path.join(__dirname, "..", "capturas");
fs.mkdirSync(SHOTS, { recursive: true });
const KINDS = ["classic", "specter", "jumper", "naval", "accelerated"];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = {};
let current;
const check = (cond, msg) => {
  console.log((cond ? "OK   " : "FAIL ") + msg);
  results[current].notes.push((cond ? "" : "FALLA: ") + msg);
  if (!cond) results[current].ok = false;
};

let browser;
class Game {
  constructor(page) { this.page = page; }
  s(expr, arg) { return this.page.evaluate(`(() => { const s = window.__gm; const arg = ${JSON.stringify(arg ?? null)}; return (${expr}); })()`); }
  do(code, arg) { return this.page.evaluate(`(() => { const s = window.__gm; const arg = ${JSON.stringify(arg ?? null)}; ${code} })()`); }
  shot(name) { return this.page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); }
  async hold(key, ms) { await this.page.keyboard.down(key); await sleep(ms); await this.page.keyboard.up(key); }
  async press(key, n = 1) { for (let i = 0; i < n; i++) { await this.page.keyboard.press(key); await sleep(80); } }
  async waitFor(expr, ms = 10000, arg) {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await this.s(expr, arg)) return true; await sleep(50); }
    return false;
  }
  // Muestreo dentro de la página, cuadro a cuadro: guarda `expr` con el tiempo en ms.
  async startLog(expr) {
    await this.page.evaluate(`(() => { window.__log = []; window.__stopLog = false;
      const f = () => { const s = window.__gm; if (s) window.__log.push({ t: performance.now(), v: (${expr}) }); if (!window.__stopLog) requestAnimationFrame(f); }; f(); })()`);
  }
  async stopLog() { return this.page.evaluate(() => { window.__stopLog = true; return window.__log; }); }
  house() { return this.s("({ ...s.map.house, door: s.map.house.door.map(c => ({ ...c })) })"); }
  // Precondición: los fantasmas de la IA quedan en el centro de la base sin salir.
  parkAiGhosts() {
    return this.do(`const h = s.map.house; for (const g of s.ghosts) { if (g.controlledByPlayer) continue;
      Object.assign(g, { row: h.center.row, col: h.center.col, progress: 0, direction: null, desiredDirection: null,
        inHouse: true, eaten: false, vulnerable: false, releaseTimer: 1e9, jump: null, dashCellsLeft: 0, phaseCellsLeft: 0 }); }`);
  }
  place(who, row, col, extra = {}) {
    const target = who === "pacman" ? "s.pacman" : "s.ghosts.find(g => g.controlledByPlayer)";
    return this.do(`Object.assign(${target}, { row: arg.row, col: arg.col, progress: 0, direction: null, desiredDirection: null }, arg.extra)`, { row, col, extra });
  }
  async toLevel(n) {
    for (let i = 0; i < 10; i++) {
      if ((await this.s("s.level")) >= n && !(await this.s("s.levelComplete"))) break;
      await this.do("s.levelComplete = true; s.levelTransitionTimer = 0.01;");
      await sleep(300);
    }
    await this.waitFor("!s.countdown", 8000);
    await sleep(200);
  }
}

async function startGame(mode, kind = "classic", url = APP_URL) {
  const context = await browser.newContext({ viewport: { width: 760, height: 960 } });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e.message));
  await openMainMenu(page, url);
  await page.click("[data-testid=home-play]");
  await page.waitForSelector("[data-testid=mode-menu]");
  if (mode === "pacman") {
    await page.click("[data-testid=menu-pacman]");
  } else {
    await page.click("[data-testid=menu-ghostman]");
    await page.waitForSelector("[data-testid=ghost-carousel]");
    for (let i = 0; i < KINDS.indexOf(kind); i++) { await page.keyboard.press("ArrowRight"); await sleep(80); }
    await page.keyboard.press("Enter");
  }
  await page.waitForSelector("canvas");
  const game = new Game(page);
  if (!(await game.waitFor("!!s", 5000))) throw new Error("el build no expone window.__gm (ver el encabezado del script)");
  return game;
}
const inside = (h, r, c) => r >= h.top && r <= h.bottom && c >= h.left && c <= h.right;

const CASES = {
  // ---------------- HU-44 · Base de los fantasmas
  async "CP-164"() {
    const g = await startGame("pacman");
    const houses = [];
    for (const level of [1, 2, 3]) {
      await g.toLevel(level);
      const h = await g.house();
      const doorCells = await g.s("s.map.house.door.map(d => s.map.cells[d.row][d.col])");
      houses.push(h);
      await g.shot(`CP-164-nivel${level}`);
      if (level === 1) {
        check(h.top === 12 && h.bottom === 16 && h.left === 10 && h.right === 17 && h.door.map(d => `${d.row},${d.col}`).join(" ") === "12,13 12,14" && doorCells.every(c => c === "door"),
          `paso 1: nivel 1, base en filas ${h.top}–${h.bottom} y columnas ${h.left}–${h.right}, puerta de dos celdas en ${h.door.map(d => `(${d.row},${d.col})`).join(" y ")}, arriba`);
      }
    }
    const same = houses.every(h => JSON.stringify(h) === JSON.stringify(houses[0]));
    check(same, `paso 2: niveles 2 y 3 con la base y la puerta en la misma posición que el nivel 1 (${same ? "idénticas" : JSON.stringify(houses)})`);
    await g.page.context().close();
  },

  async "CP-165"() {
    let g = await startGame("pacman");
    const h = await g.house();
    await g.parkAiGhosts();
    await g.place("pacman", h.exit.row, h.exit.col);
    await g.startLog("[s.pacman.row, s.pacman.col]");
    await g.hold("ArrowDown", 3000);
    const log1 = await g.stopLog();
    const maxRow = Math.max(...log1.map(e => e.v[0]));
    check(maxRow === h.exit.row && !log1.some(e => inside(h, ...e.v)), `paso 1: sobre la puerta (${h.exit.row},${h.exit.col}) con ↓ durante 3 s, Pacman no pasa de la fila ${maxRow}`);
    await g.shot("CP-165-paso1");
    // Anillo: cada celda transitable que toca un muro de la base, presionando hacia la base.
    const ring = await g.s(`(() => { const h = s.map.house, out = [];
      for (let r = h.top - 1; r <= h.bottom + 1; r++) for (let c = h.left - 1; c <= h.right + 1; c++) {
        if (r >= h.top && r <= h.bottom && c >= h.left && c <= h.right) continue;
        if (s.map.cells[r][c] === "wall") continue;
        const dir = r < h.top ? "ArrowDown" : r > h.bottom ? "ArrowUp" : c < h.left ? "ArrowRight" : "ArrowLeft";
        if ((r < h.top || r > h.bottom) && (c < h.left || c > h.right)) continue; // esquinas: no tocan la base
        out.push({ r, c, dir }); }
      return out; })()`);
    let entered = 0;
    for (const { r, c, dir } of ring) {
      await g.place("pacman", r, c);
      await g.startLog("[s.pacman.row, s.pacman.col]");
      await g.hold(dir, 400);
      if ((await g.stopLog()).some(e => inside(h, ...e.v))) entered++;
    }
    const sides = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].map(d => ring.filter(x => x.dir === d).length);
    check(ring.length > 0 && entered === 0, `paso 2: ${ring.length} celdas del anillo (arriba ${sides[0]}, abajo ${sides[1]}, izquierda ${sides[2]}, derecha ${sides[3]}), presionando hacia la base: Pacman no entró en ninguna`);
    await g.page.context().close();

    g = await startGame("ghostman");
    await g.toLevel(2);
    const before = await g.s("s.map.cells.slice(arg.top, arg.bottom + 1).map(row => row.slice(arg.left, arg.right + 1).join(',')).join(';')", h);
    await g.parkAiGhosts();
    let samples = 0, insideCount = 0, minDist = 99;
    for (const side of [{ r: h.top - 1, c: h.left + 1 }, { r: h.bottom + 1, c: h.right - 1 }, { r: h.top + 2, c: h.left - 1 }, { r: h.top + 2, c: h.right + 1 }]) {
      if ((await g.s("s.map.cells[arg.r][arg.c]", side)) === "wall") continue;
      await g.do("s.powerUpActive = true; s.powerUpTimer = 8; s.wallCharges = 5; s.ghosts.forEach(x => { if (!x.eaten) x.vulnerable = true; });");
      await g.place("pacman", side.r, side.c);
      await g.startLog("[s.pacman.row, s.pacman.col, s.wallCharges]");
      await sleep(5000);
      const log = await g.stopLog();
      samples += log.length;
      insideCount += log.filter(e => inside(h, e.v[0], e.v[1])).length;
      minDist = Math.min(minDist, ...log.map(e => Math.max(h.top - e.v[0], e.v[0] - h.bottom, h.left - e.v[1], e.v[1] - h.right, 0)));
    }
    const after = await g.s("s.map.cells.slice(arg.top, arg.bottom + 1).map(row => row.slice(arg.left, arg.right + 1).join(',')).join(';')", h);
    const brokenInHouse = await g.s("s.destroyedWalls.filter(w => w.row >= arg.top && w.row <= arg.bottom && w.col >= arg.left && w.col <= arg.right).length", h);
    const broken = await g.s("s.destroyedWalls.length");
    await g.shot("CP-165-paso3");
    check(insideCount === 0 && before === after && brokenInHouse === 0,
      `paso 3: modo GhostMan nivel 2, 20 s de PowerUp con 5 cargas desde los cuatro lados de la base (${samples} cuadros, distancia mínima a la base ${minDist}): Pacman no entró, los muros de la base no cambiaron (${broken} muros rotos en total, ninguno de la base)`);
    await g.page.context().close();
  },

  async "CP-166"() {
    // Espectro pegado al muro izquierdo de la base, mirando hacia ella.
    let g = await startGame("ghostman", "specter");
    const h = await g.house();
    await g.hold("ArrowUp", 2000);
    await g.parkAiGhosts();
    const sideRow = h.top + 2, sideCol = h.left - 1;
    await g.place("player", sideRow, sideCol, { facing: "right", powerCooldown: 0 });
    await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.row, p.col, p.eaten, p.powerCooldown]; })()");
    await g.page.keyboard.down("ArrowRight");
    await sleep(150);
    await g.page.keyboard.press("Space");
    await sleep(2000);
    await g.page.keyboard.up("ArrowRight");
    let log = await g.stopLog();
    check(!log.some(e => inside(h, e.v[0], e.v[1])) && !log.some(e => e.v[2]), `paso 1: Espectro en (${sideRow},${sideCol}) mirando a la base, barra espaciadora: no entró a la base (última celda (${log.at(-1).v[0]},${log.at(-1).v[1]}))`);
    await g.shot("CP-166-paso1");
    await g.page.context().close();

    // Acelerado en la fila 11, sobre la puerta, mirando hacia abajo.
    g = await startGame("ghostman", "accelerated");
    await g.hold("ArrowUp", 2000);
    await g.parkAiGhosts();
    await g.place("player", h.exit.row, h.exit.col, { facing: "down", powerCooldown: 0 });
    await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.row, p.col, p.inHouse, p.powerCooldown, p.dashCellsLeft]; })()");
    await g.page.keyboard.down("ArrowDown");
    await sleep(150);
    await g.page.keyboard.press("Space");
    await sleep(1500);
    await g.page.keyboard.up("ArrowDown");
    log = await g.stopLog();
    check(!log.some(e => inside(h, e.v[0], e.v[1]) || e.v[2]), `paso 2: Acelerado en (${h.exit.row},${h.exit.col}) mirando a la puerta, barra espaciadora: el impulso no lo llevó adentro (fila máxima ${Math.max(...log.map(e => e.v[0]))})`);
    await g.shot("CP-166-paso2");
    await g.page.context().close();

    // Saltarín en la fila 10 mirando hacia abajo: 5 saltos esperando el cooldown.
    g = await startGame("ghostman", "jumper");
    await g.hold("ArrowUp", 2000);
    await g.parkAiGhosts();
    const landings = [];
    for (let i = 0; i < 5; i++) {
      await g.place("player", 10, h.exit.col, { facing: "down" });
      await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).powerCooldown <= 0", 15000);
      await g.parkAiGhosts();
      await g.place("player", 10, h.exit.col, { facing: "down" });
      await g.page.keyboard.press("Space");
      const jumped = await g.waitFor("!!s.ghosts.find(x => x.controlledByPlayer).jump", 1000);
      const to = jumped ? await g.s("({ ...s.ghosts.find(x => x.controlledByPlayer).jump.to })") : null;
      await g.waitFor("!s.ghosts.find(x => x.controlledByPlayer).jump", 2000);
      const at = await g.s("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return { row: p.row, col: p.col }; })()");
      landings.push({ jumped, to, at });
      if (i === 0) await g.shot("CP-166-paso3");
    }
    const bad = landings.filter(l => !l.jumped || inside(h, l.at.row, l.at.col) || (l.to && inside(h, l.to.row, l.to.col)));
    check(bad.length === 0, `paso 3: Saltarín en la fila 10 mirando hacia abajo, 5 saltos: aterrizó en ${landings.map(l => `(${l.at.row},${l.at.col})`).join(", ")}; ninguno dentro de la base`);
    await g.page.context().close();
  },

  async "CP-167"() {
    // Sin ?modoPrueba=1: cuenta y "¡Listo!" con su duración real.
    const g = await startGame("pacman", "classic", BASE_URL);
    const h = await g.house();
    const at = expr => g.s(expr);
    await g.waitFor("s.countdown && s.countdown.kind === 'start'", 3000);
    const during = await at("s.ghosts.map(x => ({ id: x.id, row: x.row, col: x.col, inHouse: x.inHouse }))");
    const outside = during.filter(x => !x.inHouse);
    check(outside.length === 1 && outside[0].row === h.exit.row && during.filter(x => x.inHouse).length === 3,
      `paso 1: durante la cuenta, ${outside.length} afuera (${outside.map(x => `${x.id} en (${x.row},${x.col})`).join(", ")}) y ${during.filter(x => x.inHouse).length} adentro`);
    await g.shot("CP-167-paso1");
    const measure = async () => {
      // Instante del "¡ya!" (últimos 0,5 s de la cuenta) y del final de la cuenta; luego, el momento en que
      // cada fantasma de adentro empieza a moverse hacia la puerta y el momento en que sale.
      await g.startLog("[s.countdown ? s.countdown.kind + ':' + s.countdown.timeLeft.toFixed(2) : null, s.ghosts.map(x => [x.id, x.row, x.col, x.inHouse, x.progress]), s.pacmanDeath ? 1 : 0]");
      await sleep(13500);
      return g.stopLog();
    };
    const analyse = log => {
      const yaIdx = log.findIndex(e => e.v[0] && Number(e.v[0].split(":")[1]) <= 0.5);
      const endIdx = log.findIndex((e, i) => i > yaIdx && !e.v[0]);
      const tYa = log[yaIdx].t, tEnd = log[endIdx].t;
      const first = log[endIdx].v[1];
      const exits = [];
      for (const [id, r0, c0, in0, p0] of first) {
        if (!in0) continue;
        const move = log.findIndex((e, i) => i >= endIdx && e.v[1].some(([gid, r, c, , p]) => gid === id && (r !== r0 || c !== c0 || p !== p0)));
        const out = log.findIndex((e, i) => i >= endIdx && e.v[1].some(([gid, , , ins]) => gid === id && !ins));
        exits.push({ id, start: move >= 0 ? (log[move].t - tYa) / 1000 : null, out: out >= 0 ? (log[out].t - tYa) / 1000 : null, endToStart: move >= 0 ? (log[move].t - tEnd) / 1000 : null });
      }
      return exits.sort((a, b) => (a.start ?? 99) - (b.start ?? 99));
    };
    const fmt = ex => ex.map(e => `${e.id} empieza a ${e.start?.toFixed(2)} s y queda afuera a ${e.out?.toFixed(2)} s`).join("; ");
    const okTimes = ex => ex.length === 3 && ex.every((e, i) => e.start !== null && Math.abs(e.start - 3 * (i + 1)) <= 0.5);
    // La cuenta ya empezó: se mide desde el próximo "¡ya!".
    const log1 = await measure();
    const ex1 = analyse(log1);
    check(okTimes(ex1), `paso 2: desde el «¡ya!»: ${fmt(ex1)}`);
    // Perder una vida: un fantasma alcanza a Pacman quieto.
    await g.do("const p = s.pacman; const x = s.ghosts.find(gh => !gh.inHouse); Object.assign(x, { row: p.row, col: p.col, progress: 0 });");
    await g.waitFor("s.countdown && s.countdown.kind === 'ready'", 8000);
    const after = await at("s.ghosts.map(x => ({ id: x.id, row: x.row, col: x.col, inHouse: x.inHouse }))");
    const out2 = after.filter(x => !x.inHouse);
    await g.shot("CP-167-paso3");
    const log2 = await measure();
    const ex2 = analyse(log2);
    check(out2.length === 1 && out2[0].row === h.exit.row && okTimes(ex2),
      `paso 3: tras perder una vida, durante el «¡Listo!» ${out2.length} afuera sobre la puerta; desde el «¡ya!»: ${fmt(ex2)}`);
    await g.page.context().close();
  },

  async "CP-168"() {
    const g = await startGame("ghostman", "classic");
    const h = await g.house();
    await g.startLog("s.ghosts.map(x => [x.id, x.controlledByPlayer, x.inHouse, x.row, x.col, x.progress])");
    await sleep(10000);
    const log = await g.stopLog();
    const first = log[0].v;
    const player = first.find(x => x[1]);
    const aiOut = first.filter(x => !x[1] && !x[2]);
    const exits = first.filter(x => !x[1] && x[2]).map(([id, , , r0, c0, p0]) => {
      const m = log.findIndex(e => e.v.some(y => y[0] === id && (y[3] !== r0 || y[4] !== c0 || y[5] !== p0)));
      const o = log.findIndex(e => e.v.some(y => y[0] === id && !y[2]));
      return { id, start: m >= 0 ? (log[m].t - log[0].t) / 1000 : null, out: o >= 0 ? (log[o].t - log[0].t) / 1000 : null };
    }).sort((a, b) => (a.start ?? 99) - (b.start ?? 99));
    check(player[2] && aiOut.length === 1 && exits.length === 2 && exits.every((e, i) => e.start !== null && e.out !== null && Math.abs(e.start - 3 * (i + 1)) <= 0.5),
      `paso 1: el fantasma del jugador arranca dentro de la base; ${aiOut.length} de la IA afuera; los otros dos empiezan a salir a los ${exits.map(e => e.start?.toFixed(2)).join(" y ")} s y quedan afuera a los ${exits.map(e => e.out?.toFixed(2)).join(" y ")} s`);
    await g.shot("CP-168-paso1");
    await g.parkAiGhosts();
    await g.hold("ArrowUp", 2000);
    const p1 = await g.s("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.row, p.col, p.inHouse]; })()");
    check(!p1[2] && p1[0] <= h.exit.row, `paso 2: con ↑ durante 2 s sale por la puerta y queda en (${p1[0]},${p1[1]})`);
    await g.place("player", h.exit.row, h.exit.col);
    await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.row, p.col, p.inHouse]; })()");
    await g.hold("ArrowDown", 2000);
    const log3 = await g.stopLog();
    check(!log3.some(e => e.v[2] || inside(h, e.v[0], e.v[1])), `paso 3: sobre la puerta con ↓ durante 2 s no vuelve a entrar (fila máxima ${Math.max(...log3.map(e => e.v[0]))})`);
    await g.shot("CP-168-paso3");
    await g.page.context().close();
  },

  async "CP-170"() {
    const g = await startGame("pacman");
    const h = await g.house();
    await g.waitFor("s.ghosts.every(x => !x.inHouse)", 15000);
    // Esfera grande: Pacman a una celda de la más cercana, avanzando hacia ella.
    const power = await g.s(`(() => { for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) if (s.map.pellets[r][c] === "power") {
      for (const [dr, dc, key] of [[0, 1, "ArrowLeft"], [0, -1, "ArrowRight"], [1, 0, "ArrowUp"], [-1, 0, "ArrowDown"]]) {
        const rr = r + dr, cc = c + dc; if (s.map.cells[rr] && s.map.cells[rr][cc] !== "wall" && s.map.cells[rr][cc] !== "door") return { r, c, rr, cc, key }; } } return null; })()`);
    await g.place("pacman", power.rr, power.cc);
    await g.hold(power.key, 500);
    const pu = await g.s("s.powerUpActive");
    // Un fantasma vulnerable a una celda, yendo hacia Pacman.
    await g.do("const p = s.pacman; const x = s.ghosts.find(gh => !gh.inHouse && gh.vulnerable); Object.assign(x, { row: p.row, col: p.col, progress: 0 }); window.__eatenId = x.id;");
    await g.waitFor("s.ghosts.some(x => x.eaten)", 2000);
    const id = await g.page.evaluate(() => window.__eatenId);
    const eaten = await g.s("s.ghosts.find(x => x.id === arg).eaten", id);
    await g.shot("CP-170-paso1");
    check(pu && eaten, `paso 1: Pacman come la esfera grande en (${power.r},${power.c}) y luego a ${id}, que queda reducido a sus ojos`);
    // Cruce con los ojos: Pacman se para en la celda de los ojos.
    const before = await g.s("({ lives: s.lives, score: s.score, eatenCount: s.ghostsEatenInPowerUp })");
    await g.startLog("(() => { const x = s.ghosts.find(gh => gh.id === arg); return [x.row, x.col, x.eaten, x.inHouse, x.vulnerable]; })()".replace("arg", JSON.stringify(id)));
    await sleep(300);
    await g.do("const x = s.ghosts.find(gh => gh.id === arg); s.pacman.row = x.row; s.pacman.col = x.col; s.pacman.progress = 0;", id);
    await sleep(400);
    const cross = await g.s("({ lives: s.lives, score: s.score, eatenCount: s.ghostsEatenInPowerUp, eaten: s.ghosts.find(x => x.id === arg).eaten })", id);
    await g.waitFor("!s.ghosts.find(x => x.id === arg).eaten", 15000, id);
    await g.waitFor("!s.ghosts.find(x => x.id === arg).inHouse", 8000, id);
    await sleep(300);
    const log = await g.stopLog();
    const dist = e => Math.abs(e.v[0] - h.center.row) + Math.abs(e.v[1] - h.center.col);
    const eyes = log.filter(e => e.v[2]);
    const nonIncreasing = eyes.every((e, i) => i === 0 || dist(e) <= dist(eyes[i - 1]) + 1);
    check(cross.eaten && cross.lives === before.lives && cross.score === before.score && cross.eatenCount === before.eatenCount && eyes.length > 0 && nonIncreasing,
      `paso 2: al cruzarse, Pacman no pierde vida ni suma puntos (vidas ${cross.lives}, puntaje ${cross.score}); los ojos van hacia la base (distancia ${dist(eyes[0])} → ${dist(eyes.at(-1))})`);
    const revived = log.findIndex(e => !e.v[2]);
    const outAgain = log.findIndex((e, i) => i > revived && !e.v[3]);
    const vulnerableOut = outAgain >= 0 ? log[outAgain].v[4] : null;
    const puNow = await g.s("s.powerUpActive");
    await g.shot("CP-170-paso3");
    check(revived >= 0 && log[revived].v[3] && outAgain >= 0,
      `paso 3: los ojos entran a la base, el fantasma revive adentro y vuelve a salir por la puerta (${vulnerableOut ? "vulnerable" : "normal"}; PowerUp ${puNow ? "activo" : "terminado"})`);
    await g.page.context().close();
  },

  async "CP-172"() {
    const g = await startGame("ghostman", "classic");
    await g.startLog("[s.ghosts.find(x => x.controlledByPlayer).inHouse, s.pelletsRemaining, s.gameOver, s.won]");
    const start = Date.now();
    await g.page.waitForSelector("text=Game Over", { timeout: 330000 }).catch(() => {});
    const secs = ((Date.now() - start) / 1000).toFixed(0);
    const log = await g.stopLog();
    const end = log.at(-1).v;
    check(log.every(e => e.v[0]), "paso 1: sin presionar teclas, el fantasma del jugador queda dentro de la base todo el nivel");
    await g.shot("CP-172-paso2");
    check(end[1] === 0 && end[2] && !end[3] && (await g.page.isVisible("text=Game Over")),
      `paso 2: a los ${secs} s Pacman comió la última esfera (${end[1]} restantes) y la partida terminó en Game Over: el jugador pierde`);
    await g.page.context().close();
  },

  // ---------------- HU-45 · Túnel
  async "CP-175"() {
    const g = await startGame("pacman");
    const lines = [];
    let ok = true;
    for (const level of [1, 2, 3]) {
      await g.toLevel(level);
      await g.parkAiGhosts();
      const tunnel = await g.s("[...s.map.tunnelCells]");
      const row = Number(tunnel[0].split(",")[0]);
      const speed = await g.s("s.pacman.speed");
      await g.place("pacman", row, 4);
      await g.startLog("[s.pacman.row, s.pacman.col, s.pacman.direction, s.pacman.speed]");
      await g.hold("ArrowLeft", 1800);
      const left = await g.stopLog();
      if (level === 1) await g.shot("CP-175-paso1");
      const wrapL = left.findIndex((e, i) => i > 0 && left[i - 1].v[1] === 0 && e.v[1] === 27);
      await g.startLog("[s.pacman.row, s.pacman.col, s.pacman.direction, s.pacman.speed]");
      await g.hold("ArrowRight", 2200);
      const right = await g.stopLog();
      const wrapR = right.findIndex((e, i) => i > 0 && right[i - 1].v[1] === 27 && e.v[1] === 0);
      const sameSpeed = [...left, ...right].every(e => e.v[3] === speed);
      // Celdas por segundo medidas en el cruce hacia la izquierda (de la columna 3 a la 24).
      const tAt = (log, col) => log.find(e => e.v[1] === col)?.t;
      const measured = (tAt(left, 24) && tAt(left, 3)) ? 7 / ((tAt(left, 24) - tAt(left, 3)) / 1000) : null;
      const okLevel = tunnel.every(c => c.startsWith("13,")) && wrapL > 0 && left[wrapL].v[2] === "left" && wrapR > 0 && right[wrapR].v[2] === "right" && sameSpeed;
      ok = ok && okLevel;
      lines.push(`nivel ${level}: túnel en la fila ${row}; ← sale por la columna 0 y aparece en la 27 hacia la izquierda; → sale por la 27 y aparece en la 0 hacia la derecha; velocidad ${speed} celdas/s sin cambios${measured ? ` (medida ${measured.toFixed(2)})` : ""}`);
      if (level === 1) await g.shot("CP-175-paso2");
    }
    check(ok, lines.join(". "));
    await g.page.context().close();
  },
};

(async () => {
  const only = process.argv.slice(2);
  browser = await launchBrowser();
  for (const [id, run] of Object.entries(CASES)) {
    if (only.length && !only.includes(id)) continue;
    current = id;
    results[id] = { ok: true, notes: [] };
    console.log(`\n=== ${id} ===`);
    try {
      await run();
    } catch (e) {
      check(false, `error al ejecutar: ${e.message.split("\n")[0]}`);
    }
    for (const c of browser.contexts()) await c.close();
  }
  console.log("\nRESUMEN " + JSON.stringify(Object.fromEntries(Object.entries(results).map(([id, r]) => [id, r.ok ? "Aprobado" : "Fallido"]))));
  await browser.close();
  process.exit(Object.values(results).every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
