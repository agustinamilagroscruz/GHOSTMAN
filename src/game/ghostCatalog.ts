import type { GhostKind } from "./ghosts";

// Tipos de fantasma tal como se presentan en el carrusel de selección (HU-23).
// Orden y elemento inicial: decisión 30. Textos: sección 2.2 de la especificación.

export interface GhostKindInfo {
  kind: GhostKind;
  name: string;
  power: string;
}

export const GHOST_CATALOG: readonly GhostKindInfo[] = [
  {
    kind: "classic",
    name: "Clásico",
    power: "Sin habilidad especial.",
  },
  {
    kind: "specter",
    name: "Espectro",
    power:
      "Atraviesa una pared (muros de una o dos celdas de espesor). Cooldown de 10 s. Es un 30 % más lento y no puede comer a Pacman durante los 3 s posteriores a atravesarla.",
  },
  {
    kind: "jumper",
    name: "Saltarín",
    power: "Se teletransporta a una celda aleatoria dentro de un radio de 10 celdas. Cooldown de 10 s. El destino no se elige.",
  },
  {
    kind: "naval",
    name: "Naval",
    power:
      "Coloca frutas falsas que hacen perder a Pacman; si nadie las toca, explotan a los 10 s en un radio de 3 celdas. Una cada 5 s, máximo 2. Es un 20 % más lento y tarda más en reaparecer.",
  },
  {
    kind: "accelerated",
    name: "Acelerado",
    power: "Dash de hasta 3 celdas hacia adelante; se detiene si choca una pared. Cooldown de 10 s. Después del dash, −50 % de velocidad durante 5 s.",
  },
];

export const INITIAL_CAROUSEL_INDEX = 0;
