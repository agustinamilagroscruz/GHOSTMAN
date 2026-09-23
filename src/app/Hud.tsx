import styles from "./Hud.module.css";

interface HudProps {
  score: number;
  pelletsRemaining: number;
}

export function Hud({ score, pelletsRemaining }: HudProps) {
  return (
    <div className={styles.hud}>
      <span>Puntaje: {score}</span>
      <span>Esferas: {pelletsRemaining}</span>
    </div>
  );
}
