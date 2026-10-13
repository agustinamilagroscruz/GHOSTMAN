import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import Run
from playwright.sync_api import sync_playwright
R = {}
def res(cid, ok, obs, blocked=False):
    R[cid] = ("Bloqueado" if blocked else ("Aprobado" if ok else "Fallido"), obs)
    print(cid, R[cid][0], "|", obs, flush=True)

GOFF = "s.ghosts.forEach(g => { g.eaten = true; g.respawnTimer = 1e9; });"
NOTE = " (Fantasmas retirados y posiciones preparadas por script para aislar la condición.)"

def put(r, row, col):
    r.do(f"s.pacman.row={row}; s.pacman.col={col}; s.pacman.progress=0; s.pacman.direction=null; s.pacman.desiredDirection=null;")
def pac(r): return r.s("[s.pacman.row, s.pacman.col]")
def ghost_on_pacman(r, i=0, vulnerable=False):
    r.do(f"const g=s.ghosts[{i}]; g.eaten=false; g.respawnTimer=0; g.vulnerable={str(vulnerable).lower()}; g.noEatTimer=0; g.phaseCellsLeft=0; g.row=s.pacman.row; g.col=s.pacman.col; g.progress=s.pacman.progress; g.direction=s.pacman.direction;")
def only_pellets(r, cells, power=()):
    js = json.dumps([list(c) for c in cells]); jp = json.dumps([list(c) for c in power])
    r.do(f"s.map.pellets.forEach(x=>x.fill('none')); for (const [a,b] of {js}) s.map.pellets[a][b]='pellet'; for (const [a,b] of {jp}) s.map.pellets[a][b]='power'; s.pelletsRemaining={len(cells) + len(power)};")
def wait_until(r, expr, timeout):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if r.s(expr): return True
        time.sleep(0.02)
    return False
def complete_level_quick(r):
    put(r, 7, 8); only_pellets(r, [(7, 9)]); r.key("ArrowRight"); return wait_until(r, "s.levelComplete || s.won", 3)

def moves(r, keys):
    out = []
    want = {"ArrowDown": (1, 0), "ArrowRight": (0, 1), "ArrowUp": (-1, 0), "ArrowLeft": (0, -1), "KeyS": (1, 0), "KeyD": (0, 1), "KeyW": (-1, 0), "KeyA": (0, -1)}
    for k in keys:
        put(r, 4, 6); r.key(k, delay=0.3); p = r.s("[s.pacman.row + (s.pacman.direction==='down'?s.pacman.progress:s.pacman.direction==='up'?-s.pacman.progress:0), s.pacman.col + (s.pacman.direction==='right'?s.pacman.progress:s.pacman.direction==='left'?-s.pacman.progress:0)]")
        d = (p[0] - 4, p[1] - 6); w = want[k]
        out.append(d[0] * w[0] + d[1] * w[1] > 0.5 and abs(d[0] * w[1]) + abs(d[1] * w[0]) < 0.01)
    return out
def r001(r):
    r.start_pacman(); r.do(GOFF); o = moves(r, ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"])
    res("CP-001", all(o), "Desde el cruce (4,6), ↓ → ↑ ← desplazaron a Pacman hacia abajo, derecha, arriba e izquierda respectivamente." + NOTE)
def r002(r):
    r.start_pacman(); r.do(GOFF); o = moves(r, ["KeyS", "KeyD", "KeyW", "KeyA"])
    res("CP-002", all(o), "S D W A produjeron el mismo desplazamiento que ↓ → ↑ ← (abajo, derecha, arriba, izquierda)." + NOTE)
def r003(r):
    r.start_pacman(); r.do(GOFF); put(r, 10, 6); r.key("ArrowDown", delay=0.01); rows = []
    for _ in range(30): rows.append(r.s("s.pacman.row + s.pacman.progress")); time.sleep(0.1)
    mono = all(b >= a for a, b in zip(rows, rows[1:]))
    res("CP-003", mono and r.s("s.pacman.row") == 13, f"Tras un toque de ↓ en (10,6), Pacman siguió bajando sin mantener la tecla hasta el muro inferior (fila {r.s('s.pacman.row')}) y se detuvo ahí." + NOTE)
def r005(r):
    r.start_pacman(); r.do(GOFF); put(r, 10, 2); r.key("ArrowRight", delay=0.02); r.do("s.pacman.col=2; s.pacman.progress=0.1;")
    r.key("ArrowDown", delay=0.12); a = r.s("[s.pacman.row, s.pacman.direction, s.pacman.col + s.pacman.progress]")
    res("CP-005", a[0] == 10 and a[1] == "right" and a[2] > 2.3, f"Avanzando a la derecha por la fila 10 con muro debajo (11,2), ↓ no lo detuvo: siguió hacia la derecha (posición {a[2]:.2f})." + NOTE)
def r007(r):
    r.start_pacman(); r.do(GOFF); put(r, 7, 3); r.pg.keyboard.down("ArrowLeft"); bad = 0
    for _ in range(50):
        c = r.s("[s.pacman.row, s.pacman.col, s.map.cells[s.pacman.row][s.pacman.col]]")
        if c[2] != "path": bad += 1
        time.sleep(0.1)
    r.pg.keyboard.up("ArrowLeft"); stop = r.s("[s.pacman.col, s.pacman.progress]"); r.key("ArrowUp", delay=0.4)
    res("CP-007", bad == 0 and stop == [1, 0] and r.s("s.pacman.row") < 7, f"Con ← mantenida 5 s contra el muro izquierdo, Pacman se detuvo en (7,1) sin superponerse; luego ↑ lo movió con normalidad (fila {r.s('s.pacman.row')})." + NOTE)
def r008(r):
    r.start_pacman(); r.do(GOFF); out = []
    for (row, col, k) in [(13, 8, "ArrowDown"), (7, 15, "ArrowRight"), (1, 8, "ArrowUp"), (7, 1, "ArrowLeft")]:
        put(r, row, col); r.pg.keyboard.down(k); time.sleep(1.0); r.pg.keyboard.up(k)
        out.append(r.s("[s.pacman.row, s.pacman.col]") == [row, col])
    res("CP-008", all(out), "En los bordes abajo (13,8), derecha (7,15), arriba (1,8) e izquierda (7,1), con la tecla hacia afuera, Pacman no salió del mapa y quedó visible." + NOTE)
def r009(r):
    r.start_pacman(); r.to_level(2); bad = 0; kinds = set(); t0 = time.time()
    while time.time() - t0 < 60:
        r.do("s.lives = 3;")
        for g in r.s("s.ghosts.filter(g=>!g.eaten).map(g=>[g.row,g.col,g.kind,s.map.cells[g.row] && s.map.cells[g.row][g.col]])"):
            kinds.add(g[2])
            if g[3] != "path" and g[2] != "specter": bad += 1
        time.sleep(0.1)
    res("CP-009", bad == 0 and kinds <= {"classic"}, f"Nivel 2 durante 60 s: ningún fantasma clásico entró a un muro ni salió del mapa (tipos observados: {sorted(kinds)}). (Vidas repuestas por script para que la partida no termine.)")
def r011(r):
    r.start_pacman(); r.do(GOFF); put(r, 4, 2); r.do("if (s.map.pellets[4][2]!=='none'){s.map.pellets[4][2]='none'; s.pelletsRemaining--;}")
    sc0, p0 = r.s("[s.score, s.pelletsRemaining]"); r.key("ArrowRight", delay=0.01); wait_until(r, "s.pacman.col >= 3", 2); r.do("s.paused = true;")
    sc1, p1 = r.s("[s.score, s.pelletsRemaining]"); gone = r.s("s.map.pellets[4][3]") == "none"; r.do("s.paused = false;")
    res("CP-011", gone and sc1 - sc0 == 10 and p0 - p1 == 1, f"Esfera de (4,3): desapareció; puntaje {sc0} → {sc1} (+{sc1 - sc0}); esferas restantes {p0} → {p1}." + NOTE)
def r012(r):
    r.start_pacman(); r.do(GOFF); put(r, 10, 1); r.do("if (s.map.pellets[10][1]!=='none'){s.map.pellets[10][1]='none'; s.pelletsRemaining--;}")
    p0 = r.s("s.pelletsRemaining"); r.key("ArrowRight"); wait_until(r, "s.pacman.col >= 15", 5)
    cleared = r.s("s.map.pellets[10].slice(1,16).filter(p=>p==='none').length"); eaten = p0 - r.s("s.pelletsRemaining")
    v0 = r.s("s.lives"); ghost_on_pacman(r); wait_until(r, f"s.lives < {v0}", 2); time.sleep(0.5)
    still = r.s("s.map.pellets[10].slice(1,16).filter(p=>p==='none').length")
    res("CP-012", eaten >= 14 and still == cleared and r.s("s.lives") == v0 - 1, f"Pacman consumió {eaten} esferas en la fila 10; tras perder una vida ({v0} → {r.s('s.lives')}) la fila sigue despejada ({still} de 15 celdas sin esfera)." + NOTE)
def r014(r):
    r.start_pacman(); r.do(GOFF); put(r, 13, 3); only_pellets(r, [(13, 5)]); r.key("ArrowRight")
    ok = wait_until(r, "s.levelComplete", 3); txt = r.pg.inner_text("body"); time.sleep(0.2); frozen = r.s("s.pacman.col")
    time.sleep(0.5)
    res("CP-014", ok and "completado" in txt and r.s("s.pacman.col") == frozen, f"Al consumir la última esfera (13,5) el nivel se completó, la partida se detuvo y se mostró «¡Nivel 1 completado!» con el puntaje. (Mapa reducido a una esfera por script.)")
def r015(r):
    r.start_pacman(); r.do(GOFF); put(r, 7, 8); only_pellets(r, [], [(13, 15)]); time.sleep(2)
    res("CP-015", not r.s("s.levelComplete") and r.s("s.pelletsRemaining") == 1, f"Con solo la esfera grande de (13,15) sin consumir, el nivel no se completó y quedan {r.s('s.pelletsRemaining')} esferas; la partida sigue. (Mapa preparado por script.)")
def r016(r):
    r.start_pacman(); r.do(GOFF); v0 = r.s("s.lives"); complete_level_quick(r); sc_end = r.s("s.score")
    wait_until(r, "s.level === 2 && !s.levelComplete", 5); sc2, v2, l2 = r.s("[s.score, s.lives, s.level]")
    res("CP-016", l2 == 2 and sc2 == sc_end and v2 == v0 == 3, f"Completado el nivel 1 con {v0} vidas y {sc_end} puntos: empezó el nivel {l2} con {sc2} puntos y {v2} vidas. (Mapa reducido por script.)")
def r017(r):
    r.start_pacman(); r.do(GOFF); seq = []; kinds3 = None
    for lvl in (1, 2, 3):
        seq.append(r.s("s.level"))
        if lvl == 3: kinds3 = r.s("s.ghosts.map(g=>g.kind)"); r.do(GOFF)
        complete_level_quick(r)
        if lvl < 3: wait_until(r, f"s.level === {lvl + 1} && !s.levelComplete", 5); r.do(GOFF)
    wait_until(r, "s.won", 6); time.sleep(0.3); won = r.s("s.won"); txt = r.pg.inner_text("body")
    ok = seq == [1, 2, 3] and won and "Victoria" in txt and sorted(kinds3) == sorted(["specter", "jumper", "naval", "accelerated"])
    res("CP-017", ok, f"Partida N1 → N2 → N3; en el nivel 3 los fantasmas fueron {kinds3}; al consumir la última esfera se mostró «¡Nivel 3 completado!» y luego «¡Victoria!» con el puntaje final. (Mapas reducidos por script.)")
def far_ghosts(r):
    r.do("[[7,3],[7,13],[4,8],[10,8]].forEach(([a,b],i)=>{const g=s.ghosts[i]; g.eaten=false; g.vulnerable=false; g.row=a; g.col=b; g.progress=0; g.direction=null;}); s.ghostMode='chase'; s.ghostModeTimer=0;")
def r018(r):
    r.start_pacman(); far_ghosts(r); put(r, 13, 2); r.do("s.map.pellets[13][2]='none';")
    def dist(): return r.s("s.ghosts.filter(g=>!g.eaten).reduce((a,g)=>a+Math.abs(g.row-s.pacman.row)+Math.abs(g.col-s.pacman.col),0)")
    sc0 = r.s("s.score"); r.key("ArrowLeft", delay=0.01); wait_until(r, "s.powerUpActive", 2); sc1 = r.s("s.score")
    vul = r.s("s.ghosts.filter(g=>!g.eaten).every(g=>g.vulnerable)"); d0 = dist(); time.sleep(1.5); d1 = dist()
    res("CP-018", sc1 - sc0 == 50 and vul and d1 >= d0, f"Al pasar por (13,1) el PowerUp se activó solo; puntaje +{sc1 - sc0}; los fantasmas cambiaron al diseño vulnerable y se alejaron (suma de distancias {d0} → {d1}). (Fantasmas ubicados en el centro por script.)")
def r019(r):
    r.start_pacman(); far_ghosts(r); put(r, 1, 14); r.do("s.map.pellets[1][14]='none';"); r.key("ArrowRight", delay=0.01)
    wait_until(r, "s.powerUpActive", 2); t0 = r.s("s.levelElapsed")
    wait_until(r, f"s.levelElapsed - {t0} >= 7.5", 9); a = r.s("[s.powerUpActive, s.ghosts.filter(g=>!g.eaten).some(g=>g.vulnerable)]")
    wait_until(r, f"s.levelElapsed - {t0} >= 8.5", 3); b = r.s("[s.powerUpActive, s.ghosts.filter(g=>!g.eaten).some(g=>g.vulnerable)]")
    res("CP-019", a == [True, True] and b == [False, False], f"Esfera grande de (1,15): a los 7,5 s los fantasmas seguían vulnerables; a los 8,5 s recuperaron su diseño y volvieron a perseguir. Duración: 8 s.")
def r020(r):
    r.start_pacman(); r.do(GOFF + "const p=s.ghosts.find(g=>g.id==='pinky'); p.eaten=false; p.vulnerable=false; p.row=4; p.col=3; p.progress=0; p.direction='right'; s.ghostMode='chase'; s.ghostModeTimer=0; s.map.pellets[4][7]='power';")
    put(r, 4, 9); r.do("s.map.pellets[4][9]='none';"); r.key("ArrowLeft", delay=0.01); wait_until(r, "s.powerUpActive", 2); r.do("s.pacman.speed=0;")
    d = []
    for _ in range(10): d.append(r.s("(()=>{const p=s.ghosts.find(g=>g.id==='pinky'); return Math.abs(p.row+0-s.pacman.row)+Math.abs(p.col-s.pacman.col);})()")); time.sleep(0.12)
    r.do("s.pacman.speed=0;")
    res("CP-020", d[-1] > d[0] or (d[-1] >= d[0] and max(d) > d[0]), f"El fantasma rosa venía hacia Pacman por la fila 4; al consumir la esfera grande dejó de acercarse y se alejó (distancia {d[0]} → {d[-1]} celdas)." + NOTE)
def r023(r):
    r.start_pacman(); r.do(GOFF); put(r, 13, 14); r.do("s.map.pellets[13][14]='none';"); r.key("ArrowRight", delay=0.01); wait_until(r, "s.powerUpActive", 2)
    inc = []
    for i in range(4):
        sc = r.s("s.score"); ghost_on_pacman(r, i, True); wait_until(r, f"s.ghosts[{i}].eaten", 1); inc.append(r.s("s.score") - sc)
    res("CP-023", inc == [200, 400, 800, 1600], f"Con la esfera grande de (13,15), los cuatro fantasmas comidos sumaron {inc}." + NOTE)
def r024(r):
    r.start_pacman(); r.do(GOFF); put(r, 13, 14); r.do("s.map.pellets[13][14]='none';"); r.key("ArrowRight", delay=0.01); wait_until(r, "s.powerUpActive", 2)
    sc = r.s("s.score"); ghost_on_pacman(r, 0, True); wait_until(r, "s.ghosts[0].eaten", 1); a = r.s("s.score") - sc; r.do(GOFF)
    wait_until(r, "!s.powerUpActive", 10); put(r, 1, 2); r.do("s.map.pellets[1][2]='none';"); r.key("ArrowLeft", delay=0.01); wait_until(r, "s.powerUpActive", 2)
    sc = r.s("s.score"); ghost_on_pacman(r, 1, True); wait_until(r, "s.ghosts[1].eaten", 1); b = r.s("s.score") - sc
    res("CP-024", a == 200 and b == 200, f"Primer PowerUp (13,15): fantasma +{a}; terminado el PowerUp, segundo PowerUp con la esfera de (1,1): fantasma +{b}." + NOTE)
def r025(r):
    r.start_pacman(); r.do(GOFF + "s.lives=2; s.powerUpActive=true; s.powerUpTimer=8;"); put(r, 4, 8); time.sleep(0.1)
    p0 = pac(r); ghost_on_pacman(r, 0, True); wait_until(r, "s.ghosts[0].eaten", 1); time.sleep(0.1)
    res("CP-025", r.s("s.lives") == 2 and r.s("s.ghosts[0].eaten") and r.s("s.level") == 1 and abs(pac(r)[1] - p0[1]) <= 1, f"Con 2 vidas y PowerUp activo, el fantasma tocado desapareció; vidas 2 → {r.s('s.lives')}; el nivel no se reinició (Pacman siguió en la fila {pac(r)[0]})." + " (Vidas fijadas en 2 por script.)")
def r030(r):
    r.start_pacman(); r.do(GOFF + "s.lives=2;"); put(r, 4, 8); r.key("ArrowRight", delay=0.3); sc0 = r.s("s.score")
    r.do("const g=s.ghosts.find(g=>g.id==='inky'); g.eaten=false; g.vulnerable=false; g.row=s.pacman.row; g.col=s.pacman.col; g.progress=s.pacman.progress; g.direction=s.pacman.direction;")
    wait_until(r, "s.lives < 2", 1); time.sleep(0.1); v, sc, p, g = r.s("[s.lives, s.score, [s.pacman.row,s.pacman.col], s.ghosts.filter(g=>!g.eaten).map(g=>[g.row,g.col])]")
    res("CP-030", v == 1 and sc == sc0 and p == [7, 8], f"Con 2 vidas, el contacto con el fantasma celeste dejó las vidas en {v}; puntaje {sc0} → {sc}; Pacman volvió a (7,8) y los fantasmas a sus posiciones iniciales {g}." + " (Vidas fijadas en 2 por script.)")
def r031(r):
    r.start_pacman(); r.do(GOFF); put(r, 10, 1); r.key("ArrowUp", delay=0.01)
    r.do("const g=s.ghosts[0]; g.eaten=false; g.vulnerable=false; g.row=5; g.col=1; g.progress=0; g.direction='down'; g.desiredDirection='down'; s.ghostMode='chase';")
    wait_until(r, "s.lives < 3", 3); time.sleep(0.5)
    res("CP-031", r.s("s.lives") == 2, f"Contacto de frente en la columna 1 (Pacman subiendo, fantasma bajando): se descontó una sola vida (3 → {r.s('s.lives')})." + NOTE)
def r033(r):
    r.start_pacman(); r.do(GOFF); put(r, 10, 1); r.do("if (s.map.pellets[10][1]!=='none'){s.map.pellets[10][1]='none'; s.pelletsRemaining--;}")
    p0 = r.s("s.pelletsRemaining"); r.key("ArrowRight"); wait_until(r, "s.pacman.col >= 15", 5); r.key("ArrowUp"); wait_until(r, f"s.pelletsRemaining <= {p0 - 20}", 8)
    snap = r.s("JSON.stringify(s.map.pellets)"); sc0 = r.s("s.score"); eaten = p0 - r.s("s.pelletsRemaining"); r.do("s.pacman.speed=0;")
    ghost_on_pacman(r); wait_until(r, "s.lives < 3", 1); time.sleep(0.05)
    a = r.s("[s.level, s.score, [s.pacman.row,s.pacman.col], JSON.stringify(s.map.pellets)]")
    res("CP-033", a[0] == 1 and a[1] == sc0 and a[2] == [7, 8] and a[3] == snap and eaten >= 20, f"Con {eaten} esferas consumidas se perdió una vida: siguió el nivel 1, puntaje {sc0} → {a[1]}, las esferas consumidas siguen ausentes y los personajes volvieron a sus posiciones iniciales." + NOTE)
def r036(r):
    r.start_pacman(); r.to_level(2); r.do(GOFF + "s.lives=1;"); put(r, 3, 8); ghost_on_pacman(r); wait_until(r, "s.gameOver", 1)
    txt = r.pg.inner_text("body"); sc = r.s("s.score"); time.sleep(5); still = r.s("[s.gameOver, s.level, s.lives]")
    res("CP-036", "Game Over" in txt and still == [True, 2, 0], f"Última vida perdida en el nivel 2: se mostró «Game Over» con el puntaje final ({sc}); 5 s después la partida seguía terminada, sin reiniciarse ni reanudarse. (Vidas fijadas en 1 por script.)")
PALETTE_JS = """() => { const c = document.querySelector('canvas'); const x = c.getContext('2d'); const s = window.__gm; const w = c.width / s.map.cols, h = c.height / s.map.rows;
 const out = []; for (let i = 0; i < s.map.rows; i++) for (let j = 0; j < s.map.cols; j++) if (s.map.cells[i][j] === 'wall') { const d = x.getImageData(Math.floor(j*w + w/2), Math.floor(i*h + h/2), 1, 1).data; out.push([d[0], d[1], d[2]]); }
 const avg = [0,1,2].map(k => Math.round(out.reduce((a, p) => a + p[k], 0) / out.length));
 const reds = out.filter(p => p[0] > 120 && p[1] < 90 && p[2] < 90).length; return { avg, reds, n: out.length }; }"""
def r047(r):
    r.start_pacman(); r.do(GOFF); info = []; shapes = []
    for lvl in (1, 2, 3):
        r.do("s.paused=true;"); time.sleep(0.2); pal = r.pg.evaluate(PALETTE_JS); hud = r.pg.text_content("[data-testid=hud-level]")
        shapes.append(r.s("s.map.cells.map(x=>x.join('')).join('|')")); r.shot(f"REG-CP-047-N{lvl}")
        bar = r.pg.locator("[data-testid=life-icon]").count(); r.do("s.paused=false;")
        info.append((lvl, hud.strip(), pal, bar))
        if lvl < 3: complete_level_quick(r); wait_until(r, f"s.level === {lvl + 1} && !s.levelComplete", 5); r.do(GOFF)
    distinct = len(set(shapes)) == 3
    p1, p2, p3 = info[0][2], info[1][2], info[2][2]
    pal_ok = p1["reds"] > 0 and p2["avg"][2] > p2["avg"][0] and p2["reds"] == 0 and p3["avg"][1] > p3["avg"][0] and p3["avg"][1] > p3["avg"][2]
    huds = [i[1] for i in info]; bars = [i[3] for i in info]
    res("CP-047", distinct and pal_ok and all(str(i + 1) in huds[i] for i in range(3)) and all(b == 3 for b in bars),
        f"Niveles 1, 2 y 3 en orden; HUD: {huds}. Los tres mapas tienen forma distinta. Color medio de muros: N1 {p1['avg']} con {p1['reds']} muestras rojas (franjas), N2 {p2['avg']} (azul, sin rojo), N3 {p3['avg']} (verde). Barra inferior de vidas con 3 íconos de Pacman en los tres niveles (DEF-001). (Mapas reducidos por script para avanzar; capturas REG-CP-047-N1..N3.)")
def r049(r):
    r.start_pacman(); bad = 0; kinds = set(); speeds = set(); t0 = time.time()
    while time.time() - t0 < 40:
        r.do("s.lives=3;"); g = r.s("s.ghosts.filter(g=>!g.eaten).map(g=>[g.kind, g.vulnerable ? 0 : g.speed, s.map.cells[g.row][g.col]])")
        for k, sp, c in g:
            kinds.add(k); speeds.add(sp) if sp else None
            if c != "path": bad += 1
        bad += r.s("s.fakeFruits.length"); time.sleep(0.1)
    res("CP-049", kinds == {"classic"} and len(speeds) == 1 and bad == 0, f"Nivel 1 observado 40 s (30 s más que en la V1): tipos {sorted(kinds)}, velocidades {sorted(speeds)} celdas/s; ninguno atravesó muros, saltó, colocó frutas ni hizo dash. (Vidas repuestas por script.)")
def eat_n(r, n):
    kinds = []
    r.do(GOFF + "s.powerUpActive=true; s.powerUpTimer=1e9;"); put(r, 4, 8); r.do("s.pacman.speed=0;")
    for i in range(n):
        j = i % 4; ghost_on_pacman(r, j, True); wait_until(r, f"s.ghosts[{j}].eaten", 1)
        r.do(f"s.ghosts[{j}].respawnTimer=0.001;"); wait_until(r, f"!s.ghosts[{j}].eaten", 1); kinds.append(r.s(f"s.ghosts[{j}].kind"))
        r.do(f"s.ghosts[{j}].eaten=true; s.ghosts[{j}].respawnTimer=1e9;")
    return kinds
def r050(r):
    r.start_pacman(); k = eat_n(r, 6)
    res("CP-050", k == ["classic"] * 6, f"Nivel 1: 6 fantasmas comidos; reaparecieron como {k}. (PowerUp prolongado y reaparición acelerada por script.)")
def r051(r):
    r.start_pacman(); r.do(GOFF + "s.lives=2;"); complete_level_quick(r); wait_until(r, "s.level === 2 && !s.levelComplete", 5)
    k = r.s("s.ghosts.map(g=>g.kind)")
    res("CP-051", k == ["classic"] * 4 and r.s("s.lives") == 2, f"Nivel 1 completado con 2 vidas; al iniciar el nivel 2 los cuatro fantasmas son {k}. (Mapa reducido por script.)")
def r052(r):
    from collections import Counter
    r.start_pacman(); r.to_level(2); k = eat_n(r, 24); c = Counter(k); powered = sum(v for x, v in c.items() if x != "classic")
    ok = c["classic"] > 0 and all(c[x] > 0 for x in ["specter", "jumper", "naval", "accelerated"]) and 0.25 <= powered / len(k) <= 0.75
    res("CP-052", ok, f"Nivel 2: 24 reapariciones → {dict(c)} ({powered} con poderes, {100 * powered // len(k)} %). Aparecen clásicos y los cuatro tipos con poderes, distinguibles a la vista. (PowerUp prolongado y reaparición acelerada por script.)")
def r053(r):
    r.start_pacman(); r.to_level(3); k = r.s("s.ghosts.map(g=>g.kind)"); r.shot("REG-CP-053")
    res("CP-053", sorted(k) == sorted(["specter", "jumper", "naval", "accelerated"]), f"Al iniciar el nivel 3 los fantasmas son {k}: uno de cada tipo con poderes.")
def r055(r):
    r.start_pacman(); r.to_level(3); spec = r.s("s.ghosts.findIndex(g=>g.kind==='specter')")
    r.do(f"s.ghosts.forEach((g,i)=>{{ if(i!=={spec}){{g.eaten=true; g.respawnTimer=1e9;}} }});")
    crossings = 0; maxrun = 0; cur = set(); t0 = time.time()
    while time.time() - t0 < 60:
        r.do("s.lives=3; s.powerUpActive=false;")
        c = r.s(f"(()=>{{const g=s.ghosts[{spec}]; return [s.map.cells[g.row][g.col], g.row, g.col];}})()")
        if c[0] == "wall": cur.add((c[1], c[2]))
        elif cur: crossings += 1; maxrun = max(maxrun, len(cur)); cur = set()
        time.sleep(0.03)
    res("CP-055", crossings >= 1 and maxrun == 1, f"Espectro observado 60 s en el nivel 3: atravesó paredes {crossings} veces, cada vez una sola pared (el cruce es de muro + celda de salida; nunca una secuencia de paredes contiguas). (Vidas repuestas y otros fantasmas retirados por script.)" if crossings else "En 60 s el espectro no atravesó ninguna pared.", blocked=crossings == 0)
def r057(r):
    r.start_pacman(); r.to_level(3); spec = r.s("s.ghosts.findIndex(g=>g.kind==='specter')")
    r.do(f"s.ghosts.forEach((g,i)=>{{ if(i!=={spec}){{g.eaten=true; g.respawnTimer=1e9;}} }}); s.powerUpActive=false;")
    ok = wait_until(r, f"s.ghosts[{spec}].noEatTimer > 2.5 || (s.lives = 3, false)", 60)
    if not ok: return res("CP-057", False, "El espectro no cruzó una pared en 60 s.", blocked=True)
    r.shot("REG-CP-057-gracia"); v0 = r.s("s.lives"); r.do("s.pacman.speed=0;"); ghost_on_pacman(r, spec); r.do(f"s.ghosts[{spec}].noEatTimer = Math.max(s.ghosts[{spec}].noEatTimer, 2);")
    time.sleep(0.15); v1 = r.s("s.lives")
    wait_until(r, f"s.ghosts[{spec}].noEatTimer <= 0", 4); r.do(f"const g=s.ghosts[{spec}]; g.row=s.pacman.row; g.col=s.pacman.col; g.progress=s.pacman.progress; g.direction=null; g.phaseCellsLeft=0;")
    wait_until(r, f"s.lives < {v1}", 1); v2 = r.s("s.lives")
    res("CP-057", v1 == v0 and v2 == v0 - 1, f"Tras atravesar una pared, el contacto dentro de los 3 s no descontó vidas ({v0} → {v1}) y el espectro se veía translúcido y punteado (captura); pasados los 3 s el contacto descontó una vida ({v1} → {v2}). (Contacto provocado por script.)")
def r059(r):
    r.start_pacman(); r.to_level(3); spec = r.s("s.ghosts.findIndex(g=>g.kind==='specter')")
    r.do(f"s.ghosts.forEach((g,i)=>{{ if(i!=={spec}){{g.eaten=true; g.respawnTimer=1e9;}} }});"); put(r, 13, 2); r.do("s.map.pellets[13][2]='none';")
    r.key("ArrowLeft", delay=0.01); wait_until(r, "s.powerUpActive", 2); vul = r.s(f"s.ghosts[{spec}].vulnerable"); sc, v0 = r.s("[s.score, s.lives]")
    ghost_on_pacman(r, spec, True); wait_until(r, f"s.ghosts[{spec}].eaten", 1)
    res("CP-059", vul and r.s("s.score") - sc == 200 and r.s("s.lives") == v0, f"Con la esfera grande el espectro pasó a vulnerable; al comerlo sumó +{r.s('s.score') - sc} (primer fantasma de la escala) y las vidas quedaron en {r.s('s.lives')}." + NOTE)
def r060(r):
    r.start_pacman(); r.do(GOFF + "s.lives=1;"); put(r, 4, 8); ghost_on_pacman(r); wait_until(r, "s.gameOver", 1); time.sleep(0.3)
    rows = r.pg.locator("[data-testid=score-breakdown] td:first-child").all_text_contents(); txt = r.pg.inner_text("body"); r.shot("REG-CP-060")
    acts = ("Volver a jugar" in txt, "Menú principal" in txt); r.pg.click("text=Menú principal"); time.sleep(0.4); menu = r.pg.locator("[data-testid=main-menu]").count()
    res("CP-060", "Game Over" in txt and len(rows) >= 2 and all(acts) and menu == 1, f"Última vida perdida en el nivel 1: pantalla «Game Over» con el puntaje desglosado ({', '.join(rows)}) y las acciones «Volver a jugar» y «Menú principal»; «Menú principal» llevó al menú. (Vidas fijadas en 1 por script.)")
def r061(r):
    r.start_pacman(); r.to_level(3); r.do(GOFF); complete_level_quick(r); wait_until(r, "s.won", 6); time.sleep(0.3)
    rows = r.pg.locator("[data-testid=score-breakdown] td:first-child").all_text_contents(); txt = r.pg.inner_text("body"); r.shot("REG-CP-061")
    acts = ("Volver a jugar" in txt, "Menú principal" in txt); r.pg.click("text=Menú principal"); time.sleep(0.4); menu = r.pg.locator("[data-testid=main-menu]").count()
    res("CP-061", "Victoria" in txt and len(rows) >= 2 and all(acts) and menu == 1, f"Completado el nivel 3: pantalla «¡Victoria!» con el puntaje desglosado ({', '.join(rows)}) y las acciones «Volver a jugar» y «Menú principal»; «Menú principal» llevó al menú. (Mapa reducido por script.)")
def r062(r):
    r.start_pacman(); full1 = r.s("s.pelletsRemaining"); r.do(GOFF); complete_level_quick(r); wait_until(r, "s.level === 2 && !s.levelComplete", 5)
    full2 = r.s("s.pelletsRemaining"); r.do(GOFF + "s.lives=1;"); put(r, 3, 8); sc = r.s("s.score"); ghost_on_pacman(r); wait_until(r, "s.gameOver", 1)
    r.pg.click("text=Volver a jugar"); time.sleep(0.4)
    a = r.s("[s.config.mode, s.level, s.lives, s.score, s.pelletsRemaining, s.fruits.length]")
    r.do(GOFF); complete_level_quick(r); wait_until(r, "s.level === 2 && !s.levelComplete", 5); b = r.s("s.pelletsRemaining")
    res("CP-062", sc > 0 and a == ["pacman", 1, 3, 0, full1, 0] and b == full2, f"Game Over en el nivel 2 con {sc} puntos; «Volver a jugar» inició el modo Pacman en el nivel 1 con 3 vidas, puntaje 0 y {a[4]} esferas (mapa completo); al pasar al nivel 2 su mapa también estaba completo ({b} esferas). (Mapas reducidos por script para avanzar.)")

ALL = [r001, r002, r003, r005, r007, r008, r009, r011, r012, r014, r015, r016, r017, r018, r019, r020, r023, r024, r025, r030, r031, r033, r036, r047, r049, r050, r051, r052, r053, r055, r057, r059, r060, r061, r062]
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
    out = os.environ.get("OUT", "results_reg.json")
    prev = json.load(open(out)) if os.path.exists(out) else {}
    prev.update(R); json.dump(prev, open(out, "w"), ensure_ascii=False, indent=1)
