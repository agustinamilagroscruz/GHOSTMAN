// Incremento 23 — sprites de pixel art (HU-50; decisión 58). Suite del núcleo, sin navegador.
// Se corre con `npm run verify` (recibe el directorio del núcleo compilado). Verifica los datos de
// los sprites (generados desde art/ghostman.px.js), la elección de cuadros y las paletas de las skins.
const path = require("path");
const B = process.argv[2];
const { SPRITES, SPRITE_ROLE_COLORS } = require(path.join(B, "sprites.js"));
const fr = require(path.join(B, "spriteFrames.js"));
const sk = require(path.join(B, "skins.js"));
let fails = 0;
const check = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const DIRS = ["up", "down", "left", "right"];
const KINDS = ["classic", "specter", "jumper", "naval", "accelerated"];
const at = (s, x, y) => s.rows[y]?.[x] ?? ".";

// ---------- Sprites completos y bien formados
const required = [
  ...DIRS.flatMap(d => [0, 1, 2].map(i => `pacman_${d}_${i}`)),
  ...[...KINDS, "vulnerable"].flatMap(k => [0, 1].map(i => `ghost_${k}_${i}`)),
  ...DIRS.map(d => `eyes_${d}`),
  "pellet", "power_pellet", "fruit", "fake_fruit",
];
const missing = required.filter(n => !SPRITES[n]);
check(missing.length === 0, `están los ${required.length} sprites de la decisión 58${missing.length ? " (faltan " + missing.join(", ") + ")" : ""}`);
const malformed = Object.entries(SPRITES).filter(([, s]) => s.rows.length !== s.h || s.rows.some(r => r.length !== s.w));
check(malformed.length === 0, "cada sprite tiene las filas y columnas que declara");
const unknown = Object.entries(SPRITES).filter(([, s]) => s.rows.some(r => [...r].some(ch => ch !== "." && !SPRITE_ROLE_COLORS[ch])));
check(unknown.length === 0, "todos los píxeles son de un rol de la paleta");
check(KINDS.every(k => [0, 1].every(i => SPRITES[`ghost_${k}_${i}`].rows.filter(r => r.includes("b")).length === (k === "jumper" ? 11 : 14))),
  "los cuerpos de los fantasmas miden 14 px de alto (11 el saltarín, que se apoya en los resortes)");

// ---------- Los ojos caen sobre el cuerpo de cada tipo (se alinean por el ancla)
for (const kind of [...KINDS]) {
  for (const i of [0, 1]) {
    const body = SPRITES[`ghost_${kind}_${i}`];
    const bad = DIRS.filter(d => {
      const eyes = SPRITES[`eyes_${d}`];
      for (let y = 0; y < eyes.h; y++) for (let x = 0; x < eyes.w; x++) {
        if (at(eyes, x, y) === ".") continue;
        if (at(body, x - eyes.ax + body.ax, y - eyes.ay + body.ay) !== "b") return true;
      }
      return false;
    });
    if (i === 0 || bad.length) check(bad.length === 0, `${kind} (cuadro ${i}): los ojos en las 4 direcciones caen dentro del cuerpo${bad.length ? " (fallan " + bad.join(", ") + ")" : ""}`);
  }
}

// ---------- Cada tipo se distingue por la forma, no por el color (decisión 58)
const silhouette = name => SPRITES[name].rows.map(r => r.replace(/[^.]/g, "#")).join("/");
const shapes = KINDS.map(k => silhouette(`ghost_${k}_0`));
check(new Set(shapes).size === KINDS.length, "las siluetas de los 5 tipos son distintas entre sí (con cualquier paleta)");
check(SPRITES.ghost_jumper_0.rows.some(r => r.includes("d")) && SPRITES.ghost_naval_0.rows.some(r => r.includes("a")) && SPRITES.ghost_accelerated_0.rows.some(r => r.indexOf("d") >= 0 && r.indexOf("d") < r.indexOf("b")),
  "rasgos: resortes del saltarín, gorro con cinta del naval y líneas de velocidad del acelerado");
check(KINDS.every(k => fr.ghostSpriteName(k, true, 3, 5) === fr.ghostSpriteName("classic", true, 3, 5)), "vulnerable: el mismo sprite para todos los tipos");
check(SPRITES.ghost_vulnerable_0.rows.some(r => r.includes("v")) && !SPRITES.ghost_vulnerable_0.rows.some(r => /[wpda]/.test(r)), "vulnerable: con cara y sin ojos ni rasgos de tipo");

// ---------- Pacman: 3 cuadros por dirección, con la boca hacia donde va
{
  const closed = SPRITES.pacman_right_0;
  check(closed.rows.every((r, y) => y < 1 || y > 13 || !/b\.+b/.test(r)), "cuadro 0: boca cerrada (sin huecos dentro del círculo)");
  const mouth = { right: [12, 7], left: [2, 7], up: [7, 2], down: [7, 12] };
  for (const d of DIRS) {
    const [x, y] = mouth[d];
    check(at(SPRITES[`pacman_${d}_2`], x, y) === "." && at(SPRITES[`pacman_${d}_0`], x, y) === "b" && at(SPRITES[`pacman_${d}_1`], x, y) === ".",
      `${d}: la boca se abre hacia ${({ right: "la derecha", left: "la izquierda", up: "arriba", down: "abajo" })[d]}`);
  }
  const frames = new Set();
  for (let p = 0; p < 1; p += 0.05) frames.add(fr.pacmanSpriteName("right", 3, 5 + p));
  check(frames.size === 3, `al recorrer una celda pasa por los 3 cuadros (${[...frames].join(", ")})`);
  check(fr.pacmanSpriteName(null, 3, 5) === "pacman_right_1", "quieto, sin dirección: boca entreabierta mirando a la derecha");
  check(fr.pacmanSpriteName("left", 13, -0.4).startsWith("pacman_left_"), "a mitad del túnel (columna negativa) elige un cuadro válido");
}

// ---------- Fantasmas: 2 cuadros y ojos que miran hacia donde avanzan
{
  const frames = new Set();
  for (let p = 0; p < 1; p += 0.05) frames.add(fr.ghostSpriteName("naval", false, 3, 5 + p));
  check(frames.size === 2, "al recorrer una celda alterna los 2 cuadros de la pollera");
  check(DIRS.every(d => fr.eyesSpriteName(d) === `eyes_${d}`), "los ojos miran hacia la dirección de avance");
  check(fr.isGhostSpriteFlipped("accelerated", false, "left") && !fr.isGhostSpriteFlipped("accelerated", false, "right") &&
    !fr.isGhostSpriteFlipped("classic", false, "left") && !fr.isGhostSpriteFlipped("accelerated", true, "left"),
    "las líneas del acelerado quedan detrás: se refleja solo cuando va a la izquierda");
}

// ---------- Skins (decisión 58)
{
  const roles = new Set([...KINDS.map(k => `ghost_${k}_0`), "eyes_up"].flatMap(n => SPRITES[n].rows.join("").replace(/\./g, "").split("")));
  for (const skin of sk.GHOST_SKINS) {
    const pal = sk.ghostPalette(skin, "inky", "#00ffff");
    check([...roles].every(r => pal[r]), `skin de fantasmas "${skin.name}": define todos los roles de los sprites (${[...roles].join(", ")})`);
  }
  const clasica = sk.findGhostSkin("clasica"), pastel = sk.findGhostSkin("pastel");
  check(sk.ghostPalette(clasica, "inky", "#00ffff").b === "#00ffff", "skin clásica: cada fantasma con su color propio");
  check(sk.ghostPalette(pastel, "inky", "#00ffff").b !== "#00ffff" && new Set(["blinky", "pinky", "inky", "clyde"].map(id => sk.ghostPalette(pastel, id, "#000").b)).size === 4,
    "skin alternativa \"Pastel\": cambia los colores y los cuatro siguen siendo distintos");
  check(sk.findPacmanSkin("menta").body !== sk.findPacmanSkin("clasico").body && sk.pacmanPalette(sk.findPacmanSkin("menta")).b === sk.findPacmanSkin("menta").body,
    "skin alternativa de Pacman \"Menta\"");
  check(sk.vulnerablePalette(false).b === "#2121de" && sk.vulnerablePalette(true).b === "#ffffff", "vulnerable: azul, y blanco en el parpadeo");
  check(!sk.GHOST_SKINS.some(s => Object.values(s.bodies ?? {}).includes("#2121de")), "ninguna skin usa el azul vulnerable como cuerpo (el vulnerable tiene prioridad y se distingue)");
  check(sk.findGhostSkin("inexistente") === sk.DEFAULT_GHOST_SKIN && sk.findPacmanSkin(undefined) === sk.DEFAULT_PACMAN_SKIN, "una skin desconocida o sin indicar usa la clásica");
}

console.log(fails ? `\n${fails} FALLAS` : "\nTodo OK");
process.exit(fails ? 1 : 0);
