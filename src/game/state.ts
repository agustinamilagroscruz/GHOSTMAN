import { createGhost, reverseGhostDirection, updateGhost, type Ghost, type GhostMode } from "./ghosts";
import { createLevel1Map } from "./maps/level1";
import { createMover, updateMover, type Direction, type Mover } from "./movement";
import type { GameMap } from "./types";

const PLAYER_SPEED_CELLS_PER_SECOND = 6;
const PLAYER_SPAWN_ROW = 7;
const PLAYER_SPAWN_COL = 8;

const COMMON_PELLET_POINTS = 10;
const POWER_PELLET_POINTS = 50;

const GHOST_SPEED_CELLS_PER_SECOND = 6;
const CHASE_DURATION_SECONDS = 20;
const SCATTER_DURATION_SECONDS = 7;

export interface GameState {
  map: GameMap;
  player: Mover;
  ghosts: Ghost[];
  ghostMode: GhostMode;
  ghostModeTimer: number;
  score: number;
  pelletsRemaining: number;
  levelComplete: boolean;
}

function createLevel1Ghosts(rows: number, cols: number): Ghost[] {
  return [
    createGhost("blinky", 7, 7, GHOST_SPEED_CELLS_PER_SECOND, "#ff0000", { row: 1, col: cols - 2 }),
    createGhost("pinky", 7, 9, GHOST_SPEED_CELLS_PER_SECOND, "#ffb8ff", { row: 1, col: 1 }),
    createGhost("inky", 7, 10, GHOST_SPEED_CELLS_PER_SECOND, "#00ffff", { row: rows - 2, col: cols - 2 }),
    createGhost("clyde", 7, 6, GHOST_SPEED_CELLS_PER_SECOND, "#ffb851", { row: rows - 2, col: 1 }),
  ];
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
    ghosts: createLevel1Ghosts(map.rows, map.cols),
    ghostMode: "chase",
    ghostModeTimer: 0,
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

/** Alterna persecución/dispersión cada 20/7 s; el cambio fuerza la reversa de todos los fantasmas. */
function updateGhostMode(state: GameState, deltaSeconds: number): void {
  state.ghostModeTimer += deltaSeconds;
  const duration = state.ghostMode === "chase" ? CHASE_DURATION_SECONDS : SCATTER_DURATION_SECONDS;

  if (state.ghostModeTimer < duration) return;

  state.ghostModeTimer -= duration;
  state.ghostMode = state.ghostMode === "chase" ? "scatter" : "chase";
  for (const ghost of state.ghosts) {
    reverseGhostDirection(ghost);
  }
}

function updateGhosts(state: GameState, deltaSeconds: number): void {
  for (const ghost of state.ghosts) {
    const target = state.ghostMode === "chase" ? state.player : ghost.scatterTarget;
    updateGhost(ghost, state.map, deltaSeconds, target.row, target.col);
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

  updateGhostMode(state, deltaSeconds);
  updateGhosts(state, deltaSeconds);
}

