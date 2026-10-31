# Proyecto Integrador de Testing de Aplicaciones
## Entrega 03 — GhostMan · Versión 3

**Materia:** Testing de Aplicaciones
**Comisión:** 15852
**Grupo:** Nº 1
**Fecha de presentación:** [fecha]

### Integrantes

| Integrante | LU |
|---|---|
| Cruz, Agustina | 1241748 |
| Luzzi, María Eugenia | 1121159 |
| Rodriguez Castro, Alejandro | 1117972 |
| Savoia, Diego Agustín | 1175679 |
| Tsai, Leonardo Kevin | 1120569 |

### Enlaces del proyecto

| Recurso | Enlace |
|---|---|
| Repositorio de código | https://github.com/agustinamilagroscruz/GHOSTMAN |
| Aplicación desplegada | `[URL de despliegue]` |
| Planilla de casos de prueba y defectos | `[planilla de la Entrega 3]` |
| Documento de la Entrega 01 (V1) | [`TP/entrega-01.md`](entrega-01.md) |
| Documento de la Entrega 02 (V2) | [`TP/entrega-02.md`](entrega-02.md) |
| Bocetos de los mapas de la V3 | [`Workflow/v3-mapas.md`](../Workflow/v3-mapas.md) |
| Checklist de trabajo de la V3 | [`Workflow/v3-workflow.md`](../Workflow/v3-workflow.md) |

---

## Índice

1. [Objetivo de la entrega](#1-objetivo-de-la-entrega)
2. [Punto de partida](#2-punto-de-partida)
3. [Alcance de la V3](#3-alcance-de-la-v3)
4. [Reglas de negocio y parámetros de la V3](#4-reglas-de-negocio-y-parámetros-de-la-v3)
5. [Decisiones sobre ambigüedades de la V3](#5-decisiones-sobre-ambigüedades-de-la-v3)
6. [Ajustes a las historias de usuario](#6-ajustes-a-las-historias-de-usuario)
7. [Implementación de la V3 con AI](#7-implementación-de-la-v3-con-ai)
8. [Estrategia de pruebas de la V3](#8-estrategia-de-pruebas-de-la-v3)
9. [Especificación de casos de prueba de la V3](#9-especificación-de-casos-de-prueba-de-la-v3)
10. [Matriz de trazabilidad](#10-matriz-de-trazabilidad)
11. [Reporte de ejecución de casos de prueba](#11-reporte-de-ejecución-de-casos-de-prueba)
12. [Reporte de defectos](#12-reporte-de-defectos)
13. [Conclusiones y próximos pasos](#13-conclusiones-y-próximos-pasos)
14. [Anexos](#14-anexos)

---

## 1. Objetivo de la entrega

Esta entrega documenta la construcción y la verificación de la **Versión 3** de GhostMan, la versión final del juego. La V3 suma lo que estaba planificado desde la Entrega 01 (cuentas de usuario, tableros de puntaje, skins y opciones) y una épica nueva de **look & feel**, que recupera elementos clásicos del Pac-Man que el juego todavía no tenía: la base de los fantasmas, el túnel lateral, la cuenta regresiva, la animación de derrota de Pacman, la música y los efectos de sonido, y los sprites de pixel art.

Sigue la misma estructura metodológica de las entregas anteriores:

- Cierre de las ambigüedades de la especificación de la V3 **antes** de generar código (sección 5).
- Generación incremental con AI, con un prompt y un commit por incremento, y registro de los problemas de la sesión (sección 7).
- Detalle completo de los casos de prueba de la V3, que en la Entrega 01 quedaron en formato sintético (sección 9).
- Ejecución de los casos de la V3 y de la regresión de la V1 y la V2, con su reporte de defectos (secciones 11 y 12).

Este documento **no repite** el contenido de las entregas anteriores. Las historias de usuario de la V3 planificadas desde el principio (HU-35 a HU-42) están en la sección 7.5 de `entrega-01.md`, y las reglas de cuentas y puntajes en su sección 4.9. Acá se registra solo lo que la V3 agrega o modifica.

---

## 2. Punto de partida

### 2.1 Estado de la V2

La V2 está **cerrada**: generada (incrementos 10 a 17), desplegada en Vercel, con los 62 casos de la V2 ejecutados junto con la regresión completa de la V1, y los defectos reportados (sección 11 de la Entrega 02). La V3 parte de `main` después del documento de la Entrega 2.

| Dato | Valor |
|---|---|
| Commit base de la V3 | `d587568` |
| Tag de referencia | `v2.0` *(pendiente de crear, sección 13.2)* |
| Casos de la V1 | CP-001 a CP-066 |
| Casos de la V2 | CP-067 a CP-105 y CP-141 a CP-163 |
| Casos de la V3 | CP-106 a CP-140 (sintéticos, Entrega 01) y desde el CP-164 (nuevos) |

**Pendientes de la V2 que se resuelven en esta entrega.** Las decisiones 26, 34, 37 y 38, que en la Entrega 02 quedaron a decidir por el equipo, se resolvieron el 30/10/2026 (sección 5.1). El incremento 18, que dependía de las decisiones 37 y 38, pasa a ser el primero de la V3.

### 2.2 Flujo de despliegue

Se mantiene el flujo de la V2: los incrementos se integran **directamente sobre `main`**, cada push despliega en Vercel y cada incremento debe cerrar compilando y jugable. Si hiciera falta reproducir un defecto sobre una versión anterior, se usan los tags `v1.0` y `v2.0`.

La V3 agrega un servicio externo, **Supabase**, con dos proyectos (decisión 60):

| Proyecto | Uso |
|---|---|
| Producción | Conectado al despliegue de Vercel. Cuentas y puntajes reales |
| Prueba | Builds de prueba locales y ejecución del ciclo. Contiene el usuario de prueba y los datos de prueba de los tableros |

La URL y la clave pública de cada proyecto se cargan como variables de entorno (en Vercel y en `.env.local`, que no se sube al repositorio). La clave de servicio no se usa en la aplicación ni se publica.

---

## 3. Alcance de la V3

| Épica | Nombre | HU |
|---|---|---|
| E9 | Cuentas de usuario | HU-35 a HU-37 |
| E10 | Puntajes y estadísticas | HU-38, HU-39 |
| E11 | Opciones y personalización | HU-40 a HU-42 |
| **E12** | **Look & feel** *(nueva)* | **HU-44 a HU-50** (sección 6.2) |
| E6 a E8 (ajustes) | Memoria de frutas de la IA de Pacman y salto hacia adelante | Ajustes a HU-29, HU-30 y HU-43 (incremento 18, arrastrado de la V2) |

**Por qué se agrega la épica E12.** La V2 dejó el juego completo en sus reglas, pero lejos del Pac-Man que los jugadores reconocen: los fantasmas aparecen en las esquinas, no hay túnel, la partida arranca sin aviso, la derrota de Pacman no tiene animación, no hay sonido y los poderes del acelerado y del saltarín no se ven como lo que son (el acelerado "se teletransporta" en lugar de impulsarse). Además, dos pendientes de la V2 (decisiones 26 y 34) se resuelven mejor con mapas nuevos y una base de los fantasmas que con parches a los mapas actuales. Las historias se numeran desde la HU-44, después de la HU-43 de la V2, para no alterar identificadores ya usados.

| HU | Historia | Prioridad |
|---|---|---|
| HU-44 | Base de los fantasmas y mapas rediseñados | Alta |
| HU-45 | Túnel lateral | Alta |
| HU-46 | Cuenta regresiva al inicio del nivel | Media |
| HU-47 | Animación de derrota de Pacman | Baja |
| HU-48 | Música y efectos de sonido | Baja |
| HU-49 | Animaciones y efectos de los poderes | Baja |
| HU-50 | Sprites de pixel art con soporte de skins | Media |

**Fuera de alcance:** juego en línea entre jugadores, recuperación de contraseña, edición del username y cualquier sistema antitrampas más allá de la validación de rangos de la decisión 63.

---

## 4. Reglas de negocio y parámetros de la V3

Esta sección **extiende** la sección 4 de la Entrega 01 y la sección 4 de la Entrega 02. Todo lo que no se redefine acá sigue vigente. Es la sección que se entrega completa al agente como contexto y contra la que se calculan los resultados esperados.

> **Estado.** Todas las reglas de esta sección provienen de decisiones aceptadas en la sesión de planificación del 30/10/2026 (sección 5) y todavía no están implementadas. Si el equipo cambia una decisión, hay que actualizar el valor acá.

### 4.1 Mapas *(D-41 a D-51, D-68 a D-71)*

Los tres mapas se reemplazan por los de [`Workflow/v3-mapas.md`](../Workflow/v3-mapas.md), que es la fuente de verdad del trazado.

| Parámetro | Valor |
|---|---|
| Tamaño | 28 columnas × 31 filas, como el Pac-Man original (en la V1 y la V2: 17 × 15) |
| Diseño | Laberintos propios, simétricos. Cada nivel tiene un trazado distinto, siempre el mismo |
| Muros interiores | Bloques de 2 o más celdas, como el original, con algunos muros de una celda para que el espectro tenga cruces en los tres niveles *(D-26, D-69)*. En el incremento 19 eran mayormente de una celda |
| Dibujo | Escala del original: celda lógica de 8 px y personajes de unas 2 celdas. Cada bloque de muro se dibuja como un tubo que recorre su contorno, con esquinas redondeadas, en los colores del nivel *(D-68)* |
| Marco común a los tres niveles | Base de los fantasmas, anillo alrededor de la base, túnel y aparición de Pacman en las mismas posiciones |
| Aparición de Pacman | Fila 23, entre las columnas 13 y 14 |
| Esferas grandes, nivel 1 | (1,1), (1,26), (23,1), (23,26) |
| Esferas grandes, nivel 2 | (3,1), (3,26), (22,1), (22,26) |
| Esferas grandes, nivel 3 | (1,1), (1,26), (29,1), (29,26). En modo GhostMan, además, las fijas (15,1) y (15,26) *(D-51)* |
| Esferas comunes | Nivel 1: 258 · Nivel 2: 268 · Nivel 3: 258 (en el incremento 19: 388, 352 y 344) *(D-69)* |
| Velocidad | Pacman y el fantasma clásico: 4,5 celdas/s (3,75 en la V2). Los demás tipos y el −15 % de los fantasmas del modo Pacman conservan su proporción *(D-70)*. En modo GhostMan, Pacman (IA) va un 15 % más lento: 3,825 celdas/s *(D-71)* |
| Celdas sin esfera | Anillo de la base, celdas del túnel, aparición de Pacman e interior de la base |

**Formato de texto del mapa.** Se amplía el de la V1: `#` muro, `.` pasillo con esfera común, `o` pasillo con esfera grande, espacio pasillo sin esfera y `-` puerta de la base.

### 4.2 Base de los fantasmas *(D-44 a D-47, D-49)*

| Parámetro | Valor |
|---|---|
| Ubicación | Filas 12 a 16, columnas 10 a 17. Interior: filas 13 a 15, columnas 11 a 16 |
| Puerta | Fila 12, columnas 13 y 14 |
| Muros de la base | Infranqueables para todos, incluidos el espectro, el saltarín, el acelerado y la destrucción de muros de Pacman |
| Quién cruza la puerta | Los fantasmas vivos, solo para **salir**. Los ojos de los fantasmas comidos, solo para **entrar**. Pacman, nunca |
| Inicio, modo Pacman | Un fantasma arranca afuera, sobre la puerta (fila 11). Los otros tres arrancan adentro y salen de a uno, **cada 3 s** contados desde el "¡ya!" de la cuenta regresiva |
| Inicio, modo GhostMan | El fantasma del jugador arranca adentro y sale cuando el jugador lo mueve hacia la puerta. Si no se mueve, sigue adentro y Pacman termina completando el nivel *(D-34)*. Los fantasmas de la IA salen cada 3 s, como en el modo Pacman |
| Después de perder una vida | Igual que al inicio del nivel |
| Fantasma comido | Quedan sus **ojos**, que vuelven solos a la base al doble de la velocidad del fantasma clásico y sin colisionar con nada. Al entrar, el fantasma revive y vuelve a salir |
| Espera dentro de la base | 0 s, salvo el **naval**, que espera 3 s (conserva su penalidad de reaparición) |
| Tipo al revivir, modo Pacman | Se sortea al revivir, con las reglas de la sección 4.9 de la Entrega 02 |
| Fantasma del jugador comido | Sus ojos vuelven en piloto automático; el jugador recupera el control al revivir |
| Estado al revivir | Vulnerable si el PowerUp sigue activo, como en la V1 |
| Cooldown del poder | Sigue corriendo mientras el fantasma está comido, para el jugador y para la IA *(D-47)* |
| Poderes dentro de la base | No se pueden usar. El intento no consume el cooldown *(D-67)* |

Esta regla **reemplaza** los temporizadores fijos de reaparición de la sección 4.5 de la Entrega 02 (5 s y 8 s para el naval).

### 4.3 Túnel *(D-48 a D-50)*

| Parámetro | Valor |
|---|---|
| Ubicación | Fila 13. Sale por la columna 0 y entra por la 27, y al revés |
| Celdas del túnel | Fila 13, columnas 0 a 3 y 24 a 27 |
| Quién lo usa | Todos los personajes, en los dos sentidos |
| Velocidad dentro del túnel | Los fantasmas, al **50 %** de su velocidad. Pacman y los ojos de los fantasmas comidos mantienen la suya. El *dash* del acelerado ignora la reducción |
| Distancias por recorrido | Cuentan el paso por el túnel (IA de Pacman, persecución de los fantasmas, visión de 8 celdas de la sección 4.5) |
| Distancia Manhattan | No cuenta el túnel (radio del saltarín) |
| Frutas | Ni las reales ni las falsas aparecen en las celdas del túnel |
| Dibujado | Un personaje a mitad del cruce se dibuja recortado en el borde y aparece del otro lado, sin quedar sobre el HUD |

### 4.4 Poderes de los fantasmas *(D-38, D-41, D-54 a D-56)*

Cambios sobre la sección 4.6 de la Entrega 02:

**Espectro.** Atraviesa muros de exactamente una celda de espesor. No atraviesa el borde del mapa ni los muros de la base.

**Saltarín.**

| Parámetro | Valor |
|---|---|
| Destino | Al azar, en forma uniforme, entre las celdas transitables a distancia Manhattan ≤ 10 que están **estrictamente adelante** del fantasma en su dirección de avance. La fila o la columna actual no cuenta *(D-38, D-41)* |
| Fantasma quieto | Se usa su última dirección de avance |
| Celdas excluidas | El interior de la base y la celda actual |
| Sin destino válido | El salto no se ejecuta y el poder no entra en cooldown |
| Duración del salto | 0,6 s, en arco. El destino se marca con una sombra que crece hasta el aterrizaje |
| Durante el salto | No colisiona con nada y el jugador no lo controla |
| Al aterrizar | Colisión normal. Si Pacman está en la celda, se resuelve como cualquier contacto |
| IA del modo Pacman | Usa la misma regla |

**Acelerado.**

| Parámetro | Valor |
|---|---|
| Recorrido | Hasta 3 celdas en su dirección de avance, como en la V2, pero **recorriéndolas** en 0,25 s (12 celdas/s) en lugar de teletransportarse |
| Colisión | Normal con Pacman en todo el trayecto: lo derrota o, si el acelerado está vulnerable, Pacman se lo come |
| Efecto | Estela de 2 o 3 siluetas que se desvanecen |
| Sin cambios | La regla de 3, 2, 1 o 0 celdas según el muro, el cooldown de 10 s y la penalidad de velocidad de 5 s |

**Naval.** Sin cambios en las reglas. Efectos: aparición al colocar la fruta, parpadeo en los últimos 2 s antes de explotar y explosión de 0,5 s que muestra el radio.

### 4.5 IA de Pacman: memoria de frutas falsas *(D-37, D-42)*

Reemplaza la prioridad 3 de la sección 4.7 de la Entrega 02 ("va hacia la fruta, real o falsa, sin distinguirlas").

| Parámetro | Valor |
|---|---|
| Registro | Pacman registra una fruta falsa si, **en el instante en que el naval la coloca**, está a 8 celdas de recorrido o menos. Una fruta colocada más lejos no se registra después, aunque Pacman se acerque |
| Olvido | Cada fruta registrada se olvida con una probabilidad de 5 % por segundo (vida media de unos 14 s) |
| Fruta no registrada | La trata como real: si está a 5 celdas de recorrido o menos, va hacia ella |
| Fruta falsa registrada | La evita como si fuera un muro al calcular recorridos. No se aleja del radio de la explosión. Si la única ruta a las esferas pasa por esa celda, espera a que explote |
| Azar | El olvido usa la fuente de azar inyectable del juego, para poder fijarla en los scripts de verificación |

**Caso determinista para la prueba manual:** una fruta falsa colocada a la vista de Pacman no la consume mientras la recuerde. Con el azar fijado en los scripts, el olvido también es reproducible.

### 4.6 Cuenta regresiva y derrota de Pacman *(D-52, D-53)*

| Momento | Qué se muestra | Duración |
|---|---|---|
| Inicio de cada nivel | "3", "2", "1" y "¡ya!". En el nivel 1 suena el jingle de inicio | 1 s por número y 0,5 s para "¡ya!" (3,5 s) |
| Después de perder una vida | "¡Listo!" | 2 s |

Durante la cuenta y el "¡Listo!" se congelan el reloj del bonus por tiempo, los cooldowns, los temporizadores de las frutas y de las frutas falsas, la IA y la salida de la base. La pausa también detiene la cuenta.

**Derrota de Pacman** (en los dos modos):

1. 0,5 s con todo congelado y los fantasmas visibles.
2. Los fantasmas desaparecen y Pacman se desarma hasta desaparecer, con su sonido (1,5 s).
3. "¡Listo!" o la pantalla de Game Over, según corresponda.

### 4.7 Música y efectos de sonido *(D-43, D-57)*

Todos los sonidos son **originales**, sintetizados con la Web Audio API al estilo del Pac-Man original. No se usan los archivos del juego original.

| Canal | Sonidos |
|---|---|
| Música | Jingle de inicio · sirena de fondo (en bucle durante el nivel) · sirena del PowerUp · jingle de nivel completado · jingle de Game Over |
| Efectos | Waka (al comer esferas) · esfera grande · comer un fantasma · ojos que vuelven a la base · fruta · derrota de Pacman · pitidos de la cuenta regresiva · atravesar (espectro) · saltar (saltarín) · impulso (acelerado) · colocar fruta y explosión (naval) · romper un muro |

- El audio arranca después de la primera interacción del usuario, por la política de reproducción automática de los navegadores.
- Nada suena con la partida en pausa ni con la pestaña oculta.
- El volumen de cada canal se regula por separado (HU-41).

### 4.8 Sprites y skins *(D-58)*

| Parámetro | Valor |
|---|---|
| Tamaño | Celda lógica de 8 × 8 px y sprites de 16 × 16 px (unas 2 celdas), como el original. El mapa (224 × 248 px) se escala por un número entero: ×3 en un canvas de 672 × 744 *(D-68, modifica la D-58)* |
| Herramienta | Pixel art dibujado con pxl |
| Roles de color | Cada sprite usa roles: cuerpo, contorno, ojos y detalle |
| Skin | Una paleta para esos roles. Las skins con forma propia son opcionales |
| Distinción entre tipos | Un rasgo de forma por tipo, que no depende del color: espectro con borde ondulado y transparencia, saltarín con resortes, naval con gorro, acelerado con líneas de velocidad, clásico con la forma tradicional |
| Estado vulnerable | Azul con parpadeo blanco. Tiene prioridad sobre cualquier skin |
| Cuadros | Pacman: 3 por dirección · derrota: unos 10 · fantasmas: 2, con ojos que miran hacia donde avanzan · vulnerables: 2 más el parpadeo · ojos: 4 direcciones |

### 4.9 Modo de prueba *(D-59)*

| Parámetro | Valor |
|---|---|
| Parámetros de la partida | La duración de la cuenta, del "¡Listo!" y de las animaciones forma parte de la configuración de la partida |
| Núcleo del juego | Usa 0 por defecto: las pruebas del núcleo no cambian |
| Navegador | `?modoPrueba=1` pone esas duraciones en 0 y silencia el audio |
| Dónde se acepta | Solo en builds de prueba, activados con una variable de entorno de build. En el despliegue de Vercel se ignora |

### 4.10 Cuentas y puntajes *(D-60 a D-66)*

Extiende la sección 4.9 de la Entrega 01.

| Regla | Definición |
|---|---|
| Autenticación | Supabase Auth con email sintético `<username en minúsculas>@ghostman.invalid` y la confirmación por email desactivada |
| Username | No distingue mayúsculas al iniciar sesión ni para la unicidad. Se muestra como se registró |
| Registro atómico | El perfil se crea en la misma transacción que el usuario. Un registro rechazado no deja nada creado |
| Contraseña | Mínimo 8 caracteres, con letras y números. Se valida en el formulario y en la configuración de Supabase |
| Error de login | Mensaje único, sin precisar si falló el username o la contraseña |
| Sesión | Persiste al recargar la página |
| Acceso al juego | Para jugar hace falta sesión iniciada (HU-37) |
| Tabla `profiles` | Username, skin de Pacman, skin de los fantasmas, volumen de música y volumen de efectos (0 a 100) |
| Tabla `best_scores` | Una fila por usuario y modo, con el mejor puntaje y la fecha en que se logró |
| Tablero global | Top 10 de `best_scores` por modo. Cada jugador aparece una vez por modo |
| Empates | Queda arriba el puntaje que se logró antes |
| Registro de un puntaje | Solo mediante una función de la base de datos, que valida el modo, rechaza puntajes por encima del máximo posible del modo y actualiza solo si supera el mejor personal |
| Permisos | Con sesión iniciada se leen los usernames y los tableros. Cada usuario modifica solo sus preferencias. Nadie escribe puntajes directamente |
| Salir del juego | Detiene el bucle y el audio y muestra "¡Gracias por jugar!" con un botón para volver a entrar. No cierra la sesión |
| Sin conexión | Al terminar la partida se muestra el resultado con "No se pudo guardar el puntaje" y un botón para reintentar. En el registro y el login, un error general |

---

## 5. Decisiones sobre ambigüedades de la V3

La numeración continúa la de la Entrega 02 (decisiones 17 a 40). Se aplica el mismo criterio: cada punto que no permitía escribir un resultado esperado pass/fail, o que dejaba un comportamiento librado al agente, se resuelve **antes** de generar código.

**Estados:** los de la Entrega 02, más uno nuevo.
- *Aceptada · sin implementar*: aceptada por D. Savoia en la sesión de planificación del 30/10/2026. Falta la revisión del equipo; si el equipo la cambia, pasa a *Modificada*.
- *Implementada*, *Aprobada* y *Modificada*: como en la Entrega 02.

### 5.1 Resolución de las decisiones pendientes de la V2

| # | Pendiente en la Entrega 02 | Resolución | Fundamento | Estado |
|---|---|---|---|---|
| 26 | Espesor de muro que atraviesa el espectro. Con los mapas de la V1, el espectro del jugador no tenía cruces válidos en el nivel 1 | El espectro atraviesa muros de **exactamente una celda** de espesor, nunca el borde del mapa. Los mapas se rediseñan (sección 4.1) con muros finos, para que tenga cruces en los tres niveles | Mantener la regla de una celda conserva los casos CP-055 y CP-058. El problema estaba en el mapa, no en la regla | Aceptada · sin implementar |
| 34 | Un jugador que no toca ninguna tecla podía ganar en modo GhostMan, porque su fantasma custodiaba la esfera grande de (1,1) | Un jugador quieto **no puede ganar**. Se resuelve con la base de los fantasmas: el fantasma del jugador arranca dentro de la base y, si no sale, Pacman completa el nivel | La base elimina la causa (el fantasma aparecía sobre una esfera que Pacman necesitaba) en lugar de compensarla con un cambio en la cuenta de esferas | Aceptada · sin implementar |
| 37 | La IA de Pacman no distinguía la fruta falsa de la real, y el naval que usaba su poder ganaba 10 de 10 partidas | **Opción B**, con *p* = 5 % por segundo: memoria de las frutas falsas que Pacman ve colocar (sección 4.5) | La opción A dejaba al naval sin trampa en los niveles 1 y 2 del modo GhostMan, donde no hay frutas reales. La B funciona en los tres niveles y convierte la trampa en una habilidad: colocar la fruta fuera de la vista de Pacman | Aceptada · sin implementar |
| 38 | El destino uniforme del saltarín lo alejaba de Pacman tantas veces como lo acercaba, y usar el poder empeoraba sus resultados | **Opción A**: salto hacia adelante (sección 4.4) | Conserva la idea de la pre-entrega ("el destino no es elegible") y premia al jugador que sabe usar el poder. La B no requería habilidad y la C no cambiaba que la mitad de los saltos fueran en contra | Aceptada · sin implementar |

### 5.2 Decisiones nuevas

| # | Ambigüedad o hueco detectado | Decisión | Fundamento | Estado |
|---|---|---|---|---|
| 41 | La opción A de la decisión 38 habla del "semiplano de la dirección de avance", sin decir si incluye la fila o la columna actual, qué pasa si el fantasma está quieto o si no hay destino | El semiplano es **estricto**: la fila o la columna actual no cuenta. Si está quieto, se usa su última dirección. Sin destino válido, el salto no se ejecuta y el poder no entra en cooldown | Un semiplano que incluyera la fila actual permitiría saltos laterales, que no son "hacia adelante". No consumir el cooldown sigue el criterio de la decisión 25 para los poderes sin efecto | Aceptada · sin implementar |
| 42 | La opción B de la decisión 37 dice "si la ve colocar", sin precisar cuándo se mide la distancia | Pacman registra la fruta **en el instante de la colocación**, si está a 8 celdas de recorrido o menos | Medir en un solo instante da un resultado esperado verificable. Si el registro pudiera ocurrir después, una fruta colocada lejos se volvería visible al acercarse y la trampa perdería sentido | Aceptada · sin implementar |
| 43 | La V3 pide la música y los efectos clásicos del Pac-Man, pero son obra de Bandai Namco y el juego está desplegado públicamente | Música y efectos **originales**, sintetizados con la Web Audio API al estilo del original | Evita usar material protegido sin licencia y no requiere archivos de audio en el repositorio | Aceptada · sin implementar |
| 44 | La base de los fantasmas no estaba especificada: quién cruza la puerta y en qué sentido | Los fantasmas vivos solo salen; los ojos de los comidos solo entran; Pacman nunca la cruza. Vale también para el fantasma del jugador | Si el fantasma del jugador pudiera volver a entrar, tendría un refugio donde Pacman no lo alcanza, por ejemplo durante el PowerUp | Aceptada · sin implementar |
| 45 | No se define cómo salen los fantasmas de la base ni dónde arranca el fantasma del jugador | Modo Pacman: uno afuera y tres que salen cada 3 s desde el "¡ya!". Modo GhostMan: el jugador sale cuando quiere; la IA, cada 3 s | Sigue el patrón del original. Que el jugador decida cuándo salir resuelve la decisión 34 | Aceptada · sin implementar |
| 46 | Con una base, el temporizador fijo de reaparición (5 s, 8 s el naval) deja de tener un lugar natural | Los ojos vuelven a la base al doble de velocidad y el fantasma revive al entrar. El naval espera 3 s adentro | Es el comportamiento clásico. La espera del naval conserva la penalidad que la pre-entrega le asigna | Aceptada · sin implementar |
| 47 | Pendiente 6 de la V2: el cooldown de los fantasmas de la IA se congelaba mientras estaban comidos, y el del jugador no (decisión 35 b) | El cooldown sigue corriendo mientras el fantasma está comido, para todos | Una sola regla para el jugador y la IA. Con los ojos volviendo a la base, el tiempo comido es variable, y congelar el cooldown haría el comportamiento difícil de predecir | Aceptada · sin implementar |
| 48 | El túnel no estaba especificado: velocidad dentro del túnel y cómo cuentan las distancias que lo cruzan | Fantasmas al 50 % en las celdas del túnel; Pacman, los ojos y el *dash* sin reducción. Las distancias por recorrido cuentan el túnel; la Manhattan no | La reducción para los fantasmas es la del original y le da a Pacman una vía de escape real. La Manhattan no cuenta el túnel porque el ejecutor la verifica contando celdas en pantalla | Aceptada · sin implementar |
| 49 | No se define qué poderes y apariciones pueden ocurrir en la base y en el túnel | Las frutas reales y falsas no aparecen en la base ni en el túnel. El saltarín nunca cae en la base. La destrucción de muros nunca rompe la base ni el borde | Una fruta en el túnel tendría que dibujarse partida en los dos bordes. Romper la base anularía las decisiones 44 y 45 | Aceptada · sin implementar |
| 50 | No se define cómo se ve un personaje a mitad del túnel | Se dibuja recortado en el borde y aparece del otro lado, sin quedar sobre el HUD | Es lo que hace el original y evita que el sprite tape el HUD | Aceptada · sin implementar |
| 51 | Con mapas de muros finos, cada carga de destrucción de paredes (decisión 22) abre un camino nuevo. Además, las esferas grandes fijas del nivel 3 tenían coordenadas de los mapas de 17 × 15 | Se mantienen las 5 cargas y se vuelve a medir el balance con el bot después del incremento 19. Las 6 esferas grandes fijas del nivel 3 del modo GhostMan quedan en las 4 esquinas del boceto más (15,1) y (15,26) | Ajustar las cargas sin datos sería adivinar. El bot de balance de la V2 permite medir el efecto | Aceptada · sin implementar |
| 52 | La partida arranca de inmediato al elegir el modo o el fantasma, sin tiempo para prepararse | Cuenta "3, 2, 1, ¡ya!" de 3,5 s al inicio de cada nivel y "¡Listo!" de 2 s después de perder una vida. Durante la cuenta todo queda congelado | El "READY!" del original cumple la misma función. Congelar todo evita que la cuenta altere el bonus por tiempo o los cooldowns | Aceptada · sin implementar |
| 53 | La derrota de Pacman no tiene animación | 0,5 s congelado, después Pacman se desarma durante 1,5 s sin fantasmas en pantalla. Se usa en los dos modos | Es la animación más reconocible del original. En modo GhostMan marca el logro del jugador | Aceptada · sin implementar |
| 54 | El *dash* del acelerado se ve como un teletransporte, no como un impulso | Recorre sus hasta 3 celdas en 0,25 s, con estela y colisión normal con Pacman en todo el trayecto | Al recorrer las celdas, la decisión 32 (contacto en cada celda del trayecto) pasa a ser visible para el jugador | Aceptada · sin implementar |
| 55 | El salto del saltarín no tiene animación ni define si colisiona durante el salto | Salto de 0,6 s en arco, con el destino marcado; sin colisión en el aire y con colisión normal al aterrizar | Marcar el destino hace legible la regla de la decisión 38. Sin colisión en el aire, el resultado de un salto depende solo de dónde cae | Aceptada · sin implementar |
| 56 | Los demás poderes no tienen efectos visuales propios | Espectro semitransparente y ondulado al atravesar; naval con aparición, parpadeo y explosión visible; escombros de muro redibujados | Que cada poder se vea al usarse ayuda tanto al jugador como al ejecutor de los casos | Aceptada · sin implementar |
| 57 | La HU-41 pide volumen separado para música y efectos, pero ninguna lista dice qué sonido es de cada canal | Lista de la sección 4.7 | Sin la lista, el resultado esperado de "el volumen de música en 0 silencia la música" no es verificable | Aceptada · sin implementar |
| 58 | La HU-40 exige que las skins conserven la distinción entre tipos y el estado vulnerable, pero hoy los tipos se distinguen solo por color | Sprites de 16 × 16 con roles de color; skins por paleta; un rasgo de forma por tipo; el estado vulnerable con prioridad sobre la skin | Si los tipos dependieran solo del color, cualquier skin que cambia la paleta rompería la HU-40 | Aceptada · sin implementar |
| 59 | La cuenta regresiva y las animaciones agregan esperas que rompen los scripts de verificación | Duraciones como parámetros de la partida, en 0 en el núcleo y con `?modoPrueba=1` en builds de prueba | El parámetro no se acepta en el despliegue de Vercel para que un jugador no pueda saltear la cuenta | Aceptada · sin implementar |
| 60 | No se define quién administra Supabase ni cómo se separan los datos de prueba | Dos proyectos, producción y prueba, administrados por D. Savoia. Solo la clave pública va al navegador | La sección 9 de la Entrega 01 pide datos de prueba precargados para el tablero; mezclarlos con los de producción contaminaría el ranking real | Aceptada · sin implementar |
| 61 | Supabase Auth trabaja con email, y la HU-35 pide username sin email | Email sintético a partir del username en minúsculas; confirmación por email desactivada; perfil creado en la misma transacción | Pasar el username a minúsculas resuelve la regla de mayúsculas de la HU-36. La transacción única cumple el criterio de la HU-35 sobre cuentas parciales | Aceptada · sin implementar |
| 62 | La sección 4.9 de la Entrega 01 no define la estructura de los datos ni el orden de los empates | Tablas `profiles` y `best_scores`, una fila por usuario y modo. En empates, queda arriba el puntaje logrado antes | Como solo se registra el mejor personal, el historial no hace falta. Sin regla de empate, el orden del tablero no es verificable | Aceptada · sin implementar |
| 63 | El juego corre en el navegador, así que un usuario podría enviar un puntaje inventado | Los puntajes se guardan solo con una función que valida el modo, el rango y la mejora | No se puede impedir del todo en un juego de cliente. La validación limita el daño, y la limitación se registra en el análisis de riesgos (sección 8.1) | Aceptada · sin implementar |
| 64 | La HU-42 pide una "pantalla de salida", pero un navegador no deja que una página se cierre sola | "Salir" detiene el juego y el audio y muestra "¡Gracias por jugar!". No cierra la sesión | Es la forma verificable de "no dejar una partida activa en segundo plano" en un juego web | Aceptada · sin implementar |
| 65 | No se define qué pasa si no hay conexión con Supabase | Resultado visible con mensaje y reintento, sin cola local; error general en el registro y el login | Una cola local agregaría estados difíciles de probar para un caso poco frecuente | Aceptada · sin implementar |
| 66 | La HU-37 exige sesión para llegar al menú, lo que cambia la entrada a todos los casos de la V1 y la V2 | Todos los casos manuales suman la precondición "sesión iniciada con el usuario de prueba"; los scripts de navegador inician sesión contra el proyecto de prueba | Es la misma situación que generó el menú de la V2 (sección 8.2 de la Entrega 02) | Aceptada · sin implementar |
| 67 | *(Detectada durante la generación, tabla 7.5, fila 6.)* Ninguna decisión dice si un fantasma puede usar su poder dentro de la base. El saltarín del jugador podría salir de la base sin pasar por la puerta | Dentro de la base ningún fantasma puede usar su poder; el intento no consume el cooldown | Mantiene la decisión 44 (la base se deja solo por la puerta) y sigue el criterio de la decisión 25 para los intentos sin efecto | Aprobada por D. Savoia (30/10) · implementada |
| 68 | *(Prueba manual de los incrementos 18 a 20, tabla 7.5, fila 16.)* Con mapas de 28 × 31 dibujados con celdas como bloques y personajes de una celda, el mapa se ve enorme y armado con bloques, y la base ocupa mucho más que en el original, aunque la grilla y la base miden lo mismo que en el original | Escala del original: celda lógica de 8 px y sprites de 16 px (unas 2 celdas), mapa ×3 en 672 × 744. Los muros se dibujan como un tubo por el contorno de cada bloque, con esquinas redondeadas. La lógica y las colisiones no cambian | La diferencia con el original no estaba en la grilla sino en el dibujo: allí los personajes miden 2 celdas y los muros son líneas finas. Al dibujarse por el centro de sus celdas, un muro de una celda se ve como una sola línea y uno grueso como un contorno, así que también se distingue a simple vista dónde puede cruzar el espectro | Aprobada por D. Savoia (31/10) · implementada |
| 69 | *(Misma prueba manual.)* Los niveles se hacen largos: los muros de una celda dejan entrar muchos pasillos y hay entre 344 y 388 esferas por nivel, contra 240 del original | Mapas rediseñados con bloques de 2 o más celdas: 258, 268 y 258 esferas. Algunos muros de una celda quedan para el espectro (30, 22 y 46 cruces). Se mantiene el marco fijo de los tres niveles | Menos pasillos acortan el nivel sin tocar las reglas. El marco fijo conserva las decisiones 44 a 51 y las posiciones que usan las pruebas de la base y el túnel | Aprobada por D. Savoia (31/10) · implementada |
| 70 | *(Misma prueba manual.)* Aun con menos esferas, a 3,75 celdas/s el recorrido mínimo de un nivel es largo | Pacman y el fantasma clásico pasan a 4,5 celdas/s (+20 %); todo lo demás conserva su proporción | Subir todas las velocidades en la misma proporción mantiene las relaciones de las HU y de las decisiones 39 y 40. Con mapas de unas 260 esferas, el recorrido mínimo de un nivel baja de unos 103 s a unos 57 s | Aprobada por D. Savoia (31/10) · implementada |
| 71 | *(Detectada durante la generación, tabla 7.5, fila 20.)* Con los mapas compactos, en modo GhostMan Pacman termina el nivel 1 en unos 130 s en lugar de 255 s, y el bot de balance pierde las 50 partidas sin usar el poder | En modo GhostMan, Pacman (IA) va un 15 % más lento: 3,825 celdas/s contra 4,5 del clásico | Es el espejo de la decisión 40, que le dio ventaja de velocidad a Pacman en el modo Pacman. Con el ajuste, el bot gana 5 de 10 partidas con el clásico, el saltarín y el acelerado, cerca de las 6 de 10 del incremento 20 | Aprobada por D. Savoia (31/10) · implementada |

---

## 6. Ajustes a las historias de usuario

### 6.1 Cambios a historias existentes

Estos criterios de aceptación de `entrega-01.md` cambian por las decisiones de la sección 5. Ya están aplicados en el documento de historias de usuario (`GhostMan — Historias de usuario.docx`), con la decisión entre paréntesis, y se registran acá para la trazabilidad. Si el equipo modifica una decisión, hay que corregir los dos documentos.

| HU | Criterio actual | Criterio ajustado | Decisión |
|---|---|---|---|
| HU-02 | "Pacman no puede salir de los límites del mapa" | "Pacman no puede salir de los límites del mapa, salvo por el túnel, que lo lleva al borde opuesto" | 48 |
| HU-06 | "El fantasma comido vuelve a su punto de reaparición y reaparece a los 5 segundos con su comportamiento normal" | "El fantasma comido queda reducido a sus ojos, que vuelven a la base; al entrar, el fantasma revive y vuelve a salir con su comportamiento normal" | 46 |
| HU-18 | "El espectro no puede usar su habilidad para salir de los límites del mapa" | Se agrega: "ni para atravesar los muros de la base de los fantasmas" | 26, 49 |
| HU-25 | — | Se agrega: "El fantasma del jugador arranca dentro de la base y sale cuando el jugador lo mueve hacia la puerta" | 34, 45 |
| HU-27 | "Con el PowerUp activo, el contacto con Pacman envía al fantasma del jugador a su punto de reaparición" | "Con el PowerUp activo, el contacto con Pacman reduce al fantasma del jugador a sus ojos, que vuelven solos a la base" | 46 |
| HU-27 | "El jugador no controla al fantasma durante el tiempo de reaparición, y el tiempo restante se indica en pantalla" | "El jugador no controla al fantasma mientras sus ojos vuelven a la base, y recupera el control al revivir" | 46 |
| HU-27 | "El tiempo de reaparición es de 5 segundos, u 8 segundos si el fantasma del jugador es de tipo naval" | "Si el fantasma del jugador es de tipo naval, espera 3 segundos dentro de la base antes de poder salir" | 46 |
| HU-27 | "El poder del fantasma no puede activarse mientras está esperando reaparecer" | "El poder del fantasma no puede activarse mientras está comido, pero su cooldown sigue corriendo" | 47 |
| HU-28 | "La habilidad no puede usarse para salir de los límites del mapa" | Se agrega: "ni para atravesar los muros de la base de los fantasmas" | 49 |
| HU-29 | Título: "Teletransportarse con el Saltarín". Historia: "quiero teletransportarme a un punto cercano con el Saltarín para acortar distancias con Pacman, aceptando el riesgo de no elegir el destino" | Título: "Saltar hacia adelante con el Saltarín". Historia: "quiero saltar hacia adelante con el Saltarín para acortar distancias con Pacman, aceptando el riesgo de no elegir la celda exacta de destino" | 38 |
| HU-29 | "La barra espaciadora teletransporta al fantasma a una celda aleatoria dentro de un radio de 10 celdas" | "La barra espaciadora hace saltar al fantasma a una celda aleatoria dentro de un radio de 10 celdas, estrictamente adelante en su dirección de avance" | 38, 41 |
| HU-29 | "El destino no es elegible ni predecible por el jugador" | "La celda de destino no es elegible por el jugador: elige hacia dónde salta, no a qué celda" | 38 |
| HU-29 | — | Se agrega: "El salto dura 0,6 segundos y la celda de destino se marca antes del aterrizaje", "Durante el salto el fantasma no colisiona con nada" y "Si no hay ninguna celda válida adelante, el salto no se ejecuta y el poder no entra en cooldown" | 41, 55 |
| HU-29 | "Si el salto ubica al fantasma sobre Pacman y Pacman no tiene el PowerUp activo, Pacman pierde una vida" | "Si el fantasma aterriza sobre Pacman y Pacman no tiene el PowerUp activo, Pacman pierde una vida" | 55 |
| HU-30 | "El Naval se desplaza un 20 % más lento que el fantasma clásico y tarda 8 segundos en reaparecer" | "El Naval se desplaza un 20 % más lento que el fantasma clásico y, al ser comido, espera 3 segundos dentro de la base antes de salir" | 46 |
| HU-30 | — | Se agrega: "La IA de Pacman no consume una fruta falsa que vio colocar a 8 celdas de recorrido o menos, mientras la recuerde" | 37, 42 |
| HU-31 | "La barra espaciadora desplaza al fantasma hasta 3 celdas en su dirección de avance" | "La barra espaciadora impulsa al fantasma hasta 3 celdas en su dirección de avance, recorriéndolas en 0,25 segundos" | 54 |
| HU-31 | "Si el dash termina sobre Pacman y Pacman no tiene el PowerUp activo, Pacman pierde una vida" | "Si el dash pasa por Pacman o termina sobre él y Pacman no tiene el PowerUp activo, Pacman pierde una vida" | 32, 54 |
| HU-31 | "El dash no atraviesa paredes ni los límites del mapa" | Se agrega: "salvo por el túnel, que lo lleva al borde opuesto" | 48 |
| HU-33 | — | Se agrega: "Los muros de la base de los fantasmas y los del borde del mapa son indestructibles" | 49 |
| HU-43 | "El saltarín de la IA se teletransporta según las reglas de la sección 4.6 de la Entrega 02 cuando Pacman está a distancia Manhattan ≤ 10" | "El saltarín de la IA salta según las reglas de la sección 4.4 de la Entrega 03 cuando Pacman está a distancia Manhattan ≤ 10" | 38 |

### 6.2 Historias nuevas

#### Épica E12 — Look & feel

---

**HU-44 · Base de los fantasmas**
*Épica: E12 · Versión: V3 · Prioridad: Alta*

> **Como** jugador
> **quiero** que los fantasmas aparezcan y vuelvan a una base en el centro del mapa
> **para** reconocer la estructura del Pac-Man clásico y anticipar desde dónde salen los fantasmas.

**Criterios de aceptación:**
- Los tres niveles tienen una base de los fantasmas en el centro del mapa, en la misma posición.
- Pacman no puede entrar a la base en ningún modo, ni siquiera con cargas de destrucción de paredes.
- Los muros de la base no se pueden atravesar con ningún poder.
- En modo Pacman, al inicio del nivel un fantasma está afuera, sobre la puerta, y los otros tres salen de a uno, cada 3 segundos desde el "¡ya!".
- En modo GhostMan, el fantasma del jugador arranca dentro de la base y sale cuando el jugador lo mueve hacia la puerta.
- Un fantasma vivo no puede volver a entrar a la base.
- Un fantasma comido queda reducido a sus ojos, que vuelven solos a la base sin colisionar con nada.
- Al entrar a la base, el fantasma revive y vuelve a salir. El naval espera 3 segundos adentro antes de salir.
- Si un jugador de fantasma no mueve a su fantasma, Pacman termina completando el nivel.
- Cada nivel tiene su propio laberinto, con muros de una celda de espesor en la mayor parte del mapa.

---

**HU-45 · Cruzar el mapa por el túnel**
*Épica: E12 · Versión: V3 · Prioridad: Alta*

> **Como** jugador
> **quiero** salir por un borde del mapa y entrar por el opuesto a través de un túnel
> **para** escapar o perseguir tomando un atajo, como en el Pac-Man clásico.

**Criterios de aceptación:**
- Los tres niveles tienen un túnel en la misma fila, que conecta el borde izquierdo con el derecho.
- Pacman y todos los fantasmas pueden cruzar el túnel en los dos sentidos.
- Al salir por un borde, el personaje aparece en el borde opuesto con la misma dirección de avance.
- Los fantasmas se desplazan al 50 % de su velocidad dentro del túnel; Pacman mantiene la suya.
- La IA de Pacman y la de los fantasmas usan el túnel al calcular sus recorridos.
- Ni las frutas reales ni las falsas aparecen dentro del túnel.
- Un personaje a mitad del cruce se ve recortado en un borde y asomando por el otro, sin tapar el HUD.

---

**HU-46 · Prepararme antes de que empiece el nivel**
*Épica: E12 · Versión: V3 · Prioridad: Media*

> **Como** jugador
> **quiero** ver una cuenta regresiva antes de que empiece cada nivel
> **para** tener tiempo de ubicarme en el mapa antes de que todo se mueva.

**Criterios de aceptación:**
- Al inicio de cada nivel, en los dos modos, se muestra "3", "2", "1" y "¡ya!", con 1 segundo por número y medio segundo para "¡ya!".
- Después de perder una vida se muestra "¡Listo!" durante 2 segundos antes de continuar.
- Durante la cuenta ningún personaje se mueve y ningún temporizador avanza: ni el bonus por tiempo, ni los cooldowns, ni las frutas, ni la salida de la base.
- Las teclas presionadas durante la cuenta no mueven a ningún personaje.
- Si el jugador pausa durante la cuenta, la cuenta se detiene y se reanuda al quitar la pausa.

---

**HU-47 · Ver la derrota de Pacman**
*Épica: E12 · Versión: V3 · Prioridad: Baja*

> **Como** jugador
> **quiero** ver a Pacman desarmarse cuando lo derrotan
> **para** reconocer al instante que perdió una vida, como en el juego clásico.

**Criterios de aceptación:**
- Cuando Pacman pierde una vida, el juego queda congelado medio segundo con los fantasmas visibles.
- Después, los fantasmas desaparecen y Pacman se desarma hasta desaparecer, en 1,5 segundos, con su sonido.
- Al terminar la animación se muestra "¡Listo!" o, si era la última vida, la pantalla de Game Over.
- La animación se usa en los dos modos, también cuando el jugador de fantasma derrota a Pacman.
- Durante la animación no se suman puntos ni avanza ningún temporizador.

---

**HU-48 · Escuchar la música y los sonidos del juego**
*Épica: E12 · Versión: V3 · Prioridad: Baja*

> **Como** jugador
> **quiero** escuchar música y efectos de sonido durante la partida
> **para** sentir el ritmo del juego y recibir señales de lo que pasa sin tener que mirar todo.

**Criterios de aceptación:**
- Suena un jingle al iniciar la partida y una sirena de fondo durante el nivel.
- Durante el PowerUp la sirena de fondo cambia por la del PowerUp.
- Comer esferas produce el sonido "waka" característico.
- Cada evento de la lista de la sección 4.7 tiene su sonido: esfera grande, comer un fantasma, ojos que vuelven, fruta, derrota de Pacman, cuenta regresiva, cada poder y romper un muro.
- Cada sonido pertenece al canal de música o al de efectos, según la sección 4.7.
- Nada suena con la partida en pausa ni con la pestaña del navegador oculta.
- La música y los efectos son originales.

---

**HU-49 · Ver los poderes de los fantasmas en acción**
*Épica: E12 · Versión: V3 · Prioridad: Baja*

> **Como** jugador
> **quiero** que cada poder tenga su animación y su sonido
> **para** entender qué hizo un fantasma en el momento en que lo usa.

**Criterios de aceptación:**
- El acelerado se impulsa recorriendo las celdas, con una estela que se desvanece, en lugar de aparecer de golpe en el destino.
- El saltarín salta en arco; la celda de destino se marca con una sombra antes del aterrizaje y levanta polvo al caer.
- El espectro se ve semitransparente y ondulado mientras atraviesa un muro.
- El naval muestra una aparición al colocar la fruta falsa, la fruta parpadea en sus últimos 2 segundos y la explosión deja ver su radio.
- Romper un muro muestra escombros sobre la celda.
- Cada poder tiene su propio sonido.
- Las animaciones no cambian las reglas de los poderes: duraciones, colisiones y cooldowns son los de la sección 4.4.

---

**HU-50 · Ver a Pacman y a los fantasmas en pixel art**
*Épica: E12 · Versión: V3 · Prioridad: Media*

> **Como** jugador
> **quiero** que Pacman, los fantasmas y las frutas tengan sprites de pixel art
> **para** que el juego se vea como un arcade clásico.

**Criterios de aceptación:**
- Pacman abre y cierra la boca mientras avanza, en las cuatro direcciones.
- Los ojos de los fantasmas miran hacia donde avanzan.
- Cada tipo de fantasma se distingue de los demás por un rasgo de forma, además del color.
- El estado vulnerable se ve igual con cualquier skin, y parpadea en los últimos 2 segundos del PowerUp.
- Los ojos de un fantasma comido se distinguen de un fantasma vivo.
- La fruta falsa se distingue de la real.
- Los sprites se dibujan sin difuminar, escalados por un número entero.

---

## 7. Implementación de la V3 con AI

### 7.1 Estrategia de generación

Se mantiene la estrategia de las entregas anteriores: **incrementos verificables**, un prompt por incremento y un commit por incremento, con `npm run build`, `npm run lint` y `npm run verify` sin errores. La numeración continúa la de la V2.

| # | Incremento | HU cubiertas | Criterio de avance |
|---|---|---|---|
| 18 | Memoria de frutas falsas y salto hacia adelante | HU-29, HU-30, HU-43 | Con el azar fijado, Pacman no consume una fruta falsa que vio colocar mientras la recuerda; el saltarín cae siempre adelante |
| 19 | Mapas nuevos, base de los fantasmas y túnel | HU-44, HU-45 | Pacman no entra a la base, los fantasmas salen cada 3 s, los ojos vuelven, todos cruzan el túnel y un jugador quieto no gana |
| 20 | Impulso del acelerado | HU-31, HU-49 | El *dash* recorre las celdas en 0,25 s con colisión en el trayecto |
| 21 | Escala del original y mapas compactos | HU-44, HU-45, HU-50 | Muros como contorno, personajes de unas 2 casillas, unas 260 esferas por nivel y todas las suites pasan con las velocidades nuevas |
| 22 | Cuenta regresiva y modo de prueba | HU-46 | La cuenta congela todo, y con el modo de prueba las suites de `scripts/verify/` pasan sin cambios de tiempos |
| 23 | Sprites de pixel art | HU-50 | Tipos y estado vulnerable distinguibles, al menos una skin alternativa funcionando |
| 24 | Animaciones | HU-47, HU-49 | Derrota de Pacman con el juego pausado; las animaciones no alteran tiempos ni colisiones |
| 25 | Música y efectos de sonido | HU-48 | Dos canales; cada evento de la sección 4.7 suena |
| 26 | Registro, inicio de sesión y menú principal | HU-35, HU-36, HU-37 | Validaciones de la sección 4.10, sesión persistente y menú inaccesible sin sesión |
| 27 | Tableros de puntaje | HU-38, HU-39 | Top 10 por modo, tablero personal y actualización inmediata |
| 28 | Opciones: skins, volumen, cerrar sesión y salir | HU-40, HU-41, HU-42 | Persistencia entre sesiones y ninguna skin altera las mecánicas |

**Orden.** Primero van los incrementos que cambian las mecánicas (18 a 22; el 21 se agregó después de la prueba manual de los incrementos 18 a 20), para que los sprites, las animaciones y el audio se hagan sobre el juego definitivo. Las cuentas van al final porque son independientes del juego y requieren los proyectos de Supabase.

### 7.2 Agente utilizado

| Agente / LLM | Interfaz | Uso previsto |
|---|---|---|
| Claude Opus 5.5 | Claude Code (CLI) con acceso al repositorio local: puede compilar, correr lint, ejecutar scripts de verificación, manejar un navegador sin interfaz (Chromium) y dibujar pixel art con pxl | Generación de los incrementos 18 a 28, sprites y verificación de sus criterios de avance |

Se mantiene la **decisión metodológica** de las entregas anteriores: el código no se corrige a mano durante la generación. Los ajustes se piden mediante prompts que quedan registrados, y toda edición manual se anota en la tabla 7.5.

### 7.3 Contexto entregado al agente

1. La sección **4** de la Entrega 01, la sección **4** de la Entrega 02 y la sección **4** de este documento.
2. Las historias de usuario de la V3 (sección 7.5 de la Entrega 01 y sección 6.2 de este documento), con los ajustes de la sección 6.1.
3. Las decisiones 41 a 71 de la sección 5.
4. Los mapas de `Workflow/v3-mapas.md`.

### 7.4 Prompts

> **Estado.** Cada prompt se redacta antes de su incremento y se ejecuta con el contexto fijo de la sección 7.3 ya entregado.

#### Prompt 17 — Memoria de frutas falsas y salto hacia adelante (HU-29, HU-30, HU-43; decisiones 37, 38, 41, 42 y 47)

```
Arrancamos la V3 con el incremento 18. Antes de tocar nada, leé el código actual
de la IA de Pacman (pacmanAi.ts), de los poderes (powers.ts), de las frutas
falsas (fakeFruits.ts) y del estado (state.ts). Los mapas, la base de los
fantasmas, el túnel y las animaciones son de incrementos posteriores: no los
toques ahora.

1. Memoria de frutas falsas de la IA de Pacman (modo GhostMan, sección 4.5).
   - Cuando un naval coloca una fruta falsa, si en ese instante Pacman está a
     8 celdas de recorrido o menos de la fruta, Pacman la registra. Una fruta
     colocada más lejos no se registra nunca, aunque Pacman se acerque después.
   - Cada fruta registrada se olvida con una probabilidad del 5 % por cada
     segundo de juego que pasa desde que se registró (una tirada por segundo
     cumplido). Usá state.random, la fuente de azar inyectable, para que los
     scripts puedan fijarla.
   - Prioridad 3 de la IA: va hacia las frutas reales y hacia las falsas que
     NO recuerda, a 5 celdas o menos, como hasta ahora.
   - Una fruta falsa que recuerda la trata como un muro en todos sus cálculos de
     recorrido (también con cargas de destrucción y al huir). No se aleja del
     radio de la explosión. Si la única ruta a las esferas pasa por esa celda,
     se queda quieto hasta que la fruta explote.
   - El conocimiento es de cada fruta: cuando la fruta explota, Pacman la
     consume o el nivel se reinicia, desaparece con ella.

2. Salto del saltarín hacia adelante (sección 4.4, decisiones 38 y 41).
   - El destino es una celda transitable al azar, uniforme, a distancia
     Manhattan de 10 o menos, estrictamente adelante en su dirección de avance:
     si avanza hacia arriba, solo filas menores que la suya; hacia la derecha,
     solo columnas mayores, etc. La fila o columna actual no cuenta.
   - La dirección de avance es la de la decisión 24 (la última en que se
     movió). Si no tiene, o si no hay ninguna celda válida, el salto no se
     ejecuta y el poder no entra en cooldown (decisión 25).
   - El salto sigue siendo instantáneo: la duración de 0,6 s, la sombra y la
     regla de no colisionar en el aire son del incremento 23.
   - El saltarín de la IA del modo Pacman usa la misma función.

3. Cooldown durante el tiempo comido (decisión 47): el cooldown del poder de
   los fantasmas de la IA sigue corriendo mientras están comidos, igual que el
   del fantasma del jugador.

Actualizá las suites de scripts/verify/ que dependen de estas reglas (13, 14 y
16) y agregá core/inc18.js con: registro dentro y fuera de las 8 celdas, que
Pacman no consume una fruta que recuerda, que sí consume una que no registró,
el olvido con el azar fijado, la espera cuando la fruta bloquea la única ruta,
y los saltos (todos adelante, uniformidad, sin dirección, sin destino). Después
corré npm run verify:balance con y sin --power y anotá el resultado. Si algo es
ambiguo, preguntame antes de generar código.
```

#### Prompt 18 — Mapas nuevos, base de los fantasmas y túnel (HU-44, HU-45; decisiones 26, 34, 44 a 51)

```
Incremento 19. Leé primero Workflow/v3-mapas.md y las secciones 4.1 a 4.3 de
este documento: son la especificación completa. Todavía no hay cuenta
regresiva, sprites ni animaciones (incrementos 21 a 23).

1. Mapas. Reemplazá los tres mapas por los de v3-mapas.md, copiados tal cual
   (28 × 31). Ampliá el lector: espacio = pasillo sin esfera, "-" = puerta.
   Pacman aparece en (23,13). En modo GhostMan, nivel 3, las 6 esferas grandes
   fijas son las 4 del mapa más (15,1) y (15,26).

2. Túnel (fila 13). Salir por la columna 0 lleva a la 27 y al revés, para
   todos los personajes. Toda la lógica que mira la celda vecina (movimiento,
   IA de Pacman, IA de los fantasmas, dash, explosión, distancias por
   recorrido) tiene que usar la misma función de vecindad con el salto de
   borde. La distancia Manhattan del saltarín NO cruza el túnel. Las celdas
   del túnel son las de la fila 13 sin esfera pegadas a cada borde (columnas
   0 a 3 y 24 a 27): ahí los fantasmas van al 50 % de su velocidad; Pacman,
   los ojos y el dash no se frenan.

3. Base de los fantasmas (filas 12 a 16, columnas 10 a 17, puerta en
   (12,13) y (12,14)).
   - Pacman no puede entrar nunca. Los muros de la base no se atraviesan con
     el espectro, no los rompe Pacman con cargas y el saltarín no cae adentro.
   - Inicio del nivel y después de perder una vida: un fantasma de la IA
     arranca afuera, en (11,13); los demás arrancan adentro y salen de a uno
     cada 3 s. En modo GhostMan el fantasma del jugador arranca adentro, en el
     centro, y sale cuando el jugador lo lleva a la puerta; los dos fantasmas
     de la IA que arrancan adentro salen a los 3 y a los 6 s.
   - La puerta se cruza solo hacia afuera (fantasmas vivos) y solo hacia
     adentro (ojos). Un fantasma que salió no puede volver a entrar.
   - Fantasma comido: quedan sus ojos, que van solos hasta la puerta por el
     camino más corto, al doble de la velocidad del clásico, sin colisionar, y
     entran. Adentro revive y sale enseguida; el naval espera 3 s antes. En
     modo Pacman el tipo se sortea al revivir. Si el PowerUp sigue activo,
     revive vulnerable. Esto reemplaza los temporizadores de 5 y 8 s.
   - Mientras un fantasma está dentro de la base no puede usar su poder (el
     intento no consume el cooldown). Ninguna decisión lo cubre: es una
     interpretación para que el saltarín no salga de la base sin pasar por la
     puerta; registralo como hueco de especificación.
   - Frutas reales, frutas falsas y esferas grandes dinámicas no aparecen ni
     se colocan dentro de la base ni en el túnel.

4. Dibujo: el canvas tiene que entrar en la pantalla con el mapa nuevo; la
   puerta se dibuja como una barra fina; los fantasmas comidos se dibujan
   como ojos; un personaje a mitad del túnel se ve recortado en un borde y
   asomando por el otro, sin pisar el HUD. Los sprites definitivos son del
   incremento 22: usá el dibujo actual.

Adaptá las suites de scripts/verify/ que dependen de las coordenadas de los
mapas viejos o de la reaparición a los 5 s, y agregá core/inc19.js con: Pacman
nunca entra a la base, salida cada 3 s, puerta de un solo sentido, ojos que
vuelven y espera del naval, túnel en los dos sentidos con la velocidad
reducida, celdas restringidas, al menos un cruce válido del espectro por
nivel, y una simulación con el jugador quieto en la base (gana Pacman en modo
GhostMan). Después medí el balance. Si algo es ambiguo, preguntame antes de
generar código.
```

#### Prompt 19 — Impulso del acelerado (HU-31, HU-49; decisión 54)

```
Incremento 20. El dash del acelerado hoy es un teletransporte: el fantasma
aparece de golpe hasta 3 celdas adelante y el contacto con Pacman se calcula
sobre el segmento recorrido (decisión 32). Cambialo por un impulso real
(sección 4.4, decisión 54):

- Al activarlo se calcula cuántas celdas puede avanzar (3, 2, 1 o 0, con la
  regla actual; el túnel cuenta como camino). Con 0, nada cambia y el poder no
  se consume (decisión 25).
- El fantasma recorre esas celdas a 12 celdas/s (3 celdas en 0,25 s), en línea
  recta, sin leer el teclado ni la IA. El túnel no lo frena.
- La colisión con Pacman es la de siempre, cuadro a cuadro, durante todo el
  trayecto: si lo toca sin PowerUp, Pacman pierde una vida; si el acelerado
  está vulnerable, Pacman se lo come y el impulso se corta.
- El cooldown de 10 s arranca al activarlo. La penalidad de velocidad (50 %
  durante 5 s) arranca al terminar el impulso, o cuando se corta (comido o
  reinicio del nivel), para que nunca se pierda.
- Durante el impulso no se puede invertir la marcha (ni por el cambio de
  persecución a dispersión ni por el PowerUp) ni usar otro poder.
- Se ve una estela de 2 o 3 siluetas detrás del fantasma mientras se impulsa.
  El acelerado de la IA del modo Pacman usa la misma función.

Actualizá core/inc15.js y core/inc16.js, que hoy esperan el desplazamiento en
el mismo cuadro, y agregá core/inc20.js con: duración del impulso, celdas
recorridas por cuadro, colisión en el trayecto (adelante, a mitad de celda y
al final), corte por ser comido, penalidad al terminar y al cortarse, túnel y
la IA del modo Pacman. Si algo es ambiguo, preguntame antes de generar código.
```

#### Prompt 20 — Escala del original y mapas compactos (HU-44, HU-45, HU-50; decisiones 68 a 70)

```
Incremento 21. En la prueba manual, el mapa de 28 x 31 se ve enorme y armado
con bloques, y los niveles se hacen largos. La grilla y la base miden lo mismo
que en el original; lo que cambia es el dibujo y la cantidad de pasillos.
Hacé estos cambios (sección 4.1, decisiones 68 a 70):

- Dibujo a la escala del original (decisión 68). La celda lógica equivale a
  8 px y el canvas sigue en 672 x 744 (x3). Pacman y los fantasmas se dibujan
  con un radio de 0,8 celdas, y las frutas en la misma proporción. Los muros no
  se rellenan por celda: cada bloque se dibuja como un tubo que recorre su
  contorno por el centro de sus celdas, con esquinas redondeadas. Dos celdas
  de muro vecinas se unen solo si junto al tramo hay un pasillo, así un muro de
  una celda se ve como una línea y un bloque grueso como un contorno vacío. El
  tubo usa el contorno del nivel por fuera y las franjas (o el relleno) por
  dentro. Un personaje que asoma por el borde del túnel se dibuja también del
  otro lado.
- Mapas (decisión 69). Reemplazá los tres mapas por los de
  Workflow/v3-mapas.md: bloques de 2 o más celdas y unas 260 esferas por
  nivel. El marco fijo no cambia.
- Velocidad (decisión 70). Pacman y el clásico pasan de 3,75 a 4,5 celdas/s;
  el resto conserva su proporción.

La lógica, las colisiones y los temporizadores no cambian. Actualizá las
suites de scripts/verify/ que usan coordenadas de los mapas o velocidades,
manteniendo lo que verifica cada comprobación, y agregá core/inc21.js con:
los tres mapas (conexión, simetría, marco fijo, sin callejones ni espacios de
2 x 2, cantidad de esferas y cruces del espectro), las velocidades nuevas y el
jugador quieto que no gana. Si algo es ambiguo, preguntame antes de generar
código.
```

### 7.5 Registro de problemas de la sesión de generación

*A completar durante la sesión. Un renglón por problema, en el orden en que ocurrieron. Mismas columnas y criterios que la tabla 7.5 de la Entrega 02.*

| # | Incremento | Prompt | Problema observado | Cómo se resolvió | ¿Requirió edición manual? |
|---|---|---|---|---|---|
| 1 | 18 — Memoria de frutas falsas y salto hacia adelante | Prompt 17 | **Hueco de especificación heredado de la V2:** cuando la IA de Pacman no tiene ningún destino alcanzable, devuelve "sin dirección", pero el movimiento lo interpreta como "seguir en la dirección anterior". En la V2 no se notaba, porque solo pasaba sin esferas. Con la decisión 37, un Pacman que venía caminando hacia una fruta falsa que recuerda y que bloquea la única ruta habría seguido de largo y se la habría comido | Sin destino, la IA ahora detiene a Pacman. Lo detectó la prueba "espera cuando la fruta bloquea la única ruta" de `core/inc18.js`, que se reforzó para arrancar con Pacman en movimiento | No |
| 2 | 18 | Prompt 17 | **Cambio esperado en las suites anteriores:** dos comprobaciones de `core/inc14.js` colocaban la fruta falsa a 2 celdas de Pacman y esperaban que la consumiera. Con la memoria, esa fruta queda registrada y Pacman la evita | Se colocan con Pacman lejos y después se lo acerca, para probar el caso de una fruta que no vio colocar. El caso de la fruta registrada pasa a `core/inc18.js` | No |
| 3 | 18 | Prompt 17 | **Cambio esperado en las suites anteriores:** las comprobaciones del saltarín de `core/inc13.js` usaban un fantasma recién aparecido, sin dirección de avance. Con la decisión 41 ese salto no se ejecuta | Se les asigna una dirección de avance. La regla del semiplano se verifica en `core/inc18.js` | No |
| 4 | 18 | Prompt 17 | **Artefacto de la prueba:** en la prueba de la espera, el naval colocaba la fruta al lado de Pacman y Pacman huía de él (prioridad 1 de la IA) en el mismo paso, antes de que el script sacara al naval del juego | Pacman queda quieto (velocidad 0) mientras el naval coloca la fruta. No es un defecto del juego: con el naval a 3 celdas, huir es el comportamiento especificado | No |
| 5 | 18 | Prompt 17 | **Alcance:** el prompt incluyó la decisión 47 (cooldown que corre mientras el fantasma de la IA está comido), que el workflow no asignaba a ningún incremento | Se implementó en este incremento por ser un cambio de una línea en el mismo código. Se verifica en `core/inc18.js` | No |
| 6 | 19 — Mapas nuevos, base de los fantasmas y túnel | Prompt 18 | **Hueco de especificación:** ninguna decisión dice si un fantasma puede usar su poder dentro de la base. Con el saltarín, el jugador podría salir de la base sin pasar por la puerta, contra la decisión 44 | Se interpretó en el prompt: dentro de la base el poder no se usa y el intento no consume el cooldown. Registrado como decisión 67 | No |
| 7 | 19 | Prompt 18 | **Hueco de especificación:** la decisión 45 dice que en modo GhostMan "los fantasmas de la IA salen cada 3 s, como en el modo Pacman", pero no cuál de los tres arranca afuera | Se interpretó en el prompt: uno de la IA arranca afuera y los otros dos salen a los 3 y a los 6 s. El del jugador arranca en el centro de la base | No |
| 8 | 19 | Prompt 18 | **Defecto detectado por la suite nueva:** un fantasma comido a mitad de camino entre dos celdas terminaba ese paso aunque lo alejara de la base, y sus ojos recorrían dos celdas de más | Si el paso en curso aleja de la base, los ojos dan media vuelta. Lo verifica `core/inc19.js`, que compara el tiempo de vuelta con el camino más corto | No |
| 9 | 19 | Prompt 18 | **Cambio esperado en las suites anteriores:** las suites 10 a 18 usaban coordenadas de los mapas de 17 × 15, la aparición de los fantasmas en las esquinas y la reaparición a los 5 s. La comprobación "nivel 1: ningún cruce válido para el espectro" de la suite 13 pasa a ser lo contrario: 480, 492 y 444 cruces en los niveles 1 a 3 (decisión 26) | Se reescribieron las coordenadas sobre los mapas nuevos y las comprobaciones de la reaparición pasan a verificar los ojos y la espera dentro de la base | No |
| 10 | 19 | Prompt 18 | **Rendimiento:** el mapa nuevo tiene 868 celdas (3,4 veces el anterior) y la búsqueda de caminos de la IA de Pacman con cargas recorría todo el mapa en cada paso de Dijkstra | Se reemplazó por una cola por distancia (los costos son 1 y 3), con el mismo orden de desempate | No |
| 11 | 19 | Prompt 18 | **Interfaz:** el aviso "Reaparecés en N" de la HU-27 contaba los 5 s de la V2. Con los ojos, la vuelta no tiene un tiempo fijo | Mientras vuelven los ojos se muestra "Volviendo a la base…"; el naval, ya adentro, muestra "Reaparecés en N" durante su espera de 3 s | No |
| 12 | 19 | Prompt 18 | **Entorno:** las suites de navegador no se podían correr porque `playwright-core`, que figura en las dependencias de desarrollo, no estaba instalado | Se instaló con `npm install` desde el lockfile, sin cambiar `package.json` ni `package-lock.json` | No |
| 13 | 20 — Impulso del acelerado | Prompt 19 | **Cambio de implementación de una decisión anterior:** la decisión 32 (contacto en todo el trayecto del *dash*) estaba resuelta calculando la distancia de Pacman al segmento recorrido, porque el *dash* era instantáneo. Con el impulso, el acelerado pasa por cada celda | Se eliminó el cálculo del segmento: el contacto lo detecta la colisión de cada cuadro, como para cualquier fantasma. Lo verifica `core/inc20.js`, también con Pacman yendo de frente hacia el acelerado | No |
| 14 | 20 | Prompt 19 | **Hueco de especificación:** la decisión 54 mantiene la penalidad de 5 s, pero no dice si arranca al activar el poder o al terminar el impulso, ni qué pasa si el impulso se corta | Se definió en el prompt: arranca al terminar el impulso, o cuando se corta (comido o reinicio del nivel), para que cortarlo no la evite | No |
| 15 | 20 | Prompt 19 | **Observación:** el impulso arranca desde el centro de la celda que ocupa el acelerado (la misma regla de la V2), así que si estaba a mitad de camino vuelve hasta media celda antes de impulsarse. Además, el acelerado de la IA activa el poder al final del cuadro, después de moverse, y su impulso empieza a avanzar en el cuadro siguiente | Se dejó así: el retroceso es de media celda como máximo y queda tapado por la estela. Las pruebas cuentan los 15 cuadros del impulso desde que empieza a avanzar | No |
| 16 | 21 — Escala del original y mapas compactos | Prompt 20 | **Hallazgo de la prueba manual de los incrementos 18 a 20 (D. Savoia):** la jugabilidad está bien y el nuevo diseño es más justo, pero el mapa se ve enorme, la base ocupa mucho más que en el original y los niveles se hacen largos. Los mapas parecen armados con bloques, no como los del original | Se comparó con el original: la grilla (28 × 31) y la base (8 × 5) miden lo mismo; la diferencia está en el dibujo (personajes de una celda, muros rellenos), en la cantidad de esferas (344 a 388 contra 240) y en la velocidad (3,75 celdas/s contra unas 7,5). Se registraron las decisiones 68 a 70 y se agregó este incremento | No |
| 17 | 21 | Prompt 20 | **Diseño de los mapas:** el primer borrador del nivel 1 que propuso el agente quedó casi igual al laberinto del original, contra la regla de diseño propio de `v3-mapas.md`, y sin ningún muro de una celda para el espectro | Se descartó. Los tres mapas se rediseñaron con un validador (conexión, simetría, marco fijo, callejones, espacios de 2 × 2, esferas y cruces del espectro) y se aprobaron con capturas dibujadas por el propio `render.ts` | No |
| 18 | 21 | Prompt 20 | **Cambio esperado en las suites anteriores:** 9 de las 11 suites del núcleo fallaron por coordenadas que en los mapas nuevos son muro (las filas 1 y 5 del nivel 1 ya no son pasillos completos) y por velocidades escritas como literales (3,75) | Las coordenadas pasaron a posiciones equivalentes, sobre todo a la fila 3 del nivel 1, y las velocidades se calculan con las constantes o se actualizaron. Ninguna falla resultó ser un defecto del juego. Con la IA sola, Pacman completa los niveles en 79, 84 y 88 s, y en modo GhostMan con el jugador quieto completa el nivel 1 a los 170 s (antes, 255 s; 126 s sin la decisión 71) | No |
| 19 | 21 | Prompt 20 | **Verificación del dibujo:** el contorno de los muros se dibuja con `Path2D`, que no existe en Node, así que las suites del núcleo no podían comprobar la regla | La regla quedó en una función pura (`wallOutlineSides`) que usa el dibujo y que verifica `core/inc21.js`: interior de un bloque, esquinas, bordes, pilares sueltos y el borde del mapa | No |
| 20 | 21 | Corrección no planificada | **Balance:** con los mapas compactos, el bot de balance perdió las 50 partidas sin usar el poder y 49 de 50 usándolo, casi todas en el nivel 1. Pacman limpiaba el nivel en unos 130 s y el bot llegaba a derrotarlo 2 de las 3 veces necesarias | Se probó en una copia temporal Pacman al −15 % en modo GhostMan y se aprobó como decisión 71. La comprobación de huida de `core/inc11.js` aceptaba solo la huida hacia la derecha; con la velocidad nueva Pacman huye hacia arriba por la columna 8, que también es una huida válida, y se amplió | No |

### 7.6 Observaciones sobre la implementación con AI

**Balance después del incremento 18.** Se usó el bot de la Entrega 02 (`npm run verify:balance`), en 10 partidas por tipo, antes y después del incremento y sobre el mismo código de base. La medición de la Entrega 02 no sirve como referencia porque después cambiaron las velocidades (decisiones 39 y 40). Victorias:

| Tipo | Sin usar el poder | Usando el poder, antes del incremento 18 | Usando el poder, después del incremento 18 |
|---|---|---|---|
| Clásico | 7 | 7 (no tiene poder) | 7 (no tiene poder) |
| Espectro | 9 | 9 | 9 |
| Saltarín | 7 | 6 | **8** |
| Naval | 8 | 9 | **6** |
| Acelerado | 7 | 9 | 9 |

Sin usar el poder, los resultados no cambian, porque el incremento solo afecta al saltarín que salta y al naval que coloca frutas. El **saltarín** pasa de empeorar al usar su poder (6 frente a 7) a mejorar (8): el salto hacia adelante dejó de jugar en contra. El **naval** baja de 9 a 6: la trampa ya no funciona sola. El bot coloca la fruta cuando persigue a Pacman de cerca, que es justo cuando Pacman la ve colocar, y le alcanza con recordarla 10 s para esquivarla. Un jugador que la coloque fuera de la vista de Pacman debería sacarle más provecho. Las dos correcciones van en la dirección que buscaban las decisiones 37 y 38. El bot no es un jugador real, así que la medición sirve para comparar el efecto del cambio, no para afirmar que el juego está balanceado.

**Balance después del incremento 19.** Mismo bot, actualizado para salir de la base por la puerta y usar el túnel (antes del ajuste se quedaba en la base y perdía todas las partidas, como el jugador quieto de la decisión 34). Resultados en 10 partidas por tipo: V es victoria, GO es Game Over y "?" es una partida que no terminó en 15 minutos de juego.

| Tipo | Sin usar el poder | Usando el poder |
|---|---|---|
| Clásico | 6 V · 4 ? | 6 V · 4 ? (no tiene poder) |
| Espectro | 10 GO en el nivel 1 | 10 GO en el nivel 1 |
| Saltarín | 6 V · 4 ? | 9 V · 1 GO |
| Naval | 10 ? | 7 GO · 3 ? |
| Acelerado | 6 V · 4 ? | 8 V · 2 GO |

Tres lecturas para el playtest que prevé la decisión 51:
- **Partidas sin terminar.** Con mapas 3,4 veces más grandes aparecen persecuciones sin fin: Pacman huye cuando el bot está a 4 celdas o menos, vuelve hacia la esfera más cercana y vuelve a huir. Pasa sobre todo en el anillo de la base, donde el bot se queda en la entrada en lugar de entrar. Es una limitación del bot, no un defecto del juego: un jugador que entra al anillo lo alcanza o lo obliga a salir. Se revisaron las posiciones de los fantasmas de la IA en una de esas partidas y se siguen moviendo.
- **Los tipos lentos.** El espectro (2,625 celdas/s) no alcanza a Pacman (3,75) en ningún nivel, y el naval (3) gana 0 de 10 aunque use su poder. En los mapas de 17 × 15 el bot ganaba con los dos. Las distancias más largas castigan la diferencia de velocidad.
- **El saltarín y el acelerado** son los que mejor aprovechan su poder en los mapas grandes: el salto y el *dash* acortan distancias que ahora son más largas.

Los valores a revisar después de jugar son las velocidades (decisiones 39 y 40) y las cargas de destrucción de la decisión 22, que en esta medición no se tocaron.

**Balance después del incremento 20.** Con el bot que usa su poder, el acelerado sigue en 8 victorias y 2 Game Over en el nivel 3, igual que después del incremento 19: recorrer las celdas en 0,25 s en lugar de aparecer de golpe no cambió el resultado. El resto de los tipos no se ve afectado por este incremento y da lo mismo que en la medición anterior.

**Balance después del incremento 21.** Mismo bot y mismas semillas. Victorias en 10 partidas por tipo (sin usar el poder · usando el poder):

| Tipo | Incremento 20 (sin poder) | Mapas compactos y 4,5 celdas/s | Con la decisión 71 |
|---|---|---|---|
| Clásico | 6 | 0 · 0 | 5 · 5 |
| Espectro | 0 | 0 · 0 | 2 · 2 |
| Saltarín | 6 | 0 · 1 | 5 · 3 |
| Naval | 0 | 0 · 0 | 0 · 0 |
| Acelerado | 6 | 0 · 0 | 5 · 1 |

- **Sin compensar, el modo GhostMan se volvía casi imposible para el bot.** Con un tercio menos de esferas, Pacman limpia el nivel 1 en unos 130 s, y el bot solo llegaba a derrotarlo 2 veces. Subir todas las velocidades por igual (decisión 70) no cambia esa relación: lo que cambió es cuánto tarda Pacman en terminar.
- **Con la decisión 71 el balance vuelve a valores cercanos a los del incremento 20,** y desaparecen casi todas las partidas sin terminar: los mapas compactos ya no producen las persecuciones sin fin del anillo.
- **El espectro gana 2 de 10, contra 0 de 10 en el incremento 20.** Los muros de una celda que quedan los cruza bien. **El naval** sigue sin ganar: es el más lento (3,6 celdas/s contra 3,825 de Pacman) y su poder no compensa la diferencia.
- **Usar el poder empeora al saltarín y al acelerado** cuando el bot lo usa apenas puede. Una explicación posible es que el salto al azar y el impulso en línea recta lo alejan de Pacman en los mapas con bloques más grandes; el bot no elige cuándo conviene usarlo.

Las velocidades del naval y del espectro y las cargas de la decisión 22 siguen como pendientes del playtest (decisión 51).

*El resto, a completar al cierre de la etapa de generación.*

---

## 8. Estrategia de pruebas de la V3

Se mantiene la estrategia de la sección 9 de la Entrega 01: pruebas manuales de caja negra sobre la aplicación desplegada, con las mismas técnicas, la misma priorización y los mismos criterios de entrada y de salida. Esta sección registra solo lo que cambia con la V3.

### 8.1 Análisis de riesgos de la V3

| Área | Probabilidad | Impacto | Riesgo | Fundamento |
|---|---|---|---|---|
| Mapas nuevos y base de los fantasmas | Alta | Alto | **Crítico** | Cambia el escenario de todas las reglas de la V1 y la V2: posiciones de aparición, cuenta de esferas, reaparición y recorridos de las IA |
| Regresión de la V1 y la V2 | Alta | Alto | **Crítico** | Los mapas, la base, el túnel y la cuenta regresiva modifican el resultado esperado de muchos casos ya aprobados |
| Registro e inicio de sesión | Media | Alto | **Alto** | Si falla, nadie puede jugar (HU-37). Depende de un servicio externo |
| Túnel | Media | Medio | **Medio** | El salto de un borde al otro es un caso especial para el movimiento, las colisiones, las distancias y el dibujado |
| Tableros de puntaje | Media | Medio | **Medio** | Orden, empates, límites del top 10 y la actualización inmediata dependen de la base de datos |
| Puntajes falsos | Baja | Medio | **Bajo** | Limitación conocida y aceptada (decisión 63): un usuario podría enviar un puntaje dentro del rango válido sin haberlo logrado |
| Animaciones y cuenta regresiva | Media | Bajo | **Bajo** | Si alteran tiempos o colisiones, afectan a las reglas. Se mitiga con la regla de la decisión 59 y la verificación del incremento 24 |
| Audio | Baja | Bajo | **Bajo** | No afecta las reglas del juego |

### 8.2 Regresión de la V1 y la V2

*A completar en la Etapa 2 del workflow.* Como mínimo, estos casos cambian:

| Caso | Cambio | Decisión |
|---|---|---|
| Todos los de la V1 y la V2 | Precondición nueva: sesión iniciada con el usuario de prueba | 66 |
| Todos los que dependen de posiciones del mapa o de la cuenta de esferas | Se reescriben sobre los mapas nuevos | 26, 34 |
| Los que verifican la reaparición a los 5 s o a los 8 s | Pasan a verificar los ojos que vuelven a la base y la espera del naval | 46 |
| CP-055, CP-058 | El espectro se prueba sobre muros de una celda de los mapas nuevos | 26 |
| CP-087, CP-089 | El destino del saltarín pasa a estar adelante | 38, 41 |
| Los del *dash* del acelerado | El *dash* recorre las celdas en 0,25 s | 54 |
| Los que miden tiempos desde el inicio del nivel | Se descuentan los 3,5 s de la cuenta regresiva | 52 |

---

## 9. Especificación de casos de prueba de la V3

*A completar en la Etapa 2 del workflow:* detalle completo de los CP-106 a CP-140 y casos nuevos de las HU-44 a HU-50 desde el CP-164.

---

## 10. Matriz de trazabilidad

*A completar en la Etapa 2 del workflow.*

---

## 11. Reporte de ejecución de casos de prueba

*A completar en la Etapa 4 del workflow.*

---

## 12. Reporte de defectos

*A completar en las Etapas 4 y 5 del workflow.*

---

## 13. Conclusiones y próximos pasos

### 13.1 Estado al 30/10/2026

Especificación de la V3 cerrada por D. Savoia (decisiones 41 a 66). Sin incrementos de la V3 ejecutados.

### 13.2 Pendientes

| # | Pendiente | Origen | Responsable |
|---|---|---|---|
| 1 | Revisar las decisiones 26, 34, 37, 38 y 41 a 66 y pasarlas a *Aprobada* o *Modificada* | Sección 5 | Equipo completo |
| 2 | Revisar las decisiones 17 a 36 de la V2 | Pendiente 1 de la Entrega 02 | Equipo completo |
| 3 | Validar la explosión de la fruta falsa como derrota en modo GhostMan | Pendiente 8 de la Entrega 02 | Equipo completo |
| 4 | Decidir qué hacer con CP-032 (HU-08): marcarlo *No aplica* o reformular el criterio | Pendiente 14 de la Entrega 02 | Equipo completo |
| 5 | Confirmar y verificar DEF-002 con otro integrante | Pendiente 14 de la Entrega 02 | `[completar]` |
| 6 | Subir el tag `v1.0` al remoto y crear el tag `v2.0` | Pendiente 15 de la Entrega 02 | Savoia |
| 7 | Crear los proyectos de Supabase y pasar la URL y la clave pública de cada uno | Decisión 60 | Savoia |
| 8 | Definir quién conduce los prompts y quién registra la sesión | Sección 7 | Equipo completo |

---

## 14. Anexos

*A completar.*
