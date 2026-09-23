import { createLevel1Map } from "./maps/level1";
import { createMover, updateMover, type Direction, type Mover } from "./movement";
import type { GameMap } from "./types";

const PLAYER_SPEED_CELLS_PER_SECOND = 6;

export interface GameState {
  map: GameMap;
  player: Mover;
}

export function createInitialGameState(): GameState {
  const map = createLevel1Map();
  // Celda central del mapa, sobre un corredor y sin esfera grande.
  const player = createMover(7, 8, PLAYER_SPEED_CELLS_PER_SECOND);
  return { map, player };
}

export function updateGameState(
  state: GameState,
  deltaSeconds: number,
  playerDesiredDirection: Direction | null
): void {
  state.player.desiredDirection = playerDesiredDirection;
  updateMover(state.player, state.map, deltaSeconds);
}
