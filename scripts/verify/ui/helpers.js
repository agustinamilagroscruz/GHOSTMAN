// Configuración común de las suites de navegador.
//   BASE_URL      URL de la aplicación (por defecto http://localhost:3000)
//   CHROMIUM_PATH ejecutable de Chromium; si no se indica, usa el que instala
//                 `npx playwright-core install chromium`
//   SHOTS_DIR     carpeta para las capturas (por defecto, una carpeta temporal)
//   GHOSTMAN_TEST_USER, GHOSTMAN_TEST_PASSWORD
//                 usuario de prueba del proyecto de Supabase de prueba (decisión 66); se leen
//                 del entorno o de .env.local
// Las suites abren APP_URL, con el modo de prueba (decisión 59): sin cuenta regresiva ni
// "¡Listo!". Requiere un build de prueba: `NEXT_PUBLIC_MODO_PRUEBA=1 npm run build`.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright-core");

// Variables de .env.local que no estén ya en el entorno (el archivo no se sube al repositorio).
const envFile = path.join(__dirname, "..", "..", "..", ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const APP_URL = `${BASE_URL}/?modoPrueba=1`;
const SHOTS_DIR = process.env.SHOTS_DIR || path.join(os.tmpdir(), "ghostman-verify-shots");
fs.mkdirSync(SHOTS_DIR, { recursive: true });

function launchBrowser() {
  return chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
}

function testCredentials() {
  const username = process.env.GHOSTMAN_TEST_USER;
  const password = process.env.GHOSTMAN_TEST_PASSWORD;
  if (!username || !password) throw new Error("Faltan GHOSTMAN_TEST_USER y GHOSTMAN_TEST_PASSWORD (en el entorno o en .env.local)");
  return { username, password };
}

/** Completa y envía el formulario visible (login o registro). */
async function submitAuthForm(page, values) {
  for (const [field, value] of Object.entries(values)) await page.fill(`[data-testid=auth-${field}]`, value);
  await page.click("[data-testid=auth-submit]");
}

/**
 * Abre la aplicación y deja la página en el menú principal con la sesión del usuario de prueba
 * iniciada (decisión 66). Si el usuario no existe en el proyecto de prueba, lo registra.
 */
async function openMainMenu(page, url = APP_URL) {
  await page.goto(url);
  await page.waitForSelector("[data-testid=auth-login], [data-testid=main-menu]");
  if (await page.isVisible("[data-testid=auth-login]")) {
    const { username, password } = testCredentials();
    await submitAuthForm(page, { username, password });
    await page.waitForSelector("[data-testid=main-menu], [data-testid=auth-form-error]");
    if (await page.isVisible("[data-testid=auth-form-error]")) {
      await page.click("[data-testid=auth-switch]");
      await submitAuthForm(page, { username, password, confirm: password });
      await page.waitForSelector("[data-testid=main-menu]");
    }
  }
  await page.waitForLoadState("networkidle");
}

/** Igual que openMainMenu, y entra en "Jugar": deja la página en la elección de modo (HU-22). */
async function openModeMenu(page, url = APP_URL) {
  await openMainMenu(page, url);
  await page.click("[data-testid=home-play]");
  await page.waitForSelector("[data-testid=mode-menu]");
}

module.exports = { BASE_URL, APP_URL, SHOTS_DIR, launchBrowser, testCredentials, submitAuthForm, openMainMenu, openModeMenu };
