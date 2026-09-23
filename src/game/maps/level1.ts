import type { CellType, GameMap, PelletType } from "../types";

// Nivel 1: mapa fijo y determinístico (no se genera al azar, no cambia entre partidas).
const ROWS = 15;
const COLS = 17;

/**
 * Genera el mapa del nivel 1 como un corredor serpenteante: filas impares son
 * corredores horizontales completos, filas pares conectan un corredor con el
 * siguiente por un extremo alternado. El resultado es un laberinto simple y
 * totalmente conectado.
 */
export function createLevel1Map(): GameMap {
  const cells: CellType[][] = Array.from({ length: ROWS }, () =>
    Array<CellType>(COLS).fill("wall")
  );

  for (let row = 1; row < ROWS - 1; row++) {
    const isCorridorRow = row % 2 === 1;

    if (isCorridorRow) {
      for (let col = 1; col < COLS - 1; col++) {
        cells[row][col] = "path";
      }
    } else {
      const connectorCol = row % 4 === 0 ? COLS - 2 : 1;
      cells[row][connectorCol] = "path";
    }
  }

  const pellets: PelletType[][] = cells.map((rowCells) =>
    rowCells.map((cell) => (cell === "path" ? "pellet" : "none"))
  );

  const powerPelletCells: ReadonlyArray<readonly [number, number]> = [
    [1, 1],
    [1, COLS - 2],
    [ROWS - 2, 1],
    [ROWS - 2, COLS - 2],
  ];
  for (const [row, col] of powerPelletCells) {
    pellets[row][col] = "power";
  }

  return { rows: ROWS, cols: COLS, cells, pellets };
}
