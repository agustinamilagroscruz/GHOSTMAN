import type { CellType, GameMap, GhostHouse, MapCell, PelletType } from "../types";

/**
 * Convierte un mapa escrito como texto en la estructura de datos del juego.
 * `#` muro, `.` camino con esfera común, `o` camino con esfera grande, espacio camino sin esfera
 * y `-` puerta de la base de los fantasmas (sección 4.1 de la V3).
 * El dibujo del texto ES el mapa: fijo, determinístico e igual en todas las partidas.
 */
export function parseMap(layout: readonly string[]): GameMap {
  const rows = layout.length;
  const cols = layout[0].length;

  const cells: CellType[][] = [];
  const pellets: PelletType[][] = [];

  layout.forEach((line, row) => {
    if (line.length !== cols) {
      throw new Error(`Fila ${row} del mapa con ${line.length} columnas (se esperaban ${cols})`);
    }
    cells.push([...line].map((ch) => (ch === "#" ? "wall" : ch === "-" ? "door" : "path")));
    pellets.push([...line].map((ch) => (ch === "o" ? "power" : ch === "." ? "pellet" : "none")));
  });

  return { rows, cols, cells, pellets, house: findHouse(cells), tunnelCells: findTunnelCells(cells, pellets) };
}

/** La base es el recinto cerrado debajo de la puerta: su interior se encuentra recorriéndolo desde ahí. */
function findHouse(cells: CellType[][]): GhostHouse {
  const door: MapCell[] = [];
  cells.forEach((line, row) => line.forEach((cell, col) => cell === "door" && door.push({ row, col })));
  if (door.length === 0) throw new Error("El mapa no tiene puerta de la base de los fantasmas");

  const interior: MapCell[] = [];
  const seen = new Set<string>();
  const pending: MapCell[] = [{ row: door[0].row + 1, col: door[0].col }];
  while (pending.length > 0) {
    const cell = pending.pop()!;
    const key = `${cell.row},${cell.col}`;
    if (seen.has(key) || cells[cell.row]?.[cell.col] !== "path") continue;
    seen.add(key);
    interior.push(cell);
    for (const [dRow, dCol] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) pending.push({ row: cell.row + dRow, col: cell.col + dCol });
  }
  const top = Math.min(...interior.map((cell) => cell.row)) - 1;
  const bottom = Math.max(...interior.map((cell) => cell.row)) + 1;
  const left = Math.min(...interior.map((cell) => cell.col)) - 1;
  const right = Math.max(...interior.map((cell) => cell.col)) + 1;
  const middleRow = Math.round((top + bottom) / 2);
  const doorCol = Math.min(...door.map((cell) => cell.col));
  return {
    door,
    top,
    bottom,
    left,
    right,
    exit: { row: door[0].row - 1, col: doorCol },
    center: { row: middleRow, col: doorCol },
    leftSlot: { row: middleRow, col: left + 1 },
    rightSlot: { row: middleRow, col: right - 1 },
  };
}

/** Túnel: en una fila con camino en los dos bordes, las celdas sin esfera pegadas a cada borde. */
function findTunnelCells(cells: CellType[][], pellets: PelletType[][]): Set<string> {
  const tunnel = new Set<string>();
  const cols = cells[0].length;
  cells.forEach((line, row) => {
    if (line[0] !== "path" || line[cols - 1] !== "path") return;
    for (let col = 0; col < cols && line[col] === "path" && pellets[row][col] === "none"; col++) tunnel.add(`${row},${col}`);
    for (let col = cols - 1; col >= 0 && line[col] === "path" && pellets[row][col] === "none"; col--) tunnel.add(`${row},${col}`);
  });
  return tunnel;
}
