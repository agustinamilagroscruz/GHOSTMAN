import styles from "./Hud.module.css";

interface HudProps {
  score: number;
  pelletsRemaining: number;
  level?: number;
  powerUpActive?: boolean;
  powerUpTimer?: number;
}

/** Barra superior: nivel, puntaje, esferas y PowerUp. Las vidas van en la barra inferior (HU-09, DEF-001). */
export function Hud({
  score,
  pelletsRemaining,
  level = 1,
  powerUpActive = false,
  powerUpTimer = 0,
}: HudProps) {
  return (
    <div className={styles.hud}>
      <span data-testid="hud-level">Nivel {level}</span>
      <span>Puntaje: {score}</span>
      <span>Esferas: {pelletsRemaining}</span>
      <div className={styles.livesContainer}>
        {powerUpActive && (
          <span className={styles.powerUpTimer}>
            {powerUpTimer <= 2 ? "⚡" : "✨"} {powerUpTimer.toFixed(1)}s
          </span>
        )}
      </div>
    </div>
  );
}
