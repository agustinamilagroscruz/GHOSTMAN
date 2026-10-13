# Evidencia de la ejecución de la Entrega 2 (ciclo 2, V2)

- `capturas/`: capturas tomadas durante la ejecución (CP-0xx = casos de la V2; REG-CP-0xx = regresión de la V1; CONF-DEF-001 = confirmación de DEF-001).
- `results_v2.json`, `results_reg.json`, `results_conf.json`: estado y resultado obtenido de cada caso, tal como se cargaron en la planilla.
- `scripts/`: scripts de navegador (Python + Playwright) que ejecutaron los casos.
  - `spec_v2.py`: especificación de los 62 casos de la V2 (CP-067 a CP-105 y CP-141 a CP-163).
  - `regression.py`: mutaciones de los 35 casos Alta de la V1 y pruebas de confirmación.
  - `exec_v2.py`, `reg_exec.py`, `conf_exec.py`: ejecución de cada grupo; `harness.py`: utilidades comunes.

Para correrlos hace falta un build del juego con una línea extra en `src/app/GameCanvas.tsx`, justo antes de `const input = createKeyboardDirectionInput(`:

```ts
(window as unknown as { __gm: GameState }).__gm = state; // solo para la ejecución de pruebas
```

Esa línea expone el estado del juego para que el script verifique los resultados y prepare precondiciones; no forma parte del código entregado. Luego: `npm run build && npm start` y `python3 scripts/exec_v2.py [CP-067 ...]`.
