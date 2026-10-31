import type { GhostKind } from "./ghosts";
import { DIRECTION_VECTORS, type Direction } from "./movement";
import type { GameMap } from "./types";
import type { LevelTheme } from "./theme";

/**
 * Escala del original (decisión 68): la celda lógica equivale a 8 px y los personajes miden unas
 * 2 celdas. Los muros no se dibujan como bloques: cada bloque de muro se dibuja como un tubo que
 * recorre su contorno por el centro de sus celdas, con las esquinas redondeadas.
 */
const WALL_TUBE_WIDTH = 0.5;
const WALL_TUBE_CORE_WIDTH = 0.2;
/** Radio de Pacman y de los fantasmas, en celdas: unos 13 px de 16 a la escala del original. */
export const SPRITE_RADIUS = 0.8;

export function renderMap(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  theme: LevelTheme,
  cellSize: number
): void {
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, map.cols * cellSize, map.rows * cellSize);

  const walls = buildWallPath(map, cellSize);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = theme.wallOutline;
  ctx.lineWidth = cellSize * WALL_TUBE_WIDTH;
  ctx.stroke(walls);
  ctx.strokeStyle = theme.wallStripe ?? theme.wallFill;
  ctx.lineWidth = cellSize * WALL_TUBE_CORE_WIDTH;
  ctx.stroke(walls);
  ctx.restore();

  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const x = col * cellSize;
      const y = row * cellSize;

      if (map.cells[row][col] === "door") {
        drawDoorCell(ctx, x, y, cellSize);
        continue;
      }

      const pellet = map.pellets[row][col];
      if (pellet === "pellet") {
        drawDot(ctx, x, y, cellSize, theme.pathDot, cellSize * 0.14);
      } else if (pellet === "power") {
        drawDot(ctx, x, y, cellSize, theme.pathDot, cellSize * 0.45);
      }
    }
  }
}

const SIDES: readonly Direction[] = ["up", "right", "down", "left"];

/** Fuera del mapa cuenta como muro: el borde no dibuja contorno hacia afuera. */
function isWallAt(map: GameMap, row: number, col: number): boolean {
  if (row < 0 || row >= map.rows || col < 0 || col >= map.cols) return true;
  return map.cells[row][col] === "wall";
}

/**
 * Dos celdas de muro vecinas se unen con un tramo del contorno solo si junto al tramo hay algo
 * que no es muro; así el interior de un bloque grueso queda vacío y un muro de una celda de
 * espesor se ve como una sola línea.
 */
function isWallEdge(map: GameMap, row: number, col: number, side: Direction): boolean {
  const [dRow, dCol] = DIRECTION_VECTORS[side];
  if (map.cells[row + dRow]?.[col + dCol] !== "wall") return false;
  // Las cuatro celdas que flanquean el tramo, dos de cada lado.
  const [pRow, pCol] = [dCol, dRow];
  for (const sign of [-1, 1]) {
    if (!isWallAt(map, row + sign * pRow, col + sign * pCol)) return true;
    if (!isWallAt(map, row + dRow + sign * pRow, col + dCol + sign * pCol)) return true;
  }
  return false;
}

/** Lados de una celda de muro por los que pasa el contorno; vacío si no es muro o es interior a un bloque. */
export function wallOutlineSides(map: GameMap, row: number, col: number): Direction[] {
  if (map.cells[row]?.[col] !== "wall") return [];
  return SIDES.filter((side) => isWallEdge(map, row, col, side));
}

/** Celda de muro que toca un pasillo, también en diagonal: si no tiene tramos, es un pilar suelto. */
function touchesPath(map: GameMap, row: number, col: number): boolean {
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (!isWallAt(map, row + dRow, col + dCol)) return true;
    }
  }
  return false;
}

function buildWallPath(map: GameMap, cellSize: number): Path2D {
  const path = new Path2D();
  const half = cellSize / 2;
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      if (map.cells[row][col] !== "wall") continue;
      const centerX = col * cellSize + half;
      const centerY = row * cellSize + half;
      const sides = wallOutlineSides(map, row, col);
      const edgePoint = (side: Direction): [number, number] => {
        const [dRow, dCol] = DIRECTION_VECTORS[side];
        return [centerX + dCol * half, centerY + dRow * half];
      };
      const isCorner = sides.length === 2 && DIRECTION_VECTORS[sides[0]][0] !== DIRECTION_VECTORS[sides[1]][0];
      if (isCorner) {
        // Esquina redondeada: un cuarto de curva de un borde al otro, pasando cerca del centro.
        path.moveTo(...edgePoint(sides[0]));
        path.quadraticCurveTo(centerX, centerY, ...edgePoint(sides[1]));
      } else if (sides.length > 0) {
        for (const side of sides) {
          path.moveTo(centerX, centerY);
          path.lineTo(...edgePoint(side));
        }
      } else if (touchesPath(map, row, col)) {
        path.moveTo(centerX, centerY);
        path.lineTo(centerX, centerY);
      }
    }
  }
  return path;
}

const DOOR_COLOR = "#ffb8ff";

/** Puerta de la base de los fantasmas (HU-44): una barra fina, como en el original. */
function drawDoorCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = DOOR_COLOR;
  ctx.fillRect(x, y + size * 0.42, size, size * 0.16);
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
  const radius = cellSize * SPRITE_RADIUS;
  const facing = FACING_ANGLE[direction ?? "right"];

  ctx.fillStyle = PACMAN_COLOR;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, facing + MOUTH_HALF_ANGLE, facing - MOUTH_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
}

const VULNERABLE_COLOR = "#2121de";
const VULNERABLE_FLASH_COLOR = "#ffffff";
const BLINK_PERIOD_SECONDS = 0.2;

/** Fase del parpadeo derivada del temporizador del PowerUp (se congela si el juego se detiene). */
export function isBlinkOn(powerUpTimer: number): boolean {
  return Math.floor(powerUpTimer / BLINK_PERIOD_SECONDS) % 2 === 0;
}

export interface GhostAppearance {
  color: string;
  /**
   * Espectro: cuerpo translúcido con contorno blanco. Saltarín, naval y acelerado: una marca
   * blanca bajo los ojos (chevron, onda y doble chevron). El clásico no lleva marca.
   */
  kind: GhostKind;
  /** Espectro que acaba de atravesar un muro y no puede comer (3 s): casi transparente y contorno punteado. */
  isHarmless: boolean;
  isVulnerable: boolean;
  isWarning: boolean;
  blinkOn: boolean;
}

export function renderGhost(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  cellSize: number,
  appearance: GhostAppearance
): void {
  const { color, kind, isHarmless, isVulnerable, isWarning, blinkOn } = appearance;
  const isSpecter = kind === "specter";
  const centerX = col * cellSize + cellSize / 2;
  const centerY = row * cellSize + cellSize / 2;
  const radius = cellSize * SPRITE_RADIUS;
  const domeCenterY = centerY - radius * 0.15;
  const bottomY = centerY + radius;
  const left = centerX - radius;
  const right = centerX + radius;

  if (isVulnerable) {
    // El parpadeo alterna blanco / azul vulnerable; el blanco no existe en ningún
    // otro diseño, así que se distingue del vulnerable estable y del normal.
    ctx.fillStyle = isWarning && blinkOn ? VULNERABLE_FLASH_COLOR : VULNERABLE_COLOR;
  } else {
    ctx.fillStyle = color;
  }

  ctx.save();
  if (!isVulnerable && isSpecter) {
    ctx.globalAlpha = isHarmless ? 0.25 : 0.6;
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

  if (!isVulnerable && isSpecter) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = isHarmless ? "#9a9a9a" : "#ffffff";
    ctx.lineWidth = Math.max(1, cellSize * 0.07);
    ctx.setLineDash(isHarmless ? [cellSize * 0.12, cellSize * 0.1] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  if (!isVulnerable) {
    drawKindMark(ctx, kind, centerX, centerY + radius * 0.35, radius);
  }

  const eyeOffsetX = radius * (isVulnerable ? 0.3 : 0.4);
  const eyeRadius = radius * (isVulnerable ? 0.18 : 0.22);
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

/** Marca de tipo bajo los ojos: el vulnerable no la lleva, todos se ven iguales. */
function drawKindMark(ctx: CanvasRenderingContext2D, kind: GhostKind, x: number, y: number, radius: number): void {
  const w = radius * 0.5;
  const h = radius * 0.25;
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, radius * 0.14);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  switch (kind) {
    case "jumper": // chevron hacia arriba: salto
      ctx.moveTo(x - w, y + h);
      ctx.lineTo(x, y - h);
      ctx.lineTo(x + w, y + h);
      break;
    case "naval": // onda: agua
      ctx.moveTo(x - w, y);
      ctx.quadraticCurveTo(x - w / 2, y - 2 * h, x, y);
      ctx.quadraticCurveTo(x + w / 2, y + 2 * h, x + w, y);
      break;
    case "accelerated": // doble chevron hacia adelante: velocidad
      for (const offset of [-w * 0.45, w * 0.45]) {
        ctx.moveTo(x + offset - w * 0.35, y - h);
        ctx.lineTo(x + offset + w * 0.25, y);
        ctx.lineTo(x + offset - w * 0.35, y + h);
      }
      break;
    default:
      ctx.restore();
      return;
  }
  ctx.stroke();
  ctx.restore();
}

/** Fruta (cereza): dos frutos rojos con tallo verde, distinta de esferas y personajes. */
export function renderFruit(ctx: CanvasRenderingContext2D, row: number, col: number, cellSize: number): void {
  ctx.save();
  scaleAroundCell(ctx, row, col, cellSize);
  const x = col * cellSize;
  const y = row * cellSize;
  const r = cellSize * 0.18;

  ctx.strokeStyle = "#3fbf3f";
  ctx.lineWidth = Math.max(1, cellSize * 0.07);
  ctx.beginPath();
  ctx.moveTo(x + cellSize * 0.32, y + cellSize * 0.62);
  ctx.quadraticCurveTo(x + cellSize * 0.5, y + cellSize * 0.2, x + cellSize * 0.7, y + cellSize * 0.18);
  ctx.moveTo(x + cellSize * 0.66, y + cellSize * 0.64);
  ctx.lineTo(x + cellSize * 0.7, y + cellSize * 0.18);
  ctx.stroke();

  ctx.fillStyle = "#e0102f";
  for (const [cx, cy] of [
    [0.32, 0.68],
    [0.66, 0.7],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x + cellSize * cx, y + cellSize * cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Las frutas se dibujan en una celda y se agrandan alrededor de su centro, como los personajes. */
const FRUIT_SCALE = 1.7;

function scaleAroundCell(ctx: CanvasRenderingContext2D, row: number, col: number, cellSize: number): void {
  const centerX = col * cellSize + cellSize / 2;
  const centerY = row * cellSize + cellSize / 2;
  ctx.translate(centerX, centerY);
  ctx.scale(FRUIT_SCALE, FRUIT_SCALE);
  ctx.translate(-centerX, -centerY);
}

const FAKE_FRUIT_COLOR = "#8a2be2";
const FAKE_FRUIT_ALARM_COLOR = "#ff2a2a";

/**
 * Fruta falsa del Naval: misma silueta de cereza que la real pero violeta, con tallo gris y
 * una cruz blanca, para que se distinga a simple vista (HU-30). En los últimos segundos antes
 * de explotar parpadea en rojo y muestra la cuenta regresiva.
 */
export function renderFakeFruit(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  cellSize: number,
  timeLeft: number,
  warningSeconds: number
): void {
  ctx.save();
  scaleAroundCell(ctx, row, col, cellSize);
  const x = col * cellSize;
  const y = row * cellSize;
  const r = cellSize * 0.18;
  const warning = timeLeft <= warningSeconds;
  const alarmOn = warning && Math.floor(timeLeft / 0.25) % 2 === 0;

  ctx.strokeStyle = "#9a9a9a";
  ctx.lineWidth = Math.max(1, cellSize * 0.07);
  ctx.beginPath();
  ctx.moveTo(x + cellSize * 0.32, y + cellSize * 0.62);
  ctx.quadraticCurveTo(x + cellSize * 0.5, y + cellSize * 0.2, x + cellSize * 0.7, y + cellSize * 0.18);
  ctx.moveTo(x + cellSize * 0.66, y + cellSize * 0.64);
  ctx.lineTo(x + cellSize * 0.7, y + cellSize * 0.18);
  ctx.stroke();

  for (const [cx, cy] of [
    [0.32, 0.68],
    [0.66, 0.7],
  ] as const) {
    const px = x + cellSize * cx;
    const py = y + cellSize * cy;
    ctx.fillStyle = alarmOn ? FAKE_FRUIT_ALARM_COLOR : FAKE_FRUIT_COLOR;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1, cellSize * 0.05);
    ctx.beginPath();
    ctx.moveTo(px - r * 0.5, py - r * 0.5);
    ctx.lineTo(px + r * 0.5, py + r * 0.5);
    ctx.moveTo(px + r * 0.5, py - r * 0.5);
    ctx.lineTo(px - r * 0.5, py + r * 0.5);
    ctx.stroke();
  }

  if (warning) {
    ctx.fillStyle = "#f8e34d";
    ctx.font = `bold ${Math.round(cellSize * 0.5)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(Math.ceil(timeLeft)), x + cellSize * 0.5, y - cellSize * 0.15);
  }
  ctx.restore();
}

/** Explosión de una fruta falsa: las celdas alcanzadas se tiñen de naranja y se desvanecen. */
export function renderExplosion(
  ctx: CanvasRenderingContext2D,
  cells: ReadonlyArray<{ row: number; col: number }>,
  cellSize: number,
  fade: number
): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, fade)) * 0.75;
  ctx.fillStyle = "#ff8c1a";
  for (const cell of cells) {
    ctx.fillRect(cell.col * cellSize + 1, cell.row * cellSize + 1, cellSize - 2, cellSize - 2);
  }
  ctx.restore();
}

/**
 * Pared destruida por Pacman (modo GhostMan, HU-33): destello blanco que se apaga con
 * escombros en las esquinas de la celda durante 0,5 s. `fade` va de 1 (recién destruida) a 0.
 */
export function renderWallFlash(ctx: CanvasRenderingContext2D, row: number, col: number, cellSize: number, fade: number): void {
  const f = Math.max(0, Math.min(1, fade));
  const x = col * cellSize;
  const y = row * cellSize;
  ctx.save();
  ctx.globalAlpha = f * 0.85;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  ctx.globalAlpha = f;
  ctx.fillStyle = "#c8c8c8";
  const piece = cellSize * 0.18;
  const spread = (1 - f) * cellSize * 0.35;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    ctx.fillRect(x + cellSize / 2 + dx * (cellSize * 0.2 + spread) - piece / 2, y + cellSize / 2 + dy * (cellSize * 0.2 + spread) - piece / 2, piece, piece);
  }
  ctx.restore();
}

/** Ojos de un fantasma comido que vuelve a la base (decisión 46): sin cuerpo, mirando hacia donde va. */
export function renderGhostEyes(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  cellSize: number,
  direction: Direction | null
): void {
  const centerX = col * cellSize + cellSize / 2;
  const centerY = row * cellSize + cellSize / 2;
  const radius = cellSize * SPRITE_RADIUS;
  const eyeOffsetX = radius * 0.4;
  const eyeRadius = radius * 0.24;
  const [lookRow, lookCol] = direction ? DIRECTION_LOOK[direction] : [0, 0];
  for (const side of [-1, 1]) {
    const eyeX = centerX + side * eyeOffsetX;
    const eyeY = centerY - radius * 0.15;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2121de";
    ctx.beginPath();
    ctx.arc(eyeX + lookCol * eyeRadius * 0.45, eyeY + lookRow * eyeRadius * 0.45, eyeRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

const DIRECTION_LOOK: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

/**
 * Dibuja un personaje a mitad del túnel en los dos bordes (decisión 50): la copia que queda fuera
 * del canvas se recorta sola, así que se ve una parte en cada borde y nada pisa el HUD.
 */
export function drawWrapped(cols: number, col: number, draw: (col: number) => void): void {
  // El sprite sobresale de su celda: la copia hace falta apenas toca el borde.
  const overhang = SPRITE_RADIUS - 0.5;
  draw(col);
  if (col > cols - 1 - overhang) draw(col - cols);
  else if (col < overhang) draw(col + cols);
}
