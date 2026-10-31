// Incremento 24 — animaciones (HU-47, HU-49; decisiones 53, 55 y 56). Suite del núcleo, sin
// navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const gh = require(path.join(B, "ghosts.js"));
const tm = require(path.join(B, "timings.js"));
const fk = require(path.join(B, "fakeFruits.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 7) => () => (x = (x * 16807) % 2147483647) / 2147483647;
const step = (s, n, dir = null, power = false) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir, power && i === 0); };
const secs = t => Math.round(t / DT);
// Solo la derrota con sus duraciones; la cuenta y el "¡Listo!" en 0 para aislarla.
const DEATH = { ...tm.NO_WAIT_TIMINGS, deathFreezeSeconds: 0.5, deathSeconds: 1.5 };
const key = c => `${c.row},${c.col},${c.progress}`;
const touch = (s, g) => { s.pacman.progress = 0; g.inHouse = false; g.eaten = false; g.row = s.pacman.row; g.col = s.pacman.col; g.progress = 0; };

// ---------- Derrota de Pacman (decisión 53)
{
  const s = st.createInitialGameState({ mode: "pacman" }, seeded());
  touch(s, s.ghosts[0]);
  step(s, 1);
  check(s.lives === 2 && s.pacmanDeath === null, "sin duraciones (núcleo): la derrota es inmediata, como antes");
}
{
  const s = st.createInitialGameState({ mode: "pacman", timings: DEATH }, seeded());
  step(s, secs(1));
  const g = s.ghosts.find(x => !x.inHouse);
  touch(s, g);
  step(s, 1);
  check(s.lives === 2 && s.pacmanDeath && s.pacmanDeath.after === "ready", "modo Pacman: al perder una vida arranca la animación de derrota");
  const pac = key(s.pacman), ghosts = s.ghosts.map(key), elapsed = s.levelElapsed, score = s.score, timers = s.ghosts.map(x => x.releaseTimer);
  step(s, secs(0.4));
  check(tm.pacmanDeathFrame(s.pacmanDeath, 11) === null, "los primeros 0,5 s todo queda congelado con los fantasmas visibles (sin cuadro de derrota)");
  step(s, secs(0.2));
  check(tm.pacmanDeathFrame(s.pacmanDeath, 11) === 0, "a los 0,6 s empieza a desarmarse (cuadro 0)");
  step(s, secs(0.75));
  const mid = tm.pacmanDeathFrame(s.pacmanDeath, 11);
  check(mid >= 4 && mid <= 6, `a mitad de la animación va por el cuadro ${mid} de 11`);
  check(key(s.pacman) === pac && s.ghosts.every((x, i) => key(x) === ghosts[i]), "durante la derrota nadie se mueve");
  check(s.levelElapsed === elapsed && s.score === score && s.ghosts.every((x, i) => x.releaseTimer === timers[i]), "no avanza ningún temporizador ni se suman puntos");
  st.togglePause(s);
  const before = s.pacmanDeath.elapsed;
  step(s, secs(3));
  check(s.pacmanDeath && s.pacmanDeath.elapsed === before, "la pausa detiene la animación");
  st.togglePause(s);
  step(s, secs(0.7));
  check(s.pacmanDeath === null && s.pacman.row === 23 && s.pacman.col === 13 && !s.gameOver, "a los 2 s termina: todos vuelven a su posición y sigue el juego");
}
{
  const s = st.createInitialGameState({ mode: "pacman", timings: DEATH }, seeded());
  step(s, secs(1));
  s.lives = 1;
  touch(s, s.ghosts.find(x => !x.inHouse));
  step(s, 1);
  check(!s.gameOver && s.pacmanDeath && s.pacmanDeath.after === "gameOver", "con la última vida, primero la animación");
  step(s, secs(2.05));
  check(s.gameOver && s.pacmanDeath === null, "y después el Game Over");
}
{
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "classic", timings: DEATH }, seeded());
  step(s, secs(1));
  const pg = st.getPlayerGhost(s);
  touch(s, pg);
  step(s, 1);
  check(s.lives === 2 && s.score === 500 && s.pacmanDeath && s.pacmanDeath.after === "ready", "modo GhostMan: el jugador derrota a Pacman, suma 500 y se ve la misma animación");
  step(s, secs(2.05));
  s.lives = 1;
  touch(s, pg);
  step(s, 1);
  check(!s.levelComplete && s.pacmanDeath && s.pacmanDeath.after === "levelComplete", "tercera derrota: primero la animación");
  step(s, secs(2.05));
  check(s.levelComplete, "y después el nivel completado");
}

// ---------- Salto del saltarín (decisión 55)
const jumperAt = (row, col, facing) => {
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "jumper" }, seeded(11));
  const g = st.getPlayerGhost(s);
  g.inHouse = false; g.row = row; g.col = col; g.progress = 0; g.direction = null; g.facing = facing; g.powerCooldown = 0;
  s.ghosts.filter(x => !x.controlledByPlayer).forEach(x => { x.eaten = true; x.inHouse = true; x.respawnTimer = 1e9; });
  s.pacman.speed = 0; s.pacman.row = 29; s.pacman.col = 26;
  return { s, g };
};
{
  const { s, g } = jumperAt(3, 5, "right");
  step(s, 1, null, true);
  check(g.jump && g.row === 3 && g.col === 5 && g.powerCooldown > 9.9, "espacio: despega, sigue en su celda de origen y arranca el cooldown");
  const to = g.jump.to;
  check(to.col > 5, `el destino (${to.row},${to.col}) se elige al despegar, adelante`);
  // En el aire no colisiona: Pacman en la celda de origen
  s.pacman.row = 3; s.pacman.col = 5;
  step(s, secs(0.3), "down");
  check(s.lives === 3, "en el aire no colisiona (Pacman en la celda de origen no pierde una vida)");
  check(g.jump && g.row === 3 && g.col === 5, "a los 0,3 s sigue en el aire y el teclado no lo mueve");
  const p = gh.jumpPosition(g.jump);
  check(p.height > 1.4 && Math.abs(p.t - 0.5) < 0.05, `a mitad del salto está en lo más alto del arco (${p.height.toFixed(2)} celdas)`);
  g.powerCooldown = 0;
  step(s, 1, null, true);
  check(g.jump.to.row === to.row && g.jump.to.col === to.col, "un segundo espacio en el aire no hace nada");
  s.pacman.row = 29; s.pacman.col = 26;
  step(s, secs(0.31));
  check(!g.jump && g.row === to.row && g.col === to.col, "a los 0,6 s aterriza en el destino");
  check(s.landingDust.length === 1 && s.landingDust[0].row === to.row && s.landingDust[0].col === to.col, "al aterrizar levanta polvo en el destino");
  step(s, secs(0.35));
  check(s.landingDust.length === 0, "el polvo se va en 0,3 s");
}
{
  const { s, g } = jumperAt(3, 5, "right");
  step(s, 1, null, true);
  const to = g.jump.to;
  s.pacman.row = to.row; s.pacman.col = to.col;
  step(s, secs(0.55));
  check(s.lives === 3, "antes de aterrizar, Pacman en el destino no pierde una vida");
  step(s, secs(0.1));
  check(s.lives === 2, "al aterrizar sobre Pacman, la colisión es la normal: pierde una vida");
}
{
  // Modo Pacman: un saltarín de la IA en el aire cuando otro fantasma alcanza a Pacman.
  const { tryJumperTeleport } = require(path.join(B, "powers.js"));
  const s = st.createInitialGameState({ mode: "pacman" }, seeded(11));
  const [g, other] = s.ghosts;
  g.kind = "jumper"; g.inHouse = false; g.row = 3; g.col = 5; g.progress = 0; g.facing = "right";
  check(tryJumperTeleport(g, s.map, s.random) && g.jump, "modo Pacman: el saltarín de la IA despega");
  s.pacman.row = 29; s.pacman.col = 26;
  touch(s, other);
  step(s, 1);
  check(s.lives === 2 && !g.jump && g.row === g.spawn.row && g.col === g.spawn.col, "el reinicio del nivel corta el salto y el saltarín vuelve a su posición inicial");
}
{
  const jump = { from: { row: 3, col: 5 }, to: { row: 3, col: 11 }, elapsed: 0 };
  const a = gh.jumpPosition(jump); jump.elapsed = gh.JUMP_SECONDS;
  const b = gh.jumpPosition(jump);
  check(a.height === 0 && Math.abs(b.height) < 1e-9 && b.col === 11 && gh.JUMP_SECONDS === 0.6, "el arco arranca y termina a ras del piso; dura 0,6 s");
}

// ---------- Naval (decisión 56)
check(fk.EXPLOSION_DISPLAY_SECONDS === 0.5, "la explosión se ve durante 0,5 s");
check(fk.FAKE_FRUIT_WARNING_SECONDS === 3, "la cuenta regresiva de la fruta falsa sigue en los últimos 3 s (V2); el parpadeo es de los últimos 2");

// ---------- Modo de prueba
check(tm.NO_WAIT_TIMINGS.deathFreezeSeconds === 0 && tm.NO_WAIT_TIMINGS.deathSeconds === 0 && tm.STANDARD_TIMINGS.deathFreezeSeconds === 0.5 && tm.STANDARD_TIMINGS.deathSeconds === 1.5,
  "derrota: 0,5 + 1,5 s en el navegador y 0 en el núcleo y con el modo de prueba");

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
