// Incremento 29 — las skins no alteran las mecánicas (HU-40, CP-134). Suite del núcleo, sin
// navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
// Juega la misma partida (mismo azar, mismas teclas) con las skins clásicas y con las alternativas,
// y compara el estado cuadro a cuadro: posiciones, vidas, puntaje, desglose, poderes y nivel.
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const sk = require(path.join(B, "skins.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 11) => () => (x = (x * 16807) % 2147483647) / 2147483647;
const DIRS = ["up", "right", "down", "left"];

// Resumen del estado que depende de las mecánicas, sin las skins de la configuración.
const snapshot = s =>
  JSON.stringify({
    pacman: s.pacman,
    ghosts: s.ghosts,
    lives: s.lives,
    level: s.level,
    score: s.score,
    breakdown: s.scoreBreakdown,
    pellets: s.pelletsRemaining,
    gameOver: s.gameOver,
    won: s.won,
    fruits: s.fruits,
  });

function play(config, frames) {
  const s = st.createInitialGameState(config, seeded());
  const frameSnapshots = [];
  let dir = null;
  for (let i = 0; i < frames; i++) {
    // Teclas deterministas: cambia de dirección cada 40 cuadros y usa el poder cada 300.
    if (i % 40 === 0) dir = DIRS[(i / 40) % 4];
    st.updateGameState(s, DT, dir, i % 300 === 150);
    if (i % 30 === 0) frameSnapshots.push(snapshot(s));
  }
  return { frames: frameSnapshots, final: s };
}

const alt = { pacmanSkin: sk.PACMAN_SKINS[1].id, ghostSkin: sk.GHOST_SKINS[1].id };
check(alt.pacmanSkin !== sk.DEFAULT_PACMAN_SKIN.id && alt.ghostSkin !== sk.DEFAULT_GHOST_SKIN.id, `skins alternativas: ${alt.pacmanSkin} y ${alt.ghostSkin}`);

const CASES = [
  ["modo Pacman", { mode: "pacman" }],
  ...["classic", "specter", "jumper", "naval", "accelerated"].map(kind => [`modo GhostMan, ${kind}`, { mode: "ghostman", playerGhostKind: kind }]),
];
for (const [name, config] of CASES) {
  const classic = play(config, 3600);
  const other = play({ ...config, ...alt }, 3600);
  const firstDiff = classic.frames.findIndex((frame, i) => frame !== other.frames[i]);
  check(firstDiff === -1, `${name}: 60 s de partida idénticos con la otra skin` + (firstDiff === -1 ? ` (puntaje ${classic.final.score})` : ` — difiere en la muestra ${firstDiff}`));
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exitCode = fails ? 1 : 0;
