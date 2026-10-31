// Incremento 20 — impulso del acelerado: recorre sus celdas en 0,25 s en lugar de teletransportarse
// (HU-31, HU-49; decisión 54). Suite del núcleo, sin navegador. Se corre con `npm run verify`
// (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { isDashing, DASH_SPEED } = require(path.join(B, "ghosts.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 5) => () => (x = (x * 16807) % 2147483647) / 2147483647;
// Coordenadas sobre el nivel 1 de la V3: la fila 1 es camino de la columna 7 a la 20, y la fila
// 13 es el túnel (columnas 0 a 3 y 24 a 27).
function setup() {
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "accelerated" }, seeded());
  for (const g of s.ghosts) if (!g.controlledByPlayer) { g.eaten = true; g.inHouse = true; g.respawnTimer = 1e9; }
  s.pacman.speed = 0; s.pacman.row = 29; s.pacman.col = 26; s.pacman.progress = 0; s.pacman.direction = null;
  const g = st.getPlayerGhost(s);
  return [s, g];
}
const place = (g, r, c, facing) => { g.row = r; g.col = c; g.progress = 0; g.direction = null; g.facing = facing; g.inHouse = false; };
const press = (s, dir = null) => st.updateGameState(s, DT, dir, true);
const step = (s, dir = null) => st.updateGameState(s, DT, dir, false);

{
  // Duración y avance por cuadro
  const [s, g] = setup();
  place(g, 1, 17, "right");
  press(s);
  check(isDashing(g) && g.dashCellsLeft === 3 && g.powerCooldown > 9.9, "espacio: arranca un impulso de 3 celdas y el cooldown de 10 s");
  check(Math.abs(g.progress - DASH_SPEED * DT) < 1e-9 && g.col === 17, `en el primer cuadro avanza ${(g.progress).toFixed(2)} celdas (12 celdas/s), no aparece en el destino`);
  check(g.slowTimer === 0 && g.speed === 3.75, "durante el impulso todavía no hay penalidad");
  let frames = 1, steered = false;
  while (isDashing(g) && frames < 60) { step(s, "up"); frames++; if (g.row !== 1) steered = true; }
  check(frames === 15 && g.col === 20, `recorre las 3 celdas en ${frames} cuadros (0,25 s) y llega a (1,20)`);
  check(!steered, "durante el impulso no obedece al teclado (se pidió ↑ en todo el trayecto)");
  check(g.slowTimer === 5 && Math.abs(g.speed - 1.875) < 1e-9, "al terminar arranca la penalidad: 5 s al 50 %");
  check(g.direction === null, "llega contra el muro de (1,21): queda detenido");
}
{
  // Contacto en el trayecto: Pacman pierde la vida antes de que el impulso termine
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 12;
  place(g, 1, 10, "right");
  press(s);
  let frames = 1;
  while (s.lives === 3 && frames < 30) { step(s); frames++; }
  check(s.lives === 2 && frames < 15, `Pacman en (1,12), en el medio del trayecto: pierde una vida en el cuadro ${frames}, antes del final del impulso`);
  check(!isDashing(g) && g.row === g.spawn.row && g.col === g.spawn.col && g.slowTimer > 4.9, "el reinicio del nivel corta el impulso y la penalidad igual arranca");
}
{
  // Pacman que viene de frente: el contacto se detecta aunque los dos se muevan rápido. Pacman (IA)
  // está a mitad de celda yendo hacia el acelerado, en 11,4: hasta llegar a (1,11) no decide.
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 12; s.pacman.progress = 0.6; s.pacman.speed = 3.75; s.pacman.direction = "left";
  place(g, 1, 10, "right");
  press(s);
  let frames = 1;
  for (; frames < 20 && s.lives === 3; frames++) step(s);
  check(s.lives === 2 && frames <= 6, `Pacman que viene de frente: hay contacto (cuadro ${frames})`);
}
{
  // Vulnerable: Pacman se lo come y el impulso se corta
  const [s, g] = setup();
  s.pacman.row = 1; s.pacman.col = 12;
  s.powerUpActive = true; s.powerUpTimer = 6; g.vulnerable = true;
  place(g, 1, 10, "right");
  press(s);
  for (let i = 0; i < 20 && !g.eaten; i++) step(s);
  check(g.eaten && s.lives === 3 && !isDashing(g), "vulnerable: Pacman se lo come en el trayecto y el impulso se corta");
  check(g.slowTimer > 4.8, "la penalidad arranca igual al cortarse el impulso");
}
{
  // Túnel: el impulso cruza el borde y no se frena
  const [s, g] = setup();
  place(g, 13, 1, "left");
  press(s);
  const cells = [];
  let frames = 1;
  while (isDashing(g) && frames < 60) { step(s); frames++; cells.push(`${g.row},${g.col}`); }
  check(frames === 15 && g.row === 13 && g.col === 26 && cells.includes("13,0") && cells.includes("13,27"), `por el túnel: de (13,1) a (13,26) cruzando el borde, en ${frames} cuadros (sin la reducción del túnel)`);
}
{
  // Sin celdas libres adelante: no hay impulso
  const [s, g] = setup();
  place(g, 1, 20, "right");
  press(s);
  check(!isDashing(g) && g.powerCooldown === 0 && g.col === 20, "contra el muro: no hay impulso ni cooldown");
}
{
  // Durante el impulso no se puede usar otra vez el poder (el cooldown ya corre) ni invertir la marcha
  const [s, g] = setup();
  place(g, 1, 10, "right");
  press(s); press(s);
  check(g.dashCellsLeft === 3 && g.col === 10, "un segundo espacio durante el impulso no cambia nada");
}

// Modo Pacman: el acelerado de la IA
{
  const s = st.createInitialGameState(undefined, seeded(7));
  while (s.level < 3) { s.levelComplete = true; s.levelTransitionTimer = 0.001; st.updateGameState(s, DT, null); }
  s.ghosts.forEach((g, i) => { if (i > 0) { g.eaten = true; g.inHouse = true; g.respawnTimer = 1e9; } });
  const g = s.ghosts[0];
  g.kind = "accelerated"; g.speed = 3.75 * 0.85;
  g.row = 19; g.col = 4; g.progress = 0; g.direction = "right"; g.facing = "right"; g.powerCooldown = 0; g.inHouse = false;
  s.ghostMode = "chase"; s.ghostModeTimer = 0; s.fruits = []; s.fruitSpawnTimer = -1e9;
  s.pacman.speed = 0; s.pacman.row = 19; s.pacman.col = 9; // a 5 celdas por la fila 19 del nivel 3
  st.updateGameState(s, DT, null);
  check(isDashing(g) && g.powerCooldown > 9.9, "modo Pacman: con Pacman a 5 celdas la IA arranca el impulso");
  // Un cambio de persecución a dispersión durante el impulso no lo invierte
  s.ghostModeTimer = 19.999;
  const dir = g.direction;
  st.updateGameState(s, DT, null);
  check(s.ghostMode === "scatter" && isDashing(g) && g.direction === dir, "el cambio de persecución a dispersión no invierte a un acelerado que se impulsa");
  let frames = 2;
  while (isDashing(g) && frames < 60) { st.updateGameState(s, DT, null); frames++; }
  // La IA activa el poder al final del cuadro, después de moverse: el impulso avanza desde el siguiente.
  check(frames === 16 && g.row === 19 && g.col === 7 && s.lives === 3, `modo Pacman: el impulso dura ${frames - 1} cuadros y termina en (19,7), a 2 celdas de Pacman`);
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
