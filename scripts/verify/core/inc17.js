// Incremento 17 — dificultad del modo GhostMan (HU-33, HU-34, sección 4.8).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 7) => () => (x = (x * 16807) % 2147483647) / 2147483647;
const step = (s, n, dir = null) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir); };
const GHOSTMAN = { mode: "ghostman", playerGhostKind: "classic" };
const PACMAN = { mode: "pacman" };

/** Partida en el nivel pedido, con todos los fantasmas (también el del jugador) fuera del mapa. */
function atLevel(level, config = GHOSTMAN, seed = 7) {
  const s = st.createInitialGameState(config, seeded(seed));
  while (s.level < level) { s.levelComplete = true; s.levelTransitionTimer = 0.001; step(s, 1); }
  for (const g of s.ghosts) { g.eaten = true; g.respawnTimer = 1e9; }
  return s;
}
const countPower = (s) => s.map.pellets.flat().filter(p => p === "power").length;
const isBorder = (s, r, c) => r === 0 || c === 0 || r === s.map.rows - 1 || c === s.map.cols - 1;
/**
 * Lleva a Pacman (IA) a comer una esfera grande puesta en una celda contigua: se dejan en el mapa
 * solo esa esfera y una común lejana (para que no sea la última y no termine la partida).
 */
function eatPowerPellet(s) {
  const p = s.pacman;
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) s.map.pellets[r][c] = "none";
  s.map.pellets[13][15] = "pellet";
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const r = p.row + dr, c = p.col + dc;
    if (s.map.cells[r][c] === "path" && !(r === 13 && c === 15)) { s.map.pellets[r][c] = "power"; break; }
  }
  s.pelletsRemaining = 2;
  for (let i = 0; i < 60 && !s.powerUpActive; i++) step(s, 1);
}
/** Vacía de esferas las celdas de una franja del mapa, para que las dinámicas tengan dónde aparecer. */
function clearSomePellets(s) {
  for (let c = 1; c < s.map.cols - 1; c++) if (s.map.pellets[11][c] === "pellet") { s.map.pellets[11][c] = "none"; s.pelletsRemaining -= 1; }
}

// --- Cargas
{
  const s = atLevel(1); eatPowerPellet(s);
  check(s.powerUpActive && s.wallCharges === 0, "GhostMan N1: la esfera grande no da cargas de destrucción");
  const p = atLevel(2, PACMAN); p.pacman.speed = 0;
  p.map.pellets[7][9] = "power"; p.pacman.speed = 3.75;
  for (let i = 0; i < 30; i++) st.updateGameState(p, DT, "right");
  check(p.powerUpActive && p.wallCharges === 0, "modo Pacman N2: la esfera grande no da cargas");
}
{
  const s = atLevel(2); eatPowerPellet(s);
  check(s.powerUpActive && s.wallCharges === 5, "GhostMan N2: la esfera grande da 5 cargas");
  s.wallCharges = 2; s.pacman.progress = 0; s.pacman.direction = null; s.powerUpTimer = 8;
  s.powerUpActive = false; eatPowerPellet(s); s.powerUpActive = true;
  check(s.wallCharges === 5, "otra esfera grande con cargas restantes las repone a 5 (no las suma)");
  s.pacman.speed = 0; // que no coma la última esfera y termine la partida
  step(s, 60 * 8 + 5);
  check(!s.powerUpActive && s.wallCharges === 0, "al terminar el PowerUp (8 s) se pierden las cargas");
}

// --- Destrucción: Pacman con cargas atraviesa un muro de 1 celda cuando rodearlo es más largo
function findThinWall(s) {
  for (let r = 1; r < s.map.rows - 1; r++) for (let c = 1; c < s.map.cols - 1; c++) {
    if (s.map.cells[r][c] !== "wall") continue;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const a = [r - dr, c - dc], b = [r + dr, c + dc];
      if (s.map.cells[a[0]][a[1]] !== "path" || s.map.cells[b[0]][b[1]] !== "path") continue;
      // distancia rodeando el muro (BFS por caminos)
      const seen = new Set([a.join()]); let q = [a], d = 0, found = Infinity;
      while (q.length && found === Infinity) {
        d++; const n = [];
        for (const [x, y] of q) for (const [ex, ey] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const k = [x + ex, y + ey]; if (s.map.cells[k[0]][k[1]] !== "path" || seen.has(k.join())) continue;
          if (k[0] === b[0] && k[1] === b[1]) found = d;
          seen.add(k.join()); n.push(k);
        }
        q = n;
      }
      if (found >= 6) return { wall: [r, c], a, b };
    }
  }
  return null;
}
{
  const s = atLevel(2);
  const t = findThinWall(s);
  check(!!t, "N2 tiene un muro de una celda que conviene atravesar");
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) s.map.pellets[r][c] = "none";
  s.map.pellets[t.b[0]][t.b[1]] = "pellet"; s.map.pellets[1][1] = "pellet"; s.pelletsRemaining = 2;
  s.pacman.row = t.a[0]; s.pacman.col = t.a[1]; s.pacman.progress = 0; s.pacman.direction = null;
  s.powerUpActive = true; s.powerUpTimer = 8; s.wallCharges = 5;
  for (let i = 0; i < 120 && s.map.pellets[t.b[0]][t.b[1]] !== "none"; i++) step(s, 1);
  const [wr, wc] = t.wall;
  check(s.map.cells[wr][wc] === "path" && s.map.pellets[wr][wc] === "none", `Pacman destruye el muro (${wr},${wc}) y la celda queda transitable y sin esfera`);
  check(s.wallCharges === 4 && s.destroyedWalls.length === 1, "se gasta una sola carga");
  check(s.map.pellets[t.b[0]][t.b[1]] === "none", "Pacman llega a la esfera del otro lado por el atajo");
  // Restablecimiento al reiniciarse el nivel por una derrota
  s.fruits.push({ row: wr, col: wc, timeLeft: 15 });
  const g = st.getPlayerGhost(s); g.eaten = false; g.vulnerable = false; s.powerUpActive = false;
  g.row = s.pacman.row; g.col = s.pacman.col; g.progress = 0; g.direction = null;
  const lives = s.lives;
  step(s, 1);
  check(s.lives === lives - 1, "el fantasma del jugador derrota a Pacman");
  check(s.map.cells[wr][wc] === "wall" && s.destroyedWalls.length === 0, "al reiniciarse el nivel la pared se restablece");
  check(!s.fruits.some(f => f.row === wr && f.col === wc), "una fruta sobre la pared destruida desaparece con ella");
  check(s.wallCharges === 0, "las cargas se pierden con el reinicio (se cancela el PowerUp)");
}
{
  // Sin cargas, el mismo escenario: Pacman rodea el muro
  const s = atLevel(2);
  const t = findThinWall(s);
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) s.map.pellets[r][c] = "none";
  s.map.pellets[t.b[0]][t.b[1]] = "pellet"; s.map.pellets[1][1] = "pellet"; s.pelletsRemaining = 2;
  s.pacman.row = t.a[0]; s.pacman.col = t.a[1]; s.pacman.progress = 0; s.pacman.direction = null;
  step(s, 60 * 4);
  check(s.map.cells[t.wall[0]][t.wall[1]] === "wall", "sin cargas Pacman no destruye paredes");
}
{
  // Modo Pacman, nivel 2: nada se destruye aunque Pacman (jugador) choque muros con PowerUp
  const s = atLevel(2, PACMAN);
  const walls = s.map.cells.flat().filter(c => c === "wall").length;
  s.powerUpActive = true; s.powerUpTimer = 8;
  for (const d of ["up", "left", "down", "right"]) step(s, 60, d);
  check(s.map.cells.flat().filter(c => c === "wall").length === walls && s.destroyedWalls.length === 0, "modo Pacman: la destrucción de paredes no existe");
}
{
  // Simulación: niveles 2 y 3, varias semillas. Nunca un borde, nunca más de 5 por esfera grande.
  let bad = [];
  let total = 0;
  for (const level of [2, 3]) for (let seed = 1; seed <= 6; seed++) {
    const s = atLevel(level, GHOSTMAN, seed);
    let usedSinceCharge = 0, prevCharges = 0, prevDestroyed = 0;
    for (let i = 0; i < 60 * 90 && !s.gameOver && !s.levelComplete; i++) {
      step(s, 1);
      const destroyedNow = s.destroyedWalls.length;
      if (s.wallCharges === 5 && prevCharges !== 5) usedSinceCharge = 0;
      if (destroyedNow > prevDestroyed) usedSinceCharge += destroyedNow - prevDestroyed;
      if (usedSinceCharge > 5) bad.push("más de 5 paredes con una esfera grande");
      for (const w of s.destroyedWalls) if (isBorder(s, w.row, w.col)) bad.push("destruyó un borde");
      prevCharges = s.wallCharges; total += Math.max(0, destroyedNow - prevDestroyed); prevDestroyed = destroyedNow;
    }
  }
  bad = [...new Set(bad)];
  check(bad.length === 0 && total > 0, `simulación N2 y N3 (12 partidas × 90 s): ${total} paredes destruidas, nunca un borde ni más de 5 por esfera grande` + (bad.length ? `: ${bad.join(", ")}` : ""));
}

/** Pacman (IA) entra a la celda indicada desde una vecina: es la única esfera a su alcance. */
function enterCell(s, cell) {
  for (const [dr, dc] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    if (s.map.cells[cell.row + dr]?.[cell.col + dc] === "path" && s.map.pellets[cell.row + dr][cell.col + dc] === "none") {
      s.pacman.row = cell.row + dr; s.pacman.col = cell.col + dc; s.pacman.progress = 0; s.pacman.direction = null; s.pacman.speed = 3.75; break;
    }
  }
  for (let i = 0; i < 30 && !s.gameOver && s.map.pellets[cell.row][cell.col] !== "none"; i++) st.updateGameState(s, DT, null);
}

// --- Esferas grandes del nivel 3
{
  const g = atLevel(3); const p = atLevel(3, PACMAN);
  check(countPower(g) === 6 && g.map.pellets[7][1] === "power" && g.map.pellets[7][15] === "power", "GhostMan N3: 6 esferas grandes fijas (esquinas, (7,1) y (7,15))");
  check(countPower(p) === 4, "modo Pacman N3: siguen siendo 4");
  check(g.pelletsRemaining === p.pelletsRemaining, "las 2 fijas nuevas reemplazan esferas comunes: la cuenta total no cambia");
}
{
  const s = atLevel(3); s.pacman.speed = 0;
  clearSomePellets(s);
  const base = s.pelletsRemaining;
  step(s, 60 * 15 - 2);
  check(s.dynamicPowerPellets.length === 0, "antes de los 15 s no aparece ninguna dinámica");
  step(s, 3);
  const d = s.dynamicPowerPellets[0];
  check(s.dynamicPowerPellets.length === 1 && s.pelletsRemaining === base + 1, "a los 15 s aparece una dinámica y suma a la cuenta de esferas");
  check(d && s.map.cells[d.row][d.col] === "path" && s.map.pellets[d.row][d.col] === "power" && !(d.row === s.pacman.row && d.col === s.pacman.col),
    "en una celda transitable, sin otra esfera y sin personaje");
  step(s, 60 * 15);
  check(s.dynamicPowerPellets.length === 2, "a los 30 s, la segunda");
  step(s, 60 * 15);
  check(s.dynamicPowerPellets.length === 2 && s.pelletsRemaining === base + 2, "a los 45 s se omite (ya hay 2) y no vencen");
  // Pacman consume una (entra a su celda desde una vecina): la siguiente aparición vuelve a sumar
  const first = s.dynamicPowerPellets[0];
  enterCell(s, first);
  check(s.dynamicPowerPellets.length === 1 && s.map.pellets[first.row][first.col] === "none", "Pacman consume una dinámica: deja de contar como pendiente");
  s.pacman.speed = 0; s.powerPelletSpawnTimer = 14.99;
  step(s, 2);
  check(s.dynamicPowerPellets.length === 2, "con una consumida, la siguiente aparición vuelve a sumar");
}
{
  // Game Over solo con todas las esferas, incluidas las dinámicas
  const s = atLevel(3); s.pacman.speed = 0;
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) s.map.pellets[r][c] = "none";
  s.pelletsRemaining = 0; s.powerPelletSpawnTimer = 14.99;
  step(s, 2);
  check(s.dynamicPowerPellets.length === 1 && s.pelletsRemaining === 1 && !s.gameOver, "una dinámica pendiente impide el Game Over");
  enterCell(s, s.dynamicPowerPellets[0]);
  check(s.gameOver && s.dynamicPowerPellets.length === 0, "al consumir la última (dinámica) termina en Game Over (HU-26)");
}
{
  // Modo Pacman, nivel 3: no hay esferas grandes dinámicas
  const s = atLevel(3, PACMAN); s.pacman.speed = 0;
  clearSomePellets(s);
  step(s, 60 * 31);
  check(s.dynamicPowerPellets.length === 0 && countPower(s) === 4, "modo Pacman N3: sin esferas grandes dinámicas");
}
{
  // Pausa: el temporizador de las dinámicas se detiene
  const s = atLevel(3); s.pacman.speed = 0;
  clearSomePellets(s);
  step(s, 60 * 10); st.togglePause(s); step(s, 60 * 20); st.togglePause(s);
  check(s.dynamicPowerPellets.length === 0, "en pausa no aparecen esferas dinámicas");
  step(s, 60 * 5 + 2);
  check(s.dynamicPowerPellets.length === 1, "al reanudar, aparece a los 15 s de juego efectivo");
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exitCode = fails ? 1 : 0;
