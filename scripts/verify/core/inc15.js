// Incremento 15 — dash del acelerado (HU-31).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { isPowerReady } = require(path.join(B, "powers.js"));
const { neighborCell } = require(path.join(B, "movement.js"));
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
// Fuera de la base desde el incremento 19: dentro, el poder no se puede usar.
/** Barra espaciadora y los cuadros que dura el impulso (0,25 s desde el incremento 20; antes era instantáneo). */
const dash = (s) => { step(s, 1, null, true); step(s, 16); };
const place = (g, r, c, facing) => { g.row = r; g.col = c; g.progress = 0; g.direction = null; g.facing = facing; g.inHouse = false; };

// Coordenadas sobre el nivel 1 de la V3 (incremento 19): la fila 1 es camino de la columna 7 a
// la 20, y la fila 5 de la 1 a la 26.
// 3, 2, 1 y 0 celdas libres (fila 1 del nivel 1: camino hasta la columna 20)
for (const [startCol, expected] of [[17, 3], [18, 2], [19, 1], [20, 0]]) {
  const [s, g] = setup();
  place(g, 1, startCol, "right");
  g.speed = 0; // quieto al terminar el impulso, para medir solo el impulso
  dash(s);
  const moved = g.col - startCol;
  check(g.row === 1 && moved === expected, `desde (1,${startCol}) con ${expected} celdas libres: avanza ${moved}`);
  if (expected === 0) check(g.powerCooldown === 0 && g.slowTimer === 0, "  0 celdas: sin cooldown ni penalidad");
  else check(g.powerCooldown > 9.6 && Math.abs(g.speed - 1.875) < 1e-9, "  cooldown de 10 s y velocidad 1,875 celdas/s al terminar el impulso");
}
{
  // Nunca sale del mapa ni entra a un muro: dash contra el borde en las cuatro direcciones
  const [s, g] = setup();
  let bad = 0;
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) for (const f of ["up", "down", "left", "right"]) {
    if (s.map.cells[r][c] !== "path") continue;
    place(g, r, c, f); g.powerCooldown = 0;
    const { tryAcceleratedDash } = require(path.join(B, "powers.js"));
    if (tryAcceleratedDash(g, s.map)) {
      // Desde el incremento 20 el impulso se recorre en los cuadros siguientes: se calcula la llegada.
      for (let k = g.dashCellsLeft; k > 0; k--) { const n = neighborCell(s.map, g.row, g.col, f); g.row = n.row; g.col = n.col; }
      g.dashCellsLeft = 0;
    }
    if (g.row < 0 || g.row >= s.map.rows || g.col < 0 || g.col >= s.map.cols || s.map.cells[g.row][g.col] !== "path") bad++;
    // Por el túnel la distancia se cuenta por el borde (incremento 19).
    const dc = Math.abs(g.col - c);
    if (Math.abs(g.row - r) + Math.min(dc, s.map.cols - dc) > 3) bad++;
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
  place(g, 5, 1, "right");
  dash(s); // la penalidad arranca al terminar el impulso
  step(s, Math.round(4.9 / DT));
  check(Math.abs(g.speed - 1.875) < 1e-9, "a los 4,9 s sigue al 50 %");
  step(s, Math.round(0.2 / DT));
  check(g.speed === 3.75 && g.slowTimer === 0, "a los 5,1 s recupera 3,75 celdas/s");
  check(isPowerReady(g) === false, "a los 5,1 s el poder sigue en cooldown");
  step(s, Math.round(4.9 / DT) - 1);
  check(isPowerReady(g) === true, "a los 10 s el poder vuelve a estar disponible");
  // medir la velocidad real durante la penalidad
  const [s2, g2] = setup();
  place(g2, 5, 1, "right"); dash(s2); // impulso hasta (5,4)
  const c0 = g2.col + g2.progress; step(s2, 60, "right");
  check(Math.abs(g2.col + g2.progress - c0 - 1.875) < 0.05, `desplazamiento real en 1 s de penalidad: ${(g2.col + g2.progress - c0).toFixed(2)} celdas`);
}
{
  // Dash que pasa por encima de Pacman y termina más allá
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 12;
  place(g, 1, 10, "right"); // termina en (1,13)
  dash(s);
  check(s.lives === 2 && s.scoreBreakdown.pacmanDefeats === 500, "pasa por encima de Pacman (1,12) y termina en (1,13): Pacman pierde una vida");
}
{
  // Pacman a mitad de camino entre dos celdas del trayecto
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 11; s.pacman.direction = "right"; s.pacman.progress = 0.5; // en 11,5
  place(g, 1, 9, "right"); // trayecto 9→12
  dash(s);
  check(s.lives === 2, "Pacman entre dos celdas del trayecto (1,11½): también es contacto");
}
{
  // Termina exactamente sobre Pacman
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 13;
  place(g, 1, 10, "right");
  dash(s);
  check(s.lives === 2, "termina sobre Pacman: pierde una vida");
}
{
  // Pacman fuera del trayecto, en la fila de al lado
  const [s, g] = setup();
  s.pacman.row = 3; s.pacman.col = 11;
  place(g, 1, 9, "right");
  dash(s);
  check(s.lives === 3, "Pacman fuera del trayecto: no hay contacto");
}
{
  // Con el PowerUp: el fantasma vulnerable que pasa por Pacman es comido, Pacman no pierde vidas
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 12;
  s.powerUpActive = true; s.powerUpTimer = 6; g.vulnerable = true;
  place(g, 1, 10, "right");
  dash(s);
  check(g.eaten && s.lives === 3, "con PowerUp: el acelerado vulnerable que pasa por Pacman es comido");
}
{
  // La penalidad y el cooldown siguen corriendo mientras está comido
  const [s, g] = setup();
  place(g, 5, 1, "right"); dash(s);
  g.eaten = true; g.respawnTimer = 5;
  step(s, Math.round(5.1 / DT));
  // Cooldown esperado: 10 s menos los 17 cuadros de dash(s) y los 5,1 s comido.
  check(g.slowTimer === 0 && g.speed === 3.75 && Math.abs(g.powerCooldown - (10 - 17 * DT - 5.1)) < 0.03, `comido: la penalidad termina y el cooldown sigue corriendo (${g.powerCooldown.toFixed(2)} s)`);
}
{
  // Penalidad después de una derrota de Pacman: se conserva, igual que el cooldown
  const [s, g] = setup();
  place(g, 5, 1, "right"); dash(s);
  g.row = s.pacman.row; g.col = s.pacman.col; step(s, 1);
  check(s.lives === 2 && g.slowTimer > 4.9 && Math.abs(g.speed - 1.875) < 1e-9, "derrota de Pacman: la penalidad en curso se conserva");
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
