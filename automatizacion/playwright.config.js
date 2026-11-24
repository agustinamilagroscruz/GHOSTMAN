// Configuración de Playwright para los casos automatizados de GhostMan.
// Abre el navegador visible (no headless), en cámara lenta, y genera un reporte HTML
// con capturas de cada paso, el video de la ejecución y la traza.
const fs = require("fs");
const path = require("path");
const { defineConfig } = require("@playwright/test");

// Lee automatizacion/.env (usuario de prueba y URL). El archivo no se sube al repositorio.
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

// Navegador: Google Chrome instalado en la máquina. En un entorno sin Chrome se puede indicar
// otro ejecutable con CHROMIUM_PATH.
const browser = process.env.CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH, slowMo: Number(process.env.SLOW_MO ?? 400) } }
  : { channel: "chrome", launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 400) } };

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 6 * 60 * 1000, // la partida puede durar unos minutos
  expect: { timeout: 10 * 1000 },
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "reporte", open: process.env.CI ? "never" : "always" }],
  ],
  outputDir: "resultados",
  use: {
    baseURL: process.env.BASE_URL || "https://ghostman-seven.vercel.app",
    headless: process.env.HEADLESS === "1",
    viewport: { width: 1000, height: 800 },
    screenshot: "on",
    video: "on",
    trace: "on",
    ...browser,
  },
});
