// Incremento 28 — tableros de puntaje (HU-38, HU-39; decisiones 62, 63, 65 y 74).
// Suite de navegador: se corre con `npm run verify:ui` (ver scripts/verify/README.md). Trabaja contra
// el proyecto de Supabase de prueba y arma sus datos por la API, con usuarios que empiezan con "v28":
//   - v28fijo01 a v28fijo11: se crean la primera vez, con puntajes fijos en el modo Pacman, para que
//     el tablero tenga siempre más de 10 filas.
//   - v28tope: envía el máximo exacto del modo GhostMan en cada corrida (una sola fila).
//   - el resto son usuarios nuevos de cada corrida. Los del ingreso al top 10 suben el récord del
//     modo Pacman en 1 punto por corrida.
const { APP_URL, SHOTS_DIR, launchBrowser, submitAuthForm } = require("./helpers");
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = "verifica28x";
const newUsername = () => "v28" + Math.random().toString(36).slice(2, 12);

// --- API de Supabase ---
async function call(path, { method = "GET", token, body } = {}) {
  const headers = { apikey: KEY, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json };
}
const email = username => `${username.toLowerCase()}@ghostman.invalid`;
async function login(username) {
  const r = await call("/auth/v1/token?grant_type=password", { method: "POST", body: { email: email(username), password: PASSWORD } });
  return r.status === 200 ? r.json.access_token : null;
}
async function signUp(username) {
  const r = await call("/auth/v1/signup", { method: "POST", body: { email: email(username), password: PASSWORD, data: { username } } });
  if (r.status !== 200 || !r.json.access_token) throw new Error(`no se pudo registrar ${username}: ${r.status}`);
  return r.json.access_token;
}
const loginOrSignUp = async username => (await login(username)) ?? signUp(username);
const submit = (token, mode, score) => call("/rest/v1/rpc/submit_score", { method: "POST", token, body: { p_mode: mode, p_score: score } });
const board = async (token, mode) =>
  (await call(`/rest/v1/best_scores?select=score,achieved_at,profiles(username)&mode=eq.${mode}&order=score.desc,achieved_at.asc&limit=10`, { token })).json;

(async () => {
  // --- Datos fijos ---
  for (let i = 1; i <= 11; i++) {
    const username = `v28fijo${String(i).padStart(2, "0")}`;
    if (!(await login(username))) await submit(await signUp(username), "pacman", 20000 + i * 100);
  }

  // --- Rechazos de la función y escritura directa (decisiones 62, 63 y 74) ---
  const probe = await signUp(newUsername());
  check((await call("/rest/v1/rpc/submit_score", { method: "POST", body: { p_mode: "pacman", p_score: 10 } })).status >= 400, "sin sesión: la función se rechaza");
  check((await submit(probe, "otro", 10)).status === 400, "modo inválido: rechazado");
  check((await submit(probe, "pacman", -1)).status === 400, "puntaje negativo: rechazado");
  check((await submit(probe, "pacman", 50001)).status === 400, "Pacman 50.001: rechazado (máximo 50.000)");
  check((await submit(probe, "ghostman", 12481)).status === 400, "GhostMan 12.481: rechazado (máximo 12.480)");
  const tope = await loginOrSignUp("v28tope");
  const topeResult = await submit(tope, "ghostman", 12480);
  check(topeResult.status === 200 && topeResult.json[0].best === 12480, "GhostMan 12.480: aceptado");
  check((await call("/rest/v1/best_scores", { method: "POST", token: probe, body: { user_id: "00000000-0000-0000-0000-000000000000", mode: "pacman", score: 1 } })).status >= 400,
    "nadie inserta en best_scores directamente");
  const patch = await call("/rest/v1/best_scores?mode=eq.pacman", { method: "PATCH", token: tope, body: { score: 49999 } });
  check(patch.status >= 400, "nadie modifica best_scores directamente");
  check((await call("/rest/v1/best_scores?select=score")).status >= 400, "sin sesión no se leen los tableros");

  // --- Tablero personal por la API (HU-39) ---
  const meName = newUsername();
  const me = await signUp(meName);
  const first = await submit(me, "pacman", 1000);
  check(first.json[0].best === 1000 && first.json[0].improved === true, "primer puntaje: se registra");
  const lower = await submit(me, "pacman", 500);
  check(lower.json[0].best === 1000 && lower.json[0].improved === false, "puntaje menor: no modifica el registro");
  const tie = await submit(me, "pacman", 1000);
  check(tie.json[0].improved === false, "empate con el mejor personal: no modifica el registro");
  const higher = await submit(me, "pacman", 1200);
  check(higher.json[0].best === 1200 && higher.json[0].improved === true, "puntaje mayor: actualiza el registro");

  // --- Orden, empate, corte en 10 e ingreso inmediato (HU-38) ---
  const before = await board(probe, "pacman");
  const record = before[0].score + 1;
  const firstName = newUsername();
  const secondName = newUsername();
  await submit(await signUp(firstName), "pacman", record);
  await submit(await signUp(secondName), "pacman", record);
  const after = await board(probe, "pacman");
  check(after.length === 10, `el tablero corta en 10 filas (${after.length})`);
  check(after.every((row, i) => i === 0 || row.score < after[i - 1].score || (row.score === after[i - 1].score && row.achieved_at >= after[i - 1].achieved_at)),
    "de mayor a menor y, en un empate, primero el que se logró antes");
  check(after[0].profiles.username === firstName && after[1].profiles.username === secondName && after[1].score === record,
    "ingreso inmediato al top 10, y el empate deja arriba al primero");
  check(new Set(after.map(row => row.profiles.username.toLowerCase())).size === after.length, "cada jugador aparece una sola vez por modo");

  // --- Interfaz ---
  const browser = await launchBrowser();
  const errors = [];
  const newPage = async () => {
    const page = await browser.newPage({ viewport: { width: 700, height: 860 } });
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error" && !/status of (400|401|403|404|422|500)|net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
    return page;
  };
  const loginAs = async (page, username) => {
    await page.goto(APP_URL);
    await page.waitForSelector("[data-testid=auth-login]");
    await submitAuthForm(page, { username, password: PASSWORD });
    await page.waitForSelector("[data-testid=main-menu]");
  };
  const openScores = async page => {
    await page.click("[data-testid=home-scores]");
    await page.waitForSelector("[data-testid=scores-board], [data-testid=scores-empty], [data-testid=scores-error]");
    await page.waitForFunction(() => !document.querySelector("[data-testid^=personal-]")?.textContent.includes("…"));
  };
  const shownMode = page => page.getAttribute("[data-testid=scores-mode]", "data-mode");

  let page = await newPage();
  await loginAs(page, meName);
  await openScores(page);
  check(await shownMode(page) === "pacman", "Puntajes arranca en el modo Pacman, identificado en pantalla");
  const names = await page.locator("[data-testid=scores-username]").allTextContents();
  const scores = (await page.locator("[data-testid=scores-score]").allTextContents()).map(Number);
  const positions = (await page.locator("[data-testid=scores-position]").allTextContents()).map(Number);
  check(names.length === 10 && names[0] === firstName && names[1] === secondName, "el tablero muestra las 10 filas del top, con el username");
  check(positions.join() === "1,2,3,4,5,6,7,8,9,10" && scores.every((s, i) => i === 0 || s <= scores[i - 1]), "posición y puntaje de mayor a menor");
  check(await page.textContent("[data-testid=personal-pacman]") === "1200" && await page.textContent("[data-testid=personal-ghostman]") === "Sin partidas",
    "tablero personal: 1200 en Pacman y \"Sin partidas\" en GhostMan (no 0)");
  await page.screenshot({ path: SHOTS_DIR + "/28-puntajes-pacman.png" });
  await page.keyboard.press("ArrowRight");
  check(await shownMode(page) === "ghostman", "→ pasa al modo GhostMan");
  check((await page.locator("[data-testid=scores-username]").allTextContents()).includes("v28tope"), "el tablero de GhostMan muestra sus propios puntajes");
  await page.screenshot({ path: SHOTS_DIR + "/28-puntajes-ghostman.png" });
  await page.keyboard.press("ArrowLeft");
  check(await shownMode(page) === "pacman", "← vuelve al modo Pacman");
  await page.keyboard.press("KeyD");
  check(await shownMode(page) === "ghostman", "D alterna igual que →");
  await page.keyboard.press("KeyA");
  check(await shownMode(page) === "pacman", "A alterna igual que ←");
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-testid=main-menu]");
  check(true, "Esc vuelve al menú principal");

  // Tablero vacío (interceptando la respuesta: el proyecto de prueba ya tiene puntajes)
  await page.route("**/rest/v1/best_scores*", route =>
    route.request().url().includes("mode=eq.ghostman") ? route.fulfill({ status: 200, contentType: "application/json", body: "[]" }) : route.continue());
  await openScores(page);
  await page.keyboard.press("ArrowRight");
  check(await page.isVisible("[data-testid=scores-empty]") && !(await page.isVisible("[data-testid=scores-board]")), "modo sin puntajes: mensaje en lugar de la tabla");
  await page.unroute("**/rest/v1/best_scores*");
  await page.click("[data-testid=scores-section-back]");
  await page.waitForSelector("[data-testid=main-menu]");
  check(true, "el botón Volver vuelve al menú principal");
  await page.close();

  // --- Puntaje guardado al terminar una partida, con reintento sin conexión (decisión 65) ---
  const playerName = newUsername();
  await signUp(playerName);
  page = await newPage();
  await loginAs(page, playerName);
  await page.route("**/rest/v1/rpc/submit_score", route => route.abort());
  await page.click("[data-testid=home-play]");
  await page.waitForSelector("[data-testid=mode-menu]");
  await page.click("[data-testid=menu-pacman]");
  await page.waitForSelector("canvas");
  // Sin tocar nada, los fantasmas comen a Pacman tres veces.
  await page.waitForSelector("text=Game Over", { timeout: 300000 });
  const final = Number(await page.textContent("[data-testid=final-score]"));
  await page.waitForSelector("[data-testid=score-save][data-status=failed]", { timeout: 10000 });
  check(await page.isVisible("text=No se pudo guardar el puntaje") && await page.isVisible("[data-testid=score-save-retry]"),
    "sin conexión: \"No se pudo guardar el puntaje\" y Reintentar");
  check(await page.evaluate(() => document.activeElement?.textContent) === "Volver a jugar", "el foco sigue en Volver a jugar");
  await page.screenshot({ path: SHOTS_DIR + "/28-fin-sin-conexion.png" });
  await page.unroute("**/rest/v1/rpc/submit_score");
  await page.click("[data-testid=score-save-retry]");
  await page.waitForSelector("[data-testid=score-save][data-status=saved]", { timeout: 10000 });
  check(await page.getAttribute("[data-testid=score-save-result]", "data-improved") === "true", `reintento: puntaje guardado como récord personal (${final})`);
  await page.screenshot({ path: SHOTS_DIR + "/28-fin-guardado.png" });
  await page.click("text=Menú principal");
  await page.waitForSelector("[data-testid=main-menu]");
  await openScores(page);
  check(Number(await page.textContent("[data-testid=personal-pacman]")) === final, "el tablero personal muestra el puntaje recién guardado");
  await page.close();

  check(errors.length === 0, "sin errores en consola" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
  process.exitCode = fails ? 1 : 0;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
