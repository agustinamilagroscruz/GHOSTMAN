"use client";

import { useEffect, useRef, useState } from "react";
import type { GameMode } from "../game/state";
import styles from "./GameCanvas.module.css";
import { submitScore, type SubmitResult } from "./scores";

type Status = { name: "saving" } | { name: "saved"; improved: boolean } | { name: "failed" };

/**
 * Guarda el puntaje final al aparecer la pantalla de cierre (HU-39), una vez por partida: la pantalla
 * se vuelve a montar con cada partida nueva. Sin conexión ofrece reintentar, sin cola local
 * (decisión 65).
 */
export function ScoreSaver({ mode, score }: { mode: GameMode; score: number }) {
  const [status, setStatus] = useState<Status>({ name: "saving" });
  // El modo estricto de React monta el efecto dos veces: el envío en curso se reutiliza.
  const pending = useRef<Promise<SubmitResult> | null>(null);

  const apply = (result: SubmitResult) =>
    setStatus(result.ok ? { name: "saved", improved: result.improved } : { name: "failed" });

  useEffect(() => {
    let active = true;
    pending.current ??= submitScore(mode, score);
    pending.current.then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [mode, score]);

  const retry = () => {
    setStatus({ name: "saving" });
    pending.current = submitScore(mode, score);
    pending.current.then(apply);
  };

  return (
    <div className={styles.saveStatus} data-testid="score-save" data-status={status.name}>
      {status.name === "saving" && <span>Guardando puntaje…</span>}
      {status.name === "saved" && (
        <span data-testid="score-save-result" data-improved={status.improved}>
          {status.improved ? "¡Nuevo récord personal!" : "Puntaje guardado"}
        </span>
      )}
      {status.name === "failed" && (
        <>
          <span className={styles.saveError}>No se pudo guardar el puntaje</span>
          <button className={styles.menuButton} data-testid="score-save-retry" onClick={retry}>
            Reintentar
          </button>
        </>
      )}
    </div>
  );
}
