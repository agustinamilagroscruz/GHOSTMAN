import type { GhostId, GhostKind } from "./ghosts";
import { DIRECTION_VECTORS, type Direction } from "./movement";
import {
  DEFAULT_GHOST_SKIN,
  DEFAULT_PACMAN_SKIN,
  eyesPalette,
  ghostPalette,
  pacmanPalette,
  vulnerablePalette,
  type GhostSkin,
  type PacmanSkin,
  type RolePalette,
} from "./skins";
import { eyesSpriteName, ghostSpriteName, isGhostSpriteFlipped, pacmanSpriteName } from "./spriteFrames";
import { SPRITE_ROLE_COLORS, SPRITES, type SpriteData, type SpriteName } from "./sprites";
import type { GameMap } from "./types";
import type { LevelTheme } from "./theme";

/**
 * Escala del original (decisión 68): la celda lógica equivale a 8 px y los personajes miden unas
 * 2 celdas. Los muros no se dibujan como bloques: cada bloque de muro se dibuja como un tubo que
 * recorre su contorno por el centro de sus celdas, con las esquinas redondeadas.
 */
const WALL_TUBE_WIDTH = 0.5;
const WALL_TUBE_CORE_WIDTH = 0.2;
/** La celda lógica equivale a 8 px; los sprites son de 16 × 16 (decisiones 58 y 68). */
const LOGICAL_CELL_PX = 8;
/** Medio cuerpo de fantasma (14 px de alto): su parte de arriba queda 7 px sobre el centro de la celda. */
const GHOST_BODY_HALF_PX = 7;
/** Medio sprite de 16 px, en celdas: cuánto puede asomar un personaje fuera de su celda. */
export const SPRITE_RADIUS = 1;

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
      if (pellet !== "none") drawCentered(ctx, pellet === "power" ? "power_pellet" : "pellet", { f: theme.pathDot }, row, col, cellSize);
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

/** Escala de los sprites: píxeles de pantalla por píxel del sprite (la celda lógica es de 8 px). */
function pixelScale(cellSize: number): number {
  return cellSize / LOGICAL_CELL_PX;
}

const spriteCache = new Map<string, HTMLCanvasElement>();

/** Sprite pintado con una paleta de roles, en un canvas propio del tamaño del sprite (se cachea). */
function spriteCanvas(name: SpriteName, palette: RolePalette): HTMLCanvasElement {
  const key = `${name}|${JSON.stringify(palette)}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;
  const sprite: SpriteData = SPRITES[name];
  const canvas = document.createElement("canvas");
  canvas.width = sprite.w;
  canvas.height = sprite.h;
  const ctx = canvas.getContext("2d")!;
  sprite.rows.forEach((row, y) => {
    [...row].forEach((role, x) => {
      if (role === ".") return;
      ctx.fillStyle = palette[role] ?? SPRITE_ROLE_COLORS[role];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  spriteCache.set(key, canvas);
  return canvas;
}

/** Deformaciones de un sprite: ondulación por filas (espectro) y estiramiento (salto). */
export interface SpriteEffects {
  /** Fase de la ondulación: cada fila se corre de costado siguiendo un seno; null = sin ondular. */
  wave?: number | null;
  /** Escala horizontal y vertical alrededor del pie del sprite. */
  stretch?: { x: number; y: number };
}

/** Dibuja un sprite con su píxel (px, py) sobre el punto (x, y) de la pantalla. */
function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: SpriteName,
  palette: RolePalette,
  x: number,
  y: number,
  px: number,
  py: number,
  scale: number,
  flipX = false,
  effects: SpriteEffects = {}
): void {
  const sprite = SPRITES[name];
  const source = spriteCanvas(name, palette);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  if (effects.stretch) {
    const foot = (sprite.h - py) * scale;
    ctx.translate(0, foot);
    ctx.scale(effects.stretch.x, effects.stretch.y);
    ctx.translate(0, -foot);
  }
  if (flipX) ctx.scale(-1, 1);
  if (effects.wave == null) {
    ctx.drawImage(source, -px * scale, -py * scale, sprite.w * scale, sprite.h * scale);
  } else {
    for (let row = 0; row < sprite.h; row++) {
      const shift = Math.round(Math.sin(effects.wave + row * 0.9)) * scale;
      ctx.drawImage(source, 0, row, sprite.w, 1, -px * scale + shift, (row - py) * scale, sprite.w * scale, scale);
    }
  }
  ctx.restore();
}

/** Centrado en la celda (Pacman, frutas, esferas, efectos); `size` agranda o achica el sprite. */
function drawCentered(ctx: CanvasRenderingContext2D, name: SpriteName, palette: RolePalette, row: number, col: number, cellSize: number, size = 1): void {
  const sprite = SPRITES[name];
  drawSprite(ctx, name, palette, (col + 0.5) * cellSize, (row + 0.5) * cellSize, sprite.w / 2, sprite.h / 2, pixelScale(cellSize) * size);
}

/**
 * Cuerpo de fantasma y ojos: el ancla (centro y parte de arriba del cuerpo) se ubica de modo que
 * el cuerpo de 14 px quede centrado en la celda. Así los ojos calzan sobre cualquier tipo.
 */
function drawGhostPart(
  ctx: CanvasRenderingContext2D,
  name: SpriteName,
  palette: RolePalette,
  row: number,
  col: number,
  cellSize: number,
  flipX = false,
  effects: SpriteEffects = {}
): void {
  const sprite = SPRITES[name];
  const scale = pixelScale(cellSize);
  // Reflejado, el píxel del ancla sigue cayendo en el mismo punto de la pantalla.
  drawSprite(ctx, name, palette, (col + 0.5) * cellSize, (row + 0.5) * cellSize - GHOST_BODY_HALF_PX * scale, sprite.ax, sprite.ay, scale, flipX, effects);
}

export function renderPacman(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  cellSize: number,
  direction: Direction | null,
  skin: PacmanSkin = DEFAULT_PACMAN_SKIN
): void {
  drawCentered(ctx, pacmanSpriteName(direction, row, col), pacmanPalette(skin), row, col, cellSize);
}

const BLINK_PERIOD_SECONDS = 0.2;

/** Fase del parpadeo derivada del temporizador del PowerUp (se congela si el juego se detiene). */
export function isBlinkOn(powerUpTimer: number): boolean {
  return Math.floor(powerUpTimer / BLINK_PERIOD_SECONDS) % 2 === 0;
}

export interface GhostAppearance {
  id: GhostId;
  color: string;
  /** Tipo: cada uno tiene un rasgo de forma propio en su sprite (decisión 58). */
  kind: GhostKind;
  /** Hacia dónde mira: los ojos siguen la dirección de avance. */
  direction: Direction | null;
  /** Espectro que acaba de atravesar un muro y no puede comer (3 s): casi transparente. */
  isHarmless: boolean;
  isVulnerable: boolean;
  isWarning: boolean;
  blinkOn: boolean;
  skin?: GhostSkin;
  /** Espectro atravesando un muro: se ondula (decisión 56). */
  isPhasing?: boolean;
  /** Saltarín despegando o aterrizando: estiramiento (decisión 55). */
  stretch?: { x: number; y: number };
}

export function renderGhost(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  cellSize: number,
  appearance: GhostAppearance
): void {
  const { id, color, kind, direction, isHarmless, isVulnerable, isWarning, blinkOn } = appearance;
  const skin = appearance.skin ?? DEFAULT_GHOST_SKIN;
  const body = ghostSpriteName(kind, isVulnerable, row, col, direction);
  const effects: SpriteEffects = { stretch: appearance.stretch, wave: appearance.isPhasing ? (row + col) * 6 : null };
  ctx.save();
  // El espectro es translúcido (su rasgo, junto con el borde ondulado); más todavía si no puede comer.
  if (!isVulnerable && kind === "specter") ctx.globalAlpha *= isHarmless ? 0.3 : 0.65;
  if (isVulnerable) {
    // El parpadeo alterna blanco / azul vulnerable; tiene prioridad sobre la skin (decisión 58).
    drawGhostPart(ctx, body, vulnerablePalette(isWarning && blinkOn), row, col, cellSize, false, effects);
  } else {
    drawGhostPart(ctx, body, ghostPalette(skin, id, color), row, col, cellSize, isGhostSpriteFlipped(kind, false, direction), effects);
    drawGhostPart(ctx, eyesSpriteName(direction), eyesPalette(skin), row, col, cellSize, false, effects);
  }
  ctx.restore();
}

/** Fruta real: cereza (sus colores no dependen de la skin). */
export function renderFruit(ctx: CanvasRenderingContext2D, row: number, col: number, cellSize: number): void {
  drawCentered(ctx, "fruit", {}, row, col, cellSize);
}

/** Alarma de la fruta falsa: el violeta pasa a rojo. */
const FAKE_FRUIT_ALARM: RolePalette = { x: "#ff2a2a", X: "#a00000" };

/** La fruta falsa aparece creciendo, con destellos (decisión 56). */
const FAKE_FRUIT_APPEAR_SECONDS = 0.3;
/** Parpadea en rojo en sus últimos 2 s (decisión 56); la cuenta regresiva empieza antes (V2). */
const FAKE_FRUIT_BLINK_SECONDS = 2;

/**
 * Fruta falsa del Naval: misma silueta de cereza que la real pero violeta y con una cruz, para
 * que se distinga a simple vista (HU-30). Aparece con un destello, muestra la cuenta regresiva
 * en sus últimos `warningSeconds` y parpadea en rojo en los últimos 2.
 */
export function renderFakeFruit(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  cellSize: number,
  timeLeft: number,
  warningSeconds: number,
  age = FAKE_FRUIT_APPEAR_SECONDS
): void {
  const warning = timeLeft <= warningSeconds;
  const alarmOn = timeLeft <= FAKE_FRUIT_BLINK_SECONDS && Math.floor(timeLeft / 0.25) % 2 === 0;
  const appearing = age < FAKE_FRUIT_APPEAR_SECONDS;
  const growth = appearing ? 0.3 + (0.7 * age) / FAKE_FRUIT_APPEAR_SECONDS : 1;
  drawCentered(ctx, "fake_fruit", alarmOn ? FAKE_FRUIT_ALARM : {}, row, col, cellSize, growth);
  if (appearing) {
    const frame = Math.min(2, Math.floor((3 * age) / FAKE_FRUIT_APPEAR_SECONDS));
    drawCentered(ctx, `sparkle_${frame}` as SpriteName, {}, row, col, cellSize);
  }

  if (warning) {
    ctx.fillStyle = "#f8e34d";
    ctx.font = `bold ${Math.round(cellSize * 0.6)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(String(Math.ceil(timeLeft)), (col + 0.5) * cellSize, (row - 0.2) * cellSize);
  }
}

/** Explosión de una fruta falsa (decisión 56): cada celda alcanzada estalla, así se ve el radio. */
export function renderExplosion(
  ctx: CanvasRenderingContext2D,
  cells: ReadonlyArray<{ row: number; col: number }>,
  cellSize: number,
  fade: number
): void {
  const frame = Math.min(3, Math.floor((1 - Math.max(0, Math.min(1, fade))) * 4));
  for (const cell of cells) drawCentered(ctx, `blast_${frame}` as SpriteName, {}, cell.row, cell.col, cellSize);
}

/**
 * Pared destruida por Pacman (modo GhostMan, HU-33): escombros en el color del contorno del nivel
 * que se separan y caen durante 0,5 s. `fade` va de 1 (recién destruida) a 0.
 */
export function renderWallFlash(ctx: CanvasRenderingContext2D, row: number, col: number, cellSize: number, fade: number, wallColor: string): void {
  const frame = Math.min(3, Math.floor((1 - Math.max(0, Math.min(1, fade))) * 4));
  drawCentered(ctx, `debris_${frame}` as SpriteName, { o: wallColor }, row, col, cellSize);
}

/** Cuadros de la derrota de Pacman (decisión 53): se desarma y termina en un destello. */
export const PACMAN_DEATH_FRAMES = 11;

export function renderPacmanDeath(ctx: CanvasRenderingContext2D, row: number, col: number, cellSize: number, frame: number, skin: PacmanSkin = DEFAULT_PACMAN_SKIN): void {
  drawCentered(ctx, `pacman_death_${frame}` as SpriteName, pacmanPalette(skin), row, col, cellSize);
}

/** Sombra en el destino del saltarín: crece a medida que se acerca el aterrizaje (`t` de 0 a 1). */
export function renderJumpShadow(ctx: CanvasRenderingContext2D, row: number, col: number, cellSize: number, t: number): void {
  const sprite = SPRITES.jump_shadow;
  ctx.save();
  ctx.globalAlpha *= 0.4 + 0.5 * t;
  // Al pie del cuerpo del fantasma, que llega 7 px debajo del centro de la celda.
  drawSprite(ctx, "jump_shadow", {}, (col + 0.5) * cellSize, (row + 0.5) * cellSize + 6 * pixelScale(cellSize), sprite.w / 2, sprite.h / 2, pixelScale(cellSize) * (0.3 + 0.7 * t));
  ctx.restore();
}

/** Polvo al aterrizar: `progress` va de 0 (recién caído) a 1. */
export function renderLandingDust(ctx: CanvasRenderingContext2D, row: number, col: number, cellSize: number, progress: number): void {
  const frame = Math.min(2, Math.floor(progress * 3));
  const sprite = SPRITES.dust_0;
  drawSprite(ctx, `dust_${frame}` as SpriteName, {}, (col + 0.5) * cellSize, (row + 0.5) * cellSize + 5 * pixelScale(cellSize), sprite.w / 2, sprite.h / 2, pixelScale(cellSize));
}

/** Ojos de un fantasma comido que vuelve a la base (decisión 46): sin cuerpo, mirando hacia donde va. */
export function renderGhostEyes(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  cellSize: number,
  direction: Direction | null,
  skin: GhostSkin = DEFAULT_GHOST_SKIN
): void {
  drawGhostPart(ctx, eyesSpriteName(direction), eyesPalette(skin), row, col, cellSize);
}


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
