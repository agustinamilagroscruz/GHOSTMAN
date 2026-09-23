import type { CellType, GameMap, PelletType } from "../types";

// Nivel 1: mapa fijo y determinístico (no se genera al azar, no cambia entre partidas).
const ROWS = 15;
const COLS = 17;

/**
 * Genera el mapa del nivel 1 como una grilla tipo "panal": las celdas interiores
 * son transitables salvo aquellas en las que tanto la fila como la columna son
 * pares, que quedan como pilares de muro. El resultado es un laberinto con
 * intersecciones reales en cada cruce, necesarias para que la IA de los
 * fantasmas (persecución/dispersión) tenga decisiones de dirección observables.
 */
export function createLevel1Map(): GameMap {
  const cells: CellType[][] = Array.from({ length: ROWS }, () =>
    Array<CellType>(COLS).fill("wall")
  );

  for (let row = 1; row < ROWS - 1; row++) {
    for (let col = 1; col < COLS - 1; col++) {
      const isPillar = row % 2 === 0 && col % 2 === 0;
      cells[row][col] = isPillar ? "wall" : "path";
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
