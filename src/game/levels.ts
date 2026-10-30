import type { GhostId, GhostKind } from "./ghosts";
import { createLevel1Map } from "./maps/level1";
import { createLevel2Map } from "./maps/level2";
import { createLevel3Map } from "./maps/level3";
import type { GameMap } from "./types";

// Definición de los tres niveles (V1: secciones 2.1 y 4.4; V2: sección 4.9, HU-43).

export const LAST_LEVEL = 3;

export interface GhostSetup {
  id: GhostId;
  color: string;
  scatterTarget: { row: number; col: number };
}

/** Posición inicial respecto de la base (decisión 45): afuera, sobre la puerta, o en el interior. */
export type HouseSlot = "outside" | "center" | "left" | "right";

/** Modo Pacman, en el orden de `ghosts`: uno afuera y tres adentro, que salen en ese orden. */
export const PACMAN_MODE_SLOTS: readonly HouseSlot[] = ["outside", "center", "left", "right"];
/** Modo GhostMan: el fantasma del jugador (el primero) en el centro; de la IA, uno afuera y dos adentro. */
export const GHOSTMAN_MODE_SLOTS: readonly HouseSlot[] = ["center", "outside", "left", "right"];

export interface LevelDefinition {
  number: number;
  createMap: () => GameMap;
  pacmanSpawn: { row: number; col: number };
  ghosts: readonly GhostSetup[];
  /** Modo Pacman: tipo con el que arranca cada fantasma, en el orden de `ghosts`. */
  initialGhostKinds: readonly GhostKind[];
  /**
   * Modo Pacman: probabilidad de que un fantasma comido reaparezca con poderes (0, 0,5 o 1).
   * En ese caso el tipo se elige al azar, en forma uniforme, entre los cuatro con poderes.
   */
  poweredRespawnChance: number;
  /** Segundos entre apariciones de frutas; null si el nivel no tiene frutas. */
  fruitSpawnIntervalSeconds: number | null;
}

// Los tres mapas son de 28 x 31 (V3): las esquinas transitables son (1,1), (1,26), (29,1) y
// (29,26). La posición inicial de cada fantasma la da la base (PACMAN_MODE_SLOTS y GHOSTMAN_MODE_SLOTS).
const HOUSE_GHOSTS: readonly GhostSetup[] = [
  { id: "blinky", color: "#ff0000", scatterTarget: { row: 1, col: 26 } },
  { id: "pinky", color: "#ffb8ff", scatterTarget: { row: 1, col: 1 } },
  { id: "inky", color: "#00ffff", scatterTarget: { row: 29, col: 26 } },
  { id: "clyde", color: "#ffb851", scatterTarget: { row: 29, col: 1 } },
];

export const LEVELS: Readonly<Record<number, LevelDefinition>> = {
  1: {
    number: 1,
    createMap: createLevel1Map,
    pacmanSpawn: { row: 23, col: 13 },
    ghosts: HOUSE_GHOSTS,
    initialGhostKinds: ["classic", "classic", "classic", "classic"],
    poweredRespawnChance: 0,
    fruitSpawnIntervalSeconds: null,
  },
  2: {
    number: 2,
    createMap: createLevel2Map,
    pacmanSpawn: { row: 23, col: 13 },
    ghosts: HOUSE_GHOSTS,
    initialGhostKinds: ["classic", "classic", "classic", "classic"],
    poweredRespawnChance: 0.5,
    fruitSpawnIntervalSeconds: null,
  },
  3: {
    number: 3,
    createMap: createLevel3Map,
    pacmanSpawn: { row: 23, col: 13 },
    ghosts: HOUSE_GHOSTS,
    // Uno de cada tipo con poderes (decisión 23): composición determinista y verificable a la vista.
    initialGhostKinds: ["specter", "jumper", "naval", "accelerated"],
    poweredRespawnChance: 1,
    // 7 s (y no 20 s) para que con 15 s de vida puedan coexistir 2 frutas y el máximo
    // sea observable: a los 21 s no aparece una tercera (decisión del equipo, sección 5).
    fruitSpawnIntervalSeconds: 7,
  },
};

export const MAX_SIMULTANEOUS_FRUITS = 2;

/** Tipos con poderes, para la reaparición al azar del modo Pacman (sección 4.9). */
export const POWERED_GHOST_KINDS: readonly GhostKind[] = ["specter", "jumper", "naval", "accelerated"];
