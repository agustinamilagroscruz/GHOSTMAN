"use client";

import { useEffect, useRef } from "react";
import { createKeyboardDirectionInput } from "../game/input";
import { getMoverPosition } from "../game/movement";
import { renderMap, renderPacman } from "../game/render";
import { startGameLoop } from "../game/loop";
import { createInitialGameState, updateGameState } from "../game/state";
import { LEVEL_THEMES } from "../game/theme";
import styles from "./GameCanvas.module.css";

const CELL_SIZE = 24;

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const state = createInitialGameState();
    const theme = LEVEL_THEMES[1];
    const input = createKeyboardDirectionInput();

    canvas.width = state.map.cols * CELL_SIZE;
    canvas.height = state.map.rows * CELL_SIZE;

    const update = (dt: number) => {
      updateGameState(state, dt, input.getDirection());
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
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}

