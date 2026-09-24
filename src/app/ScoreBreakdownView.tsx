import type { ScoreBreakdown } from "../game/scoring";
import styles from "./GameCanvas.module.css";

interface ScoreBreakdownViewProps {
  total: number;
  breakdown: ScoreBreakdown;
}

const ROWS: ReadonlyArray<readonly [keyof ScoreBreakdown, string]> = [
  ["pellets", "Esferas"],
  ["ghosts", "Fantasmas comidos"],
  ["fruits", "Frutas"],
  ["timeBonus", "Bonus por tiempo"],
  ["livesBonus", "Bonus por vidas"],
];

/** Puntaje final con su desglose (HU-13). Cada componente sale del mismo acumulador que el total. */
export function ScoreBreakdownView({ total, breakdown }: ScoreBreakdownViewProps) {
  return (
    <table className={styles.breakdown} data-testid="score-breakdown">
      <tbody>
        {ROWS.map(([key, label]) => (
          <tr key={key}>
            <td>{label}</td>
            <td data-testid={`breakdown-${key}`}>{breakdown[key]}</td>
          </tr>
        ))}
        <tr className={styles.breakdownTotal}>
          <td>Total</td>
          <td data-testid="final-score">{total}</td>
        </tr>
      </tbody>
    </table>
  );
}
