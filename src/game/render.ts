import type { Direction } from "./movement";
import type { GameMap } from "./types";
import type { LevelTheme } from "./theme";

export function renderMap(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  theme: LevelTheme,
  cellSize: number
): void {
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, map.cols * cellSize, map.rows * cellSize);

  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const x = col * cellSize;
      const y = row * cellSize;

      if (map.cells[row][col] === "wall") {
        drawWallCell(ctx, x, y, cellSize, theme);
        continue;
      }

      const pellet = map.pellets[row][col];
      if (pellet === "pellet") {
        drawDot(ctx, x, y, cellSize, theme.pathDot, cellSize * 0.12);
      } else if (pellet === "power") {
        drawDot(ctx, x, y, cellSize, theme.pathDot, cellSize * 0.28);
      }
    }
  }
}

function drawWallCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  theme: LevelTheme
): void {
  ctx.fillStyle = theme.wallFill;
  ctx.fillRect(x, y, size, size);

  ctx.strokeStyle = theme.wallStripe;
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.8);
  ctx.lineTo(x + size * 0.8, y + size * 0.2);
  ctx.stroke();

  ctx.strokeStyle = theme.wallOutline;
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  radius: number
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, radius, 0, Math.PI * 2);
  ctx.fill();
}

const PACMAN_COLOR = "#f8e34d";
const MOUTH_HALF_ANGLE = Math.PI / 5;

const FACING_ANGLE: Readonly<Record<Direction, number>> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

export function renderPacman(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  cellSize: number,
  direction: Direction | null
): void {
  const centerX = col * cellSize + cellSize / 2;
  const centerY = row * cellSize + cellSize / 2;
  const radius = cellSize * 0.45;
  const facing = FACING_ANGLE[direction ?? "right"];

  ctx.fillStyle = PACMAN_COLOR;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, facing + MOUTH_HALF_ANGLE, facing - MOUTH_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
}

export function renderGhost(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  cellSize: number,
  color: string,
  isVulnerable = false,
  isWarning = false
): void {
  const centerX = col * cellSize + cellSize / 2;
  const centerY = row * cellSize + cellSize / 2;
  const radius = cellSize * 0.45;
  const domeCenterY = centerY - radius * 0.15;
  const bottomY = centerY + radius;
  const left = centerX - radius;
  const right = centerX + radius;

  if (isVulnerable) {
    ctx.fillStyle = isWarning ? (Math.floor(Date.now() / 200) % 2 === 0 ? "#ffffff" : "#0000ff") : "#0000ff";
  } else {
    ctx.fillStyle = color;
  }

  ctx.beginPath();
  ctx.arc(centerX, domeCenterY, radius, Math.PI, 0);
  ctx.lineTo(right, bottomY);

  const bumpCount = 4;
  const bumpWidth = (right - left) / bumpCount;
  for (let i = bumpCount; i >= 1; i--) {
    const bumpRight = left + i * bumpWidth;
    const bumpLeft = bumpRight - bumpWidth;
    ctx.lineTo((bumpLeft + bumpRight) / 2, bottomY - radius * 0.3);
    ctx.lineTo(bumpLeft, bottomY);
  }
  ctx.closePath();
  ctx.fill();

  if (!isVulnerable) {
    const eyeOffsetX = radius * 0.4;
    const eyeRadius = radius * 0.22;
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(centerX + side * eyeOffsetX, domeCenterY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#16164a";
      ctx.beginPath();
      ctx.arc(centerX + side * eyeOffsetX, domeCenterY, eyeRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const eyeOffsetX = radius * 0.3;
    const eyeRadius = radius * 0.18;
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(centerX + side * eyeOffsetX, domeCenterY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#16164a";
      ctx.beginPath();
      ctx.arc(centerX + side * eyeOffsetX, domeCenterY, eyeRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
