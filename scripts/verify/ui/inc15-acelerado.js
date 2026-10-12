// Incremento 15 — el acelerado ejecuta el dash y la estrella se apaga.
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
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.waitForSelector("[data-testid=ghostman-status]");
  const ready = () => page.getAttribute("[data-testid=power-indicator]", "data-ready");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  await page.keyboard.press("Space"); // primera fruta
  await page.waitForTimeout(100);
  check(await ready() === "false", "acelerado: tras el dash la estrella se apaga");
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(9300);
  for (let i = 0; i < 6; i++) { await page.screenshot({ path: SHOTS_DIR + `/16-acelerado-${i}.png` }); await page.waitForTimeout(120); }
  check(errors.length === 0, "sin errores en consola" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})();
