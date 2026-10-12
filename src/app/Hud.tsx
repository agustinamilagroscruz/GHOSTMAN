import type { GameMode } from "../game/state";
import styles from "./Hud.module.css";

interface HudProps {
  score: number;
  pelletsRemaining: number;
  lives?: number;
  level?: number;
  /** El ícono del contador de vidas identifica el modo en curso (HU-22). */
  mode?: GameMode;
  powerUpActive?: boolean;
  powerUpTimer?: number;
}

export function Hud({
  score,
  pelletsRemaining,
  lives = 3,
  level = 1,
  mode = "pacman",
  powerUpActive = false,
  powerUpTimer = 0,
}: HudProps) {
  const lifeIcon = mode === "ghostman" ? "👻" : "🟡";
  const lifeIcons = Array.from({ length: lives }, (_, i) => (
    <span key={i} className={styles.lifeIcon} data-testid="life-icon">
      {lifeIcon}
    </span>
  ));

  return (
    <div className={styles.hud}>
      <span data-testid="hud-level">Nivel {level}</span>
      <span>Puntaje: {score}</span>
      <span>Esferas: {pelletsRemaining}</span>
      <div className={styles.livesContainer}>
        {lifeIcons}
        {powerUpActive && (
          <span className={styles.powerUpTimer}>
            {powerUpTimer <= 2 ? "⚡" : "✨"} {powerUpTimer.toFixed(1)}s
          </span>
        )}
      </div>
    </div>
  );
}
