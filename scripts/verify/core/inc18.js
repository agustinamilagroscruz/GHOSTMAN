// Incremento 18 — memoria de frutas falsas de la IA de Pacman y salto hacia adelante del
// saltarín (HU-29, HU-30, HU-43; decisiones 37, 38, 41, 42 y 47).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { tryJumperTeleport, JUMPER_RADIUS_CELLS } = require(path.join(B, "powers.js"));
const { isHouseCell } = require(path.join(B, "movement.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 5) => () => (x = (x * 16807) % 2147483647) / 2147483647;
function setup(kind, level = 1, random = seeded()) {
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: kind }, random);
  if (level > 1) { s.level = level - 1; s.levelComplete = true; s.levelTransitionTimer = 0.001; st.updateGameState(s, DT, null); }
  for (const g of s.ghosts) if (!g.controlledByPlayer) { g.eaten = true; g.respawnTimer = 1e9; }
  // Coordenadas sobre los mapas de la V3 (incremento 19): en el nivel 1, la fila 5 es un pasillo
  // de las columnas 1 a 26.
  s.pacman.speed = 0; s.pacman.row = 5; s.pacman.col = 8; s.pacman.progress = 0; s.pacman.direction = null;
  return [s, st.getPlayerGhost(s)];
}
const step = (s, n, dir = null, power = false) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir, power && i === 0); };
// Fuera de la base desde el incremento 19: dentro, el poder no se puede usar.
const place = (g, r, c) => { g.row = r; g.col = c; g.progress = 0; g.direction = null; g.inHouse = false; };
const secs = t => Math.round(t / DT);
const never = () => 0.99; // con este azar Pacman nunca olvida (0,99 ≥ 5 %)
/** El naval coloca una fruta en (r,c) y queda fuera del juego, para que Pacman no huya de él. */
function placeFruit(s, g, r, c) {
  place(g, r, c); step(s, 1, null, true);
  g.eaten = true; g.respawnTimer = 1e9;
  return s.fakeFruits[s.fakeFruits.length - 1];
}

// ---------- Registro (decisión 42)
{
  // Mapa del nivel 1: desde (5,8), la celda (5,3) está a 5 celdas de recorrido.
  const [s, g] = setup("naval", 1, never);
  const fruit = placeFruit(s, g, 5, 3);
  check(fruit.knownByPacman === true, "fruta colocada a 5 celdas de recorrido: Pacman la registra");
}
{
  // Exactamente a 8 celdas: (5,8) → (5,16).
  const [s, g] = setup("naval", 1, never);
  const fruit = placeFruit(s, g, 5, 16);
  check(fruit.knownByPacman === true, "fruta a 8 celdas de recorrido: la registra (límite incluido)");
}
{
  const [s, g] = setup("naval", 1, never);
  const fruit = placeFruit(s, g, 5, 17); // 9 celdas
  check(fruit.knownByPacman === false, "fruta a 9 celdas de recorrido: no la registra");
  s.pacman.row = 5; s.pacman.col = 15; step(s, secs(1));
  check(fruit.knownByPacman === false, "si Pacman se acerca después, la fruta sigue sin registrarse");
}
{
  // Modo Pacman: el jugador es Pacman, no hay memoria que llevar.
  const s = st.createInitialGameState(undefined, never);
  check(s.fakeFruits.length === 0 && s.config.mode === "pacman", "modo Pacman: la memoria no aplica (sin IA de Pacman)");
}

// ---------- La IA no consume la fruta que recuerda y sí la que no registró
{
  const [s, g] = setup("naval", 1, never);
  s.pacman.speed = 5;
  for (const row of s.map.pellets) row.fill("none");
  s.map.pellets[5][1] = "pellet"; s.map.pellets[1][8] = "pellet"; s.pelletsRemaining = 2;
  placeFruit(s, g, 5, 6); // a 2 celdas, entre Pacman y la esfera de (5,1)
  let entered = false, t = 0;
  while (t < 4) { step(s, 1); t += DT; if (s.pacman.row === 5 && s.pacman.col === 6) entered = true; }
  check(!entered && s.lives === 3 && s.fakeFruits.length === 1, "Pacman no pasa por la fruta que recuerda (busca otra esfera)");
}
{
  const [s, g] = setup("naval", 1, never);
  s.pacman.speed = 5; s.pacman.row = 29; s.pacman.col = 26;
  for (const row of s.map.pellets) row.fill("none"); s.map.pellets[1][20] = "pellet"; s.pelletsRemaining = 1;
  const fruit = placeFruit(s, g, 5, 10); // Pacman lejos: no la registra
  s.pacman.row = 5; s.pacman.col = 8;
  let t = 0; while (s.fakeFruits.length && t < 3) { step(s, 1); t += DT; }
  check(fruit.knownByPacman === false && s.lives === 2, `fruta que no vio colocar: va por ella y pierde una vida (a los ${t.toFixed(2)} s)`);
}

// ---------- Olvido (decisión 37): una tirada por segundo cumplido, 5 %
{
  const [s, g] = setup("naval", 1, never);
  const fruit = placeFruit(s, g, 5, 3);
  step(s, secs(9));
  check(fruit.knownByPacman === true, "con azar 0,99 la recuerda durante toda la mecha (9 s)");
}
{
  const [s, g] = setup("naval", 1, never);
  const fruit = placeFruit(s, g, 5, 3);
  s.random = () => 0.04; // < 5 %: olvida en la primera tirada
  step(s, secs(0.9));
  check(fruit.knownByPacman === true, "antes de cumplir el primer segundo no hay tirada");
  step(s, secs(0.2));
  check(fruit.knownByPacman === false, "con azar 0,04 la olvida al cumplir el primer segundo");
}
{
  const [s, g] = setup("naval", 1, never);
  const fruit = placeFruit(s, g, 5, 3);
  const rolls = [0.5, 0.5, 0.05, 0.01]; let n = 0;
  s.random = () => rolls[Math.min(n++, rolls.length - 1)];
  step(s, secs(3.5));
  check(fruit.knownByPacman === true && n === 3, `0,05 no es menor que 5 %: la recuerda tras 3 tiradas (${n})`);
  step(s, secs(1));
  check(fruit.knownByPacman === false && n === 4, "en la cuarta tirada (0,01) la olvida");
}
{
  // Proporción de olvido en el primer segundo con un azar real
  let forgot = 0; const N = 4000; const rnd = seeded(777);
  for (let i = 0; i < N; i++) {
    const [s, g] = setup("naval", 1, never);
    const fruit = placeFruit(s, g, 5, 3);
    s.random = rnd; step(s, secs(1.01));
    if (!fruit.knownByPacman) forgot++;
  }
  const p = forgot / N;
  check(Math.abs(p - 0.05) < 0.015, `olvido en el primer segundo ≈ 5 % (${(p * 100).toFixed(1)} % en ${N} frutas)`);
}

// ---------- Espera cuando la fruta bloquea la única ruta
{
  const [s, g] = setup("naval", 1, never);
  // Pasillo aislado en la fila 7: Pacman en (7,2), fruta en (7,5), única esfera en (7,10).
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) s.map.cells[r][c] = r === 7 && c >= 1 && c <= 15 ? "path" : "wall";
  for (const row of s.map.pellets) row.fill("none"); s.map.pellets[7][10] = "pellet"; s.pelletsRemaining = 1;
  s.pacman.row = 7; s.pacman.col = 2;
  placeFruit(s, g, 7, 5); // Pacman quieto (velocidad 0) mientras el naval, a su lado, la coloca
  // Pacman arranca caminando hacia la fruta: al llegar a la celda decide y se detiene.
  s.pacman.speed = 5; s.pacman.direction = "right"; s.pacman.desiredDirection = null; s.pacman.progress = 0;
  let entered = false, maxCol = 0, t = 0, moved = false, lastCol = null;
  // Al explotar, la explosión lo alcanza y el nivel se reinicia: solo cuenta mientras la fruta existe.
  while (s.fakeFruits.length && t < 11) {
    step(s, 1); t += DT;
    if (!s.fakeFruits.length) break;
    if (s.pacman.col === 5) entered = true;
    maxCol = Math.max(maxCol, s.pacman.col);
    if (t > 1 && lastCol !== null && s.pacman.col !== lastCol) moved = true;
    lastCol = s.pacman.col;
  }
  check(!entered && maxCol < 5 && !moved && t > 9.9, `la fruta bloquea la única ruta: Pacman se detiene antes (columna ${maxCol}) y espera hasta que explota (${t.toFixed(2)} s)`);
}

// ---------- Saltarín: hacia adelante (decisiones 38 y 41)
{
  const [s, g] = setup("jumper", 2);
  const cells = [];
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) if (s.map.cells[r][c] === "path") cells.push([r, c]);
  const ahead = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  const rnd = seeded(31);
  let jumps = 0, behind = 0, far = 0, withoutTarget = 0, cooldownWithout = 0;
  for (const [r, c] of cells) {
    for (const facing of Object.keys(ahead)) {
      place(g, r, c); g.facing = facing; g.powerCooldown = 0;
      const used = tryJumperTeleport(g, s.map, rnd);
      if (!used) { withoutTarget++; if (g.powerCooldown !== 0 || g.row !== r || g.col !== c) cooldownWithout++; continue; }
      jumps++;
      const [dr, dc] = ahead[facing];
      if ((g.row - r) * dr + (g.col - c) * dc <= 0) behind++;
      if (Math.abs(g.row - r) + Math.abs(g.col - c) > JUMPER_RADIUS_CELLS) far++;
    }
  }
  check(jumps > 0 && behind === 0 && far === 0, `${jumps} saltos desde todas las celdas y direcciones: todos estrictamente adelante y a ≤ 10`);
  check(cooldownWithout === 0, `${withoutTarget} intentos sin destino adelante: no saltan ni arrancan el cooldown`);
}
{
  // Los destinos posibles son exactamente las celdas del semiplano, con distribución uniforme.
  const [s, g] = setup("jumper", 2);
  const expected = new Set();
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) {
    // Nunca dentro de la base (decisión 49, incremento 19).
    if (s.map.cells[r][c] === "path" && !isHouseCell(s.map, r, c) && c > 8 && Math.abs(r - 7) + Math.abs(c - 8) <= 10) expected.add(r + "," + c);
  }
  const counts = {}; const N = 40000; const rnd = seeded(4242);
  for (let i = 0; i < N; i++) { place(g, 7, 8); g.facing = "right"; tryJumperTeleport(g, s.map, rnd); const k = g.row + "," + g.col; counts[k] = (counts[k] || 0) + 1; }
  const seen = Object.keys(counts);
  check(seen.length === expected.size && seen.every(k => expected.has(k)), `desde (7,8) hacia la derecha: ${seen.length} destinos, los ${expected.size} del semiplano (columna > 8)`);
  const vals = Object.values(counts); const e = N / vals.length; const df = vals.length - 1;
  const chi = vals.reduce((a, o) => a + (o - e) ** 2 / e, 0); const limit = df + 2.33 * Math.sqrt(2 * df);
  check(chi < limit, `distribución uniforme (chi² ${chi.toFixed(1)} < ${limit.toFixed(0)})`);
}
{
  const [s, g] = setup("jumper", 1);
  place(g, 1, 1); g.facing = null;
  step(s, 1, null, true);
  check(g.powerCooldown === 0 && g.row === 1 && g.col === 1, "sin dirección de avance: no salta ni arranca el cooldown");
  place(g, 1, 1); g.facing = "up";
  step(s, 1, null, true);
  check(g.powerCooldown === 0 && g.row === 1 && g.col === 1, "mirando al borde, sin celdas adelante: no salta ni arranca el cooldown");
  place(g, 1, 1); g.facing = "down";
  step(s, 1, null, true);
  check(g.powerCooldown > 9.9 && g.row > 1, "mirando hacia abajo desde (1,1): salta a una fila mayor y arranca el cooldown");
}
{
  // Modo Pacman: el saltarín de la IA usa la misma regla.
  const s = st.createInitialGameState(undefined, seeded(9));
  while (s.level < 3) { s.levelComplete = true; s.levelTransitionTimer = 0.001; st.updateGameState(s, DT, null); }
  const jumper = s.ghosts.find(gh => gh.kind === "jumper");
  let checked = 0, wrong = 0;
  for (let i = 0; i < secs(240) && checked < 20; i++) {
    const before = { row: jumper.row, col: jumper.col, cd: jumper.powerCooldown };
    st.updateGameState(s, DT, ["left", "up", "right", "down"][Math.floor(i / 90) % 4]);
    if (s.gameOver) break;
    if (before.cd === 0 && jumper.powerCooldown > 9.9 && !jumper.eaten) {
      checked++;
      const v = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[jumper.facing]; // el salto no cambia la dirección de avance
      if (!v || (jumper.row - before.row) * v[0] + (jumper.col - before.col) * v[1] <= 0) wrong++;
    }
  }
  check(checked > 0 && wrong === 0, `modo Pacman: ${checked} saltos de la IA, todos hacia adelante`);
}

// ---------- Cooldown mientras está comido (decisión 47)
{
  const s = st.createInitialGameState(undefined, seeded(3));
  const g = s.ghosts[0];
  g.powerCooldown = 8; g.eaten = true; g.respawnTimer = 5;
  step(s, secs(2));
  check(Math.abs(g.powerCooldown - 6) < 0.02, `modo Pacman: el cooldown de un fantasma de la IA comido sigue corriendo (8 → ${g.powerCooldown.toFixed(2)} en 2 s)`);
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
