// Compila el núcleo del juego (src/game, sin React ni canvas) a CommonJS en un directorio
// temporal, para que los scripts de verificación lo usen directamente desde Node.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");

function listTs(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => path.join(dir, name));
}

/** Compila src/game y devuelve el directorio con los .js generados. */
function compileGameCore() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ghostman-core-"));
  const files = [...listTs(path.join(ROOT, "src/game")), ...listTs(path.join(ROOT, "src/game/maps"))];
  const tsc = require.resolve("typescript/bin/tsc", { paths: [ROOT] });
  execFileSync(
    process.execPath,
    [tsc, ...files, "--outDir", outDir, "--module", "commonjs", "--target", "es2022", "--skipLibCheck", "--strict"],
    { stdio: "inherit" }
  );
  return outDir;
}

module.exports = { compileGameCore, ROOT };
