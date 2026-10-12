// Incremento 10 — pantalla de Game Over con "Volver a jugar" y "Menú principal". Espera a que los fantasmas atrapen a Pacman quieto (hasta 3 min).
// Suite de navegador: se corre con `npm run verify:ui` (ver scripts/verify/README.md).
const { BASE_URL, SHOTS_DIR, launchBrowser } = require("./helpers");
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 700, height: 600 } });
  await page.goto(BASE_URL);
  await page.waitForSelector("[data-testid=main-menu]");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Enter");
  await page.waitForSelector("canvas");
  await page.waitForSelector("text=Game Over", { timeout: 90000 });
  await page.screenshot({ path: SHOTS_DIR + "/06-gameover.png" });
  check(await page.isVisible("text=Volver a jugar") && await page.isVisible("text=Menú principal"), "Game Over con Volver a jugar y Menú principal");
  check(await page.evaluate(() => document.activeElement?.textContent) === "Volver a jugar", "foco en Volver a jugar (Enter lo activa, como en la V1)");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  check(!(await page.isVisible("text=Game Over")) && (await page.textContent("[data-testid=hud-level]")) === "Nivel 1", "Volver a jugar reinicia en nivel 1");
  await page.waitForSelector("text=Game Over", { timeout: 90000 });
  await page.click("text=Menú principal");
  check(await page.isVisible("[data-testid=main-menu]"), "Menú principal vuelve al menú");
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})();
