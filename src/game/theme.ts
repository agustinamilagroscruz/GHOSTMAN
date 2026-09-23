// Identidad visual de cada nivel (sección 2.1 de la especificación).

export interface LevelTheme {
  readonly background: string;
  readonly wallFill: string;
  readonly wallStripe: string;
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
};
