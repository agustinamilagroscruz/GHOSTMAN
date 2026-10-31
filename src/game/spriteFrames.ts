import type { GhostKind } from "./ghosts";
import type { Direction } from "./movement";
import type { SpriteName } from "./sprites";

// Qué cuadro de cada sprite se dibuja (decisión 58). Depende solo de la posición, así que la
// animación se detiene sola con la pausa, la cuenta regresiva o un personaje quieto.

/** Cuadros de la boca a lo largo de una celda: abierta, entreabierta, cerrada, entreabierta. */
const MOUTH_CYCLE = [2, 1, 0, 1] as const;

const positiveMod = (value: number, n: number) => ((value % n) + n) % n;

export function pacmanSpriteName(direction: Direction | null, row: number, col: number): SpriteName {
  // Quieto (al empezar, contra un muro) se ve con la boca entreabierta mirando a la derecha.
  const frame = direction ? MOUTH_CYCLE[positiveMod(Math.floor((row + col) * 4), 4)] : 1;
  return `pacman_${direction ?? "right"}_${frame}` as SpriteName;
}

/** La pollera cambia cada media celda recorrida. */
export function ghostSpriteName(kind: GhostKind, vulnerable: boolean, row: number, col: number): SpriteName {
  const frame = positiveMod(Math.floor((row + col) * 2), 2);
  return `ghost_${vulnerable ? "vulnerable" : kind}_${frame}` as SpriteName;
}

export function eyesSpriteName(direction: Direction | null): SpriteName {
  return `eyes_${direction ?? "left"}` as SpriteName;
}

/** Las líneas de velocidad del acelerado quedan detrás: se refleja cuando va hacia la izquierda. */
export function isGhostSpriteFlipped(kind: GhostKind, vulnerable: boolean, direction: Direction | null): boolean {
  return kind === "accelerated" && !vulnerable && direction === "left";
}
