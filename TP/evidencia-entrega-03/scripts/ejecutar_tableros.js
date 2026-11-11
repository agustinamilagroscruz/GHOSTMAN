// Etapa 4 — Ejecución con script de navegador de CP-124, CP-125, CP-126 y CP-128 (HU-38, HU-39).
//
// Requiere el build servido en BASE_URL (por defecto http://localhost:3000) con las variables del
// proyecto de Supabase de PRUEBA, los datos DP-1 a DP-3 cargados (sección 9.2) y un Chrome
// (CHROMIUM_PATH). No juega partidas, así que no altera los tableros. Sigue los pasos de cada caso en
// spec_v3.py, imprime lo observado y guarda una captura por paso en TP/evidencia-entrega-03/capturas/.
//   CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//     node TP/evidencia-entrega-03/scripts/ejecutar_tableros.js
const fs = require("fs");
const path = require("path");
const { BASE_URL, launchBrowser, openMainMenu } = require("../../../scripts/verify/ui/helpers");

const SHOTS = path.join(__dirname, "..", "capturas");
fs.mkdirSync(SHOTS, { recursive: true });

const DP1_TOP10 = [["tpac01", 3000], ["tpac02", 2800], ["tpac03", 2600], ["tpac04", 2400], ["tpac05", 2200],
  ["tpac06", 2000], ["tpac07", 2000], ["tpac08", 1800], ["tpac09", 1500], ["tpac10", 1200]];
const GHOSTMAN = [["tgho01", 4000], ["tgho02", 3500], ["tgho03", 3000], ["verificador", 2500]];

const results = {};
let current;
const start = id => { current = id; results[id] = { ok: true, notes: [] }; console.log(`\n=== ${id} ===`); };
const check = (cond, msg) => {
  console.log((cond ? "OK   " : "FAIL ") + msg);
  results[current].notes.push((cond ? "" : "FALLA: ") + msg);
  if (!cond) results[current].ok = false;
};

(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 700, height: 860 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await openMainMenu(page, BASE_URL);
  const shot = name => page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  const modeText = () => page.textContent("[data-testid=scores-mode]");
  const waitBoard = async () => {
    await page.waitForSelector("[data-testid=scores-board], [data-testid=scores-empty], [data-testid=scores-error]");
    await page.waitForFunction(() => !document.querySelector("[data-testid^=personal-]")?.textContent.includes("…"));
  };
  const readBoard = async () => {
    const pos = (await page.locator("[data-testid=scores-position]").allTextContents()).map(Number);
    const names = await page.locator("[data-testid=scores-username]").allTextContents();
    const scores = (await page.locator("[data-testid=scores-score]").allTextContents()).map(Number);
    return names.map((n, i) => [pos[i], n, scores[i]]);
  };
  const openScores = async () => {
    await page.click("[data-testid=home-scores]");
    await waitBoard();
  };
  const backToMenu = async () => {
    await page.click("[data-testid=scores-section-back]");
    await page.waitForSelector("[data-testid=main-menu]");
  };

  // ---------------- CP-124 · Contenido y orden del tablero global
  start("CP-124");
  await openScores();
  const heads = (await page.locator("[data-testid=scores-board] th").allTextContents()).map(s => s.trim());
  check((await modeText()) === "Modo PacMan" && heads.join("|") === "#|Jugador|Puntaje",
    `paso 1: tablero «${await modeText()}» con columnas ${heads.map(h => `«${h}»`).join(", ")}`);
  await shot("CP-124-paso1");
  const pac = await readBoard();
  check(pac.length === 10 && pac.every(([p, n, s], i) => p === i + 1 && n === DP1_TOP10[i][0] && s === DP1_TOP10[i][1]),
    `paso 2: ${pac.length} filas = ${pac.map(([p, n, s]) => `${p}. ${n} ${s}`).join(", ")}`);
  check(!pac.some(([, n]) => ["tpac11", "tpac12"].includes(n)), "paso 2: tpac11 (900) y tpac12 (600) no aparecen");
  check(pac.findIndex(([, n]) => n === "tpac06") < pac.findIndex(([, n]) => n === "tpac07"), "paso 2: empate en 2000, tpac06 (logrado antes) arriba de tpac07");
  await backToMenu();

  // ---------------- CP-125 · Alternancia entre tableros por modo
  start("CP-125");
  await openScores();
  check((await modeText()) === "Modo PacMan" && (await page.isVisible("[data-testid=scores-board]")), `paso 1: se muestra «${await modeText()}» con su tablero`);
  await page.keyboard.press("ArrowRight");
  await waitBoard();
  const gmRows = await readBoard();
  check((await modeText()) === "Modo GhostMan" && gmRows[0]?.[1] === "tgho01", `paso 2: → muestra «${await modeText()}», primera fila ${gmRows[0]?.[1]} ${gmRows[0]?.[2]}`);
  await shot("CP-125-paso2");
  const seq = [];
  for (const key of ["ArrowLeft", "KeyD", "KeyA"]) {
    await page.keyboard.press(key);
    await waitBoard();
    seq.push(await modeText());
  }
  check(seq.join(" → ") === "Modo PacMan → Modo GhostMan → Modo PacMan", `paso 3: ←, D, A muestran ${seq.map(s => `«${s}»`).join(", ")}`);
  await backToMenu();

  // ---------------- CP-126 · Tablero con menos de 10 puntajes
  start("CP-126");
  await openScores();
  await page.keyboard.press("ArrowRight");
  await waitBoard();
  check((await modeText()) === "Modo GhostMan" && (await page.isVisible("[data-testid=scores-board]")), `paso 1: se muestra el tablero de «${await modeText()}»`);
  const gm = await readBoard();
  const emptyRows = await page.locator("[data-testid=scores-row]").evaluateAll(trs => trs.filter(tr => !tr.textContent.trim()).length);
  check(gm.length === 4 && emptyRows === 0 && gm.every(([p, n, s], i) => p === i + 1 && n === GHOSTMAN[i][0] && s === GHOSTMAN[i][1]),
    `paso 2: ${gm.length} filas, sin filas vacías = ${gm.map(([p, n, s]) => `${p}. ${n} ${s}`).join(", ")}`);
  await shot("CP-126-paso2");
  await backToMenu();

  // ---------------- CP-128 · Tablero personal por modo
  start("CP-128");
  await openScores();
  const label = (await page.textContent("[data-testid=scores-personal]")).includes("Tu mejor puntaje");
  check(label, "paso 1: debajo del tablero global se muestra «Tu mejor puntaje»");
  const personal = async () => [await page.textContent("[data-testid=personal-pacman]"), await page.textContent("[data-testid=personal-ghostman]")];
  const p0 = await personal();
  await shot("CP-128-paso2");
  const seen = [p0];
  for (const key of ["ArrowRight", "ArrowLeft"]) {
    await page.keyboard.press(key);
    await waitBoard();
    seen.push(await personal());
  }
  check(p0[0] === "1000" && p0[1] === "2500", `paso 2: «Modo PacMan» ${p0[0]} y «Modo GhostMan» ${p0[1]} (DP-3)`);
  check(seen.every(v => v.join() === p0.join()), `paso 2: sin cambios al alternar con → y ← (${seen.map(v => v.join("/")).join(", ")})`);
  await backToMenu();

  console.log(`\nErrores de la página: ${errors.length ? errors.join(" | ") : "ninguno"}`);
  console.log("\nRESUMEN " + JSON.stringify(Object.fromEntries(Object.entries(results).map(([id, r]) => [id, r.ok ? "Aprobado" : "Fallido"]))));
  await browser.close();
  process.exit(Object.values(results).every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
