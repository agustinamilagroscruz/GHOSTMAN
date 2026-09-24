import type { GameMap } from "../types";
import { parseMap } from "./parse";

// Nivel 3: mapa fijo, de forma propia (distinta de los niveles 1 y 2).
const LEVEL3_LAYOUT = [
  "#################",
  "#o.............o#",
  "#.#.#.#####.#.#.#",
  "#.#...........#.#",
  "#.#.##.#.#.##.#.#",
  "#......#.#......#",
  "###.####.####.###",
  "#...#.......#...#",
  "#.#.#.##.##.#.#.#",
  "#.#...#...#...#.#",
  "#.###.#.#.#.###.#",
  "#...............#",
  "#.#####.#.#####.#",
  "#o......#......o#",
  "#################",
] as const;

export function createLevel3Map(): GameMap {
  return parseMap(LEVEL3_LAYOUT);
}
