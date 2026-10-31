// Pasa los sprites de art/ghostman.px.js a src/game/sprites.ts (incremento 23, decisión 58).
// Cada píxel queda como la letra de su rol de color, así el juego puede pintarlo con la paleta de
// cualquier skin. Necesita pxl (skill pxl-pixel-art, Node >= 22.18):
//   PXL_DIR=~/.claude/skills/pxl-pixel-art node scripts/sprites/generate.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ART = path.join(ROOT, "art/ghostman.px.js");
const OUT = path.join(ROOT, "src/game/sprites.ts");
const PXL_DIR = process.env.PXL_DIR || path.join(os.homedir(), ".claude/skills/pxl-pixel-art");

const { loadProject } = await import(pathToFileURL(path.join(PXL_DIR, "src/index.ts")).href);
const project = loadProject(ART);

// Rol de cada color: se lee de la llamada pal({...}) del archivo de arte.
const source = fs.readFileSync(ART, "utf8");
const palBlock = source.slice(source.indexOf("pal({"), source.indexOf("})", source.indexOf("pal({")));
const roleByColor = new Map();
const defaults = {};
for (const [, key, hex] of palBlock.matchAll(/(\w):\s*"#([0-9a-fA-F]{6})"/g)) {
  const color = hex.toLowerCase();
  if (roleByColor.has(color)) throw new Error(`Los roles '${roleByColor.get(color)}' y '${key}' usan el mismo color #${color}`);
  roleByColor.set(color, key);
  defaults[key] = `#${color}`;
}

const sprites = {};
for (const [name, def] of project.assets) {
  if (def.kind !== "sprite" || name.startsWith("_")) continue;
  const img = project.image(name);
  const rows = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity;
  for (let y = 0; y < img.h; y++) {
    let row = "";
    for (let x = 0; x < img.w; x++) {
      const rgba = img.data[y * img.w + x] >>> 0;
      if ((rgba & 0xff) === 0) { row += "."; continue; }
      const color = (rgba >>> 8).toString(16).padStart(6, "0");
      const role = roleByColor.get(color);
      if (!role) throw new Error(`${name}: el color #${color} en (${x},${y}) no es de ningún rol`);
      if (role === "b") { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); }
      row += role;
    }
    rows.push(row);
  }
  // Ancla: centro horizontal y borde de arriba del cuerpo. Sin cuerpo (ojos), el de un fantasma clásico.
  const ax = minX === Infinity ? img.w / 2 : (minX + maxX + 1) / 2;
  const ay = minY === Infinity ? 1 : minY;
  sprites[name] = { w: img.w, h: img.h, ax, ay, rows };
}

const body = Object.entries(sprites)
  .map(([name, s]) => `  ${name}: { w: ${s.w}, h: ${s.h}, ax: ${s.ax}, ay: ${s.ay}, rows: [\n${s.rows.map((r) => `    "${r}",`).join("\n")}\n  ] },`)
  .join("\n");
fs.writeFileSync(OUT, `// Generado por scripts/sprites/generate.mjs a partir de art/ghostman.px.js. No editar a mano.
// Cada letra es un rol de color (decisión 58): ver la paleta de art/ghostman.px.js; "." es transparente.

export interface SpriteData {
  w: number;
  h: number;
  /** Ancla: centro horizontal y fila de arriba del cuerpo (rol "b"), en píxeles del sprite. */
  ax: number;
  ay: number;
  rows: readonly string[];
}

/** Colores de las vistas previas de cada rol; los que no cambia ninguna skin (frutas) se usan tal cual. */
export const SPRITE_ROLE_COLORS: Readonly<Record<string, string>> = ${JSON.stringify(defaults, null, 2).replace(/"(\w)":/g, "$1:")};

export const SPRITES = {
${body}
} satisfies Record<string, SpriteData>;

export type SpriteName = keyof typeof SPRITES;
`);
console.log(`${Object.keys(sprites).length} sprites -> ${path.relative(ROOT, OUT)}`);
