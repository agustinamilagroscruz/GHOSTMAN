// Incremento 21 — escala del original y mapas compactos (HU-44, HU-45, HU-50; decisiones 68 a 71).
// Suite del núcleo, sin navegador. Se corre con `npm run verify` (recibe el directorio del núcleo
// compilado).
const path = require("path");
const B = process.argv[2];
const st = require(path.join(B, "state.js"));
const { LEVELS } = require(path.join(B, "levels.js"));
const { CLASSIC_GHOST_SPEED, EYES_SPEED } = require(path.join(B, "ghosts.js"));
const { isPhaseableWall } = require(path.join(B, "ghosts.js"));
const { wallOutlineSides, drawWrapped, SPRITE_RADIUS } = require(path.join(B, "render.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const seeded = (x = 7) => () => (x = (x * 16807) % 2147483647) / 2147483647;

// ---------- Mapas compactos (decisión 69)
const EXPECTED = {
  1: { pellets: 258, power: ["1,1", "1,26", "23,1", "23,26"], phase: 30 },
  2: { pellets: 268, power: ["3,1", "3,26", "22,1", "22,26"], phase: 22 },
  3: { pellets: 258, power: ["1,1", "1,26", "29,1", "29,26"], phase: 46 },
};
const isOpen = (map, r, c) => map.cells[r]?.[(c + map.cols) % map.cols] === "path";
const inHouse = (map, r, c) => r >= map.house.top && r <= map.house.bottom && c >= map.house.left && c <= map.house.right;
for (const level of [1, 2, 3]) {
  const map = LEVELS[level].createMap();
  const e = EXPECTED[level];
  check(map.rows === 31 && map.cols === 28, `nivel ${level}: 28 × 31`);
  const cells = [];
  for (let r = 0; r < map.rows; r++) for (let c = 0; c < map.cols; c++) cells.push([r, c]);
  const pellets = cells.filter(([r, c]) => map.pellets[r][c] === "pellet").length;
  const power = cells.filter(([r, c]) => map.pellets[r][c] === "power").map(([r, c]) => `${r},${c}`);
  check(pellets === e.pellets, `nivel ${level}: ${pellets} esferas comunes (se esperaban ${e.pellets}; antes, 344 a 388)`);
  check(power.join(" ") === e.power.join(" "), `nivel ${level}: esferas grandes en ${power.join(" ")}`);
  check(map.cells.every(line => line.every((cell, c) => cell === line[map.cols - 1 - c])), `nivel ${level}: simétrico`);
  // Marco fijo: base, puerta, túnel, aparición de Pacman y esquinas
  check(map.house.top === 12 && map.house.bottom === 16 && map.house.left === 10 && map.house.right === 17 &&
    map.house.door.map(d => `${d.row},${d.col}`).join() === "12,13,12,14", `nivel ${level}: base en filas 12 a 16 y columnas 10 a 17, puerta en (12,13) y (12,14)`);
  check([...map.tunnelCells].sort().join(" ") === ["13,0", "13,1", "13,2", "13,3", "13,24", "13,25", "13,26", "13,27"].sort().join(" "), `nivel ${level}: túnel en la fila 13, columnas 0 a 3 y 24 a 27`);
  check(isOpen(map, 23, 13) && map.pellets[23][13] === "none" && map.pellets[23][14] === "none", `nivel ${level}: aparición de Pacman en (23,13) sin esfera`);
  check([[1, 1], [1, 26], [29, 1], [29, 26]].every(([r, c]) => isOpen(map, r, c)), `nivel ${level}: las cuatro esquinas son pasillo`);
  // Sin callejones ni espacios de 2 × 2 fuera de la base; todo conectado desde la aparición de Pacman
  const open = cells.filter(([r, c]) => isOpen(map, r, c) && !inHouse(map, r, c));
  const deadEnds = open.filter(([r, c]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => isOpen(map, r + a, c + b) || map.cells[r + a]?.[c + b] === "door").length < 2);
  check(deadEnds.length === 0, `nivel ${level}: sin callejones${deadEnds.length ? " (" + deadEnds.join(" ") + ")" : ""}`);
  const squares = open.filter(([r, c]) => [[0, 1], [1, 0], [1, 1]].every(([a, b]) => isOpen(map, r + a, c + b) && !inHouse(map, r + a, c + b)));
  check(squares.length === 0, `nivel ${level}: sin espacios abiertos de 2 × 2${squares.length ? " (" + squares.join(" ") + ")" : ""}`);
  const seen = new Set(["23,13"]); const queue = [[23, 13]];
  while (queue.length) {
    const [r, c] = queue.pop();
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + a, nc = (c + b + map.cols) % map.cols;
      if (!seen.has(`${nr},${nc}`) && isOpen(map, nr, nc) && !inHouse(map, nr, nc)) { seen.add(`${nr},${nc}`); queue.push([nr, nc]); }
    }
  }
  check(open.every(([r, c]) => seen.has(`${r},${c}`)), `nivel ${level}: todos los pasillos conectados (también a través del túnel)`);
  // Cruces del espectro (decisión 26): muro interior de una celda con pasillo a los dos lados
  const phase = cells.filter(([r, c]) => isPhaseableWall(map, r, c) &&
    ((isOpen(map, r - 1, c) && isOpen(map, r + 1, c) && !inHouse(map, r - 1, c) && !inHouse(map, r + 1, c)) ||
     (isOpen(map, r, c - 1) && isOpen(map, r, c + 1) && !inHouse(map, r, c - 1) && !inHouse(map, r, c + 1)))).length;
  check(phase === e.phase, `nivel ${level}: ${phase} muros que el espectro puede cruzar`);
}
{
  // Nivel 3 del modo GhostMan: las esferas grandes extra (15,1) y (15,26) caen en pasillo
  const map = LEVELS[3].createMap();
  check(isOpen(map, 15, 1) && isOpen(map, 15, 26), "nivel 3: (15,1) y (15,26) son pasillo para las esferas extra del modo GhostMan (decisión 51)");
}

// ---------- Velocidades (decisión 70)
{
  const s = st.createInitialGameState({ mode: "pacman" }, seeded());
  check(s.pacman.speed === 4.5, `Pacman a ${s.pacman.speed} celdas/s (3,75 en la V2)`);
  check(CLASSIC_GHOST_SPEED === 4.5 && EYES_SPEED === 9, `fantasma clásico a ${CLASSIC_GHOST_SPEED} celdas/s y ojos a ${EYES_SPEED}`);
  check(s.ghosts.every(g => Math.abs(g.speed - 4.5 * 0.85) < 1e-9), `modo Pacman: fantasmas a ${s.ghosts[0].speed.toFixed(3)} celdas/s (−15 %, decisión 40)`);
  const g = st.createInitialGameState({ mode: "ghostman", playerGhostKind: "specter" }, seeded());
  const specter = st.getPlayerGhost(g);
  check(Math.abs(specter.speed - 4.5 * 0.7) < 1e-9, `modo GhostMan: espectro del jugador a ${specter.speed.toFixed(2)} celdas/s (−30 %)`);
  check(Math.abs(g.pacman.speed - 4.5 * 0.85) < 1e-9, `modo GhostMan: Pacman (IA) a ${g.pacman.speed.toFixed(3)} celdas/s (−15 %, decisión 71)`);
}

// ---------- Contorno de los muros (decisión 68)
{
  // Mapa mínimo armado a mano: el contorno solo mira las celdas.
  const layout = [
    "#########",
    "#.......#",
    "#.#.###.#",
    "#...###.#",
    "#.#.###.#",
    "#.......#",
    "#########",
  ];
  const map = { rows: layout.length, cols: layout[0].length, cells: layout.map(line => [...line].map(ch => (ch === "#" ? "wall" : "path"))) };
  const sides = (r, c) => wallOutlineSides(map, r, c).sort().join(",");
  check(sides(3, 5) === "", "el interior de un bloque grueso no tiene contorno");
  check(sides(2, 4) === "down,right", "la esquina de un bloque grueso une sus dos lados (se dibuja redondeada)");
  check(sides(2, 5) === "left,right", "el borde de un bloque grueso es una línea recta");
  check(sides(2, 2) === "", "un pilar de una celda no tiene tramos (se dibuja como un punto)");
  check(sides(0, 4) === "left,right", "el borde del mapa solo tiene contorno hacia adentro");
  check(sides(1, 1) === "", "una celda de pasillo no tiene contorno");
}

// ---------- Personaje a mitad del túnel (decisión 50 con la escala nueva)
{
  const drawn = col => { const cols = []; drawWrapped(28, col, c => cols.push(c)); return cols; };
  const overhang = SPRITE_RADIUS - 0.5;
  check(drawn(0.2).length === 2 && drawn(0.2)[1] === 28.2, `en la columna 0,2 el sprite (radio ${SPRITE_RADIUS}) asoma por los dos bordes`);
  check(drawn(26.9).length === 2 && Math.abs(drawn(26.9)[1] + 1.1) < 1e-9, "en la columna 26,9 también se dibuja la copia del borde izquierdo");
  check(drawn(overhang + 0.01).length === 1 && drawn(13).length === 1, "lejos del borde se dibuja una sola vez");
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
