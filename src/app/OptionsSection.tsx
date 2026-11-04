"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GhostId, GhostKind } from "../game/ghosts";
import { renderGhost, renderPacman } from "../game/render";
import { findGhostSkin, findPacmanSkin, GHOST_SKINS, PACMAN_SKINS, type GhostSkin, type PacmanSkin } from "../game/skins";
import type { SoundChannel } from "../game/sounds";
import { MESSAGES } from "./accounts";
import styles from "./Menu.module.css";
import { savePreferences, VOLUME_STEP, type Preferences } from "./preferences";

interface OptionsSectionProps {
  userId: string;
  preferences: Preferences;
  /** Aplica las preferencias en la aplicación (el volumen, de inmediato); guardar es tarea de esta sección. */
  onChange: (preferences: Preferences) => void;
  onLogout: () => void;
  onExit: () => void;
  onBack: () => void;
}

type Row = "pacmanSkin" | "ghostSkin" | "music" | "effects" | "logout" | "exit" | "back";
const ROWS: readonly Row[] = ["pacmanSkin", "ghostSkin", "music", "effects", "logout", "exit", "back"];
const CHANNEL_LABELS: Record<SoundChannel, string> = { music: "Música", effects: "Efectos" };
/** Los volúmenes se guardan un momento después del último cambio, no en cada paso. */
const VOLUME_SAVE_DELAY_MS = 400;

type SaveStatus = "idle" | "saved" | "failed";

/**
 * Sección Opciones (HU-40, HU-41, HU-42): ↑↓ eligen la fila, ←→ o A/D cambian el valor, Enter confirma
 * la skin o ejecuta la acción, Esc vuelve al menú principal. Una skin se guarda solo al confirmarla;
 * los volúmenes se aplican de inmediato y se guardan al cambiar.
 */
export function OptionsSection({ userId, preferences, onChange, onLogout, onExit, onBack }: OptionsSectionProps) {
  const [row, setRow] = useState(0);
  // Skin que se está recorriendo en cada carrusel; la elegida es la de preferences.
  const [browsing, setBrowsing] = useState({
    pacman: Math.max(0, PACMAN_SKINS.findIndex((skin) => skin.id === preferences.pacmanSkin)),
    ghost: Math.max(0, GHOST_SKINS.findIndex((skin) => skin.id === preferences.ghostSkin)),
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const volumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(preferences);

  const save = async (next: Preferences) => {
    const ok = await savePreferences(userId, next);
    setSaveStatus(ok ? "saved" : "failed");
  };

  const update = (next: Preferences, delayed: boolean) => {
    latest.current = next;
    onChange(next);
    if (volumeTimer.current) clearTimeout(volumeTimer.current);
    volumeTimer.current = null;
    if (delayed) {
      volumeTimer.current = setTimeout(() => {
        volumeTimer.current = null;
        save(latest.current);
      }, VOLUME_SAVE_DELAY_MS);
    } else {
      save(next);
    }
  };

  // Al salir de la sección, un volumen todavía sin guardar se guarda igual.
  useEffect(
    () => () => {
      if (volumeTimer.current) {
        clearTimeout(volumeTimer.current);
        savePreferences(userId, latest.current);
      }
    },
    [userId]
  );

  const confirmSkin = (target: "pacman" | "ghost") => {
    const next =
      target === "pacman"
        ? { ...latest.current, pacmanSkin: PACMAN_SKINS[browsing.pacman].id }
        : { ...latest.current, ghostSkin: GHOST_SKINS[browsing.ghost].id };
    update(next, false);
  };

  const changeVolume = (channel: SoundChannel, delta: number) => {
    const current = latest.current.volumes[channel];
    const value = Math.max(0, Math.min(100, current + delta * VOLUME_STEP));
    if (value === current) return;
    update({ ...latest.current, volumes: { ...latest.current.volumes, [channel]: value } }, true);
  };

  const browse = (target: "pacman" | "ghost", delta: number) => {
    const count = target === "pacman" ? PACMAN_SKINS.length : GHOST_SKINS.length;
    setBrowsing((current) => ({ ...current, [target]: (current[target] + delta + count) % count }));
  };

  const activate = (target: Row) => {
    if (target === "pacmanSkin") confirmSkin("pacman");
    else if (target === "ghostSkin") confirmSkin("ghost");
    else if (target === "logout") onLogout();
    else if (target === "exit") onExit();
    else if (target === "back") onBack();
  };

  const step = (target: Row, delta: number) => {
    if (target === "pacmanSkin") browse("pacman", delta);
    else if (target === "ghostSkin") browse("ghost", delta);
    else if (target === "music" || target === "effects") changeVolume(target, delta);
  };

  // Las funciones cambian en cada render; el manejador de teclado lee siempre las últimas.
  const handlers = useRef({ activate, step });
  useEffect(() => {
    handlers.current = { activate, step };
  });

  useEffect(() => {
    const count = ROWS.length;
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          event.preventDefault();
          setRow((index) => (index - 1 + count) % count);
          break;
        case "ArrowDown":
        case "KeyS":
          event.preventDefault();
          setRow((index) => (index + 1) % count);
          break;
        case "ArrowLeft":
        case "KeyA":
          event.preventDefault();
          handlers.current.step(ROWS[row], -1);
          break;
        case "ArrowRight":
        case "KeyD":
          event.preventDefault();
          handlers.current.step(ROWS[row], 1);
          break;
        case "Enter":
        case "NumpadEnter":
          // preventDefault evita que el botón con foco dispare además su clic.
          event.preventDefault();
          if (!event.repeat) handlers.current.activate(ROWS[row]);
          break;
        case "Escape":
          event.preventDefault();
          if (!event.repeat) handlers.current.activate("back");
          break;
        case "Space":
          event.preventDefault();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [row]);

  const rowProps = (target: Row) => ({
    className: `${styles.optionRow} ${ROWS[row] === target ? styles.optionRowSelected : ""}`,
    "data-testid": `options-${target}`,
    "aria-current": ROWS[row] === target,
    // Como en los menús: solo un movimiento real del mouse cambia la fila (DEF-002).
    onMouseMove: () => {
      if (ROWS[row] !== target) setRow(ROWS.indexOf(target));
    },
  });

  const pacmanSkin = PACMAN_SKINS[browsing.pacman];
  const ghostSkin = GHOST_SKINS[browsing.ghost];

  return (
    <div className={`${styles.screen} ${styles.options}`} data-testid="options-section">
      <h1 className={styles.subtitle}>OPCIONES</h1>

      <SkinCarousel
        {...rowProps("pacmanSkin")}
        label="Skin de Pacman"
        name={pacmanSkin.name}
        chosen={pacmanSkin.id === findPacmanSkin(preferences.pacmanSkin).id}
        onBrowse={(delta) => browse("pacman", delta)}
        onConfirm={() => confirmSkin("pacman")}
      >
        <PacmanPreview skin={pacmanSkin} />
      </SkinCarousel>

      <SkinCarousel
        {...rowProps("ghostSkin")}
        label="Skin de los fantasmas"
        name={ghostSkin.name}
        chosen={ghostSkin.id === findGhostSkin(preferences.ghostSkin).id}
        onBrowse={(delta) => browse("ghost", delta)}
        onConfirm={() => confirmSkin("ghost")}
      >
        <GhostsPreview skin={ghostSkin} />
      </SkinCarousel>

      {(["music", "effects"] as const).map((channel) => (
        <div key={channel} {...rowProps(channel)}>
          <span className={styles.optionLabel}>{CHANNEL_LABELS[channel]}</span>
          <button className={styles.arrow} aria-label={`Bajar ${CHANNEL_LABELS[channel]}`} onClick={() => changeVolume(channel, -1)}>
            −
          </button>
          <span className={styles.volumeBar} aria-hidden="true">
            <span style={{ width: `${preferences.volumes[channel]}%` }} />
          </span>
          <span className={styles.volumeValue} data-testid={`options-${channel}-value`}>
            {preferences.volumes[channel]}
          </span>
          <button className={styles.arrow} aria-label={`Subir ${CHANNEL_LABELS[channel]}`} onClick={() => changeVolume(channel, 1)}>
            +
          </button>
        </div>
      ))}

      <div className={styles.optionActions}>
        {(
          [
            ["logout", "Cerrar sesión", onLogout],
            ["exit", "Salir del juego", onExit],
            ["back", "Volver", onBack],
          ] as const
        ).map(([target, label, action]) => {
          const { className, ...props } = rowProps(target);
          return (
            <button key={target} {...props} className={`${styles.option} ${ROWS[row] === target ? styles.optionSelected : ""} ${className}`} onClick={action}>
              {label}
            </button>
          );
        })}
      </div>

      <p className={styles.saveLine} data-testid="options-save" data-status={saveStatus}>
        {saveStatus === "failed" && <span className={styles.formError}>{MESSAGES.general}</span>}
        {saveStatus === "saved" && <span className={styles.hint}>Guardado</span>}
      </p>
      <p className={styles.hint}>↑ ↓ elegir · ← → cambiar · Enter confirmar · Esc volver</p>
    </div>
  );
}

interface SkinCarouselProps {
  label: string;
  name: string;
  chosen: boolean;
  onBrowse: (delta: number) => void;
  onConfirm: () => void;
  children: ReactNode;
  className: string;
  "data-testid": string;
  "aria-current": boolean;
  onMouseMove: () => void;
}

/** Carrusel de skins (HU-40): las flechas recorren, Enter (o el botón Elegir) confirma. */
function SkinCarousel({ label, name, chosen, onBrowse, onConfirm, children, ...rowProps }: SkinCarouselProps) {
  const testId = rowProps["data-testid"];
  return (
    <div {...rowProps}>
      <span className={styles.optionLabel}>{label}</span>
      <div className={styles.carousel}>
        <button className={styles.arrow} aria-label="Anterior" onClick={() => onBrowse(-1)}>
          ◀
        </button>
        <div className={styles.center}>{children}</div>
        <button className={styles.arrow} aria-label="Siguiente" onClick={() => onBrowse(1)}>
          ▶
        </button>
      </div>
      <span className={styles.skinName} data-testid={`${testId}-name`} data-chosen={chosen}>
        {name}
        {chosen ? " ✓" : ""}
      </span>
      {!chosen && (
        <button className={styles.link} data-testid={`${testId}-confirm`} onClick={onConfirm}>
          Elegir
        </button>
      )}
    </div>
  );
}

/** Vista previa con el mismo render que la partida: la celda mide un tercio del canvas (×2). */
function PacmanPreview({ skin }: { skin: PacmanSkin }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 48, 48);
    renderPacman(ctx, 1, 1, 16, "right", skin);
  }, [skin]);
  return <canvas ref={canvasRef} width={48} height={48} data-testid="preview-pacman" data-skin={skin.id} />;
}

/** Cuatro tipos con su color y uno vulnerable: la skin conserva la distinción (decisión 58). */
const PREVIEW_GHOSTS: ReadonlyArray<{ id: GhostId; color: string; kind: GhostKind; vulnerable: boolean }> = [
  { id: "blinky", color: "#ff0000", kind: "classic", vulnerable: false },
  { id: "pinky", color: "#ffb8ff", kind: "specter", vulnerable: false },
  { id: "inky", color: "#00ffff", kind: "jumper", vulnerable: false },
  { id: "clyde", color: "#ffb851", kind: "naval", vulnerable: false },
  { id: "blinky", color: "#ff0000", kind: "classic", vulnerable: true },
];

function GhostsPreview({ skin }: { skin: GhostSkin }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = PREVIEW_GHOSTS.length * 48;
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, 48);
    PREVIEW_GHOSTS.forEach((ghost, index) =>
      renderGhost(ctx, 1, 1 + index * 3, 16, {
        id: ghost.id,
        color: ghost.color,
        kind: ghost.kind,
        direction: "right",
        isHarmless: false,
        isVulnerable: ghost.vulnerable,
        isWarning: false,
        blinkOn: false,
        skin,
      })
    );
  }, [skin, width]);
  return <canvas ref={canvasRef} width={width} height={48} data-testid="preview-ghosts" data-skin={skin.id} />;
}
