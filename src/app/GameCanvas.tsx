"use client";

import { useEffect, useRef, useState } from "react";
import { createFireworksState, renderFireworks, spawnFireworkBurst, updateFireworks } from "../game/fireworks";
import { isDashing, isPhasing } from "../game/ghosts";
import { createKeyboardDirectionInput } from "../game/input";
import { DIRECTION_VECTORS, getMoverPosition } from "../game/movement";
import { isPowerReady } from "../game/powers";
import { EXPLOSION_DISPLAY_SECONDS, FAKE_FRUIT_WARNING_SECONDS } from "../game/fakeFruits";
import { WALL_FLASH_SECONDS } from "../game/difficulty";
import {
  drawWrapped,
  isBlinkOn,
  renderExplosion,
  renderFakeFruit,
  renderFruit,
  renderGhost,
  renderGhostEyes,
  renderMap,
  renderPacman,
  renderWallFlash,
} from "../game/render";
import { startGameLoop } from "../game/loop";
import {
  createInitialGameState,
  getPlayerGhost,
  isPowerUpWarning,
  restartGame,
  togglePause,
  updateGameState,
  type GameConfig,
  type GameState,
} from "../game/state";
import { findGhostSkin, findPacmanSkin } from "../game/skins";
import { LEVEL_THEMES } from "../game/theme";
import { countdownLabel } from "../game/timings";
import { Hud } from "./Hud";
import { ScoreBreakdownView } from "./ScoreBreakdownView";
import styles from "./GameCanvas.module.css";

const CELL_SIZE = 24;
/** Siluetas de la estela del impulso: distancia detrás del acelerado, en celdas, y opacidad. */
const DASH_TRAIL = [
  { offset: 0.8, alpha: 0.2 },
  { offset: 0.4, alpha: 0.45 },
] as const;

/** Lo que la interfaz React necesita del estado del juego; se actualiza solo cuando cambia. */
interface UiSnapshot {
  score: number;
  pelletsRemaining: number;
  lives: number;
  level: number;
  levelComplete: boolean;
  levelTimeBonus: number;
  levelPelletsLeftBonus: number;
  /** Modo GhostMan: segundos enteros que faltan para que reaparezca el fantasma del jugador (0 = en juego). */
  playerRespawnSeconds: number;
  playerEyesReturning: boolean;
  /** Modo GhostMan (HU-32): null si el fantasma no tiene poder; si no, si está disponible. */
  powerReady: boolean | null;
  gameOver: boolean;
  won: boolean;
  powerUpActive: boolean;
  powerUpTimer: number;
  paused: boolean;
  /** "3", "2", "1", "¡ya!" o "¡Listo!" (HU-46); null fuera de la cuenta. */
  countdown: string | null;
}

function takeSnapshot(state: GameState): UiSnapshot {
  return {
    score: state.score,
    pelletsRemaining: state.pelletsRemaining,
    lives: state.lives,
    level: state.level,
    levelComplete: state.levelComplete,
    levelTimeBonus: state.lastLevelTimeBonus,
    levelPelletsLeftBonus: state.lastLevelPelletsLeftBonus,
    playerRespawnSeconds: playerRespawnSeconds(state),
    playerEyesReturning: playerEyesReturning(state),
    powerReady: playerPowerReady(state),
    gameOver: state.gameOver,
    won: state.won,
    powerUpActive: state.powerUpActive,
    powerUpTimer: Math.ceil(state.powerUpTimer * 10) / 10,
    paused: state.paused,
    countdown: countdownLabel(state.countdown),
  };
}

/** Segundos que el fantasma del jugador espera dentro de la base para revivir (el naval, 3 s; decisión 46). */
function playerRespawnSeconds(state: GameState): number {
  const ghost = getPlayerGhost(state);
  return ghost?.eaten && ghost.inHouse ? Math.ceil(ghost.respawnTimer) : 0;
}

/** El fantasma del jugador fue comido y sus ojos vuelven a la base: el jugador no lo controla. */
function playerEyesReturning(state: GameState): boolean {
  const ghost = getPlayerGhost(state);
  return !!ghost?.eaten && !ghost.inHouse;
}

function playerPowerReady(state: GameState): boolean | null {
  const ghost = getPlayerGhost(state);
  return ghost ? isPowerReady(ghost) : null;
}

function sameSnapshot(a: UiSnapshot, b: UiSnapshot): boolean {
  return (Object.keys(a) as Array<keyof UiSnapshot>).every((key) => a[key] === b[key]);
}

interface GameCanvasProps {
  /** Modo y fantasma elegidos en el menú; para cambiarlos hay que volver al menú (HU-22). */
  config: GameConfig;
  onMainMenu: () => void;
}

export function GameCanvas({ config, onMainMenu }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state] = useState<GameState>(() => createInitialGameState(config));
  const [ui, setUi] = useState<UiSnapshot>(() => takeSnapshot(state));
  const restartRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const input = createKeyboardDirectionInput({
      onTogglePause: () => togglePause(state),
      isPaused: () => state.paused,
    });
    const fireworks = createFireworksState();
    let nextFireworkIn = 0;

    // Skins (decisión 58): hasta la HU-40 (incremento 28) son siempre las clásicas.
    const pacmanSkin = findPacmanSkin(state.config.pacmanSkin);
    const ghostSkin = findGhostSkin(state.config.ghostSkin);

    canvas.width = state.map.cols * CELL_SIZE;
    canvas.height = state.map.rows * CELL_SIZE;

    let lastSnapshot = takeSnapshot(state);

    const update = (dt: number) => {
      updateGameState(state, dt, input.getDirection(), input.consumePowerPress());

      const snapshot = takeSnapshot(state);
      if (!sameSnapshot(snapshot, lastSnapshot)) {
        // Nueva vida o nuevo nivel (en modo GhostMan, derrota de Pacman): el personaje del
        // jugador arranca quieto hasta que se indique una dirección.
        // Al terminar la cuenta también: lo presionado durante la cuenta se descarta (HU-46).
        if (snapshot.lives !== lastSnapshot.lives || snapshot.level !== lastSnapshot.level || (lastSnapshot.countdown && !snapshot.countdown)) {
          input.reset();
        }
        lastSnapshot = snapshot;
        setUi(snapshot);
      }

      if (state.paused) return;
      updateFireworks(fireworks, dt);
      if (state.levelComplete || state.won) {
        nextFireworkIn -= dt;
        if (nextFireworkIn <= 0) {
          nextFireworkIn = 0.35;
          const row = 1 + Math.random() * (state.map.rows - 2);
          const col = 1 + Math.random() * (state.map.cols - 2);
          spawnFireworkBurst(fireworks, row, col);
        }
      }
    };

    const render = () => {
      renderMap(ctx, state.map, LEVEL_THEMES[state.level], CELL_SIZE);
      for (const fruit of state.fruits) {
        renderFruit(ctx, fruit.row, fruit.col, CELL_SIZE);
      }
      for (const fruit of state.fakeFruits) {
        renderFakeFruit(ctx, fruit.row, fruit.col, CELL_SIZE, fruit.timeLeft, FAKE_FRUIT_WARNING_SECONDS);
      }
      for (const explosion of state.explosions) {
        renderExplosion(ctx, explosion.cells, CELL_SIZE, explosion.timeLeft / EXPLOSION_DISPLAY_SECONDS);
      }
      for (const flash of state.wallFlashes) {
        renderWallFlash(ctx, flash.row, flash.col, CELL_SIZE, flash.timeLeft / WALL_FLASH_SECONDS);
      }
      const isWarning = isPowerUpWarning(state);
      const blinkOn = isBlinkOn(state.powerUpTimer);
      for (const ghost of state.ghosts) {
        const ghostPosition = getMoverPosition(ghost);
        // Comido: sus ojos vuelven a la base (decisión 46); ya adentro, espera sin dibujarse.
        if (ghost.eaten) {
          if (!ghost.inHouse) {
            drawWrapped(state.map.cols, ghostPosition.col, (col) =>
              renderGhostEyes(ctx, ghostPosition.row, col, CELL_SIZE, ghost.direction, ghostSkin)
            );
          }
          continue;
        }
        const appearance = {
          id: ghost.id,
          color: ghost.color,
          kind: ghost.kind,
          direction: ghost.facing ?? ghost.direction,
          skin: ghostSkin,
          isHarmless: ghost.noEatTimer > 0 || isPhasing(ghost),
          isVulnerable: ghost.vulnerable,
          isWarning,
          blinkOn,
        };
        // Estela del impulso del acelerado: dos siluetas que se desvanecen detrás (decisión 54).
        if (isDashing(ghost) && ghost.facing) {
          const [dRow, dCol] = DIRECTION_VECTORS[ghost.facing];
          DASH_TRAIL.forEach(({ offset, alpha }) => {
            const row = ghostPosition.row - dRow * offset;
            ctx.save();
            ctx.globalAlpha = alpha;
            drawWrapped(state.map.cols, ghostPosition.col - dCol * offset, (col) => renderGhost(ctx, row, col, CELL_SIZE, appearance));
            ctx.restore();
          });
        }
        drawWrapped(state.map.cols, ghostPosition.col, (col) => renderGhost(ctx, ghostPosition.row, col, CELL_SIZE, appearance));
      }
      const position = getMoverPosition(state.pacman);
      drawWrapped(state.map.cols, position.col, (col) =>
        renderPacman(ctx, position.row, col, CELL_SIZE, state.pacman.direction, pacmanSkin)
      );
      renderFireworks(ctx, fireworks, CELL_SIZE);
    };

    restartRef.current = () => {
      restartGame(state);
      input.reset();
      fireworks.particles = [];
      lastSnapshot = takeSnapshot(state);
      setUi(lastSnapshot);
    };

    const loop = startGameLoop(update, render);
    return () => {
      loop.stop();
      input.dispose();
    };
  }, [state]);

  const hud = (
    <Hud
      score={ui.score}
      pelletsRemaining={ui.pelletsRemaining}
      level={ui.level}
      powerUpActive={ui.powerUpActive}
      powerUpTimer={ui.powerUpTimer}
    />
  );

  const isGhostman = config.mode === "ghostman";

  return (
    <div className={styles.wrapper}>
      {hud}
      <div className={styles.canvasContainer}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {ui.levelComplete && !ui.won && (
          <div className={styles.levelComplete}>
            <div className={styles.levelResult}>
              <span>🎉 ¡Nivel {ui.level} completado! 🎉</span>
              {isGhostman ? (
                <>
                  <small>Pacman derrotado 3 veces</small>
                  <small>Esferas sin consumir: {ui.levelPelletsLeftBonus}</small>
                </>
              ) : (
                <small>Bonus por tiempo: {ui.levelTimeBonus}</small>
              )}
              <small>Puntaje: {ui.score}</small>
            </div>
          </div>
        )}
        {ui.countdown && (
          <div className={styles.countdown} data-testid="countdown" data-label={ui.countdown}>
            {ui.countdown}
          </div>
        )}
        {(ui.playerEyesReturning || ui.playerRespawnSeconds > 0) && !ui.paused && (
          <div className={styles.respawn} data-testid="player-respawn">
            {ui.playerEyesReturning ? "Volviendo a la base…" : `Reaparecés en ${ui.playerRespawnSeconds}`}
          </div>
        )}
        {ui.paused && (
          <div className={styles.paused} data-testid="pause-overlay">
            <span>⏸ PAUSA</span>
            <small>ESC para continuar</small>
          </div>
        )}
        {ui.gameOver && (
          <div className={styles.gameOver}>
            <h2>💀 Game Over</h2>
            <ScoreBreakdownView total={ui.score} breakdown={state.scoreBreakdown} mode={config.mode} />
            <EndActions onRestart={() => restartRef.current()} onMainMenu={onMainMenu} />
          </div>
        )}
        {ui.won && (
          <div className={`${styles.gameOver} ${styles.victory}`}>
            <h2>🏆 ¡Victoria!</h2>
            <ScoreBreakdownView total={ui.score} breakdown={state.scoreBreakdown} mode={config.mode} />
            <EndActions onRestart={() => restartRef.current()} onMainMenu={onMainMenu} />
          </div>
        )}
      </div>
      {isGhostman ? (
        <GhostmanStatusBar pacmanLives={ui.lives} powerReady={ui.powerReady} />
      ) : (
        <PacmanStatusBar lives={ui.lives} />
      )}
    </div>
  );
}

/**
 * Modo GhostMan, extremo inferior izquierdo: vidas de Pacman en el nivel con el ícono del
 * fantasma, que sirven a la vez de contador de derrotas e identifican el modo (decisión 18).
 */
function GhostmanStatusBar({ pacmanLives, powerReady }: { pacmanLives: number; powerReady: boolean | null }) {
  return (
    <div className={styles.statusBar} data-testid="ghostman-status">
      {powerReady !== null && (
        <span
          className={powerReady ? styles.powerStar : `${styles.powerStar} ${styles.powerStarCooldown}`}
          data-testid="power-indicator"
          data-ready={powerReady}
          title={powerReady ? "Poder disponible (barra espaciadora)" : "Poder en cooldown"}
        >
          ⭐
        </span>
      )}
      <span className={styles.statusLabel}>Vidas de Pacman</span>
      <span data-testid="pacman-lives" data-lives={pacmanLives}>
        {Array.from({ length: pacmanLives }, (_, i) => (
          <span key={i} data-testid="life-icon" data-icon="ghost">
            👻
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * Modo Pacman, extremo inferior izquierdo: vidas del jugador con el ícono de Pacman (HU-09).
 * Corrige DEF-001: hasta la V2 estaban arriba a la derecha, como círculos amarillos.
 */
function PacmanStatusBar({ lives }: { lives: number }) {
  return (
    <div className={styles.statusBar} data-testid="pacman-status">
      <span className={styles.statusLabel}>Vidas</span>
      <span data-testid="player-lives" data-lives={lives}>
        {Array.from({ length: lives }, (_, i) => (
          <span key={i} data-testid="life-icon" data-icon="pacman" className={styles.lifeIconPacman} aria-label="vida">
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M10 10 L18.5 5.1 A9.5 9.5 0 1 0 18.5 14.9 Z" fill="#f8e34d" />
            </svg>
          </span>
        ))}
      </span>
    </div>
  );
}

/** Acciones de las pantallas de cierre (HU-19, decisión 29). */
function EndActions({ onRestart, onMainMenu }: { onRestart: () => void; onMainMenu: () => void }) {
  return (
    <div className={styles.endActions}>
      <button className={styles.restartButton} autoFocus onClick={onRestart}>
        Volver a jugar
      </button>
      <button className={styles.menuButton} onClick={onMainMenu}>
        Menú principal
      </button>
    </div>
  );
}
