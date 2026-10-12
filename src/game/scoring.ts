// Reglas de puntaje: sección 4.2 (modo Pacman) y sección 4.4 de la V2 (modo GhostMan).
// Todo punto que se suma pasa por `addPoints`, así el desglose final siempre suma exactamente el total.

export type ScoreCategory =
  | "pellets"
  | "ghosts"
  | "fruits"
  | "timeBonus"
  | "livesBonus"
  | "pacmanDefeats"
  | "pelletsLeft";

export type ScoreBreakdown = Record<ScoreCategory, number>;

/** Categorías que suman en cada modo; las del otro modo nunca reciben puntos. */
export const MODE_SCORE_CATEGORIES = {
  pacman: ["pellets", "ghosts", "fruits", "timeBonus", "livesBonus"],
  ghostman: ["pacmanDefeats", "pelletsLeft"],
} as const satisfies Record<string, readonly ScoreCategory[]>;

export const COMMON_PELLET_POINTS = 10;
export const POWER_PELLET_POINTS = 50;
export const FRUIT_POINTS = 100;
export const TIME_BONUS_POINTS_PER_SECOND = 10;
export const LIFE_BONUS_POINTS = 500;
/** Modo GhostMan: derrota de Pacman producida por el fantasma del jugador. */
export const PACMAN_DEFEAT_POINTS = 500;
/** Modo GhostMan: por cada esfera (común o grande) sin consumir al completar el nivel. */
export const PELLET_LEFT_POINTS = 10;

/** Tiempo objetivo por nivel, en segundos (sección 4.2). */
export const LEVEL_TARGET_SECONDS: Readonly<Record<number, number>> = {
  1: 120,
  2: 150,
  3: 180,
};

export function createScoreBreakdown(): ScoreBreakdown {
  return { pellets: 0, ghosts: 0, fruits: 0, timeBonus: 0, livesBonus: 0, pacmanDefeats: 0, pelletsLeft: 0 };
}

export function sumBreakdown(breakdown: ScoreBreakdown): number {
  return Object.values(breakdown).reduce((total, points) => total + points, 0);
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
