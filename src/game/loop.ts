// Bucle de juego con paso de simulación fijo (delta time estable), separado del renderizado.

export interface GameLoopHandle {
  stop: () => void;
}

const FIXED_STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250; // evita saltos grandes tras una pestaña inactiva

export function startGameLoop(
  update: (fixedDeltaSeconds: number) => void,
  render: () => void
): GameLoopHandle {
  let previousTime = performance.now();
  let accumulator = 0;
  let animationFrameId = 0;
  let running = true;

  const tick = (currentTime: number) => {
    if (!running) return;

    const elapsed = Math.min(currentTime - previousTime, MAX_FRAME_MS);
    previousTime = currentTime;
    accumulator += elapsed;

    while (accumulator >= FIXED_STEP_MS) {
      update(FIXED_STEP_MS / 1000);
      accumulator -= FIXED_STEP_MS;
    }

    render();
    animationFrameId = requestAnimationFrame(tick);
  };

  animationFrameId = requestAnimationFrame(tick);

  return {
    stop: () => {
      running = false;
      cancelAnimationFrame(animationFrameId);
    },
  };
}
