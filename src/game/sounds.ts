// Sonidos del juego (sección 4.7, decisiones 43 y 57). El núcleo registra en el estado los
// eventos de cada paso y la interfaz los hace sonar; así se pueden verificar sin navegador.

/** Eventos de sonido que produce el núcleo. */
export type GameSoundEvent =
  | "gameStart"
  | "pellet"
  | "powerPellet"
  | "ghostEaten"
  | "fruit"
  | "pacmanDeath"
  | "levelComplete"
  | "gameOver"
  | "phase"
  | "jump"
  | "dash"
  | "fakeFruitPlaced"
  | "explosion"
  | "wallBreak";

/** Sonidos que no salen de un evento del núcleo: bucles y pitidos de la cuenta regresiva. */
export type LoopSound = "siren" | "powerSiren" | "eyes";
export type SoundName = GameSoundEvent | LoopSound | "countdownBeep" | "countdownGo";

export type SoundChannel = "music" | "effects";

/** Canal de cada sonido (decisión 57): el volumen de cada canal se regula por separado (HU-41). */
export const SOUND_CHANNELS: Readonly<Record<SoundName, SoundChannel>> = {
  gameStart: "music",
  siren: "music",
  powerSiren: "music",
  levelComplete: "music",
  gameOver: "music",
  pellet: "effects",
  powerPellet: "effects",
  ghostEaten: "effects",
  eyes: "effects",
  fruit: "effects",
  pacmanDeath: "effects",
  countdownBeep: "effects",
  countdownGo: "effects",
  phase: "effects",
  jump: "effects",
  dash: "effects",
  fakeFruitPlaced: "effects",
  explosion: "effects",
  wallBreak: "effects",
};
