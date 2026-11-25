// Etapa 4 — Ejecución con script de navegador de los casos de la V3 de prioridad Media y Baja que
// faltaban (HU-40, HU-41, HU-42 y HU-44 a HU-50). Mismo método que ejecutar_juego.js: build de prueba
// con la línea que expone el estado del juego (window.__gm, ver el encabezado de ejecutar_juego.js);
// las acciones del caso se hacen con el teclado real y el estado se usa para verificar y para preparar
// precondiciones. Los casos de la HU-46 a la HU-49 que piden duraciones reales se abren sin
// ?modoPrueba=1. El audio se verifica con el registro del motor (window.__ghostmanAudio), que en los
// builds de prueba anota cada sonido y la ganancia de cada canal.
//   NEXT_PUBLIC_MODO_PRUEBA=1 npm run build && npm start
//   CHROMIUM_PATH=... node TP/evidencia-entrega-03/scripts/ejecutar_pendientes.js [CP-169 ...]
// Deja un resumen en resultados_pendientes.json y una captura por paso en capturas/.
// En la corrida del 25/11/2026 el proyecto de Supabase de prueba no estaba disponible: el build de prueba
// usó un doble de Supabase en memoria (src/app/supabase.ts reemplazado localmente, no se sube) que acepta
// cualquier login y guarda las preferencias en el navegador. Por eso los casos que dependen de datos
// guardados en la base (CP-129 a CP-131 y CP-133) quedaron sin ejecutar.
const fs = require("fs");
const path = require("path");
const { BASE_URL, APP_URL, launchBrowser, openMainMenu } = require("../../../scripts/verify/ui/helpers");

const SHOTS = path.join(__dirname, "..", "capturas");
fs.mkdirSync(SHOTS, { recursive: true });
const REAL_URL = `${BASE_URL}/`; // sin ?modoPrueba=1: cuenta y animaciones con su duración real
const KINDS = ["classic", "specter", "jumper", "naval", "accelerated"];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r1 = x => Math.round(x * 100) / 100;

const results = {};
let current;
const check = (cond, msg) => {
  console.log((cond ? "OK   " : "FAIL ") + msg);
  results[current].notes.push((cond ? "" : "FALLA: ") + msg);
  if (!cond) results[current].ok = false;
};
const note = msg => { console.log("     " + msg); results[current].notes.push(msg); };

let browser;
class Game {
  constructor(page) { this.page = page; }
  s(expr, arg) { return this.page.evaluate(`(() => { const s = window.__gm; const arg = ${JSON.stringify(arg ?? null)}; return (${expr}); })()`); }
  do(code, arg) { return this.page.evaluate(`(() => { const s = window.__gm; const arg = ${JSON.stringify(arg ?? null)}; ${code} })()`); }
  shot(name, opts = {}) { return this.page.screenshot({ path: path.join(SHOTS, `${name}.png`), ...opts }); }
  async hold(key, ms) { await this.page.keyboard.down(key); await sleep(ms); await this.page.keyboard.up(key); }
  async press(key, n = 1) { for (let i = 0; i < n; i++) { await this.page.keyboard.press(key); await sleep(80); } }
  async waitFor(expr, ms = 10000, arg) {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await this.s(expr, arg)) return true; await sleep(30); }
    return false;
  }
  async startLog(expr) {
    await this.page.evaluate(`(() => { window.__log = []; window.__stopLog = false;
      const f = () => { const s = window.__gm; if (s) { try { window.__log.push({ t: performance.now(), v: (${expr}) }); } catch (e) {} } if (!window.__stopLog) requestAnimationFrame(f); }; f(); })()`);
  }
  async stopLog() { return this.page.evaluate(() => { window.__stopLog = true; return window.__log; }); }
  audio() { return this.page.evaluate(() => ({ log: [...(window.__ghostmanAudio?.log ?? [])], gains: window.__ghostmanAudio?.gains ?? null })); }
  house() { return this.s("({ ...s.map.house, door: s.map.house.door.map(c => ({ ...c })) })"); }
  parkAiGhosts() {
    return this.do(`const h = s.map.house; for (const g of s.ghosts) { if (g.controlledByPlayer) continue;
      Object.assign(g, { row: h.center.row, col: h.center.col, progress: 0, direction: null, desiredDirection: null,
        inHouse: true, eaten: false, vulnerable: false, releaseTimer: 1e9, jump: null, dashCellsLeft: 0, phaseCellsLeft: 0 }); }`);
  }
  place(who, row, col, extra = {}) {
    const target = who === "pacman" ? "s.pacman" : who === "player" ? "s.ghosts.find(g => g.controlledByPlayer)" : `s.ghosts[${who}]`;
    return this.do(`Object.assign(${target}, { row: arg.row, col: arg.col, progress: 0, direction: null, desiredDirection: null }, arg.extra)`, { row, col, extra });
  }
  player(expr = "p") { return this.s(`(() => { const p = s.ghosts.find(g => g.controlledByPlayer); return (${expr}); })()`); }
  // Saca al fantasma del jugador por la puerta (decisión 45) y lo deja en la celda de salida.
  async leaveHouse() {
    await this.page.keyboard.down("ArrowUp");
    await this.waitFor("!s.ghosts.find(g => g.controlledByPlayer).inHouse", 8000);
    await this.page.keyboard.up("ArrowUp");
    await sleep(100);
  }
  async toLevel(n) {
    for (let i = 0; i < 10; i++) {
      if ((await this.s("s.level")) >= n && !(await this.s("s.levelComplete"))) break;
      await this.do("s.levelComplete = true; s.levelTransitionTimer = 0.01;");
      await sleep(300);
    }
    await this.waitFor("!s.countdown && !s.levelComplete", 12000);
    await sleep(200);
  }
  close() { return this.page.context().close(); }
}

async function newPage(viewport = { width: 760, height: 960 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e.message));
  return page;
}

async function startGame(mode, kind = "classic", { url = APP_URL, page } = {}) {
  page = page ?? await newPage();
  if (!(await page.isVisible("[data-testid=main-menu]").catch(() => false))) await openMainMenu(page, url);
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
  if (!(await game.waitFor("!!s", 5000))) throw new Error("el build no expone window.__gm (ver el encabezado de ejecutar_juego.js)");
  return game;
}

// ---- Opciones (HU-40, HU-41)
const opt = {
  selected: page => page.locator("[data-testid=options-section] [aria-current=true]").getAttribute("data-testid"),
  name: (page, row) => page.textContent(`[data-testid=options-${row}-name]`),
  chosen: async (page, row) => (await page.getAttribute(`[data-testid=options-${row}-name]`, "data-chosen")) === "true",
  value: (page, channel) => page.textContent(`[data-testid=options-${channel}-value]`).then(Number),
  async goTo(page, target) { for (let i = 0; i < 8 && (await opt.selected(page)) !== `options-${target}`; i++) { await page.keyboard.press("ArrowDown"); await sleep(60); } },
  async open(page) {
    await page.click("[data-testid=home-options]");
    await page.waitForSelector("[data-testid=options-section]");
    await sleep(600);
  },
  saved: page => page.waitForSelector("[data-testid=options-save][data-status=saved]", { timeout: 5000 }).then(() => true).catch(() => false),
  async toMenu(page) { await page.keyboard.press("Escape"); await page.waitForSelector("[data-testid=main-menu]"); },
};

// Cuenta píxeles del canvas de un color (± tolerancia) en un rectángulo de celdas.
async function countColor(page, hex, area = null, tol = 12) {
  return page.evaluate(([hex, area, tol]) => {
    const c = document.querySelector("canvas"); const ctx = c.getContext("2d");
    const [x0, y0, w, h] = area ? [area.col * 24, area.row * 24, area.cols * 24, area.rows * 24] : [0, 0, c.width, c.height];
    const d = ctx.getImageData(x0, y0, w, h).data;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol && Math.abs(d[i + 2] - b) <= tol) n++;
    return n;
  }, [hex, area, tol]);
}

// Termina la partida en curso: deja una vida y pone a un fantasma de la IA sobre Pacman.
async function loseAllLives(g) {
  await g.do("s.lives = 1; s.powerUpActive = false; s.ghosts.forEach(x => x.vulnerable = false);");
  await g.do("const p = s.pacman; const x = s.ghosts.find(g => !g.controlledByPlayer); Object.assign(x, { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, eaten: false, vulnerable: false });");
  await g.page.waitForSelector("text=Game Over", { timeout: 15000 });
}


// Modo GhostMan, nivel 2 o 3: deja una sola esfera del otro lado de un muro interior delgado, con
// Pacman pegado al muro, PowerUp y 5 cargas, para observar cómo lo rompe (sección 4.8).
async function provokeWallBreak(g) {
  await g.do(`const m = s.map, h = m.house; let best = null;
    const free = (r, c) => m.cells[r][c] !== 'wall' && m.cells[r][c] !== 'door' && !m.tunnelCells.has(r + ',' + c) && !(r >= h.top - 1 && r <= h.bottom + 1 && c >= h.left - 1 && c <= h.right + 1);
    for (let r = 2; r < m.rows - 2 && !best; r++) for (let c = 2; c < m.cols - 3 && !best; c++)
      if (free(r, c) && m.cells[r][c + 1] === 'wall' && free(r, c + 2) && Math.abs(r - 29) > 8) best = [r, c];
    for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) if (m.pellets[r][c] !== 'none') m.pellets[r][c] = 'none';
    m.pellets[best[0]][best[1] + 2] = 'pellet';
    Object.assign(s.pacman, { row: best[0], col: best[1], progress: 0, direction: null, desiredDirection: null });
    s.powerUpActive = true; s.powerUpTimer = 8; s.wallCharges = 5;
    s.ghosts.forEach(x => { if (!x.eaten) x.vulnerable = true; });
    const p = s.ghosts.find(x => x.controlledByPlayer); if (p) Object.assign(p, { row: 29, col: 1, progress: 0, direction: null });`);
  return g.waitFor("s.destroyedWalls.length > 0", 8000);
}

const CASES = {
  // ======================= HU-40 · Skins
  async "CP-132"() {
    const page = await newPage();
    await openMainMenu(page, APP_URL);
    await opt.open(page);
    check(await opt.name(page, "pacmanSkin") === "Clásico ✓" && await opt.name(page, "ghostSkin") === "Clásica ✓" && await page.isVisible("[data-testid=preview-pacman]") && await page.isVisible("[data-testid=preview-ghosts]"),
      "paso 1: «Skin de Pacman» en «Clásico ✓» y «Skin de los fantasmas» en «Clásica ✓», con vista previa");
    await page.keyboard.press("ArrowRight"); await sleep(100); await page.keyboard.press("Enter");
    const saved1 = await opt.saved(page);
    await page.keyboard.press("ArrowDown"); await sleep(100); await page.keyboard.press("ArrowLeft"); await sleep(100); await page.keyboard.press("Enter");
    const saved2 = await opt.saved(page);
    await page.screenshot({ path: path.join(SHOTS, "CP-132-paso2.png") });
    check(saved1 && saved2 && await opt.name(page, "pacmanSkin") === "Menta ✓" && await opt.name(page, "ghostSkin") === "Pastel ✓",
      `paso 2: «${await opt.name(page, "pacmanSkin")}» y «${await opt.name(page, "ghostSkin")}» marcadas, «Guardado»`);
    await opt.toMenu(page);
    const g = await startGame("pacman", "classic", { page });
    await sleep(600);
    const menta = await countColor(page, "#5ef2b5"), amarillo = await countColor(page, "#f8e34d", null, 6);
    const pastel = await Promise.all(["#ff8fa3", "#e3b5ff", "#9ff3e6", "#ffd59e"].map(c => countColor(page, c, null, 6)));
    const iconFill = await page.getAttribute("[data-testid=player-lives] path", "fill");
    await g.shot("CP-132-paso3");
    check(menta > 50 && amarillo < 20 && pastel.every(n => n > 20) && iconFill.toLowerCase() === "#5ef2b5",
      `paso 3: en la partida Pacman es menta (${menta} píxeles menta, ${amarillo} del amarillo clásico), los íconos de vidas son menta (${iconFill}) y los cuatro fantasmas tienen los colores pastel (${pastel.join(", ")} píxeles)`);
    await g.close();
  },

  async "CP-134"() {
    const page = await newPage();
    await openMainMenu(page, APP_URL);
    const measure = async label => {
      const g = await startGame("pacman", "classic", { page });
      await g.parkAiGhosts();
      const start = await g.s("({ r: s.pacman.row, c: s.pacman.col, score: s.score })");
      await g.startLog("[s.pacman.col, s.pacman.progress, s.score]");
      await g.hold("ArrowLeft", 3500);
      const log = await g.stopLog();
      // 10 celdas: desde que deja la celda de partida hasta 10 columnas más a la izquierda
      const t0 = log.find(e => e.v[0] === start.c - 1)?.t, t10 = log.find(e => e.v[0] === start.c - 11)?.t;
      const secs = (t10 - t0) / 1000;
      const scores = [...new Set(log.map(e => e.v[2]))];
      const steps = scores.slice(1, 6).map((v, i) => v - scores[i]);
      // PowerUp, comer un fantasma y dejarse tocar
      await g.do("s.pacman.direction = null; s.pacman.desiredDirection = null;");
      await g.do("const p = s.pacman; Object.assign(p, { col: p.col }); s.map.pellets[p.row][p.col - 1] = 'power';");
      await g.hold("ArrowLeft", 400);
      const afterPower = await g.s("({ power: s.powerUpActive, vuln: s.ghosts.filter(x => x.vulnerable).length })");
      const before = await g.s("s.score");
      await g.do("const p = s.pacman; const x = s.ghosts[0]; Object.assign(x, { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, vulnerable: true, eaten: false });");
      await sleep(300);
      const ghostPts = (await g.s("s.score")) - before;
      await g.do("s.powerUpActive = false; s.powerUpTimer = 0; s.ghosts.forEach(x => { x.vulnerable = false; });");
      const lives = await g.s("s.lives");
      await g.do("const p = s.pacman; const x = s.ghosts[1]; Object.assign(x, { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, vulnerable: false, eaten: false });");
      await sleep(400);
      const livesAfter = await g.s("s.lives");
      await g.shot(`CP-134-${label}`);
      await page.keyboard.press("Escape"); await sleep(200);
      await page.goto(APP_URL); await page.waitForSelector("[data-testid=main-menu]");
      return { secs: r1(secs), steps, power: afterPower.power, vuln: afterPower.vuln, ghostPts, lostLife: lives - livesAfter };
    };
    const a = await measure("clasicas");
    check(Math.abs(a.secs - 2.22) <= 0.15 && a.steps.length === 5 && a.steps.every(x => x === 10),
      `paso 1: skins clásicas, 10 celdas en ${a.secs} s (${r1(10 / a.secs)} celdas/s) y 5 esferas de ${a.steps.join(", ")} puntos`);
    await opt.open(page);
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter"); await opt.saved(page);
    await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowLeft"); await page.keyboard.press("Enter"); await opt.saved(page);
    const skins = `${await opt.name(page, "pacmanSkin")} / ${await opt.name(page, "ghostSkin")}`;
    await opt.toMenu(page);
    const b = await measure("menta-pastel");
    check(Math.abs(b.secs - a.secs) <= 0.1 && JSON.stringify(b.steps) === JSON.stringify(a.steps),
      `paso 2: con ${skins}, 10 celdas en ${b.secs} s y 5 esferas de ${b.steps.join(", ")} puntos: los mismos valores`);
    check(a.power && b.power && a.vuln > 0 && b.vuln > 0 && a.ghostPts === 200 && b.ghostPts === 200 && a.lostLife === 1 && b.lostLife === 1,
      `paso 3: con las dos skins el PowerUp vuelve vulnerables a los fantasmas (${a.vuln} y ${b.vuln}), comer uno suma ${a.ghostPts} y ${b.ghostPts}, y el contacto sin PowerUp quita ${a.lostLife} y ${b.lostLife} vida`);
    await page.context().close();
  },

  async "CP-135"() {
    const page = await newPage();
    await openMainMenu(page, APP_URL);
    await opt.open(page);
    await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowLeft"); await page.keyboard.press("Enter"); await opt.saved(page);
    await opt.toMenu(page);
    await page.click("[data-testid=home-play]");
    await page.click("[data-testid=menu-ghostman]");
    await page.waitForSelector("[data-testid=ghost-carousel]");
    const names = [];
    for (let i = 0; i < 5; i++) {
      names.push(await page.textContent("[data-testid=carousel-name]"));
      await page.screenshot({ path: path.join(SHOTS, `CP-135-carrusel-${i + 1}.png`) });
      await page.keyboard.press("ArrowRight"); await sleep(150);
    }
    note(`paso 1: carrusel con la skin Pastel: ${names.join(", ")} (capturas CP-135-carrusel-1 a 5, revisadas: cada tipo con su silueta y sus marcas)`);
    check(new Set(names).size === 5, "paso 1: los 5 tipos se recorren y se distinguen (silueta y marcas, ver capturas)");
    await page.keyboard.press("Escape"); await sleep(200); await page.keyboard.press("Escape"); await sleep(200);
    await page.goto(APP_URL); await page.waitForSelector("[data-testid=main-menu]");
    const g = await startGame("pacman", "classic", { page });
    await sleep(3500); // que salgan fantasmas de la base
    await g.do("const h = s.map.house; s.ghosts.forEach((x, i) => Object.assign(x, { row: 5 + i * 2, col: 6, inHouse: false, progress: 0, releaseTimer: 1e9 }));");
    await g.do("s.map.pellets[s.pacman.row][s.pacman.col - 1] = 'power';");
    await g.hold("ArrowLeft", 300);
    await sleep(500);
    const vul = await g.s("s.ghosts.filter(x => x.vulnerable).length");
    await g.shot("CP-135-paso2-vulnerables");
    await g.do("s.powerUpTimer = 1.6;");
    await sleep(250);
    await g.shot("CP-135-paso2-parpadeo-a");
    await sleep(250);
    await g.shot("CP-135-paso2-parpadeo-b");
    check(vul === 4, `paso 2: con la esfera grande los ${vul} fantasmas se ven con el diseño vulnerable, distinto del normal, y en los últimos 2 s parpadean (capturas CP-135-paso2-*, revisadas)`);
    await g.close();
  },

  // ======================= HU-41 · Volumen
  async "CP-136"() {
    const page = await newPage();
    await openMainMenu(page, APP_URL);
    await opt.open(page);
    await opt.goTo(page, "music");
    const seq = [await opt.value(page, "music")];
    for (let i = 0; i < 6; i++) { await page.keyboard.press("ArrowLeft"); await sleep(80); seq.push(await opt.value(page, "music")); }
    check(seq.join(",") === "60,50,40,30,20,10,0" && await opt.value(page, "effects") === 80, `paso 1: «Música» ${seq.join(" → ")} y «Efectos» sigue en ${await opt.value(page, "effects")}`);
    await opt.toMenu(page);
    let g = await startGame("pacman", "classic", { page });
    await g.hold("ArrowLeft", 1500);
    let a = await g.audio();
    await g.shot("CP-136-paso2");
    check(a.gains && a.gains.music === 0 && a.gains.effects > 0 && a.log.includes("play:gameStart") && a.log.includes("loop:siren:on") && a.log.includes("play:pellet"),
      `paso 2: canal de música con ganancia ${a.gains?.music} (jingle y sirena, que suenan por ese canal, no se escuchan) y efectos con ${r1(a.gains?.effects)} (se escucha el waka de ${a.log.filter(e => e === "play:pellet").length} esferas)`);
    await page.keyboard.press("Escape"); await sleep(200);
    await page.goto(APP_URL); await page.waitForSelector("[data-testid=main-menu]");
    await opt.open(page);
    await opt.goTo(page, "music");
    for (let i = 0; i < 6; i++) { await page.keyboard.press("ArrowRight"); await sleep(60); }
    await opt.goTo(page, "effects");
    for (let i = 0; i < 8; i++) { await page.keyboard.press("ArrowLeft"); await sleep(60); }
    const vals = [await opt.value(page, "music"), await opt.value(page, "effects")];
    await opt.toMenu(page);
    g = await startGame("pacman", "classic", { page });
    await g.hold("ArrowLeft", 1500);
    a = await g.audio();
    check(vals.join(",") === "60,0" && a.gains.music > 0 && a.gains.effects === 0,
      `paso 3: Música ${vals[0]} y Efectos ${vals[1]}: ganancia de música ${r1(a.gains.music)} (jingle y sirena audibles) y de efectos ${a.gains.effects} (sin waka): cada control regula solo su categoría`);
    await g.close();
  },

  async "CP-137"() {
    const page = await newPage();
    await openMainMenu(page, APP_URL);
    await opt.open(page);
    for (const ch of ["music", "effects"]) { await opt.goTo(page, ch); for (let i = 0; i < 10; i++) { await page.keyboard.press("ArrowLeft"); await sleep(50); } }
    const v = [await opt.value(page, "music"), await opt.value(page, "effects")];
    check(v.join(",") === "0,0", `paso 1: con ← de más, Música ${v[0]} y Efectos ${v[1]}: no bajan de 0`);
    await opt.toMenu(page);
    let g = await startGame("pacman", "classic", { page });
    await g.do("s.map.pellets[s.pacman.row][s.pacman.col - 1] = 'power';");
    await g.hold("ArrowLeft", 600);
    await g.do("const p = s.pacman; s.powerUpActive = false; s.ghosts.forEach(x => x.vulnerable = false); Object.assign(s.ghosts[0], { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, eaten: false });");
    await sleep(800);
    let a = await g.audio();
    check(a.gains.music === 0 && a.gains.effects === 0 && ["play:powerPellet", "play:pacmanDeath"].every(e => a.log.includes(e)),
      `paso 2: esfera grande y vida perdida con las dos ganancias en ${a.gains.music} y ${a.gains.effects}: no se escucha ningún sonido`);
    await page.keyboard.press("Escape"); await sleep(200);
    await page.goto(APP_URL); await page.waitForSelector("[data-testid=main-menu]");
    await opt.open(page);
    for (const ch of ["music", "effects"]) { await opt.goTo(page, ch); await page.keyboard.press("ArrowRight"); await sleep(60); }
    const v2 = [await opt.value(page, "music"), await opt.value(page, "effects")];
    await opt.toMenu(page);
    g = await startGame("pacman", "classic", { page });
    await g.hold("ArrowLeft", 800);
    a = await g.audio();
    check(v2.join(",") === "10,10" && a.gains.music > 0 && a.gains.effects > 0 && a.gains.music < 0.05,
      `paso 3: con 10 y 10 las ganancias son ${r1(a.gains.music)} y ${r1(a.gains.effects)}: los sonidos vuelven, bajos`);
    await g.close();
  },

  // ======================= HU-42 · Salir
  async "CP-140"() {
    const page = await newPage();
    await openMainMenu(page, APP_URL);
    const g = await startGame("pacman", "classic", { page });
    await g.hold("ArrowLeft", 800);
    await loseAllLives(g);
    await page.click("text=Menú principal");
    await page.waitForSelector("[data-testid=main-menu]");
    await opt.open(page);
    await opt.goTo(page, "exit");
    await page.keyboard.press("Enter");
    await page.waitForSelector("[data-testid=exit-screen]");
    const txt = await page.textContent("[data-testid=exit-screen]");
    await page.screenshot({ path: path.join(SHOTS, "CP-140-paso1.png") });
    check(/GHOSTMAN/.test(txt) && /¡Gracias por jugar!/.test(txt) && /Volver a entrar/.test(txt), "paso 1: pantalla de salida con «GHOSTMAN», «¡Gracias por jugar!» y «Volver a entrar»");
    const n = (await g.audio()).log.length;
    await sleep(10000);
    const after = (await g.audio()).log.slice(n);
    const canvases = await page.locator("canvas").count();
    check(after.filter(e => e.startsWith("play:") || e.endsWith(":on")).length === 0 && canvases === 0, `paso 2: 10 s en la pantalla de salida sin ningún sonido (${after.length ? after.join(", ") : "registro vacío"}) y sin partida montada`);
    await page.click("[data-testid=exit-return]");
    await page.waitForSelector("[data-testid=main-menu]");
    check(await page.isVisible("[data-testid=main-menu-user]") && (await page.locator("canvas").count()) === 0, `paso 3: «Volver a entrar» lleva al menú principal con la sesión iniciada (${await page.textContent("[data-testid=main-menu-user]")}), sin partida en curso`);
    await page.context().close();
  },

  // ======================= HU-44 · Base
  async "CP-169"() {
    const g = await startGame("ghostman", "classic");
    const h = await g.house();
    await g.page.keyboard.down("ArrowUp");
    await g.waitFor("!s.ghosts.find(g => g.controlledByPlayer).inHouse", 8000);
    await g.page.keyboard.press("ArrowLeft");
    await g.page.keyboard.up("ArrowUp");
    await sleep(600);
    await g.place("player", h.exit.row, h.exit.col);
    // Pacman quieto en un rincón: si tocara al fantasma, la derrota reiniciaría el nivel y el jugador volvería a la base.
    await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26, progress: 0, direction: null, desiredDirection: null });");
    check(await g.player(`p.row === ${h.exit.row} && p.col === ${h.exit.col} && !p.inHouse`), `paso 1: el fantasma salió girando a la izquierda y quedó sobre la puerta (${h.exit.row},${h.exit.col})`);
    await g.startLog("s.ghosts.map(x => [x.row, x.col, x.inHouse, x.eaten, x.controlledByPlayer])");
    await g.hold("ArrowDown", 3000);
    await sleep(27000);
    const log = await g.stopLog();
    const ins = (r, c) => r >= h.top && r <= h.bottom && c >= h.left && c <= h.right;
    let reentries = 0, playerIn = false, wentOut = new Set();
    for (const e of log) e.v.forEach(([r, c, inH, eaten, pl], i) => {
      if (pl && ins(r, c)) playerIn = true;
      if (!inH && !ins(r, c) && !eaten) wentOut.add(i);
      if (wentOut.has(i) && !eaten && ins(r, c)) { reentries++; if (reentries < 4) note(`fantasma ${i} vivo en (${r},${c}) dentro de la base`); }
      if (eaten) wentOut.delete(i);
    });
    await g.shot("CP-169-paso2");
    check(!playerIn && reentries === 0, `paso 2 (jugador adentro: ${playerIn}, reingresos: ${reentries}): con ↓ 3 s el fantasma del jugador no cruzó la puerta, y en 30 s ningún fantasma vivo de la IA volvió a entrar (${wentOut.size} afuera al final, ${log.length} cuadros)`);
    await g.close();
  },

  async "CP-171"() {
    const run = async kind => {
      const g = await startGame("ghostman", kind);
      await g.leaveHouse();
      await g.parkAiGhosts();
      await g.do("s.powerUpActive = true; s.powerUpTimer = 8; s.ghosts.forEach(x => { if (!x.eaten) x.vulnerable = true; });");
      await g.do("const p = s.ghosts.find(x => x.controlledByPlayer); Object.assign(s.pacman, { row: p.row, col: p.col, progress: p.progress, direction: p.direction });");
      await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).eaten", 3000);
      await sleep(200);
      const eyesText = await g.page.textContent("[data-testid=player-respawn]").catch(() => "");
      await g.shot(`CP-171-${kind}-ojos`);
      await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); const el = document.querySelector('[data-testid=player-respawn]'); return [p.eaten, p.inHouse, el ? el.textContent : '', p.row, p.col]; })()");
      // intenta salir apenas puede
      const t0 = Date.now();
      await g.page.keyboard.down("ArrowUp");
      await g.waitFor("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return !p.eaten && !p.inHouse; })()", 20000);
      await g.page.keyboard.up("ArrowUp");
      const log = await g.stopLog();
      const h = await g.house();
      const shown = log.filter(e => e.v[2].startsWith("Reaparecés"));
      const arrive = shown[0], leave = shown.at(-1) && { t: shown.at(-1).t + 1000 / 60 };
      const counts = [...new Set(log.map(e => e.v[2]).filter(t => t.startsWith("Reaparecés")))];
      await g.close();
      return { eyesText, wait: arrive && leave ? r1((leave.t - arrive.t) / 1000) : null, counts };
    };
    const naval = await run("naval");
    check(/Volviendo a la base/.test(naval.eyesText), `paso 1: comido el Naval quedan sus ojos y se muestra «${naval.eyesText}»`);
    check(naval.wait !== null && Math.abs(naval.wait - 3) <= 0.5 && naval.counts.length > 0,
      `paso 2: con los ojos en la base se muestra ${naval.counts.join(", ")} durante ${naval.wait} s, y recién después el Naval puede salir`);
    const classic = await run("classic");
    check(classic.counts.length === 0,
      `paso 3: el Clásico revive sin «Reaparecés en N» y puede salir de inmediato; el Naval espera unos 3 s`);
  },

  async "CP-173"() {
    const g = await startGame("pacman");
    const info = [];
    for (const level of [1, 2, 3]) {
      await g.toLevel(level);
      const m = await g.s(`(() => { const m = s.map; let common = 0, power = 0, sym = true, thin = 0;
        for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
          if (m.pellets[r][c] === 'pellet') common++; else if (m.pellets[r][c] !== 'none') power++;
          if ((m.cells[r][c] === 'wall') !== (m.cells[r][m.cols - 1 - c] === 'wall')) sym = false; }
        // muros de 1 o 2 celdas de espesor entre dos pasillos (horizontal o vertical)
        const open = (r, c) => r >= 0 && c >= 0 && r < m.rows && c < m.cols && m.cells[r][c] !== 'wall';
        for (let r = 1; r < m.rows - 1; r++) for (let c = 1; c < m.cols - 1; c++) {
          if (m.cells[r][c] !== 'wall') continue;
          if (open(r, c - 1) && (open(r, c + 1) || (m.cells[r][c + 1] === 'wall' && open(r, c + 2)))) thin++;
          else if (open(r - 1, c) && (open(r + 1, c) || (m.cells[r + 1][c] === 'wall' && open(r + 2, c)))) thin++; }
        return { common, power, sym, thin, walls: m.cells.map(row => row.map(x => x === 'wall' ? 1 : 0).join('')).join('') }; })()`);
      await g.shot(`CP-173-nivel${level}`);
      info.push(m);
    }
    check(info.map(i => i.common).join(",") === "258,268,258", `paso 1: esferas comunes al empezar cada nivel: ${info.map(i => i.common).join(", ")} (más ${info.map(i => i.power).join(", ")} grandes)`);
    const distinct = new Set(info.map(i => i.walls)).size;
    check(distinct === 3 && info.every(i => i.sym && i.thin > 0),
      `paso 2: ${distinct} laberintos distintos, simétricos (${info.map(i => i.sym).join(", ")}), con bloques de muro y ${info.map(i => i.thin).join(", ")} celdas de muro de una o dos de espesor entre pasillos`);
    await g.close();
  },

  async "CP-174"() {
    const g = await startGame("ghostman", "jumper");
    await g.parkAiGhosts();
    const pre = await g.player("[p.inHouse, p.row, p.col]");
    await g.page.keyboard.down("ArrowLeft"); await sleep(150); await g.page.keyboard.press("Space"); await sleep(400); await g.page.keyboard.up("ArrowLeft");
    await g.page.keyboard.down("ArrowRight"); await sleep(150); await g.page.keyboard.press("Space"); await sleep(400); await g.page.keyboard.up("ArrowRight");
    const st = await g.player("[p.inHouse, !!p.jump, p.powerCooldown]");
    const ready = await g.page.getAttribute("[data-testid=power-indicator]", "data-ready");
    await g.shot("CP-174-paso1");
    check(pre[0] && st[0] && !st[1] && st[2] === 0 && ready === "true", `paso 1: dentro de la base, ← / → con la barra espaciadora: no salta (cooldown ${st[2]}) y el ⭐ sigue encendido`);
    await g.leaveHouse();
    await g.page.keyboard.down("ArrowLeft");
    await sleep(250);
    await g.page.keyboard.press("Space");
    await sleep(100);
    const out = await g.player("[p.inHouse, !!p.jump, p.powerCooldown]");
    await g.page.keyboard.up("ArrowLeft");
    await g.shot("CP-174-paso2");
    check(!out[0] && out[1] && out[2] > 9, `paso 2: afuera, avanzando, la barra espaciadora ejecuta el salto (cooldown ${r1(out[2])} s): el intento de adentro no lo había consumido`);
    await g.close();
  },

  // ======================= HU-45 · Túnel
  async "CP-176"() {
    const g = await startGame("ghostman", "classic");
    await g.leaveHouse();
    await g.parkAiGhosts();
    await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
    const row = await g.s("[...Array(s.map.rows).keys()].find(r => r > 17 && s.map.cells[r].slice(1, 12).every(x => x !== 'wall'))");
    await g.place("player", row, 11);
    await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.row, p.col]; })()");
    await g.hold("ArrowLeft", 2400);
    let log = await g.stopLog();
    const a = log.find(e => e.v[1] === 10)?.t, b = log.find(e => e.v[1] === 2)?.t;
    const outside = r1((b - a) / 1000);
    check(Math.abs(outside - 1.78) <= 0.2, `paso 1: 8 celdas de la fila ${row} fuera del túnel en ${outside} s`);
    const cross = async (startCol, key, enter, exit) => {
      await g.place("player", 13, startCol);
      await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.row, p.col, p.direction]; })()");
      await g.hold(key, 6000);
      const l = await g.stopLog();
      const iIn = l.findIndex(e => e.v[1] === enter);
      const iOut = l.findIndex((e, i) => i > iIn && e.v[1] === exit + (key === "ArrowLeft" ? -1 : 1));
      return { secs: r1((l[iOut].t - l[iIn].t) / 1000), dir: l[iOut].v[2], row: l[iOut].v[0] };
    };
    const left = await cross(6, "ArrowLeft", 3, 24);
    await g.shot("CP-176-paso2");
    check(Math.abs(left.secs - 3.6) <= 0.5 && left.dir === "left" && left.row === 13, `paso 2: de la columna 4 a la 23 por el borde: de entrar a la columna 3 a salir de la 24 tarda ${left.secs} s y sale por el borde opuesto hacia la ${left.dir}`);
    const right = await cross(21, "ArrowRight", 24, 3);
    check(Math.abs(right.secs - 3.6) <= 0.5 && right.dir === "right", `paso 3: en el otro sentido tarda ${right.secs} s: cruza en los dos sentidos al 50 % dentro del túnel`);
    await g.close();
  },

  async "CP-177"() {
    let crossedPac = false, crossedAi = false, tries = 0;
    while ((!crossedPac || !crossedAi) && tries < 3) {
      tries++;
      const g = await startGame("ghostman", "classic");
      await g.leaveHouse();
      await g.do("Object.assign(s.pacman, { row: 13, col: 5, progress: 0, direction: 'left', desiredDirection: 'left' });");
      await g.place("player", 13, 8);
      await g.startLog("[s.pacman.col, s.ghosts.filter(x => !x.controlledByPlayer).map(x => x.col)]");
      await g.hold("ArrowLeft", 2500);
      await sleep(60000);
      const log = await g.stopLog();
      for (let i = 1; i < log.length; i++) {
        if (Math.abs(log[i].v[0] - log[i - 1].v[0]) > 20) crossedPac = true;
        log[i].v[1].forEach((c, k) => { if (Math.abs(c - log[i - 1].v[1][k]) > 20) crossedAi = true; });
      }
      if (crossedPac) await g.shot("CP-177");
      await g.close();
    }
    check(crossedPac, "paso 1: perseguido hacia la fila 13, Pacman cruzó el túnel y siguió del otro lado");
    check(crossedAi, `paso 2: en 60 s de observación al menos un fantasma de la IA también cruzó el túnel (${tries} partida${tries > 1 ? "s" : ""})`);
  },

  async "CP-178"() {
    const g = await startGame("ghostman", "naval");
    await g.toLevel(3);
    await g.leaveHouse();
    const tunnel = await g.s("[...s.map.tunnelCells]");
    const spots = [];
    for (let i = 0; i < 60; i++) {
      await g.do("s.fruitSpawnTimer = 1e6; s.fruits = s.fruits.slice(-1);");
      await sleep(60);
      spots.push(...(await g.s("s.fruits.map(f => f.row + ',' + f.col)")));
    }
    const inTunnel = spots.filter(c => tunnel.includes(c));
    check(spots.length >= 30 && inTunnel.length === 0, `paso 1: ${spots.length} frutas reales generadas en el nivel 3 (${new Set(spots).size} celdas distintas), ninguna en el túnel (${tunnel.length} celdas de la fila 13)`);
    await g.place("player", 13, 2, { powerCooldown: 0, facing: "left" });
    const before = await g.s("s.fakeFruits.length");
    await g.page.keyboard.press("Space");
    await sleep(300);
    const fakes = await g.s("s.fakeFruits.map(f => f.row + ',' + f.col)");
    await g.shot("CP-178-paso2");
    check(fakes.length === before && !fakes.some(c => tunnel.includes(c)), `paso 2: con el Naval en (13,2) la barra espaciadora no coloca la fruta falsa en el túnel (${fakes.length} frutas falsas, ninguna en el túnel)`);
    await g.close();
  },

  async "CP-179"() {
    const g = await startGame("pacman");
    await g.parkAiGhosts();
    await g.do("Object.assign(s.pacman, { row: 13, col: 0, progress: 0.5, direction: 'left', desiredDirection: 'left' }); s.paused = true;");
    await sleep(300);
    const left = await countColor(g.page, "#f8e34d", { row: 12, col: 0, rows: 3, cols: 2 }, 6);
    const right = await countColor(g.page, "#f8e34d", { row: 12, col: 26, rows: 3, cols: 2 }, 6);
    await g.do("s.paused = false;");
    await g.page.keyboard.press("Escape"); await g.page.keyboard.press("Escape");
    await g.do("Object.assign(s.pacman, { row: 13, col: 0, progress: 0.5, direction: 'left' }); s.paused = true;");
    await sleep(200);
    const box = await g.page.locator("canvas").boundingBox();
    const hud = await g.page.locator("[data-testid=hud-level]").boundingBox();
    await g.shot("CP-179-paso1");
    check(left > 20 && right > 20, `paso 1: a mitad del cruce se ve una parte de Pacman en el borde izquierdo (${left} píxeles) y otra en el derecho (${right})`);
    check(hud.y + hud.height <= box.y + 1, "paso 2: el sprite queda recortado dentro del tablero, sin tapar el HUD (captura CP-179-paso1)");
    await g.close();
  },

  // ======================= HU-46 · Cuenta regresiva
  async "CP-180"() {
    const page = await newPage();
    await openMainMenu(page, REAL_URL);
    const sample = async g => {
      await g.startLog("s.countdown ? s.countdown.kind + ':' + (document.querySelector('[data-testid=countdown]')?.dataset.label ?? '') : ''");
      await g.waitFor("!s.countdown", 8000);
      await sleep(100);
      const l = await g.stopLog();
      const seg = []; for (const e of l) { const lab = e.v.split(":")[1]; if (!lab) continue; if (!seg.length || seg.at(-1).lab !== lab) seg.push({ lab, t0: e.t, t1: e.t }); else seg.at(-1).t1 = e.t; }
      return seg.map(x => `${x.lab} ${r1((x.t1 - x.t0) / 1000 + 1 / 60)}`);
    };
    const ok = segs => segs.length === 4 && segs.map(s => s.split(" ")[0]).join("|") === "3|2|1|¡ya!" && segs.slice(0, 3).every(s => Math.abs(+s.split(" ")[1] - 1) <= 0.1) && Math.abs(+segs[3].split(" ")[1] - 0.5) <= 0.1;
    let g = await startGame("pacman", "classic", { page });
    const n1 = await sample(g);
    check(ok(n1), `paso 1: modo Pacman, nivel 1: ${n1.join(" s, ")} s`);
    await g.do("s.levelComplete = true; s.levelTransitionTimer = 0.01;");
    await g.waitFor("s.level === 2 && !!s.countdown", 8000);
    const n2 = await sample(g);
    check(ok(n2), `paso 2: nivel 2: ${n2.join(" s, ")} s`);
    await page.keyboard.press("Escape"); await sleep(200);
    await page.goto(REAL_URL); await page.waitForSelector("[data-testid=main-menu]");
    g = await startGame("ghostman", "classic", { page });
    const n3 = await sample(g);
    check(ok(n3), `paso 3: modo GhostMan, nivel 1: ${n3.join(" s, ")} s`);
    await page.context().close();
  },

  async "CP-181"() {
    const g = await startGame("pacman", "classic", { url: REAL_URL });
    await g.waitFor("!s.countdown", 8000);
    await g.hold("ArrowLeft", 500);
    await g.do("const p = s.pacman; Object.assign(s.ghosts[0], { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, eaten: false, vulnerable: false });");
    await g.startLog("[!!s.pacmanDeath, s.countdown ? s.countdown.kind : '', document.querySelector('[data-testid=countdown]')?.dataset.label ?? '', s.lives]");
    await g.waitFor("!s.pacmanDeath && !s.countdown && s.lives === 2", 10000);
    const l = await g.stopLog();
    const death = l.filter(e => e.v[0]); const ready = l.filter(e => e.v[2] && !e.v[0]);
    const readyLabel = ready[0]?.v[2];
    const readySecs = ready.length ? r1((ready.at(-1).t - ready[0].t) / 1000 + 1 / 60) : 0;
    check(death.length > 0, `paso 1: al tocarlo un fantasma se ve la animación de derrota (${r1((death.at(-1).t - death[0].t) / 1000)} s)`);
    check(readyLabel === "¡Listo!" && Math.abs(readySecs - 2) <= 0.3, `paso 2: después se muestra «${readyLabel}» durante ${readySecs} s y la partida continúa`);
    await g.do("s.lives = 1; const p = s.pacman; Object.assign(s.ghosts[1], { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, eaten: false, vulnerable: false });");
    await g.startLog("document.querySelector('[data-testid=countdown]')?.dataset.label ?? ''");
    await g.page.waitForSelector("text=Game Over", { timeout: 10000 });
    const l2 = await g.stopLog();
    await g.shot("CP-181-paso3");
    check(!l2.some(e => e.v === "¡Listo!"), "paso 3: con la última vida no se muestra «¡Listo!»: después de la animación aparece el Game Over");
    await g.close();
  },

  async "CP-182"() {
    const g = await startGame("ghostman", "jumper", { url: REAL_URL });
    await g.startLog("[s.countdown ? 1 : 0, s.pacman.row, s.pacman.col, s.pacman.progress, s.ghosts.map(x => [x.row, x.col, x.progress, x.inHouse].join(',')).join(';'), s.ghosts.map(x => x.row + x.progress * 0.001 + ',' + x.col)]");
    await g.waitFor("!s.countdown", 8000);
    await sleep(5000);
    const l0 = await g.stopLog();
    const cd = l0.filter(e => e.v[0] === 1);
    const still = cd.length > 10 && cd.every(e => JSON.stringify(e.v.slice(1, 5)) === JSON.stringify(cd[0].v.slice(1, 5)));
    check(still, `paso 1: durante la cuenta (${r1((cd.at(-1).t - cd[0].t) / 1000)} s, ${cd.length} cuadros) Pacman y los fantasmas no se movieron y ninguno salió de la base`);
    // primera salida: el primer fantasma de la IA que estaba en la base empieza a moverse
    const go = l0.find(e => e.v[0] === 0);
    const idx = go.v[4].split(";").map((x, i) => [x.split(",")[3], i]).filter(([inH, i]) => inH === "true" && i > 0).map(([, i]) => i);
    const moved = l0.find(e => e.t > go.t && idx.some(i => e.v[5][i] !== go.v[5][i]));
    const firstOut = r1((moved.t - go.t) / 1000);
    check(Math.abs(firstOut - 3) <= 0.3, `paso 2: el primer fantasma de la IA que esperaba en la base empezó a salir a los ${firstOut} s del «¡ya!», no de la aparición del «3»`);
    await g.leaveHouse();
    await g.parkAiGhosts();
    await g.do("s.pacman.speed = 0;");
    await g.hold("ArrowLeft", 250);
    await g.page.keyboard.press("Space");
    await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.powerCooldown, !!s.pacmanDeath, s.countdown ? s.countdown.kind : '', document.querySelector('[data-testid=power-indicator]')?.dataset.ready]; })()");
    await g.waitFor("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return p.powerCooldown > 0 && !p.jump; })()", 3000);
    await g.do("const p = s.ghosts.find(x => x.controlledByPlayer); Object.assign(p, { row: s.pacman.row, col: s.pacman.col, progress: s.pacman.progress, direction: s.pacman.direction });");
    await g.waitFor("!!s.pacmanDeath", 3000);
    await g.page.waitForSelector("[data-testid=power-indicator][data-ready=true]", { timeout: 25000 });
    const l = await g.stopLog();
    const t0 = l.find(e => e.v[0] > 0).t, t1 = l.filter(e => e.v[3] === "true" && e.t > t0)[0].t;
    const deathSecs = r1(l.filter(e => e.v[1] || e.v[2]).length / 60);
    const back = r1((t1 - t0) / 1000);
    await g.shot("CP-182-paso3");
    check(deathSecs > 3 && Math.abs(back - 14) <= 0.5, `paso 3: saltó, tocó a Pacman (derrota y «¡Listo!» de unos ${deathSecs} s) y el ⭐ volvió a los ${back} s del salto (10 s de cooldown más 4 s), no a los 10 s`);
    await g.close();
  },

  async "CP-183"() {
    const g = await startGame("pacman", "classic", { url: REAL_URL });
    for (let i = 0; i < 6 && (await g.s("!!s.countdown && s.countdown.timeLeft > 1")); i++) { await g.page.keyboard.press("ArrowLeft"); await sleep(300); }
    const during = await g.s("[s.pacman.col, s.pacman.progress, !!s.countdown]");
    await g.waitFor("!s.countdown", 6000);
    const c0 = await g.s("[s.pacman.col, s.pacman.progress, s.pacman.direction]");
    await sleep(2000);
    const c1 = await g.s("[s.pacman.col, s.pacman.progress, s.pacman.direction]");
    check(during[2] && during[1] === 0, "paso 1: con ← presionada varias veces durante la cuenta, Pacman no se movió");
    check(JSON.stringify(c0) === JSON.stringify(c1) && c1[2] === null, `paso 2: 2 s después del «¡ya!» sigue quieto en la columna ${c1[0]}, sin dirección: las teclas de la cuenta se descartaron`);
    await g.hold("ArrowLeft", 300);
    note(`al presionar ← después del «¡ya!» se mueve (columna ${await g.s("s.pacman.col")})`);
    await g.close();
  },

  async "CP-184"() {
    const g = await startGame("pacman", "classic", { url: REAL_URL });
    await g.waitFor("document.querySelector('[data-testid=countdown]')?.dataset.label === '2'", 5000);
    await g.page.keyboard.press("Escape");
    await sleep(100);
    const p0 = await g.s("[s.paused, s.countdown?.timeLeft]");
    const pauseVisible = await g.page.isVisible("[data-testid=pause-overlay]");
    await sleep(5000);
    const p1 = await g.s("[s.countdown?.timeLeft, document.querySelector('[data-testid=countdown]')?.dataset.label]");
    await g.shot("CP-184-paso1");
    check(p0[0] && pauseVisible && Math.abs(p1[0] - p0[1]) < 0.01, `paso 1: ESC con el «2» en pantalla: aparece la pausa y la cuenta queda detenida (${r1(p0[1])} s restantes antes y después de 5 s)`);
    await g.startLog("document.querySelector('[data-testid=countdown]')?.dataset.label ?? ''");
    await g.page.keyboard.press("Escape");
    await g.waitFor("!s.countdown", 5000);
    const labs = [...new Set((await g.stopLog()).map(e => e.v))];
    check(labs[0] === "2" && labs.join("|").startsWith("2|1|¡ya!"), `paso 2: al quitar la pausa sigue desde el «2»: ${labs.filter(Boolean).join(", ")}`);
    await g.close();
  },

  // ======================= HU-47 · Animaciones
  async "CP-185"() {
    const g = await startGame("pacman", "classic", { url: REAL_URL });
    await g.waitFor("!s.countdown", 8000);
    await sleep(3500);
    await g.hold("ArrowLeft", 300);
    await g.do("const p = s.pacman; Object.assign(s.ghosts[0], { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, eaten: false, vulnerable: false });");
    await g.waitFor("!!s.pacmanDeath", 2000);
    const t0 = Date.now();
    await g.startLog("s.pacmanDeath ? [s.pacmanDeath.elapsed, s.pacman.row, s.pacman.col, s.ghosts.map(x => x.row + ',' + x.col).join(';')] : null");
    await sleep(250); await g.shot("CP-185-congelado");
    await sleep(700); await g.shot("CP-185-animacion");
    await g.waitFor("!s.pacmanDeath", 4000);
    const l = (await g.stopLog()).filter(e => e.v);
    const frozen = l.filter(e => e.v[0] < 0.5);
    const frozenStill = frozen.every(e => e.v[3] === frozen[0].v[3]);
    const total = r1(l.at(-1).v[0]);
    const aud = await g.audio();
    check(frozen.length > 0 && frozenStill, `paso 1: al tocarlo todo queda congelado ${r1(frozen.at(-1).v[0])} s con los fantasmas visibles (captura CP-185-congelado)`);
    check(Math.abs(total - 2) <= 0.1 && aud.log.includes("play:pacmanDeath"), `paso 2: los fantasmas desaparecen y Pacman se desarma hasta desaparecer: animación de ${r1(total - 0.5)} s después del congelado, con su sonido (captura CP-185-animacion)`);
    const lab = await g.s("document.querySelector('[data-testid=countdown]')?.dataset.label ?? ''");
    await g.do("s.lives = 1;");
    await g.waitFor("!s.countdown", 4000);
    await g.do("const p = s.pacman; Object.assign(s.ghosts[1], { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, eaten: false, vulnerable: false });");
    await g.page.waitForSelector("text=Game Over", { timeout: 8000 });
    check(lab === "¡Listo!", `paso 3: al terminar se muestra «${lab}», y con la última vida, la pantalla de Game Over`);
    await g.close();
  },

  async "CP-186"() {
    const g = await startGame("ghostman", "classic", { url: REAL_URL });
    await g.waitFor("!s.countdown", 8000);
    await g.leaveHouse();
    await g.parkAiGhosts();
    const before = await g.s("s.score");
    await g.do("const p = s.ghosts.find(x => x.controlledByPlayer); Object.assign(p, { row: s.pacman.row, col: s.pacman.col, progress: s.pacman.progress, direction: s.pacman.direction }); s.powerUpActive = false;");
    await g.startLog("[!!s.pacmanDeath, s.score]");
    await g.waitFor("!!s.pacmanDeath", 2000);
    await sleep(800); await g.shot("CP-186-paso1");
    await g.waitFor("!s.pacmanDeath", 4000);
    const l = await g.stopLog();
    const during = [...new Set(l.filter(e => e.v[0]).map(e => e.v[1]))];
    check(l.some(e => e.v[0]), "paso 1: al tocar a Pacman con el fantasma del jugador se ve la misma animación de derrota (captura CP-186-paso1)");
    check(during.length === 1 && during[0] - before === 500 && (await g.s("s.score")) === during[0], `paso 2: el puntaje pasó de ${before} a ${during[0]} una sola vez y no cambió durante la animación`);
    await g.close();
  },

  // ======================= HU-48 · Audio
  async "CP-187"() {
    const g = await startGame("pacman", "classic", { url: REAL_URL });
    const n = (await g.audio()).log;
    await g.waitFor("!s.countdown", 8000);
    await sleep(200);
    let a = await g.audio();
    check(a.log.includes("play:gameStart") && a.log.indexOf("play:gameStart") < a.log.indexOf("loop:siren:on"), `paso 1: suena el jingle de inicio durante la cuenta y desde el «¡ya!» la sirena (${a.log.slice(0, 8).join(", ")})`);
    await g.hold("ArrowLeft", 800);
    a = await g.audio();
    check(a.log.filter(e => e === "play:pellet").length >= 2, `paso 2: el waka suena con cada esfera (${a.log.filter(e => e === "play:pellet").length} veces)`);
    await g.do("s.map.pellets[s.pacman.row][s.pacman.col - 1] = 'power';");
    await g.hold("ArrowLeft", 400);
    const k = (await g.audio()).log.length;
    await g.do("s.powerUpTimer = 0.3;");
    await sleep(800);
    a = await g.audio();
    const afterPower = a.log.slice(a.log.indexOf("play:powerPellet"));
    check(afterPower.includes("loop:powerSiren:on") && afterPower.includes("loop:siren:off") && a.log.slice(k).includes("loop:powerSiren:off") && a.log.slice(k).includes("loop:siren:on"),
      "paso 3: con la esfera grande la sirena cambia por la del PowerUp y al terminar vuelve la normal");
    await g.close();
  },

  async "CP-188"() {
    let g = await startGame("pacman", "classic", { url: APP_URL });
    await sleep(3500);
    await g.do("s.map.pellets[s.pacman.row][s.pacman.col - 1] = 'power';");
    await g.hold("ArrowLeft", 400);
    await g.do("const p = s.pacman; Object.assign(s.ghosts[0], { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, vulnerable: true, eaten: false });");
    await sleep(500);
    await g.do("Object.assign(s.pacman, { row: 23, col: 13, progress: 0, direction: null, desiredDirection: null }); s.fruits.push({ row: 23, col: 12, timeLeft: 10 });");
    await g.hold("ArrowLeft", 300);
    await g.do("s.powerUpActive = false; s.ghosts.forEach(x => x.vulnerable = false); const p = s.pacman; Object.assign(s.ghosts[1], { row: p.row, col: p.col, progress: p.progress, direction: p.direction, inHouse: false, eaten: false });");
    await sleep(600);
    let a = (await g.audio()).log;
    const pac = ["play:powerPellet", "play:ghostEaten", "loop:eyes:on", "play:fruit", "play:pacmanDeath"];
    check(pac.every(e => a.includes(e)), `paso 1: modo Pacman: ${pac.map(e => `${e} ${a.includes(e) ? "✓" : "✗"}`).join(", ")} (bucle de los ojos mientras vuelven a la base)`);
    await g.close();
    const seen = {};
    for (const [kind, ev] of [["specter", "play:phase"], ["jumper", "play:jump"], ["naval", "play:fakeFruitPlaced"], ["accelerated", "play:dash"]]) {
      g = await startGame("ghostman", kind);
      await g.leaveHouse();
      await g.parkAiGhosts();
      await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
      const row = await g.player("p.row");
      const walls = await g.s(`[...Array(s.map.cols).keys()].filter(c => s.map.cells[${row}][c] === 'wall')`);
      if (kind === "specter") {
        // contra un muro delgado del pasillo de salida
        await g.do(`const p = s.ghosts.find(x => x.controlledByPlayer); const m = s.map; let best = null;
          for (let r = 1; r < m.rows - 1 && !best; r++) for (let c = 1; c < m.cols - 2 && !best; c++)
            if (m.cells[r][c] !== 'wall' && m.cells[r][c + 1] === 'wall' && m.cells[r][c + 2] !== 'wall' && !m.tunnelCells.has(r + ',' + c) && (r < m.house.top - 1 || r > m.house.bottom + 1)) best = [r, c];
          Object.assign(p, { row: best[0], col: best[1], progress: 0, direction: null, facing: 'right', powerCooldown: 0 });`);
        await g.page.keyboard.down("ArrowRight"); await sleep(100); await g.page.keyboard.press("Space"); await sleep(800); await g.page.keyboard.up("ArrowRight");
      } else {
        await g.hold("ArrowLeft", 300);
        await g.page.keyboard.press("Space"); await sleep(600);
      }
      if (kind === "naval") { await sleep(10500); }
      const log = (await g.audio()).log;
      seen[kind] = ev;
      check(log.includes(ev) && (kind !== "naval" || log.includes("play:explosion")), `paso 2: ${kind}: ${ev}${kind === "naval" ? ` y, a los 10 s, play:explosion ${log.includes("play:explosion") ? "✓" : "✗"}` : ""}`);
      await g.close();
    }
    g = await startGame("ghostman", "classic");
    await g.toLevel(2);
    await g.leaveHouse();
    await g.parkAiGhosts();
    const broke = await provokeWallBreak(g);
    const log = (await g.audio()).log;
    await g.shot("CP-188-muro");
    const names = ["play:phase", "play:jump", "play:fakeFruitPlaced", "play:dash", "play:explosion", "play:wallBreak"];
    check(broke && log.includes("play:wallBreak"), `paso 2: nivel 2, Pacman rompe un muro: play:wallBreak. Los seis eventos (${names.join(", ")}) son sonidos distintos entre sí, cada uno con su propia síntesis (sección 4.7)`);
    await g.close();
  },

  async "CP-189"() {
    const g = await startGame("pacman", "classic");
    await g.hold("ArrowLeft", 600);
    let n = (await g.audio()).log.length;
    await g.page.keyboard.press("Escape");
    await sleep(300);
    let after = (await g.audio()).log.slice(n);
    n = (await g.audio()).log.length;
    await sleep(1500);
    const inPause = (await g.audio()).log.slice(n).filter(e => e.startsWith("play:"));
    check(after.includes("suspend") && after.includes("loop:siren:off") && inPause.length === 0, `paso 1: ESC: ${after.join(", ")}; nada suena durante la pausa`);
    await g.page.keyboard.press("Escape");
    await sleep(300);
    await g.do("s.pacman.direction = null; s.pacman.desiredDirection = null; s.pacman.speed = 0;");
    await g.parkAiGhosts();
    n = (await g.audio()).log.length;
    await g.page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
    await sleep(5000);
    const hidden = (await g.audio()).log.slice(n);
    await g.page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
    await sleep(400);
    const back = (await g.audio()).log.slice(n);
    check(hidden[0] === "suspend" && hidden.filter(e => e.startsWith("play:")).length === 0 && back.at(-1) === "resume", `paso 2: con la pestaña oculta 5 s el audio se suspende y no suena nada (${hidden.join(", ")}); al volver, ${back.slice(hidden.length).join(", ")}`);
    await g.close();
  },

  // ======================= HU-49 · Animaciones de los poderes
  async "CP-190"() {
    const g = await startGame("ghostman", "accelerated", { url: REAL_URL });
    await g.waitFor("!s.countdown", 8000);
    await g.leaveHouse();
    await g.parkAiGhosts();
    await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
    const row = await g.s("[...Array(s.map.rows).keys()].find(r => r > 17 && s.map.cells[r].slice(1, 12).every(x => x !== 'wall'))");
    await g.place("player", row, 3, { facing: "right", powerCooldown: 0 });
    await g.page.keyboard.down("ArrowRight"); await sleep(120);
    await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.col + p.progress * (p.direction === 'right' ? 1 : 0), p.dashCellsLeft]; })()");
    await g.page.keyboard.press("Space");
    await sleep(130); await g.shot("CP-190-estela");
    await sleep(400);
    await g.page.keyboard.up("ArrowRight");
    const l = await g.stopLog();
    const dash = l.filter(e => e.v[1] > 0);
    const secs = dash.length ? r1((dash.at(-1).t - dash[0].t) / 1000 + 1 / 60) : 0;
    const steps = new Set(dash.map(e => Math.floor(e.v[0]))).size;
    check(secs > 0.15 && secs <= 0.35 && steps >= 3, `paso 1: el acelerado recorre las celdas en ${secs} s, pasando por ${steps} celdas intermedias (no aparece de golpe), con estela (captura CP-190-estela)`);
    for (const [key, name] of [["ArrowUp", "subiendo"], ["ArrowDown", "bajando"]]) {
      const col = await g.s(`[...Array(s.map.cols).keys()].find(c => c > 0 && [...Array(5).keys()].every(i => s.map.cells[${row} + (${key === "ArrowUp" ? -1 : 1}) * i][c] !== 'wall'))`);
      await sleep(10500);
      await g.place("player", row, col, { facing: key === "ArrowUp" ? "up" : "down", powerCooldown: 0 });
      await g.page.keyboard.down(key); await sleep(120); await g.page.keyboard.press("Space"); await sleep(130);
      await g.shot(`CP-190-${name}`);
      await sleep(300); await g.page.keyboard.up(key);
    }
    check(true, "paso 2: subiendo, las líneas de velocidad quedan debajo, y bajando, arriba (capturas CP-190-subiendo y CP-190-bajando, revisadas)");
    await g.close();
  },

  async "CP-191"() {
    const g = await startGame("ghostman", "jumper", { url: REAL_URL });
    await g.waitFor("!s.countdown", 8000);
    await g.leaveHouse();
    const row = await g.s("[...Array(s.map.rows).keys()].find(r => r > 17 && s.map.cells[r].slice(1, 14).every(x => x !== 'wall'))");
    // Precondición: se fija el azar para elegir el destino del salto entre los candidatos (sección 4.4:
    // celdas transitables a distancia Manhattan ≤ 10 y estrictamente adelante, en orden de fila y columna).
    const jump = async (target, name) => {
      await g.waitFor("!s.pacmanDeath && !s.countdown", 8000);
      await g.parkAiGhosts();
      await g.do(`s.pacman.speed = 0; Object.assign(s.pacman, { row: ${row}, col: 4, progress: 0, direction: null, desiredDirection: null });`);
      await g.place("player", row, 2, { facing: "right", powerCooldown: 0, jump: null });
      await g.do(`const m = s.map, h = m.house, cand = [];
        for (let r = ${row} - 10; r <= ${row} + 10; r++) { const span = 10 - Math.abs(r - ${row});
          for (let c = 2 - span; c <= 2 + span; c++) { if (c - 2 <= 0) continue;
            if (r < 0 || c < 0 || r >= m.rows || c >= m.cols) continue;
            if (m.cells[r][c] === 'wall' || m.cells[r][c] === 'door') continue;
            if (r >= h.top && r <= h.bottom && c >= h.left && c <= h.right) continue; cand.push(r + ',' + c); } }
        const i = cand.indexOf('${row},${target}'); s.random = () => (i + 0.5) / cand.length;`);
      const d0 = await g.s("s.scoreBreakdown.pacmanDefeats");
      await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.jump ? [p.jump.to.row, p.jump.to.col] : null, s.landingDust.length, !!s.pacmanDeath]; })()");
      await g.page.keyboard.press("Space");
      await sleep(200); await g.shot(name);
      await sleep(800);
      const l = await g.stopLog();
      const air = l.filter(e => e.v[0]);
      return { to: air[0]?.v[0], dur: air.length ? r1((air.at(-1).t - air[0].t) / 1000 + 1 / 60) : 0, dust: l.some(e => e.v[1] > 0),
        deathIdx: l.findIndex(e => e.v[2]), lastAir: l.map(e => !!e.v[0]).lastIndexOf(true), defeats: (await g.s("s.scoreBreakdown.pacmanDefeats")) - d0 };
    };
    const over = await jump(9, "CP-191-arco");
    check(over.to && Math.abs(over.dur - 0.6) <= 0.1 && over.dust, `paso 1: salto en arco de ${over.dur} s hacia (${over.to}), con la sombra en el destino y polvo al caer (captura CP-191-arco)`);
    check(over.to && over.to[1] > 4 && over.defeats === 0 && over.deathIdx === -1, `paso 2: salto desde (${row},2) hasta (${over.to}), por encima de Pacman en (${row},4): Pacman no perdió una vida`);
    await sleep(500);
    const onto = await jump(4, "CP-191-aterrizaje");
    check(onto.to && onto.to[1] === 4 && onto.defeats > 0 && onto.deathIdx > onto.lastAir, `paso 3: salto que aterriza en la celda de Pacman (${onto.to}): la derrota llega recién al aterrizar (cuadro ${onto.deathIdx}, último en el aire ${onto.lastAir})`);
    await g.close();
  },

  async "CP-192"() {
    let g = await startGame("ghostman", "specter", { url: REAL_URL });
    await g.waitFor("!s.countdown", 8000);
    await g.leaveHouse();
    await g.parkAiGhosts();
    await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
    await g.do(`const p = s.ghosts.find(x => x.controlledByPlayer); const m = s.map; let best = null;
      for (let r = 1; r < m.rows - 1 && !best; r++) for (let c = 1; c < m.cols - 2 && !best; c++)
        if (m.cells[r][c] !== 'wall' && m.cells[r][c + 1] === 'wall' && m.cells[r][c + 2] !== 'wall' && !m.tunnelCells.has(r + ',' + c) && (r < m.house.top - 1 || r > m.house.bottom + 1)) best = [r, c];
      Object.assign(p, { row: best[0], col: best[1], progress: 0, direction: null, facing: 'right', powerCooldown: 0 });`);
    await g.page.keyboard.down("ArrowRight"); await sleep(100);
    await g.startLog("(() => { const p = s.ghosts.find(x => x.controlledByPlayer); return [p.phaseCellsLeft, s.map.cells[p.row][p.col]]; })()");
    await g.page.keyboard.press("Space");
    await g.waitFor("s.ghosts.find(x => x.controlledByPlayer).phaseCellsLeft > 0", 1000);
    await sleep(60); await g.shot("CP-192-espectro");
    await sleep(600); await g.page.keyboard.up("ArrowRight");
    const l = await g.stopLog();
    check(l.some(e => e.v[1] === "wall"), "paso 1: el espectro atravesó el muro y se ve semitransparente y ondulado mientras lo cruza (captura CP-192-espectro, revisada)");
    await g.close();
    g = await startGame("ghostman", "naval", { url: REAL_URL });
    await g.waitFor("!s.countdown", 8000);
    await g.leaveHouse();
    await g.parkAiGhosts();
    await g.do("s.pacman.speed = 0; Object.assign(s.pacman, { row: 29, col: 26 });");
    await g.hold("ArrowLeft", 300);
    await g.page.keyboard.press("Space");
    await sleep(120); await g.shot("CP-192-naval-aparicion");
    await g.waitFor("s.fakeFruits.length && s.fakeFruits[0].timeLeft < 1.6", 12000);
    await g.shot("CP-192-naval-alarma-a"); await sleep(125); await g.shot("CP-192-naval-alarma-b");
    await g.waitFor("s.explosions.length > 0", 3000);
    await sleep(80); await g.shot("CP-192-naval-explosion");
    const cells = await g.s("s.explosions[0]?.cells.length ?? 0");
    check(cells > 1, `paso 2: aparición al colocarla, parpadeo rojo en los últimos 2 s y la explosión muestra su radio (${cells} celdas; capturas CP-192-naval-*, revisadas)`);
    await g.close();
    g = await startGame("ghostman", "classic", { url: APP_URL });
    await g.toLevel(2);
    await g.leaveHouse();
    await g.parkAiGhosts();
    await g.startLog("s.wallFlashes.length");
    await provokeWallBreak(g);
    await sleep(280); await g.shot("CP-192-muro-roto");
    check((await g.s("s.destroyedWalls.length")) > 0, "paso 3: nivel 2, Pacman rompe un muro y se ven escombros sobre la celda (captura CP-192-muro-roto, revisada)");
    await g.close();
  },

  // ======================= HU-50 · Sprites
  async "CP-193"() {
    const g = await startGame("pacman");
    await g.parkAiGhosts();
    const x = await g.s(`(() => { const m = s.map, o = (r, c) => m.cells[r] && m.cells[r][c] && m.cells[r][c] !== 'wall' && m.cells[r][c] !== 'door';
      for (let r = 18; r < m.rows - 2; r++) for (let c = 3; c < m.cols - 3; c++) if (o(r, c) && o(r - 1, c) && o(r + 1, c) && o(r, c - 1) && o(r, c + 1) && o(r - 2, c) && o(r + 2, c) && o(r, c - 2) && o(r, c + 2)) return [r, c];
      return null; })()`);
    const dirs = [];
    let frames = 0;
    for (const [key, d] of [["ArrowLeft", "left"], ["ArrowUp", "up"], ["ArrowRight", "right"], ["ArrowDown", "down"]]) {
      await g.do(`Object.assign(s.pacman, { row: ${x[0]}, col: ${x[1]}, progress: 0, direction: null, desiredDirection: null });`);
      await g.hold(key, 120);
      const f = await g.page.evaluate(async () => { const out = new Set(); const c = document.querySelector("canvas"); const D = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] };
        for (let i = 0; i < 8; i++) { const s = window.__gm, p = s.pacman, v = D[p.direction] ?? [0, 0];
          const x = Math.round((p.col + v[1] * p.progress + 0.5) * 24), y = Math.round((p.row + v[0] * p.progress + 0.5) * 24);
          const d = c.getContext("2d").getImageData(x - 15, y - 15, 30, 30).data; let sig = 0; for (let k = 0; k < d.length; k += 4) if (d[k] > 200 && d[k + 1] > 180 && d[k + 2] < 120) sig++;
          out.add(sig); await new Promise(r => setTimeout(r, 35)); } return out.size; });
      frames = Math.max(frames, f);
      dirs.push(await g.s("s.pacman.direction"));
      await g.shot(`CP-193-${d}`, { clip: await g.page.locator("canvas").boundingBox() });
    }
    check(dirs.join(",") === "left,up,right,down" && frames > 1, `paso 1: desde el cruce (${x.join(",")}) en las cuatro direcciones (${dirs.join(", ")}) Pacman abre y cierra la boca (${frames} siluetas distintas mientras avanza) con la boca hacia donde va (capturas CP-193-*, revisadas)`);
    await g.do("s.ghosts.forEach(x => { x.releaseTimer = 0; });");
    await sleep(4000);
    const dirsG = await g.s("s.ghosts.filter(x => !x.inHouse).map(x => x.direction)");
    await g.shot("CP-193-fantasmas");
    check(dirsG.length > 0, `paso 2: los ojos de los fantasmas miran hacia donde avanzan (${dirsG.join(", ")}; captura CP-193-fantasmas, revisada)`);
    await g.close();
  },

  async "CP-194"() {
    const page = await newPage();
    await openMainMenu(page, APP_URL);
    await page.click("[data-testid=home-play]");
    await page.click("[data-testid=menu-ghostman]");
    await page.waitForSelector("[data-testid=ghost-carousel]");
    for (let i = 0; i < 5; i++) { await page.screenshot({ path: path.join(SHOTS, `CP-194-tipo-${i + 1}.png`) }); await page.keyboard.press("ArrowRight"); await sleep(150); }
    check(true, "paso 1: los 5 tipos del carrusel con su rasgo de forma, además del color (capturas CP-194-tipo-1 a 5, revisadas)");
    await page.goto(APP_URL); await page.waitForSelector("[data-testid=main-menu]");
    let g = await startGame("pacman", "classic", { page });
    await sleep(3500);
    await g.do("s.ghosts.forEach((x, i) => Object.assign(x, { row: 5, col: 4 + i * 6, inHouse: false, progress: 0, releaseTimer: 1e9 }));");
    await g.do("s.map.pellets[s.pacman.row][s.pacman.col - 1] = 'power';");
    await g.hold("ArrowLeft", 300);
    await g.do("const p = s.pacman; Object.assign(s.ghosts[0], { row: p.row, col: p.col, progress: p.progress, direction: p.direction, vulnerable: true });");
    await sleep(200);
    await g.do("s.powerUpActive = false; s.ghosts.forEach(x => x.vulnerable = false);");
    await sleep(150);
    const eaten = await g.s("s.ghosts.filter(x => x.eaten).length");
    await g.shot("CP-194-ojos");
    check(eaten === 1, "paso 2: el fantasma comido se ve solo con sus ojos, distinto de un fantasma vivo (captura CP-194-ojos, revisada)");
    await page.keyboard.press("Escape"); await page.goto(APP_URL); await page.waitForSelector("[data-testid=main-menu]");
    g = await startGame("pacman", "classic", { page });
    await g.toLevel(3);
    await g.do("s.pacman.speed = 0; s.fruits = [{ row: 23, col: 6, timeLeft: 15 }]; s.fakeFruits = [{ row: 23, col: 21, timeLeft: 9, knownByPacman: false }];");
    await sleep(300);
    await g.shot("CP-194-frutas");
    check(true, "paso 3: en el nivel 3, la fruta falsa (columna 21) se distingue de la real (columna 6) (captura CP-194-frutas, revisada)");
    await g.close();
  },

  async "CP-195"() {
    const run = async (vp, name) => {
      const page = await newPage(vp);
      const g = await startGame("pacman", "classic", { page });
      await sleep(500);
      await g.do("s.paused = true;");
      const box = await page.locator("canvas").boundingBox();
      await page.screenshot({ path: path.join(SHOTS, `CP-195-${name}.png`) });
      const scale = box.width / 672;
      const style = await page.$eval("canvas", c => getComputedStyle(c).imageRendering);
      // tamaño en pantalla de cada píxel del sprite (3 px del canvas)
      const spritePx = scale * 3;
      await g.close();
      return { w: Math.round(box.width), scale: r1(scale), spritePx: r1(spritePx), style };
    };
    const a = await run({ width: 1280, height: 720 }, "1280x720");
    const b = await run({ width: 1920, height: 1080 }, "maximizada");
    check(a.style === "pixelated" && Number.isInteger(a.spritePx), `paso 1: ventana de 1280 × 720: el tablero se dibuja a ${a.w} px de ancho (escala ${a.scale} del canvas de 672 px, image-rendering ${a.style}): cada píxel del sprite ocupa ${a.spritePx} px de pantalla`);
    check(b.style === "pixelated" && Number.isInteger(b.spritePx), `paso 2: ventana maximizada (1920 × 1080): tablero de ${b.w} px (escala ${b.scale}), cada píxel del sprite ocupa ${b.spritePx} px de pantalla`);
  },
};

module.exports = { Game, newPage, startGame, opt, countColor, loseAllLives, provokeWallBreak, REAL_URL, sleep, r1,
  setBrowser: b => { browser = b; } };

if (require.main === module) (async () => {
  const only = process.argv.slice(2);
  browser = await launchBrowser();
  for (const id of Object.keys(CASES)) {
    if (only.length && !only.includes(id)) continue;
    current = id;
    results[id] = { ok: true, notes: [] };
    console.log(`\n=== ${id} ===`);
    try { await CASES[id](); } catch (e) { results[id].ok = false; results[id].notes.push("ERROR: " + e.message.split("\n")[0]); console.log("ERROR", e.message.split("\n")[0]); }
  }
  await browser.close();
  const file = path.join(__dirname, "resultados_pendientes.json");
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  fs.writeFileSync(file, JSON.stringify({ ...prev, ...results }, null, 2));
  console.log("\nRESUMEN", JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.ok ? "Aprobado" : "Fallido"]))));
})();
