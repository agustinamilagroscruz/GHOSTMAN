# Resultados de la ejecución del ciclo 3 (V3), etapa 4 del workflow.
#
# build_planilla_v3.py los vuelca a la planilla de la Entrega 3: el estado, el ejecutor, la fecha, los
# defectos y las observaciones en la hoja de reporte, y la fila «Ciclo 3» del registro de ejecución en
# la hoja de cada caso. La planilla se regenera entera, así que los resultados se cargan acá y no en el
# xlsx (openpyxl no conserva los gráficos al editar el archivo).
#
# Estados (sección 12.2): Aprobado, Fallido, Bloqueado, No ejecutado, No aplica.
# fecha: (año, mes, día). defecto: "DEF-nnn" o None. obs: se agrega a las observaciones del caso.
RESULTS = {
    "CP-127": dict(
        estado="Aprobado", fecha=(2026, 11, 11), ejecutor="Rodriguez Castro",
        obtenido="En «Modo GhostMan», con el tablero vacío, se muestra «Todavía no hay puntajes en este modo» en lugar del tablero.",
        defecto=None,
        obs="Ejecutado en la etapa 3, entre la carga de la fase pacman y la de la fase ghostman de los datos de prueba (sección 9.2).",
    ),
    # CP-124 a CP-128: script de navegador ejecutar_tableros.js sobre el build local (commit 8fc1c86,
    # mismo código del juego que el incremento 29) contra el proyecto de prueba con DP-1 a DP-3, en
    # Chrome 157. Capturas en TP/evidencia-entrega-03/capturas/.
    "CP-124": dict(
        estado="Aprobado", fecha=(2026, 11, 11), ejecutor="Rodriguez Castro (script)",
        obtenido="«Modo PacMan» con las columnas «#», «Jugador» y «Puntaje»; 10 filas de tpac01 (3000) a tpac10 (1200), de mayor a menor. tpac11 y tpac12 no aparecen; en el empate de 2000, tpac06 queda arriba de tpac07.",
        defecto=None, obs="Script de navegador ejecutar_tableros.js; capturas CP-124-paso1.",
    ),
    "CP-125": dict(
        estado="Aprobado", fecha=(2026, 11, 11), ejecutor="Rodriguez Castro (script)",
        obtenido="→ muestra «Modo GhostMan» con su tablero (tgho01 4000 primero); ←, D y A muestran «Modo PacMan», «Modo GhostMan» y «Modo PacMan».",
        defecto=None, obs="Script de navegador ejecutar_tableros.js; captura CP-125-paso2.",
    ),
    "CP-126": dict(
        estado="Aprobado", fecha=(2026, 11, 11), ejecutor="Rodriguez Castro (script)",
        obtenido="«Modo GhostMan» muestra 4 filas, posiciones 1 a 4 (tgho01 4000, tgho02 3500, tgho03 3000, verificador 2500), sin filas vacías.",
        defecto=None, obs="Script de navegador ejecutar_tableros.js; captura CP-126-paso2. Resultado esperado corregido a 4 filas en la etapa 3 (sección 9.1).",
    ),
    "CP-128": dict(
        estado="Aprobado", fecha=(2026, 11, 11), ejecutor="Rodriguez Castro (script)",
        obtenido="«Tu mejor puntaje» muestra 1000 en «Modo PacMan» y 2500 en «Modo GhostMan»; no cambia al alternar el tablero con → y ←.",
        defecto=None, obs="Script de navegador ejecutar_tableros.js; captura CP-128-paso2.",
    ),
}
