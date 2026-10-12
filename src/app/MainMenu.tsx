"use client";

import { useEffect, useState } from "react";
import styles from "./Menu.module.css";

interface MainMenuProps {
  onPacmanMode: () => void;
  onGhostmanMode: () => void;
}

/** Menú principal (HU-22): ↑↓ o W/S para elegir, Enter para confirmar, o clic. */
export function MainMenu({ onPacmanMode, onGhostmanMode }: MainMenuProps) {
  const options = [
    { label: "Modo PacMan", action: onPacmanMode, testId: "menu-pacman" },
    { label: "Modo GhostMan", action: onGhostmanMode, testId: "menu-ghostman" },
  ];
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const actions = [onPacmanMode, onGhostmanMode];
    const count = actions.length;
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          event.preventDefault();
          setSelected((index) => (index - 1 + count) % count);
          break;
        case "ArrowDown":
        case "KeyS":
          event.preventDefault();
          setSelected((index) => (index + 1) % count);
          break;
        case "Enter":
        case "NumpadEnter":
          // preventDefault evita que el botón con foco dispare además su clic.
          event.preventDefault();
          if (!event.repeat) actions[selected]();
          break;
        case "Space":
          event.preventDefault();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, onPacmanMode, onGhostmanMode]);

  return (
    <div className={styles.screen} data-testid="main-menu">
      <h1 className={styles.title}>GHOSTMAN</h1>
      <ul className={styles.options}>
        {options.map((option, index) => (
          <li key={option.label}>
            <button
              className={`${styles.option} ${index === selected ? styles.optionSelected : ""}`}
              data-testid={option.testId}
              aria-current={index === selected}
              // Solo un movimiento real del mouse cambia la selección: si la página carga con el
              // puntero ya apoyado sobre una opción, el navegador dispara mouseenter sin que el
              // jugador mueva nada, y Enter terminaba eligiendo esa opción (DEF-002).
              onMouseMove={() => {
                if (index !== selected) setSelected(index);
              }}
              onClick={option.action}
            >
              <span className={styles.marker}>{index === selected ? "▶" : ""}</span>
              {option.label}
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.hint}>↑ ↓ para elegir · Enter para confirmar</p>
    </div>
  );
}
