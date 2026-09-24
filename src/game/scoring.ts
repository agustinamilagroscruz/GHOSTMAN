// Reglas de puntaje de la sección 4.2. Todo punto que se suma pasa por `addPoints`,
// así el desglose final siempre suma exactamente el total.

export type ScoreCategory = "pellets" | "ghosts" | "fruits" | "timeBonus" | "livesBonus";

export type ScoreBreakdown = Record<ScoreCategory, number>;

export const COMMON_PELLET_POINTS = 10;
export const POWER_PELLET_POINTS = 50;
export const FRUIT_POINTS = 100;
export const TIME_BONUS_POINTS_PER_SECOND = 10;
export const LIFE_BONUS_POINTS = 500;

/** Tiempo objetivo por nivel, en segundos (sección 4.2). */
export const LEVEL_TARGET_SECONDS: Readonly<Record<number, number>> = {
  1: 120,
  2: 150,
  3: 180,
};

export function createScoreBreakdown(): ScoreBreakdown {
  return { pellets: 0, ghosts: 0, fruits: 0, timeBonus: 0, livesBonus: 0 };
}

export function sumBreakdown(breakdown: ScoreBreakdown): number {
  return (
    breakdown.pellets + breakdown.ghosts + breakdown.fruits + breakdown.timeBonus + breakdown.livesBonus
  );
}

/** 10 puntos por cada segundo entero restante; nunca negativo si se excede el objetivo. */
export function computeTimeBonus(level: number, elapsedSeconds: number): number {
  const target = LEVEL_TARGET_SECONDS[level] ?? 0;
  const remainingSeconds = Math.max(0, Math.floor(target - elapsedSeconds));
  return remainingSeconds * TIME_BONUS_POINTS_PER_SECOND;
}

/** 500 por vida restante, solo si la partida terminó en victoria. */
export function computeLivesBonus(lives: number, won: boolean): number {
  return won ? Math.max(0, lives) * LIFE_BONUS_POINTS : 0;
}
