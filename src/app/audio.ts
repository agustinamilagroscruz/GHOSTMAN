// Motor de audio (incremento 25, HU-48; decisiones 43 y 57). Todo se sintetiza con la Web Audio
// API: melodías y efectos originales al estilo del Pac-Man, sin archivos de audio.
import { SOUND_CHANNELS, type LoopSound, type SoundChannel, type SoundName } from "../game/sounds";

/** Volumen inicial de cada canal, de 0 a 100 (la HU-41 permitirá cambiarlo). */
const DEFAULT_VOLUMES: Record<SoundChannel, number> = { music: 60, effects: 80 };

type Wave = OscillatorType;

/** Nota MIDI → frecuencia. */
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

interface AudioDebug {
  log: string[];
}

declare global {
  interface Window {
    /** Solo en builds de prueba: lo que hizo sonar el motor, para las suites de navegador. */
    __ghostmanAudio?: AudioDebug;
  }
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private channels: Partial<Record<SoundChannel, GainNode>> = {};
  private volumes = { ...DEFAULT_VOLUMES };
  private muted = false;
  private suspended = false;
  private loops = new Map<LoopSound, () => void>();
  private wakaHigh = false;
  private readonly debug: AudioDebug | null =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_MODO_PRUEBA === "1" ? (window.__ghostmanAudio ??= { log: [] }) : null;

  private note(entry: string): void {
    this.debug?.log.push(entry);
  }

  /**
   * Se llama en la primera interacción del usuario: recién ahí el navegador deja crear el
   * contexto de audio (política de reproducción automática).
   */
  unlock(): void {
    if (this.ctx) {
      // Si el navegador lo dejó suspendido (por ejemplo, porque esa interacción no contó como gesto
      // del usuario), se reintenta en cada interacción, salvo que lo hayamos suspendido nosotros.
      if (!this.suspended && this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    this.ctx = new Context();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    for (const channel of ["music", "effects"] as const) {
      const gain = this.ctx.createGain();
      gain.connect(this.master);
      this.channels[channel] = gain;
    }
    this.applyVolumes();
    if (this.suspended) void this.ctx.suspend();
    else if (this.ctx.state === "suspended") void this.ctx.resume();
    this.note("unlock");
  }

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  /** Volumen de un canal, de 0 a 100 (HU-41). */
  setVolume(channel: SoundChannel, value: number): void {
    this.volumes[channel] = Math.max(0, Math.min(100, value));
    this.applyVolumes();
  }

  /** Modo de prueba (decisión 59): no suena nada, pero el motor sigue funcionando y registrando. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.value = this.muted ? 0 : 1;
    for (const channel of ["music", "effects"] as const) {
      // Curva cuadrática: el oído percibe el volumen de forma logarítmica.
      this.channels[channel]!.gain.value = (this.volumes[channel] / 100) ** 2;
    }
  }

  /** Pausa o pestaña oculta: el contexto se suspende y no suena nada (HU-48). */
  setSuspended(suspended: boolean): void {
    if (suspended === this.suspended) return;
    this.suspended = suspended;
    this.note(suspended ? "suspend" : "resume");
    if (!this.ctx) return;
    void (suspended ? this.ctx.suspend() : this.ctx.resume());
  }

  /** Enciende o apaga los sonidos en bucle (sirenas y ojos). */
  setLoops(wanted: Readonly<Record<LoopSound, boolean>>): void {
    for (const loop of Object.keys(wanted) as LoopSound[]) {
      const playing = this.loops.has(loop);
      if (wanted[loop] && !playing && this.ctx) {
        this.loops.set(loop, this.startLoop(loop));
        this.note(`loop:${loop}:on`);
      } else if (!wanted[loop] && playing) {
        this.loops.get(loop)!();
        this.loops.delete(loop);
        this.note(`loop:${loop}:off`);
      }
    }
  }

  stopAll(): void {
    this.setLoops({ siren: false, powerSiren: false, eyes: false });
  }

  play(name: Exclude<SoundName, LoopSound>): void {
    if (!this.ctx) return;
    this.note(`play:${name}`);
    const out = this.channels[SOUND_CHANNELS[name]]!;
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case "gameStart":
        return this.melody(out, t, START_JINGLE, 0.2);
      case "levelComplete":
        return this.melody(out, t, LEVEL_JINGLE, 0.12);
      case "gameOver":
        return this.melody(out, t, GAME_OVER_JINGLE, 0.32);
      case "pellet":
        // "Waka": dos barridos que se alternan, uno hacia arriba y otro hacia abajo.
        this.wakaHigh = !this.wakaHigh;
        return this.tone(out, t, "triangle", this.wakaHigh ? 280 : 560, this.wakaHigh ? 560 : 280, 0.08, 0.5);
      case "powerPellet":
        return this.tone(out, t, "square", 160, 70, 0.3, 0.3);
      case "ghostEaten":
        return this.tone(out, t, "sawtooth", 180, 1400, 0.45, 0.25);
      case "fruit":
        this.tone(out, t, "triangle", 660, 660, 0.08, 0.4);
        return this.tone(out, t + 0.09, "triangle", 990, 990, 0.12, 0.4);
      case "pacmanDeath":
        // Barridos que bajan, cada vez más graves, y dos golpes al final (1,5 s).
        for (let i = 0; i < 8; i++) this.tone(out, t + i * 0.15, "sawtooth", 900 - i * 70, 500 - i * 50, 0.15, 0.22);
        this.tone(out, t + 1.25, "square", 120, 60, 0.08, 0.3);
        return this.tone(out, t + 1.4, "square", 120, 60, 0.08, 0.3);
      case "countdownBeep":
        return this.tone(out, t, "square", 523, 523, 0.12, 0.25);
      case "countdownGo":
        return this.tone(out, t, "square", 1046, 1046, 0.25, 0.25);
      case "phase":
        return this.tone(out, t, "sine", 900, 200, 0.4, 0.4, 14);
      case "jump":
        this.tone(out, t, "sine", 300, 900, 0.3, 0.4);
        return this.tone(out, t + 0.3, "sine", 900, 400, 0.3, 0.4);
      case "dash":
        return this.tone(out, t, "sawtooth", 200, 1200, 0.22, 0.25);
      case "fakeFruitPlaced":
        this.tone(out, t, "triangle", 1200, 1200, 0.06, 0.35);
        return this.tone(out, t + 0.07, "triangle", 1600, 1600, 0.09, 0.35);
      case "explosion":
        return this.noise(out, t, 0.5, "lowpass", 1400, 150, 0.6);
      case "wallBreak":
        return this.noise(out, t, 0.18, "highpass", 1800, 900, 0.4);
    }
  }

  /** Un tono con barrido de frecuencia, envolvente corta y vibrato opcional (Hz). */
  private tone(out: AudioNode, t: number, wave: Wave, from: number, to: number, duration: number, volume: number, vibrato = 0): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = vibrato;
      depth.gain.value = 40;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + duration);
    }
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(volume, t + 0.005);
    env.gain.setValueAtTime(volume, t + duration * 0.7);
    env.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /** Ruido filtrado (explosión, escombros). */
  private noise(out: AudioNode, t: number, duration: number, type: BiquadFilterType, from: number, to: number, volume: number): void {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    source.buffer = buffer;
    filter.type = type;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + duration);
    env.gain.setValueAtTime(volume, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter).connect(env).connect(out);
    source.start(t);
  }

  /** Melodía de dos voces: [nota de la melodía, nota del bajo] por paso; null = silencio. */
  private melody(out: AudioNode, t: number, steps: ReadonlyArray<readonly [number | null, number | null]>, stepSeconds: number): void {
    steps.forEach(([lead, bass], i) => {
      const start = t + i * stepSeconds;
      if (lead !== null) this.tone(out, start, "square", hz(lead), hz(lead), stepSeconds * 0.9, 0.18);
      if (bass !== null) this.tone(out, start, "triangle", hz(bass), hz(bass), stepSeconds * 0.9, 0.35);
    });
  }

  /** Bucles: un oscilador cuya frecuencia sube y baja con un LFO. Devuelve cómo apagarlo. */
  private startLoop(loop: LoopSound): () => void {
    const ctx = this.ctx!;
    const [wave, center, depth, rate, volume] = LOOPS[loop];
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const env = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = center;
    lfo.type = "triangle";
    lfo.frequency.value = rate;
    lfoGain.gain.value = depth;
    env.gain.value = volume;
    lfo.connect(lfoGain).connect(osc.frequency);
    osc.connect(env).connect(this.channels[SOUND_CHANNELS[loop]]!);
    osc.start();
    lfo.start();
    return () => {
      osc.stop();
      lfo.stop();
      env.disconnect();
    };
  }
}

/** [forma de onda, frecuencia central, profundidad del barrido, barridos por segundo, volumen]. */
const LOOPS: Readonly<Record<LoopSound, readonly [Wave, number, number, number, number]>> = {
  siren: ["triangle", 520, 140, 2.2, 0.18],
  powerSiren: ["square", 190, 70, 7, 0.08],
  eyes: ["square", 950, 350, 11, 0.05],
};

// Melodías originales (decisión 43), en notas MIDI. El jingle de inicio dura 3,2 s, dentro de la cuenta.
const START_JINGLE: ReadonlyArray<readonly [number | null, number | null]> = [
  [72, 48], [76, null], [79, 55], [76, null], [81, 53], [79, null], [76, 55], [null, null],
  [74, 50], [77, null], [81, 57], [77, null], [79, 55], [83, null], [84, 48], [null, null],
];
const LEVEL_JINGLE: ReadonlyArray<readonly [number | null, number | null]> = [
  [72, 48], [76, null], [79, 55], [84, 60], [79, null], [84, 60], [88, 64], [88, 64], [88, 64],
];
const GAME_OVER_JINGLE: ReadonlyArray<readonly [number | null, number | null]> = [
  [67, 43], [66, null], [63, 39], [62, null], [60, 36], [null, null], [55, 31], [55, 31],
];

let engine: AudioEngine | null = null;

/** Un solo motor para toda la aplicación: los navegadores limitan los contextos de audio. */
export function getAudioEngine(): AudioEngine {
  engine ??= new AudioEngine();
  return engine;
}
