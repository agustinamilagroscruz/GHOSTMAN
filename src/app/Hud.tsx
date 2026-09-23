import styles from "./Hud.module.css";

interface HudProps {
  score: number;
  pelletsRemaining: number;
  lives?: number;
  powerUpActive?: boolean;
  powerUpTimer?: number;
}

export function Hud({ score, pelletsRemaining, lives = 3, powerUpActive = false, powerUpTimer = 0 }: HudProps) {
  const lifeIcons = Array.from({ length: lives }, (_, i) => (
    <span key={i} className={styles.lifeIcon}>🟡</span>
  ));

  return (
    <div className={styles.hud}>
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
