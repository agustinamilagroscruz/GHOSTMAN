// Incremento 27 — registro (HU-35), inicio de sesión (HU-36) y menú principal (HU-37).
// Suite de navegador: se corre con `npm run verify:ui` (ver scripts/verify/README.md). Trabaja contra
// el proyecto de Supabase de prueba. Los usuarios que crea empiezan con "v27" y un sufijo al azar.
const { APP_URL, SHOTS_DIR, launchBrowser, testCredentials, submitAuthForm, openMainMenu } = require("./helpers");
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const newUsername = () => "v27" + Math.random().toString(36).slice(2, 12);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Llamadas directas a la API de Supabase, salteando el formulario: así se prueba lo que valida el
// servidor por su cuenta.
async function apiSignUp(email, password, data) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data }),
  });
  return res.status;
}
async function apiLogin(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.status;
}

(async () => {
  const browser = await launchBrowser();
  const errors = [];
  const newPage = async () => {
    const page = await browser.newPage({ viewport: { width: 700, height: 800 } });
    page.on("pageerror", e => errors.push(e.message));
    // Los rechazos de Supabase (400, 422, 500 del trigger) y las conexiones cortadas aparecen como errores de red en la consola: son esperados.
    page.on("console", m => { if (m.type() === "error" && !/status of (400|422|500)|net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
    return page;
  };
  const errorOf = (page, field, timeout = 1000) => page.locator(`[data-testid=auth-${field}-error]`).textContent({ timeout }).catch(() => null);
  const formError = page => page.locator("[data-testid=auth-form-error]").textContent({ timeout: 5000 }).catch(() => null);

  // --- Sin sesión (HU-37) ---
  let page = await newPage();
  await page.goto(APP_URL);
  await page.waitForSelector("[data-testid=auth-login]");
  check(!(await page.isVisible("[data-testid=main-menu]")) && !(await page.isVisible("[data-testid=mode-menu]")), "sin sesión se ve el login y no el menú");
  await page.screenshot({ path: SHOTS_DIR + "/27-login.png" });

  // --- Login: campos vacíos ---
  await submitAuthForm(page, {});
  check(await errorOf(page, "username") === "Este campo es obligatorio" && await errorOf(page, "password") === "Este campo es obligatorio",
    "login vacío: un mensaje por campo");
  check(await page.getAttribute("[data-testid=auth-password]", "type") === "password", "login: contraseña oculta");

  // --- Registro: validaciones del formulario (HU-35) ---
  await page.click("[data-testid=auth-switch]");
  await page.waitForSelector("[data-testid=auth-register]");
  await submitAuthForm(page, {});
  check(await errorOf(page, "username") === "Este campo es obligatorio" && await errorOf(page, "password") === "Este campo es obligatorio"
    && await errorOf(page, "confirm") === "Este campo es obligatorio", "registro vacío: un mensaje por campo");
  check(await page.getAttribute("[data-testid=auth-password]", "type") === "password" && await page.getAttribute("[data-testid=auth-confirm]", "type") === "password",
    "registro: contraseña y confirmación ocultas");

  // Valores límite del username; la confirmación distinta evita que se cree una cuenta.
  const tryRegister = async values => { await submitAuthForm(page, { username: "", password: "", confirm: "", ...values }); };
  await tryRegister({ username: "ab", password: "abcd1234", confirm: "x" });
  check(await errorOf(page, "username") === "Debe tener entre 3 y 16 caracteres", "username de 2 caracteres: rechazado");
  await tryRegister({ username: "a".repeat(17), password: "abcd1234", confirm: "x" });
  check(await errorOf(page, "username") === "Debe tener entre 3 y 16 caracteres", "username de 17 caracteres: rechazado");
  await tryRegister({ username: "abc", password: "abcd1234", confirm: "x" });
  check(await errorOf(page, "username") === null, "username de 3 caracteres: aceptado");
  await tryRegister({ username: "a".repeat(16), password: "abcd1234", confirm: "x" });
  check(await errorOf(page, "username") === null, "username de 16 caracteres: aceptado");
  await tryRegister({ username: "ab cd", password: "abcd1234", confirm: "x" });
  check(await errorOf(page, "username") === "Solo letras y números, sin espacios ni símbolos", "username con espacio: rechazado");
  await tryRegister({ username: "ab!cd", password: "abcd1234", confirm: "x" });
  check(await errorOf(page, "username") === "Solo letras y números, sin espacios ni símbolos", "username con símbolo: rechazado");

  // Contraseña
  await tryRegister({ username: "abcd", password: "abc1234", confirm: "abc1234" });
  check(await errorOf(page, "password") === "Debe tener al menos 8 caracteres", "contraseña de 7 caracteres: rechazada");
  await tryRegister({ username: "abcd", password: "abcd1234", confirm: "x" });
  check(await errorOf(page, "password") === null, "contraseña de 8 con letra y número: aceptada");
  await tryRegister({ username: "abcd", password: "abcdefgh", confirm: "abcdefgh" });
  check(await errorOf(page, "password") === "Debe tener al menos una letra y un número", "contraseña sin número: rechazada");
  await tryRegister({ username: "abcd", password: "12345678", confirm: "12345678" });
  check(await errorOf(page, "password") === "Debe tener al menos una letra y un número", "contraseña sin letra: rechazada");
  await tryRegister({ username: "abcd", password: "abcd1234", confirm: "abcd1235" });
  check(await errorOf(page, "confirm") === "Las contraseñas no coinciden", "confirmación distinta: rechazada");
  await page.screenshot({ path: SHOTS_DIR + "/27-registro-errores.png" });

  // --- Registro exitoso ---
  const created = newUsername().replace(/^v27/, "V27"); // con mayúsculas, para ver que se muestra como se registró
  const createdPassword = "clave" + Math.floor(Math.random() * 1e6) + "x";
  await tryRegister({ username: created, password: createdPassword, confirm: createdPassword });
  const registered = await page.waitForSelector("[data-testid=main-menu]", { timeout: 10000 }).then(() => true).catch(() => false);
  check(registered, `registro exitoso (${created}): inicia sesión y lleva al menú principal`);
  check((await page.textContent("[data-testid=main-menu-user]").catch(() => "")).includes(created), "el menú muestra el username como se registró");
  await page.screenshot({ path: SHOTS_DIR + "/27-menu.png" });

  // --- Sesión al recargar (HU-36) ---
  await page.reload();
  check(await page.waitForSelector("[data-testid=main-menu]", { timeout: 10000 }).then(() => true).catch(() => false), "la sesión sigue activa al recargar");

  // --- Navegación del menú principal (HU-37) ---
  check(await page.isVisible("[data-testid=home-play]") && await page.isVisible("[data-testid=home-scores]") && await page.isVisible("[data-testid=home-options]"),
    "menú principal con Jugar, Puntajes y Opciones");
  await page.keyboard.press("Enter");
  check(await page.waitForSelector("[data-testid=mode-menu]").then(() => true), "Jugar lleva a la elección de modo");
  await page.click("[data-testid=menu-back]");
  await page.waitForSelector("[data-testid=main-menu]");
  check(true, "Volver de la elección de modo al menú principal");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  check(await page.waitForSelector("[data-testid=scores-section]").then(() => true), "Puntajes lleva a la sección de tableros");
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-testid=main-menu]");
  check(true, "Esc en Puntajes vuelve al menú principal");
  await page.click("[data-testid=home-options]");
  check(await page.waitForSelector("[data-testid=options-section]").then(() => true), "Opciones lleva a la sección de configuración");
  await page.click("[data-testid=options-back]");
  await page.waitForSelector("[data-testid=main-menu]");
  check(true, "Volver de Opciones al menú principal");
  await page.close();

  // --- Username en uso con otras mayúsculas, sin cuenta parcial ---
  page = await newPage();
  await page.goto(APP_URL);
  await page.waitForSelector("[data-testid=auth-login]");
  await page.click("[data-testid=auth-switch]");
  await page.waitForSelector("[data-testid=auth-register]");
  const otherPassword = "otra" + Math.floor(Math.random() * 1e6) + "y";
  await tryRegister({ username: created.toLowerCase(), password: otherPassword, confirm: otherPassword });
  check(await errorOf(page, "username", 5000) === "Ese nombre de usuario ya está en uso", "username en uso con otras mayúsculas: rechazado junto al campo");
  check(!(await page.isVisible("[data-testid=main-menu]")), "el registro rechazado no inicia sesión");
  check(await apiLogin(`${created.toLowerCase()}@ghostman.invalid`, otherPassword) === 400, "la contraseña del registro rechazado no quedó guardada");

  // --- Rechazos del servidor sin cuenta parcial (el formulario no los deja pasar) ---
  const bad = newUsername();
  check(await apiSignUp(`${bad}@ghostman.invalid`, "abc1234", { username: bad }) === 422 && await apiLogin(`${bad}@ghostman.invalid`, "abc1234") === 400,
    "servidor: contraseña de 7 rechazada y la cuenta no existe");
  const symbol = newUsername();
  check(await apiSignUp(`${symbol}@ghostman.invalid`, "abcd1234", { username: symbol + "!" }) >= 400 && await apiLogin(`${symbol}@ghostman.invalid`, "abcd1234") === 400,
    "servidor: username inválido en el perfil deshace el alta entera (trigger)");
  const mismatch = newUsername();
  check(await apiSignUp(`${mismatch}@ghostman.invalid`, "abcd1234", { username: newUsername() }) >= 400 && await apiLogin(`${mismatch}@ghostman.invalid`, "abcd1234") === 400,
    "servidor: username que no corresponde al email deshace el alta entera");

  // --- Login (HU-36) ---
  await page.click("[data-testid=auth-switch]");
  await page.waitForSelector("[data-testid=auth-login]");
  await submitAuthForm(page, { username: created, password: "incorrecta1" });
  const wrongPassword = await formError(page);
  check(wrongPassword === "Usuario o contraseña incorrectos", "contraseña incorrecta: mensaje único");
  await submitAuthForm(page, { username: newUsername(), password: "cualquiera1" });
  await page.waitForTimeout(1500);
  check(await formError(page) === wrongPassword, "username inexistente: el mismo mensaje");
  await submitAuthForm(page, { username: created, password: createdPassword.toUpperCase() });
  await page.waitForTimeout(1500);
  check(await formError(page) === wrongPassword && !(await page.isVisible("[data-testid=main-menu]")), "la contraseña distingue mayúsculas");

  // Sin conexión (decisión 65): error general, distinto del de credenciales
  await page.route("**/auth/v1/**", route => route.abort());
  await submitAuthForm(page, { username: created, password: createdPassword });
  await page.waitForTimeout(1500);
  check(await formError(page) === "No se pudo conectar con el servidor. Intentá de nuevo", "sin conexión: error general");
  await page.unroute("**/auth/v1/**");

  await submitAuthForm(page, { username: created.toUpperCase(), password: createdPassword });
  check(await page.waitForSelector("[data-testid=main-menu]", { timeout: 10000 }).then(() => true).catch(() => false), "login con el username en mayúsculas: entra");
  await page.close();

  // --- Usuario de prueba de las demás suites (decisión 66) ---
  page = await newPage();
  await openMainMenu(page);
  check((await page.textContent("[data-testid=main-menu-user]")).toLowerCase().includes(testCredentials().username.toLowerCase()), "el usuario de prueba entra al menú principal");
  await page.close();

  check(errors.length === 0, "sin errores en consola" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})();
