// Incremento 22 — cuenta regresiva (HU-46) y modo de prueba (decisión 59).
// Suite de navegador: se corre con `npm run verify:ui` (ver scripts/verify/README.md). Abre el
// juego sin el modo de prueba para ver la cuenta, y con él para ver que no está.
const { BASE_URL, APP_URL, SHOTS_DIR, launchBrowser } = require("./helpers");
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 700, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  const startGhostman = async url => {
    await page.goto(url);
    await page.waitForSelector("[data-testid=main-menu]");
    await page.waitForLoadState("networkidle");
    await page.click("[data-testid=menu-ghostman]");
    await page.waitForSelector("[data-testid=ghost-carousel]");
    await page.keyboard.press("Enter");
    await page.waitForSelector("canvas");
  };
  const pellets = async () => Number((await page.textContent("[data-testid=hud-level] ~ span:nth-of-type(3)")).replace(/\D/g, ""));
  const label = async () => (await page.locator("[data-testid=countdown]").count()) ? page.getAttribute("[data-testid=countdown]", "data-label") : null;

  // Sin el modo de prueba: "3, 2, 1, ¡ya!" y nada se mueve mientras dura
  await startGhostman(BASE_URL);
  const t0 = Date.now();
  const p0 = await pellets();
  const seen = [];
  let pausedChecked = false;
  while (Date.now() - t0 < 6000) {
    const l = await label();
    if (l !== seen[seen.length - 1]) {
      seen.push(l);
      if (l === "3") await page.screenshot({ path: SHOTS_DIR + "/22-cuenta-3.png" });
      if (l === "¡ya!") check(await pellets() === p0, `durante la cuenta Pacman no come esferas (${p0})`);
    }
    if (l === "2" && !pausedChecked) {
      // La pausa detiene la cuenta
      pausedChecked = true;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(1500);
      check(await label() === "2", "en pausa la cuenta se detiene (sigue en \"2\" después de 1,5 s)");
      await page.keyboard.press("Escape");
    }
    if (l === null && seen.length > 1) break;
    await page.waitForTimeout(50);
  }
  check(seen.join(" ") === "3 2 1 ¡ya! ", `la cuenta muestra ${seen.map(l => l ?? "(fin)").join(", ")}`);
  await page.waitForTimeout(2000);
  check(await pellets() < p0, "después del \"¡ya!\" Pacman empieza a comer");

  // Con el modo de prueba (build de prueba): no hay cuenta
  await startGhostman(APP_URL);
  await page.waitForTimeout(300);
  check(await label() === null, "con ?modoPrueba=1 no hay cuenta");
  const q0 = await pellets();
  await page.waitForTimeout(1500);
  check(await pellets() < q0, "y Pacman empieza a moverse de inmediato");

  check(errors.length === 0, "sin errores en consola" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})();
