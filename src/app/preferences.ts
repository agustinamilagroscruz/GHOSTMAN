import { DEFAULT_GHOST_SKIN, DEFAULT_PACMAN_SKIN } from "../game/skins";
import type { SoundChannel } from "../game/sounds";
import { getSupabase } from "./supabase";

// Preferencias del usuario (HU-40, HU-41), guardadas en profiles (decisión 62).
export interface Preferences {
  pacmanSkin: string;
  ghostSkin: string;
  volumes: Record<SoundChannel, number>;
}

/** Los mismos valores por defecto que la base y que el motor de audio del incremento 25. */
export const DEFAULT_PREFERENCES: Preferences = {
  pacmanSkin: DEFAULT_PACMAN_SKIN.id,
  ghostSkin: DEFAULT_GHOST_SKIN.id,
  volumes: { music: 60, effects: 80 },
};

export const VOLUME_STEP = 10;

/** Lee las preferencias del usuario; si no se pueden leer, devuelve las de por defecto. */
export async function fetchPreferences(userId: string): Promise<Preferences> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_PREFERENCES;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("pacman_skin, ghost_skin, music_volume, effects_volume")
      .eq("id", userId)
      .single();
    if (error || !data) return DEFAULT_PREFERENCES;
    return {
      pacmanSkin: data.pacman_skin,
      ghostSkin: data.ghost_skin,
      volumes: { music: data.music_volume, effects: data.effects_volume },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Guarda las preferencias del usuario (solo las propias: RLS). Devuelve si se guardaron. */
export async function savePreferences(userId: string, preferences: Preferences): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        pacman_skin: preferences.pacmanSkin,
        ghost_skin: preferences.ghostSkin,
        music_volume: preferences.volumes.music,
        effects_volume: preferences.volumes.effects,
      })
      .eq("id", userId)
      .select("id");
    return !error && Array.isArray(data) && data.length === 1;
  } catch {
    return false;
  }
}
