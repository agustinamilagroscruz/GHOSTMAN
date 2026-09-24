import type { Direction } from "./movement";

// Lectura de teclado separada del estado del juego y del renderizado.

const DIRECTION_BY_KEY: Readonly<Record<string, Direction>> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

export interface KeyboardDirectionInput {
  getDirection(): Direction | null;
  /** Olvida la última dirección pedida (al reiniciar posiciones o cambiar de nivel). */
  reset(): void;
  dispose(): void;
}

export function createKeyboardDirectionInput(): KeyboardDirectionInput {
  let currentDirection: Direction | null = null;

  const handleKeyDown = (event: KeyboardEvent) => {
    // La barra espaciadora no tiene efecto en modo Pacman y no debe scrollear la página.
    if (event.code === "Space") {
      event.preventDefault();
      return;
    }

    const direction = DIRECTION_BY_KEY[event.code];
    if (!direction) return;

    event.preventDefault();
    currentDirection = direction;
  };

  window.addEventListener("keydown", handleKeyDown);

  return {
    getDirection: () => currentDirection,
    reset: () => {
      currentDirection = null;
    },
    dispose: () => window.removeEventListener("keydown", handleKeyDown),
  };
}
