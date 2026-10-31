// Incremento 25 — música y efectos de sonido (HU-48; decisiones 43, 57 y 59). Suite del núcleo,
// sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
// Verifica los eventos de sonido que produce el núcleo y el canal de cada sonido.
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { SOUND_CHANNELS } = require(path.join(B, "sounds.js"));
const tm = require(path.join(B, "timings.js"));
const { FAKE_FRUIT_FUSE_SECONDS } = require(path.join(B, "fakeFruits.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 7) => () => (x = (x * 16807) % 2147483647) / 2147483647;
const step = (s, n, dir = null, power = false) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir, power && i === 0); };
const secs = t => Math.round(t / DT);
const drain = s => s.events.splice(0);
const awayGhosts = s => s.ghosts.forEach(g => { g.eaten = true; g.inHouse = true; g.respawnTimer = 1e9; });
const pacmanAt = (s, row, col) => { s.pacman.row = row; s.pacman.col = col; s.pacman.progress = 0; s.pacman.direction = null; };

// ---------- Canales (decisión 57)
const MUSIC = ["gameStart", "siren", "powerSiren", "levelComplete", "gameOver"];
const EFFECTS = ["pellet", "powerPellet", "ghostEaten", "eyes", "fruit", "pacmanDeath", "countdownBeep", "countdownGo", "phase", "jump", "dash", "fakeFruitPlaced", "explosion", "wallBreak"];
check(MUSIC.every(n => SOUND_CHANNELS[n] === "music") && EFFECTS.every(n => SOUND_CHANNELS[n] === "effects") && Object.keys(SOUND_CHANNELS).length === MUSIC.length + EFFECTS.length,
  `música: ${MUSIC.join(", ")}; efectos: los otros ${EFFECTS.length}`);

// ---------- Eventos de Pacman (modo Pacman)
{
  const s = st.createInitialGameState({ mode: "pacman" }, seeded());
  check(drain(s).join() === "gameStart", "al iniciar la partida: jingle de inicio");
  awayGhosts(s);
  pacmanAt(s, 3, 8);
  step(s, secs(0.3), "right");
  check(drain(s).filter(e => e === "pellet").length >= 1, "comer una esfera: waka");
  pacmanAt(s, 1, 2);
  step(s, secs(0.3), "left");
  const ev = drain(s);
  check(ev.includes("powerPellet"), "esfera grande");
  const g = s.ghosts[0];
  g.eaten = false; g.inHouse = false; g.vulnerable = true; g.row = s.pacman.row; g.col = s.pacman.col; g.progress = 0; s.pacman.progress = 0;
  step(s, 1);
  check(drain(s).includes("ghostEaten"), "comer un fantasma");
}
{
  const s = st.createInitialGameState({ mode: "pacman" }, seeded());
  awayGhosts(s); drain(s);
  pacmanAt(s, 3, 8);
  st.spawnFruit(s, 3, 9);
  step(s, secs(0.3), "right");
  check(drain(s).includes("fruit"), "comer una fruta");
}
{
  const s = st.createInitialGameState({ mode: "pacman" }, seeded());
  drain(s);
  const g = s.ghosts.find(x => !x.inHouse);
  s.pacman.progress = 0; g.row = s.pacman.row; g.col = s.pacman.col; g.progress = 0;
  step(s, 1);
  check(drain(s).join() === "pacmanDeath", "perder una vida: sonido de derrota");
  s.lives = 1;
  s.pacman.progress = 0; g.row = s.pacman.row; g.col = s.pacman.col; g.progress = 0;
  step(s, 1);
  check(drain(s).join() === "pacmanDeath,gameOver", "última vida: derrota y jingle de Game Over");
}
{
  const s = st.createInitialGameState({ mode: "pacman" }, seeded());
  awayGhosts(s); drain(s);
  for (const line of s.map.pellets) line.fill("none");
  s.map.pellets[3][9] = "pellet"; s.pelletsRemaining = 1;
  pacmanAt(s, 3, 8);
  step(s, secs(0.3), "right");
  check(drain(s).join() === "pellet,levelComplete", "última esfera: waka y jingle de nivel completado");
  s.levelTransitionTimer = 0.001; step(s, 1);
  check(drain(s).length === 0, "el nivel 2 no repite el jingle de inicio (es de la partida)");
  st.restartGame(s);
  check(drain(s).join() === "gameStart", "\"Volver a jugar\": jingle de inicio");
}

// ---------- Nada durante la pausa ni la cuenta
{
  const s = st.createInitialGameState({ mode: "pacman", timings: tm.STANDARD_TIMINGS }, seeded());
  drain(s);
  awayGhosts(s);
  pacmanAt(s, 3, 8);
  step(s, secs(3), "right");
  check(drain(s).length === 0, "durante la cuenta no hay eventos");
  st.togglePause(s);
  step(s, secs(2), "right");
  check(drain(s).length === 0, "en pausa no hay eventos");
}

// ---------- Poderes del jugador (modo GhostMan)
const ghostman = (kind, level = 1) => {
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: kind }, seeded(11));
  while (s.level < level) { s.levelComplete = true; s.levelTransitionTimer = 0.001; step(s, 1); }
  const g = st.getPlayerGhost(s);
  s.ghosts.filter(x => !x.controlledByPlayer).forEach(x => { x.eaten = true; x.inHouse = true; x.respawnTimer = 1e9; });
  g.inHouse = false; g.progress = 0; g.direction = null; g.powerCooldown = 0;
  s.pacman.speed = 0; pacmanAt(s, 29, 26);
  drain(s);
  return { s, g };
};
{
  // Espectro frente al muro de una celda (3,6) del nivel 2, yendo a la izquierda
  const { s, g } = ghostman("specter", 2);
  g.row = 3; g.col = 7; g.facing = "left";
  step(s, 1, null, true);
  check(drain(s).includes("phase"), "espectro: atravesar");
}
{
  const { s, g } = ghostman("jumper");
  g.row = 3; g.col = 5; g.facing = "right";
  step(s, 1, null, true);
  check(drain(s).includes("jump"), "saltarín: saltar");
}
{
  const { s, g } = ghostman("accelerated");
  g.row = 3; g.col = 5; g.facing = "right";
  step(s, 1, null, true);
  check(drain(s).includes("dash"), "acelerado: impulso");
}
{
  const { s, g } = ghostman("naval");
  g.row = 3; g.col = 5; g.facing = "right";
  step(s, 1, null, true);
  check(drain(s).includes("fakeFruitPlaced"), "naval: colocar la fruta falsa");
  step(s, secs(FAKE_FRUIT_FUSE_SECONDS + 0.1));
  check(drain(s).includes("explosion"), "naval: explosión");
}
{
  // Pacman (IA) con cargas en el nivel 2 rompe muros para acortar camino
  const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "classic" }, seeded(3));
  s.levelComplete = true; s.levelTransitionTimer = 0.001; step(s, 1);
  drain(s);
  let found = false;
  for (let i = 0; i < secs(120) && !found && !s.gameOver; i++) {
    s.wallCharges = 5;
    step(s, 1);
    found = drain(s).includes("wallBreak");
  }
  check(found, "romper un muro");
}

// ---------- Poderes de la IA (modo Pacman): se detectan igual, sin importar dónde se activan
const aiGhost = (level, kind, row, col, facing) => {
  const s = st.createInitialGameState(undefined, seeded(7));
  while (s.level < level) { s.levelComplete = true; s.levelTransitionTimer = 0.001; step(s, 1); }
  s.ghosts.forEach((g, i) => { if (i > 0) { g.eaten = true; g.inHouse = true; g.respawnTimer = 1e9; } });
  const g = s.ghosts[0];
  g.kind = kind; g.row = row; g.col = col; g.progress = 0; g.direction = facing; g.facing = facing; g.powerCooldown = 0; g.inHouse = false;
  s.ghostMode = "chase"; s.ghostModeTimer = 0; s.fruits = []; s.fruitSpawnTimer = -1e9;
  s.pacman.speed = 0;
  drain(s);
  return { s, g };
};
{
  // El acelerado de la IA con Pacman a 5 celdas por la fila 19 del nivel 3 (como en core/inc20.js)
  const { s } = aiGhost(3, "accelerated", 19, 4, "right");
  pacmanAt(s, 19, 9);
  step(s, 1);
  check(drain(s).includes("dash"), "IA: el impulso del acelerado también suena");
}
{
  // El espectro de la IA decide el cruce al moverse, dentro de su movimiento: también se detecta
  const { s } = aiGhost(2, "specter", 3, 7, "left");
  pacmanAt(s, 3, 3);
  step(s, 1);
  check(drain(s).includes("phase"), "IA: el cruce del espectro también suena");
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
