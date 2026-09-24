// Identidad visual de cada nivel (sección 2.1 de la especificación).

export interface LevelTheme {
  readonly background: string;
  readonly wallFill: string;
  /** Franjas diagonales del muro; null = sin franjas. */
  readonly wallStripe: string | null;
  readonly wallOutline: string;
  readonly pathDot: string;
}

export const LEVEL_THEMES: Readonly<Record<number, LevelTheme>> = {
  1: {
    background: "#000000",
    wallFill: "#000000",
    wallStripe: "#c81e2c",
    wallOutline: "#38f0e8",
    pathDot: "#ffffff",
  },
  // Nivel 2: tonos azules fríos sobre fondo negro, sin franjas, contorno azul.
  2: {
    background: "#000000",
    wallFill: "#0b1d4d",
    wallStripe: null,
    wallOutline: "#2f6bff",
    pathDot: "#ffffff",
  },
  // Nivel 3: verde brillante.
  3: {
    background: "#000000",
    wallFill: "#0d4d12",
    wallStripe: null,
    wallOutline: "#39ff14",
    pathDot: "#ffffff",
  },
};
