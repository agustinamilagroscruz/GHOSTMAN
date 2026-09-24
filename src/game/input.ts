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

export interface KeyboardInputOptions {
  /** ESC: pausa / reanuda. */
  onTogglePause?: () => void;
  /** Mientras devuelva true, las teclas de movimiento se ignoran (no se recuerdan). */
  isPaused?: () => boolean;
}

export interface KeyboardDirectionInput {
  getDirection(): Direction | null;
  /** Olvida la última dirección pedida (al reiniciar posiciones o cambiar de nivel). */
  reset(): void;
  dispose(): void;
}

export function createKeyboardDirectionInput(options: KeyboardInputOptions = {}): KeyboardDirectionInput {
  let currentDirection: Direction | null = null;

  const handleKeyDown = (event: KeyboardEvent) => {
    // La barra espaciadora no tiene efecto en modo Pacman y no debe scrollear la página.
    if (event.code === "Space") {
      event.preventDefault();
      return;
    }

    if (event.code === "Escape") {
      event.preventDefault();
      if (!event.repeat) options.onTogglePause?.();
      return;
    }

    const direction = DIRECTION_BY_KEY[event.code];
    if (!direction) return;

    event.preventDefault();
    if (options.isPaused?.()) return; // en pausa el movimiento no tiene efecto
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
