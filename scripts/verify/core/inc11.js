// Incremento 11 — IA de Pacman en modo GhostMan (HU-24, sección 4.7).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { getMoverPosition } = require(path.join(B, "movement.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = () => { let x = 7; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
const gm = (kind = "classic") => st.createInitialGameState({ mode: "ghostman", playerGhostKind: kind }, seeded());
const pos = e => getMoverPosition(e);

// 1. Sin interferencia, Pacman completa cada nivel (fantasmas comidos y fuera del mapa)
for (const level of [1, 2, 3]) {
  const s = gm();
  if (level > 1) { s.level = level - 1; s.levelComplete = true; s.levelTransitionTimer = 0.001; st.updateGameState(s, DT, null); }
  for (const g of s.ghosts) { g.eaten = true; g.respawnTimer = 1e9; }
  s.fruits = []; // las frutas del nivel 3 no cuentan
  const total = s.pelletsRemaining;
  let t = 0, lastLeft = total, stall = 0, maxStall = 0;
  while (!s.gameOver && t < 300) {
    st.updateGameState(s, DT, null); t += DT;
    if (s.pelletsRemaining < lastLeft) { lastLeft = s.pelletsRemaining; stall = 0; } else { stall += DT; maxStall = Math.max(maxStall, stall); }
  }
  check(s.gameOver && s.pelletsRemaining === 0, `N${level}: Pacman consume las ${total} esferas en ${t.toFixed(1)} s (mayor lapso sin comer: ${maxStall.toFixed(1)} s)`);
}

// 2. Un fantasma que se acerca por el corredor: Pacman se aleja
{
  const s = gm();
  // Pacman en (4,8) quieto; fantasma de la IA a 4 celdas en la misma fila, viniendo hacia él
  s.pacman.row = 4; s.pacman.col = 8; s.pacman.progress = 0; s.pacman.direction = null;
  for (const g of s.ghosts) { g.eaten = true; g.respawnTimer = 1e9; }
  const g = s.ghosts[1]; g.eaten = false; g.row = 4; g.col = 12; g.progress = 0; g.direction = "left";
  const d0 = Math.abs(pos(s.pacman).col - pos(g).col);
  let minD = d0;
  for (let i = 0; i < 60; i++) { st.updateGameState(s, DT, null); minD = Math.min(minD, Math.hypot(pos(s.pacman).row - pos(g).row, pos(s.pacman).col - pos(g).col)); }
  const p = pos(s.pacman);
  check(p.col < 8 || p.row !== 4, `con un fantasma a 4 celdas acercándose, Pacman se aleja (Pacman en ${p.row.toFixed(1)},${p.col.toFixed(1)})`);
  check(minD >= 0.5, `y no hay contacto en 1 s (distancia mínima ${minD.toFixed(2)})`);
}

// 3. El fantasma del jugador también cuenta como peligro
{
  const s = gm();
  s.pacman.row = 4; s.pacman.col = 8; s.pacman.progress = 0; s.pacman.direction = null;
  for (const g of s.ghosts) if (!g.controlledByPlayer) { g.eaten = true; g.respawnTimer = 1e9; }
  const pg = st.getPlayerGhost(s); pg.row = 4; pg.col = 5; pg.progress = 0;
  for (let i = 0; i < 30; i++) st.updateGameState(s, DT, "right");
  check(pos(s.pacman).col > 8, `huye del fantasma del jugador que viene por la izquierda (col ${pos(s.pacman).col.toFixed(1)})`);
}

// 4. Con el PowerUp persigue y come a un fantasma vulnerable cercano
{
  const s = gm();
  for (const g of s.ghosts) { g.eaten = true; g.respawnTimer = 1e9; }
  s.pacman.row = 7; s.pacman.col = 8; s.pacman.progress = 0;
  const g = s.ghosts[2]; g.eaten = false; g.row = 7; g.col = 13; g.progress = 0; g.direction = null; g.speed = 0;
  s.powerUpActive = true; s.powerUpTimer = 8; g.vulnerable = true;
  let eaten = false;
  for (let i = 0; i < 120 && !eaten; i++) { st.updateGameState(s, DT, null); eaten = g.eaten; }
  check(eaten, "con el PowerUp, va hacia un fantasma vulnerable a 5 celdas y lo come");
  check(s.score === 0, "en modo GhostMan lo que hace Pacman no suma puntos al jugador");
}

// 5. Sin PowerUp ignora a los vulnerables / con fantasma lejano (>8) no lo persigue
{
  const s = gm();
  for (const g of s.ghosts) { g.eaten = true; g.respawnTimer = 1e9; }
  s.pacman.row = 1; s.pacman.col = 8; s.pacman.progress = 0;
  const g = s.ghosts[3]; g.eaten = false; g.row = 13; g.col = 15; g.speed = 0; g.vulnerable = true;
  s.powerUpActive = true; s.powerUpTimer = 8;
  for (let i = 0; i < 60; i++) st.updateGameState(s, DT, null);
  check(!g.eaten && pos(s.pacman).row < 4, "un vulnerable a más de 8 celdas no lo atrae: sigue comiendo esferas cerca");
}

// 6. Va por una fruta a ≤ 5 celdas aunque haya esferas más cerca
{
  const s = gm();
  for (const g of s.ghosts) { g.eaten = true; g.respawnTimer = 1e9; }
  s.pacman.row = 7; s.pacman.col = 8; s.pacman.progress = 0;
  st.spawnFruit(s, 10, 6); // a 5 de recorrido: (7,8)->(7,6)->(10,6)
  for (let i = 0; i < 70; i++) st.updateGameState(s, DT, null);
  check(s.fruits.length === 0, "va por una fruta a 5 celdas y la consume");
  const s2 = gm();
  for (const g of s2.ghosts) { g.eaten = true; g.respawnTimer = 1e9; }
  s2.pacman.row = 7; s2.pacman.col = 8; s2.pacman.progress = 0;
  st.spawnFruit(s2, 13, 15); // lejos
  for (let i = 0; i < 70; i++) st.updateGameState(s2, DT, null);
  check(s2.fruits.length === 1, "ignora una fruta lejana (más de 5 celdas)");
}

// 7. Determinismo: dos partidas iguales dan el mismo recorrido
{
  const trace = () => { const s = gm(); const out = []; for (let i = 0; i < 600; i++) { st.updateGameState(s, DT, i % 120 < 60 ? "right" : "down"); if (i % 30 === 0) out.push(`${s.pacman.row},${s.pacman.col}`); } return out.join(" "); };
  check(trace() === trace(), "misma entrada → mismo recorrido de Pacman (desempate fijo)");
}

// 8. Partida real de 3 minutos: nunca entra a un muro, nunca queda quieto mucho tiempo
{
  const s = gm("specter"); const r = seeded(); const dirs = ["up", "down", "left", "right"];
  let onWall = false, still = 0, maxStill = 0, prev = "";
  for (let i = 0; i < 180 * 60 && !s.levelComplete && !s.gameOver; i++) {
    st.updateGameState(s, DT, dirs[Math.floor(r() * 4)]);
    if (s.map.cells[s.pacman.row][s.pacman.col] !== "path") onWall = true;
    const k = pos(s.pacman); const key = k.row.toFixed(2) + "," + k.col.toFixed(2);
    if (key === prev) { still += DT; maxStill = Math.max(maxStill, still); } else still = 0; prev = key;
  }
  check(!onWall, "3 min con fantasmas de la IA: Pacman nunca entra a un muro");
  check(maxStill < 1, `nunca queda detenido más de 1 s (máximo ${maxStill.toFixed(2)} s)`);
  check(s.lives >= 0 && s.lives <= 3, "vidas de Pacman dentro de 0..3");
}

// 9. Modo Pacman sin cambios: el jugador controla a Pacman y suma puntos
{
  const s = st.createInitialGameState(undefined, seeded());
  for (let i = 0; i < 60; i++) st.updateGameState(s, DT, "left");
  check(s.pacman.col < 8 && s.score > 0, `modo Pacman: control por teclado y puntaje (${s.score})`);
  const s2 = st.createInitialGameState(undefined, seeded());
  for (let i = 0; i < 120; i++) st.updateGameState(s2, DT, null);
  check(s2.pacman.col === 8 && s2.pacman.row === 7, "modo Pacman: sin input Pacman no se mueve (la IA no interviene)");
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
