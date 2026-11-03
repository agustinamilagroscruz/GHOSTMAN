"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./Menu.module.css";

export interface MenuOption {
  label: string;
  action: () => void;
  testId: string;
}

interface KeyboardMenuProps {
  testId: string;
  title: ReactNode;
  subtitle?: ReactNode;
  options: MenuOption[];
  /** Escape: vuelve a la pantalla anterior, si la hay. */
  onEscape?: () => void;
  footer?: ReactNode;
}

/** Menú de opciones: ↑↓ o W/S para elegir, Enter para confirmar, o clic (HU-22, HU-37). */
export function KeyboardMenu({ testId, title, subtitle, options, onEscape, footer }: KeyboardMenuProps) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const count = options.length;
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
          if (!event.repeat) options[selected].action();
          break;
        case "Escape":
          if (onEscape && !event.repeat) {
            event.preventDefault();
            onEscape();
          }
          break;
        case "Space":
          event.preventDefault();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, options, onEscape]);

  return (
    <div className={styles.screen} data-testid={testId}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle}
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
      <p className={styles.hint}>↑ ↓ para elegir · Enter para confirmar{onEscape ? " · Esc para volver" : ""}</p>
      {footer}
    </div>
  );
}
