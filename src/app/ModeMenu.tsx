"use client";

import { useMemo } from "react";
import { KeyboardMenu } from "./KeyboardMenu";

interface ModeMenuProps {
  onPacmanMode: () => void;
  onGhostmanMode: () => void;
  onBack: () => void;
}

/** Elección del modo de juego (HU-22), a la que se llega con "Jugar" desde el menú principal. */
export function ModeMenu({ onPacmanMode, onGhostmanMode, onBack }: ModeMenuProps) {
  const options = useMemo(
    () => [
      { label: "Modo PacMan", action: onPacmanMode, testId: "menu-pacman" },
      { label: "Modo GhostMan", action: onGhostmanMode, testId: "menu-ghostman" },
      { label: "Volver", action: onBack, testId: "menu-back" },
    ],
    [onPacmanMode, onGhostmanMode, onBack],
  );
  return <KeyboardMenu testId="mode-menu" title="GHOSTMAN" options={options} onEscape={onBack} />;
}
