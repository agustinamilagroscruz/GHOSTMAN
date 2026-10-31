import { canPlaceFakeFruit, createFakeFruit, NAVAL_PLACE_COOLDOWN_SECONDS, type FakeFruit } from "./fakeFruits";
import { isJumping, isPhaseableWall, SPECTER_PHASE_COOLDOWN_SECONDS, startJump, type Ghost } from "./ghosts";
import { canEnterCell, cellAt, DIRECTION_VECTORS, getMoverPosition, isHouseCell, isTunnelCell, neighborCell } from "./movement";
import type { GameMap } from "./types";

// Poderes de los fantasmas (sección 4.6 de la V2). Cada función intenta usar el poder y
// devuelve si se usó: un intento que no puede producir efecto NO consume el poder, es decir,
// no arranca el cooldown (decisión 25). Son independientes de quién controla al fantasma,
// para que en el incremento 16 la IA del modo Pacman las reutilice.

/** Saltarín: radio del salto, en distancia Manhattan (decisión 31). */
export const JUMPER_RADIUS_CELLS = 10;
export const JUMPER_COOLDOWN_SECONDS = 10;

/** Acelerado: largo máximo del dash y cooldown. La penalidad de velocidad está en ghosts.ts. */
export const DASH_MAX_CELLS = 3;
export const DASH_COOLDOWN_SECONDS = 10;

export type RandomSource = () => number;

/** Lo que un poder puede leer o modificar del juego. */
export interface PowerContext {
  map: GameMap;
  random: RandomSource;
  /** Frutas falsas en el mapa (las del Naval, de cualquier fantasma). */
  fakeFruits: FakeFruit[];
}

/**
 * Espectro: atraviesa el muro de una celda contiguo en la dirección de avance, si del otro
 * lado hay una celda transitable (nunca sale del mapa: el borde no tiene "otro lado").
 * Parado (o detenido contra el muro), el muro es el contiguo a su celda. En movimiento, es el
 * contiguo a la celda a la que está llegando: termina de llegar y entra al muro.
 */
export function trySpecterPhase(ghost: Ghost, map: GameMap): boolean {
  const facing = ghost.facing;
  if (!facing) return false;
  const moving = ghost.progress > 0;
  const from = moving ? neighborCell(map, ghost.row, ghost.col, facing) : { row: ghost.row, col: ghost.col };
  const wall = neighborCell(map, from.row, from.col, facing);
  const exit = neighborCell(map, wall.row, wall.col, facing);

  // Ni el borde del mapa ni los muros de la base (decisiones 26 y 49).
  if (!isPhaseableWall(map, wall.row, wall.col)) return false;
  if (!canEnterCell(map, exit.row, exit.col)) return false;

  ghost.powerCooldown = SPECTER_PHASE_COOLDOWN_SECONDS;
  ghost.direction = facing;
  if (moving) {
    ghost.phasePending = true;
  } else {
    ghost.phaseCellsLeft = 2; // muro + salida
  }
  return true;
}

/**
 * Saltarín: salto de 0,6 s (decisión 55) a una celda transitable al azar, con distribución uniforme, a
 * distancia Manhattan de 10 o menos de la celda que ocupa y estrictamente adelante en su
 * dirección de avance: la fila o la columna actual no cuenta (decisiones 38 y 41). Sin
 * dirección de avance o sin destino válido no salta y el poder no se consume (decisión 25).
 * En el aire no colisiona; si aterriza sobre Pacman, el contacto lo resuelve la detección de
 * colisiones de ese cuadro.
 */
export function tryJumperTeleport(ghost: Ghost, map: GameMap, random: RandomSource): boolean {
  const facing = ghost.facing;
  if (!facing) return false;
  const [aheadRow, aheadCol] = DIRECTION_VECTORS[facing];
  const position = getMoverPosition(ghost);
  const { row: originRow, col: originCol } = cellAt(map, position);

  const candidates: Array<{ row: number; col: number }> = [];
  for (let row = originRow - JUMPER_RADIUS_CELLS; row <= originRow + JUMPER_RADIUS_CELLS; row++) {
    const span = JUMPER_RADIUS_CELLS - Math.abs(row - originRow);
    for (let col = originCol - span; col <= originCol + span; col++) {
      // Adelante: el avance sobre el eje de la dirección tiene que ser positivo.
      const ahead = (row - originRow) * aheadRow + (col - originCol) * aheadCol;
      if (ahead <= 0) continue;
      // Nunca dentro de la base (decisión 49). La distancia Manhattan no cruza el túnel (decisión 48).
      if (canEnterCell(map, row, col) && !isHouseCell(map, row, col)) candidates.push({ row, col });
    }
  }
  if (candidates.length === 0) return false;

  const target = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  // Desde el incremento 24 no aparece en el destino: salta y aterriza a los 0,6 s (decisión 55).
  ghost.row = originRow;
  ghost.col = originCol;
  startJump(ghost, target);
  ghost.powerCooldown = JUMPER_COOLDOWN_SECONDS;
  return true;
}

/**
 * Naval: coloca una fruta falsa en la celda que ocupa. Máximo 2 en el mapa y una por celda;
 * si no se puede colocar, el poder no se consume (decisión 25).
 */
export function tryNavalPlaceFruit(ghost: Ghost, fakeFruits: FakeFruit[], map: GameMap): boolean {
  const { row, col } = cellAt(map, getMoverPosition(ghost));
  // Ni en la base ni en el túnel (decisión 49).
  if (isHouseCell(map, row, col) || isTunnelCell(map, row, col)) return false;
  if (!canPlaceFakeFruit(fakeFruits, row, col)) return false;
  fakeFruits.push(createFakeFruit(row, col));
  ghost.powerCooldown = NAVAL_PLACE_COOLDOWN_SECONDS;
  return true;
}

/**
 * Acelerado: impulso de hasta 3 celdas en la dirección de avance, desde la celda que ocupa (decisión
 * 54). Acá solo se cuenta cuántas celdas puede recorrer: se detiene en la última transitable antes
 * de un muro y el túnel cuenta como camino. Si la primera ya está bloqueada, o si no tiene
 * dirección de avance, no hay impulso y el poder no se consume (decisión 25). El recorrido, a
 * 12 celdas/s, y la penalidad posterior están en ghosts.ts; el contacto con Pacman, en el estado.
 */
export function tryAcceleratedDash(ghost: Ghost, map: GameMap): boolean {
  const facing = ghost.facing;
  if (!facing) return false;
  const start = cellAt(map, getMoverPosition(ghost));

  let cells = 0;
  let { row, col } = start;
  for (let next = neighborCell(map, row, col, facing); cells < DASH_MAX_CELLS && canEnterCell(map, next.row, next.col); next = neighborCell(map, row, col, facing)) {
    row = next.row;
    col = next.col;
    cells += 1;
  }
  if (cells === 0) return false;

  ghost.row = start.row;
  ghost.col = start.col;
  ghost.progress = 0;
  ghost.direction = facing;
  ghost.dashCellsLeft = cells;
  ghost.powerCooldown = DASH_COOLDOWN_SECONDS;
  return true;
}

/**
 * Barra espaciadora del fantasma del jugador. Sin efecto si está comido, durante el cooldown,
 * en pleno cruce, o si su tipo no tiene poder (clásico) o todavía no está implementado.
 */
export function tryActivateGhostPower(ghost: Ghost, context: PowerContext): boolean {
  // Dentro de la base no se usa el poder: el saltarín no puede salir sin pasar por la puerta.
  if (ghost.eaten || ghost.inHouse || ghost.powerCooldown > 0 || ghost.phaseCellsLeft > 0 || ghost.phasePending || ghost.dashCellsLeft > 0 || isJumping(ghost)) return false;
  switch (ghost.kind) {
    case "specter":
      return trySpecterPhase(ghost, context.map);
    case "jumper":
      return tryJumperTeleport(ghost, context.map, context.random);
    case "naval":
      return tryNavalPlaceFruit(ghost, context.fakeFruits, context.map);
    case "accelerated":
      return tryAcceleratedDash(ghost, context.map);
    default:
      return false; // clásico: sin poder.
  }
}

/** Indicador ⭐ (HU-32): null si el tipo no tiene poder; si no, si el cooldown terminó. */
export function isPowerReady(ghost: Ghost): boolean | null {
  if (ghost.kind === "classic") return null;
  return ghost.powerCooldown <= 0;
}
