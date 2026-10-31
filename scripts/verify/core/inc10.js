// Incremento 10 — menú, carrusel y fantasma del jugador (HU-22, HU-23, HU-24).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { GHOST_CATALOG } = require(path.join(B, "ghostCatalog.js"));
const gh = require(path.join(B, "ghosts.js"));
let fails = 0;
const check = (cond, msg) => { console.log((cond ? "OK   " : "FAIL ") + msg); if (!cond) fails++; };
const DT = 1 / 60;
const run = (s, secs, dir) => { for (let i = 0; i < secs / DT; i++) st.updateGameState(s, DT, dir); };
const seeded = () => { let x = 42; return () => (x = (x * 16807) % 2147483647) / 2147483647; };

// --- Modo Pacman: igual que la V1
let s = st.createInitialGameState(undefined, seeded());
check(s.config.mode === "pacman", "configuración por defecto = modo Pacman");
check(s.ghosts.every(g => !g.controlledByPlayer && g.kind === "classic"), "modo Pacman N1: 4 fantasmas de la IA, clásicos");
run(s, 0.5, "left");
check(s.pacman.col < 13, "modo Pacman: Pacman responde al teclado");

// --- Modo GhostMan, un caso por tipo
for (const { kind } of GHOST_CATALOG) {
  s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: kind }, seeded());
  const pg = st.getPlayerGhost(s);
  // Desde el incremento 19 arranca en el centro de la base (decisión 45); hasta el 18, en (1,1).
  check(pg && pg.kind === kind && pg.row === 14 && pg.col === 13 && pg.inHouse, `${kind}: fantasma del jugador en el centro de la base (14,13) con su tipo`);
  check(s.ghosts.filter(g => g.controlledByPlayer).length === 1, `${kind}: un único fantasma del jugador`);
  check(s.ghosts.filter(g => !g.controlledByPlayer).every(g => g.kind === "classic"), `${kind}: los otros 3 son clásicos`);
  // Velocidades de la sección 4.5 sobre la del clásico (4,5 celdas/s desde el incremento 21, decisión 70).
  const V = gh.CLASSIC_GHOST_SPEED;
  const expected = { classic: V, specter: V * gh.SPECTER_SPEED_FACTOR, jumper: V, naval: V * gh.NAVAL_SPEED_FACTOR, accelerated: V }[kind];
  check(Math.abs(pg.speed - expected) < 1e-9, `${kind}: velocidad ${expected} celdas/s`);
}

// Control del fantasma: avanza continuo, respeta muros
s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "classic" }, seeded());
let pg = st.getPlayerGhost(s);
// Se lo saca de la base a (29,7): fila 29, pasillo de las columnas 1 a 26 con el borde abajo
// (hasta el incremento 20, (1,7) con el borde arriba; en los mapas del incremento 21 es muro).
pg.row = 29; pg.col = 7; pg.inHouse = false;
const pacStart = { row: s.pacman.row, col: s.pacman.col };
const otherStart = s.ghosts.filter(g => !g.controlledByPlayer).map(g => [g.row, g.col].join());
run(s, 5.05 / gh.CLASSIC_GHOST_SPEED, "right");
check(pg.row === 29 && pg.col === 12, `fantasma avanza 5 celdas en 1,11 s (4,5 celdas/s) hacia la derecha (col=${pg.col})`);
run(s, 0.27, null);
check(pg.col > 12, "avance continuo sin mantener la tecla");
run(s, 0.2, "down");
check(pg.row === 29, "no atraviesa el muro del borde inferior");
run(s, 0.1, "left");
check(pg.direction === "left", "puede invertir la marcha");
check(s.pacman.row !== pacStart.row || s.pacman.col !== pacStart.col, "Pacman se mueve sin input del jugador (IA, incremento 11)");
const otherNow = s.ghosts.filter(g => !g.controlledByPlayer).map(g => [g.row, g.col].join());
check(otherNow.some((p, i) => p !== otherStart[i]), "los fantasmas de la IA se mueven solos");

// Recorrido largo: el fantasma nunca queda sobre un muro
s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "naval" }, seeded());
pg = st.getPlayerGhost(s);
const dirs = ["up", "down", "left", "right"]; let r = seeded(); let onWall = false;
for (let i = 0; i < 60 * 60 && !s.gameOver; i++) { st.updateGameState(s, DT, dirs[Math.floor(r() * 4)]); if (s.map.cells[pg.row][pg.col] === "wall") onWall = true; }
check(!onWall, "60 s de input aleatorio: el fantasma del jugador nunca entra a un muro");
check(s.lives >= 0 && s.lives <= 3, "vidas de Pacman dentro de 0..3");

// Cambio de modo chase/scatter: la IA invierte, el jugador no
s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "classic" }, seeded());
pg = st.getPlayerGhost(s);
for (const row of s.map.pellets) for (let c = 0; c < row.length; c++) if (row[c] === "power") row[c] = "pellet"; // sin PowerUp el ciclo no se pausa
run(s, 19.9, "right");
run(s, 0.2, null);
check(s.ghostMode === "scatter", "pasa a dispersión a los 20 s");

// Nivel 3 en GhostMan: los de la IA siguen clásicos (no espectros)
s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "jumper" }, seeded());
s.pelletsRemaining = 0; // forzar
s.level = 2; s.levelComplete = true; s.levelTransitionTimer = 0.01;
run(s, 0.05, null);
check(s.level === 3, "carga el nivel 3");
check(s.ghosts.filter(g => !g.controlledByPlayer).every(g => g.kind === "classic"), "GhostMan N3: los de la IA son clásicos");
check(st.getPlayerGhost(s).kind === "jumper", "GhostMan N3: el jugador conserva su tipo");

// Volver a jugar: mismo modo y mismo fantasma
st.restartGame(s);
check(s.level === 1 && s.config.mode === "ghostman" && st.getPlayerGhost(s).kind === "jumper", "volver a jugar repite modo y fantasma desde el nivel 1");

// Modo Pacman N3: uno de cada tipo con poderes (cambió a propósito en el incremento 16, HU-43;
// hasta el 15 eran cuatro espectros, como en la V1)
s = st.createInitialGameState(undefined, seeded());
s.level = 2; s.levelComplete = true; s.levelTransitionTimer = 0.01;
run(s, 0.05, null);
check(s.ghosts.map(g => g.kind).join() === "specter,jumper,naval,accelerated" && s.ghosts.every(g => !g.controlledByPlayer),
  "modo Pacman N3: uno de cada tipo con poderes (incremento 16)");

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
