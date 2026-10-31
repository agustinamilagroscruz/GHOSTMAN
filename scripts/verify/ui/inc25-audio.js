// Incremento 25 — música y efectos de sonido (HU-48; decisión 59).
// Suite de navegador: se corre con `npm run verify:ui` (ver scripts/verify/README.md). En el modo
// de prueba el audio está silenciado, pero el motor registra en window.__ghostmanAudio lo que
// hizo sonar; la suite verifica ese registro.
const { APP_URL, SHOTS_DIR, launchBrowser } = require("./helpers");
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 700, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  const log = () => page.evaluate(() => [...(window.__ghostmanAudio?.log ?? [])]);
  const since = async n => (await log()).slice(n);
  const waitFor = async (entry, ms = 5000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { if ((await log()).includes(entry)) return true; await page.waitForTimeout(100); }
    return false;
  };

  await page.goto(APP_URL);
  await page.waitForSelector("[data-testid=main-menu]");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  check((await log()).length === 0, "antes de la primera interacción no hay audio (política de reproducción automática)");

  await page.click("[data-testid=menu-pacman]");
  await page.waitForSelector("canvas");
  check(await waitFor("unlock") && await waitFor("play:gameStart"), "con la primera interacción arranca el audio y suena el jingle de inicio");
  check(await waitFor("loop:siren:on"), "durante el nivel suena la sirena de fondo");

  // Hacia la izquierda por la fila 23 del nivel 1: esferas y, al final, la esfera grande de (23,1)
  await page.keyboard.press("ArrowLeft");
  check(await waitFor("play:pellet", 2000), "comer esferas: waka");
  const gotPower = await waitFor("play:powerPellet", 5000);
  check(gotPower, "esfera grande");
  if (gotPower) {
    const entries = await log();
    const powerAt = entries.indexOf("play:powerPellet");
    check(entries.slice(powerAt).includes("loop:powerSiren:on") && entries.slice(powerAt).includes("loop:siren:off"), "durante el PowerUp la sirena de fondo cambia por la del PowerUp");
  }
  await page.screenshot({ path: SHOTS_DIR + "/25-audio.png" });

  // Pausa: se suspende el audio y se apagan los bucles
  let n = (await log()).length;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  let after = await since(n);
  check(after.includes("suspend") && after.some(e => /^loop:(siren|powerSiren):off$/.test(e)), `en pausa no suena nada (${after.join(", ")})`);
  n = (await log()).length;
  await page.waitForTimeout(1000);
  check((await since(n)).filter(e => e.startsWith("play:")).length === 0, "y no suena ningún efecto mientras dura la pausa");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check((await since(n)).includes("resume"), "al quitar la pausa vuelve el audio");

  // Pestaña oculta
  n = (await log()).length;
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);
  check((await since(n)).includes("suspend"), "con la pestaña oculta el audio se suspende");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);
  check((await since(n)).includes("resume"), "y vuelve al mostrarse");

  check(errors.length === 0, "sin errores en consola" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})();
