import type { GameMap } from "../types";
import { parseMap } from "./parse";

// Nivel 1: mapa fijo y sencillo (distinto de los niveles 2 y 3). Bloques de muro
// grandes separados por pasillos rectos: pocos cruces y ningún callejón sin salida,
// pero con intersecciones reales para que la IA de los fantasmas elija dirección.
const LEVEL1_LAYOUT = [
  "#################",
  "#o.............o#",
  "#.####.###.####.#",
  "#.####.###.####.#",
  "#...............#",
  "#.####.###.####.#",
  "#.####.###.####.#",
  "#...............#",
  "#.####.###.####.#",
  "#.####.###.####.#",
  "#...............#",
  "#.####.###.####.#",
  "#.####.###.####.#",
  "#o.............o#",
  "#################",
] as const;

export function createLevel1Map(): GameMap {
  return parseMap(LEVEL1_LAYOUT);
}
