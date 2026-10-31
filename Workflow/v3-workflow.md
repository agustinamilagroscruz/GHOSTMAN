# Workflow — Versión 3 (Cuentas, puntajes, personalización y look & feel)

Checklist de trabajo para llevar la V3 de GhostMan, la versión final, desde la especificación hasta el cierre del reporte de pruebas. Basado en `TP/entrega-01.md` (sección 7.5, HU-35 a HU-42), en los pendientes de la sección 13.2 de `TP/entrega-02.md` y en el alcance de look & feel acordado al iniciar la V3. El documento de la entrega es `TP/entrega-03.md`. Cada etapa bloquea a la siguiente: no se pasa a la próxima sin cerrar los criterios de avance de la anterior.

Los incrementos se integran sobre `main`, y cada push despliega en Vercel: todo commit que llega a `main` tiene que compilar y dejar el juego jugable.

La numeración continúa la de la V2: incrementos desde el 18, prompts desde el 17, decisiones desde la 41, historias desde la HU-44 y casos de prueba desde el CP-164.

> **Estado al 30/10/2026:** V2 cerrada. Especificación de la V3 cerrada por D. Savoia (decisiones 26, 34, 37, 38 y 41 a 66). Incrementos 18 a 20 ejecutados.

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
| 41 | Detalle de la 38: el semiplano es **estricto**; la fila o la columna actual del fantasma no cuenta. Si está quieto, se usa su última dirección de avance. Sin destino válido, el salto no se ejecuta y el poder no entra en cooldown | HU-29 |
| 42 | Detalle de la 37: Pacman registra la fruta **en el instante de la colocación**, si está a 8 celdas de recorrido o menos en ese momento. Una fruta colocada lejos no se registra después, aunque Pacman se acerque | HU-30 |
| 43 | La música y los efectos de sonido son **originales**, sintetizados con la Web Audio API "al estilo" del Pac-Man original. No se usan los archivos de Bandai Namco porque el juego está desplegado públicamente | HU-48 |
| 44 | Puerta de la base: los fantasmas vivos solo la cruzan para salir, y los comidos (sus ojos) solo para entrar. Pacman no la cruza nunca. Vale también para el fantasma del jugador, para que no pueda refugiarse en la base | HU-44 |
| 45 | Salida de la base. **Modo Pacman:** un fantasma arranca afuera, sobre la puerta (fila 11), y los otros tres salen de a uno, cada 3 s contados desde el "¡ya!" de la cuenta regresiva. **Modo GhostMan:** el fantasma del jugador arranca adentro y sale cuando el jugador lo mueve hacia la puerta; si no se mueve, Pacman termina el nivel (decisión 34). Los fantasmas de la IA salen con el mismo intervalo. Rige al inicio del nivel y después de perder una vida | HU-44, HU-25 |
| 46 | Fantasma comido: quedan sus ojos, que vuelven solos a la base al doble de velocidad y sin colisionar con nada. Al entrar, el fantasma revive y vuelve a salir; en modo Pacman cambia de tipo en ese momento (niveles 2 y 3). El naval espera 3 s dentro de la base antes de salir, para conservar su penalidad (sección 4.5 de la Entrega 02). El fantasma del jugador vuelve en piloto automático y el jugador recupera el control al revivir. Reemplaza los temporizadores fijos de 5 s y 8 s | HU-44, HU-43, sección 4.5 |
| 47 | El cooldown de todos los fantasmas, del jugador y de la IA, sigue corriendo mientras están comidos. Resuelve el pendiente 6 de la V2 y alinea la IA con la decisión 35 b | HU-18, HU-43 |
| 48 | Túnel. Los fantasmas van al 50 % de su velocidad en las celdas del túnel (fila 13, columnas 0 a 3 y 24 a 27). Pacman y los ojos de los fantasmas comidos mantienen su velocidad, y el dash del acelerado ignora la reducción. Las distancias por recorrido cuentan el paso por el túnel; la distancia Manhattan del saltarín no | HU-45 |
| 49 | Celdas restringidas. Las frutas reales y las falsas del naval no aparecen dentro de la base ni en las celdas del túnel. El saltarín nunca cae dentro de la base. La destrucción de muros de Pacman (decisión 22) nunca rompe los muros de la base ni el borde del mapa | HU-44, HU-45, HU-29, HU-30, HU-33 |
| 50 | Un personaje a mitad del túnel se dibuja recortado en el borde del mapa y aparece del otro lado, sin quedar dibujado sobre el HUD | HU-45 |
| 51 | Decisión 22 con los mapas nuevos: se mantienen las 5 cargas por esfera grande y se vuelve a medir el balance con el bot después del incremento 19, para ajustar con datos. Las 6 esferas grandes fijas del nivel 3 del modo GhostMan son las 4 del boceto, en (1,1), (1,26), (29,1) y (29,26), más (15,1) y (15,26) | HU-33, HU-34 |
| 52 | Cuenta regresiva: "3", "2" y "1" de 1 s cada uno y "¡ya!" de 0,5 s (3,5 s) al inicio de cada nivel; en el primer nivel suena el jingle de inicio. Después de perder una vida se muestra "¡Listo!" durante 2 s. Mientras dura se congelan el reloj del bonus por tiempo, los cooldowns, las frutas, la IA y la salida de la base; el intervalo de la decisión 45 cuenta desde el "¡ya!". La pausa también detiene la cuenta | HU-46 |
| 53 | Derrota de Pacman: 0,5 s congelado con los fantasmas visibles, después los fantasmas desaparecen y Pacman se desarma durante 1,5 s con su sonido; luego "¡Listo!" o Game Over. En modo GhostMan se usa la misma animación cuando el jugador derrota a Pacman | HU-47 |
| 54 | Impulso del acelerado: recorre sus hasta 3 celdas en 0,25 s (12 celdas/s), con una estela de 2 o 3 siluetas. La colisión con Pacman es normal en todo el trayecto (lo derrota o, si el acelerado está vulnerable, Pacman se lo come). Se mantienen la regla de 3, 2, 1 o 0 celdas y la penalidad de 5 s | HU-31, HU-49 |
| 55 | Salto del saltarín: el destino se elige al activar el poder (decisión 38) y se marca con una sombra que crece hasta el aterrizaje. El salto dura 0,6 s, en arco, con estiramiento al despegar y caer y polvo al aterrizar. En el aire no colisiona y el jugador no lo controla; al aterrizar la colisión es normal | HU-29, HU-49 |
| 56 | Efectos del resto de los poderes. Espectro: semitransparente y ondulado mientras atraviesa. Naval: aparición al colocar la fruta, parpadeo en sus últimos 2 s y explosión de 0,5 s que muestra el radio. Romper un muro: los escombros actuales se redibujan con pxl. El clásico no tiene efecto | HU-49 |
| 57 | Sonidos por canal. **Música:** jingle de inicio, sirena de fondo en bucle, sirena del PowerUp, jingle de nivel completado y jingle de Game Over. **Efectos:** waka, esfera grande, comer fantasma, ojos que vuelven, fruta, derrota de Pacman, pitidos de la cuenta, un sonido por poder (atravesar, saltar, impulso, colocar fruta, explosión) y romper un muro | HU-48, HU-41 |
| 58 | Sprites: celdas y sprites de 16 × 16 px; el mapa (448 × 496 px) se escala por un entero. Cada sprite usa roles de color (cuerpo, contorno, ojos, detalle) y una skin es una paleta para esos roles. Cada tipo de fantasma tiene un rasgo de forma que no depende del color: espectro con borde ondulado y transparencia, saltarín con resortes, naval con gorro, acelerado con líneas de velocidad, clásico con la forma tradicional. El estado vulnerable (azul con parpadeo blanco) tiene prioridad sobre cualquier skin. Cuadros: Pacman 3 por dirección, derrota unos 10, fantasmas 2 con ojos que miran hacia donde avanzan, vulnerables 2 más el parpadeo, ojos en 4 direcciones | HU-50, HU-40 |
| 59 | Modo de prueba: las duraciones de la cuenta, del "¡Listo!" y de las animaciones son parámetros de la configuración de la partida. El núcleo usa 0 por defecto. En el navegador, `?modoPrueba=1` las pone en 0 y silencia el audio. El parámetro solo se acepta en builds de prueba (variable de entorno de build), no en el despliegue de Vercel, para que un jugador no pueda saltear la cuenta | Incremento 21 |
| 60 | Dos proyectos de Supabase, creados y administrados por D. Savoia: producción (conectado a Vercel) y prueba (con datos de prueba precargados). En el navegador y en Vercel va solo la URL y la clave pública de cada proyecto; la clave de servicio no va nunca al repositorio ni a Vercel | HU-35 a HU-42 |
| 61 | Autenticación: email sintético a partir del username en minúsculas (`<username>@ghostman.invalid`), con la confirmación por email desactivada; si Supabase rechaza ese dominio, se usa otro dominio sintético. El username no distingue mayúsculas, tampoco para la unicidad, y se muestra como se registró. El perfil se crea en la misma transacción que el usuario, así que un registro rechazado no deja nada creado. Las reglas de la contraseña se validan en el formulario y en la configuración de Supabase. El mensaje de error del login es único, y la sesión persiste al recargar | HU-35, HU-36 |
| 62 | Tablas: `profiles` (username, skins de Pacman y de los fantasmas, volumen de música y de efectos de 0 a 100) y `best_scores` (una fila por usuario y modo, con el mejor puntaje y la fecha). El top 10 sale de `best_scores` y cada jugador aparece una vez por modo. **Empates:** queda arriba el puntaje logrado antes. Permisos: con sesión iniciada se leen los usernames y los tableros; cada usuario modifica solo sus preferencias; nadie escribe puntajes directamente | HU-38, HU-39, HU-40, HU-41 |
| 63 | Los puntajes se guardan solo con una función de la base de datos que valida el modo, rechaza puntajes por encima del máximo posible de cada modo y actualiza solo si supera el mejor personal. Que un usuario pueda enviar un puntaje inventado dentro del rango es una limitación conocida, que se registra en el análisis de riesgos | HU-39 |
| 64 | Salir del juego detiene el bucle y el audio y muestra "¡Gracias por jugar!" con un botón para volver a entrar. No cierra la sesión | HU-42 |
| 65 | Sin conexión: al terminar la partida se muestra el resultado con "No se pudo guardar el puntaje" y un botón para reintentar, sin cola local. En el registro y el login se muestra un error general | HU-35, HU-36, HU-39 |
| 66 | Para jugar hace falta sesión iniciada (HU-37). Todos los casos manuales de la V1 y la V2 suman la precondición "sesión iniciada con el usuario de prueba", y los scripts de navegador inician sesión contra el proyecto de prueba. Las pruebas del núcleo no cambian | HU-37, regresión |
| 67 | Dentro de la base ningún fantasma puede usar su poder; el intento no consume el cooldown. Surgió en el incremento 19 (tabla 7.5, fila 6) | HU-44, HU-28 a HU-31 |

---

## Etapa 0 — Cierre de la especificación de la V3

### Pendientes de la V2 (sección 13.2 de `entrega-02.md`)
- [x] Decidir la decisión 26 (espesor de muro del espectro)
- [x] Decidir la decisión 34 (el jugador quieto puede ganar)
- [x] Decidir la decisión 37 (memoria de frutas: opción B, *p* = 5 %)
- [x] Decidir la decisión 38 (saltarín: opción A)
- [x] Aprobar las decisiones 41 y 42 (detalles de la 37 y la 38)
- [x] Decidir la decisión 67: dentro de la base ningún fantasma puede usar su poder (aprobada; ya implementada en el incremento 19)
- [ ] Revisar las decisiones 17 a 36 y pasarlas a Aprobada o Modificada
- [x] Decidir si el cooldown de los fantasmas de la IA sigue corriendo mientras están comidos (pendiente 6): sí, decisión 47
- [ ] Validar la explosión de la fruta falsa como derrota en modo GhostMan (pendiente 8)
- [ ] Decidir qué hacer con CP-032 (HU-08): marcarlo *No aplica* o reformular el criterio
- [ ] Confirmar y verificar DEF-002 con otro integrante, y repetir una muestra de casos sobre el despliegue de Vercel
- [ ] Subir el tag `v1.0` al remoto (`git push origin v1.0`) y crear el tag `v2.0` sobre el commit bajo prueba de la V2

### Base de los fantasmas, túneles y mapas (HU-44, HU-45)
- [x] Decidir las dimensiones de los mapas nuevos: 28 × 31, como el original. Si los niveles resultan lentos, se ajustan las velocidades después de un playtest
- [x] Definir la ubicación de la base y de la puerta: la misma en los tres niveles (`v3-mapas.md`). La base es infranqueable salvo por la puerta, también para los poderes
- [x] Definir quién cruza la puerta y en qué sentido (decisión 44)
- [x] Definir la salida de los fantasmas en modo Pacman: orden y tiempos (decisión 45)
- [x] Definir dónde aparece el fantasma del jugador en modo GhostMan y cuándo puede salir (decisión 45)
- [x] Definir qué hace un fantasma comido: los ojos vuelven a la base (decisión 46)
- [x] Definir la interacción de los poderes con la base: es infranqueable salvo por la puerta (decisiones 44 y 49)
- [x] Definir qué pasa con las esferas de las esquinas donde aparecían los fantasmas: se resuelve con los mapas nuevos, porque los fantasmas aparecen en la base
- [x] Rediseñar los tres mapas: bocetos aprobados en `Workflow/v3-mapas.md`, con muros finos para el espectro
- [x] Túneles: uno por nivel, en la fila 13, en la misma posición en los tres niveles (`v3-mapas.md`)
- [x] Túneles: definir si los fantasmas van más lentos dentro del túnel, como en el original: sí, al 50 % en las celdas del túnel; Pacman mantiene su velocidad (decisión 48)
- [x] Túneles: definir cómo se cuentan las distancias que cruzan el túnel. Propuesta: las distancias **por recorrido** (IA de Pacman, persecución de los fantasmas, visión de 8 celdas de la decisión 37) cuentan el túnel. La distancia **Manhattan** del radio del saltarín (decisión 31) no lo cuenta, porque el ejecutor la verifica contando celdas en pantalla
- [x] Túneles: interacción con los poderes (decisiones 48 y 49). El espectro no puede cruzar el borde (decisión 26), pero el túnel no es un muro. El dash del acelerado puede atravesarlo. Definir si el naval puede colocar una fruta falsa dentro del túnel y si la destrucción de muros de Pacman puede abrir un túnel nuevo en el borde (propuesta: no, el borde es indestructible)
- [x] Túneles: dibujado (decisión 50). Definir qué se ve mientras un personaje está a medio cruzar (propuesta: el sprite se recorta en el borde y aparece del otro lado, sin quedar dibujado sobre el HUD)
- [x] Revisar el impacto en la decisión 22 (decisión 51). Las cargas se vuelven a medir después del incremento 19

### Look & feel (HU-46 a HU-50)
- [x] Cuenta regresiva (decisión 52): duración (propuesta: 1 s por número más 0,5 s para el "¡ya!"). Definir si se repite, más corta, al reaparecer tras perder una vida, como el "READY!" del original. Durante la cuenta se congelan el reloj del bonus por tiempo, los cooldowns, los temporizadores y la IA
- [x] Animación de derrota de Pacman (decisión 53): duración (propuesta: alrededor de 1,5 s). Durante la animación el juego se pausa y los fantasmas desaparecen
- [x] Acelerado (cambia HU-31; decisión 54): el dash recorre las celdas en lugar de teletransportarse. Definir la duración del impulso (propuesta: 0,25 s) y la colisión durante el recorrido (propuesta: normal con Pacman en todas las celdas que atraviesa)
- [x] Saltarín (cambia HU-29; decisión 55): definir la duración del salto y si colisiona en el aire (propuesta: no colisiona mientras está en el aire). Antes de caer se marca la celda de destino
- [x] Efectos del espectro, el naval (colocación y explosión) y el fantasma clásico (decisión 56)
- [x] Lista de sonidos (decisión 57): música de inicio, waka, esfera grande, fantasma comido, fruta, muerte, poder de cada tipo, explosión, victoria y Game Over. Cada sonido se asigna al canal de música o al de efectos (HU-41)
- [x] Definir los sprites (decisión 58): tamaño de celda en píxeles, paleta base, cuadros por animación y cómo se aplican las skins (por paleta o con sprites alternativos). Las skins tienen que conservar la distinción entre tipos y el estado vulnerable
- [x] Definir un **modo de prueba** (decisión 59) que saltee la cuenta regresiva y las animaciones, para que `scripts/verify/` siga funcionando

### Cuentas y puntajes (HU-35 a HU-42)
- [ ] Crear los proyectos de Supabase de producción y de prueba (D. Savoia, decisión 60) y pasar la URL y la clave pública de cada uno
- [ ] Cargar las variables de entorno en Vercel y en `.env.local` (el archivo no se sube al repositorio)
- [x] Decidir cómo se autentica un *username* sin email (decisión 61). Supabase Auth trabaja con email, así que la propuesta es un email sintético (`<username en minúsculas>@ghostman.invalid`), que además resuelve que el username no distinga mayúsculas (HU-36)
- [x] Definir el esquema (decisión 62): `profiles` (username único, skins, volúmenes) y `scores` (usuario, modo, puntaje, fecha), con políticas RLS
- [x] Definir cómo se registra un puntaje (decisión 63) para que un usuario no pueda escribir puntajes arbitrarios desde la consola. Mínimo: RLS por usuario y validación de rangos
- [x] Definir la "pantalla de salida" de la HU-42 en un juego web (decisión 64)
- [x] Definir qué pasa al terminar una partida sin conexión a Supabase (decisión 65)
- [ ] En Supabase: desactivar la confirmación por email y configurar las reglas de contraseña (mínimo 8, letras y números)
- [ ] Crear en el proyecto de prueba el usuario de prueba y los datos de prueba de los tableros

### Documentación
- [x] Crear `TP/entrega-03.md` con la estructura de `entrega-02.md`
- [x] Redactar las HU-44 a HU-50 y los ajustes a las HU-24, HU-29, HU-30, HU-31 y HU-43 (sección "Ajustes a las historias de usuario")
- [x] Actualizar el documento de historias de usuario
- [x] Registrar las decisiones 41 en adelante con su fundamento (sección 5 de `entrega-03.md`)
- [ ] Redactar los prompts 17 en adelante
- [ ] Definir quién conduce los prompts y quién registra la sesión (no puede ser la misma persona)

---

## Etapa 1 — Incrementos de generación (vibe-coding)

Un checklist por incremento. Cada uno se cierra con un commit propio sobre `main`, con `npm run build`, `npm run lint` y `npm run verify` sin errores. Primero van los incrementos que cambian las mecánicas, después el aspecto y el sonido, y al final las cuentas, para que los sprites y el audio se hagan sobre el juego definitivo.

### Incremento 18 — Memoria de frutas falsas y salto hacia adelante (HU-24, HU-29, HU-30, HU-43; decisiones 37, 38, 41 y 42)
- [x] Redactar y ejecutar el Prompt 17
- [x] Verificar: con el azar fijado, Pacman no consume una fruta falsa que vio colocar mientras la recuerda, y consume una colocada fuera de su vista
- [x] Verificar: el saltarín, del jugador y de la IA, cae siempre en el semiplano de avance
- [x] Actualizar las suites de `scripts/verify/` de los incrementos 13, 14 y 16 (la 16 no necesitó cambios) y agregar `core/inc18.js`
- [x] Volver a medir el balance (`npm run verify:balance`): sección 7.6 de `entrega-03.md`
- [x] Registrar problemas en la tabla de la sesión
- [x] Commit del incremento

### Incremento 19 — Mapas nuevos, base de los fantasmas y túneles (HU-44, HU-45; decisiones 26 y 34)
- [x] Redactar y ejecutar el Prompt 18
- [x] Verificar: Pacman no entra a la base, en ningún modo ni con cargas para destruir muros
- [x] Verificar: los fantasmas salen de la base cada 3 s (decisión 45), los ojos de los comidos vuelven a la base y el naval espera 3 s adentro (decisión 46)
- [x] Verificar: el espectro tiene al menos un cruce válido en cada nivel y nunca atraviesa el borde
- [x] Verificar: Pacman cruza el túnel en los dos sentidos, la IA de Pacman lo usa para llegar a una esfera del otro lado, el contacto se detecta a través del borde y los fantasmas van al 50 % dentro del túnel. La huida de Pacman y la persecución de los fantasmas usan la misma regla de vecindad, pero no tienen una comprobación propia
- [x] Verificar: en una simulación con el jugador quieto, en modo GhostMan gana Pacman y en modo Pacman lo comen
- [x] Volver a medir el balance (sección 7.6 de `entrega-03.md`). **Pendiente del equipo:** decidir, después de un playtest, si se ajustan las velocidades y las 5 cargas de la decisión 22 (decisión 51)
- [x] Registrar problemas en la tabla de la sesión
- [x] Commit del incremento

### Incremento 20 — Impulso del acelerado (HU-31, HU-49)
- [x] Redactar y ejecutar el Prompt 19
- [x] Verificar: el dash de 3, 2, 1 y 0 celdas recorre las celdas en el tiempo definido, con colisión en el trayecto, y la penalidad de 5 s se mantiene
- [x] Actualizar las suites de los incrementos 15 y 16 y agregar `core/inc20.js`
- [x] Registrar problemas en la tabla de la sesión
- [x] Commit del incremento

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
- [ ] Agregar a todos los casos de la V1 y la V2 la precondición de sesión iniciada (decisión 66)
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
