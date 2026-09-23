"use client";

import { useEffect, useRef, useState } from "react";
import { createFireworksState, renderFireworks, spawnFireworkBurst, updateFireworks } from "../game/fireworks";
import { createKeyboardDirectionInput } from "../game/input";
import { getMoverPosition } from "../game/movement";
import { renderGhost, renderMap, renderPacman } from "../game/render";
import { startGameLoop } from "../game/loop";
import { createInitialGameState, updateGameState, type GameState } from "../game/state";
import { LEVEL_THEMES } from "../game/theme";
import { Hud } from "./Hud";
import styles from "./GameCanvas.module.css";

const CELL_SIZE = 24;

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state] = useState<GameState>(() => createInitialGameState());

  const [score, setScore] = useState(state.score);
  const [pelletsRemaining, setPelletsRemaining] = useState(state.pelletsRemaining);
  const [levelComplete, setLevelComplete] = useState(state.levelComplete);
  const [lives, setLives] = useState(state.lives);
  const [gameOver, setGameOver] = useState(state.gameOver);
  const [powerUpActive, setPowerUpActive] = useState(state.powerUpActive);
  const [powerUpTimer, setPowerUpTimer] = useState(state.powerUpTimer);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const theme = LEVEL_THEMES[1];
    const input = createKeyboardDirectionInput();
    const fireworks = createFireworksState();
    let nextFireworkIn = 0;

    canvas.width = state.map.cols * CELL_SIZE;
    canvas.height = state.map.rows * CELL_SIZE;

    let lastScore = state.score;
    let lastPelletsRemaining = state.pelletsRemaining;
    let lastLevelComplete = state.levelComplete;
    let lastLives = state.lives;
    let lastGameOver = state.gameOver;
    let lastPowerUpActive = state.powerUpActive;
    let lastPowerUpTimer = state.powerUpTimer;

    const update = (dt: number) => {
      updateGameState(state, dt, input.getDirection());

      if (state.score !== lastScore) {
        lastScore = state.score;
        setScore(lastScore);
      }
      if (state.pelletsRemaining !== lastPelletsRemaining) {
        lastPelletsRemaining = state.pelletsRemaining;
        setPelletsRemaining(lastPelletsRemaining);
      }
      if (state.levelComplete !== lastLevelComplete) {
        lastLevelComplete = state.levelComplete;
        setLevelComplete(lastLevelComplete);
      }
      if (state.lives !== lastLives) {
        lastLives = state.lives;
        setLives(lastLives);
      }
      if (state.gameOver !== lastGameOver) {
        lastGameOver = state.gameOver;
        setGameOver(lastGameOver);
      }
      if (state.powerUpActive !== lastPowerUpActive) {
        lastPowerUpActive = state.powerUpActive;
        setPowerUpActive(lastPowerUpActive);
      }
      if (state.powerUpTimer !== lastPowerUpTimer) {
        lastPowerUpTimer = state.powerUpTimer;
        setPowerUpTimer(lastPowerUpTimer);
      }

      updateFireworks(fireworks, dt);
      if (state.levelComplete) {
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
      renderMap(ctx, state.map, theme, CELL_SIZE);
      for (const ghost of state.ghosts) {
        const ghostPosition = getMoverPosition(ghost);
        const isVulnerable = state.powerUpActive;
        const isWarning = state.powerUpActive && state.powerUpTimer <= 2;
        renderGhost(ctx, ghostPosition.row, ghostPosition.col, CELL_SIZE, ghost.color, isVulnerable, isWarning);
      }
      const position = getMoverPosition(state.player);
      renderPacman(ctx, position.row, position.col, CELL_SIZE, state.player.direction);
      renderFireworks(ctx, fireworks, CELL_SIZE);
    };

    const loop = startGameLoop(update, render);
    return () => {
      loop.stop();
      input.dispose();
    };
  }, [state]);

  if (gameOver) {
    return (
      <div className={styles.wrapper}>
        <Hud score={score} pelletsRemaining={pelletsRemaining} lives={lives} />
        <div className={styles.canvasContainer}>
          <canvas ref={canvasRef} className={styles.canvas} />
          <div className={styles.gameOver}>
            <h2>💀 Game Over</h2>
            <p>Puntaje final: {score}</p>
            <button className={styles.restartButton} onClick={() => window.location.reload()}>
              Volver a jugar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Hud score={score} pelletsRemaining={pelletsRemaining} lives={lives} powerUpActive={powerUpActive} powerUpTimer={powerUpTimer} />
      <div className={styles.canvasContainer}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {levelComplete && <div className={styles.levelComplete}>🎉 ¡Nivel completado! 🎉</div>}
      </div>
    </div>
  );
}


