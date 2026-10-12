// Suites de navegador: manejan la aplicación ya levantada con Chromium sin interfaz.
// Requieren el servidor corriendo (npm run build && npm start) y un Chromium (ver README).
// Uso: npm run verify:ui            → todas las suites
//      npm run verify:ui -- 13 14   → solo las de esos incrementos
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const only = process.argv.slice(2);
const suites = fs
  .readdirSync(path.join(__dirname, "ui"))
  .filter((name) => /^inc\d+-.+\.js$/.test(name))
  .filter((name) => only.length === 0 || only.includes(name.match(/\d+/)[0]))
  .sort();

const failed = [];
for (const suite of suites) {
  console.log(`\n=== ${suite} ===`);
  const result = spawnSync(process.execPath, [path.join(__dirname, "ui", suite)], { stdio: "inherit" });
  if (result.status !== 0) failed.push(suite);
}

console.log(`\n${suites.length - failed.length}/${suites.length} suites OK${failed.length ? ` — fallaron: ${failed.join(", ")}` : ""}`);
process.exit(failed.length ? 1 : 0);
