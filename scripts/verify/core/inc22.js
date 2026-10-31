// Incremento 22 — cuenta regresiva y modo de prueba (HU-46; decisiones 52 y 59). Suite del núcleo,
// sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const tm = require(path.join(B, "timings.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DT = 1 / 60;
const seeded = (x = 7) => () => (x = (x * 16807) % 2147483647) / 2147483647;
const step = (s, n, dir = null, power = false) => { for (let i = 0; i < n; i++) st.updateGameState(s, DT, dir, power); };
const secs = t => Math.round(t / DT);
const PACMAN = { mode: "pacman", timings: tm.STANDARD_TIMINGS };
const GHOSTMAN = kind => ({ mode: "ghostman", playerGhostKind: kind, timings: tm.STANDARD_TIMINGS });
const label = s => tm.countdownLabel(s.countdown);
const key = c => `${c.row},${c.col},${c.progress}`;

// ---------- Duraciones (decisión 59)
{
  const s = st.createInitialGameState({ mode: "pacman" }, seeded());
  check(s.countdown === null, "sin duraciones en la configuración (núcleo): no hay cuenta");
  check(tm.STANDARD_TIMINGS.countdownSeconds === 3.5 && tm.STANDARD_TIMINGS.readySeconds === 2, "navegador: cuenta de 3,5 s y \"¡Listo!\" de 2 s");
}

// ---------- Cuenta al inicio del nivel (sección 4.6)
for (const [name, config] of [["modo Pacman", PACMAN], ["modo GhostMan", GHOSTMAN("classic")]]) {
  const s = st.createInitialGameState(config, seeded());
  const seen = [label(s)];
  for (let i = 0; i < secs(4); i++) { step(s, 1); const l = label(s); if (l !== seen[seen.length - 1]) seen.push(l); }
  check(seen.join(" ") === "3 2 1 ¡ya! ", `${name}: la cuenta muestra ${seen.map(l => l ?? "(fin)").join(", ")}`);
}
{
  // Se mide lejos de los bordes de cada tramo, que caen justo en un cuadro de 1/60 s.
  const at = frames => { const t = st.createInitialGameState(PACMAN, seeded()); step(t, frames); return label(t); };
  const [a, b, c, d, e, f] = [55, 65, 175, 185, 205, 215].map(at);
  check(a === "3" && b === "2" && c === "1" && d === "¡ya!" && e === "¡ya!" && f === null, "1 s por número y 0,5 s para \"¡ya!\": \"3\" a los 0,92 s, \"2\" a 1,08 s, \"1\" a 2,92 s, \"¡ya!\" a 3,08 y 3,42 s, y a 3,58 s terminó");
}

// ---------- Nada avanza durante la cuenta (HU-46)
{
  const s = st.createInitialGameState(PACMAN, seeded());
  const pac = key(s.pacman), ghosts = s.ghosts.map(key), timers = s.ghosts.map(g => g.releaseTimer);
  step(s, secs(3.4), "left");
  check(key(s.pacman) === pac && s.pacman.desiredDirection === null, "modo Pacman: con ← presionada durante la cuenta, Pacman no se mueve");
  check(s.ghosts.every((g, i) => key(g) === ghosts[i]), "los fantasmas no se mueven");
  check(s.levelElapsed === 0, "el reloj del bonus por tiempo no avanza");
  check(s.ghosts.every((g, i) => g.releaseTimer === timers[i]) && s.ghosts.filter(g => g.inHouse).length === 3, "la salida de la base no avanza: siguen tres adentro");
  // La salida cuenta desde el "¡ya!" (decisión 45): el segundo fantasma sale a los 3 s de juego.
  step(s, secs(0.1) + secs(2.9));
  const firstInside = s.ghosts.find(g => g.releaseDelay === 3);
  check(firstInside.inHouse, "2,9 s después del \"¡ya!\" el primer fantasma de la base sigue adentro");
  step(s, secs(0.3));
  check(!firstInside.inHouse || firstInside.releaseTimer === 0, "a los 3 s del \"¡ya!\" empieza a salir");
}
{
  // Cooldowns, PowerUp, frutas y frutas falsas congelados
  const s = st.createInitialGameState(GHOSTMAN("naval"), seeded());
  const pg = st.getPlayerGhost(s);
  pg.powerCooldown = 5;
  s.powerUpActive = true; s.powerUpTimer = 4;
  s.fakeFruits = [{ row: 3, col: 6, timeLeft: 7, knownByPacman: false, memorySeconds: 0 }];
  s.fruits = [{ row: 3, col: 9, timeLeft: 9 }];
  s.fruitSpawnTimer = 1;
  const pac = key(s.pacman);
  step(s, secs(3), "up", true);
  check(pg.powerCooldown === 5, "el cooldown del poder no avanza");
  check(s.powerUpTimer === 4 && s.powerUpActive, "el PowerUp no avanza");
  check(s.fakeFruits[0].timeLeft === 7 && s.fruits[0].timeLeft === 9 && s.fruitSpawnTimer === 1, "las frutas y las frutas falsas no avanzan");
  check(key(s.pacman) === pac, "modo GhostMan: la IA de Pacman no se mueve");
  check(pg.inHouse && s.fakeFruits.length === 1, "la tecla ↑ y la barra espaciadora durante la cuenta no tienen efecto (sigue en la base y sin fruta nueva)");
}

// ---------- Pausa (HU-46)
{
  const s = st.createInitialGameState(PACMAN, seeded());
  step(s, secs(1));
  const left = s.countdown.timeLeft;
  st.togglePause(s);
  step(s, secs(5));
  check(s.countdown && s.countdown.timeLeft === left, `en pausa la cuenta se detiene (quedan ${left.toFixed(2)} s)`);
  st.togglePause(s);
  step(s, secs(1.2));
  check(label(s) === "1", "al quitar la pausa se reanuda donde estaba (1,2 s después muestra \"1\")");
}

// ---------- "¡Listo!" después de perder una vida (decisión 52)
{
  const s = st.createInitialGameState(PACMAN, seeded());
  step(s, secs(3.6));
  const g = s.ghosts.find(x => !x.inHouse);
  g.row = s.pacman.row; g.col = s.pacman.col; g.progress = 0;
  step(s, 1);
  check(s.lives === 2 && label(s) === "¡Listo!", "modo Pacman: al perder una vida se muestra \"¡Listo!\"");
  const pac = key(s.pacman);
  step(s, secs(1.95), "left");
  check(label(s) === "¡Listo!" && key(s.pacman) === pac, "durante los 2 s nada se mueve");
  step(s, secs(0.1));
  check(s.countdown === null, "a los 2 s termina y el juego sigue");
}
{
  const s = st.createInitialGameState(GHOSTMAN("classic"), seeded());
  step(s, secs(3.6));
  const pg = st.getPlayerGhost(s);
  pg.inHouse = false; pg.row = s.pacman.row; pg.col = s.pacman.col; pg.progress = 0;
  step(s, 1);
  check(s.lives === 2 && label(s) === "¡Listo!", "modo GhostMan: después de una derrota de Pacman se muestra \"¡Listo!\"");
}
{
  // Última vida: Game Over, sin "¡Listo!"
  const s = st.createInitialGameState(PACMAN, seeded());
  step(s, secs(3.6));
  s.lives = 1;
  const g = s.ghosts.find(x => !x.inHouse);
  g.row = s.pacman.row; g.col = s.pacman.col; g.progress = 0;
  step(s, 1);
  check(s.gameOver && s.countdown === null, "con la última vida va directo al Game Over, sin \"¡Listo!\"");
}

// ---------- Cuenta en cada nivel y al volver a jugar
{
  const s = st.createInitialGameState(PACMAN, seeded());
  step(s, secs(3.6));
  s.levelComplete = true; s.levelTransitionTimer = 0.001;
  step(s, 1);
  check(s.level === 2 && label(s) === "3", "al cargar el nivel 2 arranca la cuenta");
  st.restartGame(s);
  check(s.level === 1 && label(s) === "3", "\"Volver a jugar\" arranca con la cuenta");
}

// ---------- Modo de prueba (sección 4.9)
check(tm.isTestMode("?modoPrueba=1", true), "?modoPrueba=1 en un build de prueba: modo de prueba");
check(!tm.isTestMode("?modoPrueba=1", false), "?modoPrueba=1 sin la variable de build (Vercel): se ignora");
check(!tm.isTestMode("", true) && !tm.isTestMode("?modoPrueba=0", true), "sin el parámetro, o con otro valor: juego normal");
check(tm.resolveTimings("?modoPrueba=1", true) === tm.NO_WAIT_TIMINGS && tm.resolveTimings("?modoPrueba=1", false) === tm.STANDARD_TIMINGS,
  "el modo de prueba pone las duraciones en 0; si no, se usan 3,5 s y 2 s");

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
