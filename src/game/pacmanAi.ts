import { canGhostHarm, type Ghost } from "./ghosts";
import { canEnterCell, DIRECTION_VECTORS, getMoverPosition, type Direction, type Mover } from "./movement";
import { isInteriorWall, WALL_PATH_COST } from "./difficulty";
import type { GameMap } from "./types";

// IA de Pacman para el modo GhostMan (sección 4.7 de la V2, decisión 17). Pacman decide con
// estas prioridades: 1) huir de un fantasma peligroso cercano, 2) con el PowerUp, perseguir a un
// fantasma vulnerable, 3) ir por una fruta cercana (real, o falsa que no sabe que es falsa),
// 4) ir a la esfera más cercana. Todas las distancias son de recorrido (BFS), no en línea recta.
// Las frutas falsas que recuerda las trata como muros (sección 4.5 de la V3, decisión 37).

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
  /** Frutas que la IA considera reales: las reales y las falsas que no recuerda (decisión 37). */
  fruits: readonly Cell[];
  /** Frutas falsas que la IA recuerda: las evita como si fueran muros (decisión 37). */
  knownFakeFruits?: readonly Cell[];
  /**
   * Cargas de destrucción de paredes (incremento 17, sección 4.8). Con cargas, los recorridos
   * hacia esferas, frutas y fantasmas vulnerables consideran los muros interiores como
   * transitables con costo 3. Sin cargas (o ausente), la IA decide exactamente como antes.
   */
  wallCharges?: number;
}

/** Celda transitable más cercana a la posición interpolada de un fantasma. */
function ghostCell(ghost: Ghost): Cell {
  const position = getMoverPosition(ghost);
  return { row: Math.round(position.row), col: Math.round(position.col) };
}

/** Celdas que la IA trata como muros además de los del mapa (frutas falsas que recuerda). */
type Blocked = ReadonlySet<string>;
const NOTHING_BLOCKED: Blocked = new Set();
const cellKey = (row: number, col: number) => `${row},${col}`;

function canPacmanEnter(map: GameMap, blocked: Blocked, row: number, col: number): boolean {
  return canEnterCell(map, row, col) && !blocked.has(cellKey(row, col));
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
function searchFrom(map: GameMap, origin: Cell, blocked: Blocked = NOTHING_BLOCKED): PathSearch {
  const dist = createGrid(map, Infinity);
  const firstStep: (Direction | null)[][] = Array.from({ length: map.rows }, () => new Array(map.cols).fill(null));
  dist[origin.row][origin.col] = 0;
  const queue: Cell[] = [origin];
  for (let head = 0; head < queue.length; head++) {
    const { row, col } = queue[head];
    for (const direction of TIE_BREAK_ORDER) {
      const [dRow, dCol] = DIRECTION_VECTORS[direction];
      const next = { row: row + dRow, col: col + dCol };
      if (!canPacmanEnter(map, blocked, next.row, next.col) || dist[next.row][next.col] !== Infinity) continue;
      dist[next.row][next.col] = dist[row][col] + 1;
      firstStep[next.row][next.col] = head === 0 ? direction : firstStep[row][col];
      queue.push(next);
    }
  }
  return { dist, firstStep };
}

/**
 * Variante de `searchFrom` con cargas de destrucción: Dijkstra en el que entrar a un muro
 * interior cuesta 3 y a un camino 1. Los bordes del mapa siguen siendo infranqueables.
 */
function searchThroughWalls(map: GameMap, origin: Cell, blocked: Blocked = NOTHING_BLOCKED): PathSearch {
  const dist = createGrid(map, Infinity);
  const firstStep: (Direction | null)[][] = Array.from({ length: map.rows }, () => new Array(map.cols).fill(null));
  const done = createGrid(map, 0);
  dist[origin.row][origin.col] = 0;
  for (;;) {
    // Selección del nodo pendiente más cercano (el mapa tiene 255 celdas: alcanza con un barrido).
    let current: Cell | null = null;
    let currentDist = Infinity;
    for (let row = 0; row < map.rows; row++) {
      for (let col = 0; col < map.cols; col++) {
        if (!done[row][col] && dist[row][col] < currentDist) {
          currentDist = dist[row][col];
          current = { row, col };
        }
      }
    }
    if (!current) break;
    done[current.row][current.col] = 1;
    const isOrigin = current.row === origin.row && current.col === origin.col;
    for (const direction of TIE_BREAK_ORDER) {
      const [dRow, dCol] = DIRECTION_VECTORS[direction];
      const next = { row: current.row + dRow, col: current.col + dCol };
      let cost: number;
      if (blocked.has(cellKey(next.row, next.col))) continue;
      if (canEnterCell(map, next.row, next.col)) cost = 1;
      else if (isInteriorWall(map, next.row, next.col)) cost = WALL_PATH_COST;
      else continue;
      const candidate = currentDist + cost;
      if (candidate >= dist[next.row][next.col]) continue;
      dist[next.row][next.col] = candidate;
      firstStep[next.row][next.col] = isOrigin ? direction : firstStep[current.row][current.col];
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
function fleeDirection(map: GameMap, from: Cell, dangerDist: number[][], blocked: Blocked): Direction | null {
  let best: Direction | null = null;
  let bestDistance = -Infinity;
  for (const direction of TIE_BREAK_ORDER) {
    const [dRow, dCol] = DIRECTION_VECTORS[direction];
    const row = from.row + dRow;
    const col = from.col + dCol;
    if (!canPacmanEnter(map, blocked, row, col)) continue;
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
  const blocked: Blocked = new Set((view.knownFakeFruits ?? []).map((fruit) => cellKey(fruit.row, fruit.col)));

  // 1. Huir de un fantasma que puede dañarlo.
  const dangerous = ghosts.filter((ghost) => canGhostHarm(ghost)).map(ghostCell);
  if (dangerous.length > 0) {
    const dangerDist = distancesFrom(map, dangerous);
    if (dangerDist[from.row][from.col] <= PACMAN_FLEE_DISTANCE) {
      return fleeDirection(map, from, dangerDist, blocked);
    }
  }

  const search =
    view.wallCharges && view.wallCharges > 0 ? searchThroughWalls(map, from, blocked) : searchFrom(map, from, blocked);

  // 2. Con el PowerUp, perseguir al fantasma vulnerable más cercano.
  if (view.powerUpActive) {
    const vulnerable = ghosts.filter((ghost) => ghost.vulnerable && !ghost.eaten).map(ghostCell);
    const step = stepTowardNearest(search, vulnerable, PACMAN_HUNT_DISTANCE);
    if (step) return step;
  }

  // 3. Ir por una fruta cercana.
  const fruitStep = stepTowardNearest(search, view.fruits, PACMAN_FRUIT_DISTANCE);
  if (fruitStep) return fruitStep;

  // 4. Ir a la esfera más cercana. Si una fruta falsa que recuerda bloquea la única ruta, no hay
  // esfera alcanzable y se queda quieto hasta que la fruta explote.
  return stepTowardNearest(search, pelletCells(map));
}

/**
 * Distancia de recorrido entre dos celdas, sin pasar de `limit` (Infinity si es mayor o si no
 * hay camino). Sirve para decidir si Pacman ve colocar una fruta falsa (decisión 42).
 */
export function pathDistanceWithin(map: GameMap, from: Cell, to: Cell, limit: number): number {
  if (from.row === to.row && from.col === to.col) return 0;
  const dist = createGrid(map, Infinity);
  dist[from.row][from.col] = 0;
  const queue: Cell[] = [from];
  for (let head = 0; head < queue.length; head++) {
    const { row, col } = queue[head];
    if (dist[row][col] >= limit) continue;
    for (const direction of TIE_BREAK_ORDER) {
      const [dRow, dCol] = DIRECTION_VECTORS[direction];
      const next = { row: row + dRow, col: col + dCol };
      if (!canEnterCell(map, next.row, next.col) || dist[next.row][next.col] !== Infinity) continue;
      dist[next.row][next.col] = dist[row][col] + 1;
      if (next.row === to.row && next.col === to.col) return dist[next.row][next.col];
      queue.push(next);
    }
  }
  return Infinity;
}
