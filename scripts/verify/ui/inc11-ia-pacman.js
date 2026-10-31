// Incremento 11 — Pacman se mueve solo en modo GhostMan y se detiene en pausa.
// Suite de navegador: se corre con `npm run verify:ui` (ver scripts/verify/README.md).
const { APP_URL, SHOTS_DIR, launchBrowser } = require("./helpers");
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 700, height: 600 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(APP_URL);
  await page.waitForSelector("[data-testid=main-menu]");
  await page.waitForLoadState("networkidle");
  await page.click("[data-testid=menu-ghostman]");
  await page.waitForSelector("[data-testid=ghost-carousel]");
  await page.keyboard.press("ArrowRight"); // Espectro
  await page.keyboard.press("Enter");
  await page.waitForSelector("canvas");
  const pellets = async () => Number((await page.textContent("[data-testid=hud-level] ~ span:nth-of-type(3)")).replace(/\D/g, ""));
  const p0 = await pellets();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SHOTS_DIR + "/07-ghostman-ia-3s.png" });
  const p1 = await pellets();
  check(p1 < p0, `Pacman consume esferas solo (${p0} → ${p1} en 3 s)`);
  await page.keyboard.press("Escape");
  // El HUD se actualiza en el cuadro siguiente: se lee el contador cuando la pausa ya rige.
  await page.waitForSelector("[data-testid=pause-overlay]");
  await page.waitForTimeout(200);
  const pPaused = await pellets();
  await page.waitForTimeout(1500);
  check(await pellets() === pPaused, "en pausa Pacman (IA) también se detiene");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(5000);
  await page.screenshot({ path: SHOTS_DIR + "/08-ghostman-ia-8s.png" });
  check(errors.length === 0, "sin errores en consola" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})();
