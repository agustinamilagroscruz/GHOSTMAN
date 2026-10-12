// Incremento 15 — dash del acelerado (HU-31).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { isPowerReady } = require(path.join(B, "powers.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 5) => () => (x = (x * 16807) % 2147483647) / 2147483647;
function setup() {
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "accelerated" }, seeded());
  for (const g of s.ghosts) if (!g.controlledByPlayer) { g.eaten = true; g.respawnTimer = 1e9; }
  s.pacman.speed = 0; s.pacman.row = 13; s.pacman.col = 8; s.pacman.progress = 0; s.pacman.direction = null;
  return [s, st.getPlayerGhost(s)];
}
const step = (s, n, dir = null, power = false) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir, power && i === 0); };
const place = (g, r, c, facing) => { g.row = r; g.col = c; g.progress = 0; g.direction = null; g.facing = facing; };

// 3, 2, 1 y 0 celdas libres (fila 1 del nivel 1: camino hasta la columna 15)
for (const [startCol, expected] of [[11, 3], [13, 2], [14, 1], [15, 0]]) {
  const [s, g] = setup();
  place(g, 1, startCol, "right");
  step(s, 1, null, true);
  const moved = g.col - startCol;
  check(g.row === 1 && moved === expected, `desde (1,${startCol}) con ${expected} celdas libres: avanza ${moved}`);
  if (expected === 0) check(g.powerCooldown === 0 && g.slowTimer === 0 && g.speed === 5, "  0 celdas: sin cooldown ni penalidad");
  else check(g.powerCooldown > 9.9 && Math.abs(g.speed - 2.5) < 1e-9, "  cooldown de 10 s y velocidad 2,5 celdas/s");
}
{
  // Nunca sale del mapa ni entra a un muro: dash contra el borde en las cuatro direcciones
  const [s, g] = setup();
  let bad = 0;
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) for (const f of ["up", "down", "left", "right"]) {
    if (s.map.cells[r][c] !== "path") continue;
    place(g, r, c, f); g.powerCooldown = 0;
    const { tryAcceleratedDash } = require(path.join(B, "powers.js"));
    tryAcceleratedDash(g, s.map);
    if (g.row < 0 || g.row >= s.map.rows || g.col < 0 || g.col >= s.map.cols || s.map.cells[g.row][g.col] !== "path") bad++;
    if (Math.abs(g.row - r) + Math.abs(g.col - c) > 3) bad++;
  }
  check(bad === 0, "dash desde todas las celdas y direcciones: nunca un muro, nunca fuera del mapa, nunca más de 3");
}
{
  // Recién aparecido, sin dirección de avance
  const [s, g] = setup();
  place(g, 1, 1, null);
  step(s, 1, null, true);
  check(g.row === 1 && g.col === 1 && g.powerCooldown === 0, "sin dirección de avance: no hay desplazamiento ni cooldown");
}
{
  // Penalidad: 5 s al 50 %, después vuelve a 5 celdas/s; cooldown hasta los 10 s
  const [s, g] = setup();
  place(g, 4, 1, "right");
  step(s, 1, null, true);
  step(s, Math.round(4.9 / DT));
  check(Math.abs(g.speed - 2.5) < 1e-9, "a los 4,9 s sigue al 50 %");
  step(s, Math.round(0.2 / DT));
  check(g.speed === 5 && g.slowTimer === 0, "a los 5,1 s recupera 5 celdas/s");
  check(isPowerReady(g) === false, "a los 5,1 s el poder sigue en cooldown");
  step(s, Math.round(4.9 / DT) - 1);
  check(isPowerReady(g) === true, "a los 10 s el poder vuelve a estar disponible");
  // medir la velocidad real durante la penalidad
  const [s2, g2] = setup();
  place(g2, 4, 1, "right"); step(s2, 1, null, true); // dash a (4,4)
  const c0 = g2.col; step(s2, 60, "right");
  check(Math.abs(g2.col + g2.progress - c0 - 2.5) < 0.05, `desplazamiento real en 1 s de penalidad: ${(g2.col + g2.progress - c0).toFixed(2)} celdas`);
}
{
  // Dash que pasa por encima de Pacman y termina más allá
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 6;
  place(g, 1, 4, "right"); // termina en (1,7)
  step(s, 1, null, true);
  check(s.lives === 2 && s.scoreBreakdown.pacmanDefeats === 500, "pasa por encima de Pacman (1,6) y termina en (1,7): Pacman pierde una vida");
}
{
  // Pacman a mitad de camino entre dos celdas del trayecto
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 5; s.pacman.direction = "right"; s.pacman.progress = 0.5; // en 5,5
  place(g, 1, 3, "right"); // trayecto 3→6
  step(s, 1, null, true);
  check(s.lives === 2, "Pacman entre dos celdas del trayecto (1,5½): también es contacto");
}
{
  // Termina exactamente sobre Pacman
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 7;
  place(g, 1, 4, "right");
  step(s, 1, null, true);
  check(s.lives === 2, "termina sobre Pacman: pierde una vida");
}
{
  // Pacman fuera del trayecto, en la fila de al lado
  const [s, g] = setup();
  s.pacman.row = 4; s.pacman.col = 5;
  place(g, 1, 3, "right");
  step(s, 1, null, true);
  check(s.lives === 3, "Pacman fuera del trayecto: no hay contacto");
}
{
  // Con el PowerUp: el fantasma vulnerable que pasa por Pacman es comido, Pacman no pierde vidas
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 6;
  s.powerUpActive = true; s.powerUpTimer = 6; g.vulnerable = true;
  place(g, 1, 4, "right");
  step(s, 1, null, true);
  check(g.eaten && s.lives === 3, "con PowerUp: el acelerado vulnerable que pasa por Pacman es comido");
}
{
  // La penalidad y el cooldown siguen corriendo mientras está comido
  const [s, g] = setup();
  place(g, 4, 1, "right"); step(s, 1, null, true);
  g.eaten = true; g.respawnTimer = 5;
  step(s, Math.round(5.1 / DT));
  check(g.slowTimer === 0 && g.speed === 5 && g.powerCooldown > 4.8 && g.powerCooldown < 5, "comido: la penalidad termina y el cooldown sigue corriendo");
}
{
  // Penalidad después de una derrota de Pacman: se conserva, igual que el cooldown
  const [s, g] = setup();
  place(g, 4, 1, "right"); step(s, 1, null, true);
  g.row = s.pacman.row; g.col = s.pacman.col; step(s, 1);
  check(s.lives === 2 && g.slowTimer > 4.9 && Math.abs(g.speed - 2.5) < 1e-9, "derrota de Pacman: la penalidad en curso se conserva");
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
