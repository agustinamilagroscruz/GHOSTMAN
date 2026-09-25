import type { GhostId, GhostKind } from "./ghosts";
import { createLevel1Map } from "./maps/level1";
import { createLevel2Map } from "./maps/level2";
import { createLevel3Map } from "./maps/level3";
import type { GameMap } from "./types";

// Definición de los tres niveles de la V1 (secciones 2.1 y 4.4).

export const LAST_LEVEL = 3;

export interface GhostSetup {
  id: GhostId;
  color: string;
  spawn: { row: number; col: number };
  scatterTarget: { row: number; col: number };
}

export interface LevelDefinition {
  number: number;
  createMap: () => GameMap;
  playerSpawn: { row: number; col: number };
  ghosts: readonly GhostSetup[];
  /** Tipo con el que arrancan los cuatro fantasmas. */
  initialGhostKind: GhostKind;
  /** Probabilidad de que un fantasma comido reaparezca como espectro (0, 0.5 o 1). */
  specterRespawnChance: number;
  /** Segundos entre apariciones de frutas; null si el nivel no tiene frutas. */
  fruitSpawnIntervalSeconds: number | null;
}

// Los tres mapas son de 17 x 15: esquinas transitables en (1,1), (1,15), (13,1) y (13,15).
const CORNER_GHOSTS: readonly GhostSetup[] = [
  { id: "blinky", color: "#ff0000", spawn: { row: 1, col: 1 }, scatterTarget: { row: 1, col: 15 } },
  { id: "pinky", color: "#ffb8ff", spawn: { row: 1, col: 15 }, scatterTarget: { row: 1, col: 1 } },
  { id: "inky", color: "#00ffff", spawn: { row: 13, col: 1 }, scatterTarget: { row: 13, col: 15 } },
  { id: "clyde", color: "#ffb851", spawn: { row: 13, col: 15 }, scatterTarget: { row: 13, col: 1 } },
];

export const LEVELS: Readonly<Record<number, LevelDefinition>> = {
  1: {
    number: 1,
    createMap: createLevel1Map,
    playerSpawn: { row: 7, col: 8 },
    ghosts: CORNER_GHOSTS,
    initialGhostKind: "classic",
    specterRespawnChance: 0,
    fruitSpawnIntervalSeconds: null,
  },
  2: {
    number: 2,
    createMap: createLevel2Map,
    playerSpawn: { row: 7, col: 8 },
    ghosts: CORNER_GHOSTS,
    initialGhostKind: "classic",
    specterRespawnChance: 0.5,
    fruitSpawnIntervalSeconds: null,
  },
  3: {
    number: 3,
    createMap: createLevel3Map,
    playerSpawn: { row: 7, col: 8 },
    ghosts: CORNER_GHOSTS,
    initialGhostKind: "specter",
    specterRespawnChance: 1,
    // 7 s (y no 20 s) para que con 15 s de vida puedan coexistir 2 frutas y el máximo
    // sea observable: a los 21 s no aparece una tercera (decisión del equipo, sección 5).
    fruitSpawnIntervalSeconds: 7,
  },
};

export const MAX_SIMULTANEOUS_FRUITS = 2;
