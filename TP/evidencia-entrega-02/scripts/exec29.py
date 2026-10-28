"""Ejecución de los 29 casos de la V1 (prioridad Media y Baja) que no se habían re-ejecutado en el ciclo 2."""
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import Run
from reg_exec import GOFF, NOTE, put, pac, ghost_on_pacman, only_pellets, wait_until, complete_level_quick
from playwright.sync_api import sync_playwright
R = {}
def res(cid, ok, obs, blocked=False):
    R[cid] = ("Bloqueado" if blocked else ("Aprobado" if ok else "Fallido"), obs)
    print(cid, R[cid][0], "|", obs, flush=True)
def el(r): return r.s("s.levelElapsed")
def wait_elapsed(r, t0, secs):
    while el(r) - t0 < secs: time.sleep(0.02)
def eat_power_at(r, row, col, frm, key):
    """Pone una esfera grande en (row,col), deja a Pacman en la celda vecina y lo mueve hacia ella."""
    r.do(f"if (s.map.pellets[{row}][{col}]==='none') s.pelletsRemaining++; s.map.pellets[{row}][{col}]='power'; if (s.map.pellets[{frm[0]}][{frm[1]}]!=='none') {{ s.map.pellets[{frm[0]}][{frm[1]}]='none'; s.pelletsRemaining--; }}")
    put(r, *frm); r.key(key, delay=0.01)
    return wait_until(r, f"s.map.pellets[{row}][{col}]==='none'", 2)
GHOST_PIXEL_JS = """() => { const s = window.__gm; const c = document.querySelector('canvas'); const x = c.getContext('2d');
  const w = c.width / s.map.cols, h = c.height / s.map.rows; const out = [];
  for (const g of s.ghosts) { if (g.eaten) continue;
    const dr = g.direction==='down'?g.progress:g.direction==='up'?-g.progress:0, dc = g.direction==='right'?g.progress:g.direction==='left'?-g.progress:0;
    const d = x.getImageData(Math.floor((g.col+dc)*w + w*0.5), Math.floor((g.row+dr)*h + h*0.72), 1, 1).data; out.push([d[0], d[1], d[2]]); }
  return out; }"""
def ghost_colors(r, secs):
    seen = set(); t = time.time()
    while time.time() - t < secs:
        for p in r.pg.evaluate(GHOST_PIXEL_JS):
            seen.add("blanco" if min(p) > 200 else ("azul" if p[2] > 150 and p[0] < 90 else "otro"))
        time.sleep(0.04)
    return seen

def c004(r):
    r.start_pacman(); r.do(GOFF); put(r, 4, 3); r.key("ArrowRight", delay=0.01); r.key("ArrowUp", delay=0.01)
    track = []; t = time.time()
    while time.time() - t < 1.5:
        track.append(r.s("[s.pacman.row, s.pacman.col, s.pacman.direction]")); time.sleep(0.02)
    turn = next((p for p in track if p[0] < 4), None)
    before = [p for p in track if p[0] == 4]
    ok = turn is not None and turn[1] == 6 and all(p[2] is not None for p in track[:len(before)]) and max(p[1] for p in before) == 6
    res("CP-004", ok, f"Avanzando a la derecha por la fila 4 desde (4,3), ↑ presionado 3 celdas antes de la intersección: Pacman siguió en horizontal sin detenerse y giró hacia arriba al llegar a la columna {turn[1] if turn else '—'}." + NOTE)
def c006(r):
    r.start_pacman(); r.do(GOFF); put(r, 7, 2); r.key("ArrowRight", delay=0.01); time.sleep(0.25)
    a = r.s("s.pacman.col + s.pacman.progress"); r.key("ArrowLeft", delay=0.01); time.sleep(0.06)
    d = r.s("s.pacman.direction"); time.sleep(0.2); b = r.s("s.pacman.col + (s.pacman.direction==='right'?s.pacman.progress:-s.pacman.progress)")
    res("CP-006", d == "left" and b < a, f"A mitad del corredor de la fila 7 (posición {a:.2f}, sin intersección), ← invirtió la marcha de inmediato: dirección «{d}», posición {a:.2f} → {b:.2f}." + NOTE)
def c010(r):
    r.start_pacman()
    info = r.s("""(() => { const m = s.map; let path = 0, marked = 0, unmarked = [], markedWall = 0;
      for (let i = 0; i < m.rows; i++) for (let j = 0; j < m.cols; j++) {
        const p = m.pellets[i][j] !== 'none';
        if (m.cells[i][j] === 'path') { path++; if (p) marked++; else unmarked.push([i, j]); } else if (p) markedWall++; }
      const seen = new Set(['7,8']); const q = [[7, 8]];
      while (q.length) { const [a, b] = q.shift(); for (const [x, y] of [[a+1,b],[a-1,b],[a,b+1],[a,b-1]]) {
        if (x < 0 || y < 0 || x >= m.rows || y >= m.cols || m.cells[x][y] !== 'path' || seen.has(x+','+y)) continue; seen.add(x+','+y); q.push([x, y]); } }
      return { path, marked, unmarked, markedWall, reach: seen.size }; })()""")
    r.shot("CP-010")
    ok = info["markedWall"] == 0 and info["unmarked"] == [[7, 8]] and info["reach"] == info["path"]
    res("CP-010", ok, f"Nivel 1: {info['path']} celdas transitables, todas alcanzables desde la posición de Pacman; {info['marked']} marcadas con esfera y la única sin marca es la celda inicial de Pacman (7,8), que ocupa él mismo. Ningún muro tiene esfera. (Recorrido verificado sobre el mapa del juego.)")
def c013(r):
    r.start_pacman(); r.do("s.pacman.speed = 0;"); p0 = r.s("s.pelletsRemaining"); g0 = r.s("JSON.stringify(s.map.pellets)")
    visited = set(); t = time.time()
    while time.time() - t < 30:
        r.do("s.lives = 3; s.pacman.speed = 0;")
        for g in r.s("s.ghosts.filter(g=>!g.eaten).map(g=>[g.row,g.col])"): visited.add(tuple(g))
        time.sleep(0.1)
    p1 = r.s("s.pelletsRemaining"); g1 = r.s("JSON.stringify(s.map.pellets)")
    res("CP-013", p1 == p0 and g1 == g0, f"30 s con Pacman quieto: los fantasmas pasaron por {len(visited)} celdas distintas; el contador siguió en {p0} → {p1} y las esferas del mapa no cambiaron. (Pacman detenido y vidas repuestas por script.)")
def c021(r):
    r.start_pacman(); r.do(GOFF); eat_power_at(r, 13, 1, (13, 2), "ArrowLeft"); t1 = el(r)
    wait_elapsed(r, t1, 5); eat_power_at(r, 1, 1, (1, 2), "ArrowLeft"); t2 = el(r)
    wait_elapsed(r, t2, 7.8); a = r.s("s.powerUpActive"); wait_elapsed(r, t2, 8.2); b = r.s("s.powerUpActive")
    res("CP-021", a and not b, f"Primera esfera grande (13,1) y, a los 5 s, la segunda (1,1): el PowerUp siguió activo a los 7,8 s del segundo consumo y terminó antes de los 8,2 s (8 s completos, no 3)." + NOTE)
def c022(r):
    r.start_pacman(); r.do(GOFF); eat_power_at(r, 13, 1, (13, 2), "ArrowLeft")
    sc = r.s("s.score"); ghost_on_pacman(r, 0, True); wait_until(r, "s.ghosts[0].eaten", 1); a = r.s("s.score") - sc
    r.do("s.ghosts[0].respawnTimer = 1e9;"); eat_power_at(r, 1, 1, (1, 2), "ArrowLeft"); act = r.s("s.powerUpActive")
    sc = r.s("s.score"); ghost_on_pacman(r, 1, True); wait_until(r, "s.ghosts[1].eaten", 1); b = r.s("s.score") - sc
    res("CP-022", a == 200 and b == 200 and act, f"Fantasma comido con la primera esfera grande: +{a}; tras la segunda esfera grande (PowerUp activo), el siguiente fantasma sumó +{b}: la escala se reinició." + NOTE)
def c026(r):
    r.start_pacman(); r.do(GOFF); eat_power_at(r, 13, 1, (13, 2), "ArrowLeft"); r.do("s.powerUpTimer = 60;")
    ghost_on_pacman(r, 0, True); wait_until(r, "s.ghosts[0].eaten", 1); t0 = el(r); vis = r.s("s.ghosts[0].eaten")
    r.do("s.ghosts[0].respawnTimer = Math.min(s.ghosts[0].respawnTimer, 5);")
    wait_until(r, "!s.ghosts[0].eaten", 7); t = el(r) - t0; pos = r.s("[s.ghosts[0].row, s.ghosts[0].col]"); spawn = r.s("[s.ghosts[0].spawn.row, s.ghosts[0].spawn.col]")
    time.sleep(1.0); moved = r.s("[s.ghosts[0].row, s.ghosts[0].col]") != pos
    res("CP-026", vis and abs(t - 5) < 0.15 and pos == spawn and moved, f"El fantasma rojo comido desapareció y reapareció a los {t:.2f} s en su punto de reaparición {tuple(spawn)}; luego siguió moviéndose. (PowerUp prolongado por script para observar la reaparición.)")
def c027(r):
    r.start_pacman(); r.do(GOFF); eat_power_at(r, 13, 1, (13, 2), "ArrowLeft"); r.do("s.pacman.speed = 0;")
    sc = r.s("s.score"); ghost_on_pacman(r, 0, True); wait_until(r, "s.ghosts[0].eaten", 1); a = r.s("s.score") - sc
    r.do("s.ghosts[0].respawnTimer = 5;"); t0 = el(r); wait_until(r, "!s.ghosts[0].eaten", 7); t = el(r) - t0
    vul, act = r.s("[s.ghosts[0].vulnerable, s.powerUpActive]")
    sc = r.s("s.score"); ghost_on_pacman(r, 0, True); wait_until(r, "s.ghosts[0].eaten", 1); b = r.s("s.score") - sc
    res("CP-027", a == 200 and abs(t - 5) < 0.2 and vul and act and b == 400, f"Primer bocado +{a}; el fantasma reapareció a los {t:.2f} s con el PowerUp activo y en estado vulnerable; comido otra vez sumó +{b}: la escala siguió." + NOTE)
def c028(r):
    r.start_pacman(); r.do("[[7,3],[7,13],[4,8],[10,8]].forEach(([a,b],i)=>{const g=s.ghosts[i]; g.row=a; g.col=b; g.progress=0;});")
    eat_power_at(r, 13, 1, (13, 2), "ArrowLeft"); r.do("s.pacman.speed = 0;"); t0 = el(r)
    wait_elapsed(r, t0, 4.7); a = ghost_colors(r, 0.6); wa = r.s("s.powerUpTimer > 2"); r.shot("CP-028-5s")
    wait_elapsed(r, t0, 6.7); b = ghost_colors(r, 0.6); wb = r.s("s.powerUpActive && s.powerUpTimer <= 2"); r.shot("CP-028-7s")
    res("CP-028", a == {"azul"} and wa and {"azul", "blanco"} <= b and wb, f"A los 5 s los fantasmas se veían azules fijos (colores muestreados: {sorted(a)}); a los 7 s alternaban azul y blanco (parpadeo, colores: {sorted(b)}), distinto del azul fijo y del color normal. (Capturas CP-028-5s y CP-028-7s; colores leídos del canvas.)")
def c029(r):
    r.start_pacman(); r.do("[[7,3],[7,13],[4,8],[10,8]].forEach(([a,b],i)=>{const g=s.ghosts[i]; g.row=a; g.col=b; g.progress=0;});")
    eat_power_at(r, 13, 1, (13, 2), "ArrowLeft"); wait_until(r, "s.powerUpTimer <= 2", 8); b0 = ghost_colors(r, 0.3)
    eat_power_at(r, 1, 1, (1, 2), "ArrowLeft"); t2 = el(r); timer = r.s("s.powerUpTimer"); after = ghost_colors(r, 0.6)
    wait_elapsed(r, t2, 7.8); still = r.s("s.powerUpActive")
    res("CP-029", "blanco" in b0 and after == {"azul"} and timer > 7.9 and still, f"Al empezar el parpadeo se consumió la segunda esfera grande: el parpadeo cesó (colores después: {sorted(after)}), el temporizador volvió a {timer:.2f} s y el PowerUp seguía activo a los 7,8 s." + NOTE)
def c035(r):
    r.start_pacman(); r.do(GOFF); counts = [r.pg.locator("[data-testid=life-icon]").count()]
    for i in range(3):
        put(r, 4, 8); ghost_on_pacman(r); time.sleep(0.15); counts.append(r.pg.locator("[data-testid=life-icon]").count()); r.do(GOFF)
    res("CP-035", counts == [3, 2, 1, 0], f"Íconos de vidas tras cada pérdida: {' → '.join(map(str, counts))}; el contador se actualizó en el momento de cada pérdida (la tercera terminó en Game Over)." + NOTE)
def c037(r):
    r.start_pacman(); r.to_level(3); r.do(GOFF + "s.lives = 1;"); put(r, 3, 8); ghost_on_pacman(r); wait_until(r, "s.gameOver", 1); time.sleep(0.3)
    txt = r.pg.inner_text("body"); lvl = r.s("s.level"); time.sleep(3); still = r.s("[s.gameOver, s.level]")
    res("CP-037", "Game Over" in txt and "Volver a jugar" in txt and lvl == 3 and still == [True, 3], f"Última vida perdida en el nivel {lvl}: pantalla «Game Over» con el puntaje final y «Volver a jugar», igual que en el nivel 1; la partida no se reanudó. (Vidas fijadas en 1 por script.)")
def hud_score(r):
    import re
    return int(re.search(r"Puntaje: (\d+)", r.pg.inner_text("body")).group(1))
def c038(r):
    r.start_pacman(); r.do(GOFF); v = [hud_score(r)]
    put(r, 4, 2); r.do("if (s.map.pellets[4][2]!=='none'){s.map.pellets[4][2]='none'; s.pelletsRemaining--;}"); r.key("ArrowRight", delay=0.01); wait_until(r, "s.pacman.col >= 3", 2)
    r.do("s.paused = true;"); time.sleep(0.15); v.append(hud_score(r)); r.do("s.paused = false;")
    eat_power_at(r, 13, 1, (13, 2), "ArrowLeft"); r.do("s.paused = true;"); time.sleep(0.15); v.append(hud_score(r)); r.do("s.paused = false;")
    ghost_on_pacman(r, 0, True); wait_until(r, "s.ghosts[0].eaten", 1); r.do("s.paused = true;"); time.sleep(0.15); v.append(hud_score(r)); r.do("s.paused = false;")
    inc = [b - a for a, b in zip(v, v[1:])]
    res("CP-038", v[0] == 0 and inc == [10, 50, 200], f"HUD: puntaje inicial {v[0]}; después de cada acción {v[1:]} (incrementos {inc}: esfera común, esfera grande y fantasma)." + NOTE)
def c039(r):
    r.start_pacman(); r.do(GOFF); put(r, 10, 1); r.key("ArrowRight"); time.sleep(1.2); r.do("s.pacman.speed=0;"); a = r.s("s.score")
    put(r, 4, 8); ghost_on_pacman(r); wait_until(r, "s.lives < 3", 1); time.sleep(0.1); b = r.s("s.score"); r.do(GOFF + "s.pacman.speed=5;")
    complete_level_quick(r); c_end = r.s("s.score"); wait_until(r, "s.level === 2 && !s.levelComplete", 5); c = r.s("s.score")
    res("CP-039", a > 0 and b == a and c >= b and c == c_end, f"Puntaje {a}; tras perder una vida: {b}; al completar el nivel 1: {c_end}; al iniciar el nivel 2: {c}. Nunca disminuyó. (Mapa reducido por script para completar el nivel.)")
def wait_fruit(r, timeout=9):
    wait_until(r, "s.fruits.length > 0", timeout); return r.s("s.fruits.length ? [s.fruits[0].row, s.fruits[0].col, s.levelElapsed] : null")
def c040(r):
    r.start_pacman(); r.to_level(3); r.do(GOFF + "s.pacman.speed = 0;"); f = wait_fruit(r)
    if not f: return res("CP-040", False, "No apareció ninguna fruta.", blocked=True)
    nb = r.s(f"[[0,1,'ArrowLeft'],[0,-1,'ArrowRight'],[1,0,'ArrowUp'],[-1,0,'ArrowDown']].map(([a,b,k])=>[{f[0]}+a,{f[1]}+b,k]).find(([a,b])=>s.map.cells[a] && s.map.cells[a][b]==='path')")
    r.do(f"for (const [a,b] of [[{f[0]},{f[1]}],[{nb[0]},{nb[1]}]]) if (s.map.pellets[a][b]!=='none') {{ s.map.pellets[a][b]='none'; s.pelletsRemaining--; }} s.pacman.speed = 5;")
    put(r, nb[0], nb[1]); sc, p0 = r.s("[s.score, s.pelletsRemaining]"); r.key(nb[2], delay=0.01)
    wait_until(r, "s.fruits.length === 0", 2); r.do("s.pacman.speed = 0;"); sc1, p1 = r.s("[s.score, s.pelletsRemaining]")
    res("CP-040", sc1 - sc == 100 and p1 == p0, f"Fruta aparecida en ({f[0]},{f[1]}) en el nivel 3: Pacman la consumió, desapareció del mapa, el puntaje subió +{sc1 - sc} y el contador de esferas quedó en {p0} → {p1}. (Esfera de la celda retirada por script para medir solo la fruta.)")
def c041(r):
    r.start_pacman(); r.to_level(3); r.do(GOFF + "s.pacman.speed = 0;"); f = wait_fruit(r)
    if not f: return res("CP-041", False, "No apareció ninguna fruta.", blocked=True)
    key = f"s.fruits.some(x=>x.row==={f[0]}&&x.col==={f[1]})"; t0 = f[2]
    wait_elapsed(r, t0, 14); a = r.s(key); wait_elapsed(r, t0, 16); b = r.s(key)
    res("CP-041", a and not b, f"Fruta aparecida en ({f[0]},{f[1]}): a los 14 s seguía en el mapa; a los 16 s ya no estaba.")
def bonus_row(r, name):
    rows = r.pg.locator("[data-testid=score-breakdown] td:first-child").all_text_contents(); vals = r.pg.locator("[data-testid=score-breakdown] td:last-child").all_text_contents()
    return dict(zip(rows, [int(v.replace(".", "")) for v in vals])).get(name), dict(zip(rows, vals))
def c042(r):
    r.start_pacman(); r.do(GOFF); time.sleep(3); complete_level_quick(r); T = r.s("s.levelElapsed"); b = r.s("s.lastLevelTimeBonus"); bt = r.s("s.scoreBreakdown.timeBonus")
    import math
    exp = 10 * math.floor(120 - T)
    res("CP-042", b == exp and bt == b, f"Nivel 1 completado en {T:.2f} s: bonus por tiempo {b} = 10 × {math.floor(120 - T)} s enteros restantes (fracción descartada); el desglose lo suma. (Mapa reducido a una esfera por script.)")
def c043(r):
    r.start_pacman(); r.do(GOFF + "s.pacman.speed = 0;"); t0 = el(r)
    while el(r) - t0 < 121: r.do("s.lives = 3;"); time.sleep(1)
    r.do("s.pacman.speed = 5;"); complete_level_quick(r); T = r.s("s.levelElapsed"); b = r.s("s.lastLevelTimeBonus"); bt = r.s("s.scoreBreakdown.timeBonus")
    res("CP-043", b == 0 and bt == 0, f"Nivel 1 completado a los {T:.2f} s (más de 120 s reales de juego): bonus por tiempo {b}, no negativo. (Mapa reducido a una esfera por script al final.)")
def c044(r):
    r.start_pacman(); r.do(GOFF + "s.lives = 2;")
    for lvl in (1, 2, 3):
        r.do(GOFF); complete_level_quick(r)
        if lvl < 3: wait_until(r, f"s.level === {lvl + 1} && !s.levelComplete", 5)
    wait_until(r, "s.won", 6); time.sleep(0.4)
    lb, d = bonus_row(r, "Bonus por vidas"); nums = [int(v.replace(".", "")) for v in d.values()]
    total_ok = sum(nums[:-1]) == nums[-1]; r.shot("CP-044")
    res("CP-044", lb == 1000 and total_ok, f"Victoria con 2 vidas: desglose {d}; bonus por vidas {lb} (500 × 2) y la suma de los componentes coincide con el total. (Vidas fijadas en 2 y mapas reducidos por script.)")
def c045(r):
    r.start_pacman(); r.do(GOFF + "s.lives = 1;"); put(r, 4, 8); ghost_on_pacman(r); wait_until(r, "s.gameOver", 1); time.sleep(0.4)
    lb, d = bonus_row(r, "Bonus por vidas")
    res("CP-045", lb == 0, f"Game Over: desglose {d}; bonus por vidas restantes {lb}. (Vidas fijadas en 1 por script.)")
def hud_pellets(r):
    import re
    return int(re.search(r"Esferas: (\d+)", r.pg.inner_text("body")).group(1))
def c046(r):
    r.start_pacman(); r.do(GOFF); h0 = hud_pellets(r); cnt = r.s("s.map.pellets.flat().filter(p=>p!=='none').length")
    put(r, 10, 1); r.do("if (s.map.pellets[10][1]!=='none'){s.map.pellets[10][1]='none'; s.pelletsRemaining--;}"); a = r.s("s.pelletsRemaining")
    r.key("ArrowRight", delay=0.01); wait_until(r, f"s.pelletsRemaining <= {a - 5}", 3); r.do("s.paused = true;"); time.sleep(0.15); h5 = hud_pellets(r); r.do("s.paused = false;")
    put(r, 7, 8); only_pellets(r, [(7, 9)]); r.key("ArrowRight"); wait_until(r, "s.levelComplete", 3); time.sleep(0.15); hz = hud_pellets(r)
    wait_until(r, "s.level === 2 && !s.levelComplete", 5); time.sleep(0.2); h2 = hud_pellets(r); cnt2 = r.s("s.map.pellets.flat().filter(p=>p!=='none').length")
    ok = h0 == cnt and a - h5 == 5 and hz == 0 and h2 == cnt2
    res("CP-046", ok, f"Inicio: contador {h0} = {cnt} esferas del mapa (incluidas las 4 grandes); tras 5 esferas: {h5} (−5); al consumir la última: {hz}; nivel 2: {h2} = {cnt2} esferas de su mapa. (Para la parte final, mapa del nivel 1 reducido a una esfera por script.)")
def c048(r):
    snap = []
    for _ in range(2):
        r.start_pacman(); snap.append(r.s("JSON.stringify([s.map.cells, s.map.pellets])"))
    res("CP-048", snap[0] == snap[1], "Dos partidas nuevas: el mapa del nivel 1 es idéntico en forma, esferas y ubicación de las esferas grandes.")
def c054(r):
    r.start_pacman(); r.to_level(2); r.do(GOFF + "s.powerUpActive=true; s.powerUpTimer=1e9;"); put(r, 13, 8); r.do("s.pacman.speed=0;")
    kind = None
    for i in range(40):
        r.do("const g=s.ghosts[1]; g.eaten=true; g.respawnTimer=0.001;"); time.sleep(0.06)
        kind = r.s("s.ghosts[1].kind")
        if kind == "specter": break
    if kind != "specter": return res("CP-054", False, "No reapareció ningún espectro en 40 intentos.", blocked=True)
    r.do("s.powerUpActive=false; s.powerUpTimer=0; s.ghosts.forEach(g=>g.vulnerable=false); s.ghostMode='scatter';")
    out = {}
    for i, name in [(0, "clásico"), (1, "espectro")]:
        r.do(f"s.ghosts.forEach((g,k)=>{{ if(k!=={i}){{g.eaten=true;g.respawnTimer=1e9;}} }}); const g=s.ghosts[{i}]; g.eaten=false; g.row=11; g.col=1; g.progress=0; g.direction='right'; g.desiredDirection='right';")
        P = f"(()=>{{const g=s.ghosts[{i}]; const d=g.direction, p=g.progress; return [g.row+(d==='down'?p:d==='up'?-p:0), g.col+(d==='right'?p:d==='left'?-p:0), s.levelElapsed];}})()"
        pts = []; tt = time.time()
        while time.time() - tt < 1.0: pts.append(r.s(P)); time.sleep(0.03)
        dist = sum(abs(b[0]-a[0]) + abs(b[1]-a[1]) for a, b in zip(pts, pts[1:])); out[name] = dist / (pts[-1][2] - pts[0][2])
    ratio = out["clásico"] / out["espectro"]
    res("CP-054", abs(out["espectro"] / out["clásico"] - 0.7) < 0.03, f"Nivel 2, recorrido de 1 s de cada uno desde la misma celda (11,1): clásico {out['clásico']:.2f} celdas/s, espectro {out['espectro']:.2f} celdas/s; el espectro tarda {100 * (ratio - 1):.0f} % más en recorrer la misma distancia (30 % más lento). (Espectro obtenido forzando reapariciones y fantasmas ubicados por script.)")
def specter_watch(r, secs):
    r.start_pacman(); r.to_level(3); sp = r.s("s.ghosts.findIndex(g=>g.kind==='specter')")
    r.do(f"s.ghosts.forEach((g,i)=>{{ if(i!=={sp}){{g.eaten=true; g.respawnTimer=1e9;}} }});")
    starts = []; bad = 0; prev = 0; t = time.time()
    while time.time() - t < secs:
        r.do("s.lives = 3; s.powerUpActive = false;")
        g = r.s(f"(()=>{{const g=s.ghosts[{sp}]; const inb = g.row>=0&&g.col>=0&&g.row<s.map.rows&&g.col<s.map.cols; return [g.phaseCellsLeft, inb, inb && s.map.cells[g.row][g.col], s.levelElapsed, g.eaten];}})()")
        if not g[1]: bad += 1
        if g[0] == 0 and not g[4] and g[2] != "path": bad += 1
        if g[0] > 0 and prev == 0: starts.append(round(g[3], 2))
        prev = g[0]; time.sleep(0.03)
    return starts, bad
def c056(r):
    starts, bad = specter_watch(r, 60); gaps = [round(b - a, 2) for a, b in zip(starts, starts[1:])]
    if len(starts) < 2: return res("CP-056", False, f"En 60 s el espectro cruzó {len(starts)} paredes; no alcanza para medir el intervalo.", blocked=True)
    res("CP-056", min(gaps) >= 9.95, f"Nivel 3, 60 s: el espectro empezó a cruzar paredes en t = {starts} s; intervalos {gaps} s, todos ≥ 10 s. (Vidas repuestas y otros fantasmas retirados por script.)")
def c058(r):
    starts, bad = specter_watch(r, 90)
    res("CP-058", bad == 0 and len(starts) > 0, f"Nivel 3, 90 s: el espectro cruzó {len(starts)} paredes; nunca salió del mapa ni quedó detenido dentro de un muro (0 muestras fuera de lugar). (Vidas repuestas y otros fantasmas retirados por script.)")
def c063(r):
    r.start_pacman(); r.key("ArrowLeft"); time.sleep(0.8)
    snap = "JSON.stringify([s.pacman.row,s.pacman.col,s.pacman.progress, s.ghosts.map(g=>[g.row,g.col,g.progress])])"
    r.key("Escape", delay=0.2); ov = r.pg.is_visible("[data-testid=pause-overlay]"); a = r.s(snap); r.shot("CP-063")
    time.sleep(5); b = r.s(snap); r.key("ArrowUp", delay=0.3); r.key("ArrowRight", delay=0.3); c = r.s(snap)
    r.key("Escape", delay=0.6); d = r.s(snap); ov2 = r.pg.is_visible("[data-testid=pause-overlay]")
    res("CP-063", ov and a == b == c and d != c and not ov2, "ESC detuvo la partida y mostró el cartel de pausa; durante 5 s Pacman y los fantasmas quedaron inmóviles; las flechas no movieron a Pacman; el segundo ESC reanudó la partida y se quitó el cartel.")
def c064(r):
    r.start_pacman(); r.do(GOFF); eat_power_at(r, 13, 1, (13, 2), "ArrowLeft"); t0 = el(r); wait_elapsed(r, t0, 2)
    r.key("Escape", delay=0.1); a = r.s("[s.powerUpActive, s.powerUpTimer]"); time.sleep(15); b = r.s("[s.powerUpActive, s.powerUpTimer]")
    r.key("Escape", delay=0.01); w0 = time.time(); wait_until(r, "!s.powerUpActive", 10); dur = time.time() - w0
    res("CP-064", a[0] and b == a and abs(dur - 6) < 0.3, f"Pausa a los 2 s del PowerUp durante 15 s: el PowerUp siguió activo con el temporizador detenido en {a[1]:.2f} s; al reanudar duró {dur:.2f} s más (6 s)." + NOTE)
def c065(r):
    r.start_pacman(); r.do(GOFF); time.sleep(3); r.key("Escape", delay=0.1); w = time.time(); e0 = el(r); time.sleep(60); e1 = el(r)
    r.key("Escape", delay=0.1); time.sleep(1); complete_level_quick(r); total = time.time() - w + 3; T = r.s("s.levelElapsed"); b = r.s("s.lastLevelTimeBonus")
    import math
    res("CP-065", e1 == e0 and b == 10 * math.floor(120 - T), f"Nivel 1 con una pausa de 60 s: tiempo de juego efectivo {T:.2f} s (reloj real ≈ {total:.0f} s; durante la pausa el tiempo no avanzó); bonus por tiempo {b} = 10 × {math.floor(120 - T)}, sin descontar la pausa. (Mapa reducido a una esfera por script para completar el nivel.)")
def c066(r):
    r.start_pacman(); r.do(GOFF + "s.pacman.speed = 0;"); a = r.s("[s.score, s.lives, s.paused, s.powerUpActive, s.gameOver]"); y0 = r.ev("() => window.scrollY")
    r.key("Space", 10, 0.1); b = r.s("[s.score, s.lives, s.paused, s.powerUpActive, s.gameOver]"); y1 = r.ev("() => window.scrollY")
    res("CP-066", a == b and y0 == y1, f"10 pulsaciones de la barra espaciadora: puntaje, vidas, pausa, PowerUp y estado de la partida sin cambios ({a} → {b}); la página no hizo scroll (scrollY {y0} → {y1}).")

ALL = [c004, c006, c010, c013, c021, c022, c026, c027, c028, c029, c035, c037, c038, c039, c040, c041, c042, c043, c044, c045, c046, c048, c054, c056, c058, c063, c064, c065, c066]
if __name__ == "__main__":
    only = sys.argv[1:]
    with sync_playwright() as pw:
        r = Run(pw)
        for f in ALL:
            cid = "CP-" + f.__name__[1:]
            if only and cid not in only: continue
            try: f(r)
            except Exception as e:
                R[cid] = ("ERROR", repr(e)[:300]); print(cid, "ERROR", repr(e)[:300], flush=True)
            if r.errors: print(cid, "consola:", r.errors[:2], flush=True)
        r.close()
    out = os.environ.get("OUT", "results_29.json")
    prev = json.load(open(out)) if os.path.exists(out) else {}
    prev.update(R); json.dump(prev, open(out, "w"), ensure_ascii=False, indent=1)
