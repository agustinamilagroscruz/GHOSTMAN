import { canPlaceFakeFruit, createFakeFruit, NAVAL_PLACE_COOLDOWN_SECONDS, type FakeFruit } from "./fakeFruits";
import { ACCELERATED_SLOW_FACTOR, SPECTER_PHASE_COOLDOWN_SECONDS, speedForKind, type Ghost } from "./ghosts";
import { canEnterCell, DIRECTION_VECTORS, getMoverPosition } from "./movement";
import type { GameMap } from "./types";

// Poderes de los fantasmas (sección 4.6 de la V2). Cada función intenta usar el poder y
// devuelve si se usó: un intento que no puede producir efecto NO consume el poder, es decir,
// no arranca el cooldown (decisión 25). Son independientes de quién controla al fantasma,
// para que en el incremento 16 la IA del modo Pacman las reutilice.

/** Saltarín: radio del teletransporte, en distancia Manhattan (decisión 31). */
export const JUMPER_RADIUS_CELLS = 10;
export const JUMPER_COOLDOWN_SECONDS = 10;

/** Acelerado: largo máximo del dash, cooldown y duración de la penalidad de velocidad. */
export const DASH_MAX_CELLS = 3;
export const DASH_COOLDOWN_SECONDS = 10;
export const DASH_SLOW_SECONDS = 5;

export type RandomSource = () => number;

/** Lo que un poder puede leer o modificar del juego. */
export interface PowerContext {
  map: GameMap;
  random: RandomSource;
  /** Frutas falsas en el mapa (las del Naval, de cualquier fantasma). */
  fakeFruits: FakeFruit[];
}

function isWallInsideMap(map: GameMap, row: number, col: number): boolean {
  return row >= 0 && row < map.rows && col >= 0 && col < map.cols && map.cells[row][col] === "wall";
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
  const [dRow, dCol] = DIRECTION_VECTORS[facing];
  const moving = ghost.progress > 0;
  const fromRow = moving ? ghost.row + dRow : ghost.row;
  const fromCol = moving ? ghost.col + dCol : ghost.col;

  if (!isWallInsideMap(map, fromRow + dRow, fromCol + dCol)) return false;
  if (!canEnterCell(map, fromRow + 2 * dRow, fromCol + 2 * dCol)) return false;

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
 * Saltarín: teletransporte instantáneo a una celda transitable al azar, a distancia Manhattan
 * de 10 o menos de la celda que ocupa, distinta de ella, con distribución uniforme. Puede caer
 * sobre Pacman: ese contacto lo resuelve la detección de colisiones del mismo paso.
 */
export function tryJumperTeleport(ghost: Ghost, map: GameMap, random: RandomSource): boolean {
  const position = getMoverPosition(ghost);
  const originRow = Math.round(position.row);
  const originCol = Math.round(position.col);

  const candidates: Array<{ row: number; col: number }> = [];
  for (let row = originRow - JUMPER_RADIUS_CELLS; row <= originRow + JUMPER_RADIUS_CELLS; row++) {
    const span = JUMPER_RADIUS_CELLS - Math.abs(row - originRow);
    for (let col = originCol - span; col <= originCol + span; col++) {
      if (row === originRow && col === originCol) continue;
      if (canEnterCell(map, row, col)) candidates.push({ row, col });
    }
  }
  if (candidates.length === 0) return false;

  const target = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  ghost.row = target.row;
  ghost.col = target.col;
  ghost.progress = 0;
  ghost.powerCooldown = JUMPER_COOLDOWN_SECONDS;
  // Conserva la dirección de avance si puede seguir; si no, queda detenido.
  if (ghost.facing) {
    const [dRow, dCol] = DIRECTION_VECTORS[ghost.facing];
    ghost.direction = canEnterCell(map, target.row + dRow, target.col + dCol) ? ghost.facing : null;
  }
  return true;
}

/**
 * Naval: coloca una fruta falsa en la celda que ocupa. Máximo 2 en el mapa y una por celda;
 * si no se puede colocar, el poder no se consume (decisión 25).
 */
export function tryNavalPlaceFruit(ghost: Ghost, fakeFruits: FakeFruit[]): boolean {
  const position = getMoverPosition(ghost);
  const row = Math.round(position.row);
  const col = Math.round(position.col);
  if (!canPlaceFakeFruit(fakeFruits, row, col)) return false;
  fakeFruits.push(createFakeFruit(row, col));
  ghost.powerCooldown = NAVAL_PLACE_COOLDOWN_SECONDS;
  return true;
}

/**
 * Acelerado: desplazamiento instantáneo de hasta 3 celdas en la dirección de avance, desde la
 * celda que ocupa. Se detiene en la última celda transitable antes de un muro y nunca sale del
 * mapa. Si la primera celda ya está bloqueada, o si no tiene dirección de avance (recién
 * aparecido), no hay desplazamiento y el poder no se consume (decisión 25). Después del dash
 * se mueve al 50 % durante 5 s. El contacto con Pacman a lo largo del trayecto lo resuelve el
 * estado del juego (decisión 32).
 */
export function tryAcceleratedDash(ghost: Ghost, map: GameMap): boolean {
  const facing = ghost.facing;
  if (!facing) return false;
  const [dRow, dCol] = DIRECTION_VECTORS[facing];
  const position = getMoverPosition(ghost);
  let row = Math.round(position.row);
  let col = Math.round(position.col);

  let cells = 0;
  while (cells < DASH_MAX_CELLS && canEnterCell(map, row + dRow, col + dCol)) {
    row += dRow;
    col += dCol;
    cells += 1;
  }
  if (cells === 0) return false;

  ghost.row = row;
  ghost.col = col;
  ghost.progress = 0;
  ghost.direction = canEnterCell(map, row + dRow, col + dCol) ? facing : null;
  ghost.powerCooldown = DASH_COOLDOWN_SECONDS;
  ghost.slowTimer = DASH_SLOW_SECONDS;
  ghost.speed = speedForKind(ghost.kind) * ACCELERATED_SLOW_FACTOR;
  return true;
}

/**
 * Barra espaciadora del fantasma del jugador. Sin efecto si está comido, durante el cooldown,
 * en pleno cruce, o si su tipo no tiene poder (clásico) o todavía no está implementado.
 */
export function tryActivateGhostPower(ghost: Ghost, context: PowerContext): boolean {
  if (ghost.eaten || ghost.powerCooldown > 0 || ghost.phaseCellsLeft > 0 || ghost.phasePending) return false;
  switch (ghost.kind) {
    case "specter":
      return trySpecterPhase(ghost, context.map);
    case "jumper":
      return tryJumperTeleport(ghost, context.map, context.random);
    case "naval":
      return tryNavalPlaceFruit(ghost, context.fakeFruits);
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
