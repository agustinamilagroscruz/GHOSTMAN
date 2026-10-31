// Configuración común de las suites de navegador.
//   BASE_URL      URL de la aplicación (por defecto http://localhost:3000)
//   CHROMIUM_PATH ejecutable de Chromium; si no se indica, usa el que instala
//                 `npx playwright-core install chromium`
//   SHOTS_DIR     carpeta para las capturas (por defecto, una carpeta temporal)
// Las suites abren APP_URL, con el modo de prueba (decisión 59): sin cuenta regresiva ni
// "¡Listo!". Requiere un build de prueba: `NEXT_PUBLIC_MODO_PRUEBA=1 npm run build`.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright-core");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const APP_URL = `${BASE_URL}/?modoPrueba=1`;
const SHOTS_DIR = process.env.SHOTS_DIR || path.join(os.tmpdir(), "ghostman-verify-shots");
fs.mkdirSync(SHOTS_DIR, { recursive: true });

function launchBrowser() {
  return chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
}

module.exports = { BASE_URL, APP_URL, SHOTS_DIR, launchBrowser };
