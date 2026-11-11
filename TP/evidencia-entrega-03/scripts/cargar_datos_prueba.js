// Etapa 3 — Carga de los datos de prueba DP-1 a DP-3 de los tableros (sección 9.2 de entrega-03.md).
//
// Uso (desde la raíz del repositorio, con .env.local apuntando al proyecto de PRUEBA):
//   node TP/evidencia-entrega-03/scripts/cargar_datos_prueba.js pacman     DP-1 y el puntaje Pacman de DP-3
//   node TP/evidencia-entrega-03/scripts/cargar_datos_prueba.js ghostman   DP-2 y el puntaje GhostMan de DP-3
//   node TP/evidencia-entrega-03/scripts/cargar_datos_prueba.js            las dos fases
//
// Orden de la etapa 4: limpiar_tableros.sql → fase "pacman" → CP-127 (GhostMan vacío) → fase "ghostman".
//
// Trabaja por la API pública, como un jugador: se registra (o inicia sesión) y envía el puntaje con
// submit_score, en orden, para que tpac06 logre su 2000 antes que tpac07 (empate de DP-1). Antes de
// cargar comprueba que el tablero del modo esté vacío o tenga solo datos de prueba, y al final
// compara el tablero con lo esperado. Si algo no coincide, hay que volver a correr limpiar_tableros.sql.
const fs = require("fs");
const path = require("path");

const TEST_PROJECT = "gstpskqyurpiansmtbtr"; // decisión 60: nunca se cargan datos de prueba en producción
const DP_PASSWORD = "Datos2026x"; // usuarios tpac/tgho, solo existen en el proyecto de prueba

// --- Entorno (.env.local, que no se sube al repositorio) ---
const envFile = path.join(__dirname, "..", "..", "..", ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_USER = process.env.GHOSTMAN_TEST_USER;
const TEST_PASSWORD = process.env.GHOSTMAN_TEST_PASSWORD;
if (!URL || !KEY || !TEST_USER || !TEST_PASSWORD) fail("Faltan variables en .env.local (URL, clave pública y usuario de prueba)");
if (new globalThis.URL(URL).hostname !== `${TEST_PROJECT}.supabase.co`) fail(`La URL no es la del proyecto de prueba (${TEST_PROJECT}): ${URL}`);

// --- Datos (sección 9.2) ---
const pad = n => String(n).padStart(2, "0");
const PACMAN = [3000, 2800, 2600, 2400, 2200, 2000, 2000, 1800, 1500, 1200, 900, 600].map((score, i) => ({ username: `tpac${pad(i + 1)}`, score }));
const GHOSTMAN = [4000, 3500, 3000].map((score, i) => ({ username: `tgho${pad(i + 1)}`, score }));
const DP3 = { pacman: 1000, ghostman: 2500 };
const PHASES = {
  pacman: [...PACMAN, { username: TEST_USER, score: DP3.pacman, password: TEST_PASSWORD }],
  ghostman: [...GHOSTMAN, { username: TEST_USER, score: DP3.ghostman, password: TEST_PASSWORD }],
};

// --- API de Supabase ---
function fail(message) { console.error("ERROR " + message); process.exit(1); }
async function call(route, { method = "GET", token, body } = {}) {
  const headers = { apikey: KEY, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${URL}${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
const email = username => `${username.toLowerCase()}@ghostman.invalid`;
async function session(username, password) {
  const login = await call("/auth/v1/token?grant_type=password", { method: "POST", body: { email: email(username), password } });
  if (login.status === 200) return login.json.access_token;
  const signup = await call("/auth/v1/signup", { method: "POST", body: { email: email(username), password, data: { username } } });
  if (signup.status !== 200 || !signup.json?.access_token) fail(`No se pudo iniciar sesión ni registrar ${username}: ${signup.status} ${signup.text}`);
  return signup.json.access_token;
}
const board = async (token, mode) => {
  const r = await call(`/rest/v1/best_scores?select=score,achieved_at,profiles(username)&mode=eq.${mode}&order=score.desc,achieved_at.asc`, { token });
  if (r.status !== 200) fail(`No se pudo leer el tablero ${mode}: ${r.status} ${r.text}`);
  return r.json.map(row => ({ username: row.profiles.username, score: row.score }));
};

async function load(mode) {
  const rows = PHASES[mode];
  const allowed = new Set(rows.map(r => r.username.toLowerCase()));
  const reader = await session(TEST_USER, TEST_PASSWORD);

  const before = await board(reader, mode);
  const foreign = before.filter(r => !allowed.has(r.username.toLowerCase()));
  if (foreign.length) fail(`El tablero ${mode} tiene puntajes que no son de prueba (${foreign.slice(0, 5).map(r => `${r.username}:${r.score}`).join(", ")}…). Correr limpiar_tableros.sql`);

  for (const { username, score, password = DP_PASSWORD } of rows) {
    const token = await session(username, password);
    const r = await call("/rest/v1/rpc/submit_score", { method: "POST", token, body: { p_mode: mode, p_score: score } });
    if (r.status !== 200) fail(`submit_score de ${username} (${mode}, ${score}): ${r.status} ${r.text}`);
    if (r.json[0].best !== score) fail(`${username} ya tiene ${r.json[0].best} en ${mode} (se esperaba ${score}). Correr limpiar_tableros.sql`);
    console.log(`${r.json[0].improved ? "cargado " : "ya estaba"} ${mode.padEnd(8)} ${username.padEnd(12)} ${score}`);
  }

  // Comprobación: el tablero completo coincide con lo esperado, en orden.
  const expected = [...rows].map(({ username, score }) => ({ username, score })).sort((a, b) => b.score - a.score);
  const after = await board(reader, mode);
  const same = after.length === expected.length && after.every((r, i) => r.username.toLowerCase() === expected[i].username.toLowerCase() && r.score === expected[i].score);
  if (!same) fail(`El tablero ${mode} no coincide con lo esperado:\n  esperado ${JSON.stringify(expected)}\n  obtenido ${JSON.stringify(after)}`);
  console.log(`OK   tablero ${mode}: ${after.length} filas; top 10 = ${after.slice(0, 10).map(r => `${r.username} ${r.score}`).join(", ")}`);
}

(async () => {
  const arg = process.argv[2];
  if (arg && !PHASES[arg]) fail(`Fase desconocida "${arg}": usar pacman, ghostman o nada`);
  for (const mode of arg ? [arg] : ["pacman", "ghostman"]) await load(mode);
})().catch(e => fail(e.message));
