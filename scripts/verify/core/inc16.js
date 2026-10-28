// Incremento 16 — fantasmas especiales en el modo Pacman (HU-43, sección 4.9).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 7) => () => (x = (x * 16807) % 2147483647) / 2147483647;
const step = (s, n) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, null); };
const POWERED = ["specter", "jumper", "naval", "accelerated"];

/** Partida en modo Pacman en el nivel pedido, con Pacman quieto en (13,8) o donde se indique. */
function atLevel(level, seed = 7) {
  const s = st.createInitialGameState(undefined, seeded(seed));
  while (s.level < level) { s.levelComplete = true; s.levelTransitionTimer = 0.001; step(s, 1); }
  s.pacman.speed = 0; s.pacman.direction = null; s.pacman.progress = 0;
  return s;
}
/** Hace reaparecer n veces al primer fantasma y cuenta los tipos. */
function respawnKinds(s, n) {
  const g = s.ghosts[0];
  const counts = {};
  for (let i = 0; i < n; i++) {
    g.eaten = true; g.respawnTimer = 1e-6; g.vulnerable = false;
    step(s, 1);
    counts[g.kind] = (counts[g.kind] || 0) + 1;
    if (s.gameOver) { s.gameOver = false; s.lives = 3; }
  }
  return counts;
}
const chi2 = (counts, keys, n) => keys.reduce((acc, k) => acc + ((counts[k] || 0) - n / keys.length) ** 2 / (n / keys.length), 0);

// --- Composición
{
  const s1 = atLevel(1);
  check(s1.ghosts.every(g => g.kind === "classic"), "N1 arranca con cuatro clásicos");
  const c1 = respawnKinds(s1, 1000);
  check(c1.classic === 1000, `N1: 1000 reapariciones, todas clásicas (${JSON.stringify(c1)})`);

  const s2 = atLevel(2);
  check(s2.ghosts.every(g => g.kind === "classic"), "N2 arranca con cuatro clásicos");
  const c2 = respawnKinds(s2, 1000);
  const powered = POWERED.reduce((a, k) => a + (c2[k] || 0), 0);
  // 50 % ± 4,5 desvíos (σ ≈ 15,8): entre 430 y 570
  check(powered >= 430 && powered <= 570, `N2: ${powered} de 1000 reaparecen con poderes (esperado ≈ 500)`);
  const x2 = chi2(c2, POWERED, powered);
  check(POWERED.every(k => (c2[k] || 0) > 0) && x2 < 11.34, `N2: tipo uniforme entre los cuatro con poderes (${JSON.stringify(c2)}, chi² ${x2.toFixed(2)} < 11,34)`);

  const s3 = atLevel(3);
  check(s3.ghosts.map(g => g.kind).join() === POWERED.join(), "N3 arranca con uno de cada tipo: espectro, saltarín, naval y acelerado");
  check(Math.abs(s3.ghosts[2].speed - 2.55) < 1e-9 && Math.abs(s3.ghosts[0].speed - 2.23125) < 1e-9 && Math.abs(s3.ghosts[1].speed - 3.1875) < 1e-9, "N3: velocidades de la sección 4.5 con el −15 % del modo Pacman (naval 2,55, espectro 2,23, saltarín 3,19)");
  // Decisión 40: en el modo Pacman los fantasmas van un 15 % más lentos; Pacman y el modo GhostMan no cambian
  const p1 = st.createInitialGameState();
  check(p1.ghosts.every(g => Math.abs(g.speed - 3.1875) < 1e-9) && Math.abs(p1.pacman.speed - 3.75) < 1e-9, "modo Pacman N1: fantasmas a 3,19 celdas/s (−15 %) y Pacman a 3,75");
  const gm1 = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "naval" });
  check(gm1.ghosts.filter(g => !g.controlledByPlayer).every(g => Math.abs(g.speed - 3.75) < 1e-9) && Math.abs(st.getPlayerGhost(gm1).speed - 3) < 1e-9, "modo GhostMan: velocidades sin el −15 % (clásicos 3,75, naval del jugador 3)");
  const c3 = respawnKinds(s3, 1000);
  const x3 = chi2(c3, POWERED, 1000);
  check(!c3.classic && x3 < 11.34, `N3: 1000 reapariciones, siempre con poderes y uniformes (${JSON.stringify(c3)}, chi² ${x3.toFixed(2)})`);
}

// --- Poderes de la IA. Un solo fantasma activo; los demás comidos.
function solo(kind, { pacman = [13, 8], ghost = [13, 4], dir = "right", mode = "chase" } = {}) {
  const s = atLevel(3);
  s.ghosts.forEach((g, i) => { if (i > 0) { g.eaten = true; g.respawnTimer = 1e9; } });
  const g = s.ghosts[0];
  g.kind = kind; g.speed = (kind === "naval" ? 3 : kind === "specter" ? 2.625 : 3.75) * 0.85; // modo Pacman: −15 % (decisión 40)
  g.row = ghost[0]; g.col = ghost[1]; g.progress = 0; g.direction = dir; g.facing = dir; g.powerCooldown = 0;
  s.pacman.row = pacman[0]; s.pacman.col = pacman[1];
  s.ghostMode = mode; s.ghostModeTimer = 0;
  s.fruits = []; s.fruitSpawnTimer = -1e9;
  return [s, g];
}

{
  // Saltarín: con Pacman a ≤ 10 en persecución salta; queda a ≤ 10 de donde estaba, en celda transitable
  const [s, g] = solo("jumper", { pacman: [1, 8], ghost: [13, 4] });
  const before = { row: g.row, col: g.col };
  step(s, 1);
  check(g.powerCooldown === 0 && g.row === before.row && g.col === before.col, "saltarín: Pacman a 16 celdas → no salta");
  g.powerCooldown = 0; s.pacman.row = 13; s.pacman.col = 12; g.row = 13; g.col = 4; g.progress = 0;
  step(s, 1);
  const jumped = Math.abs(g.row - 13) + Math.abs(g.col - 4);
  check(g.powerCooldown > 9.9 && jumped >= 1 && jumped <= 11 && s.map.cells[g.row][g.col] === "path",
    `saltarín: Pacman a 8 celdas → salta a una celda transitable a distancia ${jumped} y arranca el cooldown de 10 s`);
}
{
  const [s, g] = solo("jumper", { pacman: [13, 8], ghost: [13, 4], mode: "scatter" });
  step(s, 1);
  check(g.powerCooldown === 0, "saltarín: en dispersión no salta");
}
{
  // Naval: coloca en persecución y en dispersión; máximo 2; cooldown de 5 s; no repite celda
  const [s, g] = solo("naval", { pacman: [1, 8], ghost: [13, 1], mode: "scatter" });
  step(s, 1);
  check(s.fakeFruits.length === 1 && Math.abs(g.powerCooldown - 5) < 0.05, "naval: en dispersión coloca una fruta falsa y arranca el cooldown de 5 s");
  step(s, 60 * 5 + 2);
  check(s.fakeFruits.length === 2, "naval: a los 5 s coloca la segunda");
  step(s, 60 * 4);
  check(s.fakeFruits.length === 2, "naval: con 2 frutas en el mapa no coloca una tercera");
  const cells = new Set(s.fakeFruits.map(f => `${f.row},${f.col}`));
  check(cells.size === s.fakeFruits.length, "naval: nunca dos frutas en la misma celda");
}
{
  // Acelerado: dash con Pacman a ≤ 6 y la celda siguiente libre; penalidad 5 s; cooldown 10 s
  const [s, g] = solo("accelerated", { pacman: [1, 8], ghost: [13, 1] });
  step(s, 1);
  check(g.powerCooldown === 0, "acelerado: Pacman a 19 celdas → no hace dash");
  s.pacman.row = 13; s.pacman.col = 12; g.row = 13; g.col = 3; g.progress = 0; g.direction = "right"; g.facing = "right";
  step(s, 1);
  check(g.powerCooldown === 0 && Math.abs(g.speed - 3.1875) < 1e-9, `acelerado: Pacman a 9 celdas → no hace dash (${g.powerCooldown}, ${g.speed}, ${g.col})`);
}
{
  const [s, g] = solo("accelerated", { pacman: [13, 9], ghost: [13, 4] });
  step(s, 1);
  check(g.powerCooldown > 9.9 && g.col === 7 && Math.abs(g.speed - 1.59375) < 1e-9, `acelerado: Pacman a 5 → dash de 3 celdas (col ${g.col}) y velocidad 1,59 (50 % de 3,19)`);
  step(s, 60 * 5 + 2);
  check(Math.abs(g.speed - 3.1875) < 1e-9, "acelerado: a los 5 s recupera la velocidad 3,19 (modo Pacman)");
}
{
  // Contacto en todo el trayecto del dash: Pacman en el medio pierde una vida
  const [s] = solo("accelerated", { pacman: [13, 6], ghost: [13, 4] });
  const lives = s.lives;
  step(s, 1);
  check(s.lives === lives - 1, "acelerado: el dash que pasa por encima de Pacman le quita una vida (decisión 32)");
}
{
  // Ningún fantasma de la IA usa su poder mientras está vulnerable
  for (const kind of ["jumper", "naval", "accelerated"]) {
    const [s, g] = solo(kind, { pacman: [13, 9], ghost: [13, 4] });
    g.vulnerable = true; s.powerUpActive = true; s.powerUpTimer = 8;
    step(s, 10);
    check(g.powerCooldown === 0 && s.fakeFruits.length === 0, `${kind}: vulnerable no usa el poder`);
  }
}
{
  // Fruta falsa en el modo Pacman: sin PowerUp quita una vida; con PowerUp desaparece sin efecto
  const s = atLevel(3);
  s.ghosts.forEach(g => { g.eaten = true; g.respawnTimer = 1e9; });
  s.pacman.speed = 3.75; s.pacman.row = 13; s.pacman.col = 5; s.fakeFruits.push({ row: 13, col: 6, timeLeft: 10 });
  const lives = s.lives;
  for (let i = 0; i < 30; i++) st.updateGameState(s, DT, "right");
  check(s.lives === lives - 1, "fruta falsa consumida sin PowerUp: Pacman pierde una vida");
  const t = atLevel(3);
  t.ghosts.forEach(g => { g.eaten = true; g.respawnTimer = 1e9; });
  t.pacman.speed = 3.75; t.pacman.row = 13; t.pacman.col = 5; t.fakeFruits.push({ row: 13, col: 6, timeLeft: 10 });
  t.powerUpActive = true; t.powerUpTimer = 8;
  for (let i = 0; i < 30; i++) st.updateGameState(t, DT, "right");
  check(t.lives === 3 && t.fakeFruits.length === 0, "fruta falsa consumida con PowerUp: desaparece sin efecto");
}
{
  // Nivel 1 sin cambios: en 90 s de juego no aparece ninguna fruta falsa ni ningún tipo con poderes
  const s = st.createInitialGameState(undefined, seeded(3));
  let powered = false, fake = false;
  const dirs = ["up", "left", "down", "right"]; const r = seeded(11);
  let d = "left";
  for (let i = 0; i < 60 * 90 && s.level === 1 && !s.gameOver; i++) {
    if (i % 40 === 0) d = dirs[Math.floor(r() * 4)];
    st.updateGameState(s, DT, d);
    if (s.ghosts.some(g => g.kind !== "classic")) powered = true;
    if (s.fakeFruits.length) fake = true;
  }
  check(!powered && !fake, "N1: sin tipos con poderes ni frutas falsas (sin cambios respecto de la V1)");
}
{
  // Invariantes en el nivel 3 durante 120 s de juego al azar con varias semillas
  let bad = [];
  for (let seed = 1; seed <= 5; seed++) {
    const s = atLevel(3, seed); s.pacman.speed = 3.75;
    const r = seeded(seed * 13); const dirs = ["up", "left", "down", "right"]; let d = "left";
    let lastScore = s.score;
    for (let i = 0; i < 60 * 120 && !s.gameOver && !s.won && s.level === 3; i++) {
      if (i % 45 === 0) d = dirs[Math.floor(r() * 4)];
      st.updateGameState(s, DT, d);
      if (s.fakeFruits.length > 2) bad.push("más de 2 frutas falsas");
      for (const g of s.ghosts) {
        if (g.eaten) continue;
        if (g.row < 0 || g.col < 0 || g.row >= s.map.rows || g.col >= s.map.cols) bad.push(`${g.kind} fuera del mapa`);
        else if (g.phaseCellsLeft === 0 && s.map.cells[g.row][g.col] !== "path") bad.push(`${g.kind} dentro de un muro`);
      }
      if (s.score < lastScore) bad.push("el puntaje bajó"); lastScore = s.score;
    }
  }
  bad = [...new Set(bad)];
  check(bad.length === 0, "N3, 5 semillas × 120 s: nadie sale del mapa ni queda en un muro, máximo 2 frutas falsas, el puntaje no baja" + (bad.length ? `: ${bad.join(", ")}` : ""));
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exitCode = fails ? 1 : 0;
