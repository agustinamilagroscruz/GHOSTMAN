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


# CP-106 a CP-123, CP-138, CP-139 y CP-196 a CP-199: script de navegador ejecutar_cuentas.js sobre el
# build de prueba local (commit 92175f4, mismo código del juego que el incremento 29) contra el proyecto
# de prueba, en Chrome 157. Capturas <caso>-paso<n> en TP/evidencia-entrega-03/capturas/.
def _script(obtenido, obs=None):
    nota = "Script de navegador ejecutar_cuentas.js; capturas en evidencia-entrega-03/capturas."
    return dict(estado="Aprobado", fecha=(2026, 11, 11), ejecutor="Rodriguez Castro (script)", obtenido=obtenido,
                defecto=None, obs=f"{nota} {obs}" if obs else nota)


RESULTS.update({
    "CP-106": _script("cp1061111 / Prueba2026 se aceptan sin errores; la cuenta se crea y se muestra el menú con «Hola, cp1061111» y «Jugar», «Puntajes» y «Opciones»."),
    "CP-107": _script("«ab» y «abcdefghijklmnopq» (17) se rechazan con «Debe tener entre 3 y 16 caracteres» junto a «Usuario»; se sigue en «Crear cuenta»."),
    "CP-108": _script("«c11» (3) y «cp1081111abcdefg» (16) se aceptan: las dos cuentas se crean y se muestra el menú con su saludo."),
    "CP-109": _script("«cp 109» y «cp_109!» se rechazan con «Solo letras y números, sin espacios ni símbolos» junto a «Usuario»."),
    "CP-110": _script("«VERIFICADOR» se rechaza con «Ese nombre de usuario ya está en uso» junto a «Usuario»; no se inicia sesión."),
    "CP-111": _script("«Prueba1» (7) se rechaza con «Debe tener al menos 8 caracteres»; con «Prueba12» (8) la cuenta cp1111111 se crea y se muestra el menú."),
    "CP-112": _script("«PruebaGhost» y «20261110» se rechazan con «Debe tener al menos una letra y un número» junto a «Contraseña»."),
    "CP-113": _script("«Prueba2026» / «prueba2026» se rechaza con «Las contraseñas no coinciden» junto a «Confirmar contraseña»."),
    "CP-114": _script("Con los tres campos vacíos, «Este campo es obligatorio» junto a cada uno; con solo «Usuario», el mensaje queda junto a «Contraseña» y «Confirmar contraseña» y no junto a «Usuario». La cuenta no se crea."),
    "CP-115": _script("Los campos de contraseña de «Crear cuenta» y de «Iniciar sesión» son de tipo password: el texto escrito no aparece en pantalla.",
                      "Verificado por el tipo de los campos y el texto visible de la pantalla; capturas CP-115-paso1 y CP-115-paso2."),
    "CP-116": _script("«Prueba1» se rechaza; el login con cp1161111 / Prueba1 da «Usuario o contraseña incorrectos»; el registro del mismo username con «Prueba2026» crea la cuenta y muestra el menú."),
    "CP-117": _script("Con el usuario de prueba se inicia sesión y se muestra el menú con «Hola, verificador»."),
    "CP-118": _script("Con «Incorrecta1» no se inicia sesión: se muestra «Usuario o contraseña incorrectos» debajo del formulario, sin marcar ningún campo."),
    "CP-119": _script("Con «noexiste1111» no se inicia sesión y se muestra «Usuario o contraseña incorrectos», el mismo mensaje de CP-118."),
    "CP-120": _script("«VERIFICADOR» con la contraseña correcta inicia sesión y saluda «Hola, verificador»; la contraseña con las mayúsculas invertidas se rechaza con «Usuario o contraseña incorrectos»."),
    "CP-121": _script("Al recargar la página no se muestra «Iniciar sesión» en ningún momento y queda el menú con «Hola, verificador»."),
    "CP-122": _script("Menú con «Jugar», «Puntajes» y «Opciones». Enter en «Jugar» lleva a «Modo PacMan», «Modo GhostMan» y «Volver», y «Volver» regresa; «Puntajes» lleva a «PUNTAJES» y «Volver» regresa; «Opciones» lleva a «OPCIONES» y Esc regresa."),
    "CP-123": _script("«Cerrar sesión» lleva a «Iniciar sesión»; tras recargar, Esc y Enter dejan «Este campo es obligatorio» en la misma pantalla; con Atrás el navegador sale de la aplicación. En ningún momento se muestran el menú, la elección de modo ni «PUNTAJES».",
                      "El script abre la aplicación en una pestaña nueva, así que Atrás sale de la aplicación (about:blank)."),
    "CP-138": _script("«Música» 30 y «Efectos» 50 con «Guardado»; tras cerrar e iniciar sesión, «Opciones» muestra 30 y 50.",
                      "Al terminar, el script devuelve los volúmenes del usuario de prueba a 60 y 80."),
    "CP-139": _script("Anotado: mejor puntaje 1000 y 2500, skins «Clásico» y «Clásica», volúmenes 30 y 50. «Cerrar sesión» lleva a «Iniciar sesión» y al recargar no aparece el menú; al volver a entrar, los mismos valores.",
                      "Las preferencias distintas de las de por defecto son los volúmenes de CP-138."),
    "CP-196": _script("Con los dos campos vacíos, «Este campo es obligatorio» junto a «Usuario» y a «Contraseña»; con solo «Usuario», queda solo el de «Contraseña» y no se inicia sesión."),
    "CP-197": _script("Sin conexión, el login y el registro muestran «No se pudo conectar con el servidor. Intentá de nuevo»; con la red restablecida se inicia sesión.",
                      "Sin conexión simulado con el modo offline del navegador."),
    "CP-198": _script("Sin conexión, el Game Over muestra el puntaje (0), «No se pudo guardar el puntaje» y «Reintentar»; con la red restablecida, «Reintentar» muestra «¡Nuevo récord personal!» y «Tu mejor puntaje» muestra 0 en «Modo PacMan».",
                      "Partida sin mover a Pacman (0 puntos) con el usuario nuevo cp1981111; sin conexión simulado con el modo offline del navegador."),
    "CP-199": _script("Primera partida: Game Over con 0 y «¡Nuevo récord personal!»; «Tu mejor puntaje» muestra 0 (no «Sin partidas»). Segunda partida: 0 y «Puntaje guardado»; el mejor puntaje sigue en 0.",
                      "Usuario nuevo cp1991111."),
})
