# Scripts de verificación de la V2

Scripts que se usaron durante la sesión de generación de la V2 para verificar el criterio de avance de cada incremento antes de cerrar su commit (sección 7 de `TP/entrega-02.md`). Quedan en el repositorio como base para la regresión automatizada que prevé la sección 9.1 de la Entrega 01.

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
| `core/inc13.js` | 13 | Espectro (cruce, cooldown, casos sin destino válido, nivel 1), saltarín (200 saltos, uniformidad chi-cuadrado), indicador, barra espaciadora en modo Pacman |
| `core/inc14.js` | 14 | Fruta falsa: línea de tiempo del prompt, forma de la explosión, consumo con y sin PowerUp, reinicio del nivel, pausa |
| `core/inc15.js` | 15 | Dash de 3, 2, 1 y 0 celdas, contacto en todo el trayecto, penalidad de velocidad, cooldown |
| `core/inc16.js` | 16 | Modo Pacman: composición de los niveles 1 a 3, 1000 reapariciones por nivel (50 % con poderes en el nivel 2, tipo uniforme por chi-cuadrado), uso de los poderes por la IA, ninguno vulnerable lo usa, fruta falsa con y sin PowerUp, nivel 1 sin cambios |
| `core/inc17.js` | 17 | Modo GhostMan: cargas de destrucción (5, se reponen, se pierden con el PowerUp), atajo a través de un muro, restablecimiento al reiniciarse el nivel, nunca un borde ni más de 5 por esfera grande, esferas grandes fijas y dinámicas del nivel 3, Game Over con dinámicas pendientes, pausa |

Las suites de un incremento tienen en cuenta los incrementos posteriores: cuando un incremento cambia a propósito una regla, se actualizan las comprobaciones anteriores que dependían de ella (tabla 7.5, filas 7, 9 y 18).

## Suites de navegador

```bash
npm run build && npm start                         # en otra terminal: la aplicación en http://localhost:3000
CHROMIUM_PATH=/usr/bin/chromium npm run verify:ui  # todas las suites
npm run verify:ui -- 13                            # solo la del incremento 13
```

Manejan la aplicación con Chromium sin interfaz (`playwright-core`) a través de la interfaz real: teclado, clics y los atributos `data-testid` de los componentes. Variables de entorno:

| Variable | Uso | Por defecto |
|---|---|---|
| `BASE_URL` | URL de la aplicación | `http://localhost:3000` |
| `CHROMIUM_PATH` | Ejecutable de Chromium | El que instala `npx playwright-core install chromium` |
| `SHOTS_DIR` | Carpeta para las capturas | Una carpeta temporal del sistema |

**Limitaciones conocidas:**
- `inc10-pantallas-cierre.js` y `inc12-reglas-ghostman.js` esperan a que termine una partida sin intervención: tardan hasta 3 y 12 minutos. Desde el incremento 17, con la destrucción de paredes, la partida sin intervención del modo GhostMan pasó de unos 280 s a unos 500 a 540 s.
- `inc13-estrella.js` mide los 10 s del cooldown con el reloj real. El bucle del juego limita cada cuadro a 250 ms, así que si el navegador se traba (por ejemplo, con el equipo muy cargado), el tiempo de juego atrasa y la medición puede fallar sin que haya un defecto.
- Las suites no pueden leer el estado interno del juego: verifican por lo que muestra la página.

## Balance del modo GhostMan

```bash
npm run verify:balance              # bot perseguidor sin usar el poder
npm run verify:balance -- --power   # el bot usa el poder si Pacman está a 6 celdas o menos
```

Juega 10 partidas por tipo de fantasma con un bot que persigue a Pacman por el camino más corto, y muestra `V` (victoria) o `GO@N<nivel>` (Game Over en ese nivel). Es la medición de la sección 7.6. El bot no es un jugador real: sirve para comparar el efecto de un cambio, no para afirmar que el juego está balanceado.
