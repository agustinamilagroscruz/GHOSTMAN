import { canEnterCell, DIRECTION_VECTORS, getOppositeDirection, type Direction, type Positioned } from "./movement";
import type { GameMap } from "./types";

// IA de fantasmas: persecución/dispersión por distancia, sin reversas salvo cambio de estado.

export type GhostId = "blinky" | "pinky" | "inky" | "clyde";
export type GhostMode = "chase" | "scatter";

export interface Ghost extends Positioned {
  id: GhostId;
  color: string;
  scatterTarget: { row: number; col: number };
  speed: number;
}

const ALL_DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

export function createGhost(
  id: GhostId,
  row: number,
  col: number,
  speed: number,
  color: string,
  scatterTarget: { row: number; col: number }
): Ghost {
  return { id, row, col, progress: 0, direction: null, speed, color, scatterTarget };
}

function squaredDistance(aRow: number, aCol: number, bRow: number, bCol: number): number {
  const dRow = aRow - bRow;
  const dCol = aCol - bCol;
  return dRow * dRow + dCol * dCol;
}

/** Elige, parado en (row, col), la dirección válida que más acerca al objetivo, sin invertir la marcha. */
function chooseDirection(
  map: GameMap,
  row: number,
  col: number,
  currentDirection: Direction | null,
  targetRow: number,
  targetCol: number
): Direction | null {
  const forbidden = currentDirection ? getOppositeDirection(currentDirection) : null;

  let bestDirection: Direction | null = null;
  let bestDistance = Infinity;

  for (const direction of ALL_DIRECTIONS) {
    if (direction === forbidden) continue;

    const [dRow, dCol] = DIRECTION_VECTORS[direction];
    const nextRow = row + dRow;
    const nextCol = col + dCol;
    if (!canEnterCell(map, nextRow, nextCol)) continue;

    const distance = squaredDistance(nextRow, nextCol, targetRow, targetCol);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestDirection = direction;
    }
  }

  // Callejón sin salida: revertir es la única opción posible.
  if (!bestDirection && forbidden) {
    const [dRow, dCol] = DIRECTION_VECTORS[forbidden];
    if (canEnterCell(map, row + dRow, col + dCol)) {
      bestDirection = forbidden;
    }
  }

  return bestDirection;
}

export function updateGhost(
  ghost: Ghost,
  map: GameMap,
  deltaSeconds: number,
  targetRow: number,
  targetCol: number
): void {
  if (ghost.progress === 0) {
    ghost.direction = chooseDirection(map, ghost.row, ghost.col, ghost.direction, targetRow, targetCol);
  }

  if (!ghost.direction) return;

  ghost.progress += ghost.speed * deltaSeconds;

  while (ghost.progress >= 1) {
    const [dRow, dCol] = DIRECTION_VECTORS[ghost.direction];
    ghost.row += dRow;
    ghost.col += dCol;
    ghost.progress -= 1;

    ghost.direction = chooseDirection(map, ghost.row, ghost.col, ghost.direction, targetRow, targetCol);
    if (!ghost.direction) {
      ghost.progress = 0;
      break;
    }
  }
}

/** Única excepción a la regla de no reversa: se fuerza al cambiar entre persecución y dispersión. */
export function reverseGhostDirection(ghost: Ghost): void {
  if (!ghost.direction) return;

  if (ghost.progress > 0) {
    const [dRow, dCol] = DIRECTION_VECTORS[ghost.direction];
    ghost.row += dRow;
    ghost.col += dCol;
    ghost.progress = 1 - ghost.progress;
  }

  ghost.direction = getOppositeDirection(ghost.direction);
}
