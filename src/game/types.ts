// Estructura de datos del mapa, independiente del renderizado y del control por teclado.

/** "door": puerta de la base de los fantasmas (V3, HU-44). Solo la cruzan los fantasmas. */
export type CellType = "wall" | "path" | "door";

export type PelletType = "none" | "pellet" | "power";

export interface MapCell {
  row: number;
  col: number;
}

/** Base de los fantasmas (sección 4.2 de la V3). La misma en los tres niveles. */
export interface GhostHouse {
  /** Celdas de la puerta (fila superior de la base). */
  readonly door: readonly MapCell[];
  /** Límites de la base, muros incluidos: nada de lo que está adentro es parte del laberinto. */
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  /** Celda de afuera, sobre la puerta, donde termina la salida de un fantasma. */
  readonly exit: MapCell;
  /** Celdas del interior donde esperan los fantasmas: centro, izquierda y derecha. */
  readonly center: MapCell;
  readonly leftSlot: MapCell;
  readonly rightSlot: MapCell;
}

export interface GameMap {
  readonly rows: number;
  readonly cols: number;
  /** [fila][columna]. Mutable solo para la destrucción de paredes del modo GhostMan (HU-33). */
  readonly cells: CellType[][];
  readonly pellets: PelletType[][]; // [fila][columna], mutable a medida que se consumen
  readonly house: GhostHouse;
  /** Celdas del túnel (HU-45), como "fila,columna": las de una fila de túnel, sin esfera, pegadas a cada borde. */
  readonly tunnelCells: ReadonlySet<string>;
}
