import { canEnterCell, getOppositeDirection, neighborCell, type Direction, type Mover } from "./movement";
import type { GameMap, MapCell } from "./types";

// Base de los fantasmas (sección 4.2 de la V3, decisiones 44 a 46). Los fantasmas que salen de la
// base y los ojos de los comidos no usan la IA de persecución: siguen el camino más corto hacia
// la salida o hacia el centro de la base, y son los únicos que pueden cruzar la puerta.

/** Intervalo entre las salidas de los fantasmas que arrancan dentro de la base (decisión 45). */
export const HOUSE_RELEASE_INTERVAL_SECONDS = 3;
/** El naval espera dentro de la base antes de salir, al revivir (decisión 46). */
export const NAVAL_HOUSE_WAIT_SECONDS = 3;

const DIRECTIONS: readonly Direction[] = ["up", "left", "down", "right"];

/** Celdas que puede pisar un fantasma que sale de la base o los ojos que vuelven: el laberinto y la puerta. */
export function canCrossDoor(map: GameMap, row: number, col: number): boolean {
  return canEnterCell(map, row, col) || map.cells[row]?.[col] === "door";
}

/** Distancia de recorrido de cada celda hasta `target`, pudiendo cruzar la puerta. */
function distancesTo(map: GameMap, target: MapCell): number[][] {
  const dist = Array.from({ length: map.rows }, () => new Array<number>(map.cols).fill(Infinity));
  dist[target.row][target.col] = 0;
  const queue: MapCell[] = [target];
  for (let head = 0; head < queue.length; head++) {
    const { row, col } = queue[head];
    for (const direction of DIRECTIONS) {
      const next = neighborCell(map, row, col, direction);
      if (!canCrossDoor(map, next.row, next.col) || dist[next.row][next.col] !== Infinity) continue;
      dist[next.row][next.col] = dist[row][col] + 1;
      queue.push(next);
    }
  }
  return dist;
}

/** Dirección del primer paso del camino más corto hacia `target` (null si ya llegó o no hay camino). */
export function directionToward(map: GameMap, from: MapCell, target: MapCell): Direction | null {
  if (from.row === target.row && from.col === target.col) return null;
  const dist = distancesTo(map, target);
  let best: Direction | null = null;
  let bestDistance = dist[from.row]?.[from.col] ?? Infinity;
  for (const direction of DIRECTIONS) {
    const next = neighborCell(map, from.row, from.col, direction);
    const distance = dist[next.row]?.[next.col] ?? Infinity;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = direction;
    }
  }
  return best;
}

/**
 * Avanza un personaje hacia `target` por el camino más corto, cruzando la puerta si hace falta.
 * Devuelve true cuando está parado en el centro de `target`.
 */
export function moveToward(mover: Mover, map: GameMap, deltaSeconds: number, target: MapCell, speed: number): boolean {
  let budget = speed * deltaSeconds;
  for (;;) {
    if (mover.progress === 0) {
      if (mover.row === target.row && mover.col === target.col) {
        mover.direction = null;
        return true;
      }
      mover.direction = directionToward(map, mover, target);
      if (!mover.direction) return false;
    }
    const step = Math.min(budget, 1 - mover.progress);
    mover.progress += step;
    budget -= step;
    if (mover.progress < 1) return false;
    const next = neighborCell(map, mover.row, mover.col, mover.direction!);
    mover.row = next.row;
    mover.col = next.col;
    mover.progress = 0;
    if (budget <= 0) return mover.row === target.row && mover.col === target.col;
  }
}

/**
 * Al ser comido a mitad de camino entre dos celdas: si ese paso lo aleja de `target`, los ojos dan
 * media vuelta en lugar de terminarlo, para volver por el camino más corto.
 */
export function turnTowardIfMidStep(mover: Mover, map: GameMap, target: MapCell): void {
  if (mover.progress === 0 || !mover.direction) return;
  if (directionToward(map, mover, target) === mover.direction) return;
  const next = neighborCell(map, mover.row, mover.col, mover.direction);
  mover.row = next.row;
  mover.col = next.col;
  mover.progress = 1 - mover.progress;
  mover.direction = getOppositeDirection(mover.direction);
}
