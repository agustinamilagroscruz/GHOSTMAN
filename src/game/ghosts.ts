import { canCrossDoor } from "./house";
import {
  canEnterCell,
  getOppositeDirection,
  isHouseCell,
  isTunnelCell,
  neighborCell,
  updateMover,
  type Direction,
  type Mover,
} from "./movement";
import { tickTimer } from "./timers";
import type { GameMap } from "./types";

// IA de fantasmas: persecución/dispersión por distancia, sin reversas salvo cambio de estado.

export type GhostId = "blinky" | "pinky" | "inky" | "clyde";
export type GhostMode = "chase" | "scatter";
/** Los cinco tipos de la sección 2.2. En el modo Pacman la IA usa solo clásico y espectro (V1). */
export type GhostKind = "classic" | "specter" | "jumper" | "naval" | "accelerated";

/** Velocidad del fantasma clásico: 3,75 celdas por segundo (5 en la V1 y la V2 original, bajada un 25 %). */
export const CLASSIC_GHOST_SPEED = 3.75; // celdas por segundo
/** El espectro es un 30 % más lento que el clásico. */
export const SPECTER_SPEED_FACTOR = 0.7;
/** El naval es un 20 % más lento que el clásico. */
export const NAVAL_SPEED_FACTOR = 0.8;
/** Acelerado: velocidad al 50 % durante los 5 s posteriores al dash. */
export const ACCELERATED_SLOW_FACTOR = 0.5;
export const SPECTER_PHASE_COOLDOWN_SECONDS = 10;
export const SPECTER_NO_EAT_SECONDS = 3;
/** En las celdas del túnel los fantasmas van al 50 % de su velocidad (decisión 48). */
export const TUNNEL_SPEED_FACTOR = 0.5;
/** Los ojos de un fantasma comido vuelven a la base al doble de la velocidad del clásico (decisión 46). */
export const EYES_SPEED = CLASSIC_GHOST_SPEED * 2;
/** El espectro atraviesa el muro solo si del otro lado queda al menos esta distancia (en celdas) más cerca del objetivo. */
const SPECTER_MIN_GAIN_CELLS = 1;

/** Mover: el fantasma del jugador se desplaza con la misma lógica que Pacman (updateMover). */
export interface Ghost extends Mover {
  id: GhostId;
  /** Modo GhostMan: lo controla el jugador con el teclado en lugar de la IA. */
  controlledByPlayer: boolean;
  kind: GhostKind;
  color: string;
  scatterTarget: { row: number; col: number };
  spawn: { row: number; col: number };
  speed: number;
  /** Diseño vulnerable: huye de Pacman y puede ser comido (PowerUp activo). */
  vulnerable: boolean;
  /**
   * Comido (decisión 46): mientras está fuera de la base son sus ojos, que vuelven a la base; ya
   * adentro, espera `respawnTimer` segundos (3 el naval, 0 el resto) y revive.
   */
  eaten: boolean;
  respawnTimer: number;
  /** Dentro de la base de los fantasmas. Al llegar a la celda de salida, sobre la puerta, deja de estarlo. */
  inHouse: boolean;
  /** Fantasma de la IA dentro de la base: segundos hasta empezar a salir (decisión 45). */
  releaseTimer: number;
  /** Segundos de espera para salir al empezar el nivel o después de perder una vida. */
  releaseDelay: number;
  /** Segundos hasta poder volver a usar el poder (cualquier tipo). Sobrevive al reinicio del nivel. */
  powerCooldown: number;
  /**
   * Dirección de avance (decisión 24): la última en la que se movió. Se conserva aunque el
   * fantasma quede detenido contra un muro; es null solo si no se movió desde que apareció.
   */
  facing: Direction | null;
  /** Fantasma del jugador: activó el cruce a mitad de celda y termina de llegar antes de entrar al muro. */
  phasePending: boolean;
  /** Acelerado: segundos que le quedan a la penalidad de velocidad posterior al dash. */
  slowTimer: number;
  /** Espectro: celdas que le faltan recorrer para completar el cruce (2 = muro + salida). */
  phaseCellsLeft: number;
  /** Espectro: segundos durante los que no puede comer a Pacman tras atravesar un muro. */
  noEatTimer: number;
  /** Multiplicador de la velocidad de su tipo: 0,85 para los fantasmas del modo Pacman (decisión 40), 1 en el modo GhostMan. */
  speedFactor: number;
}

const ALL_DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

export function speedForKind(kind: GhostKind): number {
  switch (kind) {
    case "specter":
      return CLASSIC_GHOST_SPEED * SPECTER_SPEED_FACTOR;
    case "naval":
      return CLASSIC_GHOST_SPEED * NAVAL_SPEED_FACTOR;
    default:
      return CLASSIC_GHOST_SPEED;
  }
}

export function createGhost(
  id: GhostId,
  row: number,
  col: number,
  kind: GhostKind,
  color: string,
  scatterTarget: { row: number; col: number },
  speedFactor = 1
): Ghost {
  return {
    id,
    controlledByPlayer: false,
    kind,
    row,
    col,
    progress: 0,
    direction: null,
    desiredDirection: null,
    speed: speedForKind(kind) * speedFactor,
    color,
    scatterTarget,
    spawn: { row, col },
    vulnerable: false,
    eaten: false,
    respawnTimer: 0,
    inHouse: false,
    releaseTimer: 0,
    releaseDelay: 0,
    powerCooldown: 0,
    facing: null,
    phasePending: false,
    slowTimer: 0,
    phaseCellsLeft: 0,
    noEatTimer: 0,
    speedFactor,
  };
}

/**
 * Cambia el tipo del fantasma (p. ej. al reaparecer con poderes en el nivel 2). La penalidad
 * de velocidad del acelerado es del tipo anterior y se descarta; el cooldown se conserva, para
 * que reaparecer no habilite un uso antes de tiempo (mismo criterio que la HU-18).
 */
export function setGhostKind(ghost: Ghost, kind: GhostKind): void {
  ghost.kind = kind;
  ghost.slowTimer = 0;
  ghost.speed = speedForKind(kind) * ghost.speedFactor;
  clearSpecterState(ghost);
}

/**
 * Cancela un cruce en curso y el estado "no puede comer". El cooldown NO se reinicia:
 * ni perder una vida ni reaparecer habilitan un uso antes de los 10 s (HU-18).
 */
export function clearSpecterState(ghost: Ghost): void {
  ghost.phaseCellsLeft = 0;
  ghost.phasePending = false;
  ghost.noEatTimer = 0;
}

/** Cruzando el muro (muro + salida). El tramo previo de `phasePending` no cuenta: ahí todavía puede comer. */
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

    const next = neighborCell(map, row, col, direction);
    if (!canEnterCell(map, next.row, next.col)) continue;

    const distance = squaredDistance(next.row, next.col, targetRow, targetCol);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestDirection = direction;
    }
  }

  // Callejón sin salida: revertir es la única opción posible.
  if (!bestDirection && forbidden) {
    const back = neighborCell(map, row, col, forbidden);
    if (canEnterCell(map, back.row, back.col)) {
      bestDirection = forbidden;
      bestDistance = squaredDistance(back.row, back.col, targetRow, targetCol);
    }
  }

  if (canPhase) {
    let phaseDirection: Direction | null = null;
    let phaseDistance = Infinity;
    for (const direction of ALL_DIRECTIONS) {
      if (direction === forbidden) continue;
      const wall = neighborCell(map, row, col, direction);
      const exit = neighborCell(map, wall.row, wall.col, direction);
      // Un muro de una celda dentro del mapa y fuera de la base: ni el borde ni la base (decisiones 26 y 49).
      if (!isPhaseableWall(map, wall.row, wall.col) || !canEnterCell(map, exit.row, exit.col)) continue;
      const distance = squaredDistance(exit.row, exit.col, targetRow, targetCol);
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

/** Muro que el espectro puede atravesar: interior (no el borde) y fuera de la base (decisiones 26 y 49). */
export function isPhaseableWall(map: GameMap, row: number, col: number): boolean {
  if (row <= 0 || row >= map.rows - 1 || col <= 0 || col >= map.cols - 1) return false;
  return map.cells[row][col] === "wall" && !isHouseCell(map, row, col);
}

/** Factor de velocidad por la celda que ocupa: en el túnel, 50 % (decisión 48). */
function tunnelFactor(map: GameMap, ghost: Ghost): number {
  return isTunnelCell(map, ghost.row, ghost.col) ? TUNNEL_SPEED_FACTOR : 1;
}

function decide(ghost: Ghost, map: GameMap, targetRow: number, targetCol: number, allowPhase: boolean): void {
  // Durante el cruce la dirección está fijada: una sola pared, sin encadenar muros contiguos.
  if (isPhasing(ghost)) return;

  const canPhase = allowPhase && ghost.kind === "specter" && ghost.powerCooldown <= 0;
  const choice = chooseDirection(map, ghost.row, ghost.col, ghost.direction, targetRow, targetCol, canPhase);
  ghost.direction = choice.direction;
  if (choice.phase) {
    ghost.phaseCellsLeft = 2;
    ghost.powerCooldown = SPECTER_PHASE_COOLDOWN_SECONDS;
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
  // Cooldown y penalidad del acelerado (incremento 16: el acelerado de la IA también la tiene).
  tickPowerTimers(ghost, deltaSeconds);
  if (ghost.noEatTimer > 0) ghost.noEatTimer = Math.max(0, ghost.noEatTimer - deltaSeconds);

  if (ghost.progress === 0) {
    decide(ghost, map, targetRow, targetCol, allowPhase);
  }

  if (!ghost.direction) return;

  ghost.progress += ghost.speed * tunnelFactor(map, ghost) * deltaSeconds;

  while (ghost.progress >= 1) {
    const next = neighborCell(map, ghost.row, ghost.col, ghost.direction);
    ghost.row = next.row;
    ghost.col = next.col;
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

/**
 * Fantasma del jugador (modo GhostMan): mismo movimiento que Pacman, con avance continuo,
 * giro anticipado e inversión de marcha libre. Durante el cruce de un muro el espectro avanza
 * en línea recta sin leer el teclado, como el espectro de la IA.
 */
export function updatePlayerGhost(ghost: Ghost, map: GameMap, deltaSeconds: number, desiredDirection: Direction | null): void {
  tickPowerTimers(ghost, deltaSeconds);
  if (ghost.noEatTimer > 0) ghost.noEatTimer = Math.max(0, ghost.noEatTimer - deltaSeconds);

  if (ghost.phasePending || isPhasing(ghost)) {
    advancePlayerPhase(ghost, map, deltaSeconds);
    return;
  }

  ghost.desiredDirection = desiredDirection;
  // Dentro de la base puede cruzar la puerta para salir; afuera, la puerta es un muro (decisión 44).
  updateMover(ghost, map, deltaSeconds, undefined, ghost.inHouse ? canCrossDoor : canEnterCell, tunnelFactor(map, ghost));
  if (ghost.direction) ghost.facing = ghost.direction;
  if (ghost.inHouse && ghost.progress === 0 && ghost.row < map.house.top) ghost.inHouse = false;
}

/**
 * Temporizadores del poder: cooldown y penalidad de velocidad del acelerado (al terminar,
 * recupera su velocidad base). Corren también mientras el fantasma está comido, sea del jugador
 * o de la IA (decisión 47).
 */
export function tickPowerTimers(ghost: Ghost, deltaSeconds: number): void {
  if (ghost.powerCooldown > 0) ghost.powerCooldown = tickTimer(ghost.powerCooldown, deltaSeconds);
  if (ghost.slowTimer > 0) {
    ghost.slowTimer = tickTimer(ghost.slowTimer, deltaSeconds);
    if (ghost.slowTimer === 0) ghost.speed = speedForKind(ghost.kind) * ghost.speedFactor;
  }
}

/** Cruce del espectro del jugador: dirección fija, sin chequear muros hasta la celda de salida. */
function advancePlayerPhase(ghost: Ghost, map: GameMap, deltaSeconds: number): void {
  if (!ghost.facing) {
    clearSpecterState(ghost);
    return;
  }
  ghost.direction = ghost.facing;
  ghost.progress += ghost.speed * deltaSeconds;

  while (ghost.progress >= 1) {
    const next = neighborCell(map, ghost.row, ghost.col, ghost.facing);
    ghost.row = next.row;
    ghost.col = next.col;
    ghost.progress -= 1;

    if (ghost.phasePending) {
      // Llegó a la celda contigua al muro: empieza el cruce (muro + salida).
      ghost.phasePending = false;
      ghost.phaseCellsLeft = 2;
      continue;
    }
    ghost.phaseCellsLeft -= 1;
    if (ghost.phaseCellsLeft > 0) continue; // sigue dentro del muro

    // Salió del muro: 3 s sin poder derrotar a Pacman, y queda parado en el centro de la
    // celda de salida para que el movimiento normal retome desde ahí.
    ghost.noEatTimer = SPECTER_NO_EAT_SECONDS;
    ghost.progress = 0;
    const ahead = neighborCell(map, ghost.row, ghost.col, ghost.facing);
    if (!canEnterCell(map, ahead.row, ahead.col)) ghost.direction = null;
    break;
  }
}

/** Única excepción a la regla de no reversa: se fuerza al cambiar entre persecución y dispersión. */
export function reverseGhostDirection(ghost: Ghost, map: GameMap): void {
  // La reversa forzada es de la IA: al fantasma del jugador lo sigue controlando el jugador.
  if (ghost.controlledByPlayer || !ghost.direction) return;
  // Un espectro a mitad de un muro completa el cruce antes de poder invertir la marcha.
  if (isPhasing(ghost)) return;

  if (ghost.progress > 0) {
    const next = neighborCell(map, ghost.row, ghost.col, ghost.direction);
    ghost.row = next.row;
    ghost.col = next.col;
    ghost.progress = 1 - ghost.progress;
  }

  ghost.direction = getOppositeDirection(ghost.direction);
}
