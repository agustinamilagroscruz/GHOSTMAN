// Incremento 26 — ajustes de la prueba de juego de los incrementos 21 a 25 (decisiones 72 y 73).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo
// compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const gh = require(path.join(B, "ghosts.js"));
const mv = require(path.join(B, "movement.js"));
const { LEVELS } = require(path.join(B, "levels.js"));
const { SPRITES } = require(path.join(B, "sprites.js"));
const fr = require(path.join(B, "spriteFrames.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 7) => () => (x = (x * 16807) % 2147483647) / 2147483647;
const step = (s, n, dir = null, power = false) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir, power && i === 0); };
const DIRS = ["up", "down", "left", "right"];
const key = c => `${c.row},${c.col}`;

// ---------- Defecto: el fantasma del jugador que sale de la base sin frenar
for (const kind of ["naval", "accelerated", "specter", "jumper"]) {
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: kind }, seeded());
  const g = st.getPlayerGhost(s);
  step(s, 40, "up");
  step(s, 60, "left"); // gira a la izquierda en (11,13) sin detenerse
  if (kind === "naval") {
    check(!g.inHouse && g.row === 11, `sale de la base y gira sin frenar: deja de estar en la base (en ${key(g)})`);
    step(s, 1, "left", true);
    check(s.fakeFruits.length === 1, "naval: después puede colocar la fruta falsa");
    // Ya afuera, la puerta es un muro para él (decisión 44)
    g.row = 11; g.col = 13; g.progress = 0; g.direction = null;
    step(s, 60, "down");
    check(!g.inHouse && g.row === 11, "y no puede volver a entrar por la puerta");
  } else {
    check(!g.inHouse, `${kind}: también deja de estar en la base`);
  }
}

// ---------- Espectro: muros de una o dos celdas (decisión 72)
const crossings = level => {
  const map = LEVELS[level].createMap();
  const found = { 1: [], 2: [] };
  for (let row = 0; row < map.rows; row++) for (let col = 0; col < map.cols; col++) {
    if (!mv.canEnterCell(map, row, col) || mv.isHouseCell(map, row, col)) continue;
    for (const d of DIRS) {
      const c = gh.phaseCrossing(map, { row, col }, d);
      if (c) found[c.cells - 1].push({ row, col, d, exit: c.exit });
    }
  }
  return { map, found };
};
for (const level of [1, 2, 3]) {
  const { found } = crossings(level);
  check(found[1].length > 0 && found[2].length > 0, `nivel ${level}: ${found[1].length} cruces de un muro de una celda y ${found[2].length} de dos`);
}
{
  const { map, found } = crossings(1);
  const thick = found[2][0];
  const [dRow, dCol] = mv.DIRECTION_VECTORS[thick.d];
  check(map.cells[thick.row + dRow][thick.col + dCol] === "wall" && map.cells[thick.row + 2 * dRow][thick.col + 2 * dCol] === "wall" && key(thick.exit) === key({ row: thick.row + 3 * dRow, col: thick.col + 3 * dCol }),
    `desde (${key(thick)}) hacia ${thick.d}: dos celdas de muro y sale en (${key(thick.exit)})`);
  // Ninguna salida queda en la base, y nunca se cruzan 3 celdas ni el borde
  const all = [...found[1], ...found[2]];
  check(all.every(c => !mv.isHouseCell(map, c.exit.row, c.exit.col)), "ningún cruce termina dentro de la base");
  let three = 0;
  for (let row = 1; row < map.rows - 1; row++) for (let col = 1; col < map.cols - 1; col++) {
    if (!mv.canEnterCell(map, row, col)) continue;
    for (const d of DIRS) {
      const [a, b] = mv.DIRECTION_VECTORS[d];
      const walls = [1, 2, 3].every(k => gh.isPhaseableWall(map, row + a * k, col + b * k));
      if (walls && mv.canEnterCell(map, row + 4 * a, col + 4 * b) && gh.phaseCrossing(map, { row, col }, d)) three++;
    }
  }
  check(three === 0, "un muro de tres celdas no se puede cruzar");
  check(gh.phaseCrossing(map, { row: 1, col: 1 }, "up") === null && gh.phaseCrossing(map, { row: 1, col: 1 }, "left") === null, "el borde del mapa nunca se cruza");

  // El espectro del jugador cruza el muro de dos celdas de punta a punta
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "specter" }, seeded());
  const g = st.getPlayerGhost(s);
  s.ghosts.filter(x => !x.controlledByPlayer).forEach(x => { x.eaten = true; x.inHouse = true; x.respawnTimer = 1e9; });
  s.pacman.speed = 0; s.pacman.row = 29; s.pacman.col = 26; s.pacman.progress = 0;
  g.inHouse = false; g.row = thick.row; g.col = thick.col; g.progress = 0; g.direction = null; g.facing = thick.d; g.powerCooldown = 0;
  step(s, 1, null, true);
  check(g.phaseCellsLeft === 3 && g.powerCooldown > 9.9, "espacio frente a un muro de dos celdas: cruce de 3 celdas (2 de muro y la salida) y cooldown de 10 s");
  let inside = 0;
  for (let i = 0; i < 120 && (g.phaseCellsLeft > 0); i++) { step(s, 1); if (s.map.cells[g.row][g.col] === "wall") inside++; }
  check(key(g) === key(thick.exit) && g.noEatTimer > 2.9, `atraviesa las dos celdas y sale en (${key(thick.exit)}), sin poder comer durante 3 s`);
}
{
  // El espectro de la IA (modo Pacman) también usa los muros de dos celdas
  const { found } = crossings(1);
  let used = false;
  for (const c of found[2]) {
    const s = st.createInitialGameState(undefined, seeded());
    s.ghosts.forEach((x, i) => { if (i > 0) { x.eaten = true; x.inHouse = true; x.respawnTimer = 1e9; } });
    const g = s.ghosts[0];
    g.kind = "specter"; g.inHouse = false; g.row = c.row; g.col = c.col; g.progress = 0; g.direction = c.d; g.facing = c.d; g.powerCooldown = 0;
    s.ghostMode = "chase"; s.ghostModeTimer = 0;
    s.pacman.speed = 0; s.pacman.row = c.exit.row; s.pacman.col = c.exit.col; s.pacman.progress = 0;
    step(s, 1);
    used = g.phaseCellsLeft === 3;
    if (used) break;
  }
  check(used, "modo Pacman: el espectro de la IA atraviesa un muro de dos celdas para llegar a Pacman");
}

// ---------- Líneas de velocidad del acelerado del lado del que viene (decisión 73)
{
  const name = d => fr.ghostSpriteName("accelerated", false, 3, 5, d);
  check(name("up").startsWith("ghost_accelerated_up_") && name("down").startsWith("ghost_accelerated_down_") && /^ghost_accelerated_\d$/.test(name("left")) && /^ghost_accelerated_\d$/.test(name("right")),
    "sprites del acelerado: uno para cuando sube, otro para cuando baja y el de costado");
  const linesRows = s => SPRITES[s].rows.map((r, y) => (r.includes("d") ? y : -1)).filter(y => y >= 0);
  const bodyRows = s => SPRITES[s].rows.map((r, y) => (r.includes("b") ? y : -1)).filter(y => y >= 0);
  const up = "ghost_accelerated_up_0", down = "ghost_accelerated_down_0";
  check(Math.min(...linesRows(up)) > Math.max(...bodyRows(up)), "subiendo, las líneas quedan debajo del cuerpo");
  check(Math.max(...linesRows(down)) < Math.min(...bodyRows(down)), "bajando, las líneas quedan arriba del cuerpo");
  check(fr.ghostSpriteName("accelerated", true, 3, 5, "up").startsWith("ghost_vulnerable_"), "vulnerable, sin líneas (igual que todos)");
  // Los ojos siguen cayendo sobre el cuerpo en las variantes nuevas
  for (const body of ["ghost_accelerated_up_0", "ghost_accelerated_up_1", "ghost_accelerated_down_0", "ghost_accelerated_down_1"]) {
    const b = SPRITES[body];
    const bad = DIRS.filter(d => {
      const e = SPRITES[`eyes_${d}`];
      return e.rows.some((r, y) => [...r].some((ch, x) => ch !== "." && b.rows[y - e.ay + b.ay]?.[x - e.ax + b.ax] !== "b"));
    });
    check(bad.length === 0, `${body}: los ojos caen dentro del cuerpo`);
  }
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
