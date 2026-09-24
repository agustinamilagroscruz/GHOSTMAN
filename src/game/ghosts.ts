import { canEnterCell, DIRECTION_VECTORS, getOppositeDirection, type Direction, type Positioned } from "./movement";
import type { GameMap } from "./types";

// IA de fantasmas: persecución/dispersión por distancia, sin reversas salvo cambio de estado.

export type GhostId = "blinky" | "pinky" | "inky" | "clyde";
export type GhostMode = "chase" | "scatter";
/** Tipos disponibles en la V1 (sección 3): clásico y espectro. */
export type GhostKind = "classic" | "specter";

export const CLASSIC_GHOST_SPEED = 6; // celdas por segundo
/** El espectro es un 30 % más lento que el clásico. */
export const SPECTER_SPEED_FACTOR = 0.7;
export const SPECTER_PHASE_COOLDOWN_SECONDS = 10;
export const SPECTER_NO_EAT_SECONDS = 3;
/** El espectro atraviesa el muro solo si del otro lado queda al menos esta distancia (en celdas) más cerca del objetivo. */
const SPECTER_MIN_GAIN_CELLS = 1;

export interface Ghost extends Positioned {
  id: GhostId;
  kind: GhostKind;
  color: string;
  scatterTarget: { row: number; col: number };
  spawn: { row: number; col: number };
  speed: number;
  /** Diseño vulnerable: huye de Pacman y puede ser comido (PowerUp activo). */
  vulnerable: boolean;
  /** Comido y fuera del mapa, esperando reaparecer en `spawn`. */
  eaten: boolean;
  respawnTimer: number;
  /** Espectro: segundos hasta poder volver a atravesar un muro. */
  phaseCooldown: number;
  /** Espectro: celdas que le faltan recorrer para completar el cruce (2 = muro + salida). */
  phaseCellsLeft: number;
  /** Espectro: segundos durante los que no puede comer a Pacman tras atravesar un muro. */
  noEatTimer: number;
}

const ALL_DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

export function speedForKind(kind: GhostKind): number {
  return kind === "specter" ? CLASSIC_GHOST_SPEED * SPECTER_SPEED_FACTOR : CLASSIC_GHOST_SPEED;
}

export function createGhost(
  id: GhostId,
  row: number,
  col: number,
  kind: GhostKind,
  color: string,
  scatterTarget: { row: number; col: number }
): Ghost {
  return {
    id,
    kind,
    row,
    col,
    progress: 0,
    direction: null,
    speed: speedForKind(kind),
    color,
    scatterTarget,
    spawn: { row, col },
    vulnerable: false,
    eaten: false,
    respawnTimer: 0,
    phaseCooldown: 0,
    phaseCellsLeft: 0,
    noEatTimer: 0,
  };
}

/** Cambia el tipo del fantasma (p. ej. al reaparecer como espectro en el nivel 2). */
export function setGhostKind(ghost: Ghost, kind: GhostKind): void {
  ghost.kind = kind;
  ghost.speed = speedForKind(kind);
  clearSpecterState(ghost);
}

/**
 * Cancela un cruce en curso y el estado "no puede comer". El cooldown NO se reinicia:
 * ni perder una vida ni reaparecer habilitan un uso antes de los 10 s (HU-18).
 */
export function clearSpecterState(ghost: Ghost): void {
  ghost.phaseCellsLeft = 0;
  ghost.noEatTimer = 0;
}

export function isPhasing(ghost: Ghost): boolean {
  return ghost.phaseCellsLeft > 0;
}

/** Un espectro que está cruzando un muro o acaba de salir de él (3 s) no puede comer a Pacman. */
export function canGhostHarm(ghost: Ghost): boolean {
  return !ghost.eaten && !ghost.vulnerable && !isPhasing(ghost) && ghost.noEatTimer <= 0;
}

function squaredDistance(aRow: number, aCol: number, bRow: number, bCol: number): number {
  const dRow = aRow - bRow;
  const dCol = aCol - bCol;
  return dRow * dRow + dCol * dCol;
}

interface DirectionChoice {
  direction: Direction | null;
  phase: boolean;
}

/**
 * Elige, parado en (row, col), la dirección válida que más acerca al objetivo, sin invertir la marcha.
 * Si `canPhase`, además evalúa atravesar UNA pared: solo si la celda del otro lado está dentro del
 * mapa, es transitable, y acerca al objetivo al menos SPECTER_MIN_GAIN_CELLS más que el mejor camino.
 */
function chooseDirection(
  map: GameMap,
  row: number,
  col: number,
  currentDirection: Direction | null,
  targetRow: number,
  targetCol: number,
  canPhase: boolean
): DirectionChoice {
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
      bestDistance = squaredDistance(row + dRow, col + dCol, targetRow, targetCol);
    }
  }

  if (canPhase) {
    let phaseDirection: Direction | null = null;
    let phaseDistance = Infinity;
    for (const direction of ALL_DIRECTIONS) {
      if (direction === forbidden) continue;
      const [dRow, dCol] = DIRECTION_VECTORS[direction];
      const wallRow = row + dRow;
      const wallCol = col + dCol;
      const exitRow = row + 2 * dRow;
      const exitCol = col + 2 * dCol;
      const isWall =
        wallRow >= 0 && wallRow < map.rows && wallCol >= 0 && wallCol < map.cols && map.cells[wallRow][wallCol] === "wall";
      // canEnterCell ya descarta salir de los límites del mapa.
      if (!isWall || !canEnterCell(map, exitRow, exitCol)) continue;
      const distance = squaredDistance(exitRow, exitCol, targetRow, targetCol);
      if (distance < phaseDistance) {
        phaseDistance = distance;
        phaseDirection = direction;
      }
    }
    if (phaseDirection && Math.sqrt(phaseDistance) <= Math.sqrt(bestDistance) - SPECTER_MIN_GAIN_CELLS) {
      return { direction: phaseDirection, phase: true };
    }
  }

  return { direction: bestDirection, phase: false };
}

function decide(ghost: Ghost, map: GameMap, targetRow: number, targetCol: number, allowPhase: boolean): void {
  // Durante el cruce la dirección está fijada: una sola pared, sin encadenar muros contiguos.
  if (isPhasing(ghost)) return;

  const canPhase = allowPhase && ghost.kind === "specter" && ghost.phaseCooldown <= 0;
  const choice = chooseDirection(map, ghost.row, ghost.col, ghost.direction, targetRow, targetCol, canPhase);
  ghost.direction = choice.direction;
  if (choice.phase) {
    ghost.phaseCellsLeft = 2;
    ghost.phaseCooldown = SPECTER_PHASE_COOLDOWN_SECONDS;
  }
}

export function updateGhost(
  ghost: Ghost,
  map: GameMap,
  deltaSeconds: number,
  targetRow: number,
  targetCol: number,
  allowPhase = false
): void {
  if (ghost.phaseCooldown > 0) ghost.phaseCooldown = Math.max(0, ghost.phaseCooldown - deltaSeconds);
  if (ghost.noEatTimer > 0) ghost.noEatTimer = Math.max(0, ghost.noEatTimer - deltaSeconds);

  if (ghost.progress === 0) {
    decide(ghost, map, targetRow, targetCol, allowPhase);
  }

  if (!ghost.direction) return;

  ghost.progress += ghost.speed * deltaSeconds;

  while (ghost.progress >= 1) {
    const [dRow, dCol] = DIRECTION_VECTORS[ghost.direction];
    ghost.row += dRow;
    ghost.col += dCol;
    ghost.progress -= 1;

    if (isPhasing(ghost)) {
      ghost.phaseCellsLeft -= 1;
      if (ghost.phaseCellsLeft > 0) continue; // sigue dentro del muro, misma dirección
      ghost.noEatTimer = SPECTER_NO_EAT_SECONDS; // salió del muro
    }

    decide(ghost, map, targetRow, targetCol, allowPhase);
    if (!ghost.direction) {
      ghost.progress = 0;
      break;
    }
  }
}

/** Única excepción a la regla de no reversa: se fuerza al cambiar entre persecución y dispersión. */
export function reverseGhostDirection(ghost: Ghost): void {
  if (!ghost.direction) return;
  // Un espectro a mitad de un muro completa el cruce antes de poder invertir la marcha.
  if (isPhasing(ghost)) return;

  if (ghost.progress > 0) {
    const [dRow, dCol] = DIRECTION_VECTORS[ghost.direction];
    ghost.row += dRow;
    ghost.col += dCol;
    ghost.progress = 1 - ghost.progress;
  }

  ghost.direction = getOppositeDirection(ghost.direction);
}
