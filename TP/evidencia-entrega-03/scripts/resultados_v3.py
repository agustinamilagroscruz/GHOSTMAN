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


# Casos de juego de la V3 de prioridad Alta: script de navegador ejecutar_juego.js sobre el build de
# prueba del commit 576c13f con la línea que expone el estado del juego (window.__gm), como en el ciclo 2.
# El estado se usa para verificar y para preparar precondiciones; las acciones del caso se hacen con el
# teclado real. Capturas en TP/evidencia-entrega-03/capturas/.
def _juego(obtenido, obs=None):
    nota = "Script de navegador ejecutar_juego.js (build con el estado expuesto, ver el encabezado del script)."
    return dict(estado="Aprobado", fecha=(2026, 11, 11), ejecutor="Rodriguez Castro (script)", obtenido=obtenido,
                defecto=None, obs=f"{nota} {obs}" if obs else nota)


RESULTS.update({
    "CP-164": _juego("Nivel 1: base en las filas 12 a 16 y las columnas 10 a 17, con la puerta de dos celdas arriba, en (12,13) y (12,14). Los niveles 2 y 3 tienen la base y la puerta en la misma posición.",
                     "Se pasó de nivel desde el estado. Capturas CP-164-nivel1 a nivel3."),
    "CP-165": _juego("Sobre la puerta (11,13) con ↓ durante 3 s, Pacman no pasa de la fila 11. En las 26 celdas del anillo, presionando hacia la base, no entra en ninguna. En modo GhostMan, nivel 2, durante 20 s de PowerUp con 5 cargas junto a los cuatro lados de la base, Pacman no entra y los muros de la base no cambian.",
                     "Los fantasmas de la IA se dejaron en la base para que no interfirieran. En el paso 3 Pacman no rompió ningún muro en esos 20 s; la regla de los muros de la base también la verifica core/inc19.js."),
    "CP-166": _juego("Espectro pegado al muro de la base con la barra espaciadora: no la atraviesa. Acelerado sobre la puerta mirando hacia abajo: el impulso no lo lleva adentro. Saltarín en la fila 10 mirando hacia abajo, 5 saltos: aterriza en (11,16), (11,10), (15,9), (13,8) y (11,14), ninguno dentro de la base."),
    "CP-167": _juego("Durante la cuenta, blinky está afuera en (11,13) y los otros tres adentro. Empiezan a salir 3,02, 6,02 y 9,02 s después de que termina el «¡ya!» (3,52, 6,52 y 9,52 s desde que aparece) y quedan afuera unos 0,8 a 1,6 s después. Lo mismo tras perder una vida, con el «¡Listo!».",
                     "Sin ?modoPrueba=1, con la cuenta real. Medido desde que aparece el «¡ya!», el primer fantasma sale 0,02 s fuera de la tolerancia de ± 0,5 s: la salida queda congelada durante todo el «¡ya!» (decisión 52) y el intervalo de 3 s empieza cuando termina. El equipo lo dio por aprobado (11/11/2026)."),
    "CP-168": _juego("El fantasma del jugador arranca dentro de la base; uno de la IA está afuera y los otros dos empiezan a salir a los 3,01 y 6,01 s. Con ↑ durante 2 s, el del jugador sale y queda en (11,13); con ↓ sobre la puerta no vuelve a entrar."),
    "CP-170": _juego("Pacman come la esfera grande en (1,1) y luego a blinky, que queda reducido a sus ojos. Al cruzarse con los ojos, Pacman no pierde vida ni suma puntos; los ojos van hacia la base, entran, el fantasma revive y vuelve a salir por la puerta, vulnerable porque el PowerUp seguía activo.",
                     "El fantasma vulnerable se ubicó sobre Pacman desde el estado para provocar el encuentro."),
    "CP-172": _juego("Sin presionar teclas, el fantasma del jugador queda dentro de la base todo el nivel. A los 170 s Pacman come la última esfera y la partida termina en Game Over: el jugador pierde."),
    "CP-175": _juego("En los tres niveles el túnel está en la fila 13. Con ←, Pacman sale por la columna 0 y aparece en la 27 avanzando hacia la izquierda; con →, sale por la 27 y aparece en la 0 hacia la derecha. La velocidad no cambia: 4,5 celdas/s (medida en el cruce: 4,52).",
                     "Captura CP-175-paso1 y paso2 del nivel 1."),
})
