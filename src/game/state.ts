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

const INITIAL_LIVES = 3;
const POWER_UP_DURATION_SECONDS = 8;

export interface GameState {
  map: GameMap;
  player: Mover;
  ghosts: Ghost[];
  ghostMode: GhostMode;
  ghostModeTimer: number;
  score: number;
  pelletsRemaining: number;
  levelComplete: boolean;
  lives: number;
  gameOver: boolean;
  powerUpActive: boolean;
  powerUpTimer: number;
  ghostsEatenInPowerUp: number;
}

function createLevel1Ghosts(rows: number, cols: number): Ghost[] {
  return [
    createGhost("blinky", 1, 1, GHOST_SPEED_CELLS_PER_SECOND, "#ff0000", { row: 1, col: cols - 2 }),
    createGhost("pinky", 1, cols - 2, GHOST_SPEED_CELLS_PER_SECOND, "#ffb8ff", { row: 1, col: 1 }),
    createGhost("inky", rows - 2, 1, GHOST_SPEED_CELLS_PER_SECOND, "#00ffff", { row: rows - 2, col: cols - 2 }),
    createGhost("clyde", rows - 2, cols - 2, GHOST_SPEED_CELLS_PER_SECOND, "#ffb851", { row: rows - 2, col: 1 }),
  ];
}

const GHOST_SPAWN_POSITIONS = [
  { row: 1, col: 1 },
  { row: 1, col: 15 },
  { row: 13, col: 1 },
  { row: 13, col: 15 },
];

function countPellets(map: GameMap): number {
  let count = 0;
  for (const row of map.pellets) {
    for (const pellet of row) {
      if (pellet !== "none") count += 1;
    }
  }
  return count;
}

function resetGhostPositions(ghosts: Ghost[]): void {
  GHOST_SPAWN_POSITIONS.forEach((pos, index) => {
    const ghost = ghosts[index];
    ghost.row = pos.row;
    ghost.col = pos.col;
    ghost.progress = 0;
    ghost.direction = null;
  });
}

function resetPlayerPosition(player: Mover): void {
  player.row = PLAYER_SPAWN_ROW;
  player.col = PLAYER_SPAWN_COL;
  player.progress = 0;
  player.direction = null;
  player.desiredDirection = null;
}

export function createInitialGameState(): GameState {
  const map = createLevel1Map();
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
    lives: INITIAL_LIVES,
    gameOver: false,
    powerUpActive: false,
    powerUpTimer: 0,
    ghostsEatenInPowerUp: 0,
  };
}

function consumePelletAt(state: GameState, row: number, col: number): void {
  const pellet = state.map.pellets[row][col];
  if (pellet === "none") return;

  state.map.pellets[row][col] = "none";
  state.pelletsRemaining -= 1;

  if (pellet === "power") {
    state.score += POWER_PELLET_POINTS;
    activatePowerUp(state);
  } else {
    state.score += COMMON_PELLET_POINTS;
  }

  if (state.pelletsRemaining === 0) {
    state.levelComplete = true;
  }
}

function activatePowerUp(state: GameState): void {
  state.powerUpActive = true;
  state.powerUpTimer = POWER_UP_DURATION_SECONDS;
  state.ghostsEatenInPowerUp = 0;

  for (const ghost of state.ghosts) {
    reverseGhostDirection(ghost);
  }
}

function updatePowerUp(state: GameState, deltaSeconds: number): void {
  if (!state.powerUpActive) return;

  state.powerUpTimer -= deltaSeconds;

  if (state.powerUpTimer <= 0) {
    state.powerUpActive = false;
    state.powerUpTimer = 0;
    state.ghostsEatenInPowerUp = 0;

    for (const ghost of state.ghosts) {
      reverseGhostDirection(ghost);
    }
  }
}

function checkGhostCollisions(state: GameState): void {
  if (state.levelComplete || state.gameOver) return;

  const playerRow = Math.round(state.player.row);
  const playerCol = Math.round(state.player.col);

  for (const ghost of state.ghosts) {
    const ghostRow = Math.round(ghost.row);
    const ghostCol = Math.round(ghost.col);

    if (playerRow === ghostRow && playerCol === ghostCol) {
      if (state.powerUpActive) {
        eatGhost(state, ghost);
      } else {
        loseLife(state);
      }
      break;
    }
  }
}

function eatGhost(state: GameState, ghost: Ghost): void {
  const points = [200, 400, 800, 1600];
  state.score += points[state.ghostsEatenInPowerUp] ?? 1600;
  state.ghostsEatenInPowerUp += 1;

  const spawnIndex = state.ghosts.indexOf(ghost);
  const spawnPos = GHOST_SPAWN_POSITIONS[spawnIndex];
  ghost.row = spawnPos.row;
  ghost.col = spawnPos.col;
  ghost.progress = 0;
  ghost.direction = null;
}

function loseLife(state: GameState): void {
  state.lives -= 1;
  state.powerUpActive = false;
  state.powerUpTimer = 0;
  state.ghostsEatenInPowerUp = 0;

  if (state.lives <= 0) {
    state.gameOver = true;
    state.lives = 0;
  } else {
    resetPlayerPosition(state.player);
    resetGhostPositions(state.ghosts);
    state.ghostMode = "chase";
    state.ghostModeTimer = 0;
  }
}

/** Alterna persecución/dispersión cada 20/7 s; el cambio fuerza la reversa de todos los fantasmas. */
function updateGhostMode(state: GameState, deltaSeconds: number): void {
  if (state.powerUpActive) return;

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
    let targetRow: number;
    let targetCol: number;

    if (state.powerUpActive) {
      const dRow = ghost.row - state.player.row;
      const dCol = ghost.col - state.player.col;
      targetRow = ghost.row + dRow * 5;
      targetCol = ghost.col + dCol * 5;
    } else {
      const target = state.ghostMode === "chase" ? state.player : ghost.scatterTarget;
      targetRow = target.row;
      targetCol = target.col;
    }

    updateGhost(ghost, state.map, deltaSeconds, targetRow, targetCol);
  }
}

export function updateGameState(
  state: GameState,
  deltaSeconds: number,
  playerDesiredDirection: Direction | null
): void {
  if (state.levelComplete || state.gameOver) return;

  const previousRow = state.player.row;
  const previousCol = state.player.col;

  state.player.desiredDirection = playerDesiredDirection;
  updateMover(state.player, state.map, deltaSeconds);

  if (state.player.row !== previousRow || state.player.col !== previousCol) {
    consumePelletAt(state, state.player.row, state.player.col);
  }

  updatePowerUp(state, deltaSeconds);
  updateGhostMode(state, deltaSeconds);
  updateGhosts(state, deltaSeconds);
  checkGhostCollisions(state);
}

