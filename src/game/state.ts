import { createLevel1Map } from "./maps/level1";
import { createMover, updateMover, type Direction, type Mover } from "./movement";
import type { GameMap } from "./types";

const PLAYER_SPEED_CELLS_PER_SECOND = 6;
const PLAYER_SPAWN_ROW = 7;
const PLAYER_SPAWN_COL = 8;

const COMMON_PELLET_POINTS = 10;
const POWER_PELLET_POINTS = 50;

export interface GameState {
  map: GameMap;
  player: Mover;
  score: number;
  pelletsRemaining: number;
  levelComplete: boolean;
}

function countPellets(map: GameMap): number {
  let count = 0;
  for (const row of map.pellets) {
    for (const pellet of row) {
      if (pellet !== "none") count += 1;
    }
  }
  return count;
}

export function createInitialGameState(): GameState {
  const map = createLevel1Map();
  // La celda de partida de Pacman arranca despejada, como en el mapa original.
  map.pellets[PLAYER_SPAWN_ROW][PLAYER_SPAWN_COL] = "none";

  const player = createMover(PLAYER_SPAWN_ROW, PLAYER_SPAWN_COL, PLAYER_SPEED_CELLS_PER_SECOND);

  return {
    map,
    player,
    score: 0,
    pelletsRemaining: countPellets(map),
    levelComplete: false,
  };
}

function consumePelletAt(state: GameState, row: number, col: number): void {
  const pellet = state.map.pellets[row][col];
  if (pellet === "none") return;

  state.map.pellets[row][col] = "none";
  state.pelletsRemaining -= 1;
  state.score += pellet === "power" ? POWER_PELLET_POINTS : COMMON_PELLET_POINTS;

  if (state.pelletsRemaining === 0) {
    state.levelComplete = true;
  }
}

export function updateGameState(
  state: GameState,
  deltaSeconds: number,
  playerDesiredDirection: Direction | null
): void {
  if (state.levelComplete) return;

  const previousRow = state.player.row;
  const previousCol = state.player.col;

  state.player.desiredDirection = playerDesiredDirection;
  updateMover(state.player, state.map, deltaSeconds);

  if (state.player.row !== previousRow || state.player.col !== previousCol) {
    consumePelletAt(state, state.player.row, state.player.col);
  }
}

