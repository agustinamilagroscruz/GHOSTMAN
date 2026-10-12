"use client";

import { useState } from "react";
import type { GhostKind } from "../game/ghosts";
import type { GameConfig } from "../game/state";
import { GameCanvas } from "./GameCanvas";
import { GhostCarousel } from "./GhostCarousel";
import { MainMenu } from "./MainMenu";

type Screen = { name: "menu" } | { name: "carousel" } | { name: "game"; config: GameConfig; id: number };

/** Navegación entre el menú principal, el carrusel de fantasmas y la partida (HU-22, HU-23). */
export function GameApp() {
  const [screen, setScreen] = useState<Screen>({ name: "menu" });

  const startGame = (config: GameConfig) => setScreen({ name: "game", config, id: Date.now() });
  const goToMenu = () => setScreen({ name: "menu" });

  switch (screen.name) {
    case "menu":
      return (
        <MainMenu
          onPacmanMode={() => startGame({ mode: "pacman" })}
          onGhostmanMode={() => setScreen({ name: "carousel" })}
        />
      );
    case "carousel":
      return (
        <GhostCarousel
          onConfirm={(kind: GhostKind) => startGame({ mode: "ghostman", playerGhostKind: kind })}
          onBack={goToMenu}
        />
      );
    case "game":
      // La key fuerza una partida nueva (estado, bucle y teclado) cada vez que se entra desde el menú.
      return <GameCanvas key={screen.id} config={screen.config} onMainMenu={goToMenu} />;
  }
}
