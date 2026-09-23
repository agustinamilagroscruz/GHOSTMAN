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

export function canEnterCell(map: GameMap, row: number, col: number): boolean {
  if (row < 0 || row >= map.rows || col < 0 || col >= map.cols) return false;
  return map.cells[row][col] === "path";
}

function canMoveFrom(map: GameMap, row: number, col: number, direction: Direction): boolean {
  const [dRow, dCol] = DIRECTION_VECTORS[direction];
  return canEnterCell(map, row + dRow, col + dCol);
}

/** Evalúa, parado en (row, col), si corresponde tomar la dirección deseada o detenerse. */
function resolveDirectionAtCell(map: GameMap, mover: Mover): void {
  if (mover.desiredDirection && canMoveFrom(map, mover.row, mover.col, mover.desiredDirection)) {
    mover.direction = mover.desiredDirection;
  } else if (mover.direction && !canMoveFrom(map, mover.row, mover.col, mover.direction)) {
    mover.direction = null;
  }
}

export function updateMover(mover: Mover, map: GameMap, deltaSeconds: number): void {
  // La inversión de marcha se acepta en cualquier momento, incluso a mitad de corredor.
  if (isOpposite(mover.direction, mover.desiredDirection)) {
    if (mover.progress > 0 && mover.direction) {
      const [dRow, dCol] = DIRECTION_VECTORS[mover.direction];
      mover.row += dRow;
      mover.col += dCol;
      mover.progress = 1 - mover.progress;
    }
    mover.direction = mover.desiredDirection;
  }

  if (mover.progress === 0) {
    resolveDirectionAtCell(map, mover);
  }

  if (!mover.direction) return;

  mover.progress += mover.speed * deltaSeconds;

  while (mover.progress >= 1) {
    const [dRow, dCol] = DIRECTION_VECTORS[mover.direction];
    mover.row += dRow;
    mover.col += dCol;
    mover.progress -= 1;
    resolveDirectionAtCell(map, mover);
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
