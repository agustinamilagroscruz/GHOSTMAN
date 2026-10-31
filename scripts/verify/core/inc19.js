// Incremento 19 — mapas nuevos, base de los fantasmas y túnel (HU-44, HU-45; decisiones 26, 34,
// 44 a 51). Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio
// del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const mv = require(path.join(B, "movement.js"));
const { isInteriorWall } = require(path.join(B, "difficulty.js"));
const { tryJumperTeleport, tryNavalPlaceFruit } = require(path.join(B, "powers.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 7) => () => (x = (x * 16807) % 2147483647) / 2147483647;
const step = (s, n, dir = null, power = false) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir, power && i === 0); };
const secs = t => Math.round(t / DT);
const atLevel = (level, config, seed = 7) => {
  const s = st.createInitialGameState(config, seeded(seed));
  while (s.level < level) { s.levelComplete = true; s.levelTransitionTimer = 0.001; step(s, 1); }
  return s;
};
const GHOSTMAN = kind => ({ mode: "ghostman", playerGhostKind: kind });
const key = c => `${c.row},${c.col}`;
const { canCrossDoor } = require(path.join(B, "house.js"));
/** Celdas de recorrido desde `from` hasta el centro de la base, cruzando la puerta. */
function houseDistance(map, from) {
  const target = key(map.house.center); const seen = new Map([[key(from), 0]]); const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (key(cell) === target) return seen.get(target);
    for (const d of ["up", "left", "down", "right"]) {
      const n = mv.neighborCell(map, cell.row, cell.col, d);
      if (!canCrossDoor(map, n.row, n.col) || seen.has(key(n))) continue;
      seen.set(key(n), seen.get(key(cell)) + 1); queue.push(n);
    }
  }
  return Infinity;
}

// ---------- Mapas (sección 4.1)
for (const level of [1, 2, 3]) {
  const s = atLevel(level);
  const m = s.map;
  const symmetric = m.cells.every(row => row.every((cell, c) => cell === row[m.cols - 1 - c]));
  const h = m.house;
  check(m.rows === 31 && m.cols === 28 && symmetric, `N${level}: 28 × 31 y simétrico`);
  check(h.top === 12 && h.bottom === 16 && h.left === 10 && h.right === 17 && h.door.map(key).join(" ") === "12,13 12,14",
    `N${level}: base en las filas 12 a 16 y columnas 10 a 17, puerta en (12,13) y (12,14)`);
  const tunnel = [...m.tunnelCells].sort().join(" ");
  check(tunnel === "13,0 13,1 13,2 13,24 13,25 13,26 13,27 13,3", `N${level}: túnel en la fila 13, columnas 0 a 3 y 24 a 27`);
  check(s.pacman.row === 23 && s.pacman.col === 13, `N${level}: Pacman aparece en (23,13)`);
}

// ---------- Base de los fantasmas (decisiones 44 y 45)
{
  const s = atLevel(1);
  const [a, b, c, d] = s.ghosts;
  check(!a.inHouse && a.row === 11 && a.col === 13, "modo Pacman: un fantasma arranca afuera, sobre la puerta (11,13)");
  check([b, c, d].every(g => g.inHouse) && key(b) === "14,13" && key(c) === "14,11" && key(d) === "14,16", "modo Pacman: los otros tres arrancan adentro (centro, izquierda y derecha)");
  // Pacman quieto y lejos, para medir las salidas sin interferencias.
  s.pacman.speed = 0;
  const started = {};
  for (let i = 0; i < secs(12); i++) {
    const before = [b, c, d].map(g => `${g.row},${g.col},${g.progress}`);
    step(s, 1);
    [b, c, d].forEach((g, k) => { if (started[g.id] === undefined && `${g.row},${g.col},${g.progress}` !== before[k]) started[g.id] = (i + 1) * DT; });
  }
  const times = [b, c, d].map(g => started[g.id]);
  check(times.every((t, k) => t !== undefined && Math.abs(t - 3 * (k + 1)) < 0.05), `salen de a uno cada 3 s (empiezan a moverse a los ${times.map(t => t?.toFixed(2)).join(", ")} s)`);
  check([a, b, c, d].every(g => !g.inHouse), "a los 12 s están los cuatro afuera");
}
{
  const s = st.createInitialGameState(GHOSTMAN("classic"), seeded());
  const pg = st.getPlayerGhost(s);
  const ai = s.ghosts.filter(g => !g.controlledByPlayer);
  check(pg.inHouse && key(pg) === "14,13", "modo GhostMan: el fantasma del jugador arranca en el centro de la base");
  check(ai.filter(g => !g.inHouse).length === 1 && ai.filter(g => g.inHouse).map(g => g.releaseDelay).join() === "3,6",
    "modo GhostMan: de la IA, uno afuera y dos adentro que salen a los 3 y a los 6 s");
  // El jugador sale cuando lo lleva a la puerta
  step(s, secs(1), "up");
  check(!pg.inHouse && pg.row <= 11, `el jugador sale por la puerta hacia arriba (está en ${key(pg)})`);
  // Afuera, la puerta es un muro para él
  pg.row = 11; pg.col = 13; pg.progress = 0; pg.direction = null;
  step(s, secs(1), "down");
  check(pg.row === 11 && !pg.inHouse, "un fantasma que salió no puede volver a entrar");
}
{
  // Pacman nunca entra a la base, ni con cargas
  const s = atLevel(3, GHOSTMAN("classic"));
  for (const g of s.ghosts) { g.eaten = true; g.respawnTimer = 1e9; }
  for (const row of s.map.pellets) row.fill("none");
  s.map.pellets[14][13] = "pellet"; s.map.pellets[29][26] = "pellet"; s.pelletsRemaining = 2;
  s.pacman.row = 11; s.pacman.col = 13; s.pacman.speed = 4.5;
  s.powerUpActive = true; s.powerUpTimer = 1e9; s.wallCharges = 5;
  let inside = false;
  for (let i = 0; i < secs(20); i++) { step(s, 1); if (mv.isHouseCell(s.map, s.pacman.row, s.pacman.col)) inside = true; }
  check(!inside && s.destroyedWalls.every(w => !mv.isHouseCell(s.map, w.row, w.col)), "Pacman no entra a la base aunque tenga cargas y una esfera adentro");
  check(!isInteriorWall(s.map, 12, 12) && !isInteriorWall(s.map, 16, 13) && isInteriorWall(s.map, 2, 2), "los muros de la base no se pueden destruir; los interiores sí");
}

// ---------- Fantasma comido: ojos (decisión 46)
for (const kind of ["classic", "naval"]) {
  const s = atLevel(1);
  s.pacman.speed = 0;
  const g = s.ghosts[0];
  st.updateGameState(s, 0, null);
  if (kind === "naval") { g.kind = "naval"; }
  g.row = 5; g.col = 1; g.progress = 0; g.direction = null; g.inHouse = false; g.vulnerable = true;
  s.powerUpActive = true; s.powerUpTimer = 30;
  s.pacman.row = 5; s.pacman.col = 1;
  step(s, 1);
  const at = mv.getMoverPosition(g);
  check(g.eaten && !g.inHouse && Math.abs(at.row - 5) < 0.2 && at.col === 1, `${kind}: comido en (5,1), quedan sus ojos donde estaba (${at.row.toFixed(2)},${at.col})`);
  s.pacman.row = 29; s.pacman.col = 26;
  let t = 0;
  while (g.eaten && !g.inHouse && t < 10) { step(s, 1); t += DT; }
  // A 9 celdas/s, el doble del clásico, por el camino más corto a través de la puerta.
  const cells = houseDistance(s.map, { row: 5, col: 1 });
  check(g.inHouse && key(g) === "14,13" && Math.abs(t - cells / 9) < 0.05, `${kind}: los ojos recorren las ${cells} celdas hasta el centro de la base al doble de velocidad (${t.toFixed(2)} s)`);
  const wait = kind === "naval" ? 3 : 0;
  let revivedAt = null; t = 0;
  while (revivedAt === null && t < 5) { step(s, 1); t += DT; if (!g.eaten) revivedAt = t; }
  check(Math.abs(revivedAt - wait) < 0.05 && g.vulnerable, `${kind}: revive a los ${revivedAt.toFixed(2)} s de entrar (espera ${wait} s), vulnerable porque el PowerUp sigue`);
  t = 0; while (g.inHouse && t < 3) { step(s, 1); t += DT; }
  check(!g.inHouse && key(g) === "11,13", `${kind}: sale enseguida por la puerta`);
}
{
  // Los ojos no colisionan con Pacman
  const s = atLevel(1);
  const g = s.ghosts[0];
  g.eaten = true; g.inHouse = false; g.row = 23; g.col = 15; g.progress = 0;
  s.pacman.speed = 0; s.pacman.row = 23; s.pacman.col = 15;
  const lives = s.lives;
  step(s, secs(0.5));
  check(s.lives === lives && g.eaten, "los ojos pasan por encima de Pacman sin colisionar");
}

// ---------- Túnel (decisión 48)
{
  const s = atLevel(1);
  for (const g of s.ghosts) { g.eaten = true; g.inHouse = true; g.respawnTimer = 1e9; }
  s.pacman.row = 13; s.pacman.col = 4; s.pacman.speed = 4.5;
  const cols = [];
  for (let i = 0; i < secs(3); i++) { st.updateGameState(s, DT, "left"); cols.push(s.pacman.col); }
  check(cols.includes(0) && cols.includes(27) && s.pacman.row === 13, "Pacman cruza el túnel hacia la izquierda: de la columna 0 a la 27");
  s.pacman.col = 23; s.pacman.progress = 0; s.pacman.direction = null;
  const back = [];
  for (let i = 0; i < secs(3); i++) { st.updateGameState(s, DT, "right"); back.push(s.pacman.col); }
  check(back.includes(27) && back.includes(0), "y hacia la derecha: de la 27 a la 0");
  check(mv.neighborCell(s.map, 13, 0, "left").col === 27 && mv.neighborCell(s.map, 13, 27, "right").col === 0 && mv.neighborCell(s.map, 5, 0, "left").col === -1,
    "la vecindad salta de borde solo en la fila del túnel");
}
{
  // Velocidad: un fantasma de la IA al 50 % en las celdas del túnel
  const s = atLevel(1, GHOSTMAN("classic"));
  for (const g of s.ghosts) { g.eaten = true; g.inHouse = true; g.respawnTimer = 1e9; }
  const g = s.ghosts[1]; g.eaten = false; g.inHouse = false; g.row = 13; g.col = 3; g.progress = 0; g.direction = "left";
  s.pacman.speed = 0; s.pacman.row = 13; s.pacman.col = 26;
  step(s, 12); // 0,2 s dentro de la celda (13,3) del túnel
  const inTunnel = g.progress;
  const t = atLevel(1, GHOSTMAN("classic"));
  for (const x of t.ghosts) { x.eaten = true; x.inHouse = true; x.respawnTimer = 1e9; }
  const h = t.ghosts[1]; h.eaten = false; h.inHouse = false; h.row = 3; h.col = 13; h.progress = 0; h.direction = "left";
  t.pacman.speed = 0; t.pacman.row = 3; t.pacman.col = 1;
  step(t, 12);
  check(Math.abs(inTunnel - 0.45) < 0.01 && Math.abs(h.progress - 0.9) < 0.01, `en 0,2 s: ${inTunnel.toFixed(3)} celdas en el túnel y ${h.progress.toFixed(3)} fuera (50 %)`);
}
{
  // Pacman en el túnel no se frena
  const s = atLevel(1);
  for (const g of s.ghosts) { g.eaten = true; g.inHouse = true; g.respawnTimer = 1e9; }
  s.pacman.row = 13; s.pacman.col = 3; s.pacman.speed = 4.5;
  step(s, 12, "left");
  check(Math.abs(s.pacman.progress - 0.9) < 0.01, `Pacman en el túnel mantiene su velocidad (${s.pacman.progress.toFixed(3)} celdas en 0,2 s)`);
}
{
  // La IA de Pacman usa el túnel para llegar a una esfera del otro lado
  const s = atLevel(1, GHOSTMAN("classic"));
  for (const g of s.ghosts) { g.eaten = true; g.inHouse = true; g.respawnTimer = 1e9; }
  for (const row of s.map.pellets) row.fill("none");
  s.map.pellets[13][25] = "pellet"; s.map.pellets[29][26] = "pellet"; s.pelletsRemaining = 2;
  s.pacman.row = 13; s.pacman.col = 2; s.pacman.speed = 4.5;
  const visited = [];
  for (let i = 0; i < secs(2) && s.map.pellets[13][25] !== "none"; i++) { step(s, 1); visited.push(s.pacman.col); }
  check(s.map.pellets[13][25] === "none" && visited.includes(0) && visited.includes(27), "la IA de Pacman cruza el túnel para llegar a la esfera de (13,25)");
}
{
  // Contacto a través del borde: Pacman en (13,0) y un fantasma en (13,27) a mitad de celda hacia él
  const s = atLevel(1);
  for (const g of s.ghosts) { g.eaten = true; g.inHouse = true; g.respawnTimer = 1e9; }
  const g = s.ghosts[0]; g.eaten = false; g.inHouse = false; g.row = 13; g.col = 27; g.progress = 0.8; g.direction = "right"; g.speed = 0;
  s.pacman.speed = 0; s.pacman.row = 13; s.pacman.col = 0;
  const lives = s.lives;
  st.updateGameState(s, 0, null);
  check(s.lives === lives - 1, "contacto a través del borde del túnel: Pacman pierde una vida");
}

// ---------- Celdas restringidas (decisión 49)
{
  const s = atLevel(3, GHOSTMAN("naval"));
  const g = st.getPlayerGhost(s);
  // Saltarín: nunca dentro de la base
  const j = atLevel(1, GHOSTMAN("jumper"));
  const jg = st.getPlayerGhost(j);
  const rnd = seeded(5); let inHouse = 0, total = 0;
  for (let i = 0; i < 3000; i++) { jg.row = 11; jg.col = 13; jg.progress = 0; jg.inHouse = false; jg.facing = "down"; jg.powerCooldown = 0; if (tryJumperTeleport(jg, j.map, rnd)) { total++; if (mv.isHouseCell(j.map, jg.row, jg.col)) inHouse++; } }
  check(total > 0 && inHouse === 0, `saltarín sobre la puerta mirando hacia abajo: ${total} saltos, ninguno dentro de la base`);
  // Naval: no coloca en el túnel ni dentro de la base
  g.inHouse = false; g.row = 13; g.col = 2; g.progress = 0;
  check(!tryNavalPlaceFruit(g, s.fakeFruits, s.map) && s.fakeFruits.length === 0, "naval: no coloca una fruta falsa en el túnel");
  g.row = 14; g.col = 13;
  check(!tryNavalPlaceFruit(g, s.fakeFruits, s.map), "naval: no coloca una fruta falsa dentro de la base");
  g.row = 5; g.col = 1;
  check(tryNavalPlaceFruit(g, s.fakeFruits, s.map), "naval: en un pasillo común sí la coloca");
  // Frutas reales y esferas grandes dinámicas del nivel 3, durante 10 minutos de juego simulado
  const f = atLevel(3, GHOSTMAN("classic"));
  for (const x of f.ghosts) { x.eaten = true; x.inHouse = true; x.respawnTimer = 1e9; }
  f.pacman.speed = 0;
  for (const row of f.map.pellets) for (let c = 0; c < row.length; c++) row[c] = "none";
  f.map.pellets[29][26] = "pellet"; f.pelletsRemaining = 1;
  let bad = 0, fruits = 0, dyn = 0;
  for (let i = 0; i < secs(600); i++) {
    st.updateGameState(f, DT, null);
    for (const fr of f.fruits) { fruits++; if (mv.isHouseCell(f.map, fr.row, fr.col) || mv.isTunnelCell(f.map, fr.row, fr.col)) bad++; }
    for (const p of f.dynamicPowerPellets) { dyn++; if (mv.isHouseCell(f.map, p.row, p.col) || mv.isTunnelCell(f.map, p.row, p.col)) bad++; }
    if (f.gameOver) break;
  }
  check(fruits > 0 && dyn > 0 && bad === 0, "frutas reales y esferas grandes dinámicas del nivel 3: nunca en la base ni en el túnel");
}
{
  // Poderes dentro de la base: sin efecto y sin consumir el cooldown
  for (const kind of ["specter", "jumper", "naval", "accelerated"]) {
    const s = st.createInitialGameState(GHOSTMAN(kind), seeded());
    const g = st.getPlayerGhost(s); g.facing = "up";
    step(s, 1, null, true);
    check(g.inHouse && g.powerCooldown === 0 && key(g) === "14,13" && s.fakeFruits.length === 0, `${kind}: dentro de la base el poder no se usa ni consume el cooldown`);
  }
}

// ---------- Jugador quieto (decisión 34)
{
  // El nivel 1 no usa el azar (no hay frutas ni reapariciones con poderes): la partida es determinista.
  const s = st.createInitialGameState(GHOSTMAN("classic"), seeded());
  let t = 0;
  while (!s.gameOver && !s.levelComplete && t < 900) { st.updateGameState(s, DT, null); t += DT; }
  check(st.getPlayerGhost(s).inHouse, "el fantasma del jugador quieto sigue dentro de la base");
  check(s.gameOver && !s.won, `modo GhostMan con el jugador quieto: Pacman completa el nivel 1 y el jugador pierde (a los ${t.toFixed(0)} s, con ${3 - s.lives} derrotas de Pacman)`);
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
