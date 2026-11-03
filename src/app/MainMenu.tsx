"use client";

import { useMemo } from "react";
import { KeyboardMenu } from "./KeyboardMenu";
import styles from "./Menu.module.css";

interface MainMenuProps {
  username: string;
  onPlay: () => void;
  onScores: () => void;
  onOptions: () => void;
}

/** Menú principal (HU-37): Jugar, Puntajes y Opciones. Solo se llega con sesión iniciada. */
export function MainMenu({ username, onPlay, onScores, onOptions }: MainMenuProps) {
  const options = useMemo(
    () => [
      { label: "Jugar", action: onPlay, testId: "home-play" },
      { label: "Puntajes", action: onScores, testId: "home-scores" },
      { label: "Opciones", action: onOptions, testId: "home-options" },
    ],
    [onPlay, onScores, onOptions],
  );
  return (
    <KeyboardMenu
      testId="main-menu"
      title="GHOSTMAN"
      subtitle={
        <p className={styles.welcome} data-testid="main-menu-user">
          Hola, {username}
        </p>
      }
      options={options}
    />
  );
}
