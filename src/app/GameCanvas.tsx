"use client";

import { useEffect, useRef, useState } from "react";
import { createKeyboardDirectionInput } from "../game/input";
import { getMoverPosition } from "../game/movement";
import { renderMap, renderPacman } from "../game/render";
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const theme = LEVEL_THEMES[1];
    const input = createKeyboardDirectionInput();

    canvas.width = state.map.cols * CELL_SIZE;
    canvas.height = state.map.rows * CELL_SIZE;

    let lastScore = state.score;
    let lastPelletsRemaining = state.pelletsRemaining;
    let lastLevelComplete = state.levelComplete;

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
    };

    const render = () => {
      renderMap(ctx, state.map, theme, CELL_SIZE);
      const position = getMoverPosition(state.player);
      renderPacman(ctx, position.row, position.col, CELL_SIZE, state.player.direction);
    };

    const loop = startGameLoop(update, render);
    return () => {
      loop.stop();
      input.dispose();
    };
  }, [state]);

  return (
    <div className={styles.wrapper}>
      <Hud score={score} pelletsRemaining={pelletsRemaining} />
      <div className={styles.canvasContainer}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {levelComplete && <div className={styles.levelComplete}>¡Nivel completado!</div>}
      </div>
    </div>
  );
}


