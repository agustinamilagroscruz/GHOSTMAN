// Incremento 10 — menú principal, carrusel y modo GhostMan en el navegador.
// Suite de navegador: se corre con `npm run verify:ui` (ver scripts/verify/README.md).
const { BASE_URL, SHOTS_DIR, launchBrowser } = require("./helpers");
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 700, height: 600 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE_URL);
  await page.waitForSelector("[data-testid=main-menu]");
  check(await page.isVisible("[data-testid=menu-pacman]") && await page.isVisible("[data-testid=menu-ghostman]"), "menú con las dos opciones");
  await page.screenshot({ path: SHOTS_DIR + "/01-menu.png" });

  // Teclado: S baja a GhostMan, Enter abre el carrusel
  await page.keyboard.press("KeyS");
  check(await page.getAttribute("[data-testid=menu-ghostman]", "aria-current") === "true", "S selecciona Modo GhostMan");
  await page.keyboard.press("ArrowDown");
  check(await page.getAttribute("[data-testid=menu-pacman]", "aria-current") === "true", "↓ desde la última opción vuelve a la primera");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await page.waitForSelector("[data-testid=ghost-carousel]");
  check(true, "Enter en Modo GhostMan abre el carrusel");
  const name = () => page.textContent("[data-testid=carousel-name]");
  check(await name() === "Clásico", "el carrusel arranca en Clásico");
  await page.screenshot({ path: SHOTS_DIR + "/02-carrusel-clasico.png" });
  const seen = [];
  for (let i = 0; i < 5; i++) { seen.push(await name()); await page.keyboard.press("ArrowRight"); }
  check(seen.join(",") === "Clásico,Espectro,Saltarín,Naval,Acelerado", "orden: " + seen.join(", "));
  check(await name() === "Clásico", "circular: después de Acelerado vuelve a Clásico");
  await page.keyboard.press("KeyA");
  check(await name() === "Acelerado", "A desde Clásico va a Acelerado (circular hacia atrás)");
  await page.keyboard.press("KeyD");
  await page.keyboard.press("KeyD");
  check(await name() === "Espectro", "D avanza igual que →");
  check((await page.textContent("[data-testid=carousel-power]")).includes("Atraviesa una pared"), "subtítulo con la descripción del poder");
  await page.screenshot({ path: SHOTS_DIR + "/03-carrusel-espectro.png" });
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-testid=main-menu]");
  check(true, "ESC en el carrusel vuelve al menú");

  // Modo GhostMan con el Naval
  await page.click("[data-testid=menu-ghostman]");
  await page.waitForSelector("[data-testid=ghost-carousel]");
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  check(await name() === "Naval", "se elige Naval");
  await page.keyboard.press("Enter");
  await page.waitForSelector("canvas");
  check((await page.textContent("[data-testid=life-icon]")) === "👻", "modo GhostMan: ícono de vidas de fantasma");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOTS_DIR + "/04-ghostman-naval.png" });
  await page.keyboard.press("Space");
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-testid=pause-overlay]");
  check(true, "ESC pausa en modo GhostMan");
  await page.keyboard.press("Escape");

  // Modo Pacman desde el menú (recarga: no hay salida del juego en curso salvo el cierre)
  await page.goto(BASE_URL);
  await page.waitForSelector("[data-testid=main-menu]");
  await page.keyboard.press("Enter");
  await page.waitForSelector("canvas");
  // DEF-001 (corregido en la V2): las vidas del modo Pacman van abajo a la izquierda, con el ícono de Pacman.
  check((await page.getAttribute("[data-testid=life-icon]", "data-icon")) === "pacman" && (await page.locator("[data-testid=life-icon]").count()) === 3,
    "modo Pacman: 3 íconos de vidas de Pacman");
  const bar = await page.locator("[data-testid=pacman-status]").boundingBox();
  const map = await page.locator("canvas").boundingBox();
  check(bar.y > map.y + map.height - 1 && Math.abs(bar.x - map.x) < 2, "modo Pacman: las vidas están debajo del mapa, a la izquierda (DEF-001)");
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOTS_DIR + "/05-pacman.png" });
  check(await page.evaluate(() => window.scrollY) === scrollBefore, "las flechas no scrollean la página");

  check(errors.length === 0, "sin errores en consola" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})();
