// Incremento 13 — indicador ⭐: se apaga con la barra espaciadora y vuelve a los ~10 s (medido con el reloj real: puede fallar si el equipo está muy cargado).
// Suite de navegador: se corre con `npm run verify:ui` (ver scripts/verify/README.md).
const { BASE_URL, SHOTS_DIR, launchBrowser } = require("./helpers");
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
async function startGhostman(page, rights) {
  await page.goto(BASE_URL);
  await page.waitForSelector("[data-testid=main-menu]");
  await page.waitForLoadState("networkidle");
  await page.click("[data-testid=menu-ghostman]");
  await page.waitForSelector("[data-testid=ghost-carousel]");
  for (let i = 0; i < rights; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.waitForSelector("[data-testid=ghostman-status]");
}
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 700, height: 640 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

  await startGhostman(page, 2); // Saltarín
  const ready = () => page.getAttribute("[data-testid=power-indicator]", "data-ready");
  check(await ready() === "true", "saltarín: estrella disponible al empezar");
  await page.screenshot({ path: SHOTS_DIR + "/11-estrella-disponible.png", clip: { x: 140, y: 480, width: 420, height: 100 } });
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  check(await ready() === "false", "espacio: la estrella pasa a no disponible");
  await page.screenshot({ path: SHOTS_DIR + "/12-estrella-cooldown.png" });
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelector("[data-testid=power-indicator]")?.getAttribute("data-ready") === "true", null, { timeout: 15000 });
  const secs = (Date.now() - t0 + 150) / 1000;
  check(secs > 9.5 && secs < 10.8, `vuelve a estar disponible a los ~10 s (${secs.toFixed(2)} s medidos en el navegador)`);
  check(await page.evaluate(() => window.scrollY) === 0, "la barra espaciadora no scrollea la página");

  await startGhostman(page, 0); // Clásico
  check(await page.locator("[data-testid=power-indicator]").count() === 0, "clásico: sin estrella");
  check(errors.length === 0, "sin errores en consola" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})();
