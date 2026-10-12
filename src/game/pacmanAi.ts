import { canGhostHarm, type Ghost } from "./ghosts";
import { canEnterCell, DIRECTION_VECTORS, getMoverPosition, type Direction, type Mover } from "./movement";
import type { GameMap } from "./types";

// IA de Pacman para el modo GhostMan (sección 4.7, decisión 17). Pacman decide con estas
// prioridades: 1) huir de un fantasma peligroso cercano, 2) con el PowerUp, perseguir a un
// fantasma vulnerable, 3) ir por una fruta cercana (real o falsa: no las distingue),
// 4) ir a la esfera más cercana. Todas las distancias son de recorrido (BFS), no en línea recta.

/** Un fantasma que puede dañarlo a esta distancia de recorrido (o menos) lo hace huir. */
export const PACMAN_FLEE_DISTANCE = 4;
/** Con el PowerUp persigue fantasmas vulnerables a esta distancia de recorrido (o menos). */
export const PACMAN_HUNT_DISTANCE = 8;
/** Va por una fruta a esta distancia de recorrido (o menos). */
export const PACMAN_FRUIT_DISTANCE = 5;

/** Orden de desempate entre direcciones equivalentes: arriba, izquierda, abajo, derecha. */
const TIE_BREAK_ORDER: readonly Direction[] = ["up", "left", "down", "right"];

type Cell = { row: number; col: number };

export interface PacmanAiView {
  map: GameMap;
  pacman: Mover;
  ghosts: readonly Ghost[];
  powerUpActive: boolean;
  /** Frutas en el mapa: reales y, desde el incremento 14, falsas. La IA no las distingue. */
  fruits: readonly Cell[];
}

/** Celda transitable más cercana a la posición interpolada de un fantasma. */
function ghostCell(ghost: Ghost): Cell {
  const position = getMoverPosition(ghost);
  return { row: Math.round(position.row), col: Math.round(position.col) };
}

function createGrid(map: GameMap, value: number): number[][] {
  return Array.from({ length: map.rows }, () => new Array<number>(map.cols).fill(value));
}

/** Distancia de recorrido desde las celdas de origen a todo el mapa (BFS multi-origen). */
function distancesFrom(map: GameMap, sources: readonly Cell[]): number[][] {
  const dist = createGrid(map, Infinity);
  const queue: Cell[] = [];
  for (const source of sources) {
    if (source.row < 0 || source.row >= map.rows || source.col < 0 || source.col >= map.cols) continue;
    if (dist[source.row][source.col] === 0) continue;
    dist[source.row][source.col] = 0;
    queue.push(source);
  }
  for (let head = 0; head < queue.length; head++) {
    const { row, col } = queue[head];
    for (const direction of TIE_BREAK_ORDER) {
      const [dRow, dCol] = DIRECTION_VECTORS[direction];
      const next = { row: row + dRow, col: col + dCol };
      if (!canEnterCell(map, next.row, next.col) || dist[next.row][next.col] !== Infinity) continue;
      dist[next.row][next.col] = dist[row][col] + 1;
      queue.push(next);
    }
  }
  return dist;
}

interface PathSearch {
  dist: number[][];
  /** Primera dirección a tomar desde el origen para llegar a cada celda por el camino más corto. */
  firstStep: (Direction | null)[][];
}

/** BFS desde Pacman que recuerda el primer paso de cada camino (con desempate fijo). */
function searchFrom(map: GameMap, origin: Cell): PathSearch {
  const dist = createGrid(map, Infinity);
  const firstStep: (Direction | null)[][] = Array.from({ length: map.rows }, () => new Array(map.cols).fill(null));
  dist[origin.row][origin.col] = 0;
  const queue: Cell[] = [origin];
  for (let head = 0; head < queue.length; head++) {
    const { row, col } = queue[head];
    for (const direction of TIE_BREAK_ORDER) {
      const [dRow, dCol] = DIRECTION_VECTORS[direction];
      const next = { row: row + dRow, col: col + dCol };
      if (!canEnterCell(map, next.row, next.col) || dist[next.row][next.col] !== Infinity) continue;
      dist[next.row][next.col] = dist[row][col] + 1;
      firstStep[next.row][next.col] = head === 0 ? direction : firstStep[row][col];
      queue.push(next);
    }
  }
  return { dist, firstStep };
}

/** Primer paso hacia el objetivo más cercano dentro de `maxDistance` (o null si no hay ninguno). */
function stepTowardNearest(search: PathSearch, targets: readonly Cell[], maxDistance = Infinity): Direction | null {
  let best: Cell | null = null;
  let bestDistance = Infinity;
  for (const target of targets) {
    const distance = search.dist[target.row]?.[target.col] ?? Infinity;
    if (distance === 0 || distance > maxDistance) continue;
    // Empate de distancia: gana el primer paso con mejor orden de desempate.
    if (
      distance < bestDistance ||
      (distance === bestDistance &&
        best &&
        TIE_BREAK_ORDER.indexOf(search.firstStep[target.row][target.col]!) <
          TIE_BREAK_ORDER.indexOf(search.firstStep[best.row][best.col]!))
    ) {
      best = target;
      bestDistance = distance;
    }
  }
  return best ? search.firstStep[best.row][best.col] : null;
}

function pelletCells(map: GameMap): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      if (map.pellets[row][col] !== "none") cells.push({ row, col });
    }
  }
  return cells;
}

/** Huida: la celda vecina transitable más lejos (por recorrido) del fantasma peligroso más cercano. */
function fleeDirection(map: GameMap, from: Cell, dangerDist: number[][]): Direction | null {
  let best: Direction | null = null;
  let bestDistance = -Infinity;
  for (const direction of TIE_BREAK_ORDER) {
    const [dRow, dCol] = DIRECTION_VECTORS[direction];
    const row = from.row + dRow;
    const col = from.col + dCol;
    if (!canEnterCell(map, row, col)) continue;
    const distance = dangerDist[row][col];
    if (distance > bestDistance) {
      bestDistance = distance;
      best = direction;
    }
  }
  return best;
}

/**
 * Dirección que toma Pacman parado en el centro de su celda actual (null = quedarse quieto).
 * Se invoca desde el movimiento cada vez que llega a una celda (sección 4.7).
 */
export function decidePacmanDirection(view: PacmanAiView): Direction | null {
  const { map, pacman, ghosts } = view;
  const from: Cell = { row: pacman.row, col: pacman.col };

  // 1. Huir de un fantasma que puede dañarlo.
  const dangerous = ghosts.filter((ghost) => canGhostHarm(ghost)).map(ghostCell);
  if (dangerous.length > 0) {
    const dangerDist = distancesFrom(map, dangerous);
    if (dangerDist[from.row][from.col] <= PACMAN_FLEE_DISTANCE) {
      return fleeDirection(map, from, dangerDist);
    }
  }

  const search = searchFrom(map, from);

  // 2. Con el PowerUp, perseguir al fantasma vulnerable más cercano.
  if (view.powerUpActive) {
    const vulnerable = ghosts.filter((ghost) => ghost.vulnerable && !ghost.eaten).map(ghostCell);
    const step = stepTowardNearest(search, vulnerable, PACMAN_HUNT_DISTANCE);
    if (step) return step;
  }

  // 3. Ir por una fruta cercana.
  const fruitStep = stepTowardNearest(search, view.fruits, PACMAN_FRUIT_DISTANCE);
  if (fruitStep) return fruitStep;

  // 4. Ir a la esfera más cercana.
  return stepTowardNearest(search, pelletCells(map));
}
