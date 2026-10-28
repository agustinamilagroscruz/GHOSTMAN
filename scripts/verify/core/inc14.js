// Incremento 14 — frutas falsas del naval y explosión (HU-30).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { explosionCells } = require(path.join(B, "fakeFruits.js"));
const { isPowerReady } = require(path.join(B, "powers.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 5) => () => (x = (x * 16807) % 2147483647) / 2147483647;
function setup(level = 1) {
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "naval" }, seeded());
  if (level > 1) { s.level = level - 1; s.levelComplete = true; s.levelTransitionTimer = 0.001; st.updateGameState(s, DT, null); }
  for (const g of s.ghosts) if (!g.controlledByPlayer) { g.eaten = true; g.respawnTimer = 1e9; }
  s.pacman.speed = 0; s.pacman.row = 13; s.pacman.col = 8; s.pacman.progress = 0; s.pacman.direction = null;
  return [s, st.getPlayerGhost(s)];
}
const step = (s, n, dir = null, power = false) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir, power && i === 0); };
const place = (g, r, c) => { g.row = r; g.col = c; g.progress = 0; g.direction = null; };
const secs = t => Math.round(t / DT);

// Línea de tiempo del prompt
{
  const [s, g] = setup();
  place(g, 1, 3);
  step(s, 1, null, true); // t=0
  check(s.fakeFruits.length === 1 && s.fakeFruits[0].row === 1 && s.fakeFruits[0].col === 3 && isPowerReady(g) === false, "t=0: coloca una fruta en su celda y arranca el cooldown de 5 s");
  step(s, secs(3) - 1);
  place(g, 4, 3); step(s, 1, null, true); // t=3
  check(s.fakeFruits.length === 1, "t=3: intento sin efecto (cooldown)");
  step(s, secs(2) - 1);
  place(g, 7, 3); step(s, 1, null, true); // t=5
  check(s.fakeFruits.length === 2, "t=5: coloca la segunda");
  step(s, secs(5) - 2);
  place(g, 10, 3);
  check(s.fakeFruits.length === 2 && g.powerCooldown > 0 && g.powerCooldown < 0.05, "t≈10: siguen 2 frutas y al cooldown le quedan instantes");
  // En t=10 coinciden el fin del cooldown y la explosión de la primera (así está planteada la línea
  // de tiempo). Para aislar la regla del máximo de 2, el intento se hace sin cooldown.
  g.powerCooldown = 0;
  step(s, 1, null, true); // t=10: intento con 2 en el mapa, y la primera explota
  check(s.fakeFruits.length === 1 && s.fakeFruits[0].row === 7, "t=10: la primera explota y queda una sola");
  check(g.powerCooldown === 0 && !s.fakeFruits.some(f => f.row === 10), "t=10: el intento no tuvo efecto (había 2) y no consumió el poder");
  check(s.explosions.length === 1, "la explosión se registra para dibujarse");
  check(s.lives === 3, "Pacman lejos de la explosión: no pierde vidas");
}

// Forma del radio junto a una pared (nivel 2, muro de una celda en (1,8))
{
  const [s] = setup(2);
  const cells = explosionCells(s.map, 1, 7).map(c => `${c.row},${c.col}`);
  check(!cells.includes("1,8") && !cells.includes("1,9"), "no atraviesa el muro (1,8): (1,9) queda afuera aunque esté a 2 celdas en línea recta");
  check(cells.includes("1,4") && !cells.includes("1,3"), "por el pasillo llega exactamente a 3 pasos");
  check(cells.every(c => { const [r, cc] = c.split(",").map(Number); return s.map.cells[r][cc] === "path"; }), "todas las celdas alcanzadas son transitables");
  check(cells.every(c => { const [r, cc] = c.split(",").map(Number); return Math.abs(r - 1) + Math.abs(cc - 7) <= 3; }), "ninguna celda a más de 3 pasos");
}

// Explosión sobre Pacman sin PowerUp → derrota producida por el jugador
{
  const [s, g] = setup();
  s.pacman.row = 4; s.pacman.col = 3;
  place(g, 4, 1); step(s, 1, null, true);
  place(g, 13, 15);
  step(s, secs(10));
  check(s.lives === 2 && s.scoreBreakdown.pacmanDefeats === 500, "Pacman a 2 pasos cuando explota: pierde una vida y cuenta como derrota (500)");
  check(s.pacman.row === 7 && s.pacman.col === 8, "y el nivel se reinicia");
}
{
  // Con PowerUp: la explosión no lo afecta
  const [s, g] = setup();
  s.pacman.row = 4; s.pacman.col = 3;
  place(g, 4, 1); step(s, 1, null, true);
  place(g, 13, 15);
  step(s, secs(9));
  s.powerUpActive = true; s.powerUpTimer = 5;
  step(s, secs(1.1));
  check(s.lives === 3 && s.fakeFruits.length === 0, "con PowerUp la explosión no le quita vidas");
}
{
  // Explosión sobre un fantasma: no lo afecta
  const [s, g] = setup();
  place(g, 4, 1); step(s, 1, null, true);
  step(s, secs(10.1));
  check(!g.eaten && g.row === 4 && g.col === 1 && s.lives === 3, "la explosión no afecta al fantasma que está encima");
}

// Pacman consume la fruta falsa
{
  const [s, g] = setup();
  s.pacman.speed = 5; s.pacman.row = 13; s.pacman.col = 8;
  for (const row of s.map.pellets) row.fill("none"); s.map.pellets[1][15] = "pellet"; s.pelletsRemaining = 1;
  place(g, 13, 10); step(s, 1, null, true); place(g, 1, 1); // fruta en (13,10), a 2 celdas: la IA va por ella
  let t = 0; while (s.fakeFruits.length && t < 3) { step(s, 1); t += DT; }
  check(s.lives === 2 && s.score === 500, `Pacman (IA) va por la fruta falsa y pierde una vida (a los ${t.toFixed(2)} s)`);
}
{
  const [s, g] = setup();
  s.pacman.speed = 5; s.pacman.row = 13; s.pacman.col = 8;
  s.powerUpActive = true; s.powerUpTimer = 8;
  for (const row of s.map.pellets) row.fill("none"); s.map.pellets[1][15] = "pellet"; s.pelletsRemaining = 1;
  place(g, 13, 10); step(s, 1, null, true); place(g, 1, 1);
  let t = 0; while (s.fakeFruits.length && t < 3) { step(s, 1); t += DT; }
  check(s.fakeFruits.length === 0 && s.lives === 3 && s.score === 0, "con PowerUp la consume sin efecto y sin puntos");
}

// Reinicio del nivel: las frutas desaparecen sin explotar; el cooldown se conserva
{
  const [s, g] = setup();
  place(g, 1, 3); step(s, 1, null, true);
  step(s, secs(5)); place(g, 1, 5); step(s, 1, null, true);
  const cd = g.powerCooldown;
  g.row = s.pacman.row; g.col = s.pacman.col; step(s, 1);
  check(s.lives === 2 && s.fakeFruits.length === 0 && s.explosions.length === 0, "derrota de Pacman: las frutas falsas desaparecen sin explotar");
  check(Math.abs(g.powerCooldown - (cd - DT)) < 1e-6, "y el cooldown del naval se conserva");
}

// Pausa: la cuenta regresiva se detiene
{
  const [s, g] = setup();
  place(g, 1, 3); step(s, 1, null, true);
  const left = s.fakeFruits[0].timeLeft;
  s.paused = true; step(s, 600); s.paused = false;
  check(s.fakeFruits[0].timeLeft === left, "en pausa la cuenta regresiva de la fruta no corre");
}

// Naval: velocidad
{
  const [, g] = setup();
  check(g.speed === 3, "naval: 3 celdas/s");
}

// Modo Pacman: sin frutas falsas, partida idéntica a antes
{
  const s = st.createInitialGameState(undefined, seeded(3));
  for (let i = 0; i < 1800; i++) st.updateGameState(s, DT, i % 200 < 100 ? "left" : "up", i % 7 === 0);
  check(s.fakeFruits.length === 0 && s.explosions.length === 0, "modo Pacman: no aparecen frutas falsas");
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
