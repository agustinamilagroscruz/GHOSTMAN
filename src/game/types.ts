// Estructura de datos del mapa, independiente del renderizado y del control por teclado.

export type CellType = "wall" | "path";

export type PelletType = "none" | "pellet" | "power";

export interface GameMap {
  readonly rows: number;
  readonly cols: number;
  /** [fila][columna]. Mutable solo para la destrucción de paredes del modo GhostMan (HU-33). */
  readonly cells: CellType[][];
  readonly pellets: PelletType[][]; // [fila][columna], mutable a medida que se consumen
}
