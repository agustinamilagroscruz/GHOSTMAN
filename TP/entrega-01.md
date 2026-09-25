# Proyecto Integrador de Testing de Aplicaciones
## Entrega 01 — GhostMan

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
| Repositorio de código | `[URL del repositorio de GitHub]` |
| Aplicación desplegada | `[URL de despliegue]` |
| Planilla de casos de prueba y defectos | `[URL de Google Sheets]` |

---

## Índice

1. [Objetivo de la entrega](#1-objetivo-de-la-entrega)
2. [Descripción del producto](#2-descripción-del-producto)
3. [Alcance y plan de versiones](#3-alcance-y-plan-de-versiones)
4. [Reglas de negocio y parámetros del juego](#4-reglas-de-negocio-y-parámetros-del-juego)
5. [Decisiones sobre ambigüedades de la pre-entrega](#5-decisiones-sobre-ambigüedades-de-la-pre-entrega)
6. [Organización del equipo](#6-organización-del-equipo)
7. [Especificación de requerimientos: historias de usuario](#7-especificación-de-requerimientos-historias-de-usuario)
8. [Implementación de la aplicación con AI](#8-implementación-de-la-aplicación-con-ai)
9. [Estrategia de pruebas](#9-estrategia-de-pruebas)
10. [Especificación de casos de prueba](#10-especificación-de-casos-de-prueba)
11. [Matriz de trazabilidad](#11-matriz-de-trazabilidad)
12. [Reporte de ejecución de casos de prueba](#12-reporte-de-ejecución-de-casos-de-prueba)
13. [Reporte de defectos](#13-reporte-de-defectos)
14. [Conclusiones y próximos pasos](#14-conclusiones-y-próximos-pasos)
15. [Anexos](#15-anexos)

---

## 1. Objetivo de la entrega

Esta entrega documenta las actividades de las Partes A y B del Proyecto Integrador:

**Parte A**
- Especificación detallada de los requerimientos del producto, expresados como historias de usuario con criterios de aceptación verificables.
- Definición de la estrategia de construcción de la aplicación mediante *vibe-coding* con asistentes de AI: agentes utilizados, prompts, y registro de problemas encontrados.

**Parte B**
- Especificación de los casos de prueba derivados de las historias de usuario.
- Ejecución de los casos de prueba.
- Reporte de defectos.
- Reporte de ejecución de los casos de prueba.

### Estado de avance al momento de esta entrega

El equipo optó por completar primero la especificación de requerimientos y el diseño de los casos de prueba, y recién después ejecutar el *vibe-coding* de la aplicación. La decisión se apoya en un criterio visto en clase: **si para un requerimiento no se puede diseñar un caso de prueba con resultado pass/fail, ese requerimiento no está listo para desarrollo**. Escribir los casos de prueba antes de generar el código nos obligó a cerrar ambigüedades de la pre-entrega (ver sección 5) que de otro modo habrían llegado al asistente de AI como texto interpretable y habrían producido comportamientos arbitrarios, difíciles de calificar como defecto o como funcionalidad no especificada.

En consecuencia, en este documento:

- Las secciones 1 a 7, 9, 10 y 11 están **completas**: requerimientos, estrategia de pruebas, casos de prueba y trazabilidad.
- La sección 8 contiene el **plan de implementación con AI, los prompts y el registro de la sesión de generación ya ejecutada**: los nueve incrementos de la V1 están generados, cada uno con su commit, y los problemas encontrados están registrados en la tabla 8.5 y analizados en 8.6.
- Las secciones 12 y 13 contienen los **instrumentos de reporte** (estructura de datos, métricas y criterios de clasificación) con las tablas preparadas para consolidar los resultados de la ejecución.

---

## 2. Descripción del producto

**GhostMan** es un juego web para navegador inspirado en el clásico Pac-Man, con dos diferenciadores respecto del original:

1. **Dos modos de juego jugables.** El modo *Pacman*, donde el jugador controla a Pacman y debe consumir todas las esferas del mapa evitando a los fantasmas; y el modo *GhostMan*, donde el jugador controla a uno de los fantasmas y su objetivo es impedir que Pacman complete el nivel.

2. **Fantasmas con poderes.** Además del fantasma clásico, existen cuatro tipos con habilidades activas (Espectro, Saltarín, Naval y Acelerado), cada una con su propio *cooldown* y sus penalidades compensatorias. Estos poderes afectan la partida tanto cuando el jugador los controla como cuando los enfrenta, lo que multiplica la cantidad de situaciones de juego posibles y la rejugabilidad.

El juego se estructura en **tres niveles** con mapas propios y dificultad creciente, y el jugador dispone de **tres vidas** por partida en cualquiera de los dos modos.

### 2.1 Mapas

| Nivel | Identidad visual | Contenido |
|---|---|---|
| 1 | Fondo negro con franjas rojas, contorno celeste, puntos blancos que marcan los recorridos | Fantasmas comunes únicamente |
| 2 | Tonos azules fríos sobre fondo negro, sin franjas, contorno azul | Se incorporan fantasmas con poderes |
| 3 | Verde brillante | Todos los fantasmas con poderes, más frutas que aparecen dinámicamente |

Cada mapa tiene una forma fija y particular de ese nivel: no se generan de manera aleatoria y no cambian entre partidas.

### 2.2 Tipos de fantasma

| Tipo | Habilidad | Cooldown | Penalidad |
|---|---|---|---|
| **Clásico** | Ninguna | — | Ninguna |
| **Espectro** | Atraviesa una pared | 10 s | 30 % más lento que el clásico; no puede comer a Pacman durante los 3 s posteriores a atravesar el muro |
| **Saltarín** | Se teletransporta a una celda aleatoria dentro de un radio de 10 celdas | 10 s | El destino no es elegible por el jugador |
| **Naval** | Coloca frutas falsas que hacen perder a Pacman; si no se interactúa con ellas en 10 s, explotan en un radio de 3 celdas sin atravesar paredes | 5 s entre frutas, máximo 2 simultáneas | 20 % más lento que el clásico; tarda más en reaparecer al ser comido |
| **Acelerado** | *Dash* de hasta 3 celdas en la dirección de avance, se detiene si choca una pared | 10 s | −50 % de velocidad durante los 5 s posteriores al *dash* |

En modo GhostMan, el poder se activa con la **barra espaciadora**, y su disponibilidad se indica con un ícono de estrella (⭐) junto al contador de vidas, en el extremo inferior izquierdo de la pantalla.

### 2.3 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | React sobre Next.js |
| Motor de juego | `<canvas>` con bucle de renderizado propio (`requestAnimationFrame`) |
| Interfaz de menús | Componentes React |
| Persistencia (V3) | Supabase (autenticación y tabla de puntajes) |
| Despliegue | Vercel |
| Control de versiones | GitHub |

La decisión de usar canvas para el juego y componentes React para los menús responde a que la grilla de juego requiere control fino del bucle de dibujo y de la detección de colisiones por celda, mientras que menús, carruseles y tableros de puntaje se benefician del modelo declarativo de React. Para el testing esta separación es conveniente: los menús son inspeccionables desde el DOM, y la lógica del juego se valida por comportamiento observable en pantalla.

---

## 3. Alcance y plan de versiones

El desarrollo sigue un enfoque **iterativo e incremental** en tres versiones. Cada versión entrega un producto utilizable, y el alcance definido en la pre-entrega se alcanza al completar la tercera.

### V1 — Modo Pacman completo

Funcionalidad completa del modo Pacman: movimiento, esferas, esferas grandes con PowerUp, frutas, muros, fantasmas controlados por IA, puntaje, vidas, HUD, los tres niveles, y las condiciones de victoria y derrota.

**Limitaciones deliberadas de esta versión:** los fantasmas se restringen a los tipos **clásico** y **espectro**. No hay registro de usuarios, tableros de puntaje, skins ni menú principal.

### V2 — Modo GhostMan y fantasmas especiales

Se incorporan los tipos de fantasma restantes (**naval**, **saltarín** y **acelerado**) y el modo de juego **GhostMan** completo, con selección de fantasma, condiciones de victoria propias y el PowerUp de destrucción de paredes de Pacman. Con esta versión quedan disponibles los dos modos de juego principales.

### V3 — Cuentas, puntajes y personalización

Se suman **login y registro** de usuarios, **tablero de puntajes** global y personal con estadísticas, **skins** de Pacman y de los fantasmas, y el **menú de opciones** con control de volumen.

### 3.1 Alcance de la ejecución de pruebas en esta entrega

| Versión | Requerimientos especificados | Casos de prueba diseñados | Casos de prueba a ejecutar en Entrega 01 |
|---|---|---|---|
| V1 | Sí, con detalle completo | Sí, con detalle completo | **Sí** |
| V2 | Sí | Sí, en formato sintético | No (Entrega 02) |
| V3 | Sí | Sí, en formato sintético | No (Entrega 02/03) |

Se especifican los requerimientos y los casos de prueba de las tres versiones porque hacerlo temprano expone dependencias que condicionan el diseño de la V1. El ejemplo más claro: el modo GhostMan de la V2 exige que la lógica de movimiento y de colisiones sea agnóstica de quién controla la entidad. Si la V1 se implementara con esa lógica acoplada a Pacman, la V2 obligaría a reescribirla, y ese trabajo de reescritura es también un riesgo de regresión sobre funcionalidad ya probada. Documentarlo desde ahora nos permite condicionar los prompts de generación de la V1.

Los casos de prueba de V2 y V3 se presentan en formato sintético (título, condición de aceptación y prioridad) y se desarrollarán con el detalle completo de pasos cuando esas versiones entren en ejecución.

---

## 4. Reglas de negocio y parámetros del juego

Esta sección concentra los valores numéricos y las reglas que gobiernan el juego. Existe como sección propia y no dispersa entre las historias de usuario por una razón práctica de testing: son los valores contra los que se calcula el resultado esperado de los casos de prueba. Si un parámetro se ajusta durante el desarrollo, el cambio se hace en un solo lugar y queda claro qué casos de prueba hay que revisar.

### 4.1 Estructura de la partida

| Parámetro | Valor |
|---|---|
| Niveles por partida | 3 |
| Vidas iniciales | 3 |
| Vidas extra | No hay: el jugador no gana vidas por puntaje |
| Condición de victoria de la partida (modo Pacman) | Completar los tres niveles sin agotar las vidas |
| Condición de derrota | Perder las 3 vidas |
| Efecto de perder una vida | Se reinicia el nivel en curso: personajes vuelven a su posición inicial. Las esferas ya consumidas y el puntaje acumulado **se conservan** |

### 4.2 Puntaje

| Elemento | Puntos |
|---|---|
| Esfera común | 10 |
| Esfera grande (PowerUp) | 50 |
| Fruta | 100 |
| 1er fantasma comido en un mismo PowerUp | 200 |
| 2º fantasma comido en el mismo PowerUp | 400 |
| 3er fantasma comido en el mismo PowerUp | 800 |
| 4º fantasma comido en el mismo PowerUp | 1600 |
| Bonus por tiempo | 10 por cada segundo **entero** restante respecto del tiempo objetivo del nivel |
| Bonus por vida sobrante al terminar la partida | 500 por vida |

**Reglas del encadenamiento:** la escala de 200/400/800/1600 se reinicia al terminar cada PowerUp. Consumir una nueva esfera grande mientras el PowerUp está activo reinicia el temporizador del efecto y **también** la escala de puntos.

**Tiempo objetivo por nivel:** nivel 1 = 120 s, nivel 2 = 150 s, nivel 3 = 180 s. Si el jugador supera el tiempo objetivo, el bonus por tiempo es 0 y nunca negativo.

**Segundos enteros:** el bonus se calcula sobre los segundos enteros restantes, descartando la fracción. Ejemplo: si el nivel 1 se completa en 100,5 s, quedan 19,5 s, se cuentan 19 y el bonus es 190. El tiempo que se mide es el de juego efectivo: no incluye las pausas.

### 4.3 PowerUp de Pacman

| Parámetro | Valor |
|---|---|
| Duración | 8 segundos |
| Aviso de fin | Durante los últimos 2 segundos los fantasmas parpadean |
| Efecto sobre los fantasmas | Cambian su diseño, dejan de perseguir a Pacman y huyen de él |
| Efecto sobre Pacman | Puede comer fantasmas |
| Consumo de una segunda esfera grande con el efecto activo | Reinicia el temporizador a 8 s y reinicia la escala de puntos |
| Fantasma comido | Vuelve a su punto de reaparición y retoma su comportamiento normal |

**Reaparición del fantasma comido:** 5 segundos para los tipos clásico, espectro, saltarín y acelerado; **8 segundos** para el naval, que según la especificación tarda más en reaparecer.

### 4.4 Progresión de la dificultad en modo Pacman

| Nivel | Composición de fantasmas |
|---|---|
| 1 | Todos los fantasmas son de tipo clásico |
| 2 | Cada fantasma comido por Pacman **puede** regresar como fantasma con poderes (probabilidad del 50 %) |
| 3 | Todos los fantasmas tienen poderes desde el inicio del nivel. Además aparecen frutas en posiciones aleatorias del mapa a medida que transcurre el tiempo |

**Frutas del nivel 3:** las frutas aparecen **únicamente en el nivel 3**; en los niveles 1 y 2 no hay frutas. Aparece una fruta cada **7 segundos** en una celda transitable aleatoria que no esté ocupada por un personaje. Puede haber como máximo 2 frutas simultáneas en el mapa. Una fruta no consumida desaparece a los 15 segundos. Si al cumplirse los 7 segundos ya hay 2 frutas en el mapa, esa aparición se omite y se espera a la siguiente.

Con estos valores la secuencia desde el inicio del nivel es: fruta a los 7 s; segunda fruta a los 14 s (coexisten 2); a los 21 s no aparece una tercera porque siguen las dos anteriores; a los 22 s desaparece la primera; a los 28 s aparece una nueva. El intervalo original de 20 s se reemplazó por 7 s (decisión 16 de la sección 5).

### 4.5 Progresión de la dificultad en modo GhostMan

| Nivel | Capacidades de Pacman (controlado por IA) |
|---|---|
| 1 | Comportamiento habitual, acceso únicamente al PowerUp de comer fantasmas |
| 2 | Se suma el poder de **destruir hasta 5 paredes**, obtenido al consumir una esfera grande, que le permite generar atajos o escapar |
| 3 | Hay más esferas de PowerUp en el mapa y además pueden aparecer nuevas en posiciones aleatorias durante la partida |

**Condiciones del modo GhostMan:**
- El jugador completa el nivel si logra tocar a Pacman (sin PowerUp activo) **3 veces** en ese nivel.
- Cada vez que el jugador toca a Pacman, Pacman pierde una vida y el nivel se reinicia.
- Si Pacman consume todas las esferas del nivel antes de ser derrotado 3 veces, **el jugador pierde la partida** y se muestra la pantalla de Game Over.
- El fantasma elegido al inicio no puede cambiarse durante la partida.

### 4.6 Controles

| Acción | Tecla |
|---|---|
| Mover | Flechas ← ↑ → ↓ o teclas A W D S |
| Activar poder (modo GhostMan) | Barra espaciadora |
| Pausar / reanudar | ESC |
| Navegar carruseles y tableros | Flechas ← → o teclas A / D |
| Confirmar selección | Enter |

En **modo Pacman la barra espaciadora no tiene efecto**, ya que Pacman no dispone de poderes activables: su PowerUp se obtiene consumiendo esferas grandes y se activa automáticamente.

### 4.7 Comportamiento de la IA de los fantasmas

Los fantasmas controlados por la IA alternan entre dos estados:

- **Persecución (*chase*):** se desplazan hacia Pacman eligiendo, en cada intersección, la dirección que reduce la distancia hacia él.
- **Dispersión (*scatter*):** se desplazan hacia una esquina asignada del mapa, distinta para cada fantasma.

El ciclo es de **20 segundos de persecución y 7 de dispersión**, repetido durante todo el nivel. Los fantasmas no pueden invertir su dirección de marcha excepto al cambiar de estado o al iniciarse un PowerUp de Pacman.

**Nota de testabilidad:** los requerimientos referidos a la IA se especifican y se prueban por **comportamiento observable** (¿el fantasma se acerca a Pacman durante la persecución? ¿se aleja hacia su esquina en la dispersión? ¿huye durante el PowerUp?), no por la implementación concreta del algoritmo de decisión. Un caso de prueba que exigiera una ruta exacta sería frágil y sería reprobado por cualquier variación válida del algoritmo.

### 4.8 Fruta falsa del Naval

| Parámetro | Valor |
|---|---|
| Efecto sobre Pacman al consumirla | Pacman **pierde una vida** y el nivel se reinicia |
| Tiempo hasta la explosión | 10 s sin interacción de Pacman |
| Radio de la explosión | 3 celdas, sin atravesar paredes |
| Efecto de la explosión sobre Pacman | Si Pacman está dentro del radio, pierde una vida |
| Máximo simultáneo | 2 frutas falsas |
| Cooldown entre colocaciones | 5 s |
| Efecto durante el PowerUp de Pacman | La fruta falsa **no** afecta a Pacman mientras el PowerUp esté activo |

### 4.9 Reglas de cuentas y puntajes (V3)

| Regla | Definición |
|---|---|
| Username | 3 a 16 caracteres alfanuméricos, único e irrepetible. No admite espacios ni símbolos |
| Contraseña | Mínimo 8 caracteres, con al menos una letra y al menos un número |
| Confirmación de contraseña | Debe coincidir exactamente con la contraseña |
| Mensajes de error | Se muestran por campo, junto al campo que los origina |
| Tablero global | Top 10 posiciones por modo de juego, con posición, nombre del jugador y puntaje |
| Tablero personal | Mejor puntaje del usuario en cada uno de los dos modos |
| Persistencia | Supabase |
| Registro de un puntaje | Al finalizar una partida, si el puntaje supera el mejor puntaje personal del usuario en ese modo |

---

## 5. Decisiones sobre ambigüedades de la pre-entrega

Al derivar casos de prueba de la pre-entrega encontramos puntos que no permitían un resultado pass/fail inequívoco, y en dos casos contradicciones internas del documento. Los resolvimos antes de generar la aplicación. Cada decisión se registra con su fundamento, porque son requerimientos que no figuran en la pre-entrega y el equipo debe poder rastrear de dónde salieron.

Las decisiones 1 a 13 surgieron del diseño de los casos de prueba, antes de generar la aplicación. Las decisiones 14 a 16 surgieron **durante la generación** (tabla 8.5, filas 7, 8 y 11) y se resolvieron antes de ejecutar los casos de prueba.

| # | Ambigüedad o contradicción detectada | Decisión adoptada | Fundamento |
|---|---|---|---|
| 1 | La sección "Modo Pacman" indica que en el nivel 1 todos los fantasmas son de tipo común; la sección "Niveles" indica nivel 1 con comunes **más algunos especiales** | En el nivel 1 **todos los fantasmas son de tipo clásico** | Es la formulación de la sección que describe las reglas del modo, y sostiene la curva de dificultad: si el nivel 1 ya tuviera poderes, la progresión de los niveles 2 y 3 perdería sentido |
| 2 | La fruta falsa del Naval "hace que Pacman pierda al instante" (sección Tipos de fantasmas), pero la descripción del nivel 3 dice que "un fantasma puede morir al instante" | La fruta falsa hace que **Pacman pierda una vida** y se reinicie el nivel; no termina la partida ni afecta a los fantasmas | La mención a un fantasma muriendo es un error de redacción: el poder es del fantasma y su objetivo es Pacman. Que costara la partida entera haría del Naval un fantasma desbalanceado frente a los otros tres |
| 3 | El puntaje "se calcula a partir de las esferas y fantasmas consumidos, el tiempo y las vidas restantes", sin valores | Fórmula completa en la sección 4.2 | Sin valores concretos no existe resultado esperado para ningún caso de prueba de puntaje. Se adoptó la escala del Pac-Man original (10 / 50 / 200-400-800-1600) por ser la referencia declarada del proyecto |
| 4 | La duración del PowerUp no está definida; solo se indica que el cambio de diseño de los fantasmas la hace identificable | 8 segundos, con parpadeo en los últimos 2 | Valor del juego original. El parpadeo materializa el "es visiblemente fácil identificar la duración" de la pre-entrega y lo vuelve verificable |
| 5 | No se indica si se ganan vidas extra por puntaje | No hay vidas extra | La pre-entrega menciona 3 vidas como cantidad fija y no menciona ningún mecanismo de recuperación |
| 6 | Los controles de movimiento no están especificados, y la barra espaciadora está asignada a los poderes de los fantasmas: no se dice qué hace en modo Pacman | Flechas y WASD para mover; barra espaciadora sin efecto en modo Pacman; ESC pausa | Se soportan ambos esquemas de teclas porque el menú de puntajes ya prevé "flechas o en su defecto a/d". El comportamiento nulo del espacio en modo Pacman se especifica explícitamente para que no quede como zona sin definir: si al probar hiciera algo, es un defecto |
| 7 | El comportamiento de los fantasmas controlados por IA no está descripto | Ciclo chase / scatter de 20 s y 7 s, con esquina asignada por fantasma | Una persecución puramente directa hace el juego injugable, porque cuatro fantasmas convergen sobre Pacman y lo encierran. El ciclo del original genera las ventanas de escape que hacen falta para que las esferas sean alcanzables |
| 8 | La V1 no incluye menú, pero sí puntaje y condiciones de victoria y derrota: no se indica dónde se muestra el resultado ni cómo se vuelve a jugar | Se agrega una pantalla de fin de partida (Game Over o Victoria) con el puntaje final desglosado y un botón para volver a jugar | Sin ella la V1 no sería utilizable: al perder o ganar el jugador quedaría sin salida y habría que recargar el navegador. Se especifica como HU-19 |
| 9 | El registro indica username, contraseña y confirmación, sin reglas de validación | Reglas en la sección 4.9 | Un formulario sin reglas de validación no admite casos de prueba de valores límite, que son los que concentran los defectos en este tipo de pantalla |
| 10 | El tablero global no define cuántas posiciones muestra | Top 10 por modo | Cantidad estándar y suficiente para verificar el ordenamiento y el corte de la lista |
| 11 | En modo GhostMan no se indica qué ocurre si Pacman consume todas las esferas antes de ser derrotado 3 veces | El jugador pierde la partida y se muestra Game Over | Es el objetivo declarado del modo, "evitar que Pacman complete el nivel": que Pacman lo complete es la condición de derrota |
| 12 | No se indica si el progreso del nivel se conserva al perder una vida | Se conservan las esferas consumidas y el puntaje; se reinician las posiciones de los personajes | Es el comportamiento del juego de referencia. La alternativa (reiniciar las esferas) volvería los niveles largos casi imposibles de completar con 3 vidas |
| 13 | No se indica el efecto de la fruta falsa cuando Pacman tiene el PowerUp activo | No lo afecta durante el PowerUp | Durante el PowerUp Pacman es inmune a los fantasmas; que un objeto colocado por un fantasma sí lo matara contradiría esa inmunidad |
| 14 | HU-12 habla de "las frutas que aparecen en el mapa" sin decir en qué niveles; la sección 4.4 solo las define para el nivel 3 | Las frutas aparecen **únicamente en el nivel 3** | Se sigue la especificación general de la pre-entrega, que presenta las frutas dinámicas como un rasgo del nivel 3. Detectado durante la generación (tabla 8.5, fila 7) |
| 15 | "10 puntos por cada segundo restante" no dice qué hacer con la fracción de segundo | Se cuentan los **segundos enteros** restantes, descartando la fracción | Da un único resultado esperado para cada tiempo medido, y es la lectura habitual de un "por segundo". Detectado durante la generación (tabla 8.5, fila 8) |
| 16 | Con una fruta cada 20 s y 15 s de vida, cada fruta desaparece antes de que aparezca la siguiente: nunca coexisten 2 y el máximo de 2 simultáneas no se puede observar | El intervalo entre frutas pasa de 20 s a **7 s**; la vida de 15 s y el máximo de 2 se mantienen | La vida de 15 s ya la verifican la HU-12 y el CP-041, y el intervalo no lo usa ningún caso. Con 7 s coexisten 2 frutas y el máximo actúa de verdad (a los 21 s se omite una aparición), así que admite un caso pass/fail. Con 10 s coexistirían 2, pero nunca se intentaría una tercera. Detectado durante la generación (tabla 8.5, fila 11) |

**Pendiente de definición:** no incorporamos túneles laterales de teletransporte (los pasajes que en el juego original conectan los bordes del mapa) porque la pre-entrega no los menciona. Queda como consulta al diseño de los tres mapas: si los mapas definidos los incluyen, hay que agregar la historia de usuario y sus casos de prueba, y revisar HU-02.

---

## 6. Organización del equipo

### 6.1 Roles

El equipo tiene 5 integrantes y las actividades de testing se reparten en tres roles. Los roles de diseño y ejecución **rotan por versión**: quien diseñó los casos de prueba de una versión no es quien los ejecuta en la siguiente. Esto responde a un problema concreto: el autor de un caso de prueba tiende a ejecutarlo tal como lo imaginó y a completar mentalmente los pasos ambiguos, con lo que pierde precisamente los defectos que la ambigüedad esconde.

| Rol | Responsabilidades | V1 | V2 | V3 |
|---|---|---|---|---|
| **Test Lead** | Estrategia de pruebas, análisis de riesgos, priorización, consolidación de reportes, criterios de entrada y salida, interlocución con la cátedra | Savoia | Savoia | Savoia |
| **Diseño de casos de prueba** | Derivación de casos desde las HU, aplicación de las técnicas de diseño, mantenimiento de la matriz de trazabilidad | Cruz, Luzzi | Rodriguez Castro, Tsai | Cruz, Luzzi |
| **Ejecución y reporte de defectos** | Ejecución de los casos, registro de resultados, redacción y clasificación de los defectos, evidencia | Rodriguez Castro, Tsai | Cruz, Luzzi | Rodriguez Castro, Tsai |

El Test Lead no rota porque la coherencia de la estrategia y de los criterios de clasificación de defectos a lo largo de las tres versiones depende de un criterio único; además participa en el diseño y en la ejecución cuando el volumen lo requiere.

### 6.2 Responsabilidad sobre la implementación con AI

La generación de la aplicación mediante *vibe-coding* es responsabilidad de todo el equipo, con una restricción que adoptamos deliberadamente: **el registro de prompts y de problemas de la sesión de generación lo lleva un integrante que no participa de la conducción del prompt**. Cuando quien escribe los prompts es también quien documenta la sesión, los problemas quedan registrados ya interpretados y resueltos, y se pierde el rastro de qué pidió el prompt y qué devolvió efectivamente el modelo, que es el dato que la Entrega 01 pide mostrar.

### 6.3 Herramientas de trabajo

| Herramienta | Uso |
|---|---|
| **Google Sheets** | Repositorio operativo de casos de prueba, registro de ejecución y planilla de defectos. Es la fuente de verdad durante la ejecución: permite edición simultánea de los cinco integrantes, filtros por estado y prioridad, y el cálculo automático de las métricas del reporte de ejecución |
| **GitHub** | Control de versiones del código de la aplicación y de este documento. Una rama por versión del producto |
| **Google Docs** | Redacción colaborativa de los documentos de entrega |
| **Vercel** | Despliegue de la aplicación, para que la ejecución de pruebas se haga sobre un entorno común y no sobre el equipo de cada integrante |

La planilla de Google Sheets se estructura en cuatro hojas: `Casos de prueba`, `Ejecución`, `Defectos` y `Métricas`. Este documento contiene la especificación consolidada; la planilla contiene el estado operativo día a día. Al cierre de cada entrega, el estado de la planilla se traslada a las secciones 12 y 13.

### 6.4 Reuniones y cadencia

| Instancia | Frecuencia | Propósito |
|---|---|---|
| Reunión de planificación de versión | Al inicio de cada versión | Alcance, riesgos, asignación de roles |
| Sincronización de avance | Semanal | Estado de ejecución, defectos bloqueantes, impedimentos |
| Revisión de cierre de versión | Al final de cada versión | Consolidación de reportes, criterio de salida, retrospectiva |

---

## 7. Especificación de requerimientos: historias de usuario

### 7.1 Convenciones

Las historias de usuario se expresan en formato **Como / Quiero / Para**, y cada una lleva:

- **ID:** identificador único `HU-nn`, estable a lo largo de las tres versiones. Se usa para la trazabilidad con los casos de prueba.
- **Épica:** agrupación funcional a la que pertenece.
- **Versión:** iteración en la que se implementa.
- **Prioridad:** Alta / Media / Baja, según el análisis de riesgos de la sección 9.4.
- **Criterios de aceptación:** condiciones verificables, cada una con resultado pass/fail inequívoco. Son la base de derivación de los casos de prueba.

Los actores que aparecen en las historias son:

| Actor | Descripción |
|---|---|
| **Jugador** | Persona que usa la aplicación, en cualquiera de los dos modos |
| **Jugador de Pacman** | Jugador que controla a Pacman (modo Pacman) |
| **Jugador de fantasma** | Jugador que controla a un fantasma (modo GhostMan) |
| **Usuario registrado** | Jugador con cuenta creada y sesión iniciada (V3) |
| **Visitante** | Persona sin cuenta o sin sesión iniciada (V3) |

### 7.2 Épicas

| Épica | Nombre | Versión | HU |
|---|---|---|---|
| E1 | Núcleo de juego y movimiento | V1 | HU-01 a HU-04 |
| E2 | PowerUp e interacción con fantasmas | V1 | HU-05 a HU-08 |
| E3 | Vidas, puntaje y fin de partida | V1 | HU-09 a HU-14 |
| E4 | Niveles y progresión de dificultad | V1 | HU-15 a HU-19 |
| E5 | Control de la partida | V1 | HU-20 a HU-21 |
| E6 | Modo GhostMan | V2 | HU-22 a HU-27 |
| E7 | Poderes de los fantasmas | V2 | HU-28 a HU-32 |
| E8 | Dificultad del modo GhostMan | V2 | HU-33 a HU-34 |
| E9 | Cuentas de usuario | V3 | HU-35 a HU-37 |
| E10 | Puntajes y estadísticas | V3 | HU-38 a HU-39 |
| E11 | Opciones y personalización | V3 | HU-40 a HU-42 |

---

### 7.3 Versión 1 — Modo Pacman

#### Épica E1 — Núcleo de juego y movimiento

---

**HU-01 · Mover a Pacman por el mapa**
*Épica: E1 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** desplazar a Pacman por los caminos del mapa con el teclado
> **para** poder recorrer el nivel y consumir las esferas.

**Criterios de aceptación:**
- Las flechas ← ↑ → ↓ mueven a Pacman en la dirección correspondiente.
- Las teclas A, W, D, S mueven a Pacman en la misma dirección que ← ↑ → ↓ respectivamente.
- Pacman se desplaza de manera continua en la última dirección indicada, sin necesidad de mantener la tecla presionada.
- Al indicar una nueva dirección, Pacman cambia de dirección en la primera celda en que ese giro es posible.
- Si la dirección indicada está bloqueada por un muro, Pacman conserva su dirección de avance previa.
- Pacman puede invertir su dirección de marcha en cualquier momento, incluso a mitad de un corredor.
- La velocidad de desplazamiento es constante durante todo el nivel.
- La animación de Pacman se orienta según su dirección de avance.

---

**HU-02 · Impedir el paso a través de los muros**
*Épica: E1 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** que los muros del mapa sean infranqueables
> **para** que el recorrido del laberinto sea un desafío real y coherente con lo que muestra la pantalla.

**Criterios de aceptación:**
- Pacman se detiene al alcanzar un muro y no lo atraviesa.
- Pacman no puede salir de los límites del mapa.
- Los fantasmas de tipo clásico no atraviesan muros en ninguna circunstancia.
- Ningún personaje queda encajado en un muro ni superpuesto a él tras una colisión.
- La zona transitable coincide visualmente con los caminos marcados con puntos blancos en el mapa.

---

**HU-03 · Consumir las esferas del mapa**
*Épica: E1 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** que Pacman consuma las esferas al pasar sobre ellas
> **para** avanzar hacia la finalización del nivel y sumar puntos.

**Criterios de aceptación:**
- Al pasar Pacman sobre una celda con esfera común, la esfera desaparece del mapa.
- Cada esfera común consumida suma 10 puntos al puntaje.
- Una esfera consumida no vuelve a aparecer durante el nivel, ni siquiera al perder una vida.
- Los fantasmas pueden pasar sobre las esferas sin consumirlas ni alterarlas.
- El contador de esferas restantes del nivel disminuye en 1 por cada esfera consumida.

---

**HU-04 · Completar el nivel al consumir todas las esferas**
*Épica: E1 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** que el nivel se complete cuando haya consumido todas las esferas
> **para** avanzar al nivel siguiente y progresar en la partida.

**Criterios de aceptación:**
- Al consumir la última esfera del mapa, el nivel se completa.
- Al completarse el nivel, la partida se detiene y se muestra el resultado del nivel con su puntaje.
- Las esferas grandes cuentan para la condición de finalización del nivel: el nivel no puede completarse si queda alguna sin consumir.
- Si el nivel completado es el 1 o el 2, se pasa al nivel siguiente conservando el puntaje acumulado y las vidas restantes.
- Si el nivel completado es el 3, la partida termina en victoria.

---

#### Épica E2 — PowerUp e interacción con fantasmas

---

**HU-05 · Obtener el PowerUp al consumir una esfera grande**
*Épica: E2 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** obtener un poder al consumir las esferas grandes del mapa
> **para** poder pasar a la ofensiva contra los fantasmas en lugar de solo escapar de ellos.

**Criterios de aceptación:**
- Al consumir una esfera grande, el PowerUp se activa de manera inmediata y automática, sin requerir ninguna tecla.
- La esfera grande suma 50 puntos.
- El PowerUp dura 8 segundos.
- Durante el PowerUp los fantasmas cambian su diseño de manera claramente distinguible del diseño normal.
- Durante el PowerUp los fantasmas dejan de perseguir a Pacman y se alejan de él.
- Consumir otra esfera grande con el PowerUp activo reinicia la duración a 8 segundos.
- Consumir otra esfera grande con el PowerUp activo reinicia la escala de puntos por fantasma comido a 200.

---

**HU-06 · Comer fantasmas durante el PowerUp**
*Épica: E2 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** poder comer a los fantasmas mientras el PowerUp está activo
> **para** sumar puntos y despejar el camino.

**Criterios de aceptación:**
- Con el PowerUp activo, el contacto con un fantasma lo elimina del mapa y Pacman no pierde ninguna vida.
- El primer fantasma comido en un mismo PowerUp suma 200 puntos; el segundo 400; el tercero 800; el cuarto 1600.
- La escala de puntos se reinicia a 200 al terminar el PowerUp.
- El fantasma comido vuelve a su punto de reaparición y reaparece a los 5 segundos con su comportamiento normal.
- Un fantasma que reaparece mientras el PowerUp sigue activo aparece en estado vulnerable y puede volver a ser comido, continuando la escala de puntos.

---

**HU-07 · Advertir el fin del PowerUp**
*Épica: E2 · Versión: V1 · Prioridad: Media*

> **Como** jugador de Pacman
> **quiero** percibir que el PowerUp está por terminar
> **para** poder alejarme de los fantasmas antes de volver a ser vulnerable.

**Criterios de aceptación:**
- Durante los últimos 2 segundos del PowerUp los fantasmas parpadean.
- El parpadeo es visualmente distinguible tanto del diseño vulnerable estable como del diseño normal.
- Al terminar los 8 segundos, los fantasmas recuperan su diseño normal y reanudan la persecución.
- Si Pacman consume una esfera grande durante el parpadeo, los fantasmas vuelven al diseño vulnerable estable y el parpadeo cesa.

---

**HU-08 · Perder una vida al ser alcanzado por un fantasma**
*Épica: E2 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** perder una vida cuando un fantasma me alcanza sin tener el PowerUp activo
> **para** que exista una consecuencia real por ser capturado.

**Criterios de aceptación:**
- Sin PowerUp activo, el contacto con un fantasma reduce el contador de vidas en 1.
- Tras perder una vida, Pacman y los fantasmas vuelven a sus posiciones iniciales del nivel.
- Tras perder una vida, las esferas ya consumidas permanecen consumidas.
- Tras perder una vida, el puntaje acumulado se conserva.
- El PowerUp activo se cancela al perder una vida.
- Si quedan vidas, el nivel se reanuda en el mismo nivel en curso.
- Un único contacto no puede descontar más de una vida.

---

#### Épica E3 — Vidas, puntaje y fin de partida

---

**HU-09 · Ver la cantidad de vidas restantes**
*Épica: E3 · Versión: V1 · Prioridad: Media*

> **Como** jugador
> **quiero** ver en pantalla cuántas vidas me quedan
> **para** saber cuánto margen de error tengo en la partida.

**Criterios de aceptación:**
- El contador de vidas se muestra en el extremo inferior izquierdo de la pantalla.
- Las vidas se representan con íconos, no con un número.
- En modo Pacman el ícono es el de Pacman.
- La partida comienza con 3 íconos de vida.
- Al perder una vida, se retira un ícono de la pantalla de manera inmediata.
- Con 0 vidas restantes no se muestra ningún ícono.

---

**HU-10 · Terminar la partida al agotar las vidas**
*Épica: E3 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** que la partida termine cuando pierda mis tres vidas
> **para** que la derrota tenga un cierre claro.

**Criterios de aceptación:**
- Al perder la tercera vida, la partida termina.
- Se muestra la pantalla de Game Over.
- El nivel no se reinicia ni se reanuda tras la tercera pérdida.
- El puntaje final acumulado se muestra en la pantalla de Game Over.
- La partida termina en el nivel en que se perdió la última vida, sin importar cuál sea.

---

**HU-11 · Ver el puntaje durante la partida**
*Épica: E3 · Versión: V1 · Prioridad: Media*

> **Como** jugador
> **quiero** ver mi puntaje actualizarse mientras juego
> **para** medir mi desempeño en el momento y no solo al final.

**Criterios de aceptación:**
- El puntaje actual se muestra permanentemente en el HUD durante la partida.
- El puntaje se actualiza de manera inmediata al consumir una esfera, una esfera grande, una fruta o un fantasma.
- El puntaje inicia en 0 al comenzar la partida.
- El puntaje nunca disminuye durante la partida.
- El puntaje se mantiene entre niveles: no se reinicia al pasar de nivel.

---

**HU-12 · Sumar puntos por las frutas**
*Épica: E3 · Versión: V1 · Prioridad: Media*

> **Como** jugador de Pacman
> **quiero** sumar puntos al consumir las frutas que aparecen en el mapa
> **para** tener un incentivo a desviarme de la ruta óptima de esferas y arriesgar.

**Criterios de aceptación:**
- Al pasar Pacman sobre una fruta, la fruta desaparece y suma 100 puntos.
- Las frutas no cuentan para la condición de finalización del nivel.
- Los fantasmas pueden pasar sobre una fruta sin consumirla.
- Una fruta no consumida desaparece del mapa a los 15 segundos de haber aparecido.

---

**HU-13 · Conocer el puntaje final desglosado**
*Épica: E3 · Versión: V1 · Prioridad: Media*

> **Como** jugador
> **quiero** ver cómo se compone mi puntaje al terminar la partida
> **para** entender qué me conviene mejorar en el próximo intento.

**Criterios de aceptación:**
- Al terminar la partida se muestra el puntaje total.
- El desglose discrimina puntos por esferas, por fantasmas comidos, por frutas, bonus por tiempo y bonus por vidas restantes.
- El bonus por tiempo es de 10 puntos por segundo restante respecto del tiempo objetivo del nivel (120 s, 150 s y 180 s para los niveles 1, 2 y 3).
- Si el jugador excede el tiempo objetivo de un nivel, el bonus por tiempo de ese nivel es 0 y nunca un valor negativo.
- El bonus por vidas restantes es de 500 puntos por vida y se aplica una sola vez al final de la partida.
- En una partida terminada en Game Over, el bonus por vidas restantes es 0.
- La suma de los componentes del desglose coincide exactamente con el total mostrado.

---

**HU-14 · Ver el progreso de esferas del nivel**
*Épica: E3 · Versión: V1 · Prioridad: Baja*

> **Como** jugador de Pacman
> **quiero** ver cuántas esferas me faltan para completar el nivel
> **para** saber cuánto me queda por recorrer.

**Criterios de aceptación:**
- El HUD muestra la cantidad de esferas restantes del nivel.
- El valor inicial coincide con el total de esferas del mapa del nivel, incluidas las esferas grandes.
- El valor disminuye en 1 por cada esfera consumida.
- El valor llega a 0 exactamente al completarse el nivel.
- El valor se reinicia al total del nivel siguiente al cambiar de nivel.

---

#### Épica E4 — Niveles y progresión de dificultad

---

**HU-15 · Jugar tres niveles con mapas propios**
*Épica: E4 · Versión: V1 · Prioridad: Alta*

> **Como** jugador
> **quiero** recorrer tres niveles con mapas y estéticas distintas
> **para** que la partida no sea repetitiva y perciba avance.

**Criterios de aceptación:**
- La partida consta de 3 niveles que se juegan en orden 1, 2, 3.
- Cada nivel tiene un mapa de forma propia y distinta de la de los otros dos.
- El mapa de cada nivel es siempre el mismo: no se genera de manera aleatoria ni varía entre partidas.
- El nivel 1 se presenta con fondo negro, franjas rojas y contorno celeste.
- El nivel 2 se presenta con paleta azul sobre fondo negro, sin franjas, con contorno azul.
- El nivel 3 se presenta con paleta verde brillante.
- Los caminos transitables están marcados con puntos blancos en los tres mapas.
- El número de nivel en curso se muestra en el HUD.

---

**HU-16 · Enfrentar solo fantasmas clásicos en el nivel 1**
*Épica: E4 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** que el primer nivel tenga únicamente fantasmas comunes
> **para** poder aprender las mecánicas básicas antes de enfrentar habilidades especiales.

**Criterios de aceptación:**
- En el nivel 1 los cuatro fantasmas son de tipo clásico.
- Ningún fantasma del nivel 1 atraviesa muros, se teletransporta, coloca frutas falsas ni ejecuta un dash.
- Los fantasmas del nivel 1 se desplazan todos a la misma velocidad.
- Un fantasma comido en el nivel 1 reaparece siempre como fantasma clásico.

---

**HU-17 · Enfrentar fantasmas con poderes a partir del nivel 2**
*Épica: E4 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** que a partir del segundo nivel los fantasmas puedan tener poderes
> **para** que la dificultad crezca y deba adaptar mi estrategia.

**Criterios de aceptación:**
- El nivel 2 inicia con los cuatro fantasmas de tipo clásico.
- En el nivel 2, un fantasma comido por Pacman tiene un 50 % de probabilidad de reaparecer como fantasma con poderes.
- En la V1 el único tipo con poderes disponible es el **espectro**: los fantasmas que reaparecen con poderes en el nivel 2 son espectros.
- Un fantasma que reaparece como espectro presenta un diseño distinguible del fantasma clásico.
- En el nivel 3 los cuatro fantasmas tienen poderes desde el inicio del nivel.
- Un fantasma espectro se desplaza un 30 % más lento que un fantasma clásico.

---

**HU-18 · Enfrentar al fantasma espectro**
*Épica: E4 · Versión: V1 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** que el fantasma espectro pueda atravesar paredes para alcanzarme
> **para** que no me alcance con memorizar rutas seguras del laberinto.

**Criterios de aceptación:**
- El fantasma espectro controlado por la IA puede atravesar una pared por uso de su habilidad.
- Entre dos usos de la habilidad transcurren al menos 10 segundos.
- El espectro no puede comer a Pacman durante los 3 segundos posteriores a atravesar un muro: el contacto en ese lapso no descuenta vidas.
- Durante esos 3 segundos el estado del espectro es visualmente distinguible.
- El espectro atraviesa una sola pared por activación, no una secuencia de paredes contiguas.
- El espectro no puede usar su habilidad para salir de los límites del mapa.
- Con el PowerUp de Pacman activo, el espectro puede ser comido igual que cualquier otro fantasma.

---

**HU-19 · Cerrar la partida y volver a jugar**
*Épica: E4 · Versión: V1 · Prioridad: Alta*

> **Como** jugador
> **quiero** ver el resultado de la partida y poder iniciar una nueva desde ahí mismo
> **para** no tener que recargar la página para volver a jugar.

**Criterios de aceptación:**
- Al perder las 3 vidas se muestra una pantalla de Game Over.
- Al completar el nivel 3 se muestra una pantalla de Victoria.
- Ambas pantallas muestran el puntaje final con su desglose.
- Ambas pantallas ofrecen la acción de volver a jugar.
- La acción de volver a jugar inicia una partida nueva desde el nivel 1, con 3 vidas y puntaje 0.
- La partida nueva restablece todas las esferas y frutas de los mapas.
- Ninguna de las dos pantallas deja al jugador sin acción posible.

---

#### Épica E5 — Control de la partida

---

**HU-20 · Pausar la partida**
*Épica: E5 · Versión: V1 · Prioridad: Media*

> **Como** jugador
> **quiero** poder pausar y reanudar la partida
> **para** poder interrumpirla sin perder vidas ni progreso.

**Criterios de aceptación:**
- La tecla ESC pausa la partida.
- Con la partida en pausa, Pacman y los fantasmas quedan inmóviles.
- Con la partida en pausa, los temporizadores del PowerUp, de los cooldowns y del bonus por tiempo se detienen.
- La pantalla indica de manera visible que la partida está en pausa.
- La tecla ESC con la partida en pausa la reanuda.
- Al reanudar, todos los estados y temporizadores continúan desde el valor en que se detuvieron.
- Las teclas de movimiento no tienen efecto mientras la partida está en pausa.

---

**HU-21 · Ignorar la barra espaciadora en modo Pacman**
*Épica: E5 · Versión: V1 · Prioridad: Baja*

> **Como** jugador de Pacman
> **quiero** que la barra espaciadora no produzca ningún efecto
> **para** no alterar la partida de manera involuntaria, dado que Pacman no tiene poderes activables.

**Criterios de aceptación:**
- La barra espaciadora durante una partida en modo Pacman no produce ningún efecto sobre el estado del juego.
- La barra espaciadora no pausa la partida, no activa el PowerUp ni modifica el puntaje.
- La barra espaciadora no provoca desplazamiento del scroll de la página ni ninguna acción por defecto del navegador.

---

### 7.4 Versión 2 — Modo GhostMan y fantasmas especiales

#### Épica E6 — Modo GhostMan

---

**HU-22 · Elegir el modo de juego**
*Épica: E6 · Versión: V2 · Prioridad: Alta*

> **Como** jugador
> **quiero** elegir entre jugar como Pacman o como fantasma antes de empezar
> **para** decidir qué experiencia de juego quiero en cada partida.

**Criterios de aceptación:**
- Al iniciar el juego se presenta un menú con las opciones Modo PacMan y Modo GhostMan.
- La opción Modo PacMan inicia la partida directamente, con el jugador controlando a Pacman.
- La opción Modo GhostMan lleva al carrusel de selección de fantasma.
- El modo elegido no puede cambiarse durante la partida.
- El modo en curso es identificable durante la partida por el ícono del contador de vidas.

---

**HU-23 · Seleccionar el fantasma con el que jugar**
*Épica: E6 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de fantasma
> **quiero** elegir el tipo de fantasma antes de comenzar la partida
> **para** jugar con el poder que mejor se adapte a mi estilo.

**Criterios de aceptación:**
- Se presenta un carrusel con los cinco tipos de fantasma.
- El fantasma actualmente seleccionado se muestra en el centro del carrusel.
- Debajo del fantasma se muestra el nombre de su tipo.
- Como subtítulo se muestra la descripción del poder de ese tipo.
- Las flechas ← → recorren el carrusel; las teclas A y D producen el mismo efecto.
- El carrusel es circular: avanzar desde el último elemento lleva al primero.
- La tecla Enter confirma la selección e inicia la partida.
- La elección no puede modificarse una vez iniciada la partida: solo cambia terminando la partida e iniciando una nueva.

---

**HU-24 · Controlar al fantasma por el mapa**
*Épica: E6 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de fantasma
> **quiero** desplazar a mi fantasma por el mapa con el teclado
> **para** poder perseguir a Pacman.

**Criterios de aceptación:**
- El fantasma del jugador responde a las flechas y a las teclas WASD igual que Pacman en modo Pacman.
- El fantasma del jugador respeta los muros, salvo cuando usa una habilidad que lo permita.
- Los demás fantasmas del mapa siguen siendo controlados por la IA.
- Pacman es controlado por la IA en este modo.
- La velocidad base del fantasma del jugador es la de su tipo, con las penalidades correspondientes de la sección 2.2.

---

**HU-25 · Derrotar a Pacman para completar el nivel**
*Épica: E6 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de fantasma
> **quiero** completar el nivel derrotando a Pacman tres veces
> **para** tener un objetivo claro de progreso en este modo.

**Criterios de aceptación:**
- Tocar a Pacman sin PowerUp activo le descuenta una vida y reinicia el nivel.
- El contador de derrotas de Pacman en el nivel se muestra en pantalla.
- Al alcanzar 3 derrotas de Pacman en un nivel, el nivel se completa.
- Al completar el nivel 3, la partida termina en victoria.
- Solo cuentan las derrotas producidas por el fantasma del jugador: las producidas por los fantasmas de la IA no incrementan el contador.

---

**HU-26 · Perder si Pacman completa el nivel**
*Épica: E6 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de fantasma
> **quiero** perder la partida si Pacman consume todas las esferas
> **para** que exista consecuencia por no cumplir mi objetivo.

**Criterios de aceptación:**
- Si Pacman consume la última esfera del nivel antes de ser derrotado 3 veces, la partida termina.
- Se muestra la pantalla de Game Over con el puntaje obtenido.
- La derrota se produce sin importar cuántas derrotas de Pacman acumulara el jugador en ese nivel.
- La pantalla de Game Over ofrece volver a jugar.

---

**HU-27 · Ser comido por Pacman con el PowerUp activo**
*Épica: E6 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de fantasma
> **quiero** ser vulnerable mientras Pacman tiene el PowerUp activo
> **para** que el enfrentamiento sea equilibrado en los dos sentidos.

**Criterios de aceptación:**
- Con el PowerUp de Pacman activo, el fantasma del jugador cambia su diseño al estado vulnerable y no puede derrotar a Pacman.
- Con el PowerUp activo, el contacto con Pacman envía al fantasma del jugador a su punto de reaparición.
- El jugador no controla al fantasma durante el tiempo de reaparición, y el tiempo restante se indica en pantalla.
- El tiempo de reaparición es de 5 segundos, u 8 segundos si el fantasma del jugador es de tipo naval.
- Ser comido no descuenta vidas al jugador de fantasma ni reinicia el nivel.
- El poder del fantasma no puede activarse mientras está esperando reaparecer.

---

#### Épica E7 — Poderes de los fantasmas

---

**HU-28 · Atravesar una pared con el Espectro**
*Épica: E7 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de fantasma
> **quiero** atravesar una pared con el Espectro
> **para** tomar atajos y sorprender a Pacman, compensando mi menor velocidad.

**Criterios de aceptación:**
- La barra espaciadora atraviesa la pared contigua en la dirección de avance.
- La habilidad tiene un cooldown de 10 segundos.
- Durante los 3 segundos posteriores a atravesar el muro el espectro no puede derrotar a Pacman.
- El estado de no poder derrotar a Pacman es visualmente distinguible.
- El espectro se desplaza un 30 % más lento que el fantasma clásico.
- La habilidad no puede usarse si al otro lado del muro no hay una celda transitable.
- La habilidad no puede usarse para salir de los límites del mapa.
- La habilidad no puede activarse durante el cooldown.

---

**HU-29 · Teletransportarse con el Saltarín**
*Épica: E7 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de fantasma
> **quiero** teletransportarme a un punto cercano con el Saltarín
> **para** acortar distancias con Pacman, aceptando el riesgo de no elegir el destino.

**Criterios de aceptación:**
- La barra espaciadora teletransporta al fantasma a una celda aleatoria dentro de un radio de 10 celdas.
- La celda de destino es siempre transitable: nunca un muro ni una posición fuera del mapa.
- El destino no es elegible ni predecible por el jugador.
- La habilidad tiene un cooldown de 10 segundos.
- El salto no atraviesa los límites del mapa.
- Si el salto ubica al fantasma sobre Pacman y Pacman no tiene el PowerUp activo, Pacman pierde una vida.
- El Saltarín no tiene penalidad de velocidad ni de reaparición.

---

**HU-30 · Colocar frutas falsas con el Naval**
*Épica: E7 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de fantasma
> **quiero** colocar frutas falsas con el Naval
> **para** derrotar a Pacman con trampas en lugar de con persecución directa.

**Criterios de aceptación:**
- La barra espaciadora coloca una fruta falsa en la celda que ocupa el fantasma.
- Si Pacman consume una fruta falsa sin PowerUp activo, pierde una vida y el nivel se reinicia.
- Si Pacman tiene el PowerUp activo, la fruta falsa no lo afecta.
- Si transcurren 10 segundos sin que Pacman interactúe con la fruta, la fruta explota.
- La explosión afecta un radio de 3 celdas y no atraviesa paredes.
- Si Pacman está dentro del radio de la explosión y no tiene el PowerUp activo, pierde una vida.
- Puede haber como máximo 2 frutas falsas simultáneas en el mapa.
- Entre dos colocaciones transcurren al menos 5 segundos.
- La fruta falsa es visualmente distinguible de una fruta real.
- El Naval se desplaza un 20 % más lento que el fantasma clásico y tarda 8 segundos en reaparecer.

---

**HU-31 · Hacer un dash con el Acelerado**
*Épica: E7 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de fantasma
> **quiero** impulsarme varias celdas hacia adelante con el Acelerado
> **para** cerrar la distancia con Pacman en el momento decisivo.

**Criterios de aceptación:**
- La barra espaciadora desplaza al fantasma hasta 3 celdas en su dirección de avance.
- Si el trayecto encuentra una pared, el dash se detiene en la última celda transitable.
- Tras el dash, la velocidad del fantasma se reduce un 50 % durante 5 segundos.
- La habilidad tiene un cooldown de 10 segundos.
- El dash no atraviesa paredes ni los límites del mapa.
- Si el dash termina sobre Pacman y Pacman no tiene el PowerUp activo, Pacman pierde una vida.
- Si el fantasma está detenido y sin dirección de avance, la habilidad no produce desplazamiento.

---

**HU-32 · Saber cuándo puedo usar mi poder**
*Épica: E7 · Versión: V2 · Prioridad: Media*

> **Como** jugador de fantasma
> **quiero** ver si mi poder está disponible
> **para** poder decidir cuándo usarlo sin ensayar la tecla.

**Criterios de aceptación:**
- Junto al contador de vidas, en el extremo inferior izquierdo, se muestra un ícono de estrella (⭐) cuando el poder está disponible.
- Durante el cooldown, el ícono se muestra en estado no disponible.
- El ícono vuelve al estado disponible exactamente al terminar el cooldown.
- El indicador refleja el poder del tipo de fantasma seleccionado.
- Si el jugador juega con el fantasma clásico, que no tiene poder, no se muestra indicador de estrella.
- Presionar la barra espaciadora durante el cooldown no produce ningún efecto sobre el estado del juego.

---

#### Épica E8 — Dificultad del modo GhostMan

---

**HU-33 · Enfrentar a un Pacman que destruye paredes en el nivel 2**
*Épica: E8 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de fantasma
> **quiero** que a partir del nivel 2 Pacman pueda abrirse paso destruyendo paredes
> **para** que la dificultad crezca y no pueda confiar en el trazado fijo del mapa.

**Criterios de aceptación:**
- En el nivel 2, Pacman obtiene el poder de destruir paredes al consumir una esfera grande.
- Pacman puede destruir hasta 5 paredes por obtención del poder.
- Una pared destruida queda transitable para todos los personajes por el resto del nivel.
- El nivel 1 no habilita este poder a Pacman.
- Las paredes destruidas se restablecen al reiniciarse el nivel por una derrota de Pacman.
- La destrucción de una pared es visualmente perceptible en el momento en que ocurre.

---

**HU-34 · Enfrentar más PowerUps en el nivel 3**
*Épica: E8 · Versión: V2 · Prioridad: Media*

> **Como** jugador de fantasma
> **quiero** que el nivel 3 tenga más esferas de PowerUp para Pacman
> **para** que sea el nivel más difícil del modo.

**Criterios de aceptación:**
- El mapa del nivel 3 contiene más esferas grandes que los mapas de los niveles 1 y 2.
- Durante el nivel 3 pueden aparecer nuevas esferas grandes en posiciones aleatorias del mapa.
- Las esferas grandes que aparecen durante la partida se ubican siempre en celdas transitables.
- Las esferas grandes aparecidas durante la partida cuentan para la condición de finalización del nivel de Pacman.

---

### 7.5 Versión 3 — Cuentas, puntajes y personalización

#### Épica E9 — Cuentas de usuario

---

**HU-35 · Registrarme en el juego**
*Épica: E9 · Versión: V3 · Prioridad: Alta*

> **Como** visitante
> **quiero** crear una cuenta con un nombre de usuario y una contraseña
> **para** que mis puntajes y mis preferencias queden guardados.

**Criterios de aceptación:**
- El formulario de registro solicita username, contraseña y confirmación de la contraseña.
- El username admite entre 3 y 16 caracteres alfanuméricos, sin espacios ni símbolos.
- El username debe ser único: si ya existe, el registro se rechaza y se informa el motivo.
- La contraseña requiere un mínimo de 8 caracteres, con al menos una letra y al menos un número.
- La confirmación debe coincidir exactamente con la contraseña.
- Los mensajes de error se muestran junto al campo que los origina.
- Ningún campo puede quedar vacío.
- La contraseña se muestra oculta en pantalla.
- Un registro exitoso inicia la sesión del usuario y lo lleva al menú principal.
- Una contraseña no válida no se almacena ni deja la cuenta en un estado parcialmente creado.

---

**HU-36 · Iniciar sesión**
*Épica: E9 · Versión: V3 · Prioridad: Alta*

> **Como** usuario registrado
> **quiero** iniciar sesión con mi username y contraseña
> **para** recuperar mis puntajes y mis preferencias.

**Criterios de aceptación:**
- El formulario de login solicita username y contraseña.
- Con credenciales válidas, se inicia sesión y se accede al menú principal.
- Con username inexistente o contraseña incorrecta, se rechaza el acceso y se informa el error sin precisar cuál de los dos datos falló.
- Los campos vacíos se rechazan con un mensaje por campo.
- El username no distingue entre mayúsculas y minúsculas al iniciar sesión; la contraseña sí las distingue.
- La sesión se mantiene activa al recargar la página.

---

**HU-37 · Navegar el menú principal**
*Épica: E9 · Versión: V3 · Prioridad: Media*

> **Como** usuario registrado
> **quiero** acceder desde un menú a jugar, a los puntajes y a las opciones
> **para** llegar a cada sección sin dar vueltas.

**Criterios de aceptación:**
- El menú principal presenta tres botones: Jugar, Puntajes y Opciones.
- Jugar lleva al menú de selección de modo de juego.
- Puntajes lleva a la sección de tableros.
- Opciones lleva a la sección de configuración.
- El menú es accesible únicamente con sesión iniciada.
- Cada sección permite volver al menú principal.

---

#### Épica E10 — Puntajes y estadísticas

---

**HU-38 · Consultar el tablero global de puntajes**
*Épica: E10 · Versión: V3 · Prioridad: Media*

> **Como** usuario registrado
> **quiero** ver los mejores puntajes de todos los jugadores
> **para** comparar mi desempeño con el del resto.

**Criterios de aceptación:**
- El tablero global muestra posición, nombre del jugador y puntaje.
- Se muestran las 10 mejores posiciones del modo seleccionado.
- Los puntajes se ordenan de mayor a menor.
- Las flechas ← → alternan entre el tablero del modo Pacman y el del modo GhostMan; las teclas A y D producen el mismo efecto.
- El modo cuyo tablero se está viendo está identificado en pantalla.
- Si un modo tiene menos de 10 puntajes registrados, se muestran solo los existentes sin filas vacías.
- Si un modo no tiene ningún puntaje registrado, se informa esa situación en lugar de mostrar un tablero vacío.

---

**HU-39 · Consultar mi mejor puntaje**
*Épica: E10 · Versión: V3 · Prioridad: Media*

> **Como** usuario registrado
> **quiero** ver mi mejor puntaje en cada modo
> **para** saber cuál es la marca que tengo que superar.

**Criterios de aceptación:**
- Debajo del tablero global se muestra el tablero personal del usuario.
- El tablero personal muestra el mejor puntaje del usuario en modo Pacman y en modo GhostMan.
- Al terminar una partida, si el puntaje supera el mejor puntaje personal en ese modo, el registro se actualiza.
- Un puntaje que no supera el mejor personal no modifica el registro.
- Si el usuario no jugó todavía un modo, el tablero personal lo indica en lugar de mostrar 0.
- Un puntaje que entra en el top 10 global aparece en el tablero global inmediatamente después de finalizar la partida.

---

#### Épica E11 — Opciones y personalización

---

**HU-40 · Cambiar el aspecto de Pacman y los fantasmas**
*Épica: E11 · Versión: V3 · Prioridad: Baja*

> **Como** usuario registrado
> **quiero** elegir la skin de Pacman y de los fantasmas
> **para** personalizar el aspecto de mis partidas.

**Criterios de aceptación:**
- La sección Opciones presenta un carrusel de skins para Pacman y otro para los fantasmas.
- Las flechas recorren el carrusel y Enter confirma la selección.
- La skin seleccionada se aplica en las partidas siguientes.
- La skin seleccionada se conserva al cerrar y volver a iniciar sesión.
- Cambiar la skin no altera ninguna mecánica de juego: velocidades, poderes, colisiones ni puntaje.
- La skin de los fantasmas conserva la distinción visual entre tipos de fantasma y el estado vulnerable durante el PowerUp.

---

**HU-41 · Ajustar el volumen**
*Épica: E11 · Versión: V3 · Prioridad: Baja*

> **Como** usuario registrado
> **quiero** regular por separado el volumen de la música y de los efectos de sonido
> **para** poder jugar sin molestar o sin perder las señales sonoras del juego.

**Criterios de aceptación:**
- La sección Opciones ofrece un control de volumen para la música y otro para los efectos de sonido.
- Cada control se puede subir y bajar de manera independiente.
- El volumen en 0 silencia por completo la categoría correspondiente.
- El cambio de volumen tiene efecto inmediato, sin necesidad de reiniciar la partida.
- Los valores de volumen se conservan al cerrar y volver a iniciar sesión.

---

**HU-42 · Cerrar sesión y salir del juego**
*Épica: E11 · Versión: V3 · Prioridad: Media*

> **Como** usuario registrado
> **quiero** cerrar mi sesión o salir del juego desde las opciones
> **para** dejar el equipo libre para otra persona.

**Criterios de aceptación:**
- La sección Opciones ofrece las acciones de cerrar sesión y de salir del juego.
- Cerrar sesión finaliza la sesión y lleva a la pantalla de login.
- Tras cerrar sesión, el menú principal y los tableros no son accesibles sin volver a iniciar sesión.
- Cerrar sesión conserva los puntajes y las preferencias del usuario para su próximo ingreso.
- Salir del juego lleva a una pantalla de salida y no deja una partida en curso activa en segundo plano.

---

### 7.6 Resumen de historias de usuario

| Versión | Épicas | Cantidad de HU | Prioridad Alta | Prioridad Media | Prioridad Baja |
|---|---|---|---|---|---|
| V1 | E1 a E5 | 21 | 13 | 6 | 2 |
| V2 | E6 a E8 | 13 | 11 | 2 | 0 |
| V3 | E9 a E11 | 8 | 2 | 4 | 2 |
| **Total** | **11** | **42** | **26** | **12** | **4** |

---

## 8. Implementación de la aplicación con AI

> **Estado de esta sección.** Contiene la estrategia de generación, los agentes utilizados y los prompts. La sesión de generación de la V1 está **completa** (incrementos 1 a 9): las subsecciones 8.5 y 8.6 registran lo que efectivamente devolvió el modelo, no lo que esperábamos que devolviera.

### 8.1 Estrategia de generación

El *vibe-coding* se organiza en **incrementos verificables** en lugar de un único prompt que pida la aplicación completa. Un prompt monolítico produce una base de código de varios cientos de líneas cuyo comportamiento no se puede atribuir a ninguna instrucción concreta: cuando algo falla no hay forma de saber si el requerimiento estaba mal expresado o si el modelo lo ignoró, y ese es justamente el dato que la entrega pide documentar.

Los incrementos de la V1 son:

| # | Incremento | HU cubiertas | Criterio de avance |
|---|---|---|---|
| 1 | Andamiaje del proyecto y bucle de juego con la grilla del nivel 1 | — | El mapa del nivel 1 se dibuja y el bucle corre a velocidad estable |
| 2 | Movimiento de Pacman y colisión con muros | HU-01, HU-02 | Pacman recorre el laberinto sin atravesar muros |
| 3 | Esferas, contador y finalización de nivel | HU-03, HU-04, HU-14 | El nivel se completa al consumir la última esfera |
| 4 | Fantasmas clásicos con IA chase/scatter | HU-16, HU-04 | Los fantasmas persiguen y se dispersan de manera observable |
| 5 | Vidas, colisión con fantasmas y Game Over | HU-08, HU-09, HU-10 | Se pierden vidas y la partida termina al agotarlas |
| 6 | PowerUp, fantasmas vulnerables y comer fantasmas | HU-05, HU-06, HU-07 | El ciclo completo del PowerUp funciona con su aviso de fin |
| 7 | Puntaje, frutas y desglose final | HU-11, HU-12, HU-13 | El puntaje coincide con la fórmula de la sección 4.2 |
| 8 | Tres niveles, mapas propios y progresión de dificultad | HU-15, HU-17, HU-18 | Los tres niveles se juegan en orden con su composición de fantasmas |
| 9 | Pausa y pantallas de fin de partida | HU-19, HU-20, HU-21 | La partida se pausa y se puede reiniciar desde la pantalla de cierre |

Cada incremento se cierra con un commit propio en GitHub. Esta granularidad tiene un efecto directo sobre el testing: permite que un defecto se pueda acotar al incremento que lo introdujo, y que se pueda revertir un incremento sin arrastrar los anteriores.

### 8.2 Agentes utilizados

| Agente / LLM | Interfaz | Uso previsto |
|---|---|---|
| Claude Sonnet 4.5 | VS Code con GitHub Copilot (agente integrado) | Generación de los incrementos de código |
| Claude Sonnet 4.5 | VS Code con GitHub Copilot (agente integrado) | Revisión de código generado, verificación de criterios de avance y consultas puntuales |
| Claude Opus 5.5 | Claude (modo Cowork, app de escritorio) con acceso a la carpeta del repositorio | Generación de los incrementos 6 a 9 (Prompts 5 a 8) y verificación de sus criterios de avance |

**Cambio de agente a partir del Incremento 6.** Los incrementos 1 a 5 se generaron con Claude Sonnet 4.5 desde VS Code con GitHub Copilot. Los incrementos 6 a 9 se generaron con Claude Opus 5.5 desde Claude (modo Cowork), que trabaja sobre la carpeta local del repositorio y puede ejecutar comandos (compilación, lint, scripts de verificación y un navegador sin interfaz para capturas). Lo registramos porque el cambio de modelo y de interfaz es una variable que afecta la comparación entre incrementos: en la segunda mitad el agente verificó sus propios criterios de avance con scripts antes de cerrar cada commit, y eso cambió el tipo de problema que quedó registrado en la tabla 8.5 (ver 8.6).

La cátedra sugiere Claude, Gemini, ChatGPT y Ollama, e IDEs con planes educativos (VS Code con GitHub Copilot mediante GitHub Education, PyCharm mediante el Student Pack, o Cursor). El equipo debe registrar aquí la combinación efectivamente usada, con la versión del modelo, porque el comportamiento entre versiones difiere y el registro pierde valor si no es reproducible.

**Decisión metodológica:** no corregimos el código a mano durante la generación. Los ajustes se piden al agente mediante nuevos prompts, y esos prompts quedan registrados. Si un problema se resuelve editando el archivo directamente, se anota como tal en la tabla 8.5, porque es información relevante: marca el punto donde el asistente no logró resolver el pedido.

### 8.3 Contexto entregado al agente

Antes del primer prompt de generación se le entrega al agente, como contexto fijo:

1. Las secciones **4** (reglas de negocio y parámetros) y **7.3** (historias de usuario de la V1) de este documento.
2. El stack definido en la sección 2.3.
3. La restricción de arquitectura derivada de la sección 3.1: la lógica de movimiento, colisiones y ciclo de vida de las entidades debe ser **agnóstica de qué entidad controla el jugador**, para que la V2 pueda introducir el modo GhostMan sin reescribir el núcleo.

Entregar la sección 4 completa es deliberado: los valores numéricos son los que el modelo inventaría por su cuenta si no se los damos, y cada valor inventado es un caso de prueba que falla por una discrepancia de especificación y no por un defecto real.

### 8.4 Prompts

#### Prompt 0 — Contexto y andamiaje

```
Vas a construir un juego web tipo Pac-Man llamado GhostMan, con Next.js y React.
El juego se renderiza en un <canvas> con un bucle propio sobre requestAnimationFrame;
los menús y las pantallas fuera de la partida son componentes React.

Restricción de arquitectura, es la más importante y no la puedo negociar:
la lógica de movimiento, de colisiones y del ciclo de vida de las entidades tiene
que ser agnóstica de qué entidad controla el jugador. En una versión posterior el
jugador va a controlar un fantasma en lugar de Pacman, y quiero que ese cambio no
implique reescribir el núcleo del juego. Separá el estado del juego de su
renderizado y de la lectura del teclado.

En este primer paso hacé solamente el andamiaje: estructura del proyecto, el
componente del canvas, el bucle de juego con delta time estable, y el dibujo de
una grilla de mapa cargada desde una estructura de datos que represente muros,
celdas transitables, esferas y esferas grandes. Todavía sin personajes.

No implementes nada que no te pida. Si algo de lo que pido es ambiguo,
preguntámelo antes de generar código.
```

#### Prompt 1 — Movimiento y colisiones (HU-01, HU-02)

```
Agregá a Pacman con este comportamiento exacto:

- Se mueve con las flechas y también con WASD.
- Avanza de forma continua en la última dirección indicada; no hace falta mantener
  la tecla apretada.
- Si indico una dirección que está bloqueada por un muro, Pacman mantiene la
  dirección que ya tenía; no se detiene.
- Cuando indico una nueva dirección válida, el giro ocurre en la primera celda en
  la que ese giro sea posible.
- Puede invertir la marcha en cualquier momento, incluso a mitad de un corredor.
- Velocidad constante durante todo el nivel.
- No atraviesa muros y no sale de los límites del mapa. Nunca queda encajado
  dentro de un muro ni superpuesto a uno después de una colisión.
- La animación se orienta según la dirección de avance.

La barra espaciadora no debe hacer nada, y tampoco debe disparar el
comportamiento por defecto del navegador.
```

#### Prompt 2 — Esferas y fin de nivel (HU-03, HU-04, HU-14)

```
Implementá el consumo de esferas:

- Pacman consume la esfera al pasar sobre la celda. La esfera desaparece.
- Esfera común: 10 puntos. Esfera grande: 50 puntos (el efecto del PowerUp lo
  vemos más adelante, por ahora solo los puntos).
- Una esfera consumida no reaparece durante el nivel bajo ninguna circunstancia.
- Los fantasmas van a pasar por encima de las esferas sin consumirlas ni alterarlas.
- Mostrá en el HUD la cantidad de esferas restantes del nivel. El total inicial
  incluye las esferas grandes.
- Al consumir la última esfera del mapa, el nivel se completa. Las esferas grandes
  cuentan para esa condición: si queda una sin consumir, el nivel no se completa.
```

#### Prompt 3 — Fantasmas con IA (HU-16)

```
Agregá cuatro fantasmas controlados por la IA, todos del tipo clásico, con este
comportamiento:

- Alternan entre dos estados en ciclo permanente: 20 segundos de persecución y
  7 segundos de dispersión.
- En persecución, en cada intersección eligen la dirección que reduce la distancia
  hacia Pacman.
- En dispersión, se dirigen a una esquina asignada del mapa, distinta para cada
  fantasma.
- No pueden invertir su dirección de marcha, salvo en el momento de cambiar de
  estado.
- No atraviesan muros ni salen del mapa.
- Los cuatro se mueven a la misma velocidad.

No agregues ningún poder ni habilidad especial: en este nivel todos los fantasmas
son clásicos.
```

#### Prompt 4 — Vidas y fin de partida (HU-08, HU-09, HU-10)

```
Implementá vidas y derrota:

- La partida empieza con 3 vidas.
- El contador de vidas va en el extremo inferior izquierdo y se representa con
  íconos de Pacman, no con un número.
- El contacto con un fantasma descuenta una vida. Un mismo contacto no puede
  descontar más de una vida: cuidá el caso del contacto detectado en varios
  frames consecutivos.
- Al perder una vida: Pacman y los fantasmas vuelven a sus posiciones iniciales,
  las esferas ya consumidas siguen consumidas, y el puntaje acumulado se conserva.
- Al perder la tercera vida la partida termina y se muestra una pantalla de Game
  Over con el puntaje final. El nivel no se reinicia ni se reanuda.
```

#### Prompt 5 — PowerUp (HU-05, HU-06, HU-07)

```
Implementá el PowerUp con estos valores exactos:

- Se activa solo y de inmediato al consumir una esfera grande. No requiere ninguna
  tecla.
- Dura 8 segundos.
- Durante el PowerUp los fantasmas cambian a un diseño vulnerable claramente
  distinto del normal, dejan de perseguir a Pacman y se alejan de él.
- Durante los últimos 2 segundos los fantasmas parpadean. El parpadeo tiene que
  distinguirse tanto del diseño vulnerable estable como del diseño normal.
- Con el PowerUp activo, tocar un fantasma lo elimina del mapa y Pacman no pierde
  ninguna vida.
- Puntos por fantasma comido en un mismo PowerUp: 200, 400, 800, 1600. La escala
  se reinicia a 200 cuando el PowerUp termina.
- Consumir otra esfera grande con el PowerUp activo reinicia el temporizador a 8
  segundos Y TAMBIÉN reinicia la escala de puntos a 200. Si esto pasa durante el
  parpadeo, los fantasmas vuelven al diseño vulnerable estable y el parpadeo se
  corta.
- El fantasma comido vuelve a su punto de reaparición y reaparece a los 5
  segundos. Si el PowerUp sigue activo cuando reaparece, reaparece vulnerable y
  puede volver a ser comido, continuando la escala de puntos.
- Perder una vida cancela el PowerUp activo.
```

#### Prompt 6 — Puntaje y frutas (HU-11, HU-12, HU-13)

```
Implementá el puntaje completo:

- El puntaje se muestra siempre en el HUD, empieza en 0, se actualiza al instante
  y nunca disminuye. Se mantiene entre niveles.
- Fruta: 100 puntos. Las frutas no cuentan para completar el nivel. Los fantasmas
  pasan sobre ellas sin consumirlas. Una fruta no consumida desaparece a los 15
  segundos de aparecer.
- Bonus por tiempo: 10 puntos por cada segundo restante respecto del tiempo
  objetivo del nivel. Tiempos objetivo: nivel 1 = 120 s, nivel 2 = 150 s,
  nivel 3 = 180 s. Si me paso del tiempo objetivo el bonus es 0, nunca negativo.
- Bonus por vidas restantes: 500 por vida, una sola vez al terminar la partida.
  En un Game Over este bonus es 0.
- Al terminar la partida mostrá el puntaje total y el desglose: esferas, fantasmas
  comidos, frutas, bonus por tiempo y bonus por vidas. La suma del desglose tiene
  que dar exactamente el total.
```

#### Prompt 7 — Niveles y progresión (HU-15, HU-17, HU-18)

> **Nota de trazabilidad.** El título de este prompt omite la HU-16: el prompt también la implementa (el fantasma comido en el nivel 1 reaparece siempre como clásico). La referencia correcta es la tabla 8.1. El intervalo de 20 s entre frutas que figura abajo es el texto que se ejecutó; después se cambió a 7 s (decisión 16 de la sección 5, prompt de corrección C-1 del Anexo A).

```
Implementá los tres niveles:

- Tres mapas distintos, de forma fija, siempre iguales, nunca aleatorios. Se
  juegan en orden 1, 2, 3. El número de nivel va en el HUD.
- Paleta de cada mapa: nivel 1 fondo negro con franjas rojas y contorno celeste;
  nivel 2 azul sobre negro, sin franjas, contorno azul; nivel 3 verde brillante.
  En los tres, los caminos transitables están marcados con puntos blancos.
- Al completar un nivel se pasa al siguiente conservando puntaje y vidas.
  Al completar el nivel 3, victoria.
- Composición de fantasmas: en el nivel 1 los cuatro son clásicos y un fantasma
  comido reaparece siempre como clásico. En el nivel 2 arrancan los cuatro como
  clásicos, y cada fantasma comido tiene un 50 % de probabilidad de reaparecer
  como espectro. En el nivel 3 los cuatro son espectros desde el inicio.
- En el nivel 3 aparece una fruta cada 20 segundos en una celda transitable
  aleatoria que no esté ocupada por un personaje, con un máximo de 2 frutas
  simultáneas en el mapa.

Fantasma espectro: se mueve 30 % más lento que el clásico, tiene un diseño
distinguible del clásico, y puede atravesar UNA pared por activación, no una
secuencia de paredes contiguas. Entre dos usos pasan al menos 10 segundos. No
puede usar la habilidad si al otro lado del muro no hay celda transitable, ni para
salir del mapa. Durante los 3 segundos posteriores a atravesar un muro no puede
comer a Pacman, y ese estado tiene que ser visualmente distinguible. Con el
PowerUp activo, el espectro se puede comer como cualquier otro fantasma.
```

#### Prompt 8 — Pausa y cierre de partida (HU-19, HU-20)

> **Nota de trazabilidad.** Según la sección 7.3 y la tabla 8.1, este prompt cubre la HU-19 (pantallas de cierre), la HU-20 (pausa) y la HU-21 (barra espaciadora sin efecto), aunque el título solo nombra las dos primeras. La HU-21 ya estaba resuelta desde el Prompt 1. La referencia correcta es la tabla 8.1; el título se conserva tal como se ejecutó.

```
Últimos dos comportamientos de esta versión:

Pausa con ESC:
- Pacman y los fantasmas quedan inmóviles.
- Se detienen todos los temporizadores: PowerUp, cooldowns, bonus por tiempo,
  aparición de frutas.
- La pantalla indica de forma visible que está en pausa.
- ESC de nuevo reanuda, y todo continúa desde el valor exacto en que se detuvo.
- Las teclas de movimiento no hacen nada mientras está en pausa.

Pantallas de cierre:
- Game Over al perder las 3 vidas, Victoria al completar el nivel 3.
- Las dos muestran el puntaje final con su desglose y ofrecen volver a jugar.
- Volver a jugar arranca una partida nueva desde el nivel 1, con 3 vidas, puntaje
  0 y todas las esferas y frutas restablecidas en los tres mapas.
- Ninguna de las dos pantallas puede dejar al jugador sin ninguna acción posible.
```

### 8.5 Registro de problemas de la sesión de generación

*A completar durante la sesión de vibe-coding. Un renglón por problema, en el orden en que ocurrieron.*

| # | Incremento | Prompt | Problema observado | Cómo se resolvió | ¿Requirió edición manual? |
|---|---|---|---|---|---|
| 1 | 1 — Andamiaje | Prompt 0 | `create-next-app` rechazó el nombre del paquete por tener mayúsculas ("Ghostman") | Se generó el scaffold en un directorio temporal con un nombre válido en minúsculas y se copió el contenido a la raíz del repositorio, renombrando el campo `name` en `package.json` | Sí (paso de infraestructura, no de lógica de negocio) |
| 2 | 1 — Andamiaje | Prompt 0 | El scaffold de `create-next-app` sobrescribió el `README.md` propio del repositorio con el README genérico de Next.js | Se restauró el contenido original del README y se agregaron enlaces a la especificación y al workflow | Sí |
| 3 | 2 — Movimiento y colisiones | Prompt 1 | Al probar el movimiento en el navegador, el teclado no llegaba de forma consistente al juego: el overlay de desarrollo de Next.js ("devIndicators") interceptaba las teclas de flecha de manera intermitente | Se deshabilitó `devIndicators` en `next.config.ts`. No es un defecto de la lógica de movimiento: se verificó aislando el algoritmo fuera del navegador antes de aplicar el cambio | Sí (configuración de la herramienta, no de la lógica de juego) |
| 4 | 4 — IA de fantasmas | Prompt 3 | El mapa placeholder del Incremento 1 era un único corredor serpenteante sin bifurcaciones: los fantasmas no tenían ninguna intersección real donde elegir dirección, por lo que la persecución/dispersión no habría sido observable | Se rediseñó `createLevel1Map` con un patrón de "panal" (pilares de muro en filas y columnas pares), que genera intersecciones de 4 direcciones en todo el mapa | Sí |
| 5 | 6 — PowerUp | Prompt 5 | El commit del Incremento 5 (`30478b8`) ya traía una versión parcial del PowerUp que se apartaba del Prompt 5 en cuatro puntos: el fantasma comido volvía **al instante** a su esquina en lugar de salir del mapa 5 s; el diseño vulnerable dependía del PowerUp global, así que un fantasma recién reaparecido no podía distinguirse; los fantasmas **invertían la marcha al terminar** el PowerUp (la sección 4.7 solo admite la reversa al iniciarlo); y el parpadeo se calculaba con el reloj del sistema, por lo que seguiría parpadeando con el juego detenido | Al ejecutar el Prompt 5 el agente reescribió el PowerUp: estado vulnerable y "comido" por fantasma, temporizador de reaparición de 5 s, sin reversa al terminar, y parpadeo derivado del temporizador del PowerUp | No |
| 6 | 6 — PowerUp | Prompt 5 | La colisión Pacman–fantasma (Incremento 5) comparaba solo la celda de partida de cada personaje. Un script de verificación del agente mostró que si Pacman y un fantasma se cruzan de frente en un corredor pueden intercambiar celdas sin que se detecte el contacto: ni se pierde la vida ni se come al fantasma | Se reemplazó por la distancia entre las posiciones interpoladas (contacto a menos de media celda). El caso "cruce de frente" quedó en el script de verificación | No |
| 7 | 7 — Puntaje y frutas | Prompt 6 | El Prompt 6 pide frutas de 100 puntos con vida de 15 s, pero ni el prompt ni la HU-12 dicen cuándo aparecen en los niveles 1 y 2. El agente implementó la fruta como entidad (puntaje, vida de 15 s, no la consumen los fantasmas) y dejó su aparición para el Prompt 7, que solo la define para el nivel 3. En consecuencia **en los niveles 1 y 2 no aparecen frutas** | El equipo confirmó que las frutas aparecen únicamente en el nivel 3 (decisión 14 de la sección 5, texto aclarado en la sección 4.4). No requirió cambios de código | No |
| 8 | 7 — Puntaje y frutas | Prompt 6 | "10 puntos por cada segundo restante" admite dos lecturas con segundos fraccionarios (proporcional o por segundo entero). El agente eligió **segundos enteros** (se descarta la fracción): con 100,5 s en el nivel 1 quedan 19 s y el bonus es 190 | El equipo adoptó los segundos enteros (decisión 15 de la sección 5). Se actualizaron la sección 4.2 y el resultado esperado del CP-042. No requirió cambios de código | No |
| 9 | 8 — Niveles y espectro | Prompt 7 | El script de verificación del agente midió dos usos de la habilidad del espectro separados por 2,3 s: al perder una vida se reiniciaban las posiciones **y también el cooldown** de 10 s | Se corrigió para que perder una vida o reaparecer no reinicie el cooldown | No |
| 10 | 8 — Niveles y espectro | Prompt 7 | El espectro podía quitarle una vida a Pacman **mientras todavía estaba cruzando el muro**, antes de que empezaran a correr los 3 s sin poder comer: el contacto ocurría durante la última media celda del cruce | Se consideró "cruzando el muro" como parte del estado en que no puede comer, y se dibuja igual (translúcido con contorno punteado) | No |
| 11 | 8 — Niveles y espectro | Prompt 7 | Con los parámetros pedidos (una fruta cada 20 s, desaparece a los 15 s) **nunca pueden coexistir 2 frutas**: cada una desaparece 5 s antes de que aparezca la siguiente. El límite de 2 simultáneas está implementado, pero en juego normal no se alcanza | El equipo decidió bajar el intervalo a 7 s (decisión 16 de la sección 5). Se corrigió con el prompt C-1 del Anexo A (fila 14) | No |
| 12 | 9 — Pausa y cierre | Prompt 8 | Al agregar el número de nivel al HUD (Prompt 7) la barra superior dejó de entrar en su ancho: en la captura del navegador el texto se partía en dos líneas y el temporizador del PowerUp quedaba fuera del recuadro | Se compactó el HUD (tamaño de fuente y separaciones) y se verificó de nuevo con captura | No |
| 13 | 9 — Pausa y cierre | Prompt 8 | La compilación de producción (`next build`) falla en entornos sin acceso a `fonts.googleapis.com`, porque el `layout.tsx` generado en el Incremento 1 descarga las fuentes Geist con `next/font/google`. No afecta el despliegue en Vercel, que tiene acceso a Internet | Sin cambios en el código. Para compilar localmente sin red hay que tener acceso a Google Fonts o pasar a `next/font/local` | No |
| 14 | 8 — Niveles y espectro | C-1 (corrección) | Corrección pedida por el equipo para resolver la fila 11: pasar el intervalo entre frutas del nivel 3 de 20 s a 7 s | El agente cambió el parámetro del nivel 3 y verificó con su script la secuencia 7 s → 1 fruta, 14 s → 2, 21 s → sigue en 2 (se omite la tercera), 22 s → 1, 28 s → 2; en 120 s nunca hubo más de 2 frutas, y en los niveles 1 y 2 no aparece ninguna | No |

**Qué registrar en cada columna:**
- **Problema observado:** qué devolvió el agente y en qué se apartó de lo pedido. Con la mayor literalidad posible: "generó el movimiento con la tecla mantenida en lugar de avance continuo", no "problemas con el movimiento".
- **Cómo se resolvió:** el prompt de corrección, transcripto o referenciado al anexo.
- **¿Requirió edición manual?:** Sí / No. Los "Sí" son los puntos donde el asistente no logró resolver el pedido y son el material más interesante para la conclusión de la entrega.

### 8.6 Observaciones sobre la implementación con AI

**Cantidad de prompts.** Se usaron los 9 prompts planificados (Prompt 0 a Prompt 8), uno por incremento, y cada incremento cerró con su commit (`36a065a`, `14aa9a3`, `cb02fe1`, `8eaff47`, `30478b8`, `f1269aa`, `11eafa1`, `246cb2a`, `7429ec3`). Hubo **un único prompt de corrección** del equipo (C-1, Anexo A). No corrigió un error del agente sino un problema de nuestra especificación: el intervalo entre frutas (fila 14). En los incrementos 6 a 9 las correcciones de las filas 6, 9, 10 y 12 de la tabla 8.5 las hizo el propio agente dentro del mismo prompt, después de ejecutar sus scripts de verificación o una captura en el navegador. Las registramos igual, porque muestran que la primera versión que generó el agente tenía el problema.

**Qué salió bien en el primer intento.** Los criterios con **valores numéricos explícitos** se implementaron bien a la primera en todos los incrementos: duración del PowerUp (8 s), aviso de 2 s, escala 200/400/800/1600, reaparición a los 5 s, 100 puntos por fruta y 15 s de vida, tiempos objetivo de 120/150/180 s, 500 por vida, velocidad del espectro al 70 %, cooldown de 10 s, 3 s sin comer, fruta cada 20 s. Esto confirma la primera parte de nuestra hipótesis.

**Dónde falló el agente.** Todos los problemas de lógica de los incrementos 6 a 9 (filas 5, 6, 9 y 10) son **interacciones entre estados**, no valores: qué pasa con el cooldown cuando se pierde una vida, cuándo empieza el lapso sin comer respecto del cruce del muro, qué diseño tiene un fantasma que reaparece con el PowerUp activo, qué ocurre cuando dos personajes intercambian de celda en el mismo paso. Confirma la segunda parte de la hipótesis, con un matiz: los problemas no aparecieron en las interacciones que el prompt mencionaba explícitamente (esfera grande durante el parpadeo, PowerUp al perder una vida, fantasma que reaparece vulnerable). Esas salieron bien. Fallaron las interacciones que **nadie escribió**: ningún prompt dice "el cooldown sobrevive a la pérdida de una vida". El agente acierta en lo que se le pide de manera explícita y en lo implícito rellena con lo más simple (reiniciar todo, comparar celdas enteras).

**Problemas de especificación descubiertos al generar.** Tres filas de la tabla 8.5 no son defectos del código sino huecos o inconsistencias de nuestros requerimientos. Los resolvimos en equipo antes de ejecutar los casos de prueba y quedaron en la sección 5 como decisiones 14 a 16:
- Fila 7: las frutas aparecen únicamente en el nivel 3 (decisión 14).
- Fila 8: el bonus por tiempo se calcula con segundos enteros (decisión 15). Se actualizó el resultado esperado del CP-042.
- Fila 11: el intervalo entre frutas pasa a 7 s para que puedan coexistir 2 y el máximo sea observable (decisión 16, prompt C-1).

La fila 11 es la más interesante para la conclusión de la entrega. Cada parámetro, leído por separado, era correcto y verificable. La contradicción solo aparecía al combinarlos en el tiempo, y ni la revisión de los requerimientos ni el diseño de los casos de prueba la detectaron: la detectó el agente al generar la secuencia real de apariciones.

**Diferencia de numeración entre la sección 8.4 y la 7.3.** El título del Prompt 7 omite la HU-16, que el prompt sí implementa. El título del Prompt 8 dice "HU-19, HU-20", pero cubre la HU-19 (pantallas de cierre), la HU-20 (pausa) y la HU-21 (barra espaciadora). Tomamos como referencia la **tabla 8.1**, que coincide con la 7.3 y con la matriz de trazabilidad. Los títulos de los prompts se conservan tal como se ejecutaron, con una nota de trazabilidad en cada uno.

**Funcionalidad agregada sin pedirla.** Pantalla de resultado de nivel durante 3 s antes de pasar al siguiente (la HU-04 pide mostrar el resultado pero no dice cuánto tiempo), fuegos artificiales al completar un nivel (vienen del Incremento 3) y foco automático en el botón "Volver a jugar" para que Enter lo active (coherente con la sección 4.6). Se conservaron las tres porque no contradicen ningún criterio de aceptación. Las tres son comportamiento no especificado: si la ejecución encuentra un problema en ellas, se clasifica como defecto de funcionalidad no especificada.

**Desvíos que quedan en el código y que la ejecución de pruebas debería detectar.** Vienen del Incremento 5. Por decisión del equipo **no se corrigen durante la generación**: pertenecen a un incremento ya cerrado y se dejan para que los detecten los casos de prueba (por ejemplo, los de la HU-09) y se reporten como defectos por el circuito normal de la sección 13. Los anotamos para que no aparezcan luego como hallazgos inesperados:
- HU-09: el contador de vidas está en la barra superior, no en el extremo inferior izquierdo, y usa un círculo amarillo genérico, no el ícono de Pacman.
- Al perder una vida, Pacman y los fantasmas vuelven a su posición inicial sin pausa ni aviso previo. No viola ningún criterio, pero es poco visible para quien ejecuta los casos.

**Precisión del prompt y defectos posteriores.** Esta relación se completa al cerrar la ejecución del ciclo 1 (sección 12), cruzando los defectos detectados con el incremento y el prompt que los introdujo. Como punto de partida, los prompts más largos y con más interacciones enumeradas (5 y 7) fueron los que menos problemas de lógica dejaron sin resolver dentro del propio incremento.

---

## 9. Estrategia de pruebas

### 9.1 Alcance y enfoque

Las pruebas de esta entrega son **manuales, de caja negra**, ejecutadas sobre la aplicación desplegada. El enfoque se justifica en tres puntos:

1. El código de la aplicación es generado por un asistente de AI y su estructura interna no fue diseñada por el equipo. Diseñar pruebas a partir de esa estructura implicaría probar contra decisiones que no controlamos y que pueden cambiar en el siguiente prompt de corrección.
2. Los requerimientos están expresados como comportamiento observable, y las pruebas de caja negra los verifican directamente.
3. La especificación de los criterios de aceptación es lo bastante precisa (sección 4) como para que la mayoría de los casos tenga un resultado esperado inequívoco sin necesidad de inspeccionar el estado interno.

**Fuera de alcance en esta entrega:** pruebas de rendimiento, de seguridad, de compatibilidad entre navegadores más allá del navegador de referencia, de accesibilidad, y automatización de pruebas. La automatización se considera para la Entrega 02 sobre las pruebas de regresión de la V1, que son las que se repetirán en cada versión y donde el costo de la ejecución manual se acumula.

**No es posible probar todo.** El conjunto de estados de un juego con cuatro fantasmas con IA, temporizadores concurrentes y un mapa de cientos de celdas es inabarcable. La selección de qué probar se hace mediante el análisis de riesgos de la sección 9.4 y la priorización de la 9.5.

### 9.2 Niveles y tipos de prueba

| Tipo de prueba | Aplicación en este proyecto |
|---|---|
| **Funcional** | Verificación de los criterios de aceptación de cada HU. Es el grueso de los casos |
| **De integración entre funcionalidades** | Interacciones entre mecánicas: PowerUp más pérdida de vida, esfera grande durante el parpadeo, fantasma comido que reaparece con el PowerUp aún activo |
| **De interfaz de usuario** | HUD, contadores, indicadores de estado, pantallas de cierre |
| **De regresión** | Reejecución del conjunto de casos de prioridad Alta de las versiones anteriores al cerrar cada versión nueva |
| **Exploratoria** | Sesiones libres con tiempo acotado, orientadas a los estados que los casos diseñados no cubren. Se registra con notas y, si aparece un defecto, se documenta el camino para reproducirlo |

### 9.3 Técnicas de diseño de casos de prueba

| Técnica | Aplicación |
|---|---|
| **Partición de equivalencia** | Estados del PowerUp (inactivo / activo / parpadeando); tipos de fantasma; niveles; longitudes de username válidas e inválidas |
| **Análisis de valores límite** | Última esfera del nivel; tercera vida; segundo 8 del PowerUp; segundo 2 del parpadeo; username de 2, 3, 16 y 17 caracteres; contraseña de 7 y 8 caracteres; quinta pared destruida; tercera fruta falsa simultánea |
| **Tabla de decisión** | Resultado de la colisión Pacman-fantasma según el estado del PowerUp, el tipo de fantasma y el estado de gracia del espectro |
| **Transición de estados** | Ciclo de vida del PowerUp; ciclo chase/scatter de la IA; estados de la partida (en curso / pausada / nivel completado / Game Over / Victoria); ciclo de vida de la fruta falsa |
| **Adivinación de errores** | Basada en los puntos donde la experiencia indica concentración de defectos: dobles descuentos de vida por colisiones detectadas en frames sucesivos, temporizadores que siguen corriendo en pausa, valores que no se reinician entre partidas |

### 9.4 Análisis de riesgos

El riesgo se estima como la combinación de la **probabilidad** de que la funcionalidad contenga defectos y del **impacto** de esos defectos sobre la usabilidad del juego. La probabilidad se estima alta en las funcionalidades donde interactúan varios estados o temporizadores, que son las que la sección 8.6 identifica como más propensas a ser mal implementadas por un asistente de AI.

| Área | Probabilidad | Impacto | Riesgo | Fundamento |
|---|---|---|---|---|
| PowerUp e interacciones con fantasmas | Alta | Alto | **Crítico** | Concentra temporizadores, estados de las entidades y la escala de puntos. Es el punto de mayor interacción entre mecánicas de todo el juego |
| Colisión Pacman-fantasma y descuento de vidas | Alta | Alto | **Crítico** | La detección de colisión por frame es la fuente clásica de descuentos múltiples de una misma colisión. Un defecto acá vuelve el juego injugable |
| Finalización de nivel y progresión | Media | Alto | **Alto** | Si el nivel no se completa, el resto del juego es inalcanzable y ningún caso posterior se puede ejecutar |
| Movimiento y colisión con muros | Media | Alto | **Alto** | Es la base de todo lo demás; un personaje encajado en un muro bloquea la partida |
| Cálculo del puntaje | Alta | Medio | **Alto** | Muchas reglas acumulativas y bonus condicionales. Un error de cálculo no impide jugar, pero invalida los tableros de la V3 |
| Habilidad del espectro | Alta | Medio | **Alto** | Atravesar paredes es una excepción a la regla general de colisión, y las excepciones a reglas generales son donde el código generado tiende a fallar |
| Progresión de dificultad entre niveles | Media | Medio | **Medio** | La composición de fantasmas por nivel y la probabilidad del 50 % del nivel 2 son reglas fáciles de implementar de manera aproximada |
| Pausa | Media | Medio | **Medio** | Los temporizadores que no se detienen en pausa son un defecto frecuente y difícil de notar sin buscarlo |
| HUD y contadores | Baja | Medio | **Medio** | Lógica simple, pero es la única vía por la que el jugador conoce el estado de la partida |
| Frutas del nivel 3 | Media | Bajo | **Bajo** | Aparición aleatoria acotada, con impacto limitado sobre el desarrollo de la partida |
| Pantallas de cierre | Baja | Medio | **Bajo** | Pocas reglas, pero su ausencia dejaría al jugador sin salida |

**Consideración sobre el agrupamiento de defectos (*defect clustering*).** Si durante la ejecución se concentran defectos en un área, se amplía la cobertura de casos sobre esa área en lugar de mantener el reparto planificado. El reparto inicial de casos por área refleja el riesgo estimado *antes* de ejecutar; la evidencia de la ejecución lo corrige.

**Consideración sobre la paradoja del pesticida.** Los casos de prioridad Alta se reejecutan como regresión en cada versión. Reejecutarlos idénticos los vuelve progresivamente menos capaces de encontrar defectos nuevos. Al cierre de cada versión se revisan los casos de regresión y se los muta: se varían los datos de entrada, el orden de los pasos y las condiciones iniciales, conservando el criterio de aceptación que verifican.

### 9.5 Priorización de la ejecución

| Prioridad | Criterio | Momento de ejecución |
|---|---|---|
| **Alta** | Casos que verifican mecánicas sin las cuales el juego no es jugable, o que bloquean la ejecución de otros casos | Primer ciclo de ejecución, todos |
| **Media** | Casos que verifican funcionalidad relevante cuyo fallo degrada la experiencia sin impedir el juego | Segundo ciclo, tras resolver los bloqueantes de prioridad Alta |
| **Baja** | Casos de detalle, presentación y comportamientos de borde de bajo impacto | Tercer ciclo, si el tiempo lo permite. Su no ejecución se declara explícitamente en el reporte |

### 9.6 Entorno de pruebas

| Elemento | Definición |
|---|---|
| Entorno | Aplicación desplegada en Vercel, con la URL registrada en la portada |
| Navegador de referencia | `[completar: navegador y versión]` |
| Resolución de referencia | `[completar]` |
| Datos de prueba | No se requieren datos precargados en V1 y V2. En V3, un conjunto de usuarios de prueba y puntajes cargados para verificar el ordenamiento del tablero global |
| Versión bajo prueba | Se identifica por el hash del commit de GitHub. Todo defecto se reporta contra un commit concreto |

Se prueba sobre el entorno desplegado y no sobre el equipo de cada integrante para que todos ejecuten contra la misma versión. Un defecto reportado sobre una copia local no siempre es reproducible por el resto del equipo, y un defecto no reproducible no se puede resolver ni verificar.

### 9.7 Criterios de entrada y de salida

**Criterios de entrada** — para iniciar la ejecución de un ciclo de pruebas:

- La versión está desplegada y accesible en el entorno de pruebas.
- La aplicación permite iniciar una partida y jugarla sin errores que impidan el arranque.
- Los casos de prueba de la versión están especificados y revisados.
- La planilla de registro de ejecución está preparada.

**Criterios de salida** — para cerrar la ejecución de una versión:

- El 100 % de los casos de prioridad Alta fue ejecutado.
- No quedan defectos abiertos de severidad Bloqueante o Crítica.
- Todo defecto abierto de severidad Mayor tiene una decisión registrada: se corrige en esta versión o se difiere con su justificación.
- Los casos no ejecutados están declarados en el reporte de ejecución, con el motivo.
- El reporte de ejecución y el de defectos están consolidados.

### 9.8 Suspensión y reanudación

La ejecución de un área se **suspende** cuando aparece un defecto bloqueante que impide ejecutar los casos restantes de esa área. Ejemplo: si el nivel 1 no se puede completar, quedan suspendidos todos los casos de los niveles 2 y 3. La ejecución se **reanuda** con la corrección desplegada, reejecutando el caso que detectó el defecto bloqueante más los casos que quedaron suspendidos.

---

## 10. Especificación de casos de prueba

### 10.1 Convenciones

Cada caso de prueba de la V1 se especifica con:

- **ID:** identificador único `CP-nnn`.
- **HU:** historia de usuario que verifica.
- **Prioridad:** Alta / Media / Baja, según la sección 9.5.
- **Técnica:** técnica de diseño aplicada (sección 9.3).
- **Precondiciones:** estado necesario antes de ejecutar los pasos.
- **Pasos:** acciones a ejecutar, numeradas.
- **Resultado esperado:** condición verificable de aprobación. Si cualquier parte del resultado esperado no se cumple, el caso se registra como *Fallido*.

Notación de estados usada en las precondiciones:

| Notación | Significado |
|---|---|
| *Partida en curso (N1)* | Partida iniciada en modo Pacman, nivel 1, 3 vidas, sin PowerUp activo |
| *PowerUp activo* | Pacman consumió una esfera grande hace menos de 6 segundos |
| *PowerUp en parpadeo* | Transcurrieron entre 6 y 8 segundos desde el consumo de la esfera grande |

---

### 10.2 Casos de prueba de la Versión 1

#### Épica E1 — Núcleo de juego y movimiento

**CP-001 · Movimiento de Pacman con las flechas**
*HU-01 · Prioridad: Alta · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Presionar ←. 2) Presionar ↑. 3) Presionar →. 4) Presionar ↓.
- **Resultado esperado:** Pacman se desplaza en la dirección de cada tecla presionada, siempre que el camino esté libre.

**CP-002 · Movimiento de Pacman con WASD**
*HU-01 · Prioridad: Alta · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Presionar A. 2) Presionar W. 3) Presionar D. 4) Presionar S.
- **Resultado esperado:** Cada tecla produce el mismo desplazamiento que ←, ↑, → y ↓ respectivamente.

**CP-003 · Avance continuo sin mantener la tecla**
*HU-01 · Prioridad: Alta · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1), Pacman en un corredor libre.
- **Pasos:** 1) Presionar y liberar de inmediato la tecla de una dirección libre. 2) Observar durante 3 segundos sin tocar el teclado.
- **Resultado esperado:** Pacman sigue avanzando en esa dirección durante los 3 segundos, hasta encontrar un muro.

**CP-004 · Giro postergado hasta la primera celda posible**
*HU-01 · Prioridad: Media · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso (N1), Pacman avanzando por un corredor horizontal con una intersección hacia arriba a 3 celdas de distancia.
- **Pasos:** 1) Con Pacman en movimiento horizontal, presionar ↑ antes de llegar a la intersección.
- **Resultado esperado:** Pacman continúa avanzando en horizontal y gira hacia arriba al llegar a la intersección, sin detenerse en el trayecto.

**CP-005 · Dirección bloqueada por un muro**
*HU-01 · Prioridad: Alta · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1), Pacman avanzando por un corredor horizontal con muros arriba y abajo.
- **Pasos:** 1) Presionar ↑ con el muro inmediatamente arriba.
- **Resultado esperado:** Pacman mantiene su dirección horizontal de avance. No se detiene ni queda trabado.

**CP-006 · Inversión de marcha a mitad de corredor**
*HU-01 · Prioridad: Media · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida en curso (N1), Pacman avanzando hacia la derecha en un corredor.
- **Pasos:** 1) Presionar ← a mitad del corredor.
- **Resultado esperado:** Pacman invierte su marcha de inmediato, sin necesidad de llegar a una intersección.

**CP-007 · Pacman no atraviesa los muros**
*HU-02 · Prioridad: Alta · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Dirigir a Pacman contra un muro. 2) Mantener presionada la tecla de esa dirección durante 5 segundos.
- **Resultado esperado:** Pacman se detiene contra el muro, no lo atraviesa, no queda superpuesto al muro y no queda encajado: al indicar otra dirección válida se mueve con normalidad.

**CP-008 · Pacman no sale de los límites del mapa**
*HU-02 · Prioridad: Alta · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Llevar a Pacman al borde del mapa por cada uno de los cuatro lados. 2) Presionar la tecla que apunta hacia afuera del mapa.
- **Resultado esperado:** Pacman no sale del mapa por ninguno de los cuatro lados y permanece visible en pantalla.

**CP-009 · Los fantasmas clásicos no atraviesan muros**
*HU-02 · Prioridad: Alta · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Observar el desplazamiento de los cuatro fantasmas durante 60 segundos.
- **Resultado esperado:** Ningún fantasma atraviesa un muro ni sale de los límites del mapa en ningún momento.

**CP-010 · Zona transitable coincidente con el mapa dibujado**
*HU-02 · Prioridad: Media · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Recorrer con Pacman los caminos marcados con puntos blancos.
- **Resultado esperado:** Todos los caminos marcados son transitables, y no existe ninguna celda transitable que no esté marcada como camino.

**CP-011 · Consumo de una esfera común**
*HU-03 · Prioridad: Alta · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida en curso (N1), puntaje 0.
- **Pasos:** 1) Registrar el puntaje y el contador de esferas restantes. 2) Desplazar a Pacman sobre una esfera común. 3) Registrar ambos valores.
- **Resultado esperado:** La esfera desaparece del mapa, el puntaje aumenta exactamente 10 y el contador de esferas restantes disminuye exactamente 1.

**CP-012 · Una esfera consumida no reaparece al perder una vida**
*HU-03 · Prioridad: Alta · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Consumir al menos 10 esferas y registrar la zona despejada. 2) Dejar que un fantasma alcance a Pacman. 3) Observar la zona despejada al reanudarse el nivel.
- **Resultado esperado:** Las esferas consumidas antes de perder la vida siguen ausentes del mapa.

**CP-013 · Los fantasmas no consumen esferas**
*HU-03 · Prioridad: Media · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Registrar el contador de esferas restantes. 2) Observar durante 30 segundos sin mover a Pacman, mientras los fantasmas recorren el mapa sobre celdas con esferas.
- **Resultado esperado:** El contador de esferas restantes no cambia y las esferas por las que pasaron los fantasmas siguen en el mapa.

**CP-014 · Finalización del nivel al consumir la última esfera**
*HU-04 · Prioridad: Alta · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1) con una sola esfera restante en el mapa.
- **Pasos:** 1) Consumir la última esfera.
- **Resultado esperado:** El nivel se completa, la partida se detiene y se muestra el resultado del nivel con su puntaje.

**CP-015 · El nivel no se completa si queda una esfera grande**
*HU-04 · Prioridad: Alta · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1) con todas las esferas comunes consumidas y una esfera grande sin consumir.
- **Pasos:** 1) Observar el estado de la partida. 2) Verificar el contador de esferas restantes.
- **Resultado esperado:** El nivel no se completa y el contador indica 1 esfera restante. La partida continúa.

**CP-016 · Paso al nivel siguiente conservando puntaje y vidas**
*HU-04 · Prioridad: Alta · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso (N1) próxima a completarse, con 2 vidas restantes y puntaje registrado.
- **Pasos:** 1) Registrar puntaje y vidas. 2) Completar el nivel 1. 3) Registrar puntaje, vidas y número de nivel.
- **Resultado esperado:** Se inicia el nivel 2, el puntaje acumulado se conserva y el contador de vidas sigue en 2.

**CP-017 · Victoria al completar el nivel 3**
*HU-04 · Prioridad: Alta · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso en el nivel 3, próxima a completarse.
- **Pasos:** 1) Consumir la última esfera del nivel 3.
- **Resultado esperado:** La partida termina en victoria y se muestra la pantalla de Victoria con el puntaje final.

#### Épica E2 — PowerUp e interacción con fantasmas

**CP-018 · Activación automática del PowerUp**
*HU-05 · Prioridad: Alta · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso (N1), sin PowerUp activo.
- **Pasos:** 1) Registrar el puntaje. 2) Consumir una esfera grande sin presionar ninguna otra tecla.
- **Resultado esperado:** El PowerUp se activa de inmediato sin intervención del jugador, el puntaje aumenta exactamente 50, los fantasmas cambian su diseño y se alejan de Pacman.

**CP-019 · Duración del PowerUp**
*HU-05 · Prioridad: Alta · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Consumir una esfera grande y cronometrar desde ese instante. 2) Observar el estado de los fantasmas a los 7 segundos. 3) Observarlo a los 9 segundos.
- **Resultado esperado:** A los 7 segundos los fantasmas siguen en estado vulnerable; a los 9 segundos recuperaron su diseño normal y volvieron a perseguir a Pacman. La duración total es de 8 segundos.

**CP-020 · Los fantasmas huyen durante el PowerUp**
*HU-05 · Prioridad: Alta · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1), un fantasma persiguiendo a Pacman a corta distancia.
- **Pasos:** 1) Consumir una esfera grande. 2) Observar la trayectoria del fantasma que perseguía a Pacman.
- **Resultado esperado:** El fantasma deja de acercarse a Pacman y se desplaza alejándose de él.

**CP-021 · Reinicio del temporizador por una segunda esfera grande**
*HU-05 · Prioridad: Media · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1), dos esferas grandes accesibles.
- **Pasos:** 1) Consumir una esfera grande. 2) A los 5 segundos, consumir la segunda esfera grande. 3) Cronometrar desde el segundo consumo.
- **Resultado esperado:** El PowerUp permanece activo 8 segundos completos a partir del segundo consumo, no 3.

**CP-022 · Reinicio de la escala de puntos por una segunda esfera grande**
*HU-05 · Prioridad: Media · Técnica: Tabla de decisión*
- **Precondiciones:** Partida en curso (N1), dos esferas grandes accesibles.
- **Pasos:** 1) Consumir una esfera grande. 2) Comer un fantasma y registrar los puntos obtenidos. 3) Consumir la segunda esfera grande. 4) Comer otro fantasma y registrar los puntos obtenidos.
- **Resultado esperado:** El fantasma del paso 2 suma 200 puntos y el del paso 4 suma 200 puntos, no 400.

**CP-023 · Escala de puntos por fantasmas comidos**
*HU-06 · Prioridad: Alta · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1), cuatro fantasmas próximos a Pacman.
- **Pasos:** 1) Consumir una esfera grande. 2) Comer los cuatro fantasmas dentro de la duración del PowerUp, registrando el puntaje antes y después de cada uno.
- **Resultado esperado:** Los incrementos de puntaje son exactamente 200, 400, 800 y 1600, en ese orden.

**CP-024 · Reinicio de la escala al terminar el PowerUp**
*HU-06 · Prioridad: Alta · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Consumir una esfera grande y comer un fantasma (200 puntos). 2) Esperar a que el PowerUp termine. 3) Consumir otra esfera grande y comer un fantasma, registrando el incremento.
- **Resultado esperado:** El fantasma del paso 3 suma 200 puntos, no 400.

**CP-025 · Comer un fantasma no descuenta vidas**
*HU-06 · Prioridad: Alta · Técnica: Tabla de decisión*
- **Precondiciones:** Partida en curso (N1), 3 vidas, PowerUp activo.
- **Pasos:** 1) Registrar el contador de vidas. 2) Tocar un fantasma con el PowerUp activo. 3) Registrar el contador de vidas.
- **Resultado esperado:** El fantasma desaparece del mapa, el contador de vidas sigue en 3 y el nivel no se reinicia.

**CP-026 · Reaparición del fantasma comido**
*HU-06 · Prioridad: Media · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1), PowerUp activo.
- **Pasos:** 1) Comer un fantasma y cronometrar. 2) Observar el punto de reaparición y el momento en que reaparece.
- **Resultado esperado:** El fantasma reaparece en su punto de reaparición a los 5 segundos y retoma su comportamiento normal.

**CP-027 · Fantasma que reaparece con el PowerUp aún activo**
*HU-06 · Prioridad: Media · Técnica: Tabla de decisión*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Consumir una esfera grande. 2) Comer un fantasma de inmediato (200 puntos). 3) Esperar su reaparición dentro de los 8 segundos del PowerUp. 4) Comerlo otra vez y registrar el incremento.
- **Resultado esperado:** El fantasma reaparece en estado vulnerable, puede volver a ser comido y el incremento del paso 4 es de 400 puntos: la escala continúa y no se reinicia.

**CP-028 · Parpadeo en los últimos 2 segundos del PowerUp**
*HU-07 · Prioridad: Media · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Consumir una esfera grande y cronometrar. 2) Observar el aspecto de los fantasmas a los 5 segundos y a los 7 segundos.
- **Resultado esperado:** A los 5 segundos los fantasmas muestran el estado vulnerable estable; a los 7 segundos parpadean. El parpadeo se distingue tanto del estado vulnerable estable como del diseño normal.

**CP-029 · Esfera grande consumida durante el parpadeo**
*HU-07 · Prioridad: Media · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso (N1), una esfera grande accesible.
- **Pasos:** 1) Consumir una esfera grande. 2) Al iniciarse el parpadeo, consumir la segunda esfera grande. 3) Observar el aspecto de los fantasmas.
- **Resultado esperado:** El parpadeo cesa, los fantasmas vuelven al estado vulnerable estable y el PowerUp se extiende 8 segundos desde el segundo consumo.

**CP-030 · Descuento de una vida por contacto con un fantasma**
*HU-08 · Prioridad: Alta · Técnica: Tabla de decisión*
- **Precondiciones:** Partida en curso (N1), 3 vidas, sin PowerUp activo.
- **Pasos:** 1) Registrar el contador de vidas y el puntaje. 2) Dejar que un fantasma alcance a Pacman. 3) Registrar ambos valores.
- **Resultado esperado:** El contador de vidas baja a 2, el puntaje acumulado se conserva, y Pacman y los fantasmas vuelven a sus posiciones iniciales.

**CP-031 · Un solo contacto no descuenta más de una vida**
*HU-08 · Prioridad: Alta · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1), 3 vidas.
- **Pasos:** 1) Dirigir a Pacman de frente contra un fantasma, sin cambiar de dirección durante el contacto. 2) Registrar el contador de vidas inmediatamente después.
- **Resultado esperado:** Se descuenta exactamente una vida. El contador queda en 2 y no en 1 ni en 0.

**CP-032 · El PowerUp se cancela al perder una vida**
*HU-08 · Prioridad: Media · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso (N1), PowerUp activo, un fantasma en estado de gracia o recién reaparecido.
- **Pasos:** 1) Con el PowerUp activo, perder una vida por contacto con un fantasma no vulnerable. 2) Observar el estado de los fantasmas al reanudarse el nivel.
- **Resultado esperado:** El PowerUp queda cancelado: los fantasmas muestran su diseño normal y persiguen a Pacman.

**CP-033 · Reanudación del nivel tras perder una vida**
*HU-08 · Prioridad: Alta · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso (N1), 3 vidas, al menos 15 esferas consumidas.
- **Pasos:** 1) Perder una vida. 2) Observar el nivel, el puntaje, las esferas y las posiciones de los personajes.
- **Resultado esperado:** Se reanuda el mismo nivel 1, con el puntaje conservado, las esferas consumidas ausentes y los personajes en sus posiciones iniciales.

#### Épica E3 — Vidas, puntaje y fin de partida

**CP-034 · Presentación del contador de vidas**
*HU-09 · Prioridad: Media · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida recién iniciada en modo Pacman.
- **Pasos:** 1) Observar el extremo inferior izquierdo de la pantalla.
- **Resultado esperado:** Se muestran 3 íconos de Pacman como contador de vidas, no un número.

**CP-035 · Actualización inmediata del contador de vidas**
*HU-09 · Prioridad: Media · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1), 3 vidas.
- **Pasos:** 1) Perder una vida y observar el contador. 2) Perder una segunda vida y observar. 3) Perder la tercera y observar.
- **Resultado esperado:** El contador muestra 2 íconos, luego 1, y finalmente ninguno. La actualización ocurre en el momento de cada pérdida.

**CP-036 · Game Over al perder la tercera vida**
*HU-10 · Prioridad: Alta · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1), 1 vida restante.
- **Pasos:** 1) Perder la última vida. 2) Observar la pantalla y esperar 5 segundos.
- **Resultado esperado:** La partida termina, se muestra la pantalla de Game Over con el puntaje final, y el nivel no se reinicia ni se reanuda.

**CP-037 · Game Over en un nivel distinto del primero**
*HU-10 · Prioridad: Media · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida en curso en el nivel 3, 1 vida restante.
- **Pasos:** 1) Perder la última vida.
- **Resultado esperado:** La partida termina con Game Over en el nivel 3, con el mismo comportamiento que en el nivel 1.

**CP-038 · Puntaje visible y actualizado en el HUD**
*HU-11 · Prioridad: Media · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida recién iniciada en modo Pacman.
- **Pasos:** 1) Verificar el puntaje inicial. 2) Consumir una esfera común, una esfera grande y un fantasma con el PowerUp activo, observando el HUD después de cada acción.
- **Resultado esperado:** El puntaje inicia en 0 y se actualiza de manera inmediata tras cada acción, en +10, +50 y +200 respectivamente.

**CP-039 · El puntaje no disminuye ni se reinicia entre niveles**
*HU-11 · Prioridad: Media · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1) con puntaje mayor a 0.
- **Pasos:** 1) Registrar el puntaje. 2) Perder una vida y registrar. 3) Completar el nivel y registrar al inicio del nivel 2.
- **Resultado esperado:** El puntaje no disminuye en ningún momento y se conserva al cambiar de nivel.

**CP-040 · Consumo de una fruta**
*HU-12 · Prioridad: Media · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida en curso en el nivel 3, con una fruta presente en el mapa.
- **Pasos:** 1) Registrar el puntaje y el contador de esferas restantes. 2) Consumir la fruta. 3) Registrar ambos valores.
- **Resultado esperado:** La fruta desaparece, el puntaje aumenta exactamente 100 y el contador de esferas restantes no cambia.

**CP-041 · Desaparición de una fruta no consumida**
*HU-12 · Prioridad: Baja · Técnica: Valores límite*
- **Precondiciones:** Partida en curso en el nivel 3, con una fruta que acaba de aparecer.
- **Pasos:** 1) Cronometrar desde la aparición de la fruta sin consumirla. 2) Observar el mapa a los 14 segundos y a los 16 segundos.
- **Resultado esperado:** A los 14 segundos la fruta sigue en el mapa; a los 16 segundos ya no está.

**CP-042 · Cálculo del bonus por tiempo**
*HU-13 · Prioridad: Media · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Completar el nivel 1 en menos de 120 segundos, registrando el tiempo empleado. 2) Verificar el bonus por tiempo en el desglose.
- **Resultado esperado:** El bonus por tiempo es igual a 10 multiplicado por los segundos **enteros** restantes respecto de los 120 segundos objetivo, descartando la fracción. Por ejemplo, un tiempo de 100,5 s deja 19 s y da un bonus de 190 (sección 4.2).

**CP-043 · Bonus por tiempo al exceder el tiempo objetivo**
*HU-13 · Prioridad: Media · Técnica: Valores límite*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Completar el nivel 1 en más de 120 segundos. 2) Verificar el bonus por tiempo.
- **Resultado esperado:** El bonus por tiempo es 0 y en ningún caso un valor negativo.

**CP-044 · Bonus por vidas restantes y consistencia del desglose**
*HU-13 · Prioridad: Media · Técnica: Valores límite*
- **Precondiciones:** Partida completada en victoria con 2 vidas restantes.
- **Pasos:** 1) Registrar cada componente del desglose y el total. 2) Sumar los componentes manualmente.
- **Resultado esperado:** El bonus por vidas es de 1000 puntos (500 por cada una de las 2 vidas) y la suma de todos los componentes coincide exactamente con el total mostrado.

**CP-045 · Bonus por vidas en un Game Over**
*HU-13 · Prioridad: Media · Técnica: Valores límite*
- **Precondiciones:** Partida terminada en Game Over.
- **Pasos:** 1) Verificar el bonus por vidas restantes en el desglose.
- **Resultado esperado:** El bonus por vidas restantes es 0.

**CP-046 · Contador de esferas restantes**
*HU-14 · Prioridad: Baja · Técnica: Valores límite*
- **Precondiciones:** Partida recién iniciada en modo Pacman.
- **Pasos:** 1) Registrar el valor inicial del contador y contar las esferas del mapa, incluidas las grandes. 2) Consumir 5 esferas y verificar el contador. 3) Completar el nivel y verificar el contador al llegar a la última esfera. 4) Verificar el contador al iniciar el nivel 2.
- **Resultado esperado:** El valor inicial coincide con el total de esferas del mapa incluidas las grandes, disminuye en 1 por esfera consumida, llega a 0 exactamente al completarse el nivel, y se reinicia al total del nivel 2.

#### Épica E4 — Niveles y progresión de dificultad

**CP-047 · Los tres niveles y sus mapas**
*HU-15 · Prioridad: Alta · Técnica: Partición de equivalencia*
- **Precondiciones:** Ninguna.
- **Pasos:** 1) Jugar una partida completando los tres niveles. 2) Registrar la forma y la paleta de cada mapa, y el número de nivel del HUD.
- **Resultado esperado:** Los niveles se juegan en orden 1, 2, 3; cada mapa tiene forma propia distinta de la de los otros dos; el nivel 1 es negro con franjas rojas y contorno celeste, el 2 azul sobre negro con contorno azul y sin franjas, el 3 verde brillante; los caminos están marcados con puntos blancos en los tres; el HUD indica el nivel en curso.

**CP-048 · Los mapas no varían entre partidas**
*HU-15 · Prioridad: Media · Técnica: Adivinación de errores*
- **Precondiciones:** Una partida jugada, con el mapa del nivel 1 registrado.
- **Pasos:** 1) Iniciar una partida nueva. 2) Comparar el mapa del nivel 1 con el registrado.
- **Resultado esperado:** El mapa del nivel 1 es idéntico al de la partida anterior, en forma, distribución de esferas y ubicación de las esferas grandes.

**CP-049 · Solo fantasmas clásicos en el nivel 1**
*HU-16 · Prioridad: Alta · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Observar los cuatro fantasmas durante todo el nivel 1. 2) Comparar sus velocidades de desplazamiento.
- **Resultado esperado:** Los cuatro fantasmas son clásicos, ninguno atraviesa muros, se teletransporta, coloca frutas falsas ni ejecuta un dash, y los cuatro se desplazan a la misma velocidad.

**CP-050 · Reaparición como clásico en el nivel 1**
*HU-16 · Prioridad: Alta · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Comer al menos 4 fantasmas a lo largo del nivel 1. 2) Observar el tipo de cada fantasma que reaparece.
- **Resultado esperado:** Todos los fantasmas reaparecen como clásicos, sin excepción.

**CP-051 · Composición inicial de fantasmas del nivel 2**
*HU-17 · Prioridad: Alta · Técnica: Partición de equivalencia*
- **Precondiciones:** Nivel 2 recién iniciado.
- **Pasos:** 1) Observar el tipo de los cuatro fantasmas al comenzar el nivel.
- **Resultado esperado:** Los cuatro fantasmas son de tipo clásico al inicio del nivel 2.

**CP-052 · Reaparición con poderes en el nivel 2**
*HU-17 · Prioridad: Alta · Técnica: Partición de equivalencia*
- **Precondiciones:** Partida en curso en el nivel 2.
- **Pasos:** 1) Comer al menos 8 fantasmas a lo largo del nivel 2, registrando el tipo de cada reaparición.
- **Resultado esperado:** Aparecen reapariciones de ambos tipos, clásico y espectro, en una proporción consistente con el 50 % especificado. Los espectros son visualmente distinguibles de los clásicos.

**CP-053 · Todos los fantasmas con poderes en el nivel 3**
*HU-17 · Prioridad: Alta · Técnica: Partición de equivalencia*
- **Precondiciones:** Nivel 3 recién iniciado.
- **Pasos:** 1) Observar el tipo de los cuatro fantasmas al comenzar el nivel.
- **Resultado esperado:** Los cuatro fantasmas tienen poderes desde el inicio del nivel 3.

**CP-054 · Velocidad reducida del espectro**
*HU-17 · Prioridad: Media · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso en el nivel 2 con al menos un espectro y un clásico en el mapa.
- **Pasos:** 1) Observar el desplazamiento de un espectro y de un clásico por un tramo recto comparable, midiendo el tiempo de cada uno.
- **Resultado esperado:** El espectro tarda aproximadamente un 43 % más de tiempo en recorrer el mismo tramo, consistente con una velocidad un 30 % menor.

**CP-055 · El espectro atraviesa una pared**
*HU-18 · Prioridad: Alta · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso en el nivel 3.
- **Pasos:** 1) Observar el desplazamiento de un espectro durante 60 segundos.
- **Resultado esperado:** El espectro atraviesa paredes, y en cada activación atraviesa una sola pared: no cruza una secuencia de paredes contiguas en un mismo uso.

**CP-056 · Cooldown de la habilidad del espectro**
*HU-18 · Prioridad: Media · Técnica: Valores límite*
- **Precondiciones:** Partida en curso en el nivel 3.
- **Pasos:** 1) Registrar el instante en que un espectro atraviesa una pared. 2) Cronometrar hasta la siguiente pared que atraviesa el mismo espectro.
- **Resultado esperado:** Entre dos usos de la habilidad transcurren al menos 10 segundos.

**CP-057 · Estado de gracia del espectro tras atravesar un muro**
*HU-18 · Prioridad: Alta · Técnica: Tabla de decisión*
- **Precondiciones:** Partida en curso en el nivel 3, sin PowerUp activo, 3 vidas.
- **Pasos:** 1) Esperar a que un espectro atraviese una pared. 2) Dirigir a Pacman al contacto con ese espectro dentro de los 3 segundos siguientes. 3) Registrar el contador de vidas.
- **Resultado esperado:** El contacto no descuenta vidas, el estado del espectro es visualmente distinguible durante esos 3 segundos, y transcurridos los 3 segundos el contacto vuelve a descontar una vida.

**CP-058 · El espectro no sale del mapa con su habilidad**
*HU-18 · Prioridad: Media · Técnica: Valores límite*
- **Precondiciones:** Partida en curso en el nivel 3.
- **Pasos:** 1) Observar durante 90 segundos el comportamiento de los espectros en los corredores adyacentes al borde del mapa.
- **Resultado esperado:** Ningún espectro sale de los límites del mapa ni queda ubicado dentro de un bloque de muro sin celda transitable de destino.

**CP-059 · El espectro es vulnerable durante el PowerUp**
*HU-18 · Prioridad: Alta · Técnica: Tabla de decisión*
- **Precondiciones:** Partida en curso en el nivel 3.
- **Pasos:** 1) Consumir una esfera grande. 2) Comer un espectro. 3) Registrar el puntaje y el contador de vidas.
- **Resultado esperado:** El espectro cambia a estado vulnerable, puede ser comido, suma puntos según la escala vigente y no descuenta vidas.

**CP-060 · Pantalla de Game Over**
*HU-19 · Prioridad: Alta · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso (N1), 1 vida restante.
- **Pasos:** 1) Perder la última vida. 2) Observar la pantalla.
- **Resultado esperado:** Se muestra la pantalla de Game Over con el puntaje final desglosado y con la acción de volver a jugar disponible.

**CP-061 · Pantalla de Victoria**
*HU-19 · Prioridad: Alta · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso en el nivel 3, próxima a completarse.
- **Pasos:** 1) Completar el nivel 3. 2) Observar la pantalla.
- **Resultado esperado:** Se muestra la pantalla de Victoria con el puntaje final desglosado y con la acción de volver a jugar disponible.

**CP-062 · Reinicio completo del estado al volver a jugar**
*HU-19 · Prioridad: Alta · Técnica: Adivinación de errores*
- **Precondiciones:** Partida terminada en Game Over en el nivel 3, con puntaje mayor a 0.
- **Pasos:** 1) Usar la acción de volver a jugar. 2) Verificar nivel, vidas, puntaje y estado de los mapas. 3) Completar el nivel 1 y verificar el mapa del nivel 2.
- **Resultado esperado:** La partida nueva inicia en el nivel 1 con 3 vidas y puntaje 0, con todas las esferas y frutas restablecidas en el nivel 1 y también en los niveles siguientes.

#### Épica E5 — Control de la partida

**CP-063 · Pausa y reanudación con ESC**
*HU-20 · Prioridad: Media · Técnica: Transición de estados*
- **Precondiciones:** Partida en curso (N1) con los personajes en movimiento.
- **Pasos:** 1) Presionar ESC. 2) Observar la pantalla durante 5 segundos. 3) Presionar las teclas de movimiento. 4) Presionar ESC otra vez.
- **Resultado esperado:** La partida se detiene, los personajes quedan inmóviles, la pantalla indica de manera visible el estado de pausa, las teclas de movimiento no producen efecto, y el segundo ESC reanuda la partida.

**CP-064 · Los temporizadores se detienen durante la pausa**
*HU-20 · Prioridad: Media · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Consumir una esfera grande. 2) A los 2 segundos, presionar ESC. 3) Mantener la pausa 15 segundos. 4) Reanudar y cronometrar cuánto dura el PowerUp desde la reanudación.
- **Resultado esperado:** El PowerUp continúa 6 segundos desde la reanudación. No termina durante la pausa ni al reanudarse.

**CP-065 · El bonus por tiempo no se afecta por la pausa**
*HU-20 · Prioridad: Baja · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1).
- **Pasos:** 1) Completar el nivel 1 con una pausa de 60 segundos en el medio, registrando el tiempo de juego efectivo. 2) Verificar el bonus por tiempo.
- **Resultado esperado:** El bonus por tiempo se calcula sobre el tiempo de juego efectivo y no incluye los 60 segundos de pausa.

**CP-066 · La barra espaciadora no tiene efecto en modo Pacman**
*HU-21 · Prioridad: Baja · Técnica: Adivinación de errores*
- **Precondiciones:** Partida en curso (N1), sin PowerUp activo, puntaje y vidas registrados.
- **Pasos:** 1) Presionar la barra espaciadora 10 veces. 2) Verificar puntaje, vidas, estado de la partida y posición de la página en el navegador.
- **Resultado esperado:** El estado del juego no cambia en ningún aspecto: la partida no se pausa, el PowerUp no se activa, el puntaje no varía. La página no hace scroll ni ejecuta ninguna acción por defecto del navegador.

### 10.3 Resumen de casos de prueba de la V1

| Épica | Casos | Alta | Media | Baja |
|---|---|---|---|---|
| E1 — Núcleo de juego y movimiento | CP-001 a CP-017 | 13 | 4 | 0 |
| E2 — PowerUp e interacción con fantasmas | CP-018 a CP-033 | 9 | 7 | 0 |
| E3 — Vidas, puntaje y fin de partida | CP-034 a CP-046 | 1 | 10 | 2 |
| E4 — Niveles y progresión | CP-047 a CP-062 | 12 | 4 | 0 |
| E5 — Control de la partida | CP-063 a CP-066 | 0 | 2 | 2 |
| **Total** | **66 casos** | **35** | **27** | **4** |

---

### 10.4 Casos de prueba de la Versión 2 (formato sintético)

Estos casos se detallarán con sus pasos completos cuando la V2 entre en ejecución (Entrega 02). Se especifican ahora en formato sintético para dimensionar el esfuerzo de la próxima iteración y para verificar que cada criterio de aceptación de la V2 tenga al menos un caso que lo cubra.

| ID | HU | Caso de prueba | Condición de aceptación | Prioridad |
|---|---|---|---|---|
| CP-067 | HU-22 | Selección del modo Pacman | La partida inicia con el jugador controlando a Pacman | Alta |
| CP-068 | HU-22 | Selección del modo GhostMan | Se accede al carrusel de selección de fantasma | Alta |
| CP-069 | HU-22 | Ícono de vidas según el modo | En modo GhostMan el contador usa el ícono del fantasma | Media |
| CP-070 | HU-23 | Contenido del carrusel de fantasmas | Se presentan los 5 tipos con nombre y descripción del poder | Alta |
| CP-071 | HU-23 | Navegación circular del carrusel | Avanzar desde el último tipo lleva al primero, con flechas y con A/D | Media |
| CP-072 | HU-23 | Confirmación con Enter | Enter inicia la partida con el fantasma mostrado en el centro | Alta |
| CP-073 | HU-23 | Inmutabilidad de la selección | El tipo de fantasma no cambia durante la partida | Alta |
| CP-074 | HU-24 | Control del fantasma con flechas y WASD | El fantasma responde a ambos esquemas de teclas | Alta |
| CP-075 | HU-24 | El fantasma respeta los muros | Sin usar habilidades, el fantasma no atraviesa muros ni sale del mapa | Alta |
| CP-076 | HU-24 | Pacman y los demás fantasmas bajo IA | Pacman y los otros tres fantasmas se comportan de forma autónoma | Alta |
| CP-077 | HU-25 | Derrota de Pacman y reinicio del nivel | Pacman pierde una vida y el nivel se reinicia | Alta |
| CP-078 | HU-25 | Contador de derrotas de Pacman | El contador se muestra e incrementa solo con las derrotas producidas por el jugador | Alta |
| CP-079 | HU-25 | Nivel completado con 3 derrotas | Al llegar a 3 derrotas el nivel se completa | Alta |
| CP-080 | HU-26 | Derrota por nivel completado por Pacman | Si Pacman consume la última esfera, Game Over sin importar el contador de derrotas | Alta |
| CP-081 | HU-27 | Vulnerabilidad durante el PowerUp de Pacman | El fantasma cambia de diseño y no puede derrotar a Pacman | Alta |
| CP-082 | HU-27 | Reaparición del fantasma del jugador | 5 s, u 8 s si es naval, sin control del jugador y con el tiempo restante en pantalla | Media |
| CP-083 | HU-27 | Ser comido no descuenta vidas ni reinicia el nivel | El contador de vidas y el estado del nivel no cambian | Alta |
| CP-084 | HU-28 | Espectro: atravesar una pared | Atraviesa una sola pared por activación, con celda transitable de destino | Alta |
| CP-085 | HU-28 | Espectro: cooldown y estado de gracia | Cooldown de 10 s y 3 s sin poder derrotar a Pacman, visualmente distinguibles | Alta |
| CP-086 | HU-28 | Espectro: habilidad no disponible sin destino válido | No se activa si al otro lado del muro no hay celda transitable ni fuera del mapa | Media |
| CP-087 | HU-29 | Saltarín: destino dentro del radio y transitable | El destino está dentro de 10 celdas y nunca es un muro ni una posición fuera del mapa | Alta |
| CP-088 | HU-29 | Saltarín: cooldown de 10 s | La habilidad no se reactiva antes de los 10 s | Media |
| CP-089 | HU-29 | Saltarín: salto sobre Pacman | Si el destino coincide con Pacman sin PowerUp, Pacman pierde una vida | Media |
| CP-090 | HU-30 | Naval: fruta falsa consumida por Pacman | Pacman pierde una vida y el nivel se reinicia | Alta |
| CP-091 | HU-30 | Naval: fruta falsa con el PowerUp de Pacman activo | La fruta falsa no afecta a Pacman | Alta |
| CP-092 | HU-30 | Naval: explosión a los 10 s | Explota en un radio de 3 celdas sin atravesar paredes | Alta |
| CP-093 | HU-30 | Naval: máximo de 2 frutas y cooldown de 5 s | No se colocan más de 2 frutas simultáneas ni antes de 5 s | Media |
| CP-094 | HU-30 | Naval: fruta falsa distinguible de la real | Ambas se diferencian visualmente | Media |
| CP-095 | HU-31 | Acelerado: dash de hasta 3 celdas | Se desplaza hasta 3 celdas y se detiene ante una pared | Alta |
| CP-096 | HU-31 | Acelerado: penalidad de velocidad posterior | −50 % de velocidad durante 5 s tras el dash | Alta |
| CP-097 | HU-31 | Acelerado: dash sin dirección de avance | Sin dirección previa, la habilidad no produce desplazamiento | Baja |
| CP-098 | HU-32 | Indicador de poder disponible | La estrella aparece cuando el poder está disponible y se apaga durante el cooldown | Media |
| CP-099 | HU-32 | Sin indicador para el fantasma clásico | No se muestra estrella si el jugador eligió el fantasma clásico | Baja |
| CP-100 | HU-32 | Espacio durante el cooldown sin efecto | El estado del juego no cambia | Media |
| CP-101 | HU-33 | Pacman destruye hasta 5 paredes en el nivel 2 | Destruye como máximo 5 paredes por PowerUp obtenido, y quedan transitables | Alta |
| CP-102 | HU-33 | El nivel 1 no habilita la destrucción de paredes | Pacman no destruye paredes en el nivel 1 | Alta |
| CP-103 | HU-33 | Paredes restablecidas al reiniciarse el nivel | Tras una derrota de Pacman, las paredes destruidas vuelven a existir | Media |
| CP-104 | HU-34 | Mayor cantidad de esferas grandes en el nivel 3 | El mapa del nivel 3 tiene más esferas grandes que los de los niveles 1 y 2 | Media |
| CP-105 | HU-34 | Aparición dinámica de esferas grandes | Las nuevas esferas aparecen en celdas transitables y cuentan para completar el nivel | Media |

**Total V2:** 39 casos — 24 de prioridad Alta, 13 Media, 2 Baja.

---

### 10.5 Casos de prueba de la Versión 3 (formato sintético)

| ID | HU | Caso de prueba | Condición de aceptación | Prioridad |
|---|---|---|---|---|
| CP-106 | HU-35 | Registro con datos válidos | La cuenta se crea, se inicia sesión y se accede al menú principal | Alta |
| CP-107 | HU-35 | Username de 2 y de 17 caracteres | Ambos se rechazan con el mensaje correspondiente | Alta |
| CP-108 | HU-35 | Username de 3 y de 16 caracteres | Ambos se aceptan | Alta |
| CP-109 | HU-35 | Username con espacios o símbolos | Se rechaza con el mensaje correspondiente | Media |
| CP-110 | HU-35 | Username ya existente | Se rechaza informando que el nombre está en uso | Alta |
| CP-111 | HU-35 | Contraseña de 7 y de 8 caracteres | La de 7 se rechaza, la de 8 con letra y número se acepta | Alta |
| CP-112 | HU-35 | Contraseña sin letra o sin número | Se rechaza con el mensaje correspondiente | Alta |
| CP-113 | HU-35 | Confirmación que no coincide | Se rechaza con el mensaje correspondiente | Alta |
| CP-114 | HU-35 | Campos vacíos en el registro | Cada campo vacío produce su propio mensaje de error | Media |
| CP-115 | HU-35 | Contraseña oculta en pantalla | El contenido de los campos de contraseña no se muestra en claro | Media |
| CP-116 | HU-35 | Registro rechazado sin cuenta parcial | Un registro fallido no deja la cuenta creada ni en estado intermedio | Alta |
| CP-117 | HU-36 | Login con credenciales válidas | Se inicia sesión y se accede al menú principal | Alta |
| CP-118 | HU-36 | Login con contraseña incorrecta | Se rechaza sin precisar cuál de los dos datos falló | Alta |
| CP-119 | HU-36 | Login con username inexistente | Se rechaza con el mismo mensaje que la contraseña incorrecta | Media |
| CP-120 | HU-36 | Sensibilidad a mayúsculas | El username no las distingue; la contraseña sí | Media |
| CP-121 | HU-36 | Persistencia de la sesión al recargar | La sesión sigue activa tras recargar la página | Media |
| CP-122 | HU-37 | Navegación del menú principal | Los tres botones llevan a su sección y cada sección permite volver | Media |
| CP-123 | HU-37 | Menú inaccesible sin sesión | Sin sesión iniciada no se accede al menú ni a los tableros | Alta |
| CP-124 | HU-38 | Contenido y orden del tablero global | Muestra posición, nombre y puntaje de las 10 mejores marcas, de mayor a menor | Media |
| CP-125 | HU-38 | Alternancia entre tableros por modo | Las flechas y A/D alternan entre modos, con el modo identificado en pantalla | Media |
| CP-126 | HU-38 | Tablero con menos de 10 puntajes | Se muestran solo los existentes, sin filas vacías | Media |
| CP-127 | HU-38 | Tablero sin puntajes | Se informa la ausencia de puntajes en lugar de un tablero vacío | Baja |
| CP-128 | HU-39 | Tablero personal por modo | Muestra el mejor puntaje del usuario en cada uno de los dos modos | Media |
| CP-129 | HU-39 | Actualización del mejor puntaje personal | Un puntaje superior actualiza el registro; uno inferior no lo modifica | Media |
| CP-130 | HU-39 | Modo no jugado en el tablero personal | Se indica que no hay marca, en lugar de mostrar 0 | Baja |
| CP-131 | HU-39 | Ingreso inmediato al top 10 global | Un puntaje que entra en el top 10 aparece al finalizar la partida | Media |
| CP-132 | HU-40 | Selección y aplicación de skins | La skin elegida se aplica en las partidas siguientes | Baja |
| CP-133 | HU-40 | Persistencia de la skin entre sesiones | La skin se conserva al cerrar y volver a iniciar sesión | Baja |
| CP-134 | HU-40 | Las skins no alteran las mecánicas | Velocidades, poderes, colisiones y puntaje no cambian con la skin | Media |
| CP-135 | HU-40 | Distinción de tipos y estado vulnerable con skins | Los tipos de fantasma y el estado vulnerable siguen siendo distinguibles | Media |
| CP-136 | HU-41 | Control independiente de música y efectos | Cada control regula solo su categoría | Baja |
| CP-137 | HU-41 | Volumen en 0 | La categoría correspondiente queda en silencio total | Baja |
| CP-138 | HU-41 | Persistencia del volumen entre sesiones | Los valores se conservan al volver a iniciar sesión | Baja |
| CP-139 | HU-42 | Cerrar sesión | Finaliza la sesión, lleva al login y conserva puntajes y preferencias | Media |
| CP-140 | HU-42 | Salir del juego | Lleva a la pantalla de salida sin dejar una partida activa en segundo plano | Baja |

**Total V3:** 35 casos — 11 de prioridad Alta, 16 Media, 8 Baja.

---

### 10.6 Resumen general de casos de prueba

| Versión | Casos | Alta | Media | Baja | Formato |
|---|---|---|---|---|---|
| V1 | 66 | 35 | 27 | 4 | Detallado |
| V2 | 39 | 24 | 13 | 2 | Sintético |
| V3 | 35 | 11 | 16 | 8 | Sintético |
| **Total** | **140** | **70** | **56** | **14** | |

---

## 11. Matriz de trazabilidad

La matriz vincula cada historia de usuario con los casos de prueba que la verifican. Cumple dos funciones: demuestra que **ningún requerimiento quedó sin cobertura**, y permite, ante un cambio de requerimiento, identificar de inmediato qué casos hay que revisar.

### 11.1 Cobertura de historias de usuario

| HU | Versión | Casos | Casos de prueba |
|---|---|---|---|
| HU-01 | V1 | 6 | CP-001, CP-002, CP-003, CP-004, CP-005, CP-006 |
| HU-02 | V1 | 4 | CP-007, CP-008, CP-009, CP-010 |
| HU-03 | V1 | 3 | CP-011, CP-012, CP-013 |
| HU-04 | V1 | 4 | CP-014, CP-015, CP-016, CP-017 |
| HU-05 | V1 | 5 | CP-018, CP-019, CP-020, CP-021, CP-022 |
| HU-06 | V1 | 5 | CP-023, CP-024, CP-025, CP-026, CP-027 |
| HU-07 | V1 | 2 | CP-028, CP-029 |
| HU-08 | V1 | 4 | CP-030, CP-031, CP-032, CP-033 |
| HU-09 | V1 | 2 | CP-034, CP-035 |
| HU-10 | V1 | 2 | CP-036, CP-037 |
| HU-11 | V1 | 2 | CP-038, CP-039 |
| HU-12 | V1 | 2 | CP-040, CP-041 |
| HU-13 | V1 | 4 | CP-042, CP-043, CP-044, CP-045 |
| HU-14 | V1 | 1 | CP-046 |
| HU-15 | V1 | 2 | CP-047, CP-048 |
| HU-16 | V1 | 2 | CP-049, CP-050 |
| HU-17 | V1 | 4 | CP-051, CP-052, CP-053, CP-054 |
| HU-18 | V1 | 5 | CP-055, CP-056, CP-057, CP-058, CP-059 |
| HU-19 | V1 | 3 | CP-060, CP-061, CP-062 |
| HU-20 | V1 | 3 | CP-063, CP-064, CP-065 |
| HU-21 | V1 | 1 | CP-066 |
| HU-22 | V2 | 3 | CP-067, CP-068, CP-069 |
| HU-23 | V2 | 4 | CP-070, CP-071, CP-072, CP-073 |
| HU-24 | V2 | 3 | CP-074, CP-075, CP-076 |
| HU-25 | V2 | 3 | CP-077, CP-078, CP-079 |
| HU-26 | V2 | 1 | CP-080 |
| HU-27 | V2 | 3 | CP-081, CP-082, CP-083 |
| HU-28 | V2 | 3 | CP-084, CP-085, CP-086 |
| HU-29 | V2 | 3 | CP-087, CP-088, CP-089 |
| HU-30 | V2 | 5 | CP-090, CP-091, CP-092, CP-093, CP-094 |
| HU-31 | V2 | 3 | CP-095, CP-096, CP-097 |
| HU-32 | V2 | 3 | CP-098, CP-099, CP-100 |
| HU-33 | V2 | 3 | CP-101, CP-102, CP-103 |
| HU-34 | V2 | 2 | CP-104, CP-105 |
| HU-35 | V3 | 11 | CP-106 a CP-116 |
| HU-36 | V3 | 5 | CP-117, CP-118, CP-119, CP-120, CP-121 |
| HU-37 | V3 | 2 | CP-122, CP-123 |
| HU-38 | V3 | 4 | CP-124, CP-125, CP-126, CP-127 |
| HU-39 | V3 | 4 | CP-128, CP-129, CP-130, CP-131 |
| HU-40 | V3 | 4 | CP-132, CP-133, CP-134, CP-135 |
| HU-41 | V3 | 3 | CP-136, CP-137, CP-138 |
| HU-42 | V3 | 2 | CP-139, CP-140 |

**Cobertura:** 42 de 42 historias de usuario tienen al menos un caso de prueba asociado. **Cobertura de requerimientos: 100 %.**

### 11.2 Observaciones sobre la distribución

La cantidad de casos por historia no es uniforme, y las asimetrías son deliberadas:

- **HU-35 (registro)** concentra 11 casos, la mayor cantidad del proyecto. Es la única funcionalidad con validación de entrada de datos, y las validaciones de campos son donde el análisis de valores límite genera más casos con más probabilidad de encontrar defectos: cada regla produce al menos un caso válido y uno inválido en cada borde.
- **HU-01 (movimiento)** tiene 6 casos pese a ser aparentemente simple, porque el avance continuo, el giro postergado y la dirección bloqueada son tres comportamientos distintos que un asistente de AI puede resolver de manera aproximada y plausible sin ser correcta.
- **HU-14 (contador de esferas)** y **HU-21 (barra espaciadora inerte)** tienen un caso cada una: son requerimientos de una sola regla, y ese caso cubre todos sus criterios.
- Las épicas de mayor riesgo de la sección 9.4 (E1 y E2, que reúnen movimiento, colisiones y PowerUp) concentran 33 de los 66 casos de la V1, la mitad del total.

### 11.3 Cobertura inversa

No hay casos de prueba sin historia de usuario asociada. Un caso sin requerimiento que lo justifique verificaría una expectativa del equipo y no una condición acordada, y su resultado no sería atribuible a un defecto.

---

## 12. Reporte de ejecución de casos de prueba

> **Estado de esta sección.** Contiene el instrumento de reporte con sus métricas definidas. Los valores se completan con los resultados de la ejecución del primer ciclo sobre la V1.

### 12.1 Identificación del ciclo de ejecución

| Dato | Valor |
|---|---|
| Ciclo de ejecución | Nº 1 |
| Versión bajo prueba | V1 |
| Commit | `[hash del commit]` |
| Entorno | `[URL de despliegue]` |
| Navegador y versión | `[completar]` |
| Fecha de inicio | `[completar]` |
| Fecha de cierre | `[completar]` |
| Ejecutores | Rodriguez Castro, Tsai |

### 12.2 Estados de ejecución

| Estado | Definición |
|---|---|
| **Aprobado** | Todos los aspectos del resultado esperado se cumplieron |
| **Fallido** | Al menos un aspecto del resultado esperado no se cumplió. Genera un defecto asociado |
| **Bloqueado** | No se pudo ejecutar porque un defecto previo impide alcanzar las precondiciones |
| **No ejecutado** | No se ejecutó en este ciclo por decisión de priorización o falta de tiempo |
| **No aplica** | La funcionalidad no está presente en la versión bajo prueba |

### 12.3 Registro de ejecución

*Una fila por caso ejecutado. La planilla operativa está en Google Sheets, hoja `Ejecución`; esta tabla consolida su estado al cierre del ciclo.*

| CP | HU | Prioridad | Estado | Ejecutor | Fecha | Defecto asociado | Observaciones |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

### 12.4 Resumen cuantitativo

| Métrica | Valor |
|---|---|
| Casos diseñados para la V1 | 66 |
| Casos ejecutados | `[ ]` |
| Casos aprobados | `[ ]` |
| Casos fallidos | `[ ]` |
| Casos bloqueados | `[ ]` |
| Casos no ejecutados | `[ ]` |

| Indicador | Fórmula | Valor |
|---|---|---|
| Avance de la ejecución | Ejecutados / Diseñados | `[ ] %` |
| Tasa de aprobación | Aprobados / Ejecutados | `[ ] %` |
| Tasa de fallo | Fallidos / Ejecutados | `[ ] %` |
| Cobertura de prioridad Alta | Ejecutados de prioridad Alta / 35 | `[ ] %` |
| Densidad de defectos | Defectos detectados / Casos ejecutados | `[ ]` |

### 12.5 Resultados por épica

| Épica | Diseñados | Ejecutados | Aprobados | Fallidos | Bloqueados | Tasa de aprobación |
|---|---|---|---|---|---|---|
| E1 — Núcleo de juego y movimiento | 17 | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| E2 — PowerUp e interacción con fantasmas | 16 | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| E3 — Vidas, puntaje y fin de partida | 13 | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| E4 — Niveles y progresión | 16 | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| E5 — Control de la partida | 4 | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| **Total** | **66** | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

La tasa de aprobación por épica es la métrica que permite verificar o corregir el análisis de riesgos de la sección 9.4: si el riesgo estimado fue acertado, las épicas E1 y E2 deberían mostrar las tasas de aprobación más bajas. Una épica evaluada como de riesgo bajo que resulte con una tasa de fallo alta indica que el análisis de riesgos subestimó su complejidad, y obliga a ampliar la cobertura de casos sobre ella (*defect clustering*).

### 12.6 Evaluación de los criterios de salida

| Criterio de salida | Estado | Observación |
|---|---|---|
| 100 % de los casos de prioridad Alta ejecutados | `[ ]` |  |
| Sin defectos abiertos de severidad Bloqueante o Crítica | `[ ]` |  |
| Defectos Mayores abiertos con decisión registrada | `[ ]` |  |
| Casos no ejecutados declarados con su motivo | `[ ]` |  |
| Reportes consolidados | `[ ]` |  |

### 12.7 Casos no ejecutados y motivos

| CP | Prioridad | Motivo de la no ejecución | Ciclo previsto |
|---|---|---|---|
|  |  |  |  |

### 12.8 Conclusiones de la ejecución

*A completar al cierre del ciclo.* Puntos a cubrir:

- Estado general de la calidad de la V1 respecto de sus requerimientos.
- Áreas con mayor concentración de defectos y comparación con el riesgo estimado en la sección 9.4.
- Casos que resultaron ambiguos al ejecutarse y requirieron reformulación, con la reformulación aplicada.
- Impedimentos que afectaron la ejecución.
- Ajustes a introducir en el próximo ciclo.

---

## 13. Reporte de defectos

> **Estado de esta sección.** Contiene los criterios de clasificación y la plantilla de reporte. Los defectos se cargan a medida que la ejecución los detecta.

### 13.1 Criterios de clasificación

**Severidad** — magnitud del impacto técnico del defecto sobre el producto:

| Severidad | Criterio | Ejemplo en este proyecto |
|---|---|---|
| **Bloqueante** | Impide usar la aplicación o continuar probando | El juego no carga; el nivel 1 no se puede completar |
| **Crítica** | Una funcionalidad principal no funciona y no hay forma de sortearla | Pacman atraviesa los muros; el contacto con un fantasma no descuenta vidas |
| **Mayor** | Una funcionalidad no se comporta según lo especificado, con impacto claro sobre el juego | El PowerUp dura 15 segundos en lugar de 8; la escala de puntos no se reinicia |
| **Menor** | Comportamiento incorrecto de impacto limitado | El contador de esferas restantes muestra un valor desfasado en 1 |
| **Trivial** | Defecto cosmético que no afecta la funcionalidad | La paleta del nivel 2 no coincide exactamente con la especificada |

**Prioridad** — urgencia de la corrección, decidida por el equipo:

| Prioridad | Criterio |
|---|---|
| **Alta** | Se corrige antes de continuar con la ejecución del ciclo |
| **Media** | Se corrige dentro de la versión en curso |
| **Baja** | Se difiere a una versión posterior, con la decisión registrada |

Severidad y prioridad son independientes. Un defecto trivial puede ser de prioridad Alta si es el único que impide cerrar la versión; un defecto Mayor puede ser de prioridad Baja si afecta un caso de borde que el jugador difícilmente alcance. El registro de ambas por separado es lo que permite discutir la corrección sobre datos y no sobre impresiones.

### 13.2 Estados del ciclo de vida de un defecto

| Estado | Significado |
|---|---|
| **Nuevo** | Reportado, sin revisar |
| **Confirmado** | Reproducido por un segundo integrante |
| **No reproducible** | No se pudo reproducir con los pasos indicados |
| **En corrección** | Asignado y en tratamiento |
| **Corregido** | Corrección aplicada y desplegada, pendiente de verificación |
| **Verificado** | Reejecutado el caso que lo detectó, con resultado Aprobado |
| **Diferido** | Corrección postergada a una versión posterior, con justificación |
| **Rechazado** | No constituye un defecto: el comportamiento observado es el especificado |

Todo defecto debe ser **confirmado por un integrante distinto del que lo reportó** antes de pasar a corrección. Un defecto no reproducible por otra persona suele indicar que faltan pasos o condiciones en el reporte, y corregir sobre un reporte incompleto lleva a arreglar algo distinto de lo que falla.

### 13.3 Plantilla de reporte de defectos

Cada defecto se registra con estos campos:

| Campo | Descripción |
|---|---|
| **ID** | Identificador único `DEF-nnn` |
| **Título** | Descripción del síntoma en una línea, específica y sin diagnóstico. "El PowerUp dura más de 8 segundos", no "problema con el PowerUp" |
| **Caso de prueba** | CP que lo detectó, o "Exploratoria" si surgió fuera de un caso diseñado |
| **HU** | Historia de usuario afectada |
| **Severidad** | Según la sección 13.1 |
| **Prioridad** | Según la sección 13.1 |
| **Estado** | Según la sección 13.2 |
| **Versión / commit** | Versión y hash del commit en que se detectó |
| **Entorno** | Navegador y versión, resolución |
| **Precondiciones** | Estado necesario para reproducirlo |
| **Pasos para reproducir** | Secuencia mínima y numerada que reproduce el defecto |
| **Resultado esperado** | Comportamiento especificado, con referencia al criterio de aceptación o al parámetro de la sección 4 |
| **Resultado obtenido** | Comportamiento efectivamente observado |
| **Reproducibilidad** | Siempre / Intermitente, con la frecuencia observada |
| **Evidencia** | Captura de pantalla o grabación |
| **Reportado por** | Integrante |
| **Confirmado por** | Integrante distinto del anterior |
| **Fecha** | Fecha de detección |

**Nota sobre los defectos intermitentes.** El comportamiento de los fantasmas es cíclico y el nivel 2 incorpora una probabilidad del 50 % en la reaparición, así que hay defectos que no se reproducen en todos los intentos. Un defecto intermitente **se reporta igual**, indicando la frecuencia observada (por ejemplo "3 de 10 intentos") y las condiciones en que apareció. Descartar lo no reproducible al primer intento haría perder justamente los defectos de las interacciones entre estados, que son los que la sección 9.4 identifica como de mayor riesgo.

### 13.4 Registro de defectos

*Una ficha por defecto detectado. La planilla operativa está en Google Sheets, hoja `Defectos`.*

**Ficha de ejemplo del formato a completar:**

```
DEF-nnn
Título:                [síntoma en una línea]
Caso de prueba:        CP-nnn
HU:                    HU-nn
Severidad:             [Bloqueante | Crítica | Mayor | Menor | Trivial]
Prioridad:             [Alta | Media | Baja]
Estado:                [Nuevo | Confirmado | ... ]
Versión / commit:      V1 / [hash]
Entorno:               [navegador y versión, resolución]
Precondiciones:        [estado previo necesario]
Pasos para reproducir: 1) ...
                       2) ...
Resultado esperado:    [según criterio de aceptación / sección 4]
Resultado obtenido:    [lo observado]
Reproducibilidad:      [Siempre | Intermitente, n de m intentos]
Evidencia:             [archivo o enlace]
Reportado por:         [integrante]
Confirmado por:        [otro integrante]
Fecha:                 [fecha]
```

### 13.5 Resumen de defectos

| Severidad | Nuevos | Confirmados | En corrección | Corregidos | Verificados | Diferidos | Rechazados | Total |
|---|---|---|---|---|---|---|---|---|
| Bloqueante | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Crítica | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Mayor | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Menor | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Trivial | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| **Total** | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

### 13.6 Distribución de defectos por épica

| Épica | Defectos | Bloqueante / Crítica | Mayor | Menor / Trivial | Riesgo estimado (sección 9.4) |
|---|---|---|---|---|---|
| E1 — Núcleo de juego y movimiento | `[ ]` | `[ ]` | `[ ]` | `[ ]` | Alto |
| E2 — PowerUp e interacción con fantasmas | `[ ]` | `[ ]` | `[ ]` | `[ ]` | Crítico |
| E3 — Vidas, puntaje y fin de partida | `[ ]` | `[ ]` | `[ ]` | `[ ]` | Crítico / Alto |
| E4 — Niveles y progresión | `[ ]` | `[ ]` | `[ ]` | `[ ]` | Alto / Medio |
| E5 — Control de la partida | `[ ]` | `[ ]` | `[ ]` | `[ ]` | Medio |

La última columna permite contrastar la distribución observada con el riesgo estimado antes de ejecutar, y es la base del análisis de defectos y del *post-mortem* previstos para el cierre del proyecto integrador.

### 13.7 Análisis preliminar de los defectos

*A completar al cierre del ciclo.* Puntos a cubrir:

- Distribución de los defectos por severidad y por épica.
- Contraste entre la distribución observada y el riesgo estimado en la sección 9.4.
- Relación entre los defectos encontrados y los prompts de la sección 8.4: qué defectos se originan en un requerimiento que el prompt no expresó con precisión, y cuáles en un requerimiento bien expresado que el agente implementó mal. Esta distinción es el aporte central de la entrega, porque separa los defectos atribuibles a la especificación de los atribuibles a la generación con AI.
- Defectos surgidos de pruebas exploratorias que ningún caso diseñado cubría, y qué casos nuevos se incorporan a partir de ellos.

---

## 14. Conclusiones y próximos pasos

### 14.1 Conclusiones de la Parte A

**Sobre la especificación de requerimientos.** El pasaje de la propuesta de la pre-entrega a historias de usuario con criterios de aceptación verificables expuso **13 puntos que no admitían un resultado pass/fail inequívoco**, dos de ellos contradicciones internas del propio documento (sección 5). Ninguna era evidente en la lectura del documento de propuesta: aparecieron al intentar escribir un resultado esperado con valor pass/fail. Es la constatación práctica del criterio visto en clase de que un requerimiento para el cual no se puede diseñar un caso de prueba no está listo para desarrollo.

La generación de la aplicación expuso **3 puntos más** (decisiones 14 a 16), que pasaron inadvertidos tanto en la revisión de los requerimientos como en el diseño de los casos de prueba. El más ilustrativo es el de las frutas del nivel 3: cada parámetro era correcto por separado, pero combinados hacían que el máximo de 2 frutas simultáneas nunca pudiera darse. Hay defectos de especificación que recién aparecen cuando los requerimientos se ejecutan.

Dos de esos hallazgos requerían decisiones de diseño, no solo de redacción: la ausencia de una pantalla de fin de partida en la V1 (que habría dejado la versión sin forma de reiniciar una partida) y la contradicción sobre el efecto de la fruta falsa del Naval. Ambos se habrían descubierto durante el desarrollo o, peor, después, y el costo de corregirlos habría sido mayor: **cuanto más tarde se detecta un defecto, más costoso es corregirlo**.

**Sobre la especificación de parámetros.** Concentrar los valores numéricos en una sección propia (sección 4) tuvo un efecto que no habíamos anticipado al planificarla: es la sección que se entrega al agente de AI como contexto, y cada valor que contiene es un valor que el agente no va a inventar por su cuenta. Un valor inventado por el modelo produce un caso de prueba que falla por discrepancia de especificación y no por un defecto real, y ese tipo de falso positivo consume tiempo de análisis sin aportar información sobre la calidad del producto.

### 14.2 Conclusiones de la Parte B

**Sobre el diseño de casos de prueba.** Se diseñaron 140 casos con cobertura del 100 % de las historias de usuario. La distribución no es uniforme y responde al análisis de riesgos: las épicas E1 y E2 concentran la mitad de los casos de la V1, porque reúnen las mecánicas donde interactúan varios estados y temporizadores.

La aplicación de las técnicas de diseño mostró rendimientos muy distintos según el tipo de requerimiento. El análisis de **valores límite** fue la más productiva en los requerimientos con parámetros numéricos: la última esfera del nivel, el segundo 8 del PowerUp, el borde entre 7 y 8 caracteres de contraseña. Las **tablas de decisión** fueron indispensables para la colisión Pacman-fantasma, donde el resultado depende de tres variables simultáneas (estado del PowerUp, tipo de fantasma y estado de gracia del espectro) y donde enumerar las combinaciones reveló casos que no habrían surgido de la lectura lineal de los criterios de aceptación, como el CP-057.

**Sobre lo que queda por verificar.** El diseño de casos de prueba tiene un límite que conviene declarar: verifica lo que los requerimientos especifican. Los defectos que consistan en comportamiento no especificado (algo que el juego hace y que nadie pidió) no serán detectados por estos 140 casos. Para eso están previstas las sesiones de prueba exploratoria de la sección 9.2, y en un producto generado con AI esperamos que su rendimiento sea alto, porque los asistentes tienden a agregar funcionalidad no solicitada.

### 14.3 Próximos pasos inmediatos

| # | Actividad | Responsable |
|---|---|---|
| 1 | ~~Ejecutar la sesión de vibe-coding de la V1 con los 9 prompts de la sección 8.4, registrando prompts y problemas en las tablas 8.5 y 8.6~~ **Completado**: incrementos 1 a 9 generados y registrados (8.5 y 8.6), y consultas de especificación resueltas (decisiones 14 a 16 de la sección 5) | Equipo completo |
| 2 | Desplegar la V1 en Vercel y registrar la URL y el commit bajo prueba | Savoia |
| 3 | Cargar los 66 casos de la V1 en la hoja `Casos de prueba` de Google Sheets | Cruz, Luzzi |
| 4 | Verificar los criterios de entrada de la sección 9.7 y ejecutar el primer ciclo sobre los 35 casos de prioridad Alta | Rodriguez Castro, Tsai |
| 5 | Reportar y confirmar los defectos detectados | Rodriguez Castro, Tsai, con confirmación cruzada |
| 6 | Ejecutar los casos de prioridad Media y Baja | Rodriguez Castro, Tsai |
| 7 | Consolidar las secciones 12 y 13 con los resultados | Savoia |

### 14.4 Actividades previstas para las entregas siguientes

- Detalle completo de los casos de prueba de la V2 a partir de la especificación sintética de la sección 10.4.
- Definición del conjunto de regresión de la V1 y su mutación, para contrarrestar la paradoja del pesticida.
- Evaluación de la automatización del conjunto de regresión, cuyo costo de ejecución manual se repite en cada versión.
- Análisis de los defectos encontrados y *post-mortem* de las actividades de testing, previsto para el cierre del proyecto integrador.

---

## 15. Anexos

### Anexo A — Prompts utilizados

Los prompts planificados están transcriptos en la sección 8.4. Los prompts de corrección que surjan durante la sesión de generación se transcriben acá, en orden cronológico, referenciados desde la columna correspondiente de la tabla 8.5.

**Sesión de generación de la V1.** Los nueve incrementos se generaron con los prompts 0 a 8 tal como están en la sección 8.4. Las correcciones registradas en la tabla 8.5 se resolvieron de alguna de estas cuatro maneras:

- Por edición manual del equipo (filas 1 a 4, incrementos 1 a 4).
- Por el propio agente dentro del mismo prompt, después de ejecutar sus scripts de verificación o una captura en el navegador (filas 5, 6, 9, 10 y 12, incrementos 6 a 9).
- Como decisión de especificación del equipo, registrada en la sección 5, sin cambio de código (filas 7, 8 y 13).
- Con un prompt de corrección del equipo (fila 14, prompt C-1, en respuesta a la fila 11).

#### C-1 — Intervalo de aparición de frutas en el nivel 3 (corrige la fila 11 de la tabla 8.5)

```
Con una fruta cada 20 segundos y 15 segundos de vida nunca coexisten 2 frutas,
así que el máximo de 2 simultáneas no se cumple en la práctica. Decidimos:
- Las frutas aparecen únicamente en el nivel 3; en los niveles 1 y 2 no hay.
- En el nivel 3 aparece una fruta cada 7 segundos (en lugar de 20).
- La vida de cada fruta sigue siendo 15 segundos y el máximo sigue siendo 2
  simultáneas: si al cumplirse los 7 segundos ya hay 2, esa aparición se omite.
Verificá que a los 14 s coexistan 2 frutas y que a los 21 s no aparezca una
tercera.
```

### Anexo B — Evidencia de la ejecución

Capturas y grabaciones de los casos fallidos y de los defectos reportados.

*A completar durante la ejecución.*

### Anexo C — Enlaces

| Recurso | Enlace |
|---|---|
| Repositorio de código | `[URL]` |
| Aplicación desplegada | `[URL]` |
| Planilla de casos de prueba, ejecución y defectos | `[URL de Google Sheets]` |
| Documento de la pre-entrega | `[URL]` |

### Anexo D — Referencia de identificadores

| Rango | Contenido |
|---|---|
| HU-01 a HU-21 | Historias de usuario de la V1 |
| HU-22 a HU-34 | Historias de usuario de la V2 |
| HU-35 a HU-42 | Historias de usuario de la V3 |
| CP-001 a CP-066 | Casos de prueba de la V1, con detalle completo |
| CP-067 a CP-105 | Casos de prueba de la V2, en formato sintético |
| CP-106 a CP-140 | Casos de prueba de la V3, en formato sintético |
| DEF-nnn | Defectos, numerados por orden de detección |
| E1 a E11 | Épicas |
