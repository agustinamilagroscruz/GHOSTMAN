import type { AuthError, Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

// Reglas de cuentas (sección 4.9 de la Entrega 01, sección 4.10 de la Entrega 03).
const USERNAME_PATTERN = /^[A-Za-z0-9]{3,16}$/;

export const MESSAGES = {
  required: "Este campo es obligatorio",
  usernameLength: "Debe tener entre 3 y 16 caracteres",
  usernameChars: "Solo letras y números, sin espacios ni símbolos",
  usernameTaken: "Ese nombre de usuario ya está en uso",
  passwordLength: "Debe tener al menos 8 caracteres",
  passwordChars: "Debe tener al menos una letra y un número",
  confirmMismatch: "Las contraseñas no coinciden",
  badCredentials: "Usuario o contraseña incorrectos",
  general: "No se pudo conectar con el servidor. Intentá de nuevo",
} as const;

export type RegisterField = "username" | "password" | "confirm";
export type LoginField = "username" | "password";
export type FieldErrors<F extends string> = Partial<Record<F, string>>;

/** Email sintético (decisión 61): el username en minúsculas, así la unicidad no distingue mayúsculas. */
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@ghostman.invalid`;
}

function usernameError(username: string): string | undefined {
  if (username === "") return MESSAGES.required;
  if (/[^A-Za-z0-9]/.test(username)) return MESSAGES.usernameChars;
  if (username.length < 3 || username.length > 16) return MESSAGES.usernameLength;
  return undefined;
}

function passwordError(password: string): string | undefined {
  if (password === "") return MESSAGES.required;
  if (password.length < 8) return MESSAGES.passwordLength;
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return MESSAGES.passwordChars;
  return undefined;
}

export function validateRegister(values: Record<RegisterField, string>): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {};
  const username = usernameError(values.username);
  const password = passwordError(values.password);
  if (username) errors.username = username;
  if (password) errors.password = password;
  if (values.confirm === "") errors.confirm = MESSAGES.required;
  else if (values.confirm !== values.password) errors.confirm = MESSAGES.confirmMismatch;
  return errors;
}

export function validateLogin(values: Record<LoginField, string>): FieldErrors<LoginField> {
  const errors: FieldErrors<LoginField> = {};
  if (values.username === "") errors.username = MESSAGES.required;
  if (values.password === "") errors.password = MESSAGES.required;
  return errors;
}

/** Resultado de un registro o un login: la sesión, errores por campo o un error general. */
export type AuthResult<F extends string> =
  | { ok: true; session: Session }
  | { ok: false; fieldErrors?: FieldErrors<F>; formError?: string };

// Sin respuesta del servidor (decisión 65): supabase-js devuelve un error sin estado HTTP o con
// estado 0. Un servidor caído o saturado (429, 5xx) también es un error general, no de credenciales.
function isConnectionError(error: AuthError): boolean {
  return error.name === "AuthRetryableFetchError" || !error.status || error.status >= 429;
}

export async function register(username: string, password: string): Promise<AuthResult<RegisterField>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, formError: MESSAGES.general };
  try {
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(username),
      password,
      options: { data: { username } },
    });
    if (error) {
      if (error.code === "user_already_exists") return { ok: false, fieldErrors: { username: MESSAGES.usernameTaken } };
      if (error.code === "weak_password") return { ok: false, fieldErrors: { password: MESSAGES.passwordChars } };
      return { ok: false, formError: MESSAGES.general };
    }
    if (!data.session) return { ok: false, formError: MESSAGES.general };
    return { ok: true, session: data.session };
  } catch {
    return { ok: false, formError: MESSAGES.general };
  }
}

export async function login(username: string, password: string): Promise<AuthResult<LoginField>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, formError: MESSAGES.general };
  // Un username imposible no existe: mismo mensaje que cualquier credencial incorrecta (HU-36).
  if (!USERNAME_PATTERN.test(username)) return { ok: false, formError: MESSAGES.badCredentials };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    if (error) return { ok: false, formError: isConnectionError(error) ? MESSAGES.general : MESSAGES.badCredentials };
    return { ok: true, session: data.session };
  } catch {
    return { ok: false, formError: MESSAGES.general };
  }
}

/** Username como se registró, para mostrarlo; está en los metadatos del usuario. */
export function displayName(session: Session): string {
  const username = session.user.user_metadata?.username;
  return typeof username === "string" ? username : (session.user.email ?? "").split("@")[0];
}
