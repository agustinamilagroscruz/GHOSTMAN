import type { CellType, GameMap, PelletType } from "../types";

/**
 * Convierte un mapa escrito como texto en la estructura de datos del juego.
 * `#` muro, `.` camino con esfera común, `o` camino con esfera grande.
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
    cells.push([...line].map((ch) => (ch === "#" ? "wall" : "path")));
    pellets.push([...line].map((ch) => (ch === "o" ? "power" : ch === "." ? "pellet" : "none")));
  });

  return { rows, cols, cells, pellets };
}
