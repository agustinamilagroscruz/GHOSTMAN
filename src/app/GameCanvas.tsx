"use client";

import { useEffect, useRef, useState } from "react";
import { createFireworksState, renderFireworks, spawnFireworkBurst, updateFireworks } from "../game/fireworks";
import { isPhasing } from "../game/ghosts";
import { createKeyboardDirectionInput } from "../game/input";
import { getMoverPosition } from "../game/movement";
import { isPowerReady } from "../game/powers";
import { isBlinkOn, renderFruit, renderGhost, renderMap, renderPacman } from "../game/render";
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
import { LEVEL_THEMES } from "../game/theme";
import { Hud } from "./Hud";
import { ScoreBreakdownView } from "./ScoreBreakdownView";
import styles from "./GameCanvas.module.css";

const CELL_SIZE = 24;

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
  /** Modo GhostMan (HU-32): null si el fantasma no tiene poder; si no, si está disponible. */
  powerReady: boolean | null;
  gameOver: boolean;
  won: boolean;
  powerUpActive: boolean;
  powerUpTimer: number;
  paused: boolean;
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
    powerReady: playerPowerReady(state),
    gameOver: state.gameOver,
    won: state.won,
    powerUpActive: state.powerUpActive,
    powerUpTimer: Math.ceil(state.powerUpTimer * 10) / 10,
    paused: state.paused,
  };
}

function playerRespawnSeconds(state: GameState): number {
  const ghost = getPlayerGhost(state);
  return ghost?.eaten ? Math.ceil(ghost.respawnTimer) : 0;
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

    canvas.width = state.map.cols * CELL_SIZE;
    canvas.height = state.map.rows * CELL_SIZE;

    let lastSnapshot = takeSnapshot(state);

    const update = (dt: number) => {
      updateGameState(state, dt, input.getDirection(), input.consumePowerPress());

      const snapshot = takeSnapshot(state);
      if (!sameSnapshot(snapshot, lastSnapshot)) {
        // Nueva vida o nuevo nivel (en modo GhostMan, derrota de Pacman): el personaje del
        // jugador arranca quieto hasta que se indique una dirección.
        if (snapshot.lives !== lastSnapshot.lives || snapshot.level !== lastSnapshot.level) {
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
      const isWarning = isPowerUpWarning(state);
      const blinkOn = isBlinkOn(state.powerUpTimer);
      for (const ghost of state.ghosts) {
        if (ghost.eaten) continue; // comido: fuera del mapa hasta reaparecer
        const ghostPosition = getMoverPosition(ghost);
        renderGhost(ctx, ghostPosition.row, ghostPosition.col, CELL_SIZE, {
          color: ghost.color,
          kind: ghost.kind,
          isHarmless: ghost.noEatTimer > 0 || isPhasing(ghost),
          isVulnerable: ghost.vulnerable,
          isWarning,
          blinkOn,
        });
      }
      const position = getMoverPosition(state.pacman);
      renderPacman(ctx, position.row, position.col, CELL_SIZE, state.pacman.direction);
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
      lives={ui.lives}
      level={ui.level}
      mode={config.mode}
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
        {ui.playerRespawnSeconds > 0 && !ui.paused && (
          <div className={styles.respawn} data-testid="player-respawn">
            Reaparecés en {ui.playerRespawnSeconds}
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
      {isGhostman && <GhostmanStatusBar pacmanLives={ui.lives} powerReady={ui.powerReady} />}
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
          <span key={i} data-testid="life-icon">
            👻
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
