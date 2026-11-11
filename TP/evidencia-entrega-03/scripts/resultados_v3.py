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
}
