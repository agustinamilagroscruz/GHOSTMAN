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
  /** true si se presionó la barra espaciadora desde la última consulta (y la olvida). */
  consumePowerPress(): boolean;
  /** Olvida la última dirección pedida (al reiniciar posiciones o cambiar de nivel). */
  reset(): void;
  dispose(): void;
}

export function createKeyboardDirectionInput(options: KeyboardInputOptions = {}): KeyboardDirectionInput {
  let currentDirection: Direction | null = null;
  let powerPressed = false;

  const handleKeyDown = (event: KeyboardEvent) => {
    // Barra espaciadora: poder del fantasma (modo GhostMan). En modo Pacman el estado del juego
    // la ignora. Nunca scrollea la página, y mantenerla apretada no repite la activación.
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat && !options.isPaused?.()) powerPressed = true;
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
    consumePowerPress: () => {
      const pressed = powerPressed;
      powerPressed = false;
      return pressed;
    },
    reset: () => {
      currentDirection = null;
      powerPressed = false;
    },
    dispose: () => window.removeEventListener("keydown", handleKeyDown),
  };
}
