"use client";

import { useEffect, useState } from "react";
import type { GhostKind } from "../game/ghosts";
import type { GameConfig } from "../game/state";
import { isTestMode, resolveTimings } from "../game/timings";
import { getAudioEngine } from "./audio";
import { GameCanvas } from "./GameCanvas";
import { GhostCarousel } from "./GhostCarousel";
import { MainMenu } from "./MainMenu";

type Screen = { name: "menu" } | { name: "carousel" } | { name: "game"; config: GameConfig; id: number };

/** Navegación entre el menú principal, el carrusel de fantasmas y la partida (HU-22, HU-23). */
export function GameApp() {
  const [screen, setScreen] = useState<Screen>({ name: "menu" });

  // El audio recién puede arrancar con la primera interacción (política de reproducción automática).
  useEffect(() => {
    const unlock = () => getAudioEngine().unlock();
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", unlock);
    return () => {
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  // Modo de prueba (decisión 59): `?modoPrueba=1` solo vale en un build con NEXT_PUBLIC_MODO_PRUEBA=1.
  const startGame = (config: GameConfig) => {
    const testModeAllowed = process.env.NEXT_PUBLIC_MODO_PRUEBA === "1";
    const timings = resolveTimings(window.location.search, testModeAllowed);
    const muted = isTestMode(window.location.search, testModeAllowed);
    setScreen({ name: "game", config: { ...config, timings, muted }, id: Date.now() });
  };
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
