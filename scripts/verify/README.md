# Scripts de verificación de la V2 y la V3

Scripts que se usaron durante las sesiones de generación de la V2 y la V3 para verificar el criterio de avance de cada incremento antes de cerrar su commit (sección 7 de `TP/entrega-02.md` y de `TP/entrega-03.md`). Quedan en el repositorio como base para la regresión automatizada que prevé la sección 9.1 de la Entrega 01.

**No reemplazan a los casos de prueba.** Los casos de prueba de la V2 son manuales, de caja negra, y se ejecutan sobre la aplicación desplegada (sección 9 de la Entrega 01). Estos scripts son de caja blanca: leen y manipulan el estado interno del juego, colocan personajes donde haga falta y fijan el azar. Sirven para detectar regresiones rápido. No sirven como evidencia de ejecución de un caso de prueba.

## Suites del núcleo (sin navegador)

```bash
npm run verify            # todas las suites
npm run verify -- 13 14   # solo las de los incrementos 13 y 14
```

`run-core.js` compila `src/game` (el núcleo del juego, sin React ni canvas) a un directorio temporal y corre `core/incNN.js`. Cada suite imprime `OK` o `FAIL` por comprobación y termina con código 1 si alguna falla. Son deterministas: usan semillas fijas para el azar.

| Suite | Incremento | Qué verifica |
|---|---|---|
| `core/inc10.js` | 10 | Modo y fantasma del jugador, velocidades por tipo, control con teclado, muros, composición de los fantasmas de la IA, "Volver a jugar" |
| `core/inc11.js` | 11 | IA de Pacman: completa los tres niveles, huye, persigue vulnerables, va por frutas cercanas, es determinista |
| `core/inc12.js` | 12 | Derrotas de Pacman, reinicio del nivel (tabla 4.3), toque de los fantasmas de la IA, vulnerabilidad y reaparición, puntaje y desglose |
| `core/inc13.js` | 13 | Espectro (cruce, cooldown, casos sin destino válido, nivel 1), saltarín (200 saltos con dirección de avance, uniformidad chi-cuadrado), indicador, barra espaciadora en modo Pacman |
| `core/inc14.js` | 14 | Fruta falsa: línea de tiempo del prompt, forma de la explosión, consumo con y sin PowerUp, reinicio del nivel, pausa |
| `core/inc15.js` | 15 | Dash de 3, 2, 1 y 0 celdas (desde el incremento 20, esperando los 0,25 s del impulso), contacto en todo el trayecto, penalidad de velocidad, cooldown |
| `core/inc16.js` | 16 | Modo Pacman: composición de los niveles 1 a 3, 1000 reapariciones por nivel (50 % con poderes en el nivel 2, tipo uniforme por chi-cuadrado), uso de los poderes por la IA, ninguno vulnerable lo usa, fruta falsa con y sin PowerUp, nivel 1 sin cambios |
| `core/inc17.js` | 17 | Modo GhostMan: cargas de destrucción (5, se reponen, se pierden con el PowerUp), atajo a través de un muro, restablecimiento al reiniciarse el nivel, nunca un borde ni más de 5 por esfera grande, esferas grandes fijas y dinámicas del nivel 3, Game Over con dinámicas pendientes, pausa |
| `core/inc18.js` | 18 | Memoria de frutas falsas de la IA de Pacman (registro a 8 celdas o menos solo al colocarla, olvido del 5 % por segundo con el azar fijado, no consume la que recuerda, espera si bloquea la única ruta), salto del saltarín estrictamente adelante (todas las celdas y direcciones, destinos exactos del semiplano, uniformidad, sin dirección, sin destino, IA del modo Pacman) y cooldown que corre con el fantasma de la IA comido |
| `core/inc19.js` | 19 | Mapas de 28 × 31 (simetría, base, puerta, túnel, aparición de Pacman), salida de la base cada 3 s en los dos modos, puerta de un solo sentido, Pacman nunca entra a la base, ojos que vuelven por el camino más corto al doble de velocidad y espera del naval, túnel en los dos sentidos con los fantasmas al 50 %, contacto a través del borde, celdas restringidas (saltarín, frutas, esferas dinámicas, naval), poderes sin efecto dentro de la base y partida con el jugador quieto |
| `core/inc20.js` | 20 | Impulso del acelerado: 3 celdas en 15 cuadros a 12 celdas/s, sin obedecer al teclado, penalidad al terminar, contacto en el trayecto (también de frente), corte al ser comido o por el reinicio del nivel con la penalidad igual, cruce del túnel sin reducción, sin impulso contra un muro e IA del modo Pacman |
| `core/inc21.js` | 21 | Mapas compactos (esferas, esferas grandes, simetría, marco fijo, conexión, sin callejones ni espacios de 2 × 2, cruces del espectro), velocidades de la decisión 70 y Pacman al −15 % en modo GhostMan (decisión 71), regla del contorno de los muros y copia del sprite en el túnel |
| `core/inc22.js` | 22 | Cuenta "3, 2, 1, ¡ya!" en los dos modos, en cada nivel y al volver a jugar; "¡Listo!" después de perder una vida y de una derrota de Pacman, y no con la última vida; nada avanza durante la cuenta (personajes, bonus por tiempo, salida de la base, cooldowns, PowerUp, frutas); teclas descartadas; pausa; duraciones 0 por defecto; lectura de `?modoPrueba=1` con y sin la variable de build |
| `core/inc23.js` | 23 | Sprites (los 32 de la decisión 58, bien formados y con roles de la paleta), ojos alineados con el cuerpo de cada tipo en las 4 direcciones, siluetas distintas por tipo, vulnerable igual para todos, boca de Pacman hacia donde va, ciclo de cuadros, reflejo del acelerado y paletas de las skins |
| `core/inc24.js` | 24 | Derrota de Pacman (0,5 s congelado y 1,5 s de animación, nada avanza ni suma, pausa, y al terminar "¡Listo!", Game Over o nivel completado según el caso; inmediata sin duraciones), salto del saltarín de 0,6 s (origen, destino, sin colisión en el aire, colisión al aterrizar, sin control ni segundo poder, polvo, corte por el reinicio), arco del salto y duraciones de los efectos del naval |
| `core/inc25.js` | 25 | Eventos de sonido del núcleo (jingle de inicio, waka, esfera grande, fantasma, fruta, derrota, Game Over, nivel completado, cada poder del jugador y de la IA, explosión y muro roto), nada durante la cuenta ni la pausa, y canal de cada sonido según la decisión 57 |
| `core/inc26.js` | 26 | Ajustes de la prueba manual: el fantasma del jugador que sale de la base sin frenar deja de estar en la base (y puede usar su poder, y no puede volver a entrar), cruces del espectro de una y dos celdas en los tres niveles (nunca tres, ni el borde ni la base), cruce completo del jugador y de la IA, líneas del acelerado del lado del que viene |
| `core/inc29.js` | 29 | Las skins no alteran las mecánicas (CP-134): la misma partida de 60 s, con el mismo azar y las mismas teclas, con las skins clásicas y con las alternativas, en el modo Pacman y con cada tipo de fantasma del modo GhostMan; el estado (posiciones, vidas, puntaje, desglose, esferas, frutas) es idéntico |

Los incrementos 27 y 28 no tienen suite del núcleo: las cuentas y los puntajes no están en `src/game`, y se verifican con las suites de navegador `inc27-cuentas.js` e `inc28-puntajes.js`.

Las suites de un incremento tienen en cuenta los incrementos posteriores: cuando un incremento cambia a propósito una regla, se actualizan las comprobaciones anteriores que dependían de ella (tabla 7.5 de la Entrega 02, filas 7, 9 y 18). Desde el incremento 19 todas las coordenadas son de los mapas de 28 × 31 de la V3 (`Workflow/v3-mapas.md`).

## Suites de navegador

```bash
NEXT_PUBLIC_MODO_PRUEBA=1 npm run build && npm start  # en otra terminal: build de prueba en http://localhost:3000
CHROMIUM_PATH=/usr/bin/chromium npm run verify:ui  # todas las suites
npm run verify:ui -- 13                            # solo la del incremento 13
```

Manejan la aplicación con Chromium sin interfaz (`playwright-core`) a través de la interfaz real: teclado, clics y los atributos `data-testid` de los componentes. Desde el incremento 22 abren el juego con `?modoPrueba=1` (sección 4.9 de la Entrega 03), que elimina la cuenta regresiva y el "¡Listo!" para que sus tiempos no cambien. El parámetro solo funciona en un build hecho con `NEXT_PUBLIC_MODO_PRUEBA=1`; en el despliegue de Vercel se ignora. `inc22-cuenta.js` abre el juego también sin el parámetro, para ver la cuenta. Variables de entorno:

| Variable | Uso | Por defecto |
|---|---|---|
| `BASE_URL` | URL de la aplicación | `http://localhost:3000` |
| `CHROMIUM_PATH` | Ejecutable de Chromium | El que instala `npx playwright-core install chromium` |
| `SHOTS_DIR` | Carpeta para las capturas | Una carpeta temporal del sistema |
| `GHOSTMAN_TEST_USER`, `GHOSTMAN_TEST_PASSWORD` | Usuario de prueba del proyecto de Supabase de prueba | Se leen de `.env.local` |

Desde el incremento 27, para jugar hace falta sesión iniciada (decisión 66). `helpers.js` lee `.env.local` (las variables de Supabase y del usuario de prueba, que no se suben al repositorio), inicia sesión con el usuario de prueba antes de cada suite y, si no existe en el proyecto de prueba, lo registra. El build de prueba tiene que hacerse con las variables del proyecto de **prueba**.

| Suite | Incremento | Qué verifica |
|---|---|---|
| `ui/inc10-menu-carrusel.js` | 10 | Elección de modo (Pacman, GhostMan y Volver), navegación con flechas, carrusel de fantasmas del modo GhostMan y partida con el fantasma elegido |
| `ui/inc10-pantallas-cierre.js` | 10 | Game Over con "Volver a jugar" y "Menú principal", esperando a que los fantasmas atrapen a Pacman quieto |
| `ui/inc11-ia-pacman.js` | 11 | Pacman se mueve solo en modo GhostMan y se detiene en pausa |
| `ui/inc12-reglas-ghostman.js` | 12 | Barra de vidas de Pacman y desglose final del modo GhostMan, en una partida completa sin intervención |
| `ui/inc13-estrella.js` | 13 | Indicador ⭐: se apaga con la barra espaciadora y vuelve a los 10 s |
| `ui/inc14-naval.js` | 14 | El naval coloca una fruta falsa; capturas de la cuenta regresiva de la fruta y de la explosión |
| `ui/inc15-acelerado.js` | 15 | El acelerado ejecuta el *dash* y el indicador ⭐ se apaga |
| `ui/inc22-cuenta.js` | 22 | Sin el modo de prueba: "3, 2, 1, ¡ya!" con Pacman quieto hasta el "¡ya!" y "¡Listo!" después de perder una vida. Con `?modoPrueba=1`: sin cuenta y Pacman se mueve de inmediato |
| `ui/inc25-audio.js` | 25 | Registro de `window.__ghostmanAudio`: nada antes de la primera interacción, jingle de inicio, sirena, waka, esfera grande, sirena del PowerUp, silencio en pausa y con la pestaña oculta, y vuelta del audio |
| `ui/inc27-cuentas.js` | 27 | Login y registro: campos vacíos, valores límite del username (2, 3, 16 y 17) y de la contraseña (7 y 8), espacios y símbolos, letras y números, confirmación, campos ocultos, registro exitoso con el username como se registró, username en uso con otras mayúsculas, rechazos del servidor sin cuenta parcial (contraseña débil y trigger del perfil, por la API), mensaje único para contraseña incorrecta y username inexistente, contraseña que distingue mayúsculas, error general sin conexión, sesión al recargar, menú inaccesible sin sesión y navegación del menú principal. Crea usuarios `v27…` en el proyecto de prueba |
| `ui/inc28-puntajes.js` | 28 | Tableros de puntaje. Por la API: rechazos de `submit_score` (sin sesión, modo inválido, negativo, por encima de 50.000 y 12.480), el máximo de GhostMan aceptado, sin escritura directa en `best_scores` ni lectura sin sesión, mejor personal con un puntaje menor, un empate y uno mayor, corte en 10, orden y empate, un jugador por modo e ingreso inmediato al top 10. Por la interfaz: el tablero y el personal ("Sin partidas"), ← → A D, Esc y Volver, tablero vacío (interceptando la respuesta) y el puntaje de una partida guardado al reintentar sin conexión. Crea usuarios `v28…`: 11 fijos con puntajes del modo Pacman, `v28tope` y los de cada corrida |
| `ui/inc29-opciones.js` | 29 | Opciones con un usuario nuevo `v29…`: valores por defecto (clásicas, 60 y 80), carruseles (recorrer sin confirmar no guarda, Enter guarda; ← → A D), vista previa, volúmenes independientes con efecto inmediato en el motor y canal en 0, skins aplicadas en la partida (píxeles del canvas e íconos de vidas), error al guardar sin conexión, salir del juego y volver a entrar, cerrar sesión y, al volver, skins, volúmenes y puntajes conservados. En los builds de prueba el motor expone en `window.__ghostmanAudio` el volumen y la ganancia de cada canal |

**Limitaciones conocidas:**
- `inc10-pantallas-cierre.js` y `inc12-reglas-ghostman.js` esperan a que termine una partida sin intervención: tardan hasta 3 y 12 minutos. Desde el incremento 17, con la destrucción de paredes, la partida sin intervención del modo GhostMan pasó de unos 280 s a unos 500 a 540 s.
- `inc13-estrella.js` mide los 10 s del cooldown con el reloj real. El bucle del juego limita cada cuadro a 250 ms, así que si el navegador se traba (por ejemplo, con el equipo muy cargado), el tiempo de juego atrasa y la medición puede fallar sin que haya un defecto.
- Las suites no pueden leer el estado interno del juego: verifican por lo que muestra la página.
- Desde el incremento 28, toda partida que termina guarda el puntaje del usuario de prueba en el proyecto de prueba. `inc28-puntajes.js` sube en 1 punto el récord del modo Pacman en cada corrida, para probar el ingreso inmediato al top 10.

## Balance del modo GhostMan

```bash
npm run verify:balance              # bot perseguidor sin usar el poder
npm run verify:balance -- --power   # el bot usa el poder si Pacman está a 6 celdas o menos
```

Juega 10 partidas por tipo de fantasma con un bot que persigue a Pacman por el camino más corto, y muestra `V` (victoria) o `GO@N<nivel>` (Game Over en ese nivel). Es la medición de la sección 7.6. El bot no es un jugador real: sirve para comparar el efecto de un cambio, no para afirmar que el juego está balanceado.
