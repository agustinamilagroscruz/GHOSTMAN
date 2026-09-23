// Sistema simple de partículas para celebrar la finalización del nivel.

interface Particle {
  row: number;
  col: number;
  velRow: number;
  velCol: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface FireworksState {
  particles: Particle[];
}

const COLORS = ["#f8e34d", "#c81e2c", "#38f0e8", "#ffffff", "#7cfc00"];
const GRAVITY = 2.5; // celdas por segundo^2
const PARTICLES_PER_BURST = 24;

export function createFireworksState(): FireworksState {
  return { particles: [] };
}

export function spawnFireworkBurst(state: FireworksState, centerRow: number, centerCol: number): void {
  for (let i = 0; i < PARTICLES_PER_BURST; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLES_PER_BURST + Math.random() * 0.3;
    const speed = 3 + Math.random() * 3;
    const maxLife = 0.6 + Math.random() * 0.4;
    state.particles.push({
      row: centerRow,
      col: centerCol,
      velRow: Math.sin(angle) * speed,
      velCol: Math.cos(angle) * speed,
      life: maxLife,
      maxLife,
      color: COLORS[i % COLORS.length],
    });
  }
}

export function updateFireworks(state: FireworksState, deltaSeconds: number): void {
  for (const particle of state.particles) {
    particle.row += particle.velRow * deltaSeconds;
    particle.col += particle.velCol * deltaSeconds;
    particle.velRow += GRAVITY * deltaSeconds;
    particle.life -= deltaSeconds;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

export function renderFireworks(
  ctx: CanvasRenderingContext2D,
  state: FireworksState,
  cellSize: number
): void {
  for (const particle of state.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(
      particle.col * cellSize + cellSize / 2,
      particle.row * cellSize + cellSize / 2,
      cellSize * 0.14,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
