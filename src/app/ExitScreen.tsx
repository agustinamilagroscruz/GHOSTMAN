"use client";

import { useEffect } from "react";
import styles from "./Menu.module.css";

/**
 * Pantalla de salida (HU-42, decisión 64): el navegador no deja que una página se cierre sola, así
 * que "Salir del juego" deja todo detenido y en silencio. No cierra la sesión.
 */
export function ExitScreen({ onReturn }: { onReturn: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.code === "Enter" || event.code === "NumpadEnter") && !event.repeat) {
        event.preventDefault();
        onReturn();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onReturn]);

  return (
    <div className={styles.screen} data-testid="exit-screen">
      <h1 className={styles.title}>GHOSTMAN</h1>
      <p className={styles.subtitle}>¡Gracias por jugar!</p>
      <button className={styles.confirm} data-testid="exit-return" onClick={onReturn}>
        Volver a entrar
      </button>
    </div>
  );
}
