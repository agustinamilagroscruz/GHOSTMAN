import { SPECTER_PHASE_COOLDOWN_SECONDS, type Ghost } from "./ghosts";
import { canEnterCell, DIRECTION_VECTORS, getMoverPosition } from "./movement";
import type { GameMap } from "./types";

// Poderes de los fantasmas (sección 4.6 de la V2). Cada función intenta usar el poder y
// devuelve si se usó: un intento que no puede producir efecto NO consume el poder, es decir,
// no arranca el cooldown (decisión 25). Son independientes de quién controla al fantasma,
// para que en el incremento 16 la IA del modo Pacman las reutilice.

/** Saltarín: radio del teletransporte, en distancia Manhattan (decisión 31). */
export const JUMPER_RADIUS_CELLS = 10;
export const JUMPER_COOLDOWN_SECONDS = 10;

export type RandomSource = () => number;

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
 * Barra espaciadora del fantasma del jugador. Sin efecto si está comido, durante el cooldown,
 * en pleno cruce, o si su tipo no tiene poder (clásico) o todavía no está implementado.
 */
export function tryActivateGhostPower(ghost: Ghost, map: GameMap, random: RandomSource): boolean {
  if (ghost.eaten || ghost.powerCooldown > 0 || ghost.phaseCellsLeft > 0 || ghost.phasePending) return false;
  switch (ghost.kind) {
    case "specter":
      return trySpecterPhase(ghost, map);
    case "jumper":
      return tryJumperTeleport(ghost, map, random);
    default:
      return false; // clásico: sin poder. Naval y acelerado: incrementos 14 y 15.
  }
}

/** Indicador ⭐ (HU-32): null si el tipo no tiene poder; si no, si el cooldown terminó. */
export function isPowerReady(ghost: Ghost): boolean | null {
  if (ghost.kind === "classic") return null;
  return ghost.powerCooldown <= 0;
}
