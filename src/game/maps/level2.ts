import type { GameMap } from "../types";
import { parseMap } from "./parse";

// Nivel 2: mapa fijo, de forma propia (distinta de los niveles 1 y 3).
const LEVEL2_LAYOUT = [
  "#################",
  "#o......#......o#",
  "#.##.##.#.##.##.#",
  "#...............#",
  "#.##.#.###.#.##.#",
  "#....#..#..#....#",
  "####.##.#.##.####",
  "#...............#",
  "#.#..#.###.#..#.#",
  "#.#.....#.....#.#",
  "#.#.###.#.###.#.#",
  "#...............#",
  "#.##.#.###.#.##.#",
  "#o...#.....#...o#",
  "#################",
] as const;

export function createLevel2Map(): GameMap {
  return parseMap(LEVEL2_LAYOUT);
}
