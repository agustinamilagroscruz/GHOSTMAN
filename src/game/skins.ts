import type { GhostId } from "./ghosts";

// Skins (decisión 58, HU-40): una skin es una paleta para los roles de color de los sprites de
// art/ghostman.px.js. No cambia ninguna mecánica. La elección del jugador llega con la HU-40
// (incremento 28); hasta entonces se usan las clásicas.

/** Color de cada rol: b cuerpo, k contorno, w y p ojos (blanco y pupila), d detalle, a acento. */
export type RolePalette = Readonly<Record<string, string>>;

export interface PacmanSkin {
  id: string;
  name: string;
  body: string;
  outline: string;
}

export interface GhostSkin {
  id: string;
  name: string;
  /** Color del cuerpo de cada fantasma; null = el color propio de cada uno (rojo, rosa, celeste, naranja). */
  bodies: Readonly<Record<GhostId, string>> | null;
  outline: string;
  eyeWhite: string;
  pupil: string;
  detail: string;
  accent: string;
}

export const PACMAN_SKINS: readonly PacmanSkin[] = [
  { id: "clasico", name: "Clásico", body: "#f8e34d", outline: "#f8e34d" },
  { id: "menta", name: "Menta", body: "#5ef2b5", outline: "#1f8a64" },
];

export const GHOST_SKINS: readonly GhostSkin[] = [
  { id: "clasica", name: "Clásica", bodies: null, outline: "#000000", eyeWhite: "#ffffff", pupil: "#2121de", detail: "#ffffff", accent: "#2121de" },
  {
    id: "pastel",
    name: "Pastel",
    bodies: { blinky: "#ff8fa3", pinky: "#e3b5ff", inky: "#9ff3e6", clyde: "#ffd59e" },
    outline: "#fff3c4",
    eyeWhite: "#ffffff",
    pupil: "#5a3d8a",
    detail: "#fff3c4",
    accent: "#5a3d8a",
  },
];

export const DEFAULT_PACMAN_SKIN = PACMAN_SKINS[0];
export const DEFAULT_GHOST_SKIN = GHOST_SKINS[0];

export function findPacmanSkin(id: string | undefined): PacmanSkin {
  return PACMAN_SKINS.find((skin) => skin.id === id) ?? DEFAULT_PACMAN_SKIN;
}

export function findGhostSkin(id: string | undefined): GhostSkin {
  return GHOST_SKINS.find((skin) => skin.id === id) ?? DEFAULT_GHOST_SKIN;
}

export function pacmanPalette(skin: PacmanSkin): RolePalette {
  return { b: skin.body, k: skin.outline };
}

/** Paleta de un fantasma vivo: el cuerpo es el de la skin o, en la clásica, su propio color. */
export function ghostPalette(skin: GhostSkin, id: GhostId, ownColor: string): RolePalette {
  return {
    b: skin.bodies?.[id] ?? ownColor,
    k: skin.outline,
    w: skin.eyeWhite,
    p: skin.pupil,
    d: skin.detail,
    a: skin.accent,
  };
}

/**
 * Vulnerable: azul con la cara rosada y, en el aviso de fin del PowerUp, blanco con la cara roja.
 * Tiene prioridad sobre cualquier skin (decisión 58): no depende de la skin elegida.
 */
export function vulnerablePalette(flash: boolean): RolePalette {
  return flash ? { b: "#ffffff", v: "#ff0000", k: "#000000" } : { b: "#2121de", v: "#ffb8ae", k: "#000000" };
}

/** Ojos del fantasma comido que vuelve a la base: los de la skin. */
export function eyesPalette(skin: GhostSkin): RolePalette {
  return { w: skin.eyeWhite, p: skin.pupil };
}
