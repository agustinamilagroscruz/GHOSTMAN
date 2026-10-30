import type { GameMap } from "./types";

// Lógica de movimiento agnóstica de la entidad: la misma función mueve a
// Pacman o, en la V2, al fantasma controlado por el jugador.

export type Direction = "up" | "down" | "left" | "right";

export const DIRECTION_VECTORS: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

export interface Positioned {
  row: number; // celda entera de la que parte
  col: number;
  progress: number; // 0..1, avance hacia la celda siguiente en `direction`
  direction: Direction | null; // dirección de avance actual
}

export interface Mover extends Positioned {
  desiredDirection: Direction | null; // última dirección pedida, aplicada en cuanto sea posible
  speed: number; // celdas por segundo
}

export function createMover(row: number, col: number, speed: number): Mover {
  return { row, col, progress: 0, direction: null, desiredDirection: null, speed };
}

export function getOppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

function isOpposite(a: Direction | null, b: Direction | null): boolean {
  if (!a || !b) return false;
  return a === getOppositeDirection(b);
}

/** Celda transitable del laberinto. La puerta de la base no lo es: solo la cruzan los fantasmas. */
export function canEnterCell(map: GameMap, row: number, col: number): boolean {
  if (row < 0 || row >= map.rows || col < 0 || col >= map.cols) return false;
  return map.cells[row][col] === "path";
}

/** Fila de túnel (HU-45): tiene camino en los dos bordes del mapa. */
export function isTunnelRow(map: GameMap, row: number): boolean {
  return row >= 0 && row < map.rows && map.cells[row][0] === "path" && map.cells[row][map.cols - 1] === "path";
}

/** Celda del túnel: ahí los fantasmas van más lentos (decisión 48). */
export function isTunnelCell(map: GameMap, row: number, col: number): boolean {
  return map.tunnelCells.has(`${row},${col}`);
}

/** Dentro de los límites de la base de los fantasmas, muros y puerta incluidos (decisiones 44 y 49). */
export function isHouseCell(map: GameMap, row: number, col: number): boolean {
  const house = map.house;
  return row >= house.top && row <= house.bottom && col >= house.left && col <= house.right;
}

/**
 * Celda vecina en una dirección. En una fila de túnel, salir por un borde lleva al borde opuesto
 * (HU-45). Es la única regla de vecindad: la usan el movimiento, las IA, los poderes y la explosión.
 */
export function neighborCell(map: GameMap, row: number, col: number, direction: Direction): { row: number; col: number } {
  const [dRow, dCol] = DIRECTION_VECTORS[direction];
  const nextRow = row + dRow;
  let nextCol = col + dCol;
  if ((nextCol < 0 || nextCol >= map.cols) && isTunnelRow(map, nextRow)) nextCol = (nextCol + map.cols) % map.cols;
  return { row: nextRow, col: nextCol };
}

/** Celda que ocupa un personaje según su posición interpolada, con el salto de borde del túnel. */
export function cellAt(map: GameMap, position: { row: number; col: number }): { row: number; col: number } {
  return { row: Math.round(position.row), col: (((Math.round(position.col) % map.cols) + map.cols) % map.cols) };
}

/** Diferencia de columnas más corta entre dos posiciones: en una fila de túnel, por el borde si es más corto. */
export function colDelta(map: GameMap, fromCol: number, toCol: number): number {
  let delta = toCol - fromCol;
  if (delta > map.cols / 2) delta -= map.cols;
  if (delta < -map.cols / 2) delta += map.cols;
  return delta;
}

/** Quién puede pasar por cada celda: por defecto, solo el laberinto (sin la puerta). */
export type Passable = (map: GameMap, row: number, col: number) => boolean;

function canMoveFrom(map: GameMap, row: number, col: number, direction: Direction, passable: Passable): boolean {
  const next = neighborCell(map, row, col, direction);
  return passable(map, next.row, next.col);
}

/** Evalúa, parado en (row, col), si corresponde tomar la dirección deseada o detenerse. */
function resolveDirectionAtCell(map: GameMap, mover: Mover, passable: Passable): void {
  if (mover.desiredDirection && canMoveFrom(map, mover.row, mover.col, mover.desiredDirection, passable)) {
    mover.direction = mover.desiredDirection;
  } else if (mover.direction && !canMoveFrom(map, mover.row, mover.col, mover.direction, passable)) {
    mover.direction = null;
  }
}

/**
 * Elige la dirección deseada parado en el centro de una celda. Lo usa un personaje controlado
 * por IA (Pacman en modo GhostMan): decide en cada celda a la que llega, no antes.
 */
export type CellDecision = (mover: Mover) => Direction | null;

export function updateMover(
  mover: Mover,
  map: GameMap,
  deltaSeconds: number,
  decideAtCell?: CellDecision,
  passable: Passable = canEnterCell,
  speedFactor = 1
): void {
  // La inversión de marcha se acepta en cualquier momento, incluso a mitad de corredor.
  if (isOpposite(mover.direction, mover.desiredDirection)) {
    if (mover.progress > 0 && mover.direction) {
      const next = neighborCell(map, mover.row, mover.col, mover.direction);
      mover.row = next.row;
      mover.col = next.col;
      mover.progress = 1 - mover.progress;
    }
    mover.direction = mover.desiredDirection;
  }

  if (mover.progress === 0) {
    if (decideAtCell) mover.desiredDirection = decideAtCell(mover);
    resolveDirectionAtCell(map, mover, passable);
  }

  if (!mover.direction) return;

  mover.progress += mover.speed * speedFactor * deltaSeconds;

  while (mover.progress >= 1) {
    const next = neighborCell(map, mover.row, mover.col, mover.direction);
    mover.row = next.row;
    mover.col = next.col;
    mover.progress -= 1;
    if (decideAtCell) mover.desiredDirection = decideAtCell(mover);
    resolveDirectionAtCell(map, mover, passable);
    if (!mover.direction) {
      mover.progress = 0;
      break;
    }
  }
}

/** Posición interpolada para el renderizado (fila y columna fraccionarias). */
export function getMoverPosition(entity: Positioned): { row: number; col: number } {
  if (!entity.direction || entity.progress === 0) {
    return { row: entity.row, col: entity.col };
  }
  const [dRow, dCol] = DIRECTION_VECTORS[entity.direction];
  return { row: entity.row + dRow * entity.progress, col: entity.col + dCol * entity.progress };
}
