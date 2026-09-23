// Estructura de datos del mapa, independiente del renderizado y del control por teclado.

export type CellType = "wall" | "path";

export type PelletType = "none" | "pellet" | "power";

export interface GameMap {
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly CellType[][]; // [fila][columna]
  readonly pellets: PelletType[][]; // [fila][columna], mutable a medida que se consumen
}
