"use client";

import { useState, type SubmitEvent } from "react";
import {
  login,
  register,
  validateLogin,
  validateRegister,
  type FieldErrors,
  type RegisterField,
} from "./accounts";
import styles from "./Menu.module.css";

type Mode = "login" | "register";
type Field = RegisterField;

const LABELS: Record<Field, string> = {
  username: "Usuario",
  password: "Contraseña",
  confirm: "Confirmar contraseña",
};

/**
 * Inicio de sesión (HU-36) y registro (HU-35). Los errores de validación se muestran junto a su
 * campo; los de credenciales y de conexión, debajo del formulario. La sesión que devuelve Supabase
 * la toma GameApp a través de onAuthStateChange.
 */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [values, setValues] = useState<Record<Field, string>>({ username: "", password: "", confirm: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fields: Field[] = mode === "login" ? ["username", "password"] : ["username", "password", "confirm"];

  const switchMode = (next: Mode) => {
    setMode(next);
    setValues({ username: "", password: "", confirm: "" });
    setFieldErrors({});
    setFormError(null);
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    const errors = mode === "login" ? validateLogin(values) : validateRegister(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setBusy(true);
    const result =
      mode === "login"
        ? await login(values.username, values.password)
        : await register(values.username, values.password);
    setBusy(false);
    if (result.ok) return;
    setFieldErrors(result.fieldErrors ?? {});
    setFormError(result.formError ?? null);
  };

  return (
    <div className={styles.screen} data-testid={mode === "login" ? "auth-login" : "auth-register"}>
      <h1 className={styles.title}>GHOSTMAN</h1>
      <p className={styles.subtitle}>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</p>
      <form className={styles.form} onSubmit={submit} noValidate>
        {fields.map((field, index) => (
          <label key={field} className={styles.field}>
            <span className={styles.label}>{LABELS[field]}</span>
            <input
              className={styles.input}
              name={field}
              data-testid={`auth-${field}`}
              type={field === "username" ? "text" : "password"}
              autoComplete={field === "username" ? "username" : mode === "login" ? "current-password" : "new-password"}
              autoCapitalize="none"
              spellCheck={false}
              autoFocus={index === 0}
              value={values[field]}
              aria-invalid={fieldErrors[field] ? true : undefined}
              onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
            />
            {fieldErrors[field] && (
              <span className={styles.fieldError} data-testid={`auth-${field}-error`}>
                {fieldErrors[field]}
              </span>
            )}
          </label>
        ))}
        {formError && (
          <p className={styles.formError} data-testid="auth-form-error" role="alert">
            {formError}
          </p>
        )}
        <button className={styles.confirm} type="submit" data-testid="auth-submit" disabled={busy}>
          {mode === "login" ? "Entrar" : "Registrarme"}
        </button>
      </form>
      <button
        className={styles.link}
        type="button"
        data-testid="auth-switch"
        onClick={() => switchMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Iniciá sesión"}
      </button>
    </div>
  );
}
