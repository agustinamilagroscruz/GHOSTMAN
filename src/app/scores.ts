import type { GameMode } from "../game/state";
import { getSupabase } from "./supabase";

// Tableros de puntaje (HU-38, HU-39; decisiones 62, 63 y 74).
export const BOARD_SIZE = 10;
export const MODES: readonly GameMode[] = ["pacman", "ghostman"];
export const MODE_LABELS: Readonly<Record<GameMode, string>> = { pacman: "Modo PacMan", ghostman: "Modo GhostMan" };

export interface BoardRow {
  position: number;
  username: string;
  score: number;
}

export type PersonalBest = Partial<Record<GameMode, number>>;

export type SubmitResult = { ok: true; best: number; improved: boolean } | { ok: false };

/** Registra el puntaje con la función de la base: es el único camino (decisión 63). */
export async function submitScore(mode: GameMode, score: number): Promise<SubmitResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false };
  try {
    const { data, error } = await supabase.rpc("submit_score", { p_mode: mode, p_score: score });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return { ok: false };
    return { ok: true, best: row.best, improved: row.improved };
  } catch {
    return { ok: false };
  }
}

/**
 * Top 10 del modo: mayor puntaje primero y, en un empate, el que se logró antes. Cada jugador tiene
 * una sola fila por modo. Devuelve null si no se pudo leer.
 */
export async function fetchBoard(mode: GameMode): Promise<BoardRow[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("best_scores")
      .select("score, achieved_at, profiles(username)")
      .eq("mode", mode)
      .order("score", { ascending: false })
      .order("achieved_at", { ascending: true })
      .limit(BOARD_SIZE);
    if (error || !data) return null;
    return data.map((row, index) => {
      const profile = row.profiles as { username?: string } | { username?: string }[] | null;
      const username = (Array.isArray(profile) ? profile[0]?.username : profile?.username) ?? "?";
      return { position: index + 1, username, score: row.score };
    });
  } catch {
    return null;
  }
}

/** Mejor puntaje del usuario en cada modo; un modo sin partidas no aparece. Null si no se pudo leer. */
export async function fetchPersonalBest(userId: string): Promise<PersonalBest | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("best_scores").select("mode, score").eq("user_id", userId);
    if (error || !data) return null;
    const best: PersonalBest = {};
    for (const row of data) best[row.mode as GameMode] = row.score;
    return best;
  } catch {
    return null;
  }
}
