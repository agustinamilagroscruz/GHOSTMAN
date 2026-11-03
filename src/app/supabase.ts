import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * Cliente de Supabase con la URL y la clave pública del proyecto (decisión 60). La sesión queda en
 * el almacenamiento del navegador, así que persiste al recargar (HU-36). Devuelve null si el build
 * no tiene las variables: la aplicación lo muestra como un error general en lugar de romperse.
 */
export function getSupabase(): SupabaseClient | null {
  if (client === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    client = url && key ? createClient(url, key) : null;
  }
  return client;
}
