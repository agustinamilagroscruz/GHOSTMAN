# Workflow — Versión 1 (Modo Pacman)

Checklist de trabajo para llevar la V1 de GhostMan desde la generación de código hasta el cierre del reporte de pruebas. Basado en `TP/entrega-01.md`. Cada etapa bloquea a la siguiente: no se pasa a la próxima sin cerrar los criterios de avance de la anterior.

---

## Etapa 0 — Preparación previa a la generación

- [x] Confirmar el modelo/agente y la interfaz efectivamente usados (sección 8.2) y anotarlos en el documento
- [x] Preparar el contexto fijo a entregar al agente (sección 8.3): secciones 4, 7.3, 2.3 y la restricción de arquitectura agnóstica de entidad
- [x] Repositorio de GitHub ya existente, se trabaja sobre `main` (sin rama dedicada para la V1)
- [ ] Dejar lista la tabla de registro de problemas (sección 8.5) para completar durante la sesión
- [ ] Definir quién conduce los prompts y quién registra la sesión (no puede ser la misma persona, sección 6.2)

---

## Etapa 1 — Incrementos de generación (vibe-coding)

Un checklist por incremento. Cada uno se cierra con commit propio.

### Incremento 1 — Andamiaje del proyecto y bucle de juego
- [x] Ejecutar Prompt 0 (contexto y andamiaje)
- [x] Verificar: el mapa del nivel 1 se dibuja y el bucle corre a velocidad estable
- [x] Registrar problemas encontrados en la tabla 8.5
- [x] Commit del incremento (`36a065a`)

### Incremento 2 — Movimiento de Pacman y colisión con muros (HU-01, HU-02)
- [ ] Ejecutar Prompt 1
- [ ] Verificar: Pacman recorre el laberinto sin atravesar muros
- [ ] Registrar problemas en la tabla 8.5
- [ ] Commit del incremento

### Incremento 3 — Esferas, contador y finalización de nivel (HU-03, HU-04, HU-14)
- [ ] Ejecutar Prompt 2
- [ ] Verificar: el nivel se completa al consumir la última esfera
- [ ] Registrar problemas en la tabla 8.5
- [ ] Commit del incremento

### Incremento 4 — Fantasmas clásicos con IA chase/scatter (HU-16, HU-04)
- [ ] Ejecutar Prompt 3
- [ ] Verificar: los fantasmas persiguen y se dispersan de manera observable
- [ ] Registrar problemas en la tabla 8.5
- [ ] Commit del incremento

### Incremento 5 — Vidas, colisión con fantasmas y Game Over (HU-08, HU-09, HU-10)
- [ ] Ejecutar Prompt 4
- [ ] Verificar: se pierden vidas y la partida termina al agotarlas
- [ ] Registrar problemas en la tabla 8.5
- [ ] Commit del incremento

### Incremento 6 — PowerUp, fantasmas vulnerables y comer fantasmas (HU-05, HU-06, HU-07)
- [ ] Ejecutar Prompt 5
- [ ] Verificar: el ciclo completo del PowerUp funciona con su aviso de fin
- [ ] Registrar problemas en la tabla 8.5
- [ ] Commit del incremento

### Incremento 7 — Puntaje, frutas y desglose final (HU-11, HU-12, HU-13)
- [ ] Ejecutar Prompt 6
- [ ] Verificar: el puntaje coincide con la fórmula de la sección 4.2
- [ ] Registrar problemas en la tabla 8.5
- [ ] Commit del incremento

### Incremento 8 — Tres niveles, mapas propios y progresión de dificultad (HU-15, HU-17, HU-18)
- [ ] Ejecutar Prompt 7
- [ ] Verificar: los tres niveles se juegan en orden con su composición de fantasmas
- [ ] Registrar problemas en la tabla 8.5
- [ ] Commit del incremento

### Incremento 9 — Pausa y pantallas de fin de partida (HU-19, HU-20, HU-21)
- [ ] Ejecutar Prompt 8
- [ ] Verificar: la partida se pausa y se puede reiniciar desde la pantalla de cierre
- [ ] Registrar problemas en la tabla 8.5
- [ ] Commit del incremento

### Cierre de la etapa de generación
- [ ] Completar la sección 8.5 (registro de problemas) con todas las filas de la sesión
- [ ] Redactar la sección 8.6 (observaciones sobre la implementación con AI)
- [ ] Transcribir en el Anexo A los prompts de corrección que no estaban planificados

---

## Etapa 2 — Despliegue

- [ ] Desplegar la V1 en Vercel
- [ ] Registrar la URL de despliegue en la portada y en el Anexo C
- [ ] Registrar el hash del commit bajo prueba (sección 12.1)
- [ ] Verificar que la aplicación permite iniciar y jugar una partida sin errores de arranque (criterio de entrada, sección 9.7)

---

## Etapa 3 — Preparación de la ejecución de pruebas

- [ ] Cargar los 66 casos de prueba de la V1 en la hoja `Casos de prueba` de Google Sheets
- [ ] Preparar la hoja `Ejecución` para el ciclo 1
- [ ] Preparar la hoja `Defectos`
- [ ] Confirmar los criterios de entrada de la sección 9.7 (versión desplegada, casos revisados, planilla lista)
- [ ] Completar en la sección 12.1: commit, entorno, navegador, fechas y ejecutores del ciclo

---

## Etapa 4 — Ejecución del primer ciclo (prioridad Alta, 35 casos)

- [ ] Ejecutar CP-001 a CP-017 (E1 — Núcleo de juego y movimiento)
- [ ] Ejecutar CP-018 a CP-033 (E2 — PowerUp e interacción con fantasmas)
- [ ] Ejecutar CP-034 a CP-046 (E3 — Vidas, puntaje y fin de partida)
- [ ] Ejecutar CP-047 a CP-062 (E4 — Niveles y progresión de dificultad)
- [ ] Ejecutar CP-063 a CP-066 (E5 — Control de la partida)
- [ ] Registrar cada resultado en la hoja `Ejecución` (Aprobado / Fallido / Bloqueado / No ejecutado)
- [ ] Si aparece un defecto bloqueante, aplicar la suspensión de la sección 9.8 y marcar los casos suspendidos

---

## Etapa 5 — Reporte y confirmación de defectos

- [ ] Cargar cada defecto detectado con la plantilla de la sección 13.3
- [ ] Confirmar cada defecto con un integrante distinto del que lo reportó (sección 13.2)
- [ ] Clasificar severidad y prioridad según la sección 13.1
- [ ] Priorizar la corrección de defectos Bloqueantes y Críticos antes de continuar
- [ ] Reejecutar los casos afectados tras cada corrección desplegada (verificación)

---

## Etapa 6 — Ejecución de prioridad Media y Baja

- [ ] Ejecutar los 27 casos de prioridad Media
- [ ] Ejecutar los 4 casos de prioridad Baja, si el tiempo lo permite
- [ ] Declarar en la sección 12.7 los casos no ejecutados y su motivo

---

## Etapa 7 — Cierre del ciclo y consolidación de reportes

- [ ] Evaluar los criterios de salida de la sección 9.7 (tabla 12.6)
- [ ] Completar el resumen cuantitativo de la sección 12.4 (avance, tasa de aprobación, densidad de defectos)
- [ ] Completar los resultados por épica de la sección 12.5 y contrastarlos con el riesgo estimado (sección 9.4)
- [ ] Completar el resumen de defectos por severidad y estado (sección 13.5) y por épica (sección 13.6)
- [ ] Redactar las conclusiones de la ejecución (sección 12.8)
- [ ] Redactar el análisis preliminar de los defectos (sección 13.7), distinguiendo defectos de especificación vs. defectos de generación con AI
- [ ] Adjuntar la evidencia de casos fallidos y defectos en el Anexo B

---

## Etapa 8 — Cierre de la entrega

- [ ] Revisar que las secciones 1 a 14 del documento estén completas para la V1
- [ ] Actualizar los enlaces del Anexo C (repositorio, despliegue, planilla)
- [ ] Revisión final cruzada entre integrantes antes de la presentación
