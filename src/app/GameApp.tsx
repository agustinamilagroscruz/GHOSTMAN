"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { GhostKind } from "../game/ghosts";
import type { GameConfig } from "../game/state";
import { isTestMode, resolveTimings } from "../game/timings";
import { displayName } from "./accounts";
import { getAudioEngine } from "./audio";
import { AuthScreen } from "./AuthScreen";
import { GameCanvas } from "./GameCanvas";
import { GhostCarousel } from "./GhostCarousel";
import { MainMenu } from "./MainMenu";
import { ModeMenu } from "./ModeMenu";
import { PlaceholderSection } from "./PlaceholderSection";
import { ScoresSection } from "./ScoresSection";
import { getSupabase } from "./supabase";
import styles from "./Menu.module.css";

type Screen =
  | { name: "menu" }
  | { name: "modes" }
  | { name: "scores" }
  | { name: "options" }
  | { name: "carousel" }
  | { name: "game"; config: GameConfig; id: number };

/** undefined: todavía se está leyendo la sesión guardada; null: sin sesión. */
type SessionState = Session | null | undefined;

/**
 * Navegación de la aplicación. Sin sesión solo se ve el login o el registro (HU-37); con sesión,
 * el menú principal, la elección de modo, el carrusel de fantasmas y la partida (HU-22, HU-23).
 */
export function GameApp() {
  // Sin las variables de Supabase en el build no hay sesión posible: se muestra el login, que
  // informa el error general al intentar entrar.
  const [session, setSession] = useState<SessionState>(() => (getSupabase() ? undefined : null));
  const [screen, setScreen] = useState<Screen>({ name: "menu" });

  // La sesión persiste en el navegador (HU-36). onAuthStateChange informa primero la sesión guardada
  // y después cada cambio; al entrar con otra cuenta o quedarse sin sesión se vuelve al menú principal.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let userId: string | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next?.user.id !== userId) setScreen({ name: "menu" });
      userId = next?.user.id;
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // El audio recién puede arrancar con una interacción (política de reproducción automática); cada
  // interacción lo reintenta, por si el navegador lo dejó suspendido.
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
  const startGame = useCallback((config: GameConfig) => {
    const testModeAllowed = process.env.NEXT_PUBLIC_MODO_PRUEBA === "1";
    const timings = resolveTimings(window.location.search, testModeAllowed);
    const muted = isTestMode(window.location.search, testModeAllowed);
    setScreen({ name: "game", config: { ...config, timings, muted }, id: Date.now() });
  }, []);
  const goToMenu = useCallback(() => setScreen({ name: "menu" }), []);
  const goToModes = useCallback(() => setScreen({ name: "modes" }), []);
  const goToScores = useCallback(() => setScreen({ name: "scores" }), []);
  const goToOptions = useCallback(() => setScreen({ name: "options" }), []);
  const startPacman = useCallback(() => startGame({ mode: "pacman" }), [startGame]);
  const goToCarousel = useCallback(() => setScreen({ name: "carousel" }), []);

  if (session === undefined) {
    return <div className={styles.screen} data-testid="session-loading" />;
  }
  if (session === null) {
    return <AuthScreen />;
  }

  switch (screen.name) {
    case "menu":
      return (
        <MainMenu username={displayName(session)} onPlay={goToModes} onScores={goToScores} onOptions={goToOptions} />
      );
    case "modes":
      return <ModeMenu onPacmanMode={startPacman} onGhostmanMode={goToCarousel} onBack={goToMenu} />;
    case "scores":
      return <ScoresSection userId={session.user.id} onBack={goToMenu} />;
    case "options":
      return <PlaceholderSection testId="options-section" title="OPCIONES" onBack={goToMenu} />;
    case "carousel":
      return (
        <GhostCarousel
          onConfirm={(kind: GhostKind) => startGame({ mode: "ghostman", playerGhostKind: kind })}
          onBack={goToModes}
        />
      );
    case "game":
      // La key fuerza una partida nueva (estado, bucle y teclado) cada vez que se entra desde el menú.
      return <GameCanvas key={screen.id} config={screen.config} onMainMenu={goToMenu} />;
  }
}
