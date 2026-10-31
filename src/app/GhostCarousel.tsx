"use client";

import { useEffect, useRef, useState } from "react";
import { GHOST_CATALOG, INITIAL_CAROUSEL_INDEX } from "../game/ghostCatalog";
import type { GhostKind } from "../game/ghosts";
import { renderGhost } from "../game/render";
import styles from "./Menu.module.css";

/** Color con el que aparece el fantasma del jugador en el mapa (posición del primer fantasma). */
const PLAYER_GHOST_COLOR = "#ff0000";

interface GhostCarouselProps {
  onConfirm: (kind: GhostKind) => void;
  onBack: () => void;
}

/**
 * Carrusel circular de selección de fantasma (HU-23, decisión 30): ←→ o A/D recorren,
 * Enter confirma e inicia la partida, ESC vuelve al menú principal.
 */
export function GhostCarousel({ onConfirm, onBack }: GhostCarouselProps) {
  const [index, setIndex] = useState(INITIAL_CAROUSEL_INDEX);
  const count = GHOST_CATALOG.length;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "ArrowLeft":
        case "KeyA":
          event.preventDefault();
          setIndex((current) => (current - 1 + count) % count);
          break;
        case "ArrowRight":
        case "KeyD":
          event.preventDefault();
          setIndex((current) => (current + 1) % count);
          break;
        case "Enter":
        case "NumpadEnter":
          event.preventDefault();
          if (!event.repeat) onConfirm(GHOST_CATALOG[index].kind);
          break;
        case "Escape":
          event.preventDefault();
          if (!event.repeat) onBack();
          break;
        case "Space":
          event.preventDefault();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, count, onConfirm, onBack]);

  const current = GHOST_CATALOG[index];
  const previous = GHOST_CATALOG[(index - 1 + count) % count];
  const next = GHOST_CATALOG[(index + 1) % count];

  return (
    <div className={styles.screen} data-testid="ghost-carousel">
      <h2 className={styles.subtitle}>Elegí tu fantasma</h2>
      <div className={styles.carousel}>
        <button className={styles.arrow} aria-label="Anterior" onClick={() => setIndex((index - 1 + count) % count)}>
          ◀
        </button>
        <div className={styles.side} aria-hidden>
          <GhostPreview kind={previous.kind} size={48} />
        </div>
        <div className={styles.center} data-testid="carousel-selected" data-kind={current.kind}>
          <GhostPreview kind={current.kind} size={96} />
        </div>
        <div className={styles.side} aria-hidden>
          <GhostPreview kind={next.kind} size={48} />
        </div>
        <button className={styles.arrow} aria-label="Siguiente" onClick={() => setIndex((index + 1) % count)}>
          ▶
        </button>
      </div>
      <p className={styles.ghostName} data-testid="carousel-name">
        {current.name}
      </p>
      <p className={styles.ghostPower} data-testid="carousel-power">
        {current.power}
      </p>
      <button className={styles.confirm} onClick={() => onConfirm(current.kind)}>
        Jugar
      </button>
      <p className={styles.hint}>← → para elegir · Enter para jugar · ESC para volver</p>
    </div>
  );
}

/** Dibuja el fantasma con el mismo render que se usa en la partida. */
function GhostPreview({ kind, size }: { kind: GhostKind; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    // El sprite (16 px, más el gorro del naval o las líneas del acelerado) entra en 24 px lógicos:
    // la celda mide un tercio del canvas y el fantasma va en la del medio. Con 48 y 96 px la escala
    // del pixel art es entera (×2 y ×4).
    renderGhost(ctx, 1, 1, size / 3, {
      id: "blinky",
      color: PLAYER_GHOST_COLOR,
      kind,
      direction: "right",
      isHarmless: false,
      isVulnerable: false,
      isWarning: false,
      blinkOn: false,
    });
  }, [kind, size]);

  return <canvas ref={canvasRef} width={size} height={size} />;
}
