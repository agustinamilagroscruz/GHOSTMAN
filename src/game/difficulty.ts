import { isHouseCell } from "./movement";
import type { GameMap } from "./types";

// Dificultad del modo GhostMan (sección 4.8, decisión 22): destrucción de paredes por parte de
// Pacman (niveles 2 y 3) y esferas grandes adicionales en el nivel 3. Nada de esto existe en el
// modo Pacman ni en el nivel 1.

/** Cargas de destrucción por esfera grande. Otra esfera grande las repone a 5, no las suma. */
export const WALL_CHARGES_PER_POWER_PELLET = 5;
/** Costo de recorrido de un muro interior para la IA de Pacman cuando tiene cargas. */
export const WALL_PATH_COST = 3;
/** Duración del destello/escombros sobre la pared destruida (solo visual). */
export const WALL_FLASH_SECONDS = 0.5;
/** Nivel 3 del modo GhostMan: una esfera grande dinámica cada 15 s, máximo 2 simultáneas. */
export const DYNAMIC_POWER_PELLET_INTERVAL_SECONDS = 15;
export const MAX_DYNAMIC_POWER_PELLETS = 2;
/** Nivel 3 del modo GhostMan: esferas grandes fijas además de las 4 del mapa (decisión 51). */
export const EXTRA_FIXED_POWER_PELLETS: ReadonlyArray<{ row: number; col: number }> = [
  { row: 15, col: 1 },
  { row: 15, col: 26 },
];

export interface Cell {
  row: number;
  col: number;
}

export interface WallFlash extends Cell {
  /** Segundos que le quedan al dibujo del destello. */
  timeLeft: number;
}

/**
 * Muro interior: dentro del mapa, sin tocar el borde y fuera de la base de los fantasmas. Los
 * muros del borde y los de la base son indestructibles (decisión 49).
 */
export function isInteriorWall(map: GameMap, row: number, col: number): boolean {
  if (row <= 0 || row >= map.rows - 1 || col <= 0 || col >= map.cols - 1) return false;
  return map.cells[row][col] === "wall" && !isHouseCell(map, row, col);
}

/** Convierte un muro interior en camino (sin esfera). Devuelve false si no se puede destruir. */
export function destroyWall(map: GameMap, row: number, col: number): boolean {
  if (!isInteriorWall(map, row, col)) return false;
  map.cells[row][col] = "path";
  map.pellets[row][col] = "none";
  return true;
}

/** Vuelve a levantar las paredes destruidas (reinicio del nivel por una derrota de Pacman, HU-33). */
export function restoreWalls(map: GameMap, walls: readonly Cell[]): void {
  for (const wall of walls) {
    map.cells[wall.row][wall.col] = "wall";
    map.pellets[wall.row][wall.col] = "none";
  }
}
