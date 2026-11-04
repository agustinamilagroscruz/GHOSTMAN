// Incremento 29 — Opciones: skins, volumen, cerrar sesión y salir (HU-40, HU-41, HU-42; decisiones 64 y 65).
// Suite de navegador: se corre con `npm run verify:ui` (ver scripts/verify/README.md). Trabaja contra
// el proyecto de Supabase de prueba con un usuario nuevo "v29…" en cada corrida.
const { APP_URL, SHOTS_DIR, launchBrowser, submitAuthForm } = require("./helpers");
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = "verifica29x";
const username = "v29" + Math.random().toString(36).slice(2, 12);
const email = `${username}@ghostman.invalid`;

async function call(path, { method = "GET", token, body } = {}) {
  const headers = { apikey: KEY, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null) };
}
let token;
const profile = async () => (await call("/rest/v1/profiles?select=pacman_skin,ghost_skin,music_volume,effects_volume&username=eq." + username, { token })).json[0];

(async () => {
  token = (await call("/auth/v1/signup", { method: "POST", body: { email, password: PASSWORD, data: { username } } })).json.access_token;
  await call("/rest/v1/rpc/submit_score", { method: "POST", token, body: { p_mode: "pacman", p_score: 777 } });

  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/status of (400|401|403|422)|net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  const audio = () => page.evaluate(() => window.__ghostmanAudio ?? null);
  const selected = () => page.locator("[data-testid=options-section] [aria-current=true]").getAttribute("data-testid");
  const skinName = row => page.textContent(`[data-testid=options-${row}-name]`);
  const chosen = async row => (await page.getAttribute(`[data-testid=options-${row}-name]`, "data-chosen")) === "true";
  const value = channel => page.textContent(`[data-testid=options-${channel}-value]`).then(Number);
  const goToRow = async target => {
    for (let i = 0; i < 8 && (await selected()) !== `options-${target}`; i++) await page.keyboard.press("ArrowDown");
  };
  const waitSaved = () => page.waitForSelector("[data-testid=options-save][data-status=saved]", { timeout: 5000 }).then(() => true).catch(() => false);
  const login = async () => {
    await page.waitForSelector("[data-testid=auth-login]");
    await submitAuthForm(page, { username, password: PASSWORD });
    await page.waitForSelector("[data-testid=main-menu]");
  };
  const openOptions = async () => {
    await page.click("[data-testid=home-options]");
    await page.waitForSelector("[data-testid=options-section]");
    await page.waitForTimeout(800); // preferencias leídas
  };

  await page.goto(APP_URL);
  await login();
  await openOptions();
  check(await selected() === "options-pacmanSkin", "Opciones arranca en el carrusel de Pacman");
  check(await skinName("pacmanSkin") === "Clásico ✓" && await skinName("ghostSkin") === "Clásica ✓", "skins por defecto: las clásicas, elegidas");
  check(await value("music") === 60 && await value("effects") === 80, "volúmenes por defecto: música 60 y efectos 80");
  await page.screenshot({ path: SHOTS_DIR + "/29-opciones.png" });

  // --- Carruseles (HU-40) ---
  await page.keyboard.press("ArrowRight");
  check(await skinName("pacmanSkin") === "Menta" && !(await chosen("pacmanSkin")), "→ recorre el carrusel sin elegir");
  check(await page.getAttribute("[data-testid=preview-pacman]", "data-skin") === "menta", "la vista previa muestra la skin que se recorre");
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-testid=main-menu]");
  await openOptions();
  check(await skinName("pacmanSkin") === "Clásico ✓" && (await profile()).pacman_skin === "clasico", "lo recorrido sin confirmar no se guarda");
  await page.keyboard.press("KeyD");
  await page.keyboard.press("Enter");
  check(await waitSaved() && await chosen("pacmanSkin") && (await profile()).pacman_skin === "menta", "Enter confirma y guarda la skin de Pacman (D recorre como →)");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  check(await page.getAttribute("[data-testid=preview-ghosts]", "data-skin") === "pastel", "← recorre el carrusel de los fantasmas");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  check((await profile()).ghost_skin === "pastel" && await chosen("ghostSkin"), "Enter confirma y guarda la skin de los fantasmas");
  await page.screenshot({ path: SHOTS_DIR + "/29-opciones-skins.png" });

  // --- Volúmenes (HU-41) ---
  await goToRow("music");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("KeyA");
  let a = await audio();
  check(await value("music") === 40 && a.volumes.music === 40 && a.volumes.effects === 80, "bajar la música (← y A) cambia solo la música, de inmediato en el motor");
  await goToRow("effects");
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowLeft");
  a = await audio();
  check(await value("effects") === 0 && a.volumes.effects === 0 && a.gains.effects === 0 && a.gains.music > 0, "efectos en 0: ganancia 0 en su canal, la música sigue sonando");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(1200);
  const saved = await profile();
  check(saved.music_volume === 40 && saved.effects_volume === 0, "los volúmenes se guardan al cambiar");

  // --- Skin aplicada en la partida siguiente ---
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-testid=main-menu]");
  await page.click("[data-testid=home-play]");
  await page.click("[data-testid=menu-pacman]");
  await page.waitForSelector("canvas");
  await page.waitForTimeout(400);
  const colors = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const count = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === r && d[i + 1] === g && d[i + 2] === b) n++; return n; };
    return { menta: count("#5ef2b5"), clasico: count("#f8e34d"), pastel: count("#ff8fa3"), blinky: count("#ff0000") };
  });
  check(colors.menta > 50 && colors.clasico === 0, `la partida usa la skin Menta para Pacman (${colors.menta} px)`);
  check(colors.pastel > 50 && colors.blinky === 0, `la partida usa la skin Pastel para los fantasmas (${colors.pastel} px)`);
  check(await page.getAttribute("[data-testid=life-icon] path", "fill") === "#5ef2b5", "los íconos de vidas usan el color de la skin");
  check((await audio()).volumes.music === 40, "en la partida rige el volumen elegido");
  await page.screenshot({ path: SHOTS_DIR + "/29-partida-skins.png" });

  // --- Error al guardar sin conexión (decisión 65) ---
  await page.goto(APP_URL);
  await page.waitForSelector("[data-testid=main-menu]");
  await openOptions();
  await page.route("**/rest/v1/profiles*", route => (route.request().method() === "PATCH" ? route.abort() : route.continue()));
  await goToRow("music");
  await page.keyboard.press("ArrowRight");
  check(await page.waitForSelector("[data-testid=options-save][data-status=failed]", { timeout: 5000 }).then(() => true).catch(() => false), "sin conexión: error general al guardar");
  await page.unroute("**/rest/v1/profiles*");
  await page.keyboard.press("ArrowLeft");
  check(await waitSaved() && (await profile()).music_volume === 40, "con conexión vuelve a guardar");

  // --- Salir del juego (decisión 64) ---
  await goToRow("exit");
  await page.keyboard.press("Enter");
  check(await page.waitForSelector("[data-testid=exit-screen]").then(() => true) && await page.isVisible("text=¡Gracias por jugar!"), "Salir del juego: pantalla de salida");
  check(!(await page.isVisible("canvas")), "no queda ninguna partida montada");
  await page.screenshot({ path: SHOTS_DIR + "/29-salida.png" });
  await page.click("[data-testid=exit-return]");
  check(await page.waitForSelector("[data-testid=main-menu]").then(() => true), "Volver a entrar: menú principal, con la sesión intacta");

  // --- Cerrar sesión (HU-42) ---
  await openOptions();
  await goToRow("logout");
  await page.keyboard.press("Enter");
  check(await page.waitForSelector("[data-testid=auth-login]").then(() => true), "Cerrar sesión lleva al login");
  await page.goto(APP_URL);
  await page.waitForSelector("[data-testid=auth-login], [data-testid=main-menu]");
  check(await page.isVisible("[data-testid=auth-login]") && !(await page.isVisible("[data-testid=main-menu]")), "después de cerrar sesión, recargar no da acceso al menú");
  await login();
  await openOptions();
  check(await skinName("pacmanSkin") === "Menta ✓" && await skinName("ghostSkin") === "Pastel ✓", "al volver a iniciar sesión se conservan las skins");
  check(await value("music") === 40 && await value("effects") === 0, "y los volúmenes");
  a = await audio();
  check(a.volumes.music === 40 && a.volumes.effects === 0, "y el motor los aplica");
  await page.keyboard.press("Escape");
  await page.click("[data-testid=home-scores]");
  await page.waitForFunction(() => /\d/.test(document.querySelector("[data-testid=personal-pacman]")?.textContent ?? ""));
  check(await page.textContent("[data-testid=personal-pacman]") === "777", "y los puntajes");

  check(errors.length === 0, "sin errores en consola" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
