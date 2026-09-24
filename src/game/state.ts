import {
  canGhostHarm,
  clearSpecterState,
  createGhost,
  reverseGhostDirection,
  setGhostKind,
  updateGhost,
  type Ghost,
  type GhostMode,
} from "./ghosts";
import { ageFruits, createFruit, type Fruit } from "./fruits";
import { LAST_LEVEL, LEVELS, MAX_SIMULTANEOUS_FRUITS, type LevelDefinition } from "./levels";
import { createMover, getMoverPosition, updateMover, type Direction, type Mover } from "./movement";
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

const CHASE_DURATION_SECONDS = 20;
const SCATTER_DURATION_SECONDS = 7;

const INITIAL_LIVES = 3;
const POWER_UP_DURATION_SECONDS = 8;
export const POWER_UP_WARNING_SECONDS = 2;
const GHOST_RESPAWN_SECONDS = 5;
const GHOST_POINTS_SCALE = [200, 400, 800, 1600] as const;
/** Distancia (en celdas) entre centros a partir de la cual Pacman y un fantasma se tocan. */
const CONTACT_DISTANCE = 0.5;
/** Segundos que se muestra el resultado del nivel antes de pasar al siguiente. */
export const LEVEL_TRANSITION_SECONDS = 3;

export type RandomSource = () => number;

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
  /** Cuenta regresiva del resultado de nivel antes de cargar el siguiente. */
  levelTransitionTimer: number;
  fruits: Fruit[];
  /** Segundos acumulados desde la última aparición de fruta (solo niveles con frutas). */
  fruitSpawnTimer: number;
  scoreBreakdown: ScoreBreakdown;
  /** true si la partida terminó ganada; el bonus por vidas solo aplica en ese caso. */
  won: boolean;
  /** Fuente de azar inyectable (reaparición como espectro, posición de frutas). */
  random: RandomSource;
  /** En pausa no se mueve nada y todos los temporizadores quedan detenidos. */
  paused: boolean;
}

function levelDefinition(state: GameState): LevelDefinition {
  return LEVELS[state.level];
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

function createLevelGhosts(definition: LevelDefinition): Ghost[] {
  return definition.ghosts.map((setup) =>
    createGhost(setup.id, setup.spawn.row, setup.spawn.col, definition.initialGhostKind, setup.color, setup.scatterTarget)
  );
}

function placeGhostAtSpawn(ghost: Ghost): void {
  ghost.row = ghost.spawn.row;
  ghost.col = ghost.spawn.col;
  ghost.progress = 0;
  ghost.direction = null;
  ghost.phaseCellsLeft = 0;
  ghost.noEatTimer = 0;
}

function resetGhostPositions(ghosts: Ghost[]): void {
  for (const ghost of ghosts) {
    placeGhostAtSpawn(ghost);
    clearSpecterState(ghost);
    ghost.vulnerable = false;
    ghost.eaten = false;
    ghost.respawnTimer = 0;
  }
}

function resetPlayerPosition(state: GameState): void {
  const spawn = levelDefinition(state).playerSpawn;
  state.player.row = spawn.row;
  state.player.col = spawn.col;
  state.player.progress = 0;
  state.player.direction = null;
  state.player.desiredDirection = null;
}

/** Carga un nivel conservando puntaje, desglose y vidas. */
function loadLevel(state: GameState, level: number): void {
  const definition = LEVELS[level];
  const map = definition.createMap();
  map.pellets[definition.playerSpawn.row][definition.playerSpawn.col] = "none";

  state.level = level;
  state.map = map;
  state.player = createMover(definition.playerSpawn.row, definition.playerSpawn.col, PLAYER_SPEED_CELLS_PER_SECOND);
  state.ghosts = createLevelGhosts(definition);
  state.ghostMode = "chase";
  state.ghostModeTimer = 0;
  state.pelletsRemaining = countPellets(map);
  state.levelComplete = false;
  state.levelElapsed = 0;
  state.lastLevelTimeBonus = 0;
  state.levelTransitionTimer = 0;
  state.fruits = [];
  state.fruitSpawnTimer = 0;
  state.powerUpActive = false;
  state.powerUpTimer = 0;
  state.ghostsEatenInPowerUp = 0;
}

export function createInitialGameState(random: RandomSource = Math.random): GameState {
  const state = {
    score: 0,
    lives: INITIAL_LIVES,
    gameOver: false,
    won: false,
    paused: false,
    scoreBreakdown: createScoreBreakdown(),
    random,
  } as GameState;
  loadLevel(state, 1);
  return state;
}

/**
 * Volver a jugar: partida nueva desde el nivel 1, 3 vidas, puntaje 0 y mapas restablecidos.
 * Reutiliza el mismo objeto de estado para que el bucle de juego en curso lo siga usando.
 */
export function restartGame(state: GameState): void {
  Object.assign(state, createInitialGameState(state.random));
}

export function isGameFinished(state: GameState): boolean {
  return state.gameOver || state.won;
}

/** ESC: pausa o reanuda. No tiene efecto con la partida terminada. */
export function togglePause(state: GameState): void {
  if (isGameFinished(state)) return;
  state.paused = !state.paused;
}

/** Único punto de entrada para sumar puntaje: mantiene el desglose y el total sincronizados. */
function addPoints(state: GameState, category: ScoreCategory, points: number): void {
  if (points <= 0) return; // el puntaje nunca disminuye
  state.score += points;
  state.scoreBreakdown[category] += points;
}

/** Coloca una fruta en el mapa. */
export function spawnFruit(state: GameState, row: number, col: number): void {
  state.fruits.push(createFruit(row, col));
}

function isCellOccupiedByCharacter(state: GameState, row: number, col: number): boolean {
  const entities = [state.player, ...state.ghosts.filter((ghost) => !ghost.eaten)];
  return entities.some((entity) => {
    const position = getMoverPosition(entity);
    return Math.abs(position.row - row) < 1 && Math.abs(position.col - col) < 1;
  });
}

/** Nivel 3: una fruta cada 20 s en una celda transitable libre, máximo 2 simultáneas. */
function updateFruitSpawns(state: GameState, deltaSeconds: number): void {
  const interval = levelDefinition(state).fruitSpawnIntervalSeconds;
  if (interval === null) return;

  state.fruitSpawnTimer += deltaSeconds;
  if (state.fruitSpawnTimer < interval) return;
  state.fruitSpawnTimer -= interval;

  if (state.fruits.length >= MAX_SIMULTANEOUS_FRUITS) return;

  const candidates: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < state.map.rows; row++) {
    for (let col = 0; col < state.map.cols; col++) {
      if (state.map.cells[row][col] !== "path") continue;
      if (state.fruits.some((fruit) => fruit.row === row && fruit.col === col)) continue;
      if (isCellOccupiedByCharacter(state, row, col)) continue;
      candidates.push({ row, col });
    }
  }
  if (candidates.length === 0) return;

  const cell = candidates[Math.min(candidates.length - 1, Math.floor(state.random() * candidates.length))];
  spawnFruit(state, cell.row, cell.col);
}

function consumeFruitAt(state: GameState, row: number, col: number): void {
  const index = state.fruits.findIndex((fruit) => fruit.row === row && fruit.col === col);
  if (index === -1) return;
  state.fruits.splice(index, 1);
  addPoints(state, "fruits", FRUIT_POINTS);
}

function completeLevel(state: GameState): void {
  state.levelComplete = true;
  state.levelTransitionTimer = LEVEL_TRANSITION_SECONDS;
  state.lastLevelTimeBonus = computeTimeBonus(state.level, state.levelElapsed);
  addPoints(state, "timeBonus", state.lastLevelTimeBonus);
}

/** Tras mostrar el resultado del nivel: pasa al siguiente o, si era el 3, victoria. */
function updateLevelTransition(state: GameState, deltaSeconds: number): void {
  state.levelTransitionTimer -= deltaSeconds;
  if (state.levelTransitionTimer > 0) return;

  if (state.level >= LAST_LEVEL) {
    finishGame(state, true);
  } else {
    loadLevel(state, state.level + 1);
  }
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
      // Nivel 1: siempre clásico. Nivel 2: 50 % espectro. Nivel 3: siempre espectro.
      const chance = levelDefinition(state).specterRespawnChance;
      setGhostKind(ghost, chance > 0 && state.random() < chance ? "specter" : "classic");
      // Si el PowerUp sigue activo reaparece vulnerable y la escala continúa.
      ghost.vulnerable = state.powerUpActive;
    }
  }
}

function checkGhostCollisions(state: GameState): void {
  if (state.levelComplete || state.gameOver || state.won) return;

  const player = getMoverPosition(state.player);

  for (const ghost of state.ghosts) {
    if (ghost.eaten) continue;

    const position = getMoverPosition(ghost);
    const distance = Math.hypot(player.row - position.row, player.col - position.col);
    if (distance >= CONTACT_DISTANCE) continue;

    if (ghost.vulnerable) {
      eatGhost(state, ghost);
    } else if (canGhostHarm(ghost)) {
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
    resetPlayerPosition(state);
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

    // El espectro usa su habilidad solo para perseguir a Pacman.
    const allowPhase = !ghost.vulnerable && state.ghostMode === "chase";
    updateGhost(ghost, state.map, deltaSeconds, targetRow, targetCol, allowPhase);
  }
}

export function updateGameState(
  state: GameState,
  deltaSeconds: number,
  playerDesiredDirection: Direction | null
): void {
  if (state.gameOver || state.won || state.paused) return;

  if (state.levelComplete) {
    updateLevelTransition(state, deltaSeconds);
    return;
  }

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
  if (state.levelComplete) return;

  updateFruitSpawns(state, deltaSeconds);
  updatePowerUp(state, deltaSeconds);
  updateGhostRespawns(state, deltaSeconds);
  updateGhostMode(state, deltaSeconds);
  updateGhosts(state, deltaSeconds);
  checkGhostCollisions(state);
}
