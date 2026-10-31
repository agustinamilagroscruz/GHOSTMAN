// Duraciones de las esperas de la partida (decisiones 52 y 59): forman parte de la configuración
// para que las pruebas puedan ponerlas en 0.

export interface GameTimings {
  /** Cuenta "3, 2, 1, ¡ya!" al cargar cada nivel. */
  countdownSeconds: number;
  /** "¡Listo!" después de perder una vida (o de una derrota de Pacman en modo GhostMan). */
  readySeconds: number;
  /** Derrota de Pacman (decisión 53): todo congelado con los fantasmas visibles. */
  deathFreezeSeconds: number;
  /** Derrota de Pacman: sin fantasmas, Pacman se desarma. */
  deathSeconds: number;
}

/** Núcleo: sin esperas, así las suites de `scripts/verify/` no cambian sus tiempos. */
export const NO_WAIT_TIMINGS: GameTimings = { countdownSeconds: 0, readySeconds: 0, deathFreezeSeconds: 0, deathSeconds: 0 };

/**
 * Navegador: 1 s por número y 0,5 s para "¡ya!" (3,5 s); "¡Listo!" durante 2 s; derrota de Pacman
 * de 0,5 s congelado más 1,5 s de animación (sección 4.6).
 */
export const STANDARD_TIMINGS: GameTimings = { countdownSeconds: 3.5, readySeconds: 2, deathFreezeSeconds: 0.5, deathSeconds: 1.5 };

/**
 * Modo de prueba (sección 4.9): `?modoPrueba=1` elimina las esperas, pero solo en un build de
 * prueba (`testModeAllowed`); en el despliegue de Vercel el parámetro se ignora.
 */
export function isTestMode(search: string, testModeAllowed: boolean): boolean {
  return testModeAllowed && new URLSearchParams(search).get("modoPrueba") === "1";
}

export function resolveTimings(search: string, testModeAllowed: boolean): GameTimings {
  return isTestMode(search, testModeAllowed) ? NO_WAIT_TIMINGS : STANDARD_TIMINGS;
}

export type CountdownKind = "start" | "ready";

export interface Countdown {
  kind: CountdownKind;
  /** Segundos que faltan; la cuenta termina al llegar a 0. */
  timeLeft: number;
}

/** Qué pasa al terminar la animación de derrota de Pacman. */
export type AfterPacmanDeath = "ready" | "gameOver" | "levelComplete";

export interface PacmanDeath {
  /** Segundos desde que lo alcanzaron. */
  elapsed: number;
  freezeSeconds: number;
  animationSeconds: number;
  after: AfterPacmanDeath;
}

/**
 * Cuadro de la derrota para dibujar: null durante el congelamiento (se ve todo como estaba); si
 * no, de 0 a frames - 1 a lo largo de la animación.
 */
export function pacmanDeathFrame(death: PacmanDeath, frames: number): number | null {
  if (death.elapsed < death.freezeSeconds) return null;
  const t = (death.elapsed - death.freezeSeconds) / death.animationSeconds;
  return Math.min(frames - 1, Math.floor(t * frames));
}

/** Texto a mostrar: "3", "2", "1" y "¡ya!" en los últimos 0,5 s, o "¡Listo!". */
export function countdownLabel(countdown: Countdown | null): string | null {
  if (!countdown) return null;
  if (countdown.kind === "ready") return "¡Listo!";
  if (countdown.timeLeft > 2.5) return "3";
  if (countdown.timeLeft > 1.5) return "2";
  if (countdown.timeLeft > 0.5) return "1";
  return "¡ya!";
}
