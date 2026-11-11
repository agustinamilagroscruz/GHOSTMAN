# Evidencia de la Entrega 3 (V3)

- `scripts/spec_v3.py`: especificación de los casos de prueba de la V3 (CASES) y de la regresión de la V1 y la V2 (ADJ, MUT_V3), en el formato de `spec_v2.py` de la Entrega 2. Cada caso tiene precondiciones, datos de prueba y pasos con su resultado esperado; el del último paso es el criterio de aprobación.
- `scripts/build_planilla_v3.py`: arma `TP/GhostMan - Reporte de Casos de Prueba y Ejecución - Entrega 3.xlsx` a partir de la planilla de la Entrega 2 (estilos, registro de ejecución de los ciclos 1 y 2, defectos) y de `spec_v3.py`. Necesita `openpyxl`. Regenera la planilla entera, así que los resultados no se cargan en el xlsx sino en `resultados_v3.py`.
- `scripts/resultados_v3.py`: resultados del ciclo 3 (estado, fecha, ejecutor, resultado obtenido, defecto y observaciones de cada caso ejecutado). `build_planilla_v3.py` los vuelca en la hoja de reporte y en el registro de ejecución de cada caso.

- `scripts/limpiar_tableros.sql`: deja vacíos los dos tableros del proyecto de Supabase de **prueba** (borra los usuarios de las suites y de los datos de prueba, y todos los puntajes). Se corre en el SQL Editor; nunca en producción.
- `scripts/cargar_datos_prueba.js`: carga DP-1 a DP-3 (sección 9.2 de `entrega-03.md`) por la API pública, con `.env.local` apuntando al proyecto de prueba, y comprueba el tablero resultante. Fases `pacman` y `ghostman`, para ejecutar CP-127 entre las dos. Se niega a correr contra otro proyecto.

- `scripts/ejecutar_tableros.js`: ejecución con script de navegador de CP-124, CP-125, CP-126 y CP-128 (tableros), con una captura por paso en `capturas/`.
- `scripts/ejecutar_cuentas.js`: ejecución con script de navegador de CP-106 a CP-123, CP-138, CP-139 y CP-196 a CP-199 (cuentas, menú, volumen persistente, cerrar sesión y sin conexión). Acepta una lista de casos como argumento.

La ejecución (etapa 4) agrega acá las capturas y los resultados.
