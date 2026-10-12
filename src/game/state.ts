import {
  canGhostHarm,
  clearSpecterState,
  createGhost,
  reverseGhostDirection,
  setGhostKind,
  tickPlayerPowerTimers,
  updateGhost,
  updatePlayerGhost,
  type Ghost,
  type GhostKind,
  type GhostMode,
} from "./ghosts";
import {
  EXPLOSION_DISPLAY_SECONDS,
  explosionCells,
  type Explosion,
  type FakeFruit,
} from "./fakeFruits";
import { ageFruits, createFruit, type Fruit } from "./fruits";
import { LAST_LEVEL, LEVELS, MAX_SIMULTANEOUS_FRUITS, type LevelDefinition } from "./levels";
import { createMover, getMoverPosition, updateMover, type Direction, type Mover } from "./movement";
import { decidePacmanDirection } from "./pacmanAi";
import { tryActivateGhostPower } from "./powers";
import { tickTimer } from "./timers";
import {
  COMMON_PELLET_POINTS,
  FRUIT_POINTS,
  MODE_SCORE_CATEGORIES,
  PACMAN_DEFEAT_POINTS,
  PELLET_LEFT_POINTS,
  POWER_PELLET_POINTS,
  computeLivesBonus,
  computeTimeBonus,
  createScoreBreakdown,
  type ScoreBreakdown,
  type ScoreCategory,
} from "./scoring";
import type { GameMap } from "./types";

const PACMAN_SPEED_CELLS_PER_SECOND = 5;

const CHASE_DURATION_SECONDS = 20;
const SCATTER_DURATION_SECONDS = 7;

const INITIAL_LIVES = 3;
const POWER_UP_DURATION_SECONDS = 8;
export const POWER_UP_WARNING_SECONDS = 2;
const GHOST_RESPAWN_SECONDS = 5;
/** El naval tarda más en reaparecer al ser comido (sección 4.5). */
const NAVAL_RESPAWN_SECONDS = 8;
const GHOST_POINTS_SCALE = [200, 400, 800, 1600] as const;
/** Distancia (en celdas) entre centros a partir de la cual Pacman y un fantasma se tocan. */
const CONTACT_DISTANCE = 0.5;
/** Segundos que se muestra el resultado del nivel antes de pasar al siguiente. */
export const LEVEL_TRANSITION_SECONDS = 3;

export type RandomSource = () => number;

/** Modo de juego (HU-22): el jugador controla a Pacman o a un fantasma. */
export type GameMode = "pacman" | "ghostman";

/** Lo que se elige antes de empezar y no cambia durante la partida (HU-22, HU-23). */
export interface GameConfig {
  mode: GameMode;
  /** Solo en modo GhostMan: tipo del fantasma del jugador. */
  playerGhostKind?: GhostKind;
}

export const PACMAN_MODE_CONFIG: GameConfig = { mode: "pacman" };

export interface GameState {
  /** Modo y fantasma elegidos al iniciar; solo cambian iniciando una partida nueva. */
  readonly config: GameConfig;
  map: GameMap;
  pacman: Mover;
  ghosts: Ghost[];
  ghostMode: GhostMode;
  ghostModeTimer: number;
  score: number;
  pelletsRemaining: number;
  levelComplete: boolean;
  /**
   * Vidas: en modo Pacman, las del jugador (3 por partida). En modo GhostMan, las de Pacman
   * en el nivel en curso (3 por nivel): funcionan como contador de derrotas (decisión 18).
   */
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
  /** Modo GhostMan: puntos por esferas sin consumir al completar el nivel en curso. */
  lastLevelPelletsLeftBonus: number;
  /** Cuenta regresiva del resultado de nivel antes de cargar el siguiente. */
  levelTransitionTimer: number;
  fruits: Fruit[];
  /** Frutas falsas del Naval en el mapa (máximo 2). */
  fakeFruits: FakeFruit[];
  /** Explosiones de frutas falsas que se están dibujando (solo visual). */
  explosions: Explosion[];
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

/**
 * Modo Pacman: los cuatro fantasmas son de la IA, con el tipo inicial del nivel.
 * Modo GhostMan: el primer fantasma (esquina superior izquierda) es el del jugador, con el
 * tipo elegido en el carrusel; los otros tres son clásicos de la IA en todos los niveles.
 */
function createLevelGhosts(definition: LevelDefinition, config: GameConfig): Ghost[] {
  return definition.ghosts.map((setup, index) => {
    if (config.mode === "pacman") {
      return createGhost(setup.id, setup.spawn.row, setup.spawn.col, definition.initialGhostKind, setup.color, setup.scatterTarget);
    }
    const isPlayer = index === 0;
    const kind = isPlayer ? (config.playerGhostKind ?? "classic") : "classic";
    const ghost = createGhost(setup.id, setup.spawn.row, setup.spawn.col, kind, setup.color, setup.scatterTarget);
    ghost.controlledByPlayer = isPlayer;
    return ghost;
  });
}

/** Modo GhostMan: el fantasma que controla el jugador. */
export function getPlayerGhost(state: GameState): Ghost | undefined {
  return state.ghosts.find((ghost) => ghost.controlledByPlayer);
}

function placeGhostAtSpawn(ghost: Ghost): void {
  ghost.row = ghost.spawn.row;
  ghost.col = ghost.spawn.col;
  ghost.progress = 0;
  ghost.direction = null;
  ghost.desiredDirection = null;
  ghost.facing = null;
  ghost.phasePending = false;
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

function resetPacmanPosition(state: GameState): void {
  const spawn = levelDefinition(state).pacmanSpawn;
  state.pacman.row = spawn.row;
  state.pacman.col = spawn.col;
  state.pacman.progress = 0;
  state.pacman.direction = null;
  state.pacman.desiredDirection = null;
}

/** Carga un nivel conservando puntaje, desglose y vidas. */
function loadLevel(state: GameState, level: number): void {
  const definition = LEVELS[level];
  const map = definition.createMap();
  map.pellets[definition.pacmanSpawn.row][definition.pacmanSpawn.col] = "none";

  state.level = level;
  state.map = map;
  state.pacman = createMover(definition.pacmanSpawn.row, definition.pacmanSpawn.col, PACMAN_SPEED_CELLS_PER_SECOND);
  state.ghosts = createLevelGhosts(definition, state.config);
  state.ghostMode = "chase";
  state.ghostModeTimer = 0;
  state.pelletsRemaining = countPellets(map);
  state.levelComplete = false;
  state.levelElapsed = 0;
  state.lastLevelTimeBonus = 0;
  state.lastLevelPelletsLeftBonus = 0;
  // Modo GhostMan: Pacman arranca cada nivel con 3 vidas (decisión 18).
  if (state.config.mode === "ghostman") state.lives = INITIAL_LIVES;
  state.levelTransitionTimer = 0;
  state.fruits = [];
  state.fakeFruits = [];
  state.explosions = [];
  state.fruitSpawnTimer = 0;
  state.powerUpActive = false;
  state.powerUpTimer = 0;
  state.ghostsEatenInPowerUp = 0;
}

export function createInitialGameState(
  config: GameConfig = PACMAN_MODE_CONFIG,
  random: RandomSource = Math.random
): GameState {
  const state = {
    config,
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
 * Volver a jugar: partida nueva desde el nivel 1, 3 vidas, puntaje 0 y mapas restablecidos,
 * en el mismo modo y con el mismo fantasma (decisión 29).
 * Reutiliza el mismo objeto de estado para que el bucle de juego en curso lo siga usando.
 */
export function restartGame(state: GameState): void {
  Object.assign(state, createInitialGameState(state.config, state.random));
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
  // Modo GhostMan: lo que hace Pacman (IA) no suma puntos al jugador; solo suman las
  // derrotas de Pacman y las esferas sin consumir (sección 4.4).
  const categories: readonly ScoreCategory[] = MODE_SCORE_CATEGORIES[state.config.mode];
  if (!categories.includes(category)) return;
  state.score += points;
  state.scoreBreakdown[category] += points;
}

/** Coloca una fruta en el mapa. */
export function spawnFruit(state: GameState, row: number, col: number): void {
  state.fruits.push(createFruit(row, col));
}

function isCellOccupiedByCharacter(state: GameState, row: number, col: number): boolean {
  const entities = [state.pacman, ...state.ghosts.filter((ghost) => !ghost.eaten)];
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
  if (state.config.mode === "pacman") {
    state.lastLevelTimeBonus = computeTimeBonus(state.level, state.levelElapsed);
    addPoints(state, "timeBonus", state.lastLevelTimeBonus);
  } else {
    state.lastLevelPelletsLeftBonus = state.pelletsRemaining * PELLET_LEFT_POINTS;
    addPoints(state, "pelletsLeft", state.lastLevelPelletsLeftBonus);
  }
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
  // addPoints descarta este bonus en modo GhostMan, donde las vidas son las de Pacman.
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
    // Modo GhostMan: si Pacman consume la última esfera, el jugador pierde (HU-26),
    // sin importar cuántas derrotas de Pacman lleve en el nivel.
    if (state.config.mode === "ghostman") {
      finishGame(state, false);
    } else {
      completeLevel(state);
    }
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
      // Modo GhostMan: el fantasma del jugador conserva su tipo y los de la IA siguen clásicos.
      if (state.config.mode === "pacman") {
        // Nivel 1: siempre clásico. Nivel 2: 50 % espectro. Nivel 3: siempre espectro.
        const chance = levelDefinition(state).specterRespawnChance;
        setGhostKind(ghost, chance > 0 && state.random() < chance ? "specter" : "classic");
      }
      // Si el PowerUp sigue activo reaparece vulnerable y la escala continúa.
      ghost.vulnerable = state.powerUpActive;
    }
  }
}

function checkGhostCollisions(state: GameState): void {
  if (state.levelComplete || state.gameOver || state.won) return;

  const pacman = getMoverPosition(state.pacman);

  for (const ghost of state.ghosts) {
    if (ghost.eaten) continue;

    const position = getMoverPosition(ghost);
    const distance = Math.hypot(pacman.row - position.row, pacman.col - position.col);
    if (distance >= CONTACT_DISTANCE) continue;

    // Un único contacto dañino por paso: nunca dos descuentos por la misma colisión.
    if (resolveContact(state, ghost)) return;
  }
}

/**
 * Contacto entre Pacman y un fantasma: con el fantasma vulnerable, Pacman lo come; si el
 * fantasma puede dañarlo, aplica la regla del modo. Devuelve true si Pacman fue dañado.
 */
function resolveContact(state: GameState, ghost: Ghost): boolean {
  if (ghost.vulnerable) {
    eatGhost(state, ghost);
    return false;
  }
  if (!canGhostHarm(ghost)) return false;
  if (state.config.mode === "pacman") {
    loseLife(state);
  } else if (ghost.controlledByPlayer) {
    defeatPacman(state);
  } else {
    // Toque de un fantasma de la IA en modo GhostMan: Pacman vuelve a su posición
    // inicial sin perder una vida, y nada más cambia (decisión 19).
    resetPacmanPosition(state);
  }
  return true;
}

/** Distancia de un punto al segmento recto (horizontal o vertical) entre dos centros de celda. */
function distanceToSegment(
  point: { row: number; col: number },
  from: { row: number; col: number },
  to: { row: number; col: number }
): number {
  const dRow = to.row - from.row;
  const dCol = to.col - from.col;
  const lengthSquared = dRow * dRow + dCol * dCol;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.row - from.row) * dRow + (point.col - from.col) * dCol) / lengthSquared));
  return Math.hypot(point.row - (from.row + t * dRow), point.col - (from.col + t * dCol));
}

/**
 * Dash del acelerado: el contacto con Pacman se evalúa en todo el trayecto, no solo en la celda
 * de llegada. Pasar por encima de Pacman también es contacto (decisión 32).
 */
function checkDashContact(state: GameState, ghost: Ghost, from: { row: number; col: number }): void {
  if (state.levelComplete || state.gameOver || state.won) return;
  const pacman = getMoverPosition(state.pacman);
  if (distanceToSegment(pacman, from, { row: ghost.row, col: ghost.col }) < CONTACT_DISTANCE) {
    resolveContact(state, ghost);
  }
}

/**
 * Modo GhostMan: el fantasma del jugador derrota a Pacman (HU-25). Pacman pierde una vida,
 * el jugador suma 500 y el nivel se reinicia según la tabla 4.3: se conservan las esferas
 * consumidas y el puntaje, todos vuelven a su posición inicial, se cancela el PowerUp y el
 * cooldown del poder del jugador NO se reinicia (decisión 28). Con 0 vidas se completa el nivel.
 */
function defeatPacman(state: GameState): void {
  state.lives -= 1;
  addPoints(state, "pacmanDefeats", PACMAN_DEFEAT_POINTS);
  endPowerUp(state);

  if (state.lives <= 0) {
    state.lives = 0;
    completeLevel(state);
    return;
  }
  restartLevelPositions(state);
}

function eatGhost(state: GameState, ghost: Ghost): void {
  const index = Math.min(state.ghostsEatenInPowerUp, GHOST_POINTS_SCALE.length - 1);
  addPoints(state, "ghosts", GHOST_POINTS_SCALE[index]);
  state.ghostsEatenInPowerUp += 1;

  ghost.eaten = true;
  ghost.vulnerable = false;
  ghost.respawnTimer = ghost.kind === "naval" ? NAVAL_RESPAWN_SECONDS : GHOST_RESPAWN_SECONDS;
  placeGhostAtSpawn(ghost);
}

function loseLife(state: GameState): void {
  state.lives -= 1;
  endPowerUp(state);

  if (state.lives <= 0) {
    state.lives = 0;
    finishGame(state, false);
  } else {
    restartLevelPositions(state);
  }
}

/**
 * Reinicio del nivel tras perder una vida (modo Pacman) o una derrota de Pacman (modo GhostMan):
 * todos vuelven a su posición inicial y las frutas falsas desaparecen sin explotar (decisión 27).
 * Se conservan las esferas consumidas, el puntaje y los cooldowns.
 */
function restartLevelPositions(state: GameState): void {
  resetPacmanPosition(state);
  resetGhostPositions(state.ghosts);
  state.ghostMode = "chase";
  state.ghostModeTimer = 0;
  state.fakeFruits = [];
}

/**
 * Pacman pierde una vida por una fruta falsa (consumida o explosión). En modo Pacman es una vida
 * del jugador; en modo GhostMan es una derrota producida por el jugador, que colocó la fruta.
 */
function pacmanLosesLife(state: GameState): void {
  if (state.config.mode === "pacman") {
    loseLife(state);
  } else {
    defeatPacman(state);
  }
}

/** Pacman llega a una celda con fruta falsa: sin PowerUp pierde una vida; con PowerUp desaparece sin efecto. */
function consumeFakeFruitAt(state: GameState, row: number, col: number): void {
  const index = state.fakeFruits.findIndex((fruit) => fruit.row === row && fruit.col === col);
  if (index === -1) return;
  state.fakeFruits.splice(index, 1);
  if (!state.powerUpActive) pacmanLosesLife(state);
}

/** Cuenta regresiva de las frutas falsas: a los 10 s explotan; la explosión solo afecta a Pacman sin PowerUp. */
function updateFakeFruits(state: GameState, deltaSeconds: number): void {
  for (const explosion of state.explosions) explosion.timeLeft -= deltaSeconds;
  state.explosions = state.explosions.filter((explosion) => explosion.timeLeft > 0);

  for (const fruit of state.fakeFruits) fruit.timeLeft = tickTimer(fruit.timeLeft, deltaSeconds);
  const exploding = state.fakeFruits.filter((fruit) => fruit.timeLeft <= 0);
  if (exploding.length === 0) return;
  state.fakeFruits = state.fakeFruits.filter((fruit) => fruit.timeLeft > 0);

  const pacman = getMoverPosition(state.pacman);
  const pacmanRow = Math.round(pacman.row);
  const pacmanCol = Math.round(pacman.col);
  let pacmanHit = false;
  for (const fruit of exploding) {
    const cells = explosionCells(state.map, fruit.row, fruit.col);
    state.explosions.push({ cells, timeLeft: EXPLOSION_DISPLAY_SECONDS });
    if (cells.some((cell) => cell.row === pacmanRow && cell.col === pacmanCol)) pacmanHit = true;
  }
  // Dos explosiones simultáneas sobre Pacman descuentan una sola vida.
  if (pacmanHit && !state.powerUpActive) pacmanLosesLife(state);
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

function updateGhosts(state: GameState, deltaSeconds: number, playerDirection: Direction | null): void {
  for (const ghost of state.ghosts) {
    if (ghost.eaten) {
      // El cooldown del poder del jugador sigue corriendo mientras espera reaparecer (decisión 35).
      // El espectro de la IA conserva el comportamiento de la V1: su cooldown se detiene.
      if (ghost.controlledByPlayer) tickPlayerPowerTimers(ghost, deltaSeconds);
      continue;
    }

    if (ghost.controlledByPlayer) {
      updatePlayerGhost(ghost, state.map, deltaSeconds, playerDirection);
      continue;
    }

    let targetRow: number;
    let targetCol: number;

    if (ghost.vulnerable) {
      const dRow = ghost.row - state.pacman.row;
      const dCol = ghost.col - state.pacman.col;
      targetRow = ghost.row + dRow * 5;
      targetCol = ghost.col + dCol * 5;
    } else {
      const target = state.ghostMode === "chase" ? state.pacman : ghost.scatterTarget;
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
  playerDesiredDirection: Direction | null,
  /** Barra espaciadora presionada desde el paso anterior (solo tiene efecto en modo GhostMan). */
  playerPowerRequested = false
): void {
  const isPacmanMode = state.config.mode === "pacman";
  if (state.gameOver || state.won || state.paused) return;

  if (state.levelComplete) {
    updateLevelTransition(state, deltaSeconds);
    return;
  }

  state.levelElapsed += deltaSeconds;

  const previousRow = state.pacman.row;
  const previousCol = state.pacman.col;

  if (isPacmanMode) {
    state.pacman.desiredDirection = playerDesiredDirection;
    updateMover(state.pacman, state.map, deltaSeconds);
  } else {
    // Modo GhostMan: a Pacman lo mueve la IA, que decide en cada celda a la que llega (sección 4.7).
    updateMover(state.pacman, state.map, deltaSeconds, (pacman) =>
      decidePacmanDirection({
        map: state.map,
        pacman,
        ghosts: state.ghosts,
        powerUpActive: state.powerUpActive,
        // La IA no distingue la fruta falsa de la real (decisión 17).
        fruits: [...state.fruits, ...state.fakeFruits],
      })
    );
  }

  if (state.pacman.row !== previousRow || state.pacman.col !== previousCol) {
    consumePelletAt(state, state.pacman.row, state.pacman.col);
    consumeFruitAt(state, state.pacman.row, state.pacman.col);
    consumeFakeFruitAt(state, state.pacman.row, state.pacman.col);
  }
  state.fruits = ageFruits(state.fruits, deltaSeconds);
  if (state.levelComplete || state.gameOver) return;

  updateFruitSpawns(state, deltaSeconds);
  updatePowerUp(state, deltaSeconds);
  updateGhostRespawns(state, deltaSeconds);
  updateGhostMode(state, deltaSeconds);
  // El poder se resuelve antes de la cuenta regresiva de las frutas falsas: un intento en el
  // mismo instante en que explota una fruta todavía la cuenta para el máximo de 2.
  if (!isPacmanMode && playerPowerRequested) {
    const playerGhost = getPlayerGhost(state);
    if (playerGhost) {
      const from = getMoverPosition(playerGhost);
      const used = tryActivateGhostPower(playerGhost, {
        map: state.map,
        random: state.random,
        fakeFruits: state.fakeFruits,
      });
      if (used && playerGhost.kind === "accelerated") checkDashContact(state, playerGhost, from);
    }
  }
  updateFakeFruits(state, deltaSeconds);
  if (state.levelComplete || state.gameOver) return;
  updateGhosts(state, deltaSeconds, isPacmanMode ? null : playerDesiredDirection);
  checkGhostCollisions(state);
}
