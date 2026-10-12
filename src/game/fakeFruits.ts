import { canEnterCell, DIRECTION_VECTORS, type Direction } from "./movement";
import type { GameMap } from "./types";

// Frutas falsas del Naval (sección 4.6 de la V2, sección 4.8 de la V1). Son entidades del
// mapa, independientes de quién las colocó: las coloca el naval del jugador y, desde el
// incremento 16, también el naval de la IA en el modo Pacman.

export const FAKE_FRUIT_FUSE_SECONDS = 10;
export const MAX_SIMULTANEOUS_FAKE_FRUITS = 2;
export const NAVAL_PLACE_COOLDOWN_SECONDS = 5;
/** Radio de la explosión en pasos por celdas transitables (decisión 27). */
export const EXPLOSION_RADIUS_STEPS = 3;
/** Últimos segundos antes de explotar en los que se muestra la cuenta regresiva. */
export const FAKE_FRUIT_WARNING_SECONDS = 3;
/** Duración del dibujo de la explosión (solo visual). */
export const EXPLOSION_DISPLAY_SECONDS = 0.6;

export interface FakeFruit {
  row: number;
  col: number;
  /** Segundos hasta explotar. */
  timeLeft: number;
}

export interface Explosion {
  cells: ReadonlyArray<{ row: number; col: number }>;
  /** Segundos que le quedan al dibujo de la explosión. */
  timeLeft: number;
}

export function createFakeFruit(row: number, col: number): FakeFruit {
  return { row, col, timeLeft: FAKE_FRUIT_FUSE_SECONDS };
}

/** Se puede colocar una fruta en la celda si hay menos de 2 en el mapa y la celda no tiene una. */
export function canPlaceFakeFruit(fruits: readonly FakeFruit[], row: number, col: number): boolean {
  if (fruits.length >= MAX_SIMULTANEOUS_FAKE_FRUITS) return false;
  return !fruits.some((fruit) => fruit.row === row && fruit.col === col);
}

const DIRECTIONS: readonly Direction[] = ["up", "left", "down", "right"];

/** Celdas alcanzadas por la explosión: a 3 pasos o menos por celdas transitables, sin atravesar muros. */
export function explosionCells(map: GameMap, row: number, col: number): Array<{ row: number; col: number }> {
  const visited = new Set<string>([`${row},${col}`]);
  const cells = [{ row, col }];
  let frontier = [{ row, col }];
  for (let stepCount = 0; stepCount < EXPLOSION_RADIUS_STEPS; stepCount++) {
    const next: Array<{ row: number; col: number }> = [];
    for (const cell of frontier) {
      for (const direction of DIRECTIONS) {
        const [dRow, dCol] = DIRECTION_VECTORS[direction];
        const r = cell.row + dRow;
        const c = cell.col + dCol;
        const key = `${r},${c}`;
        if (visited.has(key) || !canEnterCell(map, r, c)) continue;
        visited.add(key);
        next.push({ row: r, col: c });
      }
    }
    cells.push(...next);
    frontier = next;
  }
  return cells;
}
