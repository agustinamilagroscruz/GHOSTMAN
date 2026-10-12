# Workflow — Versión 2 (Modo GhostMan y fantasmas especiales)

Checklist de trabajo para llevar la V2 de GhostMan desde la especificación hasta el cierre del reporte de pruebas. Basado en `TP/entrega-02.md`. Cada etapa bloquea a la siguiente: no se pasa a la próxima sin cerrar los criterios de avance de la anterior.

Los incrementos se integran sobre `main`, y cada push despliega en Vercel: todo commit que llega a `main` tiene que compilar y dejar el juego jugable.

---

## Etapa 0 — Cierre de la especificación de la V2

- [x] Marcar con el tag `v1.0` el commit de la V1 sobre el que se ejecutó el ciclo 1 (`913ee4d`)
- [ ] Revisar en equipo las decisiones 17 a 32 (sección 5) y pasar cada una a Aprobada o Modificada
- [ ] Resolver la alternativa de la decisión 26 (espesor de muro del espectro)
- [ ] Actualizar en `entrega-01.md` los criterios de las HU afectadas (sección 6.1) y agregar la HU-43
- [ ] Ajustar la sección 4 y los prompts de la sección 7.4 a las decisiones aprobadas
- [x] Completar la sección 7.2 con el agente y la interfaz que se van a usar
- [ ] Definir quién conduce los prompts y quién registra la sesión (no puede ser la misma persona)

---

## Etapa 1 — Incrementos de generación (vibe-coding)

Un checklist por incremento. Cada uno se cierra con commit propio sobre `main`, con `npm run build` y `npm run lint` sin errores.

### Incremento 10 — Menú, carrusel y fantasma del jugador (HU-22, HU-23, HU-24)
- [x] Ejecutar Prompt 9
- [x] Verificar: desde el menú se llega a una partida en la que el jugador mueve al fantasma elegido, y el modo Pacman funciona igual que en la V1
- [x] Registrar problemas en la tabla 7.5
- [ ] Commit del incremento

### Incremento 11 — IA de Pacman (HU-24)
- [ ] Ejecutar Prompt 10
- [ ] Verificar: Pacman completa el nivel 1 sin interferencia y huye de un fantasma que se le acerca
- [ ] Registrar problemas en la tabla 7.5
- [ ] Commit del incremento

### Incremento 12 — Reglas del modo GhostMan (HU-25, HU-26, HU-27)
- [ ] Ejecutar Prompt 11
- [ ] Verificar: 3 derrotas completan el nivel, Pacman con la última esfera da Game Over y el desglose coincide con la sección 4.4
- [ ] Registrar problemas en la tabla 7.5
- [ ] Commit del incremento

### Incremento 13 — Espectro, Saltarín e indicador (HU-28, HU-29, HU-32)
- [ ] Ejecutar Prompt 12
- [ ] Verificar: los dos poderes responden a la barra espaciadora y la estrella refleja el cooldown
- [ ] Registrar problemas en la tabla 7.5
- [ ] Commit del incremento

### Incremento 14 — Naval (HU-30)
- [ ] Ejecutar Prompt 13
- [ ] Verificar: ciclo completo de la fruta falsa (colocación, consumo con y sin PowerUp, explosión, límites)
- [ ] Registrar problemas en la tabla 7.5
- [ ] Commit del incremento

### Incremento 15 — Acelerado (HU-31)
- [ ] Ejecutar Prompt 14
- [ ] Verificar: dash de 3, 2, 1 y 0 celdas, y penalidad de 5 s
- [ ] Registrar problemas en la tabla 7.5
- [ ] Commit del incremento

### Incremento 16 — Fantasmas especiales en el modo Pacman (HU-43)
- [ ] Ejecutar Prompt 15
- [ ] Verificar: composición de los niveles 2 y 3, y uso de los poderes por la IA
- [ ] Jugar una partida completa en modo Pacman para descartar regresiones evidentes
- [ ] Registrar problemas en la tabla 7.5
- [ ] Commit del incremento

### Incremento 17 — Dificultad del modo GhostMan (HU-33, HU-34)
- [ ] Ejecutar Prompt 16
- [ ] Verificar: destrucción de paredes en los niveles 2 y 3 y esferas grandes dinámicas en el nivel 3
- [ ] Registrar problemas en la tabla 7.5
- [ ] Commit del incremento

### Cierre de la etapa de generación
- [ ] Completar la tabla 7.5 con todas las filas de la sesión
- [ ] Redactar la sección 7.6 (observaciones sobre la implementación con AI)
- [ ] Transcribir en el Anexo A los prompts de corrección no planificados

---

## Etapa 2 — Especificación detallada de casos de prueba

- [ ] Detallar los CP-067 a CP-105 con el formato completo, ajustados a las decisiones 17 a 32
- [ ] Agregar los casos nuevos desde el CP-141 (sección 9)
- [ ] Ajustar los casos de la V1 afectados (sección 8.2)
- [ ] Mutar los 35 casos de prioridad Alta de la V1 para la regresión
- [ ] Construir la matriz de trazabilidad (sección 10)

---

## Etapa 3 — Preparación de la ejecución

- [ ] Congelar `main`: registrar el commit bajo prueba en la sección 11.1 y no hacer pushes que no sean correcciones de defectos registrados
- [ ] Cargar los casos de la V2 y la regresión en la planilla
- [ ] Confirmar los criterios de entrada (sección 9.7 de la Entrega 01)

---

## Etapa 4 — Ejecución del ciclo de la V2

- [ ] Ejecutar los casos de prioridad Alta de la V2
- [ ] Ejecutar la regresión de la V1
- [ ] Ejecutar los casos de prioridad Media y Baja
- [ ] Registrar cada resultado en la planilla
- [ ] Aplicar la suspensión de la sección 9.8 de la Entrega 01 ante un defecto bloqueante

---

## Etapa 5 — Defectos y cierre

- [ ] Reportar, confirmar con otro integrante y clasificar cada defecto (sección 13 de la Entrega 01)
- [ ] Reejecutar los casos afectados tras cada corrección desplegada
- [ ] Evaluar los criterios de salida
- [ ] Consolidar las secciones 11, 12 y 13 de `entrega-02.md`
- [ ] Revisión final cruzada entre integrantes antes de la presentación
