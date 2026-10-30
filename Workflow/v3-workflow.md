# Workflow — Versión 3 (Cuentas, puntajes, personalización y look & feel)

Checklist de trabajo para llevar la V3 de GhostMan, la versión final, desde la especificación hasta el cierre del reporte de pruebas. Basado en `TP/entrega-01.md` (sección 7.5, HU-35 a HU-42), en los pendientes de la sección 13.2 de `TP/entrega-02.md` y en el alcance de look & feel acordado al iniciar la V3. El documento de la entrega es `TP/entrega-03.md`. Cada etapa bloquea a la siguiente: no se pasa a la próxima sin cerrar los criterios de avance de la anterior.

Los incrementos se integran sobre `main`, y cada push despliega en Vercel: todo commit que llega a `main` tiene que compilar y dejar el juego jugable.

La numeración continúa la de la V2: incrementos desde el 18, prompts desde el 17, decisiones desde la 41, historias desde la HU-44 y casos de prueba desde el CP-164.

> **Estado al 30/10/2026:** V2 cerrada. Decisiones 26, 34, 37 y 38 resueltas (ver Etapa 0). Sin incrementos de la V3 ejecutados.

---

## Alcance de la V3

**Planificado desde la Entrega 01 (épicas E9 a E11):**
- HU-35 Registro · HU-36 Inicio de sesión · HU-37 Menú principal
- HU-38 Tablero global · HU-39 Mejor puntaje personal
- HU-40 Skins · HU-41 Volumen · HU-42 Cerrar sesión y salir

**Agregado al iniciar la V3 (épica nueva E12 — Look & feel; numeración propuesta):**
- HU-44 Base de los fantasmas y mapas rediseñados
- HU-45 Túneles laterales: un pasillo que sale por un borde del mapa y entra por el opuesto
- HU-46 Cuenta regresiva "3… 2… 1… ¡ya!" al inicio de cada nivel
- HU-47 Animación de derrota de Pacman
- HU-48 Música y efectos de sonido
- HU-49 Animaciones y efectos de los poderes (impulso del acelerado, salto del saltarín y el resto de los tipos)
- HU-50 Sprites de pixel art de Pacman, los fantasmas y las frutas, diseñados para admitir skins

**Arrastrado de la V2:** incremento 18 (decisiones 37 y 38), que nunca se ejecutó.

---

## Decisiones tomadas al iniciar la V3 (30/10/2026)

| # | Resolución | Afecta |
|---|---|---|
| 26 | El espectro atraviesa muros de exactamente una celda de espesor, nunca el muro del borde del mapa. Los mapas nuevos se diseñan para que el espectro tenga cruces válidos en los tres niveles | HU-18, HU-28, CP-055, CP-058 |
| 34 | Un jugador que no se mueve no puede ganar. En modo Pacman lo comen los fantasmas; en modo GhostMan, Pacman termina completando el nivel. Se resuelve con la base de los fantasmas: el fantasma del jugador ya no aparece sobre una esfera grande | HU-25, decisiones 19 y 22 |
| 37 | **Opción B**, con *p* = 5 % por segundo. La IA de Pacman recuerda las frutas falsas que ve colocar a 8 celdas de recorrido o menos y olvida cada una con probabilidad *p* por segundo. Una fruta que no recuerda la trata como real. La fruta que sabe falsa la evita como un muro al calcular recorridos, pero no se aleja del radio de la explosión. Si la única ruta pasa por esa celda, espera a que explote | HU-24, HU-30, HU-43 |
| 38 | **Opción A**: salto hacia adelante. El destino es al azar entre las celdas transitables a distancia Manhattan ≤ 10 que quedan en el semiplano de la dirección de avance. Se aplica al saltarín del jugador y al de la IA del modo Pacman | HU-29, HU-43, decisión 31, CP-087, CP-089 |
| 41 | *(Propuesta.)* Detalle de la 38: el semiplano es **estricto**; la fila o la columna actual del fantasma no cuenta. Si está quieto, se usa su última dirección de avance. Sin destino válido, el salto no se ejecuta y el poder no entra en cooldown | HU-29 |
| 42 | *(Propuesta.)* Detalle de la 37: Pacman registra la fruta **en el instante de la colocación**, si está a 8 celdas de recorrido o menos en ese momento. Una fruta colocada lejos no se registra después, aunque Pacman se acerque | HU-30 |
| 43 | *(Propuesta.)* La música y los efectos de sonido son **originales**, sintetizados con la Web Audio API "al estilo" del Pac-Man original. No se usan los archivos de Bandai Namco porque el juego está desplegado públicamente | HU-48 |

---

## Etapa 0 — Cierre de la especificación de la V3

### Pendientes de la V2 (sección 13.2 de `entrega-02.md`)
- [x] Decidir la decisión 26 (espesor de muro del espectro)
- [x] Decidir la decisión 34 (el jugador quieto puede ganar)
- [x] Decidir la decisión 37 (memoria de frutas: opción B, *p* = 5 %)
- [x] Decidir la decisión 38 (saltarín: opción A)
- [ ] Aprobar las decisiones 41 y 42 (detalles de la 37 y la 38)
- [ ] Revisar las decisiones 17 a 36 y pasarlas a Aprobada o Modificada
- [ ] Decidir si el cooldown de los fantasmas de la IA sigue corriendo mientras están comidos (pendiente 6; hoy se congela)
- [ ] Validar la explosión de la fruta falsa como derrota en modo GhostMan (pendiente 8)
- [ ] Decidir qué hacer con CP-032 (HU-08): marcarlo *No aplica* o reformular el criterio
- [ ] Confirmar y verificar DEF-002 con otro integrante, y repetir una muestra de casos sobre el despliegue de Vercel
- [ ] Subir el tag `v1.0` al remoto (`git push origin v1.0`) y crear el tag `v2.0` sobre el commit bajo prueba de la V2

### Base de los fantasmas, túneles y mapas (HU-44, HU-45)
- [x] Decidir las dimensiones de los mapas nuevos: 28 × 31, como el original. Si los niveles resultan lentos, se ajustan las velocidades después de un playtest
- [x] Definir la ubicación de la base y de la puerta: la misma en los tres niveles (`v3-mapas.md`). La base es infranqueable salvo por la puerta, también para los poderes
- [ ] Definir quién cruza la puerta (fantasmas sí, Pacman no) y en qué sentido
- [ ] Definir la salida de los fantasmas en modo Pacman: orden y tiempos
- [ ] Definir dónde aparece el fantasma del jugador en modo GhostMan (dentro de la base) y cuándo puede salir
- [ ] Definir qué hace un fantasma comido. **Opción clásica:** los ojos vuelven a la base y reaparece ahí. **Alternativa:** mantener el temporizador actual de 5 s (8 s para el naval) y reaparecer dentro de la base
- [ ] Definir la interacción de los poderes con la base: si el espectro puede cruzar sus muros, si el saltarín puede caer adentro, si el acelerado puede atravesar la puerta
- [ ] Definir qué pasa con la esfera grande y las esferas comunes que hoy están en las esquinas donde aparecían los fantasmas
- [x] Rediseñar los tres mapas: bocetos aprobados en `Workflow/v3-mapas.md`, con muros finos para el espectro
- [x] Túneles: uno por nivel, en la fila 13, en la misma posición en los tres niveles (`v3-mapas.md`)
- [ ] Túneles: definir si los fantasmas van más lentos dentro del túnel, como en el original (propuesta: sí, al 50 % de su velocidad, solo en las celdas del túnel) y si Pacman mantiene su velocidad
- [ ] Túneles: definir cómo se cuentan las distancias que cruzan el túnel. Propuesta: las distancias **por recorrido** (IA de Pacman, persecución de los fantasmas, visión de 8 celdas de la decisión 37) cuentan el túnel. La distancia **Manhattan** del radio del saltarín (decisión 31) no lo cuenta, porque el ejecutor la verifica contando celdas en pantalla
- [ ] Túneles: interacción con los poderes. El espectro no puede cruzar el borde (decisión 26), pero el túnel no es un muro. El dash del acelerado puede atravesarlo. Definir si el naval puede colocar una fruta falsa dentro del túnel y si la destrucción de muros de Pacman puede abrir un túnel nuevo en el borde (propuesta: no, el borde es indestructible)
- [ ] Túneles: dibujado. Definir qué se ve mientras un personaje está a medio cruzar (propuesta: el sprite se recorta en el borde y aparece del otro lado, sin quedar dibujado sobre el HUD)
- [ ] Revisar el impacto en la decisión 22 (cargas y costo de muro de Pacman) y en la cuenta de esferas de cada nivel

### Look & feel (HU-46 a HU-50)
- [ ] Cuenta regresiva: duración (propuesta: 1 s por número más 0,5 s para el "¡ya!"). Definir si se repite, más corta, al reaparecer tras perder una vida, como el "READY!" del original. Durante la cuenta se congelan el reloj del bonus por tiempo, los cooldowns, los temporizadores y la IA
- [ ] Animación de derrota de Pacman: duración (propuesta: alrededor de 1,5 s). Durante la animación el juego se pausa y los fantasmas desaparecen
- [ ] Acelerado (cambia HU-31): el dash recorre las celdas en lugar de teletransportarse. Definir la duración del impulso (propuesta: 0,25 s) y la colisión durante el recorrido (propuesta: normal en todas las celdas que atraviesa, con Pacman, esferas y fantasmas vulnerables)
- [ ] Saltarín (cambia HU-29): definir la duración del salto y si colisiona en el aire (propuesta: no colisiona mientras está en el aire). Antes de caer se marca la celda de destino
- [ ] Efectos del espectro, el naval (colocación y explosión) y el fantasma clásico
- [ ] Lista de sonidos: música de inicio, waka, esfera grande, fantasma comido, fruta, muerte, poder de cada tipo, explosión, victoria y Game Over. Cada sonido se asigna al canal de música o al de efectos (HU-41)
- [ ] Definir los sprites: tamaño de celda en píxeles, paleta base, cuadros por animación y cómo se aplican las skins (por paleta o con sprites alternativos). Las skins tienen que conservar la distinción entre tipos y el estado vulnerable
- [ ] Definir un **modo de prueba** que saltee la cuenta regresiva y las animaciones, para que `scripts/verify/` siga funcionando

### Cuentas y puntajes (HU-35 a HU-42)
- [ ] Crear el proyecto de Supabase y registrar quién lo administra
- [ ] Cargar las variables de entorno en Vercel y en `.env.local` (el archivo no se sube al repositorio)
- [ ] Decidir cómo se autentica un *username* sin email. Supabase Auth trabaja con email, así que la propuesta es un email sintético (`<username en minúsculas>@ghostman.invalid`), que además resuelve que el username no distinga mayúsculas (HU-36)
- [ ] Definir el esquema: `profiles` (username único, skins, volúmenes) y `scores` (usuario, modo, puntaje, fecha), con políticas RLS
- [ ] Definir cómo se registra un puntaje para que un usuario no pueda escribir puntajes arbitrarios desde la consola. Mínimo: RLS por usuario y validación de rangos
- [ ] Definir la "pantalla de salida" de la HU-42 en un juego web
- [ ] Definir qué pasa al terminar una partida sin conexión a Supabase

### Documentación
- [ ] Crear `TP/entrega-03.md` con la estructura de `entrega-02.md`
- [ ] Redactar las HU-44 a HU-50 y los ajustes a las HU-24, HU-29, HU-30, HU-31 y HU-43 (sección "Ajustes a las historias de usuario")
- [ ] Actualizar el documento de historias de usuario
- [ ] Registrar las decisiones 41 en adelante con su fundamento
- [ ] Redactar los prompts 17 en adelante
- [ ] Definir quién conduce los prompts y quién registra la sesión (no puede ser la misma persona)

---

## Etapa 1 — Incrementos de generación (vibe-coding)

Un checklist por incremento. Cada uno se cierra con un commit propio sobre `main`, con `npm run build`, `npm run lint` y `npm run verify` sin errores. Primero van los incrementos que cambian las mecánicas, después el aspecto y el sonido, y al final las cuentas, para que los sprites y el audio se hagan sobre el juego definitivo.

### Incremento 18 — Memoria de frutas falsas y salto hacia adelante (HU-24, HU-29, HU-30, HU-43; decisiones 37, 38, 41 y 42)
- [ ] Redactar y ejecutar el Prompt 17
- [ ] Verificar: con el azar fijado, Pacman no consume una fruta falsa que vio colocar mientras la recuerda, y consume una colocada fuera de su vista
- [ ] Verificar: el saltarín, del jugador y de la IA, cae siempre en el semiplano de avance
- [ ] Actualizar las suites de `scripts/verify/` de los incrementos 13, 14 y 16
- [ ] Volver a medir el balance (`npm run verify:balance`)
- [ ] Registrar problemas en la tabla de la sesión
- [ ] Commit del incremento

### Incremento 19 — Mapas nuevos, base de los fantasmas y túneles (HU-44, HU-45; decisiones 26 y 34)
- [ ] Redactar y ejecutar el Prompt 18
- [ ] Verificar: Pacman no entra a la base, en ningún modo ni con cargas para destruir muros
- [ ] Verificar: los fantasmas salen de la base según lo definido, y los comidos vuelven o reaparecen según lo definido
- [ ] Verificar: el espectro tiene al menos un cruce válido en cada nivel y nunca atraviesa el borde
- [ ] Verificar: Pacman, los fantasmas de la IA y el fantasma del jugador cruzan el túnel en los dos sentidos. La IA de Pacman lo usa para huir y los fantasmas lo usan para perseguir. La velocidad dentro del túnel es la definida
- [ ] Verificar: en una simulación con el jugador quieto, en modo GhostMan gana Pacman y en modo Pacman lo comen
- [ ] Volver a medir el balance
- [ ] Registrar problemas en la tabla de la sesión
- [ ] Commit del incremento

### Incremento 20 — Impulso del acelerado (HU-31, HU-49)
- [ ] Redactar y ejecutar el Prompt 19
- [ ] Verificar: el dash de 3, 2, 1 y 0 celdas recorre las celdas en el tiempo definido, con colisión en el trayecto, y la penalidad de 5 s se mantiene
- [ ] Actualizar la suite del incremento 15
- [ ] Registrar problemas en la tabla de la sesión
- [ ] Commit del incremento

### Incremento 21 — Cuenta regresiva y modo de prueba (HU-46)
- [ ] Redactar y ejecutar el Prompt 20
- [ ] Verificar: la cuenta aparece al inicio de cada nivel, en los dos modos, y nada se mueve ni descuenta tiempo durante la cuenta
- [ ] Verificar: con el modo de prueba activo, las suites de `scripts/verify/` pasan sin cambios en sus tiempos
- [ ] Registrar problemas en la tabla de la sesión
- [ ] Commit del incremento

### Incremento 22 — Sprites de pixel art (HU-50)
- [ ] Dibujar con la skill `pxl-pixel-art`, desde cero: Pacman (boca, cuatro direcciones), un fantasma por tipo, el estado vulnerable y su parpadeo, los ojos (si los comidos vuelven a la base), las frutas real y falsa, y las esferas
- [ ] Dibujar al menos una skin alternativa de Pacman y una de los fantasmas, para probar que el diseño las admite
- [ ] Redactar y ejecutar el Prompt 21 para integrar los sprites al renderizado
- [ ] Verificar: los tipos de fantasma y el estado vulnerable se distinguen a simple vista
- [ ] Registrar problemas en la tabla de la sesión
- [ ] Commit del incremento

### Incremento 23 — Animaciones (HU-47, HU-49)
- [ ] Dibujar con `pxl-pixel-art`: la derrota de Pacman (pierde partes hasta desaparecer), el salto del saltarín (arco, sombra, marca de destino, polvo al aterrizar), la estela del acelerado y los efectos del espectro y del naval
- [ ] Redactar y ejecutar el Prompt 22
- [ ] Verificar: durante la animación de derrota el juego queda pausado, y las animaciones no alteran tiempos ni colisiones fuera de lo definido
- [ ] Registrar problemas en la tabla de la sesión
- [ ] Commit del incremento

### Incremento 24 — Música y efectos de sonido (HU-48)
- [ ] Redactar y ejecutar el Prompt 23: motor de audio con la Web Audio API, con dos canales (música y efectos) preparados para la HU-41
- [ ] Verificar: el audio arranca después de la primera interacción del usuario (política de reproducción automática de los navegadores), suena cada evento de la lista y nada suena con la pestaña oculta o la partida en pausa
- [ ] Registrar problemas en la tabla de la sesión
- [ ] Commit del incremento

### Incremento 25 — Registro, inicio de sesión y menú principal (HU-35, HU-36, HU-37)
- [ ] Redactar y ejecutar el Prompt 24
- [ ] Verificar: las validaciones de la sección 4.9 de la Entrega 01, el mensaje de error único en el login, la sesión que persiste al recargar y el menú inaccesible sin sesión
- [ ] Verificar: un registro rechazado no deja la cuenta en estado parcial
- [ ] Registrar problemas en la tabla de la sesión
- [ ] Commit del incremento

### Incremento 26 — Tableros de puntaje (HU-38, HU-39)
- [ ] Redactar y ejecutar el Prompt 25
- [ ] Cargar los datos de prueba: usuarios y puntajes para verificar el orden, el top 10 y los modos sin puntajes
- [ ] Verificar: el top 10 por modo, la alternancia con ←/→ y A/D, el tablero personal y la actualización inmediata al terminar una partida
- [ ] Registrar problemas en la tabla de la sesión
- [ ] Commit del incremento

### Incremento 27 — Opciones: skins, volumen, cerrar sesión y salir (HU-40, HU-41, HU-42)
- [ ] Redactar y ejecutar el Prompt 26
- [ ] Verificar: los carruseles de skins, la persistencia de las skins y del volumen entre sesiones, los volúmenes independientes con efecto inmediato, el cierre de sesión y la pantalla de salida
- [ ] Verificar: ninguna skin altera las mecánicas
- [ ] Registrar problemas en la tabla de la sesión
- [ ] Commit del incremento

### Cierre de la etapa de generación
- [ ] Completar la tabla de problemas con todas las filas de la sesión
- [ ] Redactar las observaciones sobre la implementación con AI
- [ ] Transcribir en el anexo los prompts de corrección no planificados
- [ ] Extender `scripts/verify/` con las suites de los incrementos 18 a 27

---

## Etapa 2 — Especificación detallada de casos de prueba

- [ ] Detallar los CP-106 a CP-140 con el formato completo, ajustados a las decisiones de la V3
- [ ] Agregar los casos nuevos de las HU-44 a HU-50 desde el CP-164
- [ ] Ajustar los casos afectados de la V1 y la V2. Como mínimo: CP-055 y CP-058 (espectro y mapas), CP-087 y CP-089 (saltarín), los del acelerado y el naval, y todos los que dependen de la posición de aparición de los fantasmas o de la cuenta de esferas
- [ ] Mutar los casos de prioridad Alta de la V1 y la V2 para la regresión
- [ ] Construir la matriz de trazabilidad

---

## Etapa 3 — Preparación de la ejecución

- [ ] Congelar `main`: registrar el commit bajo prueba y no hacer pushes que no sean correcciones de defectos registrados
- [ ] Preparar la base de Supabase de prueba con los datos de prueba (separada de la de producción, si es posible)
- [ ] Cargar los casos de la V3 y la regresión en la planilla
- [ ] Confirmar los criterios de entrada (sección 9.7 de la Entrega 01)

---

## Etapa 4 — Ejecución del ciclo de la V3

- [ ] Ejecutar los casos de prioridad Alta de la V3
- [ ] Ejecutar la regresión de la V1 y la V2
- [ ] Ejecutar los casos de prioridad Media y Baja
- [ ] Ejecutar al menos una muestra sobre el despliegue de Vercel, en lugar del build local
- [ ] Registrar cada resultado en la planilla
- [ ] Aplicar la suspensión de la sección 9.8 de la Entrega 01 ante un defecto bloqueante

---

## Etapa 5 — Defectos y cierre

- [ ] Reportar, confirmar con otro integrante y clasificar cada defecto (sección 13 de la Entrega 01)
- [ ] Reejecutar los casos afectados tras cada corrección desplegada
- [ ] Evaluar los criterios de salida
- [ ] Consolidar las secciones de ejecución, defectos y conclusiones de `entrega-03.md`
- [ ] Marcar con el tag `v3.0` el commit final
- [ ] Revisión final cruzada entre integrantes antes de la presentación
