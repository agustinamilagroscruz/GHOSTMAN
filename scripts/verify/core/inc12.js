// Incremento 12 — reglas del modo GhostMan: derrotas, vulnerabilidad, puntaje y cierre (HU-25, HU-26, HU-27).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { sumBreakdown } = require(path.join(B, "scoring.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = () => { let x = 11; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
const gm = (kind = "classic") => st.createInitialGameState({ mode: "ghostman", playerGhostKind: kind }, seeded());
const step = (s, n = 1, dir = null) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir); };
const touchPlayer = s => { const g = st.getPlayerGhost(s); g.row = s.pacman.row; g.col = s.pacman.col; g.progress = s.pacman.progress; g.direction = s.pacman.direction; step(s); };
const pelletsEaten = s => { let n = 0; for (const r of s.map.pellets) for (const p of r) if (p === "none") n++; return n; };

// Derrota de Pacman
{
  const s = gm("specter");
  step(s, 90); // Pacman come algunas esferas
  const eatenBefore = pelletsEaten(s), remainingBefore = s.pelletsRemaining;
  const pg = st.getPlayerGhost(s); pg.powerCooldown = 6.5; // cooldown en curso
  s.ghosts[2].row = 5; // un fantasma de la IA fuera de su posición inicial
  touchPlayer(s);
  check(s.lives === 2, "toque del fantasma del jugador: Pacman pierde una vida (3 → 2)");
  check(s.score === 500 && s.scoreBreakdown.pacmanDefeats === 500, "suma 500 al jugador");
  check(s.pacman.row === 7 && s.pacman.col === 8, "Pacman vuelve a su posición inicial");
  check(s.ghosts.every(g => g.row === g.spawn.row && g.col === g.spawn.col), "todos los fantasmas vuelven a su posición inicial");
  check(s.pelletsRemaining === remainingBefore && pelletsEaten(s) === eatenBefore, "las esferas consumidas se conservan");
  check(Math.abs(pg.powerCooldown - (6.5 - DT)) < 1e-6, `el cooldown del poder NO se reinicia (${pg.powerCooldown.toFixed(3)} s)`);
  // Contacto sostenido varios frames: un solo descuento
  const s2 = gm();
  const g2 = st.getPlayerGhost(s2);
  for (let i = 0; i < 5; i++) { g2.row = s2.pacman.row; g2.col = s2.pacman.col; g2.progress = s2.pacman.progress; g2.direction = s2.pacman.direction; if (i === 0) step(s2); }
  check(s2.lives === 2, "un contacto descuenta una sola vida");
}

// PowerUp cancelado por la derrota
{
  const s = gm();
  s.powerUpActive = true; s.powerUpTimer = 6;
  for (const g of s.ghosts) g.vulnerable = false; // el del jugador no vulnerable para poder tocar
  touchPlayer(s);
  check(!s.powerUpActive, "la derrota cancela el PowerUp de Pacman");
}

// Secuencia del prompt: 3 derrotas → nivel 2 con 3 vidas
{
  const s = gm();
  touchPlayer(s); touchPlayer(s);
  const remaining = s.pelletsRemaining;
  touchPlayer(s);
  check(s.lives === 0 && s.levelComplete, "3 derrotas → nivel completado");
  check(s.lastLevelPelletsLeftBonus === remaining * 10 && s.scoreBreakdown.pelletsLeft === remaining * 10, `esferas sin consumir: ${remaining} × 10 = ${remaining * 10}`);
  check(s.scoreBreakdown.timeBonus === 0, "no hay bonus por tiempo en modo GhostMan");
  step(s, 3.1 / DT);
  check(s.level === 2 && s.lives === 3 && !s.levelComplete, "a los 3 s pasa al nivel 2 con 3 vidas nuevas para Pacman");
  check(s.score === 1500 + remaining * 10, `puntaje acumulado (${s.score})`);
}

// Pacman come la última esfera con 1 derrota acumulada → Game Over
{
  const s = gm();
  touchPlayer(s);
  check(s.lives === 2, "1 derrota acumulada");
  for (const g of s.ghosts) { g.eaten = true; g.respawnTimer = 1e9; } // nadie lo molesta
  let t = 0; while (!s.gameOver && !s.levelComplete && t < 120) { step(s); t += DT; }
  check(s.gameOver && !s.won && !s.levelComplete, `Pacman consume la última esfera → Game Over (a los ${t.toFixed(1)} s)`);
  check(s.score === 500 && s.scoreBreakdown.pelletsLeft === 0, "el puntaje queda en las derrotas: 500");
  check(sumBreakdown(s.scoreBreakdown) === s.score, "el desglose suma el total");
}

// Toque de un fantasma de la IA
{
  const s = gm();
  step(s, 60);
  const ai = s.ghosts[1];
  const others = s.ghosts.filter(g => g !== ai).map(g => `${g.row},${g.col},${g.progress.toFixed(3)}`);
  const remaining = s.pelletsRemaining;
  ai.row = s.pacman.row; ai.col = s.pacman.col; ai.progress = s.pacman.progress; ai.direction = s.pacman.direction;
  const aiPos = `${ai.row},${ai.col}`;
  st.updateGameState(s, 0, null); // paso de tiempo 0: solo colisiones
  check(s.lives === 3 && s.score === 0, "toque de un fantasma de la IA: Pacman no pierde vidas y no hay puntos");
  check(s.pacman.row === 7 && s.pacman.col === 8, "Pacman vuelve a su posición inicial");
  check(`${ai.row},${ai.col}` === aiPos && s.ghosts.filter(g => g !== ai).map(g => `${g.row},${g.col},${g.progress.toFixed(3)}`).join() === others.join(), "los fantasmas no cambian de posición");
  check(s.pelletsRemaining === remaining && !s.levelComplete, "el mapa no cambia");
}

// Vulnerabilidad del fantasma del jugador (HU-27)
for (const kind of ["classic", "naval"]) {
  const s = gm(kind);
  const pg = st.getPlayerGhost(s);
  for (const g of s.ghosts) if (g !== pg) { g.eaten = true; g.respawnTimer = 1e9; }
  // Pacman come una esfera grande: el jugador pasa a vulnerable
  s.pacman.row = 1; s.pacman.col = 2; s.pacman.progress = 0; s.pacman.direction = null;
  pg.row = 13; pg.col = 8; pg.progress = 0; pg.direction = null;
  let t = 0; while (!s.powerUpActive && t < 5) { step(s); t += DT; }
  check(s.powerUpActive && pg.vulnerable, `${kind}: con el PowerUp de Pacman el fantasma del jugador queda vulnerable`);
  pg.row = s.pacman.row; pg.col = s.pacman.col; pg.progress = s.pacman.progress; pg.direction = s.pacman.direction;
  step(s);
  check(pg.eaten && s.lives === 3 && s.score === 0 && !s.levelComplete, `${kind}: Pacman lo come; no hay descuento, puntos ni reinicio`);
  const expected = kind === "naval" ? 8 : 5;
  check(Math.abs(pg.respawnTimer - expected) < 0.05, `${kind}: reaparece en ${expected} s (${pg.respawnTimer.toFixed(2)})`);
  const r0 = `${pg.row},${pg.col}`;
  step(s, 60, "right");
  check(`${pg.row},${pg.col}` === r0 && pg.eaten, `${kind}: mientras espera, el jugador no lo controla`);
  step(s, (expected - 1) / DT + 2);
  check(!pg.eaten && pg.row === 1 && pg.col === 1, `${kind}: reaparece en (1,1)`);
}

// Victoria al completar el nivel 3
{
  const s = gm();
  for (let lvl = 1; lvl <= 3; lvl++) { touchPlayer(s); touchPlayer(s); touchPlayer(s); if (lvl < 3) step(s, 3.1 / DT); }
  step(s, 3.1 / DT);
  check(s.won && !s.gameOver, "3 niveles completados → Victoria");
  check(s.scoreBreakdown.livesBonus === 0, "sin bonus por vidas en modo GhostMan");
  check(sumBreakdown(s.scoreBreakdown) === s.score && s.scoreBreakdown.pacmanDefeats === 4500, `desglose: 9 derrotas = 4500, total ${s.score}`);
}

// Modo Pacman sin cambios
{
  const s = st.createInitialGameState(undefined, seeded());
  const g = s.ghosts[0];
  g.row = s.pacman.row; g.col = s.pacman.col; g.progress = 0;
  step(s);
  check(s.lives === 2 && s.score === 0, "modo Pacman: el toque de un fantasma sigue restando una vida al jugador");
  for (const gh of s.ghosts) { gh.eaten = true; gh.respawnTimer = 1e9; }
  for (let r = 0; r < s.map.rows; r++) for (let c = 0; c < s.map.cols; c++) if (s.map.pellets[r][c] !== "none" && !(r === 7 && c === 7)) { s.map.pellets[r][c] = "none"; s.pelletsRemaining--; }
  step(s, 30, "left");
  check(s.levelComplete && s.lastLevelTimeBonus > 0 && s.scoreBreakdown.pelletsLeft === 0, `modo Pacman: la última esfera completa el nivel con bonus por tiempo (${s.lastLevelTimeBonus})`);
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
