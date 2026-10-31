// Sprites de GhostMan (incremento 23, HU-50, decisiones 58 y 68). Se dibujan con pxl
// (https://github.com/…/pxl, skill pxl-pixel-art) y `scripts/sprites/generate.mjs` los pasa a
// `src/game/sprites.ts`. Escala del original: la celda es de 8 px y los personajes, de unas 2.
//
// Cada letra es un ROL de color, no un color fijo: el juego pinta cada rol con la paleta de la
// skin (decisión 58). Los colores de acá solo sirven para las vistas previas y deben ser todos
// distintos, porque el generador reconoce el rol por el color.
pal({
  b: "#ff0000", // cuerpo (el color del fantasma o de Pacman)
  k: "#200020", // contorno
  w: "#ffffff", // ojos: blanco
  p: "#2121de", // ojos: pupila
  d: "#e8e8e8", // detalle: resortes, gorro, líneas de velocidad
  a: "#3355ff", // acento: cinta del gorro
  v: "#ffb8ae", // cara del fantasma vulnerable
  f: "#ffd8b0", // esferas
  r: "#e0102f", R: "#8a0a1e", h: "#ffc8c8", g: "#3fbf3f", G: "#2a7a2a", // fruta real (colores fijos)
  x: "#8a2be2", X: "#4b1580", c: "#fefefe", // fruta falsa del naval (colores fijos)
  o: "#38f0e8", // escombros de un muro roto (el juego usa el contorno del nivel)
  s: "#5a5a82", // sombra del destino del saltarín (gris azulado: sobre el fondo negro tiene que verse)
  u: "#c8c0b0", U: "#8a8478", // polvo del aterrizaje
  y: "#fff36b", // destellos (aparición de la fruta falsa)
  e: "#ffe14d", E: "#ff8c1a", F: "#e0301e", // explosión de la fruta falsa
})

// ---------- Pacman: 3 cuadros por dirección (cerrado, entreabierto y abierto)
const MOUTHS = [null, [7, 7, 15, 4, 15, 11], [7, 7, 15, 0, 15, 15]]
MOUTHS.forEach((mouth, i) => {
  sprite(`pacman_right_${i}`, { w: 15, h: 15 }, circ(7, 7, 7, "b"), ...(mouth ? [poly(mouth, "_")] : []))
  sprite(`pacman_left_${i}`, { base: `pacman_right_${i}`, flip: "x" })
  sprite(`pacman_up_${i}`, { base: `pacman_right_${i}`, rot: 270 })
  sprite(`pacman_down_${i}`, { base: `pacman_right_${i}`, rot: 90 })
})

// ---------- Fantasmas: cuerpo de 14 × 14 con contorno (16 × 16), 2 cuadros por tipo. Los ojos van
// aparte (miran hacia donde avanzan) y se dibujan sobre el cuerpo, alineados con su parte de arriba.
const DOME = `
  .....bb
  ...bbbb
  ..bbbbb
  .bbbbbb
  .bbbbbb
  .bbbbbb`
const TRUNK = "bbbbbbb\n".repeat(6)
const SKIRTS = ["bb.bbb.\nb...bb.", "bbbb.bb\n.bb...b"]

// Clásico: la forma tradicional.
SKIRTS.forEach((skirt, i) => sprite(`ghost_classic_${i}`, { mx: true, outline: "k" }, DOME + "\n" + TRUNK + skirt))

// Espectro: bordes ondulados y una cola deshilachada (además, el juego lo dibuja translúcido).
sprite("ghost_specter_0", { mx: true, outline: "k" }, `
  ....bbb
  ..bbbbb
  .bbbbbb
  .bbbbbb
  bbbbbbb
  .bbbbbb
  bbbbbbb
  .bbbbbb
  bbbbbbb
  .bbbbbb
  ..bbbbb
  ...bbbb
  ..b..bb
  .b....b`)
sprite("ghost_specter_1", { mx: true, outline: "k" }, `
  ....bbb
  ..bbbbb
  .bbbbbb
  .bbbbbb
  .bbbbbb
  bbbbbbb
  .bbbbbb
  bbbbbbb
  .bbbbbb
  bbbbbbb
  ..bbbbb
  ...bbbb
  ...b.bb
  ..b...b`)

// Saltarín: pollera corta y dos resortes (estirados y comprimidos).
sprite("ghost_jumper_0", { mx: true, outline: "k" }, DOME + "\n" + "bbbbbbb\n".repeat(4) + `
  bb.bbb.
  ...d...
  ..d....
  ...d...`)
sprite("ghost_jumper_1", { mx: true, outline: "k" }, DOME + "\n" + "bbbbbbb\n".repeat(4) + `
  bb.bbb.
  ..ddd..
  .......
  ..ddd..`)

// Naval: gorro de marinero con cinta, encima de la cabeza (el sprite es 3 filas más alto).
SKIRTS.forEach((skirt, i) => sprite(`ghost_naval_${i}`, { mx: true, outline: "k" }, `
  ....ddd
  ...dddd
  ..aaaaa
  ` + DOME.trim() + "\n" + TRUNK + skirt))

// Acelerado: líneas de velocidad detrás (a la izquierda; el juego lo refleja si va a la izquierda).
SKIRTS.forEach((skirt, i) => {
  const body = (DOME + "\n" + TRUNK + skirt).trim().split("\n").map((row) => row.trim())
  const full = body.map((half) => half + [...half].reverse().join(""))
  const lines = { 5: "ddd.", 8: [".dd.", "ddd."][i], 11: ["ddd.", ".dd."][i] }
  sprite(`ghost_accelerated_${i}`, { outline: "k" }, full.map((row, y) => (lines[y] ?? "....") + row).join("\n"))
})

// Vulnerable: el mismo para todos los tipos (tiene prioridad sobre cualquier skin), con cara.
SKIRTS.forEach((skirt, i) => sprite(`ghost_vulnerable_${i}`, { mx: true, outline: "k" },
  DOME + "\n" + TRUNK + skirt,
  grid(4, 5, "vv"), grid(4, 6, "vv"),
  grid(1, 9, ".vv.vv"), grid(1, 10, "v..v..")))

// Ojos en 4 direcciones (también son los del fantasma comido). Mismo marco que el cuerpo con contorno.
const LOOK = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }
for (const [dir, [dx, dy]] of Object.entries(LOOK)) {
  sprite(`eyes_${dir}`, { w: 16, h: 16 }, (c) => {
    for (const ex of [3, 9]) {
      const x = ex + dx, y = 4 + dy
      c.rect(x + 1, y, 2, 1, "w"); c.rect(x, y + 1, 4, 3, "w"); c.rect(x + 1, y + 4, 2, 1, "w")
      c.rect(x + 1 + dx, y + 2 + dy, 2, 2, "p")
    }
  })
}

// ---------- Esferas
sprite("pellet", { w: 2, h: 2 }, rect(0, 0, 2, 2, "f"))
sprite("power_pellet", { mx: true }, `
  ..ff
  .fff
  ffff
  ffff
  ffff
  ffff
  .fff
  ..ff`)

// ---------- Frutas: cereza real y la falsa del naval (violeta, con una cruz)
sprite("fruit", { w: 12, h: 12 }, `
  .........GG.
  .......GGg..
  ......g..g..
  .....g...g..
  ....g....g..
  ...g....g...
  .rrr...rrr..
  rhrrr.rhrrr.
  rhrrr.rrrrR.
  rrrrR.rrrrR.
  .rrR..RrrR..
  ..R....RR...`)
sprite("fake_fruit", { base: "fruit", swap: { r: "x", R: "X", h: "x", g: "X", G: "X" } },
  grid(1, 7, "c.c"), grid(2, 8, "c"), grid(1, 9, "c.c"), grid(7, 7, "c.c"), grid(8, 8, "c"), grid(7, 9, "c.c"))


// ---------- Animaciones (incremento 24, decisiones 53, 55 y 56)

// Derrota de Pacman: mira hacia arriba y la boca se abre hasta desaparecer; al final, un destello.
for (let i = 0; i < 9; i++) {
  const half = Math.PI * (0.2 + (0.8 * i) / 8) // mitad del ángulo de la boca: de 36° a 180°
  sprite(`pacman_death_${i}`, { w: 15, h: 15 }, circ(7, 7, 7, "b"), (c) => {
    for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {
      if (Math.abs(Math.atan2(x - 7, 7 - y)) < half || i === 8) c.px(x, y, "_")
    }
    if (i === 8) c.px(7, 7, "b")
  })
}
sprite("pacman_death_9", { w: 15, h: 15 }, (c) => {
  for (const [dx, dy] of [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]) c.line(7 + dx * 3, 7 + dy * 3, 7 + dx * 5, 7 + dy * 5, "b")
})
sprite("pacman_death_10", { w: 15, h: 15 }, (c) => {
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) c.line(7 + dx * 5, 7 + dy * 5, 7 + dx * 6, 7 + dy * 6, "b")
})

// Saltarín: sombra en el destino (el juego la agranda hasta el aterrizaje) y polvo al caer.
sprite("jump_shadow", { w: 14, h: 4 }, ellipse(6, 1, 6, 1, "s"), rect(1, 1, 12, 2, "s"))
sprite("dust_0", { w: 16, h: 6 }, `
  ................
  ................
  ................
  .....uu..uu.....
  ....uUUu.uUUu...
  .....uu...uu....`)
sprite("dust_1", { w: 16, h: 6 }, `
  ................
  ................
  ..uu........uu..
  .uUUu......uUUu.
  ..uu........uu..
  ................`)
sprite("dust_2", { w: 16, h: 6 }, `
  ................
  u..............u
  .U............U.
  u..............u
  ................
  ................`)

// Naval: destellos al aparecer la fruta falsa y explosión en cada celda alcanzada.
sprite("sparkle_0", { w: 16, h: 16 }, px(7, 3, "y"), px(12, 7, "y"), px(8, 12, "y"), px(3, 8, "y"))
sprite("sparkle_1", { w: 16, h: 16 }, (c) => {
  for (const [x, y] of [[7, 1], [14, 7], [8, 14], [1, 8]]) { c.px(x, y, "y"); c.px(x - 1, y, "y"); c.px(x + 1, y, "y"); c.px(x, y - 1, "y"); c.px(x, y + 1, "y") }
})
sprite("sparkle_2", { w: 16, h: 16 }, px(4, 2, "y"), px(13, 4, "y"), px(11, 13, "y"), px(2, 11, "y"))
sprite("blast_0", { w: 8, h: 8 }, circ(3, 3, 2, "E"), circ(3, 3, 1, "e"))
sprite("blast_1", { w: 8, h: 8 }, rect(0, 0, 8, 8, "E"), circ(3, 3, 3, "e"), px(0, 0, "_"), px(7, 0, "_"), px(0, 7, "_"), px(7, 7, "_"))
sprite("blast_2", { w: 8, h: 8 }, rect(0, 0, 8, 8, "F"), circ(3, 3, 3, "E"), px(3, 3, "e"), px(4, 4, "e"))
sprite("blast_3", { w: 8, h: 8 }, `
  F......F
  ..F..F..
  .F....F.
  ...FF...
  ...FF...
  .F....F.
  ..F..F..
  F......F`)

// Muro roto: escombros que se separan del centro de la celda y caen.
for (let i = 0; i < 4; i++) {
  sprite(`debris_${i}`, { w: 16, h: 16 }, (c) => {
    const spread = i, fall = i > 1 ? i - 1 : 0
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = 7 + dx * (2 + spread), y = 7 + dy * (2 + spread) + fall
      c.rect(x, y, 2, 2, "o"); c.px(x + (dx > 0 ? 1 : 0), y + 1, "U")
    }
  })
}

// Vista previa con los ojos puestos (no la usa el juego): el juego alinea los ojos con la parte de
// arriba del cuerpo, como acá.
const KINDS = ["classic", "specter", "jumper", "naval", "accelerated"]
scene("vista", { w: 24 * 6, h: 50, bg: "#000000" },
  ...KINDS.flatMap((kind, i) => {
    const dx = kind === "accelerated" ? 4 : 0, dy = kind === "naval" ? 3 : 0
    return [stamp(`ghost_${kind}_0`, 2 + i * 24, 2), stamp("eyes_right", 2 + i * 24 + dx, 2 + dy),
      stamp(`ghost_${kind}_1`, 2 + i * 24, 26), stamp("eyes_down", 2 + i * 24 + dx, 26 + dy)]
  }),
  stamp("ghost_vulnerable_0", 2 + 5 * 24, 2), stamp("ghost_vulnerable_1", 2 + 5 * 24, 26, { swap: { b: "w", v: "r" } }))

// Hoja de contacto para revisar todo junto.
sheet("todo", ["pacman_*", "ghost_*", "eyes_*", "pellet", "power_pellet", "fruit", "fake_fruit"], { pad: 2 })
sheet("animaciones", ["pacman_death_*", "jump_shadow", "dust_*", "sparkle_*", "blast_*", "debris_*"], { pad: 2 })
