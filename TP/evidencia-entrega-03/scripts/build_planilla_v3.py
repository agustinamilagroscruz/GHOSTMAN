# Arma la planilla de la Entrega 3 a partir de la de la Entrega 2 y de spec_v3.py.
#
#   python3 build_planilla_v3.py   (necesita openpyxl; se corre desde cualquier carpeta)
#
# - Hoja de reporte: una fila por caso (71 nuevos de la V3 y 128 de la regresión de la V1 y la V2),
#   con el estado de la Entrega 2 y la columna de la Entrega 3 vacía, y el panel de resultados con
#   sus fórmulas y gráficos.
# - Una hoja por caso, con el mismo diseño que la Entrega 2. Las de la regresión conservan el registro
#   de ejecución de los ciclos 1 y 2 y suman la precondición de la V3, el ajuste y la mutación.
# - Se conservan el registro de defectos, las hojas DEF-nnn y las plantillas.
# Los estilos se toman de las hojas de la Entrega 2, así las dos planillas se ven igual.
import copy
import importlib.util
import math
import os
import re

import openpyxl
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.chart.series import DataPoint
from openpyxl.worksheet.datavalidation import DataValidation

HERE = os.path.dirname(os.path.abspath(__file__))
TP = os.path.normpath(os.path.join(HERE, "..", ".."))
SRC = os.path.join(TP, "GhostMan - Reporte de Casos de Prueba y Ejecución - Entrega 2.xlsx")
DST = os.path.join(TP, "GhostMan - Reporte de Casos de Prueba y Ejecución - Entrega 3.xlsx")

spec_loader = importlib.util.spec_from_file_location("spec_v3", os.path.join(HERE, "spec_v3.py"))
spec = importlib.util.module_from_spec(spec_loader)
spec_loader.loader.exec_module(spec)

# Resultados del ciclo 3 (resultados_v3.py): se vuelcan en la hoja de reporte y en la de cada caso.
import datetime
results_loader = importlib.util.spec_from_file_location("resultados_v3", os.path.join(HERE, "resultados_v3.py"))
results_mod = importlib.util.module_from_spec(results_loader)
results_loader.loader.exec_module(results_mod)
RESULTS = {cid: {**r, "fecha": datetime.date(*r["fecha"])} for cid, r in results_mod.RESULTS.items()}

OLD_REPORT = "Reporte de ejecución - Entrega2"
REPORT = "Reporte de ejecución - Entrega3"
AUTHOR = "Savoia"
COMMIT = "[completar al congelar main, etapa 3]"
BROWSER = "Google Chrome 157.0.8103.40 (macOS)"
EXECUTORS = "Rodriguez Castro"

HU_TITLES = {
    "HU-35": "Registrarme en el juego", "HU-36": "Iniciar sesión", "HU-37": "Navegar el menú principal",
    "HU-38": "Consultar el tablero global de puntajes", "HU-39": "Consultar mi mejor puntaje",
    "HU-40": "Cambiar el aspecto de Pacman y los fantasmas", "HU-41": "Ajustar el volumen",
    "HU-42": "Cerrar sesión y salir del juego", "HU-44": "Base de los fantasmas",
    "HU-45": "Cruzar el mapa por el túnel", "HU-46": "Prepararme antes de que empiece el nivel",
    "HU-47": "Ver la derrota de Pacman", "HU-48": "Escuchar la música y los sonidos del juego",
    "HU-49": "Ver los poderes de los fantasmas en acción", "HU-50": "Ver a Pacman y a los fantasmas en pixel art",
}
EPICS = [
    ("E1", "E1 — Núcleo de juego y movimiento"), ("E2", "E2 — PowerUp e interacción con fantasmas"),
    ("E3", "E3 — Vidas, puntaje y fin de partida"), ("E4", "E4 — Niveles y progresión de dificultad"),
    ("E5", "E5 — Control de la partida"), ("E6", "E6 — Modo GhostMan"), ("E7", "E7 — Poderes de los fantasmas"),
    ("E8", "E8 — Dificultad del modo GhostMan"), ("E9", "E9 — Cuentas de usuario"),
    ("E10", "E10 — Puntajes y estadísticas"), ("E11", "E11 — Opciones y personalización"), ("E12", "E12 — Look & feel"),
]
# Casos nuevos que no son camino feliz: rechazos, límites inválidos, errores y casos sin datos.
NOT_HAPPY = {"CP-107", "CP-109", "CP-110", "CP-111", "CP-112", "CP-113", "CP-114", "CP-116", "CP-118", "CP-119",
             "CP-120", "CP-123", "CP-127", "CP-130", "CP-137", "CP-165", "CP-166", "CP-169", "CP-174", "CP-178",
             "CP-183", "CP-184", "CP-196", "CP-197", "CP-198", "CP-199"}
STATES = ["Aprobado", "Fallido", "Bloqueado", "No ejecutado", "No aplica"]

wb = openpyxl.load_workbook(SRC)
old_report = wb[OLD_REPORT]


# ---------------------------------------------------------------------------------------------------
# Estilos de referencia (de las hojas de la Entrega 2)
def style(sheet, coord):
    return copy.copy(wb[sheet][coord]._style)


S = {
    "label": style("CP-001", "A1"), "value_b": style("CP-001", "B1"), "log_head": style("CP-001", "G1"),
    "log_col": style("CP-001", "G2"), "link": style("CP-001", "A3"), "value": style("CP-001", "D5"),
    "log_cell": style("CP-001", "K3"), "log_cycle": style("CP-001", "G5"), "log_date": style("CP-001", "H3"), "note": style("CP-001", "G6"),
    "num": style("CP-001", "A8"), "pre": style("CP-001", "B8"), "data_k": style("CP-001", "D8"), "data_v": style("CP-001", "E8"),
    "title": style("CP-001", "B12"), "mut": style("CP-001", "B18"), "step": style("CP-001", "B21"),
    "exp": style("CP-001", "D21"), "exp_last": style("CP-001", "D24"), "final": style("CP-001", "A25"),
    "state_formula": style("CP-001", "D3"), "state_old": style("CP-001", "D4"), "prio": style("CP-001", "B5"),
}
R = {k: copy.copy(old_report[c]._style) for k, c in {
    "title": "A1", "desc": "A2", "head": "A3", "id": "A4", "cell": "B4", "wide": "N4", "date": "L4", "formula": "J4",
    "p_head": "P3", "p_label": "P4", "p_value": "Q4", "p_date": "Q9", "t_head": "P15", "t_label": "P16",
    "t_num": "Q16", "t_pct": "R16", "t_total": "P19", "t_total_num": "Q19", "t_total_pct": "R19", "p_note": "P42",
}.items()}
COL_WIDTHS = {k: v.width for k, v in wb["CP-001"].column_dimensions.items()}

# ---------------------------------------------------------------------------------------------------
# Casos de la Entrega 2 (para la regresión)
old_rows = {}
for r in range(4, old_report.max_row + 1):
    vals = [old_report.cell(r, c).value for c in range(1, 15)]
    if vals[0] and str(vals[0]).startswith("CP-"):
        old_rows[vals[0]] = dict(type=vals[1], epic=vals[2], prio=vals[3], title=vals[4], hu=vals[5], happy=vals[6], state=vals[8])


def read_old_sheet(name):
    ws = wb[name]
    d = dict(desc=ws["D1"].value, creator=ws["B2"].value, tech=ws["D5"].value, pre=[], data=[], steps=[], log=[])
    for r in (3, 4):
        if ws.cell(r, 7).value:
            d["log"].append([ws.cell(r, c).value for c in range(7, 13)])
    r = 8
    while isinstance(ws.cell(r, 1).value, int):
        if ws.cell(r, 2).value:
            d["pre"].append(ws.cell(r, 2).value)
        if ws.cell(r, 4).value:
            d["data"].append((ws.cell(r, 4).value, ws.cell(r, 5).value))
        r += 1
    for r in range(r, ws.max_row + 1):
        if ws.cell(r, 1).value == "Pasos #":
            r += 1
            while isinstance(ws.cell(r, 1).value, int):
                d["steps"].append((ws.cell(r, 2).value, ws.cell(r, 4).value))
                r += 1
            break
    return d


old_sheets = {cid: read_old_sheet(cid) for cid in old_rows}

# ---------------------------------------------------------------------------------------------------
# Filas de la planilla nueva
rows = []
for c in spec.CASES:
    data = [("Entorno:", f"Build del commit {COMMIT} (V3)"), ("Navegador:", BROWSER), ("Supabase:", "Proyecto de prueba (decisión 60)")] + list(c["data"])
    rows.append(dict(
        id=c["id"], type="Nuevo (V3)", epic=c["epic"].split(" ")[0], epic_full=c["epic"], prio=c["prio"], title=c["title"],
        hu=c["hu"], happy="No" if c["id"] in NOT_HAPPY else "Sí", prev="—", desc=f"{c['hu']} · {HU_TITLES.get(c['hu'], '')}",
        creator=AUTHOR, version="1", tech=c["tech"], pre=["Abrir la aplicación en un navegador de escritorio.", c["pre"]],
        data=data, steps=c["steps"], log=[], mut=None, adj=None, obs="",
        auto="No automatizado (ejecución manual). Cobertura de caja blanca en scripts/verify/ según la sección 9.1"))

for cid, o in old_rows.items():
    sh = old_sheets[cid]
    v1 = cid < "CP-067"
    adj = spec.ADJ.get(cid, {})
    mut = spec.MUT_V3.get(cid)
    pre = list(sh["pre"])
    if v1:
        pre = [spec.PRE_V1_NEW if p == spec.PRE_V1_OLD else p for p in pre]
    else:
        pre = pre[:1] + [spec.PRE_V1_V2] + pre[1:]
    if "pre" in adj:
        pre[-1] = adj["pre"]
    env = [("Entorno:", f"Build del commit {COMMIT} (V3)"), ("Navegador:", BROWSER)]
    rest = [d for d in sh["data"] if d[0] not in ("Entorno:", "Navegador:")]
    if "data" in adj:
        modo = [d for d in rest if d[0] == "Modo de juego:"]
        rest = modo + list(adj["data"])
    kind = "V1" if v1 else "V2"
    if mut:
        rtype = f"Regresión ({kind}, mutado)"
    else:
        rtype = f"Regresión ({kind}, Media/Baja)"
    obs = []
    if mut:
        obs.append("Mutación: " + mut)
    if adj:
        obs.append("Ajuste a la V3: " + adj["why"])
    if cid in spec.UNCHANGED_NOTE:
        obs.append(spec.UNCHANGED_NOTE[cid])
    creator = sh["creator"] or ""
    if mut and AUTHOR not in creator:
        creator = re.sub(r"\s*\(mutación: [^)]*\)", "", creator) + f" (mutación V3: {AUTHOR})"
    rows.append(dict(
        id=cid, type=rtype, epic=o["epic"], epic_full=dict(EPICS).get(o["epic"], o["epic"]), prio=o["prio"],
        title=adj.get("title", o["title"]), hu=o["hu"], happy=o["happy"], prev=o["state"], desc=sh["desc"],
        creator=creator, version="3" if (adj or mut) else "2", tech=sh["tech"], pre=pre, data=env + rest,
        steps=adj.get("steps", sh["steps"]), log=sh["log"], mut=mut, adj=adj.get("why"), obs=" ".join(obs),
        auto="No automatizado en la V3 (los scripts de la Entrega 2 usan los mapas de la V2)"))

rows.sort(key=lambda r: r["id"])
FIRST, LAST = 4, 3 + len(rows)
RNG = lambda col: f"${col}${FIRST}:${col}${LAST}"

# ---------------------------------------------------------------------------------------------------
# Hojas de casos
for name in list(wb.sheetnames):
    if name.startswith("CP-") and name != "CP - Plantilla":
        del wb[name]


def put(ws, coord, value, st, number_format=None):
    cell = ws[coord]
    cell.value = value
    cell._style = copy.copy(S[st])
    if number_format:
        cell.number_format = number_format
    return cell


def height(text, width_chars):
    lines = sum(max(1, math.ceil(len(part) / width_chars)) for part in str(text or "").split("\n"))
    return max(16.2, 14.4 * lines + 1.8)


def build_case_sheet(row, index, report_row):
    ws = wb.create_sheet(row["id"], index)
    for k, w in COL_WIDTHS.items():
        ws.column_dimensions[k].width = w
    put(ws, "A1", "Test Case ID", "label"); put(ws, "B1", row["id"], "value_b")
    put(ws, "C1", "Descripción / Funcionalidad", "label"); put(ws, "D1", row["desc"], "value_b"); ws.merge_cells("D1:E1")
    put(ws, "G1", "Registro de ejecución", "log_head"); ws.merge_cells("G1:L1")
    put(ws, "A2", "Creado por", "label"); put(ws, "B2", row["creator"], "value_b")
    put(ws, "C2", "Versión", "label"); put(ws, "D2", row["version"], "value_b"); ws.merge_cells("D2:E2")
    for col, text in zip("GHIJKL", ["Ciclo", "Fecha", "Ejecutor", "Estado", "Resultado obtenido", "Defecto"]):
        put(ws, f"{col}2", text, "log_col")
    link = put(ws, "A3", "Reporte de ejecución 3", "link"); ws.merge_cells("A3:B3")
    link.hyperlink = f"#'{REPORT}'!A{report_row}"
    put(ws, "C3", "Estado en la Entrega 3", "label")
    put(ws, "D3", f"=IFERROR(IF(INDEX('{REPORT}'!{RNG('I')},MATCH($B$1,'{REPORT}'!{RNG('A')},0))=\"\",\"Sin ejecutar\","
                  f"INDEX('{REPORT}'!{RNG('I')},MATCH($B$1,'{REPORT}'!{RNG('A')},0))),\"Sin ejecutar\")", "state_formula"); ws.merge_cells("D3:E3")
    put(ws, "C4", "Estado en la Entrega 2", "label")
    put(ws, "D4", row["prev"] if row["prev"] != "—" else "No existía (caso nuevo de la V3)", "state_old"); ws.merge_cells("D4:E4")
    put(ws, "A5", "Prioridad (Alta, Media, Baja)", "label"); put(ws, "B5", row["prio"], "prio")
    put(ws, "C5", "Técnica de diseño", "label"); put(ws, "D5", row["tech"], "value"); ws.merge_cells("D5:E5")
    # Registro de ejecución: ciclos anteriores y el ciclo 3 vacío.
    res = RESULTS.get(row["id"])
    cycle3 = ["Ciclo 3", res["fecha"], res["ejecutor"], res["estado"], res["obtenido"], res["defecto"]] if res else ["Ciclo 3", None, None, None, None, None]
    log_rows = row["log"] + [cycle3]
    for i, entry in enumerate(log_rows):
        r = 3 + i
        for j, col in enumerate("GHIJKL"):
            st = {"G": "log_cycle", "H": "log_date"}.get(col, "log_cell")
            put(ws, f"{col}{r}", entry[j], st, "dd/mm/yyyy" if col == "H" else None)
    last_log = 2 + len(log_rows)
    note_row = max(6, last_log + 1)
    put(ws, f"G{note_row}", "Ciclo 1 = Entrega 1 (V1). Ciclo 2 = Entrega 2 (V2): ejecución con script de navegador. "
        "Ciclo 3 = Entrega 3 (V3): ejecución manual sobre el build de prueba y una muestra sobre Vercel.", "note")
    ws.merge_cells(f"G{note_row}:L{note_row + 1}")
    for i, entry in enumerate(log_rows):
        ws.row_dimensions[3 + i].height = max(30, height(entry[4], 50))
    # Precondiciones y datos.
    r0 = max(7, note_row + 2) if note_row > 6 else 7
    put(ws, f"A{r0}", "#", "label"); put(ws, f"B{r0}", "Pre-requisitos", "label"); ws.merge_cells(f"B{r0}:C{r0}")
    put(ws, f"D{r0}", "Datos de prueba", "label"); ws.merge_cells(f"D{r0}:E{r0}")
    n = max(len(row["pre"]), len(row["data"]))
    for i in range(n):
        r = r0 + 1 + i
        put(ws, f"A{r}", i + 1, "num")
        pre = row["pre"][i] if i < len(row["pre"]) else None
        put(ws, f"B{r}", pre, "pre"); ws.merge_cells(f"B{r}:C{r}")
        k, v = row["data"][i] if i < len(row["data"]) else (None, None)
        put(ws, f"D{r}", k, "data_k"); put(ws, f"E{r}", v, "data_v")
        ws.row_dimensions[r].height = max(height(pre, 52), height(v, 30))
    r = r0 + n + 2
    put(ws, f"A{r}", "Título del CP", "label"); ws.merge_cells(f"A{r}:A{r + 1}")
    put(ws, f"B{r}", row["title"], "title"); ws.merge_cells(f"B{r}:E{r + 1}")
    r += 3
    put(ws, f"A{r}", "Historias de Usuario", "label"); put(ws, f"B{r}", row["hu"], "value")
    put(ws, f"C{r}", "Épica", "label"); put(ws, f"D{r}", row["epic_full"], "value"); ws.merge_cells(f"D{r}:E{r}")
    r += 1
    put(ws, f"A{r}", "Estado Automatización", "label"); put(ws, f"B{r}", row["auto"], "value")
    put(ws, f"C{r}", "Camino feliz", "label"); put(ws, f"D{r}", row["happy"], "value"); ws.merge_cells(f"D{r}:E{r}")
    ws.row_dimensions[r].height = height(row["auto"], 30)
    r += 2
    for label, text in (("Ajuste (Entrega 3)", row["adj"]), ("Mutación (Entrega 3)", row["mut"])):
        if text:
            put(ws, f"A{r}", label, "label"); put(ws, f"B{r}", text, "mut"); ws.merge_cells(f"B{r}:E{r}")
            ws.row_dimensions[r].height = height(text, 110)
            r += 1
    if row["adj"] or row["mut"]:
        r += 1
    put(ws, f"A{r}", "Pasos #", "label"); put(ws, f"B{r}", "Detalle de pasos", "label"); ws.merge_cells(f"B{r}:C{r}")
    put(ws, f"D{r}", "Resultado esperado", "label"); ws.merge_cells(f"D{r}:E{r}")
    for i, (action, expected) in enumerate(row["steps"]):
        r += 1
        put(ws, f"A{r}", i + 1, "num")
        put(ws, f"B{r}", action, "step"); ws.merge_cells(f"B{r}:C{r}")
        put(ws, f"D{r}", expected, "exp_last" if i == len(row["steps"]) - 1 else "exp"); ws.merge_cells(f"D{r}:E{r}")
        ws.row_dimensions[r].height = max(height(action, 52), height(expected, 55))
    r += 1
    put(ws, f"A{r}", "El caso se aprueba solo si se cumple todo el resultado esperado del último paso (en negrita); "
        "si cualquier parte no se cumple, se registra como Fallido.", "final")
    ws.merge_cells(f"A{r}:E{r}")
    ws.row_dimensions[r].height = 24


first_case_index = wb.sheetnames.index("Registro de defectos") + 1
for i, row in enumerate(rows):
    build_case_sheet(row, first_case_index + i, FIRST + i)

# ---------------------------------------------------------------------------------------------------
# Hoja de reporte
old_report.title = REPORT
rep = old_report
rep._charts = []
for mr in list(rep.merged_cells.ranges):
    rep.unmerge_cells(str(mr))
for r in range(1, max(rep.max_row, LAST) + 1):
    for c in range(1, 23):
        cell = rep.cell(r, c)
        cell.value = None
        cell.hyperlink = None
        cell._style = copy.copy(rep.cell(200, 30)._style)
rep.data_validations.dataValidation = []
rep.conditional_formatting = type(rep.conditional_formatting)()


def rput(coord, value, st, number_format=None):
    cell = rep[coord]
    cell.value = value
    cell._style = copy.copy(R[st])
    if number_format:
        cell.number_format = number_format
    return cell


rput("A1", "GhostMan - Entrega 3 - Reporte de ejecución de casos de prueba (V3, ciclo 3)", "title"); rep.merge_cells("A1:N1")
rput("A2", "Todos los casos de prueba ordenados por ID: los nuevos de la V3 (CP-106 a CP-140 y CP-164 a CP-199) y la "
     "regresión de la V1 y la V2 (69 casos de prioridad Alta, mutados, y 59 de prioridad Media y Baja), con los ajustes de la "
     "sección 8.2. Estados según la sección 12.2: Aprobado, Fallido, Bloqueado, No ejecutado, No aplica. «Estado Entrega 2» viene "
     "del reporte de la Entrega 2; «¿Cambió?» compara los dos ciclos. El ID de cada caso abre su hoja de detalle.", "desc")
rep.merge_cells("A2:N2")
heads = ["Test case ID", "Tipo de prueba", "Épica", "Prioridad", "Título", "Historia de usuario", "Camino feliz",
         "Estado Entrega 2", "Estado Entrega 3", "¿Cambió?", "Ejecutor", "Fecha", "Defectos", "Observaciones"]
for j, h in enumerate(heads):
    rput(f"{chr(65 + j)}3", h, "head")
for i, row in enumerate(rows):
    r = FIRST + i
    link = rput(f"A{r}", row["id"], "id")
    link.hyperlink = f"#'{row['id']}'!A1"
    for col, key in zip("BCDEFGH", ["type", "epic", "prio", "title", "hu", "happy", "prev"]):
        rput(f"{col}{r}", row[key], "cell")
    res = RESULTS.get(row["id"], {})
    rput(f"I{r}", res.get("estado"), "cell")
    rput(f"J{r}", f'=IF(OR(H{r}="—",I{r}="",I{r}="No ejecutado"),"—",IF(H{r}=I{r},"No","Sí"))', "formula")
    rput(f"K{r}", res.get("ejecutor"), "cell"); rput(f"L{r}", res.get("fecha"), "date", "dd/mm/yyyy"); rput(f"M{r}", res.get("defecto"), "cell")
    rput(f"N{r}", " ".join(t for t in (row["obs"], res.get("obs")) if t) or None, "wide")
rep.auto_filter.ref = f"A3:N{LAST}"
rep.freeze_panes = "B4"
dv = DataValidation(type="list", formula1='"' + ",".join(STATES) + '"', allow_blank=True)
dv.add(f"I{FIRST}:I{LAST}")
rep.add_data_validation(dv)

# Panel de resultados (columnas P a V).
p = 3
rput(f"P{p}", "Identificación del ciclo (sección 12.1)", "p_head"); rep.merge_cells(f"P{p}:S{p}")
ident = [("Ciclo de ejecución", "Nº 3 (primer ciclo de la V3)"), ("Versión bajo prueba", "V3"), ("Commit", COMMIT),
         ("Entorno", "Build de prueba local (NEXT_PUBLIC_MODO_PRUEBA=1) contra el proyecto de Supabase de prueba, y una muestra sobre el despliegue de Vercel (etapa 4)"),
         ("Navegador y versión", BROWSER), ("Fecha de inicio", None), ("Fecha de cierre", None), ("Ejecutores", EXECUTORS),
         ("Forma de ejecución", "Manual, de caja negra, sobre la aplicación (sección 8 de la Entrega 03)")]
for i, (k, v) in enumerate(ident):
    r = p + 1 + i
    rput(f"P{r}", k, "p_label")
    rput(f"Q{r}", v, "p_date" if k.startswith("Fecha") else "p_value", "dd/mm/yyyy" if k.startswith("Fecha") else None)
    rep.merge_cells(f"Q{r}:V{r}")


def status_table(top, title, states_col="I"):
    rput(f"P{top}", title, "p_head"); rep.merge_cells(f"P{top}:S{top}")
    rput(f"P{top + 1}", "Estado", "t_head"); rput(f"Q{top + 1}", "Casos", "t_head"); rput(f"R{top + 1}", "%", "t_head")
    for i, st in enumerate(["Aprobado", "Fallido", "Bloqueado"]):
        r = top + 2 + i
        rput(f"P{r}", st, "t_label")
        rput(f"Q{r}", f'=COUNTIF({RNG(states_col)},"{st}")', "t_num")
        rput(f"R{r}", f"=IFERROR(Q{r}/SUM($Q${top + 2}:$Q${top + 4}),0)", "t_pct")
    rput(f"P{top + 5}", "Total", "t_total"); rput(f"Q{top + 5}", f"=SUM(Q{top + 2}:Q{top + 4})", "t_total_num")
    rput(f"R{top + 5}", f"=SUM(R{top + 2}:R{top + 4})", "t_total_pct")


status_table(14, "Resultados del ciclo 3 (% sobre los casos ejecutados en el ciclo)")
pie = PieChart()
pie.title = "Ciclo 3 (V3): % Aprobado / Fallido / Bloqueado"
pie.add_data(Reference(rep, min_col=17, min_row=15, max_row=18), titles_from_data=True)
pie.set_categories(Reference(rep, min_col=16, min_row=16, max_row=18))
for idx, color in enumerate(["70AD47", "C00000", "FFC000"]):
    pt = DataPoint(idx=idx)
    pt.graphicalProperties.solidFill = color
    pie.series[0].dPt.append(pt)
pie.width, pie.height = 12, 7.5
rep.add_chart(pie, "P21")

# Comparación por entrega. Entrega 1: 66 casos (64, 1, 1). Entrega 2: 129 filas (128 aprobadas, 1 bloqueada).
top = 37
rput(f"P{top}", "Comparación de resultados por entrega (%)", "p_head"); rep.merge_cells(f"P{top}:S{top}")
for col, h in zip("PQRST", ["Estado", "Entrega 1 (V1)", "Entrega 2 (V2)", "Entrega 3 (V3)", "Casos E1 / E2 / E3"]):
    rput(f"{col}{top + 1}", h, "t_head")
e1 = [64, 1, 1]
e2 = [128, 0, 1]
for i, st in enumerate(["Aprobado", "Fallido", "Bloqueado"]):
    r = top + 2 + i
    rput(f"P{r}", st, "t_label")
    rput(f"Q{r}", e1[i] / sum(e1), "t_pct"); rput(f"R{r}", e2[i] / sum(e2), "t_pct")
    rput(f"S{r}", f"=R{16 + i}", "t_pct"); rput(f"T{r}", f'="{e1[i]} / {e2[i]} / "&Q{16 + i}', "t_num")
rput(f"P{top + 5}", "Fuentes: reportes de ejecución de la Entrega 1 (66 casos: 64 aprobados, 1 fallido, 1 bloqueado) y de la "
     "Entrega 2 (129 filas: 128 aprobadas y 1 bloqueada).", "p_note")
rep.merge_cells(f"P{top + 5}:V{top + 5}")
bar = BarChart()
bar.type = "col"
bar.title = "% de casos por estado: Entrega 1, Entrega 2 y Entrega 3"
bar.add_data(Reference(rep, min_col=17, max_col=19, min_row=top + 1, max_row=top + 4), titles_from_data=True)
bar.set_categories(Reference(rep, min_col=16, min_row=top + 2, max_row=top + 4))
bar.width, bar.height = 14, 7.5
rep.add_chart(bar, f"P{top + 7}")


def summary_table(top, title, label_head, items, key_col):
    rput(f"P{top}", title, "p_head"); rep.merge_cells(f"P{top}:V{top}")
    for col, h in zip("PQRSTUV", [label_head, "Diseñados", "Ejecutados", "Aprobados", "Fallidos", "Bloqueados", "Tasa de aprobación"]):
        rput(f"{col}{top + 1}", h, "t_head")
    for i, (label, crit) in enumerate(items):
        r = top + 2 + i
        cnt = lambda st: f'COUNTIFS({RNG(key_col)},"{crit}",{RNG("I")},"{st}")'
        rput(f"P{r}", label, "t_label")
        rput(f"Q{r}", f'=COUNTIF({RNG(key_col)},"{crit}")', "t_num")
        rput(f"R{r}", f"={cnt('Aprobado')}+{cnt('Fallido')}+{cnt('Bloqueado')}", "t_num")
        rput(f"S{r}", f"={cnt('Aprobado')}", "t_num"); rput(f"T{r}", f"={cnt('Fallido')}", "t_num")
        rput(f"U{r}", f"={cnt('Bloqueado')}", "t_num"); rput(f"V{r}", f"=IFERROR(S{r}/R{r},0)", "t_pct")
    r = top + 2 + len(items)
    rput(f"P{r}", "Total", "t_total")
    for col in "QRSTU":
        rput(f"{col}{r}", f"=SUM({col}{top + 2}:{col}{r - 1})", "t_total_num")
    rput(f"V{r}", f"=IFERROR(S{r}/R{r},0)", "t_total_pct")
    return r


types = [("Casos nuevos de la V3", "Nuevo (V3)"), ("Regresión de la V1, prioridad Alta (mutados)", "Regresión (V1, mutado)"),
         ("Regresión de la V2, prioridad Alta (mutados)", "Regresión (V2, mutado)"),
         ("Regresión de la V1, prioridad Media y Baja", "Regresión (V1, Media/Baja)"),
         ("Regresión de la V2, prioridad Media y Baja", "Regresión (V2, Media/Baja)")]
type_top = 60
type_total = summary_table(type_top, "Resumen por tipo de prueba (sección 12.4)", "Tipo de prueba", types, "B")

ind = type_total + 2
rput(f"P{ind}", "Indicadores", "p_head"); rep.merge_cells(f"P{ind}:S{ind}")
t = type_total
alta_new = lambda st: f'COUNTIFS({RNG("B")},"Nuevo (V3)",{RNG("D")},"Alta",{RNG("I")},"{st}")'
indicators = [
    ("Avance de la ejecución (ejecutados / diseñados)", f"=IFERROR(R{t}/Q{t},0)", "t_pct"),
    ("Tasa de aprobación (aprobados / ejecutados)", f"=IFERROR(S{t}/R{t},0)", "t_pct"),
    ("Tasa de fallo (fallidos / ejecutados)", f"=IFERROR(T{t}/R{t},0)", "t_pct"),
    ("Cobertura de prioridad Alta de la V3 (ejecutados / diseñados)",
     f"=IFERROR(({alta_new('Aprobado')}+{alta_new('Fallido')}+{alta_new('Bloqueado')})/COUNTIFS({RNG('B')},\"Nuevo (V3)\",{RNG('D')},\"Alta\"),0)", "t_pct"),
    ("Defectos nuevos detectados en la V3", "=COUNTIFS('Registro de defectos'!$H$5:$H$104,\"V3*\",'Registro de defectos'!$G$5:$G$104,\"<>Rechazado\")", "t_num"),
    ("Casos que cambiaron de estado respecto de la Entrega 2", f'=COUNTIF({RNG("J")},"Sí")', "t_num"),
]
for i, (label, formula, st) in enumerate(indicators):
    rput(f"P{ind + 1 + i}", label, "t_label"); rput(f"Q{ind + 1 + i}", formula, st)

chg = ind + len(indicators) + 2
rput(f"P{chg}", "Casos que cambiaron de estado entre la Entrega 2 y la Entrega 3", "p_head"); rep.merge_cells(f"P{chg}:V{chg}")
for col, h in zip("PQRS", ["Caso", "Entrega 2", "Entrega 3", "Motivo"]):
    rput(f"{col}{chg + 1}", h, "t_head")
rep.merge_cells(f"S{chg + 1}:V{chg + 1}")
rput(f"P{chg + 2}", "A completar en la etapa 4.", "p_note"); rep.merge_cells(f"P{chg + 2}:V{chg + 2}")

epic_top = chg + 4
epic_total = summary_table(epic_top, "Resultados por épica (sección 12.5)", "Épica", [(full, code) for code, full in EPICS], "C")

org = epic_total + 2
rput(f"P{org}", "Organización del equipo de testing (sección 6.1)", "p_head"); rep.merge_cells(f"P{org}:S{org}")
for i, (k, v) in enumerate([("Test Lead", "Savoia"), ("Diseño de casos de prueba (V3) y mutación de la regresión", AUTHOR),
                            ("Ejecución y reporte de defectos (V3)", EXECUTORS)]):
    rput(f"P{org + 1 + i}", k, "p_label"); rput(f"Q{org + 1 + i}", v, "p_value"); rep.merge_cells(f"Q{org + 1 + i}:S{org + 1 + i}")

for col, w in {"A": 11, "B": 22, "C": 7, "D": 9, "E": 44, "F": 10, "G": 8, "H": 12, "I": 12, "J": 9, "K": 10, "L": 11,
               "M": 10, "N": 70, "O": 3, "P": 52, "Q": 14, "R": 14, "S": 14, "T": 16, "U": 11, "V": 13}.items():
    rep.column_dimensions[col].width = w

# ---------------------------------------------------------------------------------------------------
# Registro de defectos y plantilla
defects = wb["Registro de defectos"]
defects["A1"].value = "GhostMan - Entrega 3 - Registro de defectos (V1 a V3, ciclo 3)"
defects["A2"].value = ("Una fila por defecto, en orden de detección. Los defectos de la V3 continúan la numeración de la V1 y la V2 "
                       "(sección 12 de la Entrega 03). Campos de la sección 13.3; severidad y prioridad según 13.1; estado según 13.2. "
                       "El detalle completo va en la hoja con el ID del defecto.")
tpl = wb["CP - Plantilla"]
tpl["A3"].value = "Reporte de ejecución 3"
tpl["C3"].value = "Estado en la Entrega 3"
tpl["C4"].value = "Estado en la Entrega 2"
for ws in wb.worksheets:
    for row in ws.iter_rows():
        for cell in row:
            if isinstance(cell.value, str) and OLD_REPORT in cell.value:
                cell.value = cell.value.replace(OLD_REPORT, REPORT)

wb.active = 0
wb.save(DST)
print(f"{len(rows)} casos: {sum(r['type'] == 'Nuevo (V3)' for r in rows)} nuevos, "
      f"{sum('mutado' in r['type'] for r in rows)} mutados, {sum('Media/Baja' in r['type'] for r in rows)} Media/Baja -> {os.path.basename(DST)}")
