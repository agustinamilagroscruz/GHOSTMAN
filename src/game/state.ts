import { createGhost, reverseGhostDirection, updateGhost, type Ghost, type GhostMode } from "./ghosts";
import { createLevel1Map } from "./maps/level1";
import { createMover, getMoverPosition, updateMover, type Direction, type Mover } from "./movement";
import { ageFruits, createFruit, type Fruit } from "./fruits";
import {
  COMMON_PELLET_POINTS,
  FRUIT_POINTS,
  POWER_PELLET_POINTS,
  computeLivesBonus,
  computeTimeBonus,
  createScoreBreakdown,
  type ScoreBreakdown,
  type ScoreCategory,
} from "./scoring";
import type { GameMap } from "./types";

const PLAYER_SPEED_CELLS_PER_SECOND = 6;
const PLAYER_SPAWN_ROW = 7;
const PLAYER_SPAWN_COL = 8;

const GHOST_SPEED_CELLS_PER_SECOND = 6;
const CHASE_DURATION_SECONDS = 20;
const SCATTER_DURATION_SECONDS = 7;

const INITIAL_LIVES = 3;
const POWER_UP_DURATION_SECONDS = 8;
export const POWER_UP_WARNING_SECONDS = 2;
const GHOST_RESPAWN_SECONDS = 5;
const GHOST_POINTS_SCALE = [200, 400, 800, 1600] as const;
/** Distancia (en celdas) entre centros a partir de la cual Pacman y un fantasma se tocan. */
const CONTACT_DISTANCE = 0.5;

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
  /** Nivel en curso (1..3). */
  level: number;
  /** Segundos de juego transcurridos en el nivel en curso (para el bonus por tiempo). */
  levelElapsed: number;
  /** Bonus por tiempo otorgado al completar el nivel en curso (0 mientras se juega). */
  lastLevelTimeBonus: number;
  fruits: Fruit[];
  scoreBreakdown: ScoreBreakdown;
  /** true si la partida terminó ganada; el bonus por vidas solo aplica en ese caso. */
  won: boolean;
}

function createLevel1Ghosts(rows: number, cols: number): Ghost[] {
  return [
    createGhost("blinky", 1, 1, GHOST_SPEED_CELLS_PER_SECOND, "#ff0000", { row: 1, col: cols - 2 }),
    createGhost("pinky", 1, cols - 2, GHOST_SPEED_CELLS_PER_SECOND, "#ffb8ff", { row: 1, col: 1 }),
    createGhost("inky", rows - 2, 1, GHOST_SPEED_CELLS_PER_SECOND, "#00ffff", { row: rows - 2, col: cols - 2 }),
    createGhost("clyde", rows - 2, cols - 2, GHOST_SPEED_CELLS_PER_SECOND, "#ffb851", { row: rows - 2, col: 1 }),
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

function placeGhostAtSpawn(ghost: Ghost): void {
  ghost.row = ghost.spawn.row;
  ghost.col = ghost.spawn.col;
  ghost.progress = 0;
  ghost.direction = null;
}

function resetGhostPositions(ghosts: Ghost[]): void {
  for (const ghost of ghosts) {
    placeGhostAtSpawn(ghost);
    ghost.vulnerable = false;
    ghost.eaten = false;
    ghost.respawnTimer = 0;
  }
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
    level: 1,
    levelElapsed: 0,
    lastLevelTimeBonus: 0,
    fruits: [],
    scoreBreakdown: createScoreBreakdown(),
    won: false,
  };
}

/** Único punto de entrada para sumar puntaje: mantiene el desglose y el total sincronizados. */
function addPoints(state: GameState, category: ScoreCategory, points: number): void {
  if (points <= 0) return; // el puntaje nunca disminuye
  state.score += points;
  state.scoreBreakdown[category] += points;
}

/** Coloca una fruta en el mapa (la aparición periódica depende del nivel). */
export function spawnFruit(state: GameState, row: number, col: number): void {
  state.fruits.push(createFruit(row, col));
}

function consumeFruitAt(state: GameState, row: number, col: number): void {
  const index = state.fruits.findIndex((fruit) => fruit.row === row && fruit.col === col);
  if (index === -1) return;
  state.fruits.splice(index, 1);
  addPoints(state, "fruits", FRUIT_POINTS);
}

function completeLevel(state: GameState): void {
  state.levelComplete = true;
  state.lastLevelTimeBonus = computeTimeBonus(state.level, state.levelElapsed);
  addPoints(state, "timeBonus", state.lastLevelTimeBonus);
}

/** Cierra la partida: el bonus por vidas se aplica una sola vez y solo en victoria. */
export function finishGame(state: GameState, won: boolean): void {
  if (state.gameOver || state.won) return;
  state.won = won;
  state.gameOver = !won;
  addPoints(state, "livesBonus", computeLivesBonus(state.lives, won));
}

function consumePelletAt(state: GameState, row: number, col: number): void {
  const pellet = state.map.pellets[row][col];
  if (pellet === "none") return;

  state.map.pellets[row][col] = "none";
  state.pelletsRemaining -= 1;

  if (pellet === "power") {
    addPoints(state, "pellets", POWER_PELLET_POINTS);
    activatePowerUp(state);
  } else {
    addPoints(state, "pellets", COMMON_PELLET_POINTS);
  }

  if (state.pelletsRemaining === 0) {
    completeLevel(state);
  }
}

/**
 * Activa el PowerUp, o lo reinicia si ya estaba activo: el temporizador vuelve a 8 s
 * y la escala de puntos por fantasma vuelve a 200 (sección 4.2). Los fantasmas en el
 * mapa pasan (o vuelven) al diseño vulnerable estable e invierten la marcha.
 */
function activatePowerUp(state: GameState): void {
  state.powerUpActive = true;
  state.powerUpTimer = POWER_UP_DURATION_SECONDS;
  state.ghostsEatenInPowerUp = 0;

  for (const ghost of state.ghosts) {
    if (ghost.eaten) continue;
    ghost.vulnerable = true;
    reverseGhostDirection(ghost);
  }
}

function endPowerUp(state: GameState): void {
  state.powerUpActive = false;
  state.powerUpTimer = 0;
  state.ghostsEatenInPowerUp = 0;
  for (const ghost of state.ghosts) {
    ghost.vulnerable = false;
  }
}

function updatePowerUp(state: GameState, deltaSeconds: number): void {
  if (!state.powerUpActive) return;

  state.powerUpTimer -= deltaSeconds;
  if (state.powerUpTimer <= 0) {
    endPowerUp(state);
  }
}

/** Parpadeo de aviso: últimos 2 s del PowerUp. */
export function isPowerUpWarning(state: GameState): boolean {
  return state.powerUpActive && state.powerUpTimer <= POWER_UP_WARNING_SECONDS;
}

/** Reaparición de los fantasmas comidos: 5 s en su punto de reaparición. */
function updateGhostRespawns(state: GameState, deltaSeconds: number): void {
  for (const ghost of state.ghosts) {
    if (!ghost.eaten) continue;
    ghost.respawnTimer -= deltaSeconds;
    if (ghost.respawnTimer <= 0) {
      ghost.eaten = false;
      ghost.respawnTimer = 0;
      placeGhostAtSpawn(ghost);
      // Si el PowerUp sigue activo reaparece vulnerable y la escala continúa.
      ghost.vulnerable = state.powerUpActive;
    }
  }
}

function checkGhostCollisions(state: GameState): void {
  if (state.levelComplete || state.gameOver) return;

  const player = getMoverPosition(state.player);

  for (const ghost of state.ghosts) {
    if (ghost.eaten) continue;

    const position = getMoverPosition(ghost);
    const distance = Math.hypot(player.row - position.row, player.col - position.col);
    if (distance >= CONTACT_DISTANCE) continue;

    if (ghost.vulnerable) {
      eatGhost(state, ghost);
    } else {
      loseLife(state);
      return; // un único contacto descuenta como máximo una vida
    }
  }
}

function eatGhost(state: GameState, ghost: Ghost): void {
  const index = Math.min(state.ghostsEatenInPowerUp, GHOST_POINTS_SCALE.length - 1);
  addPoints(state, "ghosts", GHOST_POINTS_SCALE[index]);
  state.ghostsEatenInPowerUp += 1;

  ghost.eaten = true;
  ghost.vulnerable = false;
  ghost.respawnTimer = GHOST_RESPAWN_SECONDS;
  placeGhostAtSpawn(ghost);
}

function loseLife(state: GameState): void {
  state.lives -= 1;
  endPowerUp(state);

  if (state.lives <= 0) {
    state.lives = 0;
    finishGame(state, false);
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
    if (ghost.eaten) continue;

    let targetRow: number;
    let targetCol: number;

    if (ghost.vulnerable) {
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
  if (state.levelComplete || state.gameOver || state.won) return;

  state.levelElapsed += deltaSeconds;

  const previousRow = state.player.row;
  const previousCol = state.player.col;

  state.player.desiredDirection = playerDesiredDirection;
  updateMover(state.player, state.map, deltaSeconds);

  if (state.player.row !== previousRow || state.player.col !== previousCol) {
    consumePelletAt(state, state.player.row, state.player.col);
    consumeFruitAt(state, state.player.row, state.player.col);
  }
  state.fruits = ageFruits(state.fruits, deltaSeconds);

  updatePowerUp(state, deltaSeconds);
  updateGhostRespawns(state, deltaSeconds);
  updateGhostMode(state, deltaSeconds);
  updateGhosts(state, deltaSeconds);
  checkGhostCollisions(state);
}

