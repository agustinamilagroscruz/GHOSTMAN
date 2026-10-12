// Suites del núcleo del juego (sin navegador): compila src/game y corre core/incNN.js.
// Uso: npm run verify            → todas las suites
//      npm run verify -- 13 14   → solo las de esos incrementos
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { compileGameCore } = require("./compile");

const only = process.argv.slice(2);
const suites = fs
  .readdirSync(path.join(__dirname, "core"))
  .filter((name) => /^inc\d+\.js$/.test(name))
  .filter((name) => only.length === 0 || only.includes(name.match(/\d+/)[0]))
  .sort();

const buildDir = compileGameCore();
const failed = [];
for (const suite of suites) {
  console.log(`\n=== ${suite} ===`);
  const result = spawnSync(process.execPath, [path.join(__dirname, "core", suite), buildDir], { stdio: "inherit" });
  if (result.status !== 0) failed.push(suite);
}
fs.rmSync(buildDir, { recursive: true, force: true });

console.log(`\n${suites.length - failed.length}/${suites.length} suites OK${failed.length ? ` — fallaron: ${failed.join(", ")}` : ""}`);
process.exit(failed.length ? 1 : 0);
