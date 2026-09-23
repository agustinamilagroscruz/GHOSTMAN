"use client";

import { useEffect, useRef } from "react";
import { createLevel1Map } from "../game/maps/level1";
import { LEVEL_THEMES } from "../game/theme";
import { renderMap } from "../game/render";
import { startGameLoop } from "../game/loop";
import styles from "./GameCanvas.module.css";

const CELL_SIZE = 24;

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const map = createLevel1Map();
    const theme = LEVEL_THEMES[1];

    canvas.width = map.cols * CELL_SIZE;
    canvas.height = map.rows * CELL_SIZE;

    const render = () => renderMap(ctx, map, theme, CELL_SIZE);
    const update = () => {
      // El estado del juego (personajes, colisiones) se incorpora en los próximos incrementos.
    };

    const loop = startGameLoop(update, render);
    return () => loop.stop();
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
