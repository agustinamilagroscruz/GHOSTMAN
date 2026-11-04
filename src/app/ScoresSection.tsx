"use client";

import { useEffect, useState } from "react";
import type { GameMode } from "../game/state";
import { MESSAGES } from "./accounts";
import styles from "./Menu.module.css";
import { fetchBoard, fetchPersonalBest, MODE_LABELS, MODES, type BoardRow, type PersonalBest } from "./scores";

interface ScoresSectionProps {
  userId: string;
  onBack: () => void;
}

/** undefined: cargando; null: no se pudo leer. */
interface ScoresData {
  boards: Partial<Record<GameMode, BoardRow[] | null>>;
  personal: PersonalBest | null | undefined;
}

/**
 * Sección Puntajes (HU-38, HU-39): tablero global del modo elegido (← → o A/D) y, debajo, el tablero
 * personal. Se lee cada vez que se entra, así un puntaje recién guardado aparece enseguida.
 */
export function ScoresSection({ userId, onBack }: ScoresSectionProps) {
  const [modeIndex, setModeIndex] = useState(0);
  const [data, setData] = useState<ScoresData>({ boards: {}, personal: undefined });
  const mode = MODES[modeIndex];

  useEffect(() => {
    let active = true;
    Promise.all([...MODES.map((m) => fetchBoard(m)), fetchPersonalBest(userId)]).then((results) => {
      if (!active) return;
      const boards: ScoresData["boards"] = {};
      MODES.forEach((m, index) => (boards[m] = results[index] as BoardRow[] | null));
      setData({ boards, personal: results[MODES.length] as PersonalBest | null });
    });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const count = MODES.length;
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "ArrowLeft":
        case "KeyA":
          event.preventDefault();
          setModeIndex((index) => (index - 1 + count) % count);
          break;
        case "ArrowRight":
        case "KeyD":
          event.preventDefault();
          setModeIndex((index) => (index + 1) % count);
          break;
        case "Escape":
        case "Enter":
        case "NumpadEnter":
          // preventDefault evita que el botón con foco dispare además su clic.
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
  }, [onBack]);

  const board = data.boards[mode];
  const personal = data.personal;

  return (
    <div className={`${styles.screen} ${styles.scores}`} data-testid="scores-section">
      <h1 className={styles.subtitle}>PUNTAJES</h1>
      <div className={styles.modeSwitch}>
        <button className={styles.arrow} aria-label="Modo anterior" onClick={() => setModeIndex((i) => (i + MODES.length - 1) % MODES.length)}>
          ◀
        </button>
        <span className={styles.ghostName} data-testid="scores-mode" data-mode={mode}>
          {MODE_LABELS[mode]}
        </span>
        <button className={styles.arrow} aria-label="Modo siguiente" onClick={() => setModeIndex((i) => (i + 1) % MODES.length)}>
          ▶
        </button>
      </div>

      {board === undefined ? (
        <p className={styles.hint} data-testid="scores-loading">
          Cargando…
        </p>
      ) : board === null ? (
        <p className={styles.formError} data-testid="scores-error">
          {MESSAGES.general}
        </p>
      ) : board.length === 0 ? (
        <p className={styles.welcome} data-testid="scores-empty">
          Todavía no hay puntajes en este modo
        </p>
      ) : (
        <table className={styles.board} data-testid="scores-board">
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Puntaje</th>
            </tr>
          </thead>
          <tbody>
            {board.map((row) => (
              <tr key={row.position} data-testid="scores-row">
                <td data-testid="scores-position">{row.position}</td>
                <td data-testid="scores-username">{row.username}</td>
                <td data-testid="scores-score">{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.personal} data-testid="scores-personal">
        <p className={styles.label}>Tu mejor puntaje</p>
        {personal === null ? (
          <p className={styles.formError}>{MESSAGES.general}</p>
        ) : (
          MODES.map((m) => (
            <p key={m} className={styles.personalRow}>
              <span>{MODE_LABELS[m]}</span>
              <span data-testid={`personal-${m}`}>{personal === undefined ? "…" : (personal[m] ?? "Sin partidas")}</span>
            </p>
          ))
        )}
      </div>

      <button className={styles.confirm} data-testid="scores-section-back" onClick={onBack}>
        Volver
      </button>
      <p className={styles.hint}>← → para cambiar de modo · Esc para volver</p>
    </div>
  );
}
