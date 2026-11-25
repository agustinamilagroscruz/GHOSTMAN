// Prueba de confirmación de DEF-002 sobre la V3: con el puntero quieto encima de una opción del menú,
// al cargar la página la opción seleccionada tiene que seguir siendo la primera.
//   CHROMIUM_PATH=... node TP/evidencia-entrega-03/scripts/confirmar_def002.js
const path = require("path");
const { APP_URL, launchBrowser, openMainMenu } = require("../../../scripts/verify/ui/helpers");
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 760, height: 900 } });
  await openMainMenu(page, APP_URL);
  const out = [];
  for (const [menu, open] of [["main-menu", null], ["mode-menu", "[data-testid=home-play]"]]) {
    if (open) await page.click(open);
    await page.waitForSelector(`[data-testid=${menu}]`);
    const btns = page.locator(`[data-testid=${menu}] button`);
    const box = await btns.nth(1).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.reload();
    await page.waitForSelector("[data-testid=main-menu]");
    if (open) { await page.keyboard.press("Enter"); await page.waitForSelector(`[data-testid=${menu}]`); }
    await page.waitForTimeout(800);
    const sel = (await page.locator(`[data-testid=${menu}] [aria-current=true]`).textContent()).trim();
    const first = (await btns.nth(0).textContent()).trim();
    out.push({ menu, selected: sel, first, ok: sel === first });
    await page.screenshot({ path: path.join(__dirname, "..", "capturas", `DEF-002-confirmacion-${menu}.png`) });
  }
  console.log(JSON.stringify(out));
  await browser.close();
})();
