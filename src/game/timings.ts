// Duraciones de las esperas de la partida (decisiones 52 y 59): forman parte de la configuración
// para que las pruebas puedan ponerlas en 0.

export interface GameTimings {
  /** Cuenta "3, 2, 1, ¡ya!" al cargar cada nivel. */
  countdownSeconds: number;
  /** "¡Listo!" después de perder una vida (o de una derrota de Pacman en modo GhostMan). */
  readySeconds: number;
}

/** Núcleo: sin esperas, así las suites de `scripts/verify/` no cambian sus tiempos. */
export const NO_WAIT_TIMINGS: GameTimings = { countdownSeconds: 0, readySeconds: 0 };

/** Navegador: 1 s por número y 0,5 s para "¡ya!" (3,5 s); "¡Listo!" durante 2 s (sección 4.6). */
export const STANDARD_TIMINGS: GameTimings = { countdownSeconds: 3.5, readySeconds: 2 };

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

/** Texto a mostrar: "3", "2", "1" y "¡ya!" en los últimos 0,5 s, o "¡Listo!". */
export function countdownLabel(countdown: Countdown | null): string | null {
  if (!countdown) return null;
  if (countdown.kind === "ready") return "¡Listo!";
  if (countdown.timeLeft > 2.5) return "3";
  if (countdown.timeLeft > 1.5) return "2";
  if (countdown.timeLeft > 0.5) return "1";
  return "¡ya!";
}
