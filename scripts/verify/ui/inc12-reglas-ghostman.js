// Incremento 12 — barra de vidas de Pacman y desglose final del modo GhostMan. Juega una partida completa sin intervención (hasta 7 min).
// Suite de navegador: se corre con `npm run verify:ui` (ver scripts/verify/README.md).
const { BASE_URL, SHOTS_DIR, launchBrowser } = require("./helpers");
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 700, height: 640 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE_URL);
  await page.waitForSelector("[data-testid=main-menu]");
  await page.waitForLoadState("networkidle");
  await page.click("[data-testid=menu-ghostman]");
  await page.waitForSelector("[data-testid=ghost-carousel]");
  await page.keyboard.press("Enter");
  await page.waitForSelector("[data-testid=ghostman-status]");
  check(await page.getAttribute("[data-testid=pacman-lives]", "data-lives") === "3", "barra inferior: 3 vidas de Pacman");
  check((await page.locator("[data-testid=life-icon]").count()) === 3, "con 3 íconos de fantasma, sin íconos de Pacman arriba");
  const box = await page.locator("[data-testid=ghostman-status]").boundingBox();
  const canvas = await page.locator("canvas").boundingBox();
  check(box.y > canvas.y + canvas.height - 1 && Math.abs(box.x - canvas.x) < 2, "la barra está debajo del mapa, alineada a la izquierda");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SHOTS_DIR + "/09-ghostman-barra.png" });
  // Sin intervención del jugador la partida termina igual (Game Over o Victoria, ver decisión 34)
  await page.waitForSelector("text=/Game Over|Victoria/", { timeout: 420000 });
  console.log("     final:", (await page.textContent("h2")).trim());
  await page.screenshot({ path: SHOTS_DIR + "/10-ghostman-gameover.png" });
  const rows = await page.locator("[data-testid=score-breakdown] td:first-child").allTextContents();
  check(rows.join("|") === "Derrotas de Pacman|Esferas sin consumir|Total", "desglose del modo GhostMan: " + rows.join(", "));
  await page.click("text=Volver a jugar");
  await page.waitForTimeout(200);
  check(await page.getAttribute("[data-testid=pacman-lives]", "data-lives") === "3" && await page.isVisible("[data-testid=ghostman-status]"), "Volver a jugar repite el modo GhostMan");
  check(errors.length === 0, "sin errores en consola" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})();
