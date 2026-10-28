// Incremento 13 — espectro, saltarín e indicador de poder (HU-28, HU-29, HU-32).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { canGhostHarm, isPhasing } = require(path.join(B, "ghosts.js"));
const { isPowerReady } = require(path.join(B, "powers.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 5) => () => (x = (x * 16807) % 2147483647) / 2147483647;
function setup(kind, level = 1, seed) {
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: kind }, seeded(seed));
  if (level > 1) { s.level = level - 1; s.levelComplete = true; s.levelTransitionTimer = 0.001; st.updateGameState(s, DT, null); }
  for (const g of s.ghosts) if (!g.controlledByPlayer) { g.eaten = true; g.respawnTimer = 1e9; }
  s.pacman.speed = 0; s.pacman.row = 13; s.pacman.col = 8; s.pacman.progress = 0; s.pacman.direction = null;
  return [s, st.getPlayerGhost(s)];
}
const step = (s, n, dir = null, power = false) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir, power && i === 0); };
const place = (g, r, c) => { g.row = r; g.col = c; g.progress = 0; g.direction = null; };

// ---------- Espectro (nivel 2: muros de una celda)
{
  const [s, g] = setup("specter", 2);
  place(g, 1, 6);
  step(s, 30, "right"); // avanza a (1,7) y queda detenido contra el muro (1,8)
  check(g.row === 1 && g.col === 7 && g.direction === null && g.facing === "right", "detenido contra el muro conserva la dirección de avance");
  step(s, 1, "right", true);
  check(g.powerCooldown > 9.9 && isPhasing(g), "espacio: empieza el cruce y arranca el cooldown de 10 s");
  let harmlessAll = true, t = 0;
  while (isPhasing(g) && t < 2) { if (canGhostHarm(g)) harmlessAll = false; step(s, 1, "up"); t += DT; }
  check(g.row === 1 && g.col === 9, `sale del otro lado del muro, en (1,9) (está en ${g.row},${g.col})`);
  check(harmlessAll, "durante el cruce no puede derrotar a Pacman");
  check(Math.abs(g.noEatTimer - 3) < 0.05 && !canGhostHarm(g), "al salir: 3 s sin poder derrotar a Pacman");
  step(s, 3.05 / DT);
  check(canGhostHarm(g), "pasados los 3 s vuelve a poder derrotar a Pacman");
  // cooldown: intento a los ~3,3 s sin efecto, disponible exactamente a los 10 s
  place(g, 1, 7); g.facing = "right";
  step(s, 1, null, true);
  check(!isPhasing(g) && isPowerReady(g) === false, "espacio durante el cooldown: sin efecto");
  const tLeft = g.powerCooldown;
  step(s, Math.floor(tLeft / DT) - 1);
  check(isPowerReady(g) === false, `a ${(g.powerCooldown).toFixed(3)} s del final sigue en cooldown`);
  step(s, 2);
  check(isPowerReady(g) === true, "al terminar el cooldown vuelve a estar disponible");
}
{
  // En movimiento hacia el muro: termina de llegar y lo cruza
  const [s, g] = setup("specter", 2);
  place(g, 1, 5); g.facing = "right";
  step(s, 8, "right"); // a mitad de camino hacia (1,6)
  check(g.progress > 0 && g.row === 1 && g.col === 5, "a mitad de celda hacia la derecha");
  step(s, 1, "right", true); // muro contiguo a la celda de llegada (1,6)? (1,7) es camino → no hay muro
  check(g.powerCooldown === 0 && !g.phasePending, "si el muro no es contiguo a la celda de llegada, no se consume");
  place(g, 1, 6); g.facing = "right"; step(s, 6, "right");
  check(g.progress > 0 && g.col === 6, "a mitad de celda llegando a (1,7), contigua al muro");
  step(s, 1, "right", true);
  let t = 0; while ((g.phasePending || isPhasing(g)) && t < 2) { step(s, 1, "left"); t += DT; }
  check(g.row === 1 && g.col === 9 && g.powerCooldown > 8.5, `en movimiento: termina de llegar, cruza el muro y sale en (1,9), sin obedecer el teclado en el trayecto (${g.row},${g.col},${g.powerCooldown.toFixed(2)})`);
}
{
  // Sin destino válido: borde del mapa y muro grueso
  const [s, g] = setup("specter", 2);
  place(g, 1, 3); g.facing = "up";
  step(s, 1, null, true);
  check(g.powerCooldown === 0 && !isPhasing(g) && g.row === 1, "contra el borde del mapa: no cruza y no consume el cooldown");
  const [s2, g2] = setup("specter", 2);
  place(g2, 1, 1); // recién aparecido, nunca se movió
  g2.facing = null;
  step(s2, 1, null, true);
  check(g2.powerCooldown === 0, "sin dirección de avance (recién aparecido): sin efecto");
}
{
  // Nivel 1: ningún cruce válido (decisión 26)
  const [s, g] = setup("specter", 1);
  let valid = 0;
  const { trySpecterPhase } = require(path.join(B, "powers.js"));
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) for (const f of ["up", "down", "left", "right"]) {
    if (s.map.cells[r][c] !== "path") continue;
    place(g, r, c); g.facing = f; g.powerCooldown = 0; g.phaseCellsLeft = 0;
    if (trySpecterPhase(g, s.map)) valid++;
  }
  check(valid === 0, `nivel 1: ningún cruce válido para el espectro (decisión 26) — ${valid}`);
}

// ---------- Saltarín
{
  const [s, g] = setup("jumper", 2, 99);
  let bad = 0, maxD = 0, same = 0;
  const cells = [];
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) if (s.map.cells[r][c] === "path") cells.push([r, c]);
  const { tryJumperTeleport } = require(path.join(B, "powers.js"));
  const rnd = seeded(123);
  for (let i = 0; i < 200; i++) {
    const [r, c] = cells[i % cells.length];
    place(g, r, c); g.powerCooldown = 0;
    tryJumperTeleport(g, s.map, rnd);
    const d = Math.abs(g.row - r) + Math.abs(g.col - c);
    if (g.row < 0 || g.row >= s.map.rows || g.col < 0 || g.col >= s.map.cols || s.map.cells[g.row][g.col] !== "path") bad++;
    if (d === 0) same++;
    maxD = Math.max(maxD, d);
  }
  check(bad === 0 && same === 0 && maxD <= 10, `200 saltos: ninguno a un muro, fuera del mapa ni a la misma celda; distancia máxima ${maxD} ≤ 10`);
  // Uniformidad aproximada desde una celda
  place(g, 7, 8);
  // Azar con semilla fija: la prueba es determinista y no puede fallar por mala suerte.
  const counts = {}; const N = 60000; const rnd3 = seeded(12345);
  for (let i = 0; i < N; i++) { place(g, 7, 8); tryJumperTeleport(g, s.map, rnd3); const k = g.row + "," + g.col; counts[k] = (counts[k] || 0) + 1; }
  const vals = Object.values(counts); const e = N / vals.length; const df = vals.length - 1;
  const chi = vals.reduce((a, o) => a + (o - e) ** 2 / e, 0); const limit = df + 2.33 * Math.sqrt(2 * df);
  check(chi < limit, `distribución uniforme (chi² ${chi.toFixed(1)} < ${limit.toFixed(0)}, ${vals.length} destinos, ${N} saltos)`);
}
{
  const [s, g] = setup("jumper", 1);
  place(g, 1, 1);
  step(s, 1, null, true);
  check(g.powerCooldown > 9.9 && !(g.row === 1 && g.col === 1), "saltarín: espacio teletransporta y arranca el cooldown de 10 s");
  const pos = `${g.row},${g.col}`;
  step(s, 60, null, true);
  check(`${g.row},${g.col}` === pos, "saltarín: espacio durante el cooldown sin efecto");
  // El cooldown sobrevive a una derrota de Pacman
  const cd = g.powerCooldown;
  g.row = s.pacman.row; g.col = s.pacman.col; g.progress = 0;
  step(s, 1);
  check(s.lives === 2 && Math.abs(g.powerCooldown - (cd - DT)) < 1e-6, `el cooldown sobrevive a la derrota de Pacman (${g.powerCooldown.toFixed(2)} s)`);
}
{
  // Salto sobre Pacman: derrota sin PowerUp. Se fuerza el azar para caer en la celda de Pacman.
  const [s, g] = setup("jumper", 1);
  s.pacman.row = 4; s.pacman.col = 3;
  place(g, 4, 1); g.facing = "right";
  const { tryJumperTeleport } = require(path.join(B, "powers.js"));
  // buscar un valor de azar que elija (4,3)
  let hit = null;
  for (let k = 0; k < 400 && !hit; k++) { const v = (k + 0.5) / 400; place(g, 4, 1); tryJumperTeleport(g, s.map, () => v); if (g.row === 4 && g.col === 3) hit = v; }
  place(g, 4, 1); g.facing = "right"; g.powerCooldown = 0; s.random = () => hit;
  step(s, 1, null, true);
  check(s.lives === 2 && s.score === 500, "salto sobre Pacman sin PowerUp: Pacman pierde una vida");
}

// ---------- Indicador y otros tipos
{
  const [s, g] = setup("classic", 1);
  check(isPowerReady(g) === null, "clásico: sin indicador de estrella");
  place(g, 1, 1); g.facing = "right";
  step(s, 1, null, true);
  check(g.powerCooldown === 0 && g.row === 1 && g.col === 1, "clásico: la barra espaciadora no hace nada");
  const [, g2] = setup("jumper", 1);
  check(isPowerReady(g2) === true, "saltarín al empezar: estrella disponible");
}
{
  // Comido: no puede usar el poder
  const [s, g] = setup("jumper", 1);
  g.eaten = true; g.respawnTimer = 3;
  step(s, 1, null, true);
  check(g.powerCooldown === 0, "comido: el poder no se puede activar");
}
{
  // Nivel nuevo: el poder arranca disponible
  const [s] = setup("jumper", 1);
  step(s, 1, null, true);
  s.levelComplete = true; s.levelTransitionTimer = 0.001; step(s, 1);
  check(st.getPlayerGhost(s).powerCooldown === 0, "al empezar un nivel nuevo el poder está disponible");
}
{
  // Pausa: la tecla no se registra (lo filtra el input) y el cooldown no corre
  const [s, g] = setup("specter", 2);
  g.powerCooldown = 5; s.paused = true;
  step(s, 120, null, true);
  check(g.powerCooldown === 5, "en pausa el cooldown no corre");
}
{
  // Modo Pacman: la barra espaciadora no cambia nada (HU-21)
  const trace = power => { const s = st.createInitialGameState(undefined, seeded(3)); const out = []; for (let i = 0; i < 1200; i++) { st.updateGameState(s, DT, i % 200 < 100 ? "left" : "up", power && i % 10 === 0); if (i % 50 === 0) out.push(JSON.stringify([s.pacman.row, s.pacman.col, s.score, s.ghosts.map(g => [g.row, g.col, g.powerCooldown])])); } return out.join("|"); };
  check(trace(true) === trace(false), "modo Pacman: con y sin barra espaciadora la partida es idéntica");
}

{
  // El cooldown sigue corriendo mientras el fantasma del jugador está comido (decisión 35)
  const [s, g] = setup("jumper", 1);
  g.powerCooldown = 8; g.eaten = true; g.respawnTimer = 5;
  step(s, 120);
  check(Math.abs(g.powerCooldown - 6) < 1e-6, `comido: el cooldown sigue corriendo (8 → ${g.powerCooldown.toFixed(3)} en 2 s)`);
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
