import type { ScoreBreakdown } from "../game/scoring";
import type { GameMode } from "../game/state";
import styles from "./GameCanvas.module.css";

interface ScoreBreakdownViewProps {
  total: number;
  breakdown: ScoreBreakdown;
  mode: GameMode;
}

/** Categorías del desglose de cada modo: sección 4.2 (Pacman) y sección 4.4 de la V2 (GhostMan). */
const ROWS: Readonly<Record<GameMode, ReadonlyArray<readonly [keyof ScoreBreakdown, string]>>> = {
  pacman: [
    ["pellets", "Esferas"],
    ["ghosts", "Fantasmas comidos"],
    ["fruits", "Frutas"],
    ["timeBonus", "Bonus por tiempo"],
    ["livesBonus", "Bonus por vidas"],
  ],
  ghostman: [
    ["pacmanDefeats", "Derrotas de Pacman"],
    ["pelletsLeft", "Esferas sin consumir"],
  ],
};

/** Puntaje final con su desglose (HU-13). Cada componente sale del mismo acumulador que el total. */
export function ScoreBreakdownView({ total, breakdown, mode }: ScoreBreakdownViewProps) {
  return (
    <table className={styles.breakdown} data-testid="score-breakdown">
      <tbody>
        {ROWS[mode].map(([key, label]) => (
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
