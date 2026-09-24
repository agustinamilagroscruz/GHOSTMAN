"use client";

import { useEffect, useRef, useState } from "react";
import { createFireworksState, renderFireworks, spawnFireworkBurst, updateFireworks } from "../game/fireworks";
import { isPhasing } from "../game/ghosts";
import { createKeyboardDirectionInput } from "../game/input";
import { getMoverPosition } from "../game/movement";
import { isBlinkOn, renderFruit, renderGhost, renderMap, renderPacman } from "../game/render";
import { startGameLoop } from "../game/loop";
import {
  createInitialGameState,
  isPowerUpWarning,
  restartGame,
  togglePause,
  updateGameState,
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
    gameOver: state.gameOver,
    won: state.won,
    powerUpActive: state.powerUpActive,
    powerUpTimer: Math.ceil(state.powerUpTimer * 10) / 10,
    paused: state.paused,
  };
}

function sameSnapshot(a: UiSnapshot, b: UiSnapshot): boolean {
  return (Object.keys(a) as Array<keyof UiSnapshot>).every((key) => a[key] === b[key]);
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state] = useState<GameState>(() => createInitialGameState());
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
      updateGameState(state, dt, input.getDirection());

      const snapshot = takeSnapshot(state);
      if (!sameSnapshot(snapshot, lastSnapshot)) {
        // Nueva vida o nuevo nivel: Pacman arranca quieto hasta que se indique una dirección.
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
          isSpecter: ghost.kind === "specter",
          isHarmless: ghost.noEatTimer > 0 || isPhasing(ghost),
          isVulnerable: ghost.vulnerable,
          isWarning,
          blinkOn,
        });
      }
      const position = getMoverPosition(state.player);
      renderPacman(ctx, position.row, position.col, CELL_SIZE, state.player.direction);
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
      powerUpActive={ui.powerUpActive}
      powerUpTimer={ui.powerUpTimer}
    />
  );

  return (
    <div className={styles.wrapper}>
      {hud}
      <div className={styles.canvasContainer}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {ui.levelComplete && !ui.won && (
          <div className={styles.levelComplete}>
            <div className={styles.levelResult}>
              <span>🎉 ¡Nivel {ui.level} completado! 🎉</span>
              <small>Bonus por tiempo: {ui.levelTimeBonus}</small>
              <small>Puntaje: {ui.score}</small>
            </div>
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
            <ScoreBreakdownView total={ui.score} breakdown={state.scoreBreakdown} />
            <button className={styles.restartButton} autoFocus onClick={() => restartRef.current()}>
              Volver a jugar
            </button>
          </div>
        )}
        {ui.won && (
          <div className={`${styles.gameOver} ${styles.victory}`}>
            <h2>🏆 ¡Victoria!</h2>
            <ScoreBreakdownView total={ui.score} breakdown={state.scoreBreakdown} />
            <button className={styles.restartButton} autoFocus onClick={() => restartRef.current()}>
              Volver a jugar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
