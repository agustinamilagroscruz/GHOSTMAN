import styles from "./Hud.module.css";

interface HudProps {
  score: number;
  pelletsRemaining: number;
  levelComplete: boolean;
}

export function Hud({ score, pelletsRemaining, levelComplete }: HudProps) {
  return (
    <div className={styles.hud}>
      <span>Puntaje: {score}</span>
      <span>Esferas: {pelletsRemaining}</span>
      {levelComplete && <div className={styles.levelComplete}>¡Nivel completado!</div>}
    </div>
  );
}
