// Incremento 10 — menú, carrusel y fantasma del jugador (HU-22, HU-23, HU-24).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { GHOST_CATALOG } = require(path.join(B, "ghostCatalog.js"));
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
check(s.pacman.col < 8, "modo Pacman: Pacman responde al teclado");

// --- Modo GhostMan, un caso por tipo
for (const { kind } of GHOST_CATALOG) {
  s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: kind }, seeded());
  const pg = st.getPlayerGhost(s);
  check(pg && pg.kind === kind && pg.row === 1 && pg.col === 1, `${kind}: fantasma del jugador en (1,1) con su tipo`);
  check(s.ghosts.filter(g => g.controlledByPlayer).length === 1, `${kind}: un único fantasma del jugador`);
  check(s.ghosts.filter(g => !g.controlledByPlayer).every(g => g.kind === "classic"), `${kind}: los otros 3 son clásicos`);
  const expected = { classic: 5, specter: 3.5, jumper: 5, naval: 4, accelerated: 5 }[kind];
  check(Math.abs(pg.speed - expected) < 1e-9, `${kind}: velocidad ${expected} celdas/s`);
}

// Control del fantasma: avanza continuo, respeta muros
s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "classic" }, seeded());
let pg = st.getPlayerGhost(s);
const pacStart = { row: s.pacman.row, col: s.pacman.col };
const otherStart = s.ghosts.filter(g => !g.controlledByPlayer).map(g => [g.row, g.col].join());
run(s, 1, "right");
check(pg.row === 1 && pg.col === 6, `fantasma avanza 5 celdas en 1 s hacia la derecha (col=${pg.col})`);
run(s, 0.2, null);
check(pg.col > 6, "avance continuo sin mantener la tecla");
run(s, 0.2, "up");
check(pg.row === 1, "no atraviesa el muro del borde superior");
run(s, 0.1, "left");
check(pg.direction === "left", "puede invertir la marcha");
check(s.pacman.row !== pacStart.row || s.pacman.col !== pacStart.col, "Pacman se mueve sin input del jugador (IA, incremento 11)");
const otherNow = s.ghosts.filter(g => !g.controlledByPlayer).map(g => [g.row, g.col].join());
check(otherNow.some((p, i) => p !== otherStart[i]), "los fantasmas de la IA se mueven solos");

// Recorrido largo: el fantasma nunca queda sobre un muro
s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "naval" }, seeded());
pg = st.getPlayerGhost(s);
const dirs = ["up", "down", "left", "right"]; let r = seeded(); let onWall = false;
for (let i = 0; i < 60 * 60 && !s.gameOver; i++) { st.updateGameState(s, DT, dirs[Math.floor(r() * 4)]); if (s.map.cells[pg.row][pg.col] !== "path") onWall = true; }
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

// Modo Pacman N3 sin cambios: cuatro espectros
s = st.createInitialGameState(undefined, seeded());
s.level = 2; s.levelComplete = true; s.levelTransitionTimer = 0.01;
run(s, 0.05, null);
check(s.ghosts.every(g => g.kind === "specter" && !g.controlledByPlayer), "modo Pacman N3: cuatro espectros (sin cambios respecto de la V1)");

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
