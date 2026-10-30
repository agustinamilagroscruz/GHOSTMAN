// Balance del modo GhostMan: un bot que persigue a Pacman por el camino más corto juega 10
// partidas con cada tipo de fantasma (semillas fijas) y se informa victoria (V) o Game Over
// (GO@N<nivel>). Con --power, el bot además usa su poder apenas puede si Pacman está a 6
// celdas o menos (Manhattan). El bot no es un jugador real: sirve para comparar versiones.
// Uso: npm run verify:balance [-- --power]
const fs = require("fs");
const path = require("path");
const { compileGameCore } = require("../compile");
const B = compileGameCore();
const st = require(path.join(B, "state.js"));
const { canEnterCell, neighborCell } = require(path.join(B, "movement.js"));
const { directionToward } = require(path.join(B, "house.js"));
const DIRS = ["up", "left", "down", "right"];
function chaseDir(s, g) {
  // Desde el incremento 19 el fantasma arranca dentro de la base: primero sale por la puerta.
  if (g.inHouse) return directionToward(s.map, g, s.map.house.exit);
  // BFS desde Pacman (con el túnel); el bot va a la vecina con menor distancia
  const m = s.map, dist = m.cells.map(r => r.map(() => Infinity)), q = [[s.pacman.row, s.pacman.col]];
  dist[s.pacman.row][s.pacman.col] = 0;
  for (let h = 0; h < q.length; h++) { const [r, c] = q[h]; for (const d of DIRS) { const n = neighborCell(m, r, c, d); if (canEnterCell(m, n.row, n.col) && dist[n.row][n.col] === Infinity) { dist[n.row][n.col] = dist[r][c] + 1; q.push([n.row, n.col]); } } }
  let best = null, bd = Infinity;
  for (const d of DIRS) { const n = neighborCell(m, g.row, g.col, d); if (canEnterCell(m, n.row, n.col) && dist[n.row][n.col] < bd) { bd = dist[n.row][n.col]; best = d; } }
  return best;
}
const USE_POWER = process.argv.includes("--power");
for (const kind of ["classic", "specter", "jumper", "naval", "accelerated"]) {
  const res = [];
  for (let seed = 1; seed <= 10; seed++) {
    let x = seed * 7919; const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
    const s = st.createInitialGameState({ mode: "ghostman", playerGhostKind: kind }, rnd);
    let t = 0;
    while (!s.gameOver && !s.won && t < 900) { const g = st.getPlayerGhost(s); const near = Math.abs(g.row - s.pacman.row) + Math.abs(g.col - s.pacman.col) <= 6; st.updateGameState(s, 1 / 60, g.eaten ? null : chaseDir(s, g), USE_POWER && near && g.powerCooldown === 0); t += 1 / 60; }
    res.push(s.won ? "V" : s.gameOver ? `GO@N${s.level}` : "?");
  }
  console.log(kind.padEnd(9), res.join(" "));
}
fs.rmSync(B, { recursive: true, force: true });
