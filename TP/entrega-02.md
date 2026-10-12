# Proyecto Integrador de Testing de Aplicaciones
## Entrega 02 — GhostMan · Versión 2

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
| Planilla de casos de prueba y defectos | `[URL de Google Sheets]` |
| Documento de la Entrega 01 (V1) | [`TP/entrega-01.md`](entrega-01.md) |

---

## Índice

1. [Objetivo de la entrega](#1-objetivo-de-la-entrega)
2. [Punto de partida](#2-punto-de-partida)
3. [Alcance de la V2](#3-alcance-de-la-v2)
4. [Reglas de negocio y parámetros de la V2](#4-reglas-de-negocio-y-parámetros-de-la-v2)
5. [Decisiones sobre ambigüedades de la V2](#5-decisiones-sobre-ambigüedades-de-la-v2)
6. [Ajustes a las historias de usuario](#6-ajustes-a-las-historias-de-usuario)
7. [Implementación de la V2 con AI](#7-implementación-de-la-v2-con-ai)
8. [Estrategia de pruebas de la V2](#8-estrategia-de-pruebas-de-la-v2)
9. [Especificación de casos de prueba de la V2](#9-especificación-de-casos-de-prueba-de-la-v2)
10. [Matriz de trazabilidad](#10-matriz-de-trazabilidad)
11. [Reporte de ejecución de casos de prueba](#11-reporte-de-ejecución-de-casos-de-prueba)
12. [Reporte de defectos](#12-reporte-de-defectos)
13. [Conclusiones y próximos pasos](#13-conclusiones-y-próximos-pasos)
14. [Anexos](#14-anexos)

---

## 1. Objetivo de la entrega

Esta entrega documenta la construcción y la verificación de la **Versión 2** de GhostMan: el modo de juego **GhostMan** y los fantasmas especiales **Saltarín**, **Naval** y **Acelerado**. Sigue la misma estructura metodológica de la Entrega 01:

- Cierre de las ambigüedades de la especificación de la V2 **antes** de generar código (sección 5).
- Generación incremental con AI, con un prompt y un commit por incremento, y registro de los problemas de la sesión (sección 7).
- Detalle completo de los casos de prueba de la V2, que en la Entrega 01 quedaron en formato sintético (sección 9).
- Ejecución de los casos de la V2 y de la regresión de la V1, con su reporte de defectos (secciones 11 y 12).

Este documento **no repite** el contenido de la Entrega 01. Las historias de usuario de la V2 (HU-22 a HU-34) están en la sección 7.4 de `entrega-01.md`, y las reglas de la V1 en su sección 4. Acá se registra solo lo que la V2 agrega o modifica.

---

## 2. Punto de partida

### 2.1 Estado de la V1

La V1 está **cerrada**: generada (incrementos 1 a 9), desplegada en Vercel, con los 66 casos de prueba cargados, el ciclo 1 ejecutado y los defectos reportados. La V2 parte del commit en el que se ejecutó ese ciclo.

| Dato | Valor |
|---|---|
| Commit base de la V2 | `913ee4d` |
| Tag de referencia | `v1.0` |
| Casos de la V1 | CP-001 a CP-066 |

### 2.2 Flujo de despliegue

Los incrementos de la V2 se integran **directamente sobre `main`**, y cada push despliega en Vercel. En consecuencia:

- La URL de producción deja de mostrar la V1 a partir del primer incremento de la V2. Si hiciera falta reproducir o verificar un defecto de la V1 sobre la versión original, se usa el tag `v1.0` (o el *preview deployment* de Vercel de ese commit).
- Cada incremento de la V2 debe cerrar **compilando y jugable**, porque se publica apenas se hace el push. Un incremento a medio terminar en `main` es un incremento desplegado roto.
- El ciclo de pruebas de la V2 se ejecuta contra un commit concreto, que se registra en la sección 11.1. Durante la ejecución no se hacen pushes a `main` que no sean correcciones de defectos registrados.

---

## 3. Alcance de la V2

| Épica | Nombre | HU |
|---|---|---|
| E6 | Modo GhostMan | HU-22 a HU-27 |
| E7 | Poderes de los fantasmas | HU-28 a HU-32 |
| E8 | Dificultad del modo GhostMan | HU-33, HU-34 |
| E4 (ampliación) | Fantasmas especiales en el modo Pacman | **HU-43** (nueva, sección 6.2) |

**Por qué se agrega la HU-43.** La pre-entrega dice que los poderes "afectan la partida tanto cuando el jugador los controla como cuando los enfrenta", y la HU-17 restringe los fantasmas con poderes al espectro **solo en la V1**. Ninguna historia de la V2 especifica qué hacen el Saltarín, el Naval y el Acelerado cuando los controla la IA en el modo Pacman. Sin esa historia, ese comportamiento quedaría librado al agente (decisión 23). Se numera HU-43 para no alterar los identificadores de la V3 (HU-35 a HU-42), que son estables.

**Fuera de alcance de la V2:** cuentas, tableros de puntaje, skins y opciones (V3).

---

## 4. Reglas de negocio y parámetros de la V2

Esta sección **extiende** la sección 4 de la Entrega 01. Todo lo que no se redefine acá sigue vigente. Como en la V1, es la sección que se entrega completa al agente como contexto, y contra la que se calculan los resultados esperados.

> **Estado.** Los valores marcados con *(D-nn)* dependen de una decisión de la sección 5 que todavía está en estado **Propuesta**. Si el equipo cambia la decisión, hay que actualizar el valor acá.

### 4.1 Menú y navegación

| Elemento | Definición |
|---|---|
| Pantalla inicial | Menú principal con dos opciones: **Modo PacMan** y **Modo GhostMan** |
| Navegación del menú | Flechas ↑ ↓ o teclas W / S; Enter confirma. También clic con el mouse |
| Modo PacMan | Inicia la partida directamente (comportamiento de la V1) |
| Modo GhostMan | Abre el carrusel de selección de fantasma |
| Carrusel: orden | Clásico → Espectro → Saltarín → Naval → Acelerado (circular) *(D-30)* |
| Carrusel: selección inicial | Clásico *(D-30)* |
| Carrusel: navegación | Flechas ← → o teclas A / D; Enter confirma e inicia la partida; ESC vuelve al menú principal *(D-30)* |
| Pantallas de fin de partida | Ofrecen **Volver a jugar** (mismo modo y mismo fantasma, desde el nivel 1) y **Menú principal** *(D-29)* |

### 4.2 Estructura de la partida en modo GhostMan

| Parámetro | Valor |
|---|---|
| Niveles | 3, con los mismos mapas de la V1 |
| Personajes | Pacman (IA), el fantasma del jugador y **3 fantasmas de la IA** *(D-21)* |
| Fantasmas de la IA | Clásicos en los tres niveles, sin poderes *(D-21)* |
| Posición inicial del fantasma del jugador | Esquina superior izquierda (1,1), la que en la V1 ocupa el primer fantasma *(D-21)* |
| Vidas de Pacman | **3 por nivel**. Se muestran en el extremo inferior izquierdo con el ícono del fantasma del jugador *(D-18)* |
| Vidas del jugador de fantasma | No tiene vidas propias. Ser comido no tiene costo de vidas (HU-27) *(D-18)* |
| Derrota de Pacman (toque del fantasma del jugador sin PowerUp) | Pacman pierde una vida; el nivel se reinicia (sección 4.3) |
| Toque de un fantasma de la IA a Pacman sin PowerUp | Pacman vuelve a su posición inicial. **No** pierde una vida ni cuenta como derrota, y el resto del mapa no cambia *(D-19)* |
| Nivel completado | Pacman llega a 0 vidas en ese nivel (3 derrotas) |
| Victoria | Completar el nivel 3 |
| Derrota del jugador | Pacman consume todas las esferas del nivel (comunes, grandes y grandes dinámicas): Game Over |
| Transición entre niveles | 3 s mostrando el resultado del nivel, como en la V1 |
| Frutas reales del nivel 3 | Siguen apareciendo con las reglas de la V1. Pacman las consume, pero no dan puntos *(D-33)* |

### 4.3 Reinicio del nivel en modo GhostMan

Cuando el fantasma del jugador derrota a Pacman:

| Elemento | Qué pasa |
|---|---|
| Esferas consumidas | Se conservan (igual que la decisión 12 de la V1) |
| Esferas grandes dinámicas ya aparecidas y no consumidas | Se conservan |
| Posiciones | Todos los personajes vuelven a su posición inicial |
| PowerUp de Pacman | Se cancela |
| Cargas de destrucción de paredes | Se pierden |
| Paredes destruidas | Se restablecen (HU-33) |
| Frutas falsas en el mapa | Desaparecen sin explotar *(D-27)* |
| Cooldown del poder del jugador | **Se conserva** (lección de la fila 9 de la tabla 8.5 de la V1) *(D-28)* |
| Puntaje del jugador | Se conserva |

### 4.4 Puntaje en modo GhostMan *(D-20)*

| Elemento | Puntos |
|---|---|
| Derrota de Pacman producida por el fantasma del jugador | 500 |
| Al completar un nivel: cada esfera (común o grande) que quedó sin consumir | 10 |
| Ser comido por Pacman | 0 (sin penalidad) |
| Bonus por tiempo y bonus por vidas | No aplican en este modo |

La pantalla de fin de partida muestra el desglose en estas dos categorías: **Derrotas de Pacman** y **Esferas sin consumir**.

### 4.5 Tipos de fantasma: velocidades y reaparición

La velocidad del fantasma clásico es de 5 celdas por segundo, la misma que la de Pacman (V1).

| Tipo | Velocidad base | Reaparición al ser comido |
|---|---|---|
| Clásico | 5 celdas/s | 5 s |
| Espectro | 3,5 celdas/s (−30 %) | 5 s |
| Saltarín | 5 celdas/s | 5 s |
| Naval | 4 celdas/s (−20 %) | **8 s** |
| Acelerado | 5 celdas/s; 2,5 celdas/s durante los 5 s posteriores a un *dash* | 5 s |

### 4.6 Poderes de los fantasmas

**Reglas comunes a los cuatro poderes:**

| Regla | Definición |
|---|---|
| Activación (fantasma del jugador) | Barra espaciadora |
| Dirección de avance | Última dirección en la que se movió el fantasma. Un fantasma detenido contra una pared **conserva** esa dirección. Solo un fantasma que todavía no se movió desde su aparición carece de dirección de avance *(D-24)* |
| Activación que no produce efecto | Si el poder no puede producir efecto (espectro sin destino válido, *dash* bloqueado de entrada, Naval con 2 frutas en el mapa), **no se consume**: no arranca el cooldown ni se aplica la penalidad *(D-25)* |
| Con el fantasma comido | El poder no se puede activar mientras espera reaparecer (HU-27) |
| Con el PowerUp de Pacman activo | El poder se puede usar, pero el fantasma sigue vulnerable y no puede derrotar a Pacman |
| Inicio de un nivel nuevo | Todos los poderes arrancan disponibles |
| Reinicio del nivel por una derrota de Pacman | El cooldown en curso se conserva *(D-28)* |
| Pausa | Todos los temporizadores se detienen (HU-20) |

**Espectro**

| Parámetro | Valor |
|---|---|
| Efecto | Atraviesa la pared contigua en la dirección de avance |
| Pared atravesable | Un muro de **1 celda de espesor** con una celda transitable del otro lado, igual que en la V1 *(D-26)* |
| Bordes del mapa | Nunca se atraviesan |
| Cooldown | 10 s |
| Estado sin poder derrotar a Pacman | Durante el cruce y los 3 s posteriores, con diseño translúcido y contorno punteado (V1) |

**Saltarín**

| Parámetro | Valor |
|---|---|
| Efecto | Teletransporte instantáneo a una celda elegida al azar |
| Celdas candidatas | Celdas transitables a **distancia Manhattan ≤ 10** de la celda actual, distintas de la celda actual. Se incluyen las paredes destruidas y la celda de Pacman *(D-31)* |
| Distribución | Uniforme entre las candidatas |
| Cooldown | 10 s |
| Aterrizaje sobre Pacman sin PowerUp | Pacman pierde una vida (derrota) |
| Dirección tras el salto | Conserva la dirección de avance si la celda siguiente es transitable; si no, queda detenido |

**Naval**

| Parámetro | Valor |
|---|---|
| Efecto | Coloca una fruta falsa en la celda que ocupa |
| Máximo simultáneo | 2 frutas falsas |
| Cooldown entre colocaciones | 5 s |
| Celda que ya tiene una fruta falsa | No se coloca otra; el poder no se consume *(D-25)* |
| Pacman la consume sin PowerUp | Pierde una vida (en modo GhostMan cuenta como derrota producida por el jugador) |
| Pacman la consume con PowerUp | La fruta desaparece sin efecto y sin puntos *(D-27)* |
| Explosión | A los 10 s de colocada, si no fue consumida |
| Radio de la explosión | Celdas alcanzables desde la fruta en **3 pasos o menos por celdas transitables**. No atraviesa paredes *(D-27)* |
| A quién afecta la explosión | Solo a Pacman sin PowerUp, que pierde una vida. En modo GhostMan cuenta como derrota producida por el jugador, igual que el consumo. No afecta a ningún fantasma *(D-27; lo de la derrota es interpretación del agente, tabla 7.5 fila 19)* |
| Dos frutas que explotan en el mismo instante sobre Pacman | Una sola vida |
| Indicador visual | Distinguible de la fruta real (HU-30) y con una cuenta regresiva visible en los últimos 3 s antes de explotar |

**Acelerado**

| Parámetro | Valor |
|---|---|
| Efecto | Desplazamiento instantáneo de hasta 3 celdas en la dirección de avance |
| Pared en el trayecto | Se detiene en la última celda transitable |
| Primera celda bloqueada | No hay desplazamiento y el poder no se consume *(D-25)* |
| Contacto con Pacman | Se evalúa en **todo el trayecto**, no solo en la celda de llegada: pasar por encima de Pacman también lo derrota, aunque Pacman esté entre dos celdas *(D-32)*. Si el acelerado está vulnerable, el que es comido es él |
| Penalidad al reiniciarse el nivel o con el fantasma comido | Se conserva y sigue corriendo, igual que el cooldown *(D-36)* |
| Penalidad | Velocidad al 50 % (2,5 celdas/s) durante 5 s desde el *dash* |
| Cooldown | 10 s |

### 4.7 Comportamiento de la IA de Pacman (modo GhostMan) *(D-17)*

Pacman decide su dirección cada vez que llega al centro de una celda, con estas prioridades:

| Prioridad | Situación | Comportamiento |
|---|---|---|
| 1 | Hay un fantasma que puede dañarlo a **4 celdas de recorrido o menos** | Huye: elige la celda vecina transitable que maximiza la distancia de recorrido al fantasma peligroso más cercano. Puede invertir la marcha |
| 2 | PowerUp activo y hay un fantasma vulnerable a **8 celdas de recorrido o menos** | Persigue al fantasma vulnerable más cercano |
| 3 | Hay una fruta (real o falsa: la IA no las distingue) a **5 celdas de recorrido o menos** | Va hacia la fruta |
| 4 | Ninguna de las anteriores | Va hacia la esfera (común o grande) más cercana por recorrido |

- Velocidad: 5 celdas/s, igual que en la V1.
- "Fantasma que puede dañarlo" incluye al fantasma del jugador y a los de la IA, excepto los vulnerables, los comidos y el espectro en su estado sin poder derrotar.
- Desempate entre direcciones equivalentes: arriba, izquierda, abajo, derecha.
- **Pendiente (decisión 37):** la prioridad 3 (ir por frutas sin distinguir la falsa) se reemplazaría por una memoria de frutas con olvido. Mientras el equipo no la apruebe, rige la regla de esta tabla, que es la implementada.
- Con cargas de destrucción de paredes (sección 4.8), el cálculo de recorrido considera los muros interiores como transitables con un costo de 3 celdas cada uno.

**Nota de testabilidad** (igual que en la sección 4.7 de la V1): la IA de Pacman se prueba por comportamiento observable, no por la ruta exacta. Por ejemplo: ¿se aleja de un fantasma que se le acerca? ¿persigue fantasmas vulnerables durante el PowerUp? ¿termina completando el nivel si nadie lo molesta?

### 4.8 Dificultad del modo GhostMan

| Nivel | Capacidades de Pacman |
|---|---|
| 1 | Solo el PowerUp de comer fantasmas |
| 2 | Además, al consumir una esfera grande obtiene **5 cargas de destrucción de paredes** |
| 3 | Lo mismo que en el nivel 2, más esferas grandes adicionales fijas y dinámicas *(D-22)* |

**Destrucción de paredes *(D-22)*:**

| Parámetro | Valor |
|---|---|
| Cargas por esfera grande | 5. Consumir otra esfera grande con cargas restantes las repone a 5 (no se acumulan) |
| Duración | Las cargas se pierden al terminar el PowerUp (8 s) |
| Cómo se destruye | Al avanzar hacia un muro interior, Pacman lo destruye: la celda queda transitable y sin esfera, y se consume una carga |
| Muros del borde del mapa | Indestructibles |
| Efecto visual | Destello o escombros sobre la celda durante 0,5 s |
| Pared destruida | Transitable para todos los personajes hasta que el nivel se reinicia o termina |
| Modo Pacman | Este poder **no existe** en el modo Pacman |

**Esferas grandes en el nivel 3 del modo GhostMan *(D-22)*:**

| Parámetro | Valor |
|---|---|
| Esferas grandes fijas | 6: las 4 esquinas de la V1 más (7,1) y (7,15) |
| Aparición dinámica | Una cada 15 s en una celda transitable al azar, sin esfera y sin personaje |
| Máximo de esferas grandes dinámicas simultáneas | 2. Si al cumplirse los 15 s ya hay 2, esa aparición se omite |
| Vencimiento | No desaparecen: cuentan para completar el nivel (HU-34) |

### 4.9 Fantasmas especiales en el modo Pacman (HU-43) *(D-23)*

| Nivel | Composición |
|---|---|
| 1 | Sin cambios: cuatro clásicos, y los comidos reaparecen siempre como clásicos |
| 2 | Arrancan los cuatro como clásicos. Un fantasma comido reaparece con poderes con un 50 % de probabilidad, y en ese caso el tipo se elige **al azar y en forma uniforme** entre espectro, saltarín, naval y acelerado |
| 3 | Arranca **uno de cada tipo con poderes** (espectro, saltarín, naval y acelerado). Los comidos reaparecen con un tipo con poderes al azar |

**Uso de los poderes por la IA:**

| Tipo | Cuándo lo usa la IA |
|---|---|
| Espectro | Sin cambios respecto de la V1 |
| Saltarín | En persecución, con el poder disponible, si Pacman está a distancia Manhattan ≤ 10 |
| Naval | En persecución o dispersión, con el poder disponible, si hay menos de 2 frutas falsas y en su celda no hay una |
| Acelerado | En persecución, con el poder disponible, si Pacman está a distancia Manhattan ≤ 6 y la celda siguiente en su dirección es transitable |

Los fantasmas de la IA no usan poderes mientras son vulnerables. Los parámetros de cada poder son los de la sección 4.6.

---

## 5. Decisiones sobre ambigüedades de la V2

La numeración continúa la de la Entrega 01 (decisiones 1 a 16). Se aplicó el mismo criterio: cada punto que no permitía escribir un resultado esperado pass/fail se resuelve **antes** de generar código. La lección central de la V1 (sección 8.6 de la Entrega 01) es que el agente acierta en lo que se le pide de forma explícita y en lo implícito rellena con lo más simple. Por eso, cada decisión de esta tabla es una interacción que de otro modo nadie habría escrito.

**Estados:**
- *Implementada*: aplicada en el código con el aval de quien condujo la sesión de generación. El equipo todavía puede modificarla; en ese caso pasa a *Modificada* y se registra el cambio.
- *Propuesta · implementada*: el código ya la refleja, pero nadie la avaló. Si el equipo la cambia, hay que corregir el código.
- *Propuesta · sin implementar*: el código no la refleja.
- *Aprobada* · *Modificada*: después de la revisión del equipo.

| # | Ambigüedad o contradicción detectada | Decisión propuesta | Fundamento | Estado |
|---|---|---|---|---|
| 17 | El comportamiento de la IA de Pacman no está descripto en ningún lugar, y es el adversario de todo el modo GhostMan | Prioridades de la sección 4.7: huir de fantasmas a ≤ 4 celdas, perseguir vulnerables a ≤ 8 celdas, ir por frutas a ≤ 5 celdas, y si no, ir a la esfera más cercana | Es el equivalente de la decisión 7 de la V1. Un Pacman que solo busca esferas se deja atrapar enseguida y un Pacman que solo huye nunca completa el nivel: en los dos casos el modo pierde sentido. Que la IA no distinga la fruta falsa de la real es lo que hace que el poder del Naval funcione como trampa | Implementada |
| 18 | La sección 2 dice que el jugador tiene 3 vidas "en cualquiera de los dos modos", pero la HU-27 dice que ser comido no le descuenta vidas al jugador de fantasma. Nada le resta vidas en modo GhostMan. Además, la HU-25 habla de "descontarle una vida" a Pacman sin decir cuántas tiene | En modo GhostMan las 3 vidas son **de Pacman, por nivel**. El contador del extremo inferior izquierdo muestra las vidas restantes de Pacman con el ícono del fantasma del jugador, y cumple a la vez la función de contador de derrotas (HU-25) e identificador del modo (HU-22). El jugador de fantasma no tiene vidas propias | Es la única lectura en la que las HU-22, HU-25, HU-26 y HU-27 no se contradicen. 3 vidas por nivel coincide con las "3 derrotas para completar el nivel" | Implementada |
| 19 | La HU-25 dice que las derrotas producidas por los fantasmas de la IA no cuentan, pero no dice qué pasa cuando uno de ellos toca a Pacman | Pacman vuelve a su posición inicial. No pierde una vida, no cuenta como derrota y el resto del mapa no cambia | Si el toque no tuviera ningún efecto, los fantasmas de la IA serían decorativos. Si reiniciara el nivel, la IA haría el trabajo del jugador y le movería el fantasma sin que lo pida. Devolver a Pacman a su posición inicial lo demora, que es útil para el jugador, sin restarle el mérito de la derrota | Implementada |
| 20 | La HU-26 muestra "el puntaje obtenido" en modo GhostMan, pero la sección 4.2 de la V1 solo define el puntaje del modo Pacman | 500 por derrota de Pacman producida por el jugador y 10 por cada esfera sin consumir al completar el nivel (sección 4.4) | Sin valores no hay resultado esperado para el puntaje de este modo, y en la V3 este puntaje alimenta un tablero propio. Las esferas sin consumir premian derrotar a Pacman rápido, que es el equivalente del bonus por tiempo del modo Pacman | Implementada |
| 21 | La sección 4.5 define la progresión de Pacman en modo GhostMan, pero no de qué tipo son los otros 3 fantasmas ni si usan poderes | Clásicos sin poderes en los tres niveles. El fantasma del jugador ocupa la posición del primer fantasma de la V1 (1,1) | La dificultad de este modo crece del lado de Pacman (sección 4.5). Si los fantasmas de la IA tuvieran poderes, la partida dependería más de ellos que del jugador, y los casos de prueba de los poderes del jugador serían difíciles de aislar | Implementada |
| 22 | La HU-33 no dice cuánto dura el poder de destruir paredes, cómo decide la IA cuándo usarlo ni si se pueden romper los bordes. La HU-34 no da cantidades ni intervalos para las esferas grandes del nivel 3 | Valores de la sección 4.8: 5 cargas que duran lo que el PowerUp, bordes indestructibles, 6 esferas grandes fijas y una dinámica cada 15 s con máximo 2 | Atar las cargas al PowerUp da un único temporizador observable en lugar de dos. Los bordes indestructibles evitan que un personaje salga del mapa. Las dinámicas no vencen porque cuentan para completar el nivel: si vencieran, la condición de finalización cambiaría sola | Implementada |
| 23 | Ninguna HU define el comportamiento del Saltarín, el Naval y el Acelerado controlados por la IA en el modo Pacman, aunque la pre-entrega dice que los poderes afectan la partida "cuando el jugador los enfrenta" | Se agrega la HU-43 con las reglas de la sección 4.9: en el nivel 2, reaparición con un tipo con poderes al azar; en el nivel 3, uno de cada tipo; uso de los poderes según condiciones simples | Uno de cada tipo en el nivel 3 hace la composición determinista y verificable por observación. **Impacto en la V1:** cambia el resultado esperado de los CP-052 y CP-053 y la precondición de los CP-054 a CP-059 (sección 8.2) | Implementada |
| 24 | "Dirección de avance" (HU-28 y HU-31) no está definida para un fantasma del jugador que está detenido contra una pared | Es la última dirección de movimiento, que se conserva aunque el fantasma esté detenido. Solo carece de dirección un fantasma que todavía no se movió desde que apareció | Detenerse contra un muro y atravesarlo es el uso natural del espectro. Con esta definición, el criterio "sin dirección de avance" de la HU-31 tiene un único caso posible y verificable: recién aparecido | Implementada |
| 25 | No se dice si un poder que no puede producir efecto (espectro sin destino, *dash* contra una pared, tercera fruta falsa) consume el cooldown | No lo consume: no arranca el cooldown ni se aplica la penalidad | La HU-28 dice que la habilidad "no puede usarse" en esos casos, y un intento que no puede usarse no es un uso. Hace que la HU-32 ("el espacio sin efecto no cambia el estado del juego") sea coherente para todos los tipos | Implementada |
| 26 | Los muros interiores del mapa del nivel 1 tienen 2 a 4 celdas de espesor, y el espectro atraviesa "una sola pared" (HU-18, CP-055). Elegido por el jugador, el espectro **no tiene ningún cruce válido en el nivel 1** | Se mantiene la regla de la V1 (muro de 1 celda) y se acepta que en el nivel 1 del modo GhostMan el poder del espectro no tiene destino válido. Se informa en la descripción del carrusel | Modificar el mapa del nivel 1 o la regla del espectro invalida casos de la V1 ya ejecutados (CP-055 y CP-058). **Alternativa a decidir por el equipo:** permitir muros de hasta 2 celdas de espesor, lo que habilita los cruces verticales del nivel 1 pero obliga a revisar esos casos | Implementada (con una alternativa pendiente de decisión) |
| 27 | La sección 4.8 de la V1 no define la métrica del radio de la explosión, si la explosión afecta a los fantasmas, qué pasa con la fruta falsa si Pacman la come con PowerUp ni qué pasa con las frutas al reiniciarse el nivel | Radio = celdas alcanzables en ≤ 3 pasos por celdas transitables. Solo afecta a Pacman. Comida con PowerUp, la fruta desaparece sin efecto. Al reiniciarse el nivel, las frutas falsas desaparecen sin explotar | La distancia por recorrido es la única métrica en la que "no atraviesa paredes" tiene un significado inequívoco. Si las frutas sobrevivieran al reinicio, podrían explotar sobre Pacman recién reaparecido, sin que pueda evitarlo | Implementada |
| 28 | No se define qué pasa con el cooldown del poder del jugador cuando se reinicia el nivel o se pasa al siguiente | El cooldown se conserva al reiniciarse el nivel y se repone al empezar un nivel nuevo | La fila 9 de la tabla 8.5 de la V1 muestra que el agente tiende a reiniciar todo. Conservarlo en el reinicio evita que derrotar a Pacman recargue el poder | Implementada |
| 29 | Con un menú de modo, no está claro si "volver a jugar" (HU-19) repite el mismo modo o vuelve al menú | La pantalla de fin de partida ofrece las dos acciones: **Volver a jugar**, que repite el mismo modo con el mismo fantasma desde el nivel 1, y **Menú principal** | Conserva el comportamiento verificado por los CP-060 a CP-062 de la V1 y agrega la salida que la HU-22 hace necesaria | Implementada |
| 30 | La HU-23 no define el orden del carrusel, el elemento inicial ni cómo volver sin elegir | Orden Clásico → Espectro → Saltarín → Naval → Acelerado, inicial Clásico, ESC vuelve al menú | Sin un elemento inicial definido, los casos de navegación (CP-071) no tienen punto de partida reproducible | Implementada |
| 31 | "Radio de 10 celdas" del Saltarín (HU-29) admite distancia euclídea, Manhattan o por recorrido | Distancia Manhattan ≤ 10, a cualquier celda transitable distinta de la actual | Es la métrica que un ejecutor puede verificar contando celdas en pantalla. La distancia por recorrido no la puede verificar a ojo | Implementada |
| 32 | La HU-31 solo considera que el *dash* "termine" sobre Pacman. Un *dash* que pasa por encima de Pacman y termina más adelante no está cubierto | El contacto se evalúa en cada celda recorrida | Es el mismo problema de la fila 6 de la tabla 8.5 de la V1: dos personajes que intercambian posiciones sin que se detecte el contacto. Se especifica ahora para que no se repita | Implementada |
| 33 | *(Detectada durante la generación, tabla 7.5, fila 4.)* El nivel 3 genera frutas reales cada 7 s (decisión 16), pero no se dice si eso pasa también en el modo GhostMan, donde Pacman no suma puntos | En el nivel 3 del modo GhostMan las frutas reales siguen apareciendo con las reglas de la V1. Pacman las consume, pero no otorgan puntos a nadie | Las frutas reales son las que le dan sentido a la trampa del Naval: si la IA de Pacman va por cualquier fruta cercana (decisión 17), una fruta falsa se confunde con una real. Si en este modo no hubiera frutas reales, cualquier fruta en el mapa sería falsa y la trampa no engañaría a nadie, ni al ejecutor ni al jugador | Propuesta · implementada |
| 34 | *(Detectada durante la generación, tabla 7.5, fila 10.)* Combinadas, las decisiones 17, 19 y 21 permiten que **un jugador que no toca ninguna tecla gane la partida**. El fantasma del jugador aparece sobre la esfera grande de (1,1) y, si no se mueve, la custodia. Pacman tiene que ir a buscarla, y los fantasmas de la IA lo encierran contra él en el pasillo de la columna 1. En 5 simulaciones con el jugador quieto: 2 victorias (a los 270 y 296 s) y 3 Game Over (a los 280 s aprox.) | **Opción A (recomendada):** aceptarlo. Que los fantasmas de la IA arrinconen a Pacman contra el del jugador es colaboración entre aliados, y un jugador activo gana mucho antes (sección 7.6). **Opción B:** que en modo GhostMan la celda de aparición del fantasma del jugador no tenga esfera, lo que cambia la cuenta de esferas y la decisión 22. Ninguna de las dos se implementa hasta que el equipo decida | Igual que la decisión 16: cada regla es correcta por separado y el problema aparece al combinarlas en el tiempo. Lo detectó la simulación, no la revisión de las reglas | Propuesta · el código refleja la opción A |
| 35 | *(Detectada durante la generación, tabla 7.5, filas 12 y 13.)* (a) La regla del espectro habla de "la pared contigua en la dirección de avance", pero no dice qué pasa si el jugador presiona la barra espaciadora **a mitad de camino** entre dos celdas. (b) La HU-32 dice que la estrella indica que "el poder está disponible", pero no aclara qué muestra mientras el fantasma está comido, cuando el cooldown puede haber terminado pero el poder no se puede usar | (a) En movimiento, el muro que cuenta es el contiguo a la celda **a la que está llegando**: el espectro termina de llegar y lo cruza sin obedecer el teclado en ese trayecto, que dura como máximo una celda. Durante ese tramo todavía puede derrotar a Pacman. (b) La estrella refleja **solo el cooldown**, también mientras el fantasma está comido | (a) Exigir que el jugador esté exactamente en el centro de la celda haría que la tecla funcionara o no según el instante, sin que el jugador lo pueda ver. (b) Así la estrella cumple el criterio "vuelve al estado disponible exactamente al terminar el cooldown" sin depender de otro estado. Que el fantasma comido no pueda usar el poder ya lo indica la cuenta de reaparición en pantalla | Propuesta · implementada |
| 36 | *(Detectada durante la generación, tabla 7.5, fila 20.)* La HU-31 y la sección 4.6 definen la penalidad de velocidad del acelerado (50 % durante 5 s), pero no dicen qué pasa con ella si Pacman es derrotado y el nivel se reinicia, si el fantasma es comido, ni desde qué celda arranca un dash activado a mitad de camino | La penalidad sigue las mismas reglas que el cooldown (decisiones 28 y 35 b): se conserva al reiniciarse el nivel, sigue corriendo mientras el fantasma está comido y se repone al empezar un nivel nuevo. Un dash activado a mitad de camino arranca desde la celda que el fantasma ocupa visualmente (la más cercana), igual que el salto del saltarín | Tratar igual a los dos temporizadores del poder evita que una derrota de Pacman o ser comido sirvan para "limpiar" la penalidad, y da un único criterio para los casos de prueba | Propuesta · implementada |
| 37 | *(Detectada al medir el balance, sección 7.6.)* Con la decisión 17, la IA de Pacman va por cualquier fruta a 5 celdas o menos y no distingue la falsa de la real. Por eso el naval que usa su poder gana 10 de 10 partidas: la trampa casi nunca falla y deja de ser una decisión del jugador | **Opción A (propuesta por D. Savoia en la sesión):** Pacman lleva una **memoria interna de las frutas reales**. Conoce cuántas hay en el mapa (n) y recuerda la ubicación de x de ellas. Cada segundo, cada ubicación recordada se olvida con una probabilidad baja (*p*, valor a definir; propuesta: 5 % por segundo, una vida media de unos 14 s). Una fruta cuya ubicación no recuerda y que no explica ninguna fruta olvidada, es decir con x = n, **sabe que es falsa y no la toca**. Si olvidó alguna (x < n), una fruta desconocida puede ser una de las reales olvidadas: la trata como real y **puede caer en la trampa**. **Consecuencia a considerar:** en modo GhostMan las frutas reales aparecen solo en el nivel 3 (decisión 33). En los niveles 1 y 2, n = 0, así que Pacman **nunca** cae en una fruta falsa y al naval le queda solo la explosión. **Opción B (variante de la A):** la memoria es de las **frutas falsas**. Pacman registra una fruta falsa si la ve colocar a 8 celdas de recorrido o menos, y la olvida con la misma probabilidad *p* por segundo. Una fruta que no recuerda la trata como real. Funciona en los tres niveles y le da juego al naval: colocar las frutas fuera de la vista de Pacman. **En las dos opciones:** la fruta que Pacman sabe falsa la evita como si fuera un muro al calcular recorridos, pero no se aleja del radio de la explosión. Si la única ruta a las esferas pasa por esa celda, espera a que la fruta explote | La trampa tiene que depender de algo que el jugador pueda aprovechar, no de un umbral fijo. **Testabilidad:** el olvido es aleatorio y tiene que usar la fuente de azar inyectable del juego (`random`), para poder fijarla en los scripts de verificación. En la prueba manual, el caso determinista de la opción A es "en los niveles 1 y 2, Pacman nunca consume una fruta falsa". El de la opción B es "una fruta colocada a la vista de Pacman no la consume mientras la recuerde" | Propuesta · sin implementar |
| 38 | *(Detectada al medir el balance, sección 7.6.)* Usar el poder del saltarín empeora sus resultados (de 10 a 1 victoria en 10 partidas del bot), porque el destino es uniforme dentro del radio y lo aleja de Pacman tantas veces como lo acerca. Así el poder no vale la pena | Opciones a decidir por el equipo. **A: salto hacia adelante.** El destino sigue siendo al azar, pero solo entre las celdas del radio que quedan en el semiplano de la dirección de avance. El jugador elige hacia dónde saltar, no a qué celda: hay habilidad sin que el destino sea elegible. **B: salto hacia Pacman.** El destino es al azar entre las celdas del radio que están más cerca de Pacman (por recorrido) que la celda actual: el salto nunca lo aleja. **C: cooldown más corto** (por ejemplo, 5 s) sin cambiar el azar, para compensar con más usos. **Recomendación:** la A. Es la que mejor conserva la idea de la pre-entrega ("el destino no es elegible") y premia al jugador que sabe usarla. La B no requiere habilidad, y la C no cambia que la mitad de los saltos sean en contra | Cualquiera de las tres cambia la HU-29 y la decisión 31, y el resultado esperado de los CP-087 y CP-089. El incremento 16 usa la misma implementación para la IA del modo Pacman, así que conviene decidir antes de ejecutarlo | Propuesta · sin implementar |

---

## 6. Ajustes a las historias de usuario

### 6.1 Cambios a historias existentes

Si se aprueban las decisiones de la sección 5, estos criterios de aceptación de `entrega-01.md` cambian. Se modifican en el documento de la Entrega 01 una vez aprobadas, y se registran acá para la trazabilidad.

| HU | Criterio actual | Criterio ajustado | Decisión |
|---|---|---|---|
| HU-17 | "En la V1 el único tipo con poderes disponible es el espectro: los fantasmas que reaparecen con poderes en el nivel 2 son espectros" | "Los fantasmas que reaparecen con poderes en el nivel 2 son de un tipo elegido al azar entre espectro, saltarín, naval y acelerado" | 23 |
| HU-19 | "Ambas pantallas ofrecen la acción de volver a jugar" | Se agrega: "y la acción de volver al menú principal. Volver a jugar repite el modo y, en modo GhostMan, el fantasma elegido" | 29 |
| HU-22 | "El modo en curso es identificable durante la partida por el ícono del contador de vidas" | Se agrega: "En modo GhostMan el contador muestra las vidas restantes de Pacman en el nivel, con el ícono del fantasma del jugador" | 18 |
| HU-25 | "El contador de derrotas de Pacman en el nivel se muestra en pantalla" | "El contador de vidas de Pacman en el nivel (3 a 0) se muestra en pantalla y funciona como contador de derrotas" | 18 |
| HU-25 | "Solo cuentan las derrotas producidas por el fantasma del jugador" | Se agrega: "El toque de un fantasma de la IA devuelve a Pacman a su posición inicial sin descontarle vidas" | 19 |
| HU-30 | — | Se agrega: "Si Pacman consume una fruta falsa con el PowerUp activo, la fruta desaparece sin efecto" y "Si Pacman pierde una vida por una fruta falsa en modo GhostMan, cuenta como derrota producida por el jugador" | 27 |
| HU-29 | "La barra espaciadora teletransporta al fantasma a una celda aleatoria dentro de un radio de 10 celdas" y "El destino no es elegible ni predecible por el jugador" | *Pendiente de la decisión 38.* Con la opción A: "...a una celda aleatoria dentro de un radio de 10 celdas, en el semiplano de su dirección de avance" y "La celda de destino no es elegible por el jugador" | 38 |
| HU-30 | — | *Pendiente de la decisión 37.* Se agregaría un criterio sobre cuándo la IA de Pacman reconoce una fruta falsa | 37 |

### 6.2 Historia nueva

---

**HU-43 · Enfrentar al Saltarín, al Naval y al Acelerado en el modo Pacman**
*Épica: E4 · Versión: V2 · Prioridad: Alta*

> **Como** jugador de Pacman
> **quiero** enfrentar a los cuatro tipos de fantasma con poderes en los niveles 2 y 3
> **para** que cada nivel me exija adaptarme a habilidades distintas.

**Criterios de aceptación:**
- En el nivel 2, un fantasma que reaparece con poderes puede ser de cualquiera de los cuatro tipos con poderes.
- El nivel 3 inicia con un fantasma de cada tipo con poderes: espectro, saltarín, naval y acelerado.
- Cada tipo es visualmente distinguible de los demás.
- El saltarín de la IA se teletransporta según las reglas de la sección 4.6 cuando Pacman está a distancia Manhattan ≤ 10.
- El naval de la IA coloca frutas falsas respetando el máximo de 2 y el cooldown de 5 s.
- El acelerado de la IA ejecuta *dashes* respetando el cooldown de 10 s y la penalidad de velocidad.
- Ningún fantasma de la IA usa su poder mientras está vulnerable.
- El nivel 1 no cambia respecto de la V1.

---

---

## 7. Implementación de la V2 con AI

### 7.1 Estrategia de generación

Se mantiene la estrategia de la V1: **incrementos verificables**, un prompt por incremento y un commit por incremento. La numeración continúa la de la V1. Como `main` se despliega en cada push (sección 2.2), cada incremento debe cerrar compilando, con `npm run build` y `npm run lint` sin errores, y con el modo Pacman jugable.

| # | Incremento | HU cubiertas | Criterio de avance |
|---|---|---|---|
| 10 | Menú principal, carrusel y fantasma controlado por el jugador | HU-22, HU-23, HU-24 (control) | Desde el menú se llega a una partida en la que el jugador mueve al fantasma elegido; el modo Pacman funciona igual que en la V1 |
| 11 | IA de Pacman y fantasmas de la IA del modo GhostMan | HU-24 | Pacman recorre el mapa solo, consume esferas, huye de los fantasmas y, sin interferencia, completa el nivel 1 |
| 12 | Reglas del modo GhostMan: derrotas, vulnerabilidad, puntaje y cierre | HU-25, HU-26, HU-27 | Se completa un nivel con 3 derrotas, se pierde si Pacman consume todas las esferas y el desglose coincide con la sección 4.4 |
| 13 | Espectro y Saltarín jugables, e indicador de poder | HU-28, HU-29, HU-32 | Los dos poderes funcionan con la barra espaciadora y la estrella refleja el cooldown |
| 14 | Naval jugable | HU-30 | Ciclo completo de la fruta falsa: colocación, consumo, explosión a los 10 s y límites |
| 15 | Acelerado jugable | HU-31 | *Dash* de hasta 3 celdas, detención ante paredes y penalidad de 5 s |
| 16 | Fantasmas especiales en el modo Pacman | HU-43 | Composición de los niveles 2 y 3 según la sección 4.9, y uso de los poderes por la IA |
| 17 | Dificultad del modo GhostMan | HU-33, HU-34 | Destrucción de paredes en los niveles 2 y 3 y esferas grandes dinámicas en el nivel 3 |
| 18 | Memoria de frutas de la IA de Pacman y ajuste del saltarín | HU-24, HU-29, HU-30 | *Agregado al plan durante la sesión, sujeto a las decisiones 37 y 38.* Pacman deja de caer siempre en las frutas falsas, y el salto del saltarín deja de jugar en contra. El prompt se redacta cuando el equipo apruebe las dos decisiones. Si la decisión 38 se aprueba antes del incremento 16, el ajuste del saltarín conviene hacerlo antes, porque el 16 reutiliza esa implementación |

**Orden.** El incremento 11 va antes que las reglas y los poderes porque sin una IA de Pacman ninguna otra funcionalidad del modo GhostMan es observable. El 16 va después de los poderes jugables (13 a 15) para que la IA reutilice la misma implementación de cada poder en lugar de duplicarla, y es el único incremento de la V2 que modifica el modo Pacman: concentra el riesgo de regresión en un solo commit.

### 7.2 Agente utilizado

| Agente / LLM | Interfaz | Uso previsto |
|---|---|---|
| Claude Opus 5.5 | Claude Code (CLI) con acceso al repositorio local: puede compilar, correr lint, ejecutar scripts de verificación y manejar un navegador sin interfaz (Chromium) para capturas | Generación de los incrementos 10 a 17 y verificación de sus criterios de avance |

Se mantiene la **decisión metodológica** de la V1: el código no se corrige a mano durante la generación. Los ajustes se piden mediante prompts que quedan registrados, y toda edición manual se anota en la tabla 7.5.

### 7.3 Contexto entregado al agente

1. La sección **4** de la Entrega 01 (reglas de la V1) y la sección **4** de este documento (reglas de la V2).
2. Las historias de usuario de la V2 (sección 7.4 de la Entrega 01), con los ajustes de la sección 6 de este documento.
3. Las decisiones 17 a 32 de la sección 5, en su estado aprobado.
4. La instrucción de no modificar el comportamiento del modo Pacman de la V1 salvo en el incremento 16.

### 7.4 Prompts

> **Estado.** Borradores. Se ajustan si el equipo modifica alguna decisión de la sección 5. Cada prompt se ejecuta con el contexto fijo de la sección 7.3 ya entregado.

#### Prompt 9 — Menú, carrusel y fantasma del jugador (HU-22, HU-23, HU-24)

```
Vamos a empezar la V2. Antes de tocar nada, leé el código actual: la V1 está
cerrada y probada, y su comportamiento en modo Pacman no puede cambiar.

1. Menú principal (componente React, no canvas). Es la pantalla inicial. Tiene
   dos opciones: "Modo PacMan" y "Modo GhostMan". Se navega con flechas ↑↓ o W/S,
   Enter confirma, y también funciona con clic.
   - Modo PacMan inicia la partida exactamente como hoy.
   - Modo GhostMan abre el carrusel.

2. Carrusel de fantasmas (componente React). Cinco tipos en este orden:
   Clásico, Espectro, Saltarín, Naval, Acelerado. Arranca en Clásico. El
   seleccionado va en el centro, con el nombre del tipo debajo y la descripción
   de su poder como subtítulo (usá los textos de la sección 2.2). Flechas ←→ o
   A/D lo recorren y es circular en los dos sentidos. Enter inicia la partida.
   ESC vuelve al menú. En la descripción del espectro aclará que solo atraviesa
   muros de una celda de espesor.

3. Modo GhostMan, solo el control en este paso: el jugador controla a su
   fantasma con flechas y WASD, con el mismo modelo de movimiento que Pacman en
   la V1 (avance continuo, giro anticipado, puede invertir la marcha). El
   fantasma del jugador aparece en (1,1), en lugar del primer fantasma de la
   V1; los otros tres son clásicos con la IA chase/scatter de la V1. La
   velocidad del fantasma del jugador es la de su tipo (sección 4.5).
   Pacman, por ahora, queda quieto en su posición inicial: su IA es el próximo
   paso. No implementes todavía poderes, derrotas ni puntaje del modo.

4. Pantallas de fin de partida: además de "Volver a jugar" agregá "Menú
   principal". Volver a jugar repite el mismo modo y el mismo fantasma desde el
   nivel 1.

El modo y el fantasma no pueden cambiar durante la partida. Reutilizá el
movimiento y las colisiones existentes, no los dupliques para el fantasma. Si
algo es ambiguo, preguntame antes de generar código.
```

#### Prompt 10 — IA de Pacman (HU-24)

```
Implementá la IA de Pacman para el modo GhostMan según la sección 4.7. Pacman
decide en el centro de cada celda, con estas prioridades:

1. Si un fantasma que puede dañarlo está a 4 celdas de recorrido o menos, huye:
   va a la celda vecina transitable que maximiza la distancia de recorrido al
   fantasma peligroso más cercano. Puede invertir la marcha.
2. Si tiene el PowerUp activo y hay un fantasma vulnerable a 8 celdas de
   recorrido o menos, persigue al más cercano.
3. Si hay una fruta, real o falsa, a 5 celdas de recorrido o menos, va hacia ella.
   La IA no distingue la falsa de la real, y eso es intencional.
4. Si no, va a la esfera más cercana por recorrido.

"Puede dañarlo" excluye a los fantasmas vulnerables, a los comidos y al espectro
mientras cruza un muro o en sus 3 s sin poder comer. Desempate: arriba,
izquierda, abajo, derecha. Distancias por recorrido (BFS sobre celdas
transitables), no en línea recta. Velocidad: 5 celdas/s.

Pacman sigue consumiendo esferas, activando el PowerUp con las grandes y
comiendo fantasmas vulnerables con las mismas reglas de la V1. En este paso
todavía no hay derrotas: si un fantasma lo toca, no pasa nada.

Criterio de avance que tenés que verificar con un script, sin navegador: con
los fantasmas quietos lejos de su camino, Pacman completa el nivel 1 sin
quedarse trabado en un ciclo. Y con un fantasma acercándose por un corredor,
Pacman se aleja.
```

#### Prompt 11 — Reglas del modo GhostMan (HU-25, HU-26, HU-27)

```
Reglas de victoria, derrota y puntaje del modo GhostMan (secciones 4.2 a 4.4):

- Pacman tiene 3 vidas por nivel. Abajo a la izquierda se muestran sus vidas
  restantes con el ícono del fantasma del jugador.
- El fantasma del jugador toca a Pacman sin PowerUp: Pacman pierde una vida, el
  jugador suma 500 puntos y el nivel se reinicia según la tabla 4.3. Ojo con
  esa tabla: las esferas consumidas se conservan, las frutas falsas
  desaparecen, el cooldown del poder del jugador NO se reinicia.
- Un fantasma de la IA toca a Pacman sin PowerUp: Pacman vuelve solo a su
  posición inicial, sin perder vidas ni sumar puntos, y nada más cambia.
- Pacman llega a 0 vidas: nivel completado. Se suman 10 puntos por cada esfera
  que quedó en el mapa, se muestra el resultado 3 s y se pasa al siguiente nivel
  con 3 vidas nuevas para Pacman. Al completar el nivel 3: Victoria.
- Pacman consume la última esfera: Game Over, sin importar sus vidas restantes.
- Con el PowerUp de Pacman activo, el fantasma del jugador pasa al diseño
  vulnerable, no puede derrotar a Pacman y, si Pacman lo toca, es comido:
  desaparece, el jugador no lo controla, en pantalla se ve la cuenta regresiva
  de reaparición (5 s, u 8 s si es naval), y reaparece en (1,1). Ser comido no
  resta nada ni reinicia el nivel. El fantasma del jugador no invierte la
  marcha automáticamente al empezar el PowerUp: lo sigue controlando el jugador.
- El desglose final del modo GhostMan tiene dos categorías: "Derrotas de
  Pacman" y "Esferas sin consumir". No hay bonus por tiempo ni por vidas.

El contacto se detecta con la misma distancia interpolada de la V1, y un mismo
contacto no puede descontar dos vidas en frames sucesivos. Verificá con un
script la secuencia: 3 derrotas → nivel 2 con 3 vidas nuevas; Pacman come la
última esfera con 1 derrota acumulada → Game Over.
```

#### Prompt 12 — Espectro, Saltarín e indicador de poder (HU-28, HU-29, HU-32)

```
Poderes del fantasma del jugador, primera parte. Leé las reglas comunes de la
sección 4.6 antes de empezar: dirección de avance, poderes que no se consumen
si no producen efecto, cooldowns que se conservan al reiniciarse el nivel.

Barra espaciadora en modo GhostMan:
- Espectro: reutilizá la implementación de la V1. Atraviesa el muro de una
  celda contiguo en la dirección de avance si del otro lado hay una celda
  transitable, aunque el fantasma esté detenido contra ese muro. Si no hay
  destino válido no pasa nada y el cooldown no arranca.
- Saltarín: teletransporte instantáneo a una celda transitable al azar, a
  distancia Manhattan ≤ 10, distinta de la actual, con distribución uniforme.
  Puede caer sobre Pacman: si Pacman no tiene PowerUp, es una derrota. Cooldown
  de 10 s.
- Clásico: la barra espaciadora no hace nada.
- En modo Pacman la barra espaciadora sigue sin hacer nada (HU-21).

Indicador: estrella ⭐ junto al contador de vidas, abajo a la izquierda. Se ve
encendida si el poder está disponible y apagada durante el cooldown, y se
enciende exactamente al terminar el cooldown. No se muestra si el fantasma es
clásico. Mientras el fantasma está comido el poder no se puede usar.

Verificá con un script: 200 saltos del saltarín desde distintas celdas, ninguno
a un muro, fuera del mapa, a la misma celda ni a más de 10 de distancia
Manhattan; y que el cooldown sobrevive a una derrota de Pacman.
```

#### Prompt 13 — Naval (HU-30)

```
Poder del Naval según la sección 4.6:

- La barra espaciadora coloca una fruta falsa en la celda que ocupa el fantasma.
  Máximo 2 en el mapa y al menos 5 s entre colocaciones. Si ya hay 2, o si en
  la celda ya hay una fruta falsa, no pasa nada y el cooldown no arranca.
- La fruta falsa se distingue a simple vista de la fruta real, y durante sus
  últimos 3 s muestra una cuenta regresiva.
- Pacman la consume sin PowerUp: pierde una vida, y en modo GhostMan eso cuenta
  como derrota producida por el jugador (500 puntos y reinicio del nivel).
- Pacman la consume con PowerUp: la fruta desaparece sin ningún efecto.
- A los 10 s sin ser consumida explota. Radio: las celdas alcanzables desde la
  fruta en 3 pasos o menos por celdas transitables (BFS, no atraviesa muros).
  Si Pacman está en el radio sin PowerUp, pierde una vida. La explosión no
  afecta a ningún fantasma. Mostrá la explosión sobre las celdas alcanzadas.
- Al reiniciarse el nivel las frutas falsas desaparecen sin explotar.
- Naval: 4 celdas/s y 8 s de reaparición.

Diseñá la fruta falsa como una entidad independiente de quién la colocó: en el
incremento 16 la va a colocar también un naval de la IA en modo Pacman.

Verificá con un script la forma del radio junto a una pared (que no la
atraviese) y la línea de tiempo: colocar a t=0, intento a t=3 sin efecto,
colocar a t=5, intento a t=10 sin efecto porque hay 2, la primera explota a t=10.
```

#### Prompt 14 — Acelerado (HU-31)

```
Poder del Acelerado según la sección 4.6:

- La barra espaciadora lo desplaza en forma instantánea hasta 3 celdas en la
  dirección de avance, deteniéndose en la última celda transitable si encuentra
  un muro. Nunca sale del mapa.
- Si la primera celda ya es un muro, o si el fantasma acaba de aparecer y todavía
  no tiene dirección de avance, no pasa nada: no hay cooldown ni penalidad.
- El contacto con Pacman se evalúa en cada celda recorrida, no solo en la de
  llegada.
- Después del dash la velocidad baja a 2,5 celdas/s durante 5 s. Cooldown de 10 s.

Diseñá el dash como una operación reutilizable: en el incremento 16 lo va a usar
también la IA. Verificá con un script los casos de 3, 2, 1 y 0 celdas libres, y
un dash que pasa por encima de Pacman y termina más allá.
```

#### Prompt 15 — Fantasmas especiales en el modo Pacman (HU-43)

```
Este es el único paso de la V2 que modifica el modo Pacman. Cambiá solo lo que
pide la sección 4.9:

- Nivel 1: sin cambios.
- Nivel 2: arrancan cuatro clásicos. Un fantasma comido reaparece con poderes
  con un 50 % de probabilidad, y en ese caso con un tipo elegido al azar en
  forma uniforme entre espectro, saltarín, naval y acelerado.
- Nivel 3: arranca uno de cada tipo con poderes. Los comidos reaparecen con un
  tipo con poderes al azar.
- La IA usa los poderes reutilizando las implementaciones de los incrementos 12
  a 14 (no las dupliques), con las condiciones de la tabla de la sección 4.9.
  Ningún fantasma usa su poder mientras está vulnerable.
- Los cuatro tipos con poderes tienen que ser distinguibles entre sí y del
  clásico.

Todo lo demás del modo Pacman (puntaje, PowerUp, frutas del nivel 3, pausa,
pantallas de cierre) tiene que quedar idéntico. Verificá con un script la
distribución de 1000 reapariciones del nivel 2 y la composición inicial del
nivel 3.
```

#### Prompt 16 — Dificultad del modo GhostMan (HU-33, HU-34)

```
Dificultad del modo GhostMan según la sección 4.8:

Destrucción de paredes (niveles 2 y 3, solo modo GhostMan):
- Al consumir una esfera grande Pacman obtiene 5 cargas, que duran lo que dura
  el PowerUp. Otra esfera grande las repone a 5, no las suma.
- La IA de Pacman, con cargas disponibles, calcula los recorridos considerando
  los muros interiores como transitables con costo 3. Al avanzar hacia un muro
  interior lo destruye: la celda queda transitable para todos, sin esfera, y se
  gasta una carga. Los bordes del mapa son indestructibles.
- La destrucción se ve en el momento (destello o escombros, 0,5 s).
- Las paredes destruidas se restablecen al reiniciarse el nivel por una derrota.
- En el nivel 1 y en el modo Pacman este poder no existe.

Nivel 3 del modo GhostMan:
- 6 esferas grandes fijas: las 4 esquinas más (7,1) y (7,15). En el modo Pacman
  el nivel 3 queda como está.
- Cada 15 s aparece una esfera grande en una celda transitable al azar, sin
  esfera y sin personaje, con un máximo de 2 dinámicas simultáneas (si ya hay 2,
  la aparición se omite). No vencen y cuentan para completar el nivel.

Verificá con un script que Pacman nunca destruye más de 5 paredes por esfera
grande, que nunca destruye un borde y que la cuenta de esferas restantes
incluye a las dinámicas.
```

### 7.5 Registro de problemas de la sesión de generación

*A completar durante la sesión. Un renglón por problema, en el orden en que ocurrieron. Mismas columnas y criterios que la tabla 8.5 de la Entrega 01.*

| # | Incremento | Prompt | Problema observado | Cómo se resolvió | ¿Requirió edición manual? |
|---|---|---|---|---|---|
| 1 | 10 — Menú y fantasma del jugador | Prompt 9 | La primera versión del menú y del carrusel guardaba la opción seleccionada en *refs* que se escribían durante el render. Compilaba y funcionaba, pero `npm run lint` la rechazaba (regla `react-hooks/refs`: el componente puede no actualizarse) | El agente reescribió los dos componentes para que el listener de teclado se vuelva a registrar cuando cambia la selección | No |
| 2 | 10 — Menú y fantasma del jugador | Prompt 9 | En la captura del navegador la opción no seleccionada del menú quedaba desalineada respecto de la seleccionada, y en las pantallas de cierre los botones "Volver a jugar" y "Menú principal" se partían en dos líneas por falta de ancho | Se corrigió el estilo (marcador de ancho fijo y botones compactos) y se verificó de nuevo con captura | No |
| 3 | 10 — Menú y fantasma del jugador | Prompt 9 | **Funcionalidad agregada sin pedirla:** marca visual por tipo (chevron, onda y doble chevron) para el saltarín, el naval y el acelerado; botón "Jugar" y flechas clicables en el carrusel; renombre interno de `player` a `pacman` en el estado del juego. Las dos primeras se necesitan para que el carrusel muestre tipos distinguibles (HU-23) y adelantan un criterio de la HU-43; el renombre evita que "jugador" signifique "Pacman" en el código de la V2 | Se conservan: no contradicen ningún criterio. La marca de tipo queda sujeta a los casos de la HU-43 | No |
| 4 | 10 — Menú y fantasma del jugador | Prompt 9 | **Hueco de especificación:** al aislar los fantasmas de la IA del modo GhostMan apareció que el nivel 3 sigue generando frutas reales cada 7 s y ninguna regla dice si eso corresponde en este modo | Se registró como decisión 33 (Propuesta). No requirió cambios de código: el comportamiento actual coincide con la propuesta | No |
| 5 | 10 — Menú y fantasma del jugador | Prompt 9 | **Estado intermedio desplegado:** como el incremento cierra sobre `main`, el modo GhostMan queda seleccionable en producción con Pacman quieto y sin colisiones entre Pacman y los fantasmas hasta los incrementos 11 y 12. Es lo que pide el prompt, pero un ejecutor que entre a la URL lo puede ver como un defecto | Se deja asentado. El modo Pacman no cambia | No |
| 6 | 11 — IA de Pacman | Prompt 10 | En la primera versión, la IA decidía la dirección para la celda **siguiente** mientras Pacman todavía iba en camino, para que el giro no llegara tarde. Cuando la mejor opción quedaba hacia atrás, Pacman invertía la marcha a mitad de pasillo, cambiaba la celda de decisión y volvía a invertir. El script de verificación lo detectó: en 300 s Pacman no completó ninguno de los tres niveles y llegó a pasar 295 s sin comer una esfera | Se cambió para que Pacman decida al **llegar** al centro de cada celda, que es lo que pide la sección 4.7. El movimiento agnóstico (`updateMover`) recibe un callback opcional que se invoca en cada llegada. Con eso Pacman completa los niveles 1, 2 y 3 en 27, 31 y 35 s, sin pasar más de 2 s sin comer | No |
| 7 | 11 — IA de Pacman | Prompt 10 | Dos comprobaciones del script del incremento 10 fallaron después del cambio: "Pacman quieto", que dejó de valer porque Pacman ya tiene IA, y el pase a dispersión a los 20 s. El segundo no era un defecto: Pacman ahora come esferas grandes, y durante el PowerUp el ciclo de persecución y dispersión se detiene (regla de la V1) | Se actualizaron las comprobaciones (en la segunda se quitan las esferas grandes del mapa). No requirió cambios de código | No |
| 8 | 11 — IA de Pacman | Prompt 10 | **Estado intermedio desplegado:** en modo GhostMan los toques de los fantasmas todavía no tienen efecto, y si Pacman consume todas las esferas el nivel se completa como en el modo Pacman, en lugar de dar Game Over (HU-26). Lo que hace Pacman no suma puntos al jugador. Las tres cosas corresponden al incremento 12 | Se deja asentado para quien entre a la URL de producción antes del incremento 12 | No |
| 9 | 12 — Reglas del modo GhostMan | Prompt 11 | Cuatro comprobaciones de los scripts de los incrementos 10 y 11 fallaron después del cambio: esperaban "sin derrotas" y que Pacman completara el nivel al comer todas las esferas. Las dos expectativas dejaron de valer a propósito, porque ahora comer la última esfera es Game Over (HU-26) | Se actualizaron las comprobaciones a las reglas nuevas. No requirió cambios de código | No |
| 10 | 12 — Reglas del modo GhostMan | Prompt 11 | **Hueco de especificación:** la prueba de navegador esperaba que, sin intervención del jugador, Pacman terminara comiendo todas las esferas (Game Over). En lugar de eso, la partida terminó en **Victoria**: los fantasmas de la IA encierran a Pacman contra el fantasma del jugador, que está quieto sobre la esfera grande de su celda de aparición. La simulación lo confirmó en 2 de 5 semillas | Se registró como decisión 34 (Propuesta). No se cambió el código. La prueba de navegador acepta cualquiera de los dos finales | No |
| 11 | 12 — Reglas del modo GhostMan | Prompt 11 | **Desvío que se mantiene:** la decisión 18 ubica las vidas de Pacman en el extremo inferior izquierdo, y así se implementó en el modo GhostMan (barra debajo del mapa, que en el incremento 13 suma la estrella). En el modo Pacman las vidas siguen en la barra superior, el desvío de la HU-09 que la Entrega 01 dejó para la ejecución de pruebas. Los dos modos quedan inconsistentes entre sí | Se deja asentado. Corregirlo en el modo Pacman es tocar la V1 y depende de cómo haya quedado el defecto de la HU-09 en el ciclo 1 | No |
| 12 | 13 — Espectro, Saltarín e indicador | Prompt 12 | **Hueco de especificación:** la regla del espectro no dice qué pasa si la barra espaciadora se presiona a mitad de camino entre dos celdas. El agente lo resolvió con el muro contiguo a la celda de llegada: el espectro termina de llegar y cruza | Se registró como decisión 35 (a), en estado Propuesta | No |
| 13 | 13 — Espectro, Saltarín e indicador | Prompt 12 | **Hueco de especificación:** la HU-32 no define qué muestra la estrella mientras el fantasma está comido. La implementación refleja solo el cooldown | Se registró como decisión 35 (b), en estado Propuesta | No |
| 14 | 13 — Espectro, Saltarín e indicador | Prompt 12 | Para la dirección de avance (decisión 24) hizo falta un campo nuevo (`facing`): el movimiento agnóstico borra la dirección cuando el personaje queda detenido contra un muro, que es justamente el caso en el que el espectro tiene que poder cruzarlo. Además, el cooldown del espectro de la V1 (`phaseCooldown`) se generalizó a un único `powerCooldown` para los cuatro tipos | Cambio interno, sin efecto en el modo Pacman: se verificó que una partida con y sin barra espaciadora es idéntica | No |
| 15 | 13 — Espectro, Saltarín e indicador | Prompt 12 | El script de verificación marcó como sesgada la distribución de destinos del saltarín: un destino salió 82 veces con una media de 54. El defecto estaba en la prueba, no en el código. Una banda de ±40 % sobre 111 destinos con solo 6.000 saltos es demasiado estricta | Se reemplazó por una prueba chi-cuadrado con 60.000 saltos (chi² 122,5, umbral 145 para p = 0,01). Queda como antecedente para los casos de prueba de la HU-29: verificar la aleatoriedad "a ojo" en pocos saltos no alcanza para calificar el resultado como pass/fail | No |
| 16 | 14 — Naval | Prompt 13 | El script ejecutó la línea de tiempo del prompt (colocar en t = 0, intento en t = 3, colocar en t = 5) y la segunda colocación **falló en t = 5,000**: el cooldown valía 1,3e-14 en lugar de 0, por error acumulado al restar 1/60 trescientas veces. En el juego es un cuadro de atraso (16 ms), imperceptible. Pero la HU-32 pide que el poder vuelva "exactamente al terminar el cooldown", y un caso de prueba en el límite daría un resultado que depende del redondeo | Se agregó un descuento de temporizador que toma como 0 los restos menores a 1e-9 (`timers.ts`), aplicado al cooldown de los poderes y a la cuenta regresiva de las frutas falsas. Los temporizadores de la V1 (PowerUp, reaparición, ciclo de la IA) no se tocaron para no modificar la V1 | No |
| 17 | 14 — Naval | Prompt 13 | **Observación sobre el diseño de la prueba:** en la línea de tiempo del prompt, el intento de t = 10 coincide con el fin del cooldown de la segunda colocación (t = 5 + 5) y con la explosión de la primera (t = 0 + 10). Así planteado, el intento falla por el cooldown y no prueba la regla del máximo de 2. Además, la especificación no dice qué se resuelve primero cuando dos eventos caen en el mismo instante | El script anula el cooldown antes del intento de t = 10 para aislar la regla. El código resuelve primero el poder y después la cuenta regresiva: en el mismo instante, la fruta que explota todavía cuenta para el máximo. El CP-093 no tiene que usar instantes coincidentes | No |
| 18 | 14 — Naval | Prompt 13 | **Defecto del incremento 13 detectado en el 14:** la prueba de navegador de la estrella del saltarín midió 14,95 s en lugar de 10, y después falló en todas las corridas. Causa: el saltarín cayó cerca de Pacman durante el PowerUp y Pacman se lo comió, y **el cooldown no corre mientras el fantasma está comido**, porque la actualización saltea a los fantasmas comidos. 14,95 s = 10 s de cooldown + 5 s de reaparición. Las pruebas del incremento 13 habían pasado porque en esas corridas el saltarín no cayó cerca de Pacman | El cooldown del fantasma del jugador sigue corriendo mientras está comido (coherente con la decisión 35 b). Se agregó la comprobación al script del incremento 13. **Pendiente:** al espectro de la IA del modo Pacman le pasa lo mismo desde la V1. Es comportamiento de la V1 y no viola la HU-18 ("al menos 10 s"), así que se decide en el incremento 16 | No |
| 19 | 14 — Naval | Prompt 13 | **Interpretación del agente:** la sección 4.6 dice que si Pacman consume una fruta falsa en modo GhostMan "cuenta como derrota producida por el jugador", pero de la explosión solo dice que Pacman "pierde una vida". Como en este modo las vidas de Pacman son el contador de derrotas (decisión 18), la explosión se implementó también como derrota (500 puntos y reinicio del nivel) | Se aclaró en la sección 4.6, marcado como interpretación a validar por el equipo | No |
| 20 | 15 — Acelerado | Prompt 14 | **Hueco de especificación:** no se define qué pasa con la penalidad de velocidad si Pacman es derrotado o si el acelerado es comido, ni desde qué celda arranca un dash activado a mitad de camino | Se registró como decisión 36 (Propuesta), con el mismo criterio que el cooldown. Lo implementado coincide con la propuesta | No |
| 21 | 15 — Acelerado | Prompt 14 | La decisión 32 habla de evaluar el contacto "en cada celda recorrida". Revisar solo los centros de las celdas deja pasar el caso en el que Pacman está a mitad de camino entre dos celdas del trayecto: queda a 0,5 de los dos centros y no cumple "a menos de media celda" con ninguno | Se evalúa la distancia de Pacman al segmento completo del trayecto, con el mismo umbral de 0,5 celdas que el resto de las colisiones. La resolución del contacto (comer, derrotar, devolver a Pacman a su posición inicial) se extrajo a una única función que usan la colisión normal y la del dash | No |

### 7.6 Observaciones sobre la implementación con AI

**Balance del modo GhostMan (medición del incremento 12, todavía sin poderes ni dificultad).** Con un bot que persigue a Pacman por el camino más corto, en 10 partidas por tipo: el **clásico** gana 10 de 10, el **espectro** 5 de 10 y el **naval** 0 de 10 (pierde siempre en el nivel 2). La diferencia es la velocidad: los dos tipos más lentos no alcanzan a un Pacman que va a 5 celdas por segundo. Hay que volver a medirlo con los poderes (incrementos 13 a 15) y con la dificultad (incremento 17) antes de concluir algo sobre el balance.

**Balance con los cuatro poderes (medición del incremento 15, todavía sin la dificultad del incremento 17).** Se usó el mismo bot perseguidor, que ahora además usa su poder apenas lo tiene disponible si Pacman está a 6 celdas o menos (Manhattan). Victorias en 10 partidas por tipo:

| Tipo | Sin usar el poder | Usando el poder |
|---|---|---|
| Clásico | 10 | 10 (no tiene poder) |
| Espectro | 5 | 6 |
| Saltarín | 10 | 1 |
| Naval | 0 | **10** |
| Acelerado | 10 | 10 |

Dos lecturas. El **naval** pasa de perder siempre a ganar siempre: como la IA de Pacman va por cualquier fruta a 5 celdas o menos y no distingue la falsa (decisión 17), la trampa casi no falla. El **saltarín** empeora usando el poder sin criterio: el destino es al azar y lo aleja de Pacman tantas veces como lo acerca. El bot no es un jugador real, así que esto no alcanza para concluir sobre el balance. Sí alcanza para señalarle al equipo que el umbral de 5 celdas de la decisión 17 define, casi por sí solo, la fuerza del naval.

*A completar al cerrar la sesión de generación. Hipótesis que se arrastra de la V1 para contrastar: el agente acierta en los valores numéricos explícitos y falla en las interacciones entre estados que nadie escribió. Las decisiones 24, 25, 27, 28 y 32 se escribieron justamente para anticipar esas interacciones. Va a ser interesante ver si alcanzan, o si los problemas se corren a otras interacciones.*

---

## 8. Estrategia de pruebas de la V2

Se mantiene la estrategia de la sección 9 de la Entrega 01: pruebas manuales de caja negra sobre la aplicación desplegada, con las mismas técnicas, la misma priorización y los mismos criterios de entrada y de salida. Esta sección registra solo lo que cambia.

### 8.1 Análisis de riesgos de la V2

| Área | Probabilidad | Impacto | Riesgo | Fundamento |
|---|---|---|---|---|
| IA de Pacman | Alta | Alto | **Crítico** | Si Pacman se traba o no completa el nivel, la condición de derrota del modo (HU-26) es inalcanzable y el modo deja de ser jugable |
| Derrota de Pacman y reinicio del nivel | Alta | Alto | **Crítico** | Es la tabla 4.3: ocho elementos que se conservan o se reinician, y es la clase de interacción en la que falló el agente en la V1 |
| Regresión del modo Pacman | Media | Alto | **Alto** | El menú cambia la entrada al juego y el incremento 16 modifica la composición de fantasmas |
| Poderes del jugador | Alta | Medio | **Alto** | Cuatro excepciones a las reglas generales de movimiento y de colisión, cada una con temporizadores propios |
| Fruta falsa y explosión | Alta | Medio | **Alto** | Ciclo de vida con cuatro salidas posibles (consumida sin PowerUp, consumida con PowerUp, explota, desaparece por reinicio) |
| Destrucción de paredes | Media | Medio | **Medio** | Modifica el mapa en tiempo de juego, y el mapa es la base de todas las demás reglas |
| Menú y carrusel | Baja | Medio | **Bajo** | Componentes React inspeccionables, con pocas reglas |

### 8.2 Regresión de la V1

Se reejecutan los **35 casos de prioridad Alta de la V1**, mutados según la consideración sobre la paradoja del pesticida de la sección 9.4 de la Entrega 01. Además, estos casos de la V1 cambian por las decisiones de la V2:

| Caso | Cambio | Decisión |
|---|---|---|
| Todos los de la V1 | Precondición nueva: iniciar la partida desde el menú con "Modo PacMan" | HU-22 |
| CP-052 | Resultado esperado: las reapariciones con poderes pueden ser de los cuatro tipos | 23 |
| CP-053 | Resultado esperado: un fantasma de cada tipo con poderes | 23 |
| CP-054 a CP-059 | Precondición: identificar un espectro entre los cuatro tipos del nivel 2 o 3 | 23 |
| CP-060 a CP-062 | Se verifica también la acción "Menú principal" | 29 |

---

## 9. Especificación de casos de prueba de la V2

*Pendiente.* Se detallan los CP-067 a CP-105 de la sección 10.4 de la Entrega 01 con el formato completo de su sección 10.1 (precondiciones, pasos, resultado esperado, técnica y prioridad), con los resultados esperados ajustados a las decisiones 17 a 32. Se agregan casos nuevos a partir del **CP-141**, para no alterar la numeración de la V3 (CP-106 a CP-140):

| Origen | Casos nuevos previstos |
|---|---|
| HU-43 | Composición de los niveles 2 y 3; uso de los poderes por la IA del saltarín, el naval y el acelerado |
| Decisión 17 | Pacman huye de un fantasma cercano; persigue fantasmas vulnerables; va hacia una fruta falsa cercana |
| Decisión 19 | El toque de un fantasma de la IA devuelve a Pacman a su posición inicial sin descontarle vidas |
| Decisión 20 | Desglose del puntaje del modo GhostMan |
| Decisiones 25 y 28 | El poder sin efecto no consume el cooldown; el cooldown sobrevive al reinicio del nivel |
| Decisión 27 | Fruta falsa comida con PowerUp; frutas falsas al reiniciarse el nivel |
| Decisión 29 | Volver a jugar repite el modo y el fantasma; Menú principal |
| Decisión 32 | *Dash* que pasa por encima de Pacman |

---

## 10. Matriz de trazabilidad

*Pendiente.* Se construye al completar la sección 9, con el mismo formato que la sección 11 de la Entrega 01, incluyendo la HU-43.

---

## 11. Reporte de ejecución de casos de prueba

### 11.1 Identificación del ciclo de ejecución

| Dato | Valor |
|---|---|
| Ciclo de ejecución | Nº 2 (primer ciclo de la V2) |
| Versión bajo prueba | V2 |
| Commit | `[hash del commit]` |
| Entorno | `[URL de despliegue]` |
| Navegador y versión | `[completar]` |
| Fecha de inicio | `[completar]` |
| Fecha de cierre | `[completar]` |
| Ejecutores | `[completar]` |

*El resto de la sección se completa con el mismo instrumento de la sección 12 de la Entrega 01.*

---

## 12. Reporte de defectos

*Pendiente.* Se usan los criterios de clasificación, los estados y la plantilla de la sección 13 de la Entrega 01. Los defectos de la V2 continúan la numeración DEF de la V1.

---

## 13. Conclusiones y próximos pasos

### 13.1 Estado al 12/10/2026 (traspaso al equipo)

**Generación de la V2.** Están ejecutados y desplegados en `main` los incrementos 10 a 15: el modo GhostMan es jugable de punta a punta, con los cinco tipos de fantasma y sus poderes. Faltan los incrementos 16, 17 y 18.

| Incremento | Commit | HU |
|---|---|---|
| 10 — Menú, carrusel y fantasma del jugador | `bd9f52a` | HU-22, HU-23, HU-24 |
| 11 — IA de Pacman | `a6a7749` | HU-24 |
| 12 — Reglas del modo GhostMan | `9a7c8c0` | HU-25, HU-26, HU-27 |
| 13 — Espectro, saltarín e indicador | `7b5708e` | HU-28, HU-29, HU-32 |
| 14 — Naval | `9ecfaaf` | HU-30 |
| 15 — Acelerado | `34978df` | HU-31 |

**Decisiones tomadas durante la sesión.**
- Las decisiones 17 a 32 se implementaron tal como estaban propuestas, con el aval de quien condujo la sesión (estado *Implementada*).
- Las decisiones 33, 35 y 36 surgieron durante la generación. El código ya las refleja, pero el equipo todavía no las revisó.
- Las decisiones 37 y 38 se definieron al cerrar la sesión, a partir de la medición del balance. No están implementadas.

**Verificación usada en la sesión.** Cada incremento se verificó con un script del núcleo del juego, sin navegador, y con pruebas en Chromium sin interfaz, con capturas. Los scripts están en `scripts/verify/` y se corren con `npm run verify` (núcleo), `npm run verify:ui` (navegador) y `npm run verify:balance` (balance). El README de esa carpeta explica cómo usarlos y sus limitaciones. Son de caja blanca: sirven como base de la regresión automatizada (sección 9.1 de la Entrega 01), pero no reemplazan la ejecución de los casos de prueba.

### 13.2 Pendientes

| # | Pendiente | Origen | Responsable |
|---|---|---|---|
| 1 | Revisar las decisiones 17 a 36 y pasarlas a *Aprobada* o *Modificada*. Las 33 a 36 surgieron durante la generación y nadie del equipo las vio | Sección 5 | Equipo completo |
| 2 | Decidir la alternativa de la decisión 26 (espesor de muro que atraviesa el espectro) | Decisión 26 | Equipo completo |
| 3 | Decidir la decisión 34 (el jugador quieto puede ganar): aceptarlo o quitar la esfera de la celda de aparición | Decisión 34 | Equipo completo |
| 4 | Elegir la opción de la memoria de frutas de la IA de Pacman y el valor de *p* | Decisión 37 | Equipo completo |
| 5 | Elegir la opción del saltarín, idealmente antes del incremento 16 | Decisión 38 | Equipo completo |
| 6 | Decidir si el cooldown del espectro de la IA (modo Pacman) sigue corriendo mientras está comido; hoy se congela, como en la V1 | Tabla 7.5, fila 18 | Equipo completo |
| 7 | Resolver la inconsistencia del contador de vidas: abajo a la izquierda en modo GhostMan, arriba en modo Pacman (desvío de la HU-09 de la V1) | Tabla 7.5, fila 11 | Equipo completo |
| 8 | Validar la interpretación de la explosión de la fruta falsa como derrota en modo GhostMan | Tabla 7.5, fila 19 | Equipo completo |
| 9 | Actualizar los criterios de la sección 6.1 en `entrega-01.md`, incluida la HU-43, y ajustar los prompts 15 y 16 a lo decidido | Sección 6 | `[completar]` |
| 10 | Ejecutar los incrementos 16, 17 y 18, registrando en la tabla 7.5. Redactar el prompt del 18 | Sección 7 | `[completar]` |
| 11 | Volver a medir el balance después de los incrementos 17 y 18 | Sección 7.6 | `[completar]` |
| 12 | Completar la sección 7.6 (observaciones sobre la implementación con AI) | Sección 7.6 | `[completar]` |
| 13 | Detallar los casos de prueba de la V2 (CP-067 a CP-105 y los nuevos desde el CP-141), ajustar los casos de la V1 afectados y armar la matriz de trazabilidad | Secciones 8.2, 9 y 10 | `[completar]` |
| 14 | Ejecutar el ciclo de la V2 y la regresión de la V1; reportar defectos | Secciones 11 y 12 | `[completar]` |
| 15 | Subir el tag `v1.0` al repositorio remoto (`git push origin v1.0`); hoy está solo en un equipo local | Sección 2.1 | Savoia |
| 16 | Extender `scripts/verify/` con las suites de los incrementos 16, 17 y 18, y decidir si se corren antes de cada push a `main` | Sección 13.1 | `[completar]` |

---

## 14. Anexos

### Anexo A — Prompts de corrección

*Prompts no planificados que se usen durante la generación de la V2, numerados C-2 en adelante (C-1 es de la V1).*

### Anexo B — Evidencia de la ejecución

*Pendiente.*
