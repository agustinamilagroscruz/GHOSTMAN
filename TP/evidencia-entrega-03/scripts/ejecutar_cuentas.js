// Etapa 4 — Ejecución con script de navegador de los casos de cuentas y opciones que no dependen de ver
// ni de escuchar el juego: CP-106 a CP-123 (HU-35, HU-36, HU-37), CP-138 y CP-139 (HU-41, HU-42) y
// CP-196 a CP-199 (HU-36, HU-39; decisiones 62 y 65).
//
// Requiere el build de prueba servido en BASE_URL (NEXT_PUBLIC_MODO_PRUEBA=1, variables del proyecto de
// Supabase de PRUEBA) y un Chrome (CHROMIUM_PATH). Sigue los pasos de spec_v3.py, imprime lo observado
// y guarda capturas en TP/evidencia-entrega-03/capturas/. Cada caso usa un contexto de navegador nuevo
// (sin sesión ni almacenamiento previo).
//   CHROMIUM_PATH=... node TP/evidencia-entrega-03/scripts/ejecutar_cuentas.js [CP-106 CP-107 ...]
//
// Usernames: <caso><ddmm> (por ejemplo, cp1061111), según la sección 9.2. Un caso de registro ya
// ejecutado ese día falla por username en uso: para repetirlo, usar otro día o borrar el usuario.
// CP-198 y CP-199 juegan partidas del modo Pacman sin mover a Pacman (0 puntos) con usuarios nuevos,
// así que no alteran el top 10 de DP-1. CP-138 y CP-139 cambian los volúmenes del usuario de prueba y
// los dejan otra vez en 60 y 80 al terminar.
const fs = require("fs");
const path = require("path");
const { BASE_URL, APP_URL, launchBrowser, testCredentials } = require("../../../scripts/verify/ui/helpers");

const SHOTS = path.join(__dirname, "..", "capturas");
fs.mkdirSync(SHOTS, { recursive: true });
const now = new Date();
const DDMM = String(now.getDate()).padStart(2, "0") + String(now.getMonth() + 1).padStart(2, "0");
const DD = String(now.getDate()).padStart(2, "0");
const TEST = testCredentials();
const MSG = {
  required: "Este campo es obligatorio",
  usernameLength: "Debe tener entre 3 y 16 caracteres",
  usernameChars: "Solo letras y números, sin espacios ni símbolos",
  usernameTaken: "Ese nombre de usuario ya está en uso",
  passwordLength: "Debe tener al menos 8 caracteres",
  passwordChars: "Debe tener al menos una letra y un número",
  confirmMismatch: "Las contraseñas no coinciden",
  badCredentials: "Usuario o contraseña incorrectos",
  general: "No se pudo conectar con el servidor. Intentá de nuevo",
};

const results = {};
let current;
const check = (cond, msg) => {
  console.log((cond ? "OK   " : "FAIL ") + msg);
  results[current].notes.push((cond ? "" : "FALLA: ") + msg);
  if (!cond) results[current].ok = false;
};

let browser;
// Contexto nuevo por caso. Registra si alguna vez se mostró el login o el menú (para CP-121 y CP-123).
async function newPage() {
  const context = await browser.newContext({ viewport: { width: 700, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const seen = (window.__seen = { login: false, menu: false });
    new MutationObserver(() => {
      if (document.querySelector("[data-testid=auth-login]")) seen.login = true;
      if (document.querySelector("[data-testid=main-menu], [data-testid=mode-menu], [data-testid=scores-section]")) seen.menu = true;
    }).observe(document, { childList: true, subtree: true });
  });
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e.message));
  return page;
}
const seen = page => page.evaluate(() => window.__seen);
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
const visible = (page, testId) => page.isVisible(`[data-testid=${testId}]`);
const text = async (page, testId) => ((await visible(page, testId)) ? (await page.textContent(`[data-testid=${testId}]`)).trim() : null);
const fieldError = (page, field) => text(page, `auth-${field}-error`);
const formError = page => text(page, "auth-form-error");

async function openLogin(page, url = BASE_URL) {
  await page.goto(url);
  await page.waitForSelector("[data-testid=auth-login]");
}
async function openRegister(page, url = BASE_URL) {
  await openLogin(page, url);
  await page.click("[data-testid=auth-switch]");
  await page.waitForSelector("[data-testid=auth-register]");
}
async function fill(page, values) {
  for (const [field, value] of Object.entries(values)) await page.fill(`[data-testid=auth-${field}]`, value);
}
// Envía el formulario y espera una respuesta: el menú, un error de campo o un error general.
async function submit(page) {
  await page.click("[data-testid=auth-submit]");
  await page.waitForSelector("[data-testid=main-menu], [data-testid$=-error]", { timeout: 15000 });
  await page.waitForTimeout(300);
}
// Texto de un botón de menú, sin el marcador «▶» de la opción seleccionada.
const label = s => s.replace(/^\s*▶\s*/, "").trim();
const inMenu = page => visible(page, "main-menu");
const greeting = page => text(page, "main-menu-user");
async function logout(page) {
  await page.click("[data-testid=home-options]");
  await page.waitForSelector("[data-testid=options-section]");
  await page.click("[data-testid=options-logout]");
  await page.waitForSelector("[data-testid=auth-login]");
}
async function loginAs(page, username, password) {
  await fill(page, { username, password });
  await submit(page);
}

const CASES = {
  // ---------------- HU-35 · Registro
  async "CP-106"(page) {
    const user = `cp106${DDMM}`;
    await openRegister(page);
    await fill(page, { username: user, password: "Prueba2026", confirm: "Prueba2026" });
    check(!(await page.isVisible("[data-testid$=-error]")), `paso 1: ${user} / Prueba2026 / Prueba2026 aceptados, sin errores`);
    await submit(page);
    const labels = (await page.locator("[data-testid=main-menu] [data-testid^=home-]").allTextContents()).map(label);
    check((await inMenu(page)) && (await greeting(page)) === `Hola, ${user}` && labels.join("|") === "Jugar|Puntajes|Opciones",
      `paso 2: menú principal con «${await greeting(page)}» y ${labels.map(l => `«${l}»`).join(", ")}`);
    await shot(page, "CP-106-paso2");
  },
  async "CP-107"(page) {
    await openRegister(page);
    await fill(page, { username: "ab", password: "Prueba2026", confirm: "Prueba2026" });
    await submit(page);
    check((await fieldError(page, "username")) === MSG.usernameLength && !(await inMenu(page)), `paso 1: «ab» → «${await fieldError(page, "username")}», sin cuenta`);
    await fill(page, { username: "abcdefghijklmnopq" });
    await submit(page);
    check((await fieldError(page, "username")) === MSG.usernameLength && (await visible(page, "auth-register")),
      `paso 2: «abcdefghijklmnopq» (17) → «${await fieldError(page, "username")}», sigue en «Crear cuenta»`);
    await shot(page, "CP-107-paso2");
  },
  async "CP-108"(page) {
    const short = `c${DD}`, long = `cp108${DDMM}abcdefg`;
    await openRegister(page);
    await fill(page, { username: short, password: "Prueba2026", confirm: "Prueba2026" });
    await submit(page);
    check((await inMenu(page)) && (await greeting(page)) === `Hola, ${short}`, `paso 1: «${short}» (3) → menú con «${await greeting(page)}»`);
    await logout(page);
    await page.click("[data-testid=auth-switch]");
    await fill(page, { username: long, password: "Prueba2026", confirm: "Prueba2026" });
    await submit(page);
    check(long.length === 16 && (await inMenu(page)) && (await greeting(page)) === `Hola, ${long}`, `paso 2: «${long}» (${long.length}) → menú con «${await greeting(page)}»`);
    await shot(page, "CP-108-paso2");
  },
  async "CP-109"(page) {
    await openRegister(page);
    await fill(page, { username: "cp 109", password: "Prueba2026", confirm: "Prueba2026" });
    await submit(page);
    check((await fieldError(page, "username")) === MSG.usernameChars && !(await inMenu(page)), `paso 1: «cp 109» → «${await fieldError(page, "username")}»`);
    await fill(page, { username: "cp_109!" });
    await submit(page);
    check((await fieldError(page, "username")) === MSG.usernameChars && !(await inMenu(page)), `paso 2: «cp_109!» → «${await fieldError(page, "username")}»`);
    await shot(page, "CP-109-paso2");
  },
  async "CP-110"(page) {
    const upper = TEST.username.toUpperCase();
    await openRegister(page);
    await fill(page, { username: upper, password: "Prueba2026", confirm: "Prueba2026" });
    check(!(await page.isVisible("[data-testid$=-error]")), `paso 1: «${upper}» / Prueba2026 aceptados`);
    await submit(page);
    check((await fieldError(page, "username")) === MSG.usernameTaken && !(await inMenu(page)), `paso 2: «${upper}» → «${await fieldError(page, "username")}», sin sesión`);
    await shot(page, "CP-110-paso2");
  },
  async "CP-111"(page) {
    const user = `cp111${DDMM}`;
    await openRegister(page);
    await fill(page, { username: user, password: "Prueba1", confirm: "Prueba1" });
    await submit(page);
    check((await fieldError(page, "password")) === MSG.passwordLength && !(await inMenu(page)), `paso 1: «Prueba1» (7) → «${await fieldError(page, "password")}»`);
    await fill(page, { password: "Prueba12", confirm: "Prueba12" });
    await submit(page);
    check((await inMenu(page)) && (await greeting(page)) === `Hola, ${user}`, `paso 2: «Prueba12» (8) → cuenta creada, menú con «${await greeting(page)}»`);
    await shot(page, "CP-111-paso2");
  },
  async "CP-112"(page) {
    const user = `cp112${DDMM}`;
    await openRegister(page);
    await fill(page, { username: user, password: "PruebaGhost", confirm: "PruebaGhost" });
    await submit(page);
    check((await fieldError(page, "password")) === MSG.passwordChars && !(await inMenu(page)), `paso 1: «PruebaGhost» → «${await fieldError(page, "password")}»`);
    await fill(page, { password: "20261110", confirm: "20261110" });
    await submit(page);
    check((await fieldError(page, "password")) === MSG.passwordChars && !(await inMenu(page)), `paso 2: «20261110» → «${await fieldError(page, "password")}»`);
    await shot(page, "CP-112-paso2");
  },
  async "CP-113"(page) {
    const user = `cp113${DDMM}`;
    await openRegister(page);
    await fill(page, { username: user, password: "Prueba2026", confirm: "prueba2026" });
    check(!(await page.isVisible("[data-testid$=-error]")), "paso 1: campos aceptados");
    await submit(page);
    check((await fieldError(page, "confirm")) === MSG.confirmMismatch && !(await inMenu(page)), `paso 2: «Prueba2026» / «prueba2026» → «${await fieldError(page, "confirm")}» junto a «Confirmar contraseña»`);
    await shot(page, "CP-113-paso2");
  },
  async "CP-114"(page) {
    await openRegister(page);
    await submit(page);
    const errs1 = [await fieldError(page, "username"), await fieldError(page, "password"), await fieldError(page, "confirm")];
    check(errs1.every(e => e === MSG.required), `paso 1: errores ${errs1.map(e => `«${e}»`).join(", ")}`);
    await fill(page, { username: `cp114${DDMM}` });
    await submit(page);
    const errs2 = [await fieldError(page, "username"), await fieldError(page, "password"), await fieldError(page, "confirm")];
    check(errs2[0] === null && errs2[1] === MSG.required && errs2[2] === MSG.required && !(await inMenu(page)),
      `paso 2: Usuario ${errs2[0] ?? "sin error"}, Contraseña «${errs2[1]}», Confirmar «${errs2[2]}»; sin cuenta`);
    await shot(page, "CP-114-paso2");
  },
  async "CP-115"(page) {
    await openRegister(page);
    await fill(page, { password: "Prueba2026", confirm: "Prueba2026" });
    const types1 = [await page.getAttribute("[data-testid=auth-password]", "type"), await page.getAttribute("[data-testid=auth-confirm]", "type")];
    const shown1 = (await page.locator("[data-testid=auth-register]").innerText()).includes("Prueba2026");
    check(types1.every(t => t === "password") && !shown1, `paso 1: campos de tipo ${types1.join(" y ")}; el texto no aparece en pantalla`);
    await shot(page, "CP-115-paso1");
    await page.click("[data-testid=auth-switch]");
    await fill(page, { password: "Prueba2026" });
    const type2 = await page.getAttribute("[data-testid=auth-password]", "type");
    const shown2 = (await page.locator("[data-testid=auth-login]").innerText()).includes("Prueba2026");
    check(type2 === "password" && !shown2, `paso 2: en «Iniciar sesión» el campo es de tipo ${type2}; el texto no aparece en pantalla`);
    await shot(page, "CP-115-paso2");
  },
  async "CP-116"(page) {
    const user = `cp116${DDMM}`;
    await openRegister(page);
    await fill(page, { username: user, password: "Prueba1", confirm: "Prueba1" });
    await submit(page);
    check((await fieldError(page, "password")) === MSG.passwordLength, `paso 1: «Prueba1» → «${await fieldError(page, "password")}»`);
    await page.click("[data-testid=auth-switch]");
    await loginAs(page, user, "Prueba1");
    check((await formError(page)) === MSG.badCredentials && !(await inMenu(page)), `paso 2: login → «${await formError(page)}»`);
    await page.click("[data-testid=auth-switch]");
    await fill(page, { username: user, password: "Prueba2026", confirm: "Prueba2026" });
    await submit(page);
    check((await inMenu(page)) && (await greeting(page)) === `Hola, ${user}`, `paso 3: mismo username con «Prueba2026» → cuenta creada, menú con «${await greeting(page)}»`);
    await shot(page, "CP-116-paso3");
  },
  // ---------------- HU-36 · Inicio de sesión
  async "CP-117"(page) {
    await openLogin(page);
    await fill(page, { username: TEST.username, password: TEST.password });
    check(!(await page.isVisible("[data-testid$=-error]")), "paso 1: campos aceptados");
    await submit(page);
    check((await inMenu(page)) && (await greeting(page)) === `Hola, ${TEST.username}`, `paso 2: menú con «${await greeting(page)}»`);
    await shot(page, "CP-117-paso2");
  },
  async "CP-118"(page) {
    await openLogin(page);
    await loginAs(page, TEST.username, "Incorrecta1");
    check(!(await inMenu(page)) && (await visible(page, "auth-login")), "paso 1: no se inicia sesión, sigue en «Iniciar sesión»");
    const fieldErrs = await page.locator("[data-testid$=-error]:not([data-testid=auth-form-error])").count();
    check((await formError(page)) === MSG.badCredentials && fieldErrs === 0, `paso 2: «${await formError(page)}», sin marcar ningún campo`);
    await shot(page, "CP-118-paso2");
  },
  async "CP-119"(page) {
    await openLogin(page);
    await loginAs(page, `noexiste${DDMM}`, "Prueba2026");
    check(!(await inMenu(page)), `paso 1: «noexiste${DDMM}» no inicia sesión`);
    check((await formError(page)) === MSG.badCredentials, `paso 2: «${await formError(page)}», el mismo de CP-118`);
    await shot(page, "CP-119-paso2");
  },
  async "CP-120"(page) {
    const swapped = [...TEST.password].map(c => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase())).join("");
    await openLogin(page);
    await loginAs(page, TEST.username.toUpperCase(), TEST.password);
    check((await inMenu(page)) && (await greeting(page)) === `Hola, ${TEST.username}`, `paso 1: «${TEST.username.toUpperCase()}» → menú con «${await greeting(page)}»`);
    await logout(page);
    await loginAs(page, TEST.username, swapped);
    check(swapped !== TEST.password && (await formError(page)) === MSG.badCredentials && !(await inMenu(page)),
      `paso 2: contraseña con las mayúsculas invertidas → «${await formError(page)}»`);
    await shot(page, "CP-120-paso2");
  },
  async "CP-121"(page) {
    await openLogin(page);
    await loginAs(page, TEST.username, TEST.password);
    await page.reload();
    await page.waitForSelector("[data-testid=main-menu], [data-testid=auth-login]");
    await page.waitForTimeout(1500);
    const s = await seen(page);
    check(!s.login, "paso 1: al recargar no se mostró la pantalla «Iniciar sesión»");
    check((await inMenu(page)) && (await greeting(page)) === `Hola, ${TEST.username}`, `paso 2: menú con «${await greeting(page)}»`);
    await shot(page, "CP-121-paso2");
  },
  // ---------------- HU-37 · Menú principal
  async "CP-122"(page) {
    await openLogin(page);
    await loginAs(page, TEST.username, TEST.password);
    const labels = (await page.locator("[data-testid=main-menu] [data-testid^=home-]").allTextContents()).map(label);
    check(labels.join("|") === "Jugar|Puntajes|Opciones", `paso 1: botones ${labels.map(l => `«${l}»`).join(", ")}`);
    await page.keyboard.press("Enter");
    await page.waitForSelector("[data-testid=mode-menu]", { timeout: 5000 }).catch(() => {});
    const modes = (await page.locator("[data-testid=mode-menu] [data-testid^=menu-]").allTextContents()).map(label);
    await page.click("[data-testid=menu-back]");
    await page.waitForSelector("[data-testid=main-menu]");
    check(modes.join("|") === "Modo PacMan|Modo GhostMan|Volver" && (await inMenu(page)), `paso 2: Enter en «Jugar» → ${modes.map(l => `«${l}»`).join(", ")}; «Volver» regresa al menú`);
    await page.click("[data-testid=home-scores]");
    const scoresTitle = await page.waitForSelector("[data-testid=scores-section] h1").then(h => h.textContent());
    await page.click("[data-testid=scores-section-back]");
    await page.waitForSelector("[data-testid=main-menu]");
    check(scoresTitle === "PUNTAJES" && (await inMenu(page)), `paso 3: «Puntajes» → «${scoresTitle}»; «Volver» regresa al menú`);
    await page.click("[data-testid=home-options]");
    const optionsTitle = await page.waitForSelector("[data-testid=options-section] h1").then(h => h.textContent());
    await page.keyboard.press("Escape");
    await page.waitForSelector("[data-testid=main-menu]", { timeout: 5000 }).catch(() => {});
    check(optionsTitle === "OPCIONES" && (await inMenu(page)), `paso 4: «Opciones» → «${optionsTitle}»; Esc regresa al menú`);
  },
  async "CP-123"(page) {
    await openLogin(page);
    await loginAs(page, TEST.username, TEST.password);
    await logout(page);
    await page.evaluate(() => { window.__seen.menu = false; });
    check(await visible(page, "auth-login"), "paso 1: «Cerrar sesión» → pantalla «Iniciar sesión»");
    await page.reload();
    await page.waitForSelector("[data-testid=auth-login]");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    const s2 = await seen(page);
    check((await visible(page, "auth-login")) && (await fieldError(page, "username")) === MSG.required && !s2.menu,
      `paso 2: tras recargar, Esc y Enter → sigue en «Iniciar sesión» con «${await fieldError(page, "username")}»`);
    await page.goBack().catch(() => {});
    await page.waitForTimeout(1500);
    const s3 = await seen(page).catch(() => ({ menu: false }));
    const where = (await page.isVisible("[data-testid=auth-login]").catch(() => false)) ? "«Iniciar sesión»" : page.url();
    check(!s3.menu && !(await page.isVisible("[data-testid=main-menu], [data-testid=mode-menu], [data-testid=scores-section]").catch(() => false)),
      `paso 3: con Atrás queda en ${where}; nunca se mostró el menú, la elección de modo ni «PUNTAJES»`);
    await shot(page, "CP-123-paso3");
  },
  // ---------------- HU-41 y HU-42 · Volumen y cerrar sesión
  async "CP-138"(page) {
    await openLogin(page);
    await loginAs(page, TEST.username, TEST.password);
    await setVolumes(page, 30, 50);
    const saved = await page.waitForSelector("[data-testid=options-save][data-status=saved]", { timeout: 5000 }).then(() => true).catch(() => false);
    const v1 = await volumes(page);
    check(v1.join() === "30,50" && saved, `paso 1: «Música» ${v1[0]} y «Efectos» ${v1[1]}${saved ? ", «Guardado»" : ", sin «Guardado»"}`);
    await shot(page, "CP-138-paso1");
    await page.click("[data-testid=options-logout]");
    await page.waitForSelector("[data-testid=auth-login]");
    await loginAs(page, TEST.username, TEST.password);
    await openOptions(page);
    const v2 = await volumes(page);
    check(v2.join() === "30,50", `paso 2: tras cerrar e iniciar sesión, «Música» ${v2[0]} y «Efectos» ${v2[1]}`);
    await shot(page, "CP-138-paso2");
  },
  async "CP-139"(page) {
    await openLogin(page);
    await loginAs(page, TEST.username, TEST.password);
    const before = await snapshot(page);
    const nonDefault = before.volumes.join() !== "60,80" || before.skins.join() !== "Clásico ✓|Clásica ✓";
    check(before.personal.some(p => p !== "Sin partidas") && nonDefault, `paso 1: anotado ${JSON.stringify(before)}`);
    await page.click("[data-testid=options-logout]");
    await page.waitForSelector("[data-testid=auth-login]");
    await page.evaluate(() => { window.__seen.menu = false; });
    await page.reload();
    await page.waitForSelector("[data-testid=auth-login]");
    await page.waitForTimeout(1000);
    check((await visible(page, "auth-login")) && !(await seen(page)).menu, "paso 2: «Cerrar sesión» → «Iniciar sesión»; al recargar no se muestra el menú");
    await loginAs(page, TEST.username, TEST.password);
    const after = await snapshot(page);
    check(JSON.stringify(after) === JSON.stringify(before), `paso 3: al volver a entrar, ${JSON.stringify(after)}`);
    await shot(page, "CP-139-paso3");
  },
  // ---------------- HU-36 y HU-39 · Sin datos y sin conexión
  async "CP-196"(page) {
    await openLogin(page);
    await submit(page);
    const e1 = [await fieldError(page, "username"), await fieldError(page, "password")];
    check(e1.every(e => e === MSG.required), `paso 1: Usuario «${e1[0]}», Contraseña «${e1[1]}»`);
    await fill(page, { username: TEST.username });
    await submit(page);
    const e2 = [await fieldError(page, "username"), await fieldError(page, "password")];
    check(e2[0] === null && e2[1] === MSG.required && !(await inMenu(page)), `paso 2: Usuario ${e2[0] ?? "sin error"}, Contraseña «${e2[1]}»; sin sesión`);
    await shot(page, "CP-196-paso2");
  },
  async "CP-197"(page) {
    await openLogin(page);
    await page.context().setOffline(true);
    await loginAs(page, TEST.username, TEST.password);
    check((await formError(page)) === MSG.general && !(await inMenu(page)), `paso 1: login sin conexión → «${await formError(page)}»`);
    await shot(page, "CP-197-paso1");
    await page.click("[data-testid=auth-switch]");
    await fill(page, { username: `cp197${DDMM}`, password: "Prueba2026", confirm: "Prueba2026" });
    await submit(page);
    check((await formError(page)) === MSG.general && !(await inMenu(page)), `paso 2: registro sin conexión → «${await formError(page)}»`);
    await page.context().setOffline(false);
    await page.click("[data-testid=auth-switch]");
    await loginAs(page, TEST.username, TEST.password);
    check((await inMenu(page)) && (await greeting(page)) === `Hola, ${TEST.username}`, `paso 3: con la red restablecida → menú con «${await greeting(page)}»`);
  },
  async "CP-198"(page) {
    const user = `cp198${DDMM}`;
    await registerAndPlay(page, user);
    await page.context().setOffline(true);
    const final = await waitGameOver(page);
    await page.waitForSelector("[data-testid=score-save][data-status=failed]", { timeout: 20000 }).catch(() => {});
    const failed = (await page.getAttribute("[data-testid=score-save]", "data-status")) === "failed";
    const failText = (await page.textContent("[data-testid=score-save]")).trim();
    check(failed && failText.includes("No se pudo guardar el puntaje") && (await visible(page, "score-save-retry")),
      `paso 1: Game Over con puntaje ${final}, «${failText}» y el botón «Reintentar»`);
    await shot(page, "CP-198-paso1");
    await page.context().setOffline(false);
    await page.click("[data-testid=score-save-retry]");
    await page.waitForSelector("[data-testid=score-save-result]", { timeout: 15000 }).catch(() => {});
    const r = await text(page, "score-save-result");
    check(r === "¡Nuevo récord personal!", `paso 2: con la red restablecida, «Reintentar» → «${r}»`);
    await shot(page, "CP-198-paso2");
    await page.click("text=Menú principal");
    const personal = await personalBest(page);
    check(personal[0] === String(final), `paso 3: «Tu mejor puntaje» muestra ${personal[0]} en «Modo PacMan»`);
  },
  async "CP-199"(page) {
    const user = `cp199${DDMM}`;
    await registerAndPlay(page, user);
    const s1 = await waitGameOver(page);
    await page.waitForSelector("[data-testid=score-save-result]", { timeout: 15000 }).catch(() => {});
    const r1 = await text(page, "score-save-result");
    check(s1 === 0 && r1 === "¡Nuevo récord personal!", `paso 1: Game Over con ${s1} y «${r1}»`);
    await page.click("text=Menú principal");
    const p1 = await personalBest(page);
    check(p1[0] === "0", `paso 2: «Tu mejor puntaje» en «Modo PacMan»: «${p1[0]}»`);
    await page.click("[data-testid=scores-section-back]");
    await page.waitForSelector("[data-testid=main-menu]");
    await startPacman(page);
    const s2 = await waitGameOver(page);
    await page.waitForSelector("[data-testid=score-save-result]", { timeout: 15000 }).catch(() => {});
    const r2 = await text(page, "score-save-result");
    await shot(page, "CP-199-paso3");
    await page.click("text=Menú principal");
    const p2 = await personalBest(page);
    check(s2 === 0 && r2 === "Puntaje guardado" && p2[0] === "0", `paso 3: Game Over con ${s2}, «${r2}»; «Tu mejor puntaje» sigue en ${p2[0]}`);
  },
};

// --- Opciones ---
async function openOptions(page) {
  await page.click("[data-testid=home-options]");
  await page.waitForSelector("[data-testid=options-section]");
  await page.waitForTimeout(800); // preferencias leídas
}
const volumes = async page => [Number(await text(page, "options-music-value")), Number(await text(page, "options-effects-value"))];
async function goToRow(page, target) {
  for (let i = 0; i < 8; i++) {
    const sel = await page.locator("[data-testid=options-section] [aria-current=true]").getAttribute("data-testid");
    if (sel === `options-${target}`) return;
    await page.keyboard.press("ArrowDown");
  }
}
async function setVolumes(page, music, effects) {
  await openOptions(page);
  for (const [channel, target] of [["music", music], ["effects", effects]]) {
    await goToRow(page, channel);
    for (let i = 0; i < 12; i++) {
      const v = (await volumes(page))[channel === "music" ? 0 : 1];
      if (v === target) break;
      await page.keyboard.press(v > target ? "ArrowLeft" : "ArrowRight");
    }
  }
}
async function snapshot(page) {
  const personal = await personalBest(page);
  await page.click("[data-testid=scores-section-back]");
  await page.waitForSelector("[data-testid=main-menu]");
  await openOptions(page);
  const skins = [await text(page, "options-pacmanSkin-name"), await text(page, "options-ghostSkin-name")];
  return { personal, skins, volumes: await volumes(page) };
}

// --- Puntajes y partidas ---
async function personalBest(page) {
  await page.waitForSelector("[data-testid=main-menu]");
  await page.click("[data-testid=home-scores]");
  await page.waitForFunction(() => !document.querySelector("[data-testid^=personal-]")?.textContent.includes("…"));
  return [await text(page, "personal-pacman"), await text(page, "personal-ghostman")];
}
async function startPacman(page) {
  await page.click("[data-testid=home-play]");
  await page.waitForSelector("[data-testid=mode-menu]");
  await page.click("[data-testid=menu-pacman]");
  await page.waitForSelector("canvas");
}
async function registerAndPlay(page, user) {
  await openRegister(page, APP_URL); // modo de prueba: sin cuenta regresiva (no cambia el puntaje)
  await fill(page, { username: user, password: "Prueba2026", confirm: "Prueba2026" });
  await submit(page);
  if (!(await inMenu(page))) throw new Error(`no se pudo registrar ${user}: ${await page.textContent("body")}`);
  await startPacman(page);
}
async function waitGameOver(page) {
  await page.waitForSelector("text=Game Over", { timeout: 300000 });
  return Number((await page.textContent("[data-testid=final-score]")).replace(/\D/g, ""));
}

(async () => {
  const only = process.argv.slice(2);
  browser = await launchBrowser();
  for (const [id, run] of Object.entries(CASES)) {
    if (only.length && !only.includes(id)) continue;
    current = id;
    results[id] = { ok: true, notes: [] };
    console.log(`\n=== ${id} ===`);
    const page = await newPage();
    try {
      await run(page);
    } catch (e) {
      check(false, `error al ejecutar: ${e.message.split("\n")[0]}`);
      await shot(page, `${id}-error`).catch(() => {});
    }
    if (page.errors.length) console.log(`     errores de la página: ${page.errors.join(" | ")}`);
    await page.context().close();
  }
  // Los volúmenes del usuario de prueba vuelven a los de por defecto (CP-138 y CP-139 los cambian).
  if (!only.length || only.some(id => ["CP-138", "CP-139"].includes(id))) {
    const page = await newPage();
    await openLogin(page);
    await loginAs(page, TEST.username, TEST.password);
    await setVolumes(page, 60, 80);
    await page.waitForTimeout(1500);
    console.log(`\nVolúmenes del usuario de prueba restaurados: ${(await volumes(page)).join(" y ")}`);
    await page.context().close();
  }
  console.log("\nRESUMEN " + JSON.stringify(Object.fromEntries(Object.entries(results).map(([id, r]) => [id, r.ok ? "Aprobado" : "Fallido"]))));
  await browser.close();
  process.exit(Object.values(results).every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
