// CP-060 · Pantalla de Game Over (HU-19, prioridad Alta, épica E4)
//
// Caso de prueba de caja negra: maneja la aplicación igual que un usuario (teclado, clics y
// lo que muestra la pantalla), sin leer ni modificar el estado interno del juego.
//
// Pre-requisitos
//   1. Abrir la aplicación en un navegador de escritorio.
//   2. Iniciar sesión con el usuario de prueba, elegir «Jugar» y luego «Modo PacMan».
//   3. Partida en curso en el nivel 1.
// Pasos
//   1. Perder la última vida        → el contador de vidas queda sin íconos.
//   2. Observar la pantalla         → pantalla de Game Over con el puntaje final desglosado y las
//                                     acciones «Volver a jugar» y «Menú principal»;
//                                     «Menú principal» lleva al menú.
//
// Para perder las vidas el script lleva a Pacman hacia el centro del mapa, por donde salen los
// fantasmas de la base, hasta que lo alcanzan. No usa atajos ni un build especial: corre contra
// la aplicación desplegada en Vercel.
const { test, expect } = require("@playwright/test");

const USER = process.env.GHOSTMAN_USER;
const PASSWORD = process.env.GHOSTMAN_PASSWORD;

/** Ejecuta un paso del caso, muestra el resultado por consola y adjunta una captura al reporte. */
async function paso(page, nombre, esperado, accion) {
  await test.step(nombre, async () => {
    console.log(`\n▶ ${nombre}\n  Esperado: ${esperado}`);
    const obtenido = await accion();
    console.log(`  Obtenido: ${obtenido}  ✔`);
    await test.info().attach(nombre, { body: await page.screenshot(), contentType: "image/png" });
  });
}

/** Cantidad de vidas que muestra el contador del extremo inferior izquierdo. */
async function vidas(page) {
  return Number(await page.getByTestId("player-lives").getAttribute("data-lives"));
}

/**
 * Mueve a Pacman hacia el centro del mapa, por donde salen los fantasmas de la base, hasta que el
 * contador de vidas baje a `restantes`. Así la partida termina antes que dejándolo quieto.
 */
async function irAlEncuentro(page, restantes) {
  const teclas = (process.env.TECLAS || "ArrowUp,ArrowLeft,ArrowUp,ArrowRight").split(",");
  const limite = Date.now() + 150_000;
  for (let i = 0; (await vidas(page)) > restantes; i++) {
    if (Date.now() > limite) throw new Error(`Pacman no perdió la vida en 150 s (vidas: ${await vidas(page)})`);
    if (process.env.QUIETO !== "1") await page.keyboard.press(teclas[i % teclas.length]);
    await page.waitForTimeout(Number(process.env.PAUSA_TECLAS ?? 600));
  }
  await expect(page.getByTestId("player-lives")).toHaveAttribute("data-lives", String(restantes));
}

test("CP-060 · Pantalla de Game Over", async ({ page }) => {
  if (!USER || !PASSWORD) throw new Error("Faltan GHOSTMAN_USER y GHOSTMAN_PASSWORD en automatizacion/.env");
  const inicio = Date.now();
  const seg = () => `${Math.round((Date.now() - inicio) / 1000)} s`;

  // ── Pre-requisitos ─────────────────────────────────────────────────────────────────────────
  await paso(page, "Pre-requisito 1: abrir la aplicación", "se muestra la pantalla de inicio de sesión", async () => {
    await page.goto("/");
    await expect(page.getByTestId("auth-login")).toBeVisible({ timeout: 30_000 });
    return "pantalla de inicio de sesión visible";
  });

  await paso(page, "Pre-requisito 2a: iniciar sesión con el usuario de prueba", "se muestra el menú principal con el saludo al usuario", async () => {
    await page.getByTestId("auth-username").fill(USER);
    await page.getByTestId("auth-password").fill(PASSWORD);
    await page.getByTestId("auth-submit").click();
    await expect(page.getByTestId("main-menu"), "No se pudo iniciar sesión: revisá el usuario y la contraseña del .env").toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("main-menu-user")).toContainText(USER, { ignoreCase: true });
    return `menú principal, «${(await page.getByTestId("main-menu-user").innerText()).trim()}»`;
  });

  await paso(page, "Pre-requisito 2b: elegir «Jugar» y luego «Modo PacMan»", "comienza una partida en modo Pacman", async () => {
    await page.getByTestId("home-play").click();
    await expect(page.getByTestId("mode-menu")).toBeVisible();
    await page.getByTestId("menu-pacman").click();
    await expect(page.locator("canvas")).toBeVisible();
    return "partida iniciada (canvas del juego visible)";
  });

  await paso(page, "Pre-requisito 3: partida en curso en el nivel 1", "nivel 1 y 3 vidas", async () => {
    await expect(page.getByTestId("hud-level")).toHaveText("Nivel 1");
    await expect(page.getByTestId("player-lives")).toHaveAttribute("data-lives", "3");
    return `${await page.getByTestId("hud-level").innerText()}, ${await vidas(page)} vidas`;
  });

  // ── Paso 1 ─────────────────────────────────────────────────────────────────────────────────
  await paso(page, "Paso 1: perder la última vida (Pacman va al encuentro de los fantasmas)", "el contador de vidas queda sin íconos", async () => {
    for (const restantes of [2, 1, 0]) {
      await irAlEncuentro(page, restantes);
      console.log(`    · ${seg()}: un fantasma alcanzó a Pacman, quedan ${restantes} vidas`);
      if (restantes > 0) await test.info().attach(`Vidas: ${restantes}`, { body: await page.screenshot(), contentType: "image/png" });
    }
    await expect(page.getByTestId("life-icon")).toHaveCount(0);
    return "0 íconos de vida en el contador";
  });

  // ── Paso 2 ─────────────────────────────────────────────────────────────────────────────────
  await paso(page, "Paso 2: observar la pantalla de Game Over", "Game Over con el puntaje desglosado y las acciones «Volver a jugar» y «Menú principal»", async () => {
    await expect(page.getByRole("heading", { name: /Game Over/ })).toBeVisible();
    const desglose = page.getByTestId("score-breakdown");
    for (const fila of ["Esferas", "Fantasmas comidos", "Frutas", "Bonus por tiempo", "Bonus por vidas", "Total"]) {
      await expect(desglose.getByRole("cell", { name: fila, exact: true })).toBeVisible();
    }
    const total = await page.getByTestId("final-score").innerText();
    expect(Number(total)).toBeGreaterThanOrEqual(0);
    await expect(page.getByRole("button", { name: "Volver a jugar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Menú principal" })).toBeVisible();
    await page.waitForTimeout(1500); // pausa para que se vea la pantalla en la demo
    return `Game Over, puntaje total ${total}, desglose de 5 rubros + Total, botones «Volver a jugar» y «Menú principal»`;
  });

  await paso(page, "Paso 2 (cont.): «Menú principal» lleva al menú", "se muestra el menú principal", async () => {
    await page.getByRole("button", { name: "Menú principal" }).click();
    await expect(page.getByTestId("main-menu")).toBeVisible();
    return "menú principal visible";
  });

  console.log(`\n✅ CP-060 APROBADO en ${seg()}`);
});
