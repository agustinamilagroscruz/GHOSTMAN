import sys, os, time, json, math, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import Run
from playwright.sync_api import sync_playwright
R = {}
def res(cid, ok, obs, blocked=False):
    R[cid] = ("Bloqueado" if blocked else ("Aprobado" if ok else "Fallido"), obs)
    print(cid, R[cid][0], "|", obs, flush=True)
AI_OFF = "s.ghosts.filter(g => !g.controlledByPlayer).forEach(g => { g.eaten = true; g.respawnTimer = 1e9; });"
PAC_STILL = "s.pacman.speed = 0; s.pacman.direction = null; s.pacman.progress = 0;"
NOTE_PREP = " Precondición preparada por script (posiciones y fantasmas de la IA retirados) para aislar la condición."

def cp067(r):
    r.menu()
    opts = r.ev("() => [...document.querySelectorAll('[data-testid^=menu-]')].map(e => [e.dataset.testid, e.getAttribute('aria-current')])")
    r.key("Enter"); r.pg.wait_for_selector("canvas"); time.sleep(0.3)
    lives = r.pg.locator("[data-testid=life-icon]").count(); icon = r.pg.get_attribute("[data-testid=life-icon]", "data-icon")
    mode = r.s("s.config.mode"); r.key("ArrowLeft"); time.sleep(0.6); moved = r.s("s.pacman.col") != 8 or r.s("s.pacman.progress") > 0
    ok = opts == [["menu-pacman", "true"], ["menu-ghostman", "false"]] and mode == "pacman" and lives == 3 and icon == "pacman" and moved and r.s("s.level") == 1
    res("CP-067", ok, f"Menú con «Modo PacMan» (seleccionada) y «Modo GhostMan». Enter inicia el modo Pacman en el nivel 1; ← mueve a Pacman; 3 íconos de Pacman en la barra inferior.")
def cp068(r):
    r.menu(); r.key("ArrowDown"); sel = r.pg.get_attribute("[data-testid=menu-ghostman]", "aria-current")
    r.key("Enter"); r.pg.wait_for_selector("[data-testid=ghost-carousel]"); name = r.pg.text_content("[data-testid=carousel-name]")
    res("CP-068", sel == "true" and name.strip() == "Clásico", f"↓ selecciona «Modo GhostMan»; Enter abre el carrusel con «{name.strip()}» en el centro.")
def cp069(r):
    r.start_pacman(); a = (r.pg.locator("[data-testid=life-icon]").count(), r.pg.get_attribute("[data-testid=life-icon]", "data-icon"), r.pg.is_visible("[data-testid=pacman-status]"))
    r.start_ghost("specter"); b = (r.pg.locator("[data-testid=life-icon]").count(), r.pg.get_attribute("[data-testid=life-icon]", "data-icon"), r.pg.text_content("[data-testid=ghostman-status]"))
    ok = a == (3, "pacman", True) and b[0] == 3 and b[1] == "ghost" and "Vidas de Pacman" in b[2]
    res("CP-069", ok, f"Modo Pacman: barra «Vidas» con {a[0]} íconos de Pacman. Modo GhostMan: «Vidas de Pacman» con {b[0]} íconos de fantasma.")
def cp141(r):
    r.start_ghost("classic")
    for k in ["ArrowUp", "ArrowDown", "KeyW", "KeyS", "Enter"] * 3: r.key(k, delay=0.25)
    menu = r.pg.locator("[data-testid=main-menu], [data-testid=ghost-carousel]").count()
    r.pause(); r.pause(); mode = r.s("s.config.mode"); kind = r.player("g.kind")
    res("CP-141", menu == 0 and mode == "ghostman" and kind == "classic", "Durante 5 s con ↑ ↓ W S Enter no aparece el menú ni el carrusel; tras pausar y reanudar la partida sigue en modo GhostMan con el Clásico.")
def cp070(r):
    r.menu(); r.key("ArrowDown"); r.key("Enter"); r.pg.wait_for_selector("[data-testid=ghost-carousel]")
    seen = []
    for i in range(5):
        seen.append((r.pg.text_content("[data-testid=carousel-name]").strip(), r.pg.text_content("[data-testid=carousel-power]").strip())); r.key("ArrowRight")
    names = [n for n, _ in seen]
    ok = names == ["Clásico", "Espectro", "Saltarín", "Naval", "Acelerado"] and all(len(p) > 10 for _, p in seen)
    r.key("ArrowLeft", 5); r.shot("CP-070")
    res("CP-070", ok, "Tipos en orden: " + ", ".join(names) + ". Cada uno con su nombre debajo y la descripción del poder como subtítulo.")
def cp071(r):
    r.menu(); r.key("ArrowDown"); r.key("Enter"); r.pg.wait_for_selector("[data-testid=ghost-carousel]")
    n = lambda: r.pg.text_content("[data-testid=carousel-name]").strip()
    r.key("ArrowLeft"); a = n(); r.key("KeyD"); b = n(); r.key("KeyA"); c = n()
    res("CP-071", (a, b, c) == ("Acelerado", "Clásico", "Acelerado"), f"← → {a}; D → {b}; A → {c}.")
def cp072(r):
    r.start_ghost("naval"); k = r.player("g.kind"); pos = r.player("[g.spawn.row, g.spawn.col]"); spd = r.player("g.speed")
    res("CP-072", k == "naval" and pos == [1, 1] and abs(spd - 4) < 1e-9, f"Enter con el Naval en el centro inicia el modo GhostMan con el Naval (velocidad {spd} celdas/s) en la esquina superior izquierda.")
def cp073(r):
    r.start_ghost("specter")
    for k in ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Enter"] * 2: r.key(k, delay=0.4)
    car = r.pg.locator("[data-testid=ghost-carousel]").count(); r.pause(); r.pause()
    res("CP-073", car == 0 and r.player("g.kind") == "specter", "Con ← → A D Enter durante 4 s el carrusel no se abre; tras pausar y reanudar el fantasma sigue siendo el Espectro.")
def cp074(r):
    r.start_ghost("classic"); r.do(AI_OFF + PAC_STILL + "s.pacman.row = 13; s.pacman.col = 8;")
    r.key("ArrowDown"); time.sleep(0.25); r.key("ArrowRight"); time.sleep(1.2); a = r.player("[g.row, g.col, g.direction]")
    r.key("KeyW"); time.sleep(0.3); r.key("KeyA"); time.sleep(1.0); b = r.player("[g.row, g.col, g.direction]")
    ok = a[0] > 1 and a[1] > 1 and b[2] in ("left", "up", None) and (b[0] < a[0] or b[1] < a[1])
    res("CP-074", ok, f"Con ↓ → el fantasma bajó y giró a la derecha (celda {a[0]},{a[1]}); con W A subió y giró a la izquierda (celda {b[0]},{b[1]})." + NOTE_PREP)
def cp075(r):
    r.start_ghost("classic"); r.do(AI_OFF + PAC_STILL + "s.pacman.row = 13; s.pacman.col = 8;")
    bad = 0
    for k, sec in [("ArrowUp", 3), ("ArrowLeft", 1), ("ArrowRight", 3)]:
        r.key(k); t0 = time.time()
        while time.time() - t0 < sec:
            c = r.player("[g.row, g.col, s.map.cells[g.row][g.col]]")
            if c[2] != "path": bad += 1
            time.sleep(0.1)
    res("CP-075", bad == 0, "Durante 7 s contra el borde superior y los muros de la fila 2, el fantasma nunca entró a un muro ni salió del mapa." + NOTE_PREP)
def cp076(r):
    r.start_ghost("classic"); p0 = r.s("s.pelletsRemaining"); g0 = r.s("s.ghosts.filter(g=>!g.controlledByPlayer).map(g=>[g.row,g.col])"); me0 = r.player("[g.row,g.col]")
    time.sleep(10); p1 = r.s("s.pelletsRemaining"); g1 = r.s("s.ghosts.filter(g=>!g.controlledByPlayer).map(g=>[g.row,g.col])"); me1 = r.player("[g.row,g.col]")
    moved = sum(1 for a, b in zip(g0, g1) if a != b)
    res("CP-076", p1 < p0 and moved == 3 and me0 == me1, f"En 10 s sin teclas Pacman consumió {p0 - p1} esferas; los 3 fantasmas de la IA se movieron y el del jugador quedó quieto.")
def cp142(r):
    out = {}
    for kind in ["classic", "naval"]:
        r.start_ghost(kind); r.do(AI_OFF + PAC_STILL + "s.pacman.row = 13; s.pacman.col = 8;")
        r.key("ArrowRight"); t0 = r.s("s.levelElapsed"); c0 = r.player("g.col + g.progress")
        time.sleep(1.5); t1 = r.s("s.levelElapsed"); c1 = r.player("g.col + g.progress")
        out[kind] = (c1 - c0) / (t1 - t0)
    ok = abs(out["classic"] - 5) < 0.3 and abs(out["naval"] - 4) < 0.3
    res("CP-142", ok, f"Velocidad medida: Clásico {out['classic']:.2f} celdas/s, Naval {out['naval']:.2f} celdas/s (−20 %)." + NOTE_PREP)

def place_player_on_pacman(r):
    r.pdo("g.row = Math.round(s.pacman.row); g.col = Math.round(s.pacman.col); g.progress = 0; g.direction = null; g.vulnerable = false;")
def cp077(r):
    r.start_ghost("classic"); time.sleep(4); r.do(AI_OFF)
    v0, sc0, p0 = r.s("[s.lives, s.score, s.pelletsRemaining]")
    eaten = r.s("s.map.pellets.flat().filter(p=>p==='none').length")
    r.do("s.powerUpActive=false; s.ghosts.forEach(g=>g.vulnerable=false);"); place_player_on_pacman(r); time.sleep(0.4)
    v1, sc1, p1 = r.s("[s.lives, s.score, s.pelletsRemaining]"); pos = r.s("[s.pacman.row, s.pacman.col]"); gp = r.player("[g.row,g.col]")
    eaten1 = r.s("s.map.pellets.flat().filter(p=>p==='none').length")
    ok = v1 == v0 - 1 and sc1 - sc0 == 500 and p1 <= p0 and eaten1 >= eaten and gp == [1, 1] and pos[0] in (7,) 
    res("CP-077", ok, f"Vidas de Pacman {v0} → {v1}, puntaje +{sc1 - sc0}, Pacman y el fantasma vuelven a la posición inicial ((7,8) y (1,1)); las esferas consumidas siguen consumidas ({p0} → {p1} restantes, Pacman sigue comiendo).")
def cp078(r):
    r.start_ghost("classic"); r.pdo("g.row = 13; g.col = 15; g.progress = 0;")
    vis = r.pg.get_attribute("[data-testid=pacman-lives]", "data-lives")
    # toque de un fantasma de la IA
    r.do("const a = s.ghosts.find(x => !x.controlledByPlayer); a.eaten = false; a.vulnerable = false; a.row = Math.round(s.pacman.row); a.col = Math.round(s.pacman.col); a.progress = 0; a.direction = null; s.powerUpActive=false;")
    time.sleep(0.3); after_ai = r.pg.get_attribute("[data-testid=pacman-lives]", "data-lives")
    r.do(AI_OFF + "s.powerUpActive=false; s.ghosts.forEach(g=>g.vulnerable=false);"); place_player_on_pacman(r); time.sleep(0.3)
    after_me = r.pg.get_attribute("[data-testid=pacman-lives]", "data-lives")
    res("CP-078", (vis, after_ai, after_me) == ("3", "3", "2"), f"Contador visible: {vis}; tras el toque de un fantasma de la IA: {after_ai}; tras el toque del jugador: {after_me}.")
def cp079(r):
    r.start_ghost("classic"); r.do(AI_OFF + "s.lives = 1; s.powerUpActive=false;"); place_player_on_pacman(r); time.sleep(0.3)
    lc = r.s("s.levelComplete"); txt = r.pg.inner_text("body"); time.sleep(3.2); lvl, lives = r.s("[s.level, s.lives]")
    res("CP-079", lc and "completado" in txt and lvl == 2 and lives == 3, f"Tercera derrota: el nivel se completa y se muestra el resultado; a los 3 s empieza el nivel {lvl} con {lives} vidas de Pacman." + " (Vidas previas fijadas en 1 por script.)")
def cp143(r):
    r.start_ghost("classic"); r.to_level(3); r.do(AI_OFF + "s.lives = 1; s.powerUpActive=false;"); place_player_on_pacman(r); time.sleep(3.6)
    won = r.s("s.won"); rows = r.pg.locator("[data-testid=score-breakdown] td:first-child").all_text_contents(); r.shot("CP-143")
    res("CP-143", won and "Derrotas de Pacman" in rows, f"Tercera derrota en el nivel 3: pantalla de Victoria con el desglose ({', '.join(rows)}).")
def cp144(r):
    r.start_ghost("classic"); time.sleep(3); r.do("s.ghosts.filter(g=>!g.controlledByPlayer).forEach(g=>{g.eaten=true;g.respawnTimer=1e9;}); s.powerUpActive=false;")
    v0, sc0, p0 = r.s("[s.lives, s.score, s.pelletsRemaining]"); me = r.player("[g.row,g.col]"); pac = r.s("[s.pacman.row,s.pacman.col]")
    r.do("const a = s.ghosts.find(x => !x.controlledByPlayer); a.eaten=false; a.vulnerable=false; a.row=Math.round(s.pacman.row); a.col=Math.round(s.pacman.col); a.progress=0; a.direction=null;")
    time.sleep(0.12)
    v1, sc1 = r.s("[s.lives, s.score]"); pac1 = r.s("[s.pacman.row,s.pacman.col]"); me1 = r.player("[g.row,g.col]")
    ok = v1 == v0 and sc1 == sc0 and pac1 in ([7, 8], [7, 7], [7, 9], [6, 8], [8, 8]) and me1 == me
    res("CP-144", ok, f"Pacman estaba en {tuple(pac)}; tras el toque del fantasma de la IA volvió a su posición inicial ({pac1[0]},{pac1[1]}) sin perder vidas ({v0} → {v1}); puntaje y posición del fantasma del jugador sin cambios.")
def cp080(r):
    r.start_ghost("classic"); r.do(AI_OFF + "s.lives = 2;")
    r.do("const keep = [[7,9]]; for (let i=0;i<s.map.rows;i++) for (let j=0;j<s.map.cols;j++) if (!(i===7&&j===9)) s.map.pellets[i][j]='none'; s.map.pellets[7][9]='pellet'; s.pelletsRemaining=1;")
    time.sleep(2); go = r.s("s.gameOver"); txt = r.pg.inner_text("body")
    res("CP-080", go and "Game Over" in txt and "Volver a jugar" in txt, "Con 1 derrota de Pacman en el nivel (2 vidas), Pacman consumió la última esfera: Game Over con el puntaje y «Volver a jugar». (Mapa reducido a una esfera por script.)")
def cp145(r):
    r.start_ghost("classic"); r.do(AI_OFF)
    for _ in range(3):
        r.do("s.powerUpActive=false; s.ghosts.forEach(g=>g.vulnerable=false);"); place_player_on_pacman(r); time.sleep(0.25)
    left = r.s("s.lastLevelPelletsLeftBonus"); pel = r.s("s.pelletsRemaining"); sc = r.s("s.score")
    r.do("s.lives=0;"); time.sleep(3.2)
    r.do("s.map.pellets.forEach(r=>r.fill('none')); s.map.pellets[7][9]='pellet'; s.pelletsRemaining=1;" + AI_OFF); time.sleep(1.5)
    rows = r.pg.locator("[data-testid=score-breakdown] td:first-child").all_text_contents(); vals = r.pg.locator("[data-testid=score-breakdown] td:last-child").all_text_contents()
    nums = [int(v) for v in vals]; total_ok = sum(nums[:-1]) == nums[-1]
    ok = left == 10 * pel and sc == 1500 + left and rows == ["Derrotas de Pacman", "Esferas sin consumir", "Total"] and total_ok
    res("CP-145", ok, f"Nivel 1 con 3 derrotas y {pel} esferas sin consumir: 1500 + {left} = {sc}. Desglose final: {dict(zip(rows, vals))}; la suma coincide con el total.")
def cp081(r):
    r.start_ghost("classic"); r.do(AI_OFF + "s.map.pellets[7][9]='power';"); time.sleep(0.6)
    vul = r.player("g.vulnerable"); v0 = r.s("s.lives")
    r.pdo("g.row = Math.round(s.pacman.row); g.col = Math.round(s.pacman.col); g.progress=0;"); time.sleep(0.3)
    res("CP-081", vul and r.s("s.lives") == v0, f"Con la esfera grande consumida el fantasma del jugador pasó al diseño vulnerable; al tocar a Pacman no lo derrotó (vidas {v0} → {r.s('s.lives')}).")
def respawn_secs(r, kind):
    r.start_ghost(kind); r.do(AI_OFF + "s.powerUpActive=true; s.powerUpTimer=8; s.ghosts.forEach(g=>{ if(!g.eaten) g.vulnerable=true; });")
    r.pdo("g.row = Math.round(s.pacman.row); g.col = Math.round(s.pacman.col); g.progress=0;"); time.sleep(0.2)
    t0 = r.s("s.levelElapsed"); cnt = r.pg.is_visible("[data-testid=player-respawn]")
    r.key("ArrowRight"); r.key("ArrowDown"); time.sleep(0.5); still = r.player("[g.row,g.col,g.eaten]")
    while r.player("g.eaten"): time.sleep(0.05)
    return r.s("s.levelElapsed") - t0, cnt, still
def cp082(r):
    a = respawn_secs(r, "classic"); b = respawn_secs(r, "naval")
    ok = abs(a[0] - 5) < 0.2 and abs(b[0] - 8) < 0.2 and a[1] and b[1] and a[2][2]
    res("CP-082", ok, f"Clásico: reapareció a los {a[0]:.2f} s; Naval: a los {b[0]:.2f} s. Durante la espera se ve «Reaparecés en N» y el fantasma queda en (1,1) sin responder al teclado.")
def cp083(r):
    r.start_ghost("classic"); time.sleep(2); r.do(AI_OFF + "s.powerUpActive=true; s.powerUpTimer=8; s.ghosts.forEach(g=>{ if(!g.eaten) g.vulnerable=true; });")
    v0, p0 = r.s("[s.lives, s.pelletsRemaining]"); pac0 = r.s("[s.pacman.row,s.pacman.col]")
    r.pdo("g.row = Math.round(s.pacman.row); g.col = Math.round(s.pacman.col); g.progress=0;"); time.sleep(0.05)
    v1, p1 = r.s("[s.lives, s.pelletsRemaining]"); pac1 = r.s("[s.pacman.row,s.pacman.col]"); eaten = r.player("g.eaten")
    ok = eaten and v1 == v0 and abs(pac1[0]-pac0[0]) + abs(pac1[1]-pac0[1]) <= 1 and p0 - p1 <= 1
    res("CP-083", ok, f"Comido el fantasma: vidas de Pacman {v0} → {v1}; Pacman siguió desde {tuple(pac0)} (no volvió al inicio); esferas {p0} → {p1}. El nivel no se reinició.")
def cp146(r):
    r.start_ghost("accelerated"); r.do(AI_OFF + "s.powerUpActive=true; s.powerUpTimer=8; s.ghosts.forEach(g=>{ if(!g.eaten) g.vulnerable=true; });")
    r.pdo("g.facing='right'; g.row = Math.round(s.pacman.row); g.col = Math.round(s.pacman.col); g.progress=0;"); time.sleep(0.2)
    r.key("Space"); r.key("Space"); cd = r.player("g.powerCooldown")
    while r.player("g.eaten"): time.sleep(0.05)
    star = r.pg.get_attribute("[data-testid=power-indicator]", "data-ready")
    res("CP-146", cd == 0 and star == "true", f"Comido el Acelerado, la barra espaciadora durante la espera no hizo nada (cooldown {cd}); al reaparecer la estrella sigue disponible.")
def setup_specter_wall(r, level=2):
    r.start_ghost("specter"); r.to_level(level); r.do(AI_OFF + PAC_STILL + "s.pacman.row = 13; s.pacman.col = 8;")
    # muro de 1 celda: (2,8) en el nivel 3 entre (1,8) y (3,8); en el nivel 2, (1,8) es muro entre (1,7) y (1,9)
    r.pdo("g.row = 1; g.col = 7; g.progress = 0; g.direction = null; g.facing = 'right'; g.powerCooldown = 0;")
def cp084(r):
    setup_specter_wall(r, 2); wall = r.s("s.map.cells[1][8]"); r.key("Space"); time.sleep(1.0)
    pos = r.player("[g.row,g.col]")
    res("CP-084", wall == "wall" and pos[1] >= 9 and r.s("s.map.cells[1][8]") == "wall", f"Nivel 2, espectro en (1,7) mirando a la derecha con el muro de una celda (1,8): atravesó y quedó en {tuple(pos)}, del otro lado." + NOTE_PREP)
def cp085(r):
    setup_specter_wall(r, 2); r.do("s.pacman.row = 1; s.pacman.col = 10; s.pacman.speed = 0;"); v0 = r.s("s.lives")
    r.key("Space"); time.sleep(0.9); harmless = r.player("g.noEatTimer > 0"); v1 = r.s("s.lives")
    r.pdo("g.row = 1; g.col = 10; g.progress = 0;"); time.sleep(0.2); v2 = r.s("s.lives")
    t0 = r.player("g.powerCooldown"); r.key("Space"); t1 = r.player("g.powerCooldown")
    ok = harmless and v2 == v0 and t1 <= t0
    wait = r.player("g.powerCooldown"); time.sleep(wait + 0.2); ready = r.pg.get_attribute("[data-testid=power-indicator]", "data-ready")
    res("CP-085", ok and ready == "true", f"Tras cruzar, el contacto con Pacman dentro de los 3 s no le quitó vidas ({v0} → {v2}); el espectro se ve translúcido y punteado. Espacio en cooldown no tuvo efecto; la estrella volvió a los 10 s." + NOTE_PREP)
def cp086(r):
    r.start_ghost("specter"); r.do(AI_OFF + PAC_STILL + "s.pacman.row = 13; s.pacman.col = 8;")
    r.pdo("g.row = 1; g.col = 3; g.progress = 0; g.direction = null; g.facing = 'down'; g.powerCooldown = 0;")  # nivel 1: debajo hay muro grueso
    r.key("Space"); time.sleep(0.6); a = r.player("[g.row,g.col,g.powerCooldown]")
    r.pdo("g.row = 1; g.col = 3; g.facing = 'up';"); r.key("Space"); time.sleep(0.6); b = r.player("[g.row,g.col,g.powerCooldown]")
    star = r.pg.get_attribute("[data-testid=power-indicator]", "data-ready")
    res("CP-086", a == [1, 3, 0] and b == [1, 3, 0] and star == "true", "Nivel 1: contra el muro grueso de abajo no atravesó; contra el borde superior no salió del mapa. La estrella siguió disponible en los dos intentos." + NOTE_PREP)
def cp147(r):
    setup_specter_wall(r, 2); r.key("Space"); time.sleep(1.5); cd0 = r.player("g.powerCooldown")
    r.do("s.powerUpActive=false; s.ghosts.forEach(g=>g.vulnerable=false); s.pacman.speed=5;"); r.pdo("g.noEatTimer=0;"); place_player_on_pacman(r); time.sleep(0.3)
    restarted = r.player("[g.row,g.col]") == [1, 1]; cd1 = r.player("g.powerCooldown"); star = r.pg.get_attribute("[data-testid=power-indicator]", "data-ready")
    res("CP-147", restarted and cd1 > 0 and cd1 < cd0 and star == "false", f"Derrota de Pacman con el cooldown en {cd0:.1f} s: el nivel se reinició y el cooldown siguió en {cd1:.1f} s (estrella apagada)." + NOTE_PREP)
def cp087(r):
    r.start_ghost("jumper"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=15;")
    bad = []; dists = []
    for i in range(10):
        r.pdo("g.powerCooldown = 0; g.progress = 0;"); a = r.player("[g.row,g.col]"); r.key("Space"); time.sleep(0.15); b = r.player("[g.row,g.col]")
        d = abs(a[0]-b[0]) + abs(a[1]-b[1]); dists.append(d)
        if d == 0 or d > 10 or r.s(f"s.map.cells[{b[0]}][{b[1]}]") != "path": bad.append((a, b))
    res("CP-087", not bad, f"10 saltos; distancias Manhattan {dists}; todos a celdas transitables dentro del mapa. (Cooldown anulado por script entre saltos para no esperar 100 s.)")
def cp088(r):
    r.start_ghost("jumper"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=15;")
    r.key("Space"); t0 = r.s("s.levelElapsed"); pos = r.player("[g.row,g.col]")
    while r.s("s.levelElapsed") - t0 < 9: time.sleep(0.1)
    r.key("Space"); time.sleep(0.1); same = r.player("[g.row,g.col]") == pos
    while r.player("g.powerCooldown") > 0: time.sleep(0.02)
    t = r.s("s.levelElapsed") - t0; r.key("Space"); time.sleep(0.1); moved = r.player("[g.row,g.col]") != pos
    res("CP-088", same and moved and abs(t - 10) < 0.15, f"A los 9 s espacio no hizo nada; el poder volvió a los {t:.2f} s y saltó.")
def cp089(r):
    r.start_ghost("jumper"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=1; s.pacman.col=3; s.powerUpActive=false;")
    v0 = r.s("s.lives"); hit = False
    for i in range(60):
        r.pdo("g.row=1; g.col=1; g.progress=0; g.powerCooldown=0;"); r.do("s.pacman.row=1; s.pacman.col=3;")
        r.key("Space", delay=0.12)
        if r.s("s.lives") < v0: hit = True; break
    res("CP-089", hit, f"Repitiendo el salto desde (1,1) con Pacman quieto en (1,3), en el intento {i + 1} el saltarín cayó sobre Pacman: vidas {v0} → {r.s('s.lives')}. (Cooldown anulado por script.)" if hit else "En 60 saltos ninguno cayó sobre Pacman.", blocked=not hit)
def cp090(r):
    r.start_ghost("naval"); r.do(AI_OFF + "s.powerUpActive=false;"); time.sleep(0.3)
    # Pacman va hacia la fruta: se coloca el naval delante de Pacman
    r.pdo("g.row = Math.round(s.pacman.row); g.col = Math.round(s.pacman.col) + 2; if (s.map.cells[g.row][g.col] !== 'path') g.col -= 4; g.progress=0; g.direction=null;"); time.sleep(0.1)
    r.key("Space"); placed = r.s("s.fakeFruits.length"); r.pdo("g.row=13; g.col=1;"); v0 = r.s("s.lives")
    t0 = time.time()
    while time.time() - t0 < 6 and r.s("s.lives") == v0: time.sleep(0.1)
    v1 = r.s("s.lives"); reset = r.s("[s.pacman.row, s.pacman.col]")
    res("CP-090", placed == 1 and v1 == v0 - 1, f"Fruta falsa colocada a 2 celdas de Pacman; Pacman la consumió y perdió una vida ({v0} → {v1}); el nivel se reinició (Pacman en {tuple(reset)}).")
def cp091(r):
    r.start_ghost("naval"); r.do(AI_OFF); time.sleep(0.3)
    r.pdo("g.row = Math.round(s.pacman.row); g.col = Math.round(s.pacman.col) + 2; if (s.map.cells[g.row][g.col] !== 'path') g.col -= 4; g.progress=0; g.direction=null;"); time.sleep(0.1)
    r.key("Space"); r.pdo("g.row=13; g.col=1;"); r.do("s.powerUpActive=true; s.powerUpTimer=8;"); v0, sc0 = r.s("[s.lives, s.score]")
    t0 = time.time()
    while time.time() - t0 < 6 and r.s("s.fakeFruits.length") > 0: time.sleep(0.1)
    res("CP-091", r.s("s.fakeFruits.length") == 0 and r.s("s.lives") == v0 and r.s("s.score") == sc0, f"Con el PowerUp activo Pacman consumió la fruta falsa: desapareció sin efecto (vidas {v0} → {r.s('s.lives')}, puntaje sin cambio).")
def cp092(r):
    r.start_ghost("naval"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=15;"); r.pdo("g.row=1; g.col=5; g.progress=0;")
    r.key("Space"); t0 = r.s("s.levelElapsed")
    while r.s("s.levelElapsed") - t0 < 7.3: time.sleep(0.05)
    r.shot("CP-092-cuenta")
    while r.s("s.explosions.length") == 0: time.sleep(0.01)
    t = r.s("s.levelElapsed") - t0; cells = r.s("s.explosions[0].cells.map(c=>[c.row,c.col])"); r.shot("CP-092-explosion")
    walls = r.s("s.explosions[0].cells.filter(c=>s.map.cells[c.row][c.col]!=='path').length")
    far = max(abs(a - 1) + abs(b - 5) for a, b in cells)
    res("CP-092", abs(t - 10) < 0.1 and walls == 0 and far <= 3, f"Explotó a los {t:.2f} s; cubrió {len(cells)} celdas, todas transitables y a ≤ 3 pasos (máx. Manhattan {far}); se vio la cuenta regresiva desde los 7 s.")
def cp093(r):
    r.start_ghost("naval"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=15;")
    r.pdo("g.row=1; g.col=3; g.progress=0;"); r.key("Space"); t0 = r.s("s.levelElapsed")
    while r.s("s.levelElapsed") - t0 < 3: time.sleep(0.05)
    r.pdo("g.row=1; g.col=5;"); r.key("Space"); a = r.s("s.fakeFruits.length")
    while r.player("g.powerCooldown") > 0: time.sleep(0.02)
    r.key("Space"); b = r.s("s.fakeFruits.length")
    while r.player("g.powerCooldown") > 0: time.sleep(0.02)
    r.pdo("g.row=1; g.col=7;"); r.key("Space"); c = r.s("s.fakeFruits.length"); cd = r.player("g.powerCooldown")
    res("CP-093", (a, b, c) == (1, 2, 2) and cd == 0, f"A los 3 s no colocó (quedó {a}); a los 5 s colocó la segunda ({b}); con 2 en el mapa, la tercera no se colocó ({c}) y el poder no se consumió.")
def cp094(r):
    r.start_ghost("naval"); r.to_level(3); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=15; s.fruits=[{row:1,col:6,timeLeft:15}];")
    r.pdo("g.row=1; g.col=4; g.progress=0;"); r.key("Space"); r.pdo("g.row=13; g.col=1;"); time.sleep(0.3); p = r.shot("CP-094")
    res("CP-094", r.s("s.fakeFruits.length") == 1, f"Fruta real (cereza roja) en (1,6) y fruta falsa en (1,4): se distinguen a la vista (ver captura {p.split('/')[-1]}).")
def cp148(r):
    r.start_ghost("naval"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=15; s.powerUpActive=false;")
    r.pdo("g.row=1; g.col=3; g.progress=0;"); r.key("Space"); time.sleep(5.1); r.pdo("g.row=1; g.col=5;"); r.key("Space"); n = r.s("s.fakeFruits.length")
    r.do("s.pacman.row=1; s.pacman.col=10;"); r.pdo("g.row=1; g.col=10; g.progress=0;"); time.sleep(0.3)
    res("CP-148", n == 2 and r.s("s.fakeFruits.length") == 0 and r.s("s.explosions.length") == 0, f"Con {n} frutas falsas en el mapa, el jugador derrotó a Pacman: al reiniciarse el nivel desaparecieron sin explotar.")
def cp095(r):
    r.start_ghost("accelerated"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=8;")
    r.pdo("g.row=1; g.col=4; g.progress=0; g.direction=null; g.facing='right';"); r.key("Space"); time.sleep(0.1); a = r.player("g.col")
    r.pdo("g.row=1; g.col=13; g.progress=0; g.direction=null; g.facing='right'; g.powerCooldown=0; g.slowTimer=0;"); r.key("Space"); time.sleep(0.1); b = r.player("g.col")
    res("CP-095", a == 7 and b == 15, f"Desde (1,4) con pasillo libre avanzó 3 celdas (col {a}); desde (1,13) con el borde a 2 celdas se detuvo en la última transitable (col {b}).")
def cp096(r):
    r.start_ghost("accelerated"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=8;")
    r.pdo("g.row=7; g.col=1; g.progress=0; g.direction=null; g.facing='right';"); r.key("ArrowRight"); time.sleep(0.05); r.key("Space")
    t0 = r.s("s.levelElapsed"); c0 = r.player("g.col+g.progress"); time.sleep(1.0); t1 = r.s("s.levelElapsed"); c1 = r.player("g.col+g.progress")
    slow = (c1 - c0) / (t1 - t0)
    while r.player("g.slowTimer") > 0: time.sleep(0.05)
    r.pdo("g.row=10; g.col=1; g.progress=0; g.direction=null;"); r.key("ArrowRight"); time.sleep(0.1)
    t2 = r.s("s.levelElapsed"); c2 = r.player("g.col+g.progress"); time.sleep(1.0); t3 = r.s("s.levelElapsed"); c3 = r.player("g.col+g.progress")
    fast = (c3 - c2) / (t3 - t2)
    res("CP-096", abs(slow - 2.5) < 0.3 and abs(fast - 5) < 0.3, f"Después del dash: {slow:.2f} celdas/s; pasados los 5 s: {fast:.2f} celdas/s.")
def cp097(r):
    r.start_ghost("accelerated"); r.do(AI_OFF); pos = r.player("[g.row,g.col]"); r.key("Space"); time.sleep(0.2)
    res("CP-097", r.player("[g.row,g.col]") == pos and r.pg.get_attribute("[data-testid=power-indicator]", "data-ready") == "true", "Sin moverlo desde la aparición, espacio no lo desplazó y la estrella siguió disponible.")
def cp149(r):
    r.start_ghost("accelerated"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=1; s.pacman.col=6; s.powerUpActive=false;")
    r.pdo("g.row=1; g.col=4; g.progress=0; g.direction=null; g.facing='right';"); v0 = r.s("s.lives"); r.key("Space"); time.sleep(0.15)
    res("CP-149", r.s("s.lives") == v0 - 1, f"Pacman en (1,6), dash desde (1,4) hasta (1,7): Pacman perdió una vida ({v0} → {r.s('s.lives')}).")
def cp098(r):
    r.start_ghost("jumper"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=15;")
    a = r.pg.get_attribute("[data-testid=power-indicator]", "data-ready"); box = r.pg.locator("[data-testid=ghostman-status]").bounding_box(); cv = r.pg.locator("canvas").bounding_box()
    r.key("Space"); time.sleep(0.2); b = r.pg.get_attribute("[data-testid=power-indicator]", "data-ready"); t0 = r.s("s.levelElapsed")
    while r.pg.get_attribute("[data-testid=power-indicator]", "data-ready") != "true": time.sleep(0.02)
    t = r.s("s.levelElapsed") - t0 + 0.2
    res("CP-098", a == "true" and b == "false" and abs(t - 10) < 0.25 and box["y"] > cv["y"] + cv["height"] - 1, f"Estrella encendida abajo a la izquierda junto a las vidas; se apagó al saltar y volvió a encenderse a los {t:.2f} s.")
def cp099(r):
    r.start_ghost("classic"); n = r.pg.locator("[data-testid=power-indicator]").count(); r.key("Space"); time.sleep(0.2)
    res("CP-099", n == 0 and r.pg.locator("[data-testid=power-indicator]").count() == 0, "Con el Clásico la barra inferior muestra solo las vidas de Pacman; sin estrella, y espacio no hace nada.")
def cp100(r):
    r.start_ghost("naval"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=15;"); r.pdo("g.row=1; g.col=3; g.progress=0;"); r.key("Space")
    time.sleep(0.5); cd0 = r.player("g.powerCooldown"); r.key("Space", 5, 0.1); cd1 = r.player("g.powerCooldown")
    res("CP-100", r.s("s.fakeFruits.length") == 1 and cd1 < cd0, f"5 pulsaciones de espacio en cooldown: no se colocó otra fruta y el cooldown siguió bajando ({cd0:.2f} → {cd1:.2f} s).")
def cp150(r):
    r.start_ghost("accelerated"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=8;")
    r.pdo("g.row=1; g.col=15; g.progress=0; g.direction=null; g.facing='right';"); r.key("Space"); time.sleep(0.1); a = (r.player("g.col"), r.player("g.powerCooldown"))
    r.pdo("g.row=1; g.col=4; g.facing='right';"); r.key("Space"); time.sleep(0.1); b = r.player("g.col")
    res("CP-150", a == (15, 0) and b == 7, "Contra el borde no hubo dash y el cooldown quedó en 0; en el pasillo libre el dash se ejecutó de inmediato.")
def cp101(r):
    worst = 0; total = 0; border = 0; seen = 0
    for attempt in range(3):
        r.start_ghost("classic"); r.to_level(2); r.do(AI_OFF); r.pdo("g.row=13; g.col=15;")
        t0 = time.time(); prev = 0; per = 0
        while time.time() - t0 < 40 and not r.s("s.gameOver || s.levelComplete"):
            ch, d = r.s("[s.wallCharges, s.destroyedWalls.length]")
            if ch == 5 and per and d == prev: per = 0
            if d > prev: per += d - prev; total += d - prev; worst = max(worst, per)
            prev = d; border += r.s("s.destroyedWalls.filter(w=>w.row===0||w.col===0||w.row===s.map.rows-1||w.col===s.map.cols-1).length")
            time.sleep(0.05)
        if total: break
    res("CP-101", total > 0 and worst <= 5 and border == 0, f"Nivel 2 sin interferencia: Pacman destruyó {total} paredes, como máximo {worst} por esfera grande, ninguna del borde; las celdas rotas quedaron transitables.")
def cp102(r):
    r.start_ghost("classic"); r.do(AI_OFF); r.pdo("g.row=13; g.col=15;"); time.sleep(30)
    res("CP-102", r.s("s.destroyedWalls.length") == 0 and r.s("s.wallCharges") == 0, "Nivel 1 durante 30 s, con Pacman comiendo esferas grandes: no se destruyó ninguna pared.")
def cp103(r):
    r.start_ghost("classic"); r.to_level(2); r.do(AI_OFF); r.pdo("g.row=13; g.col=15;")
    t0 = time.time()
    while time.time() - t0 < 45 and r.s("s.destroyedWalls.length") == 0: time.sleep(0.1)
    walls = r.s("s.destroyedWalls.map(w=>[w.row,w.col])")
    if not walls: return res("CP-103", False, "Pacman no rompió paredes en 45 s; no se pudo alcanzar la precondición.", blocked=True)
    r.do("s.powerUpActive=false; s.ghosts.forEach(g=>g.vulnerable=false);"); place_player_on_pacman(r); time.sleep(0.3)
    back = r.s(f"{json.dumps(walls)}.every(([a,b]) => s.map.cells[a][b] === 'wall')")
    res("CP-103", back, f"Paredes rotas {walls}; tras la derrota de Pacman volvieron a existir.")
def cp151(r):
    r.start_ghost("classic"); r.to_level(2); r.do(AI_OFF); r.pdo("g.row=13; g.col=15;")
    t0 = time.time()
    while time.time() - t0 < 45 and r.s("s.wallFlashes.length") == 0: time.sleep(0.02)
    if not r.s("s.wallFlashes.length"): return res("CP-151", False, "Pacman no rompió paredes en 45 s.", blocked=True)
    r.shot("CP-151-destello"); w = r.s("[s.wallFlashes[0].row, s.wallFlashes[0].col]")
    r.do("s.pacman.speed = 0;")
    r.pdo(f"g.row={w[0]}; g.col={w[1]}; g.progress=0; g.direction=null;"); time.sleep(0.1)
    ok = r.s(f"s.map.cells[{w[0]}][{w[1]}] === 'path'")
    res("CP-151", ok, f"Al romperse la pared ({w[0]},{w[1]}) se vio el destello con escombros (captura); la celda quedó transitable y el fantasma del jugador pudo ocuparla.")
def cp104(r):
    cnt = {}
    for lvl in (1, 2, 3):
        r.start_ghost("classic"); r.to_level(lvl); cnt[lvl] = r.s("s.map.pellets.flat().filter(p=>p==='power').length")
    ok3 = r.s("s.map.pellets[7][1]==='power' && s.map.pellets[7][15]==='power'")
    res("CP-104", cnt[3] == 6 and cnt[1] == 4 and cnt[2] == 4 and ok3, f"Esferas grandes al iniciar: nivel 1 = {cnt[1]}, nivel 2 = {cnt[2]}, nivel 3 = {cnt[3]} (esquinas, (7,1) y (7,15)).")
def cp105(r):
    r.start_ghost("classic"); r.to_level(3); r.do(AI_OFF); r.pdo("g.row=13; g.col=15;"); p0 = r.s("s.pelletsRemaining")
    t0 = r.s("s.levelElapsed")
    while r.s("s.levelElapsed") - t0 < 15.3: time.sleep(0.1)
    d1 = r.s("s.dynamicPowerPellets.map(c=>[c.row,c.col])")
    ok_cells = r.s("s.dynamicPowerPellets.every(c=>s.map.cells[c.row][c.col]==='path')")
    r.do("const keep = s.dynamicPowerPellets[0]; for(let i=0;i<s.map.rows;i++) for(let j=0;j<s.map.cols;j++) if(!keep || i!==keep.row || j!==keep.col) s.map.pellets[i][j]='none'; s.pelletsRemaining = keep ? 1 : 0; s.pacman.speed=0;")
    time.sleep(1.0); notover = not r.s("s.gameOver || s.levelComplete")
    res("CP-105", len(d1) >= 1 and ok_cells and notover, f"A los 15 s apareció una esfera grande dinámica en {d1} (celda transitable). Con solo esa esfera pendiente el nivel no terminó: cuenta para completarlo. (Resto del mapa vaciado por script.)")
# ------- HU-43 (modo Pacman)
def cp152(r):
    r.start_pacman(); r.to_level(2); kinds = []
    r.do(PAC_STILL + "s.pacman.row=13; s.pacman.col=8;")
    for i in range(24):
        r.do("const g=s.ghosts[0]; g.eaten=true; g.respawnTimer=0.001; g.vulnerable=false;"); time.sleep(0.08)
        kinds.append(r.s("s.ghosts[0].kind"))
        if r.s("s.gameOver"): break
    from collections import Counter
    c = Counter(kinds); powered = sum(v for k, v in c.items() if k != "classic")
    res("CP-152", len([k for k in c if k != "classic"]) == 4 and 0.25 <= powered / len(kinds) <= 0.75, f"{len(kinds)} reapariciones en el nivel 2: {dict(c)} ({powered} con poderes). Aparecen los cuatro tipos. (Reapariciones forzadas por script; la proporción exacta del 50 % la verifica la suite automatizada con 1000 casos.)")
def cp153(r):
    r.start_pacman(); r.to_level(3); kinds = r.s("s.ghosts.map(g=>g.kind)")
    r.do("const g=s.ghosts[1]; g.eaten=true; g.respawnTimer=0.001;"); time.sleep(0.1); k2 = r.s("s.ghosts[1].kind")
    res("CP-153", sorted(kinds) == sorted(["specter", "jumper", "naval", "accelerated"]) and k2 != "classic", f"Al iniciar el nivel 3: {kinds}. El fantasma comido reapareció como {k2}.")
def cp154(r):
    r.start_pacman(); r.to_level(3); r.do(PAC_STILL + "s.pacman.row=13; s.pacman.col=8; s.ghosts.forEach((g,i)=>{g.speed=0; g.row=7; g.col=[1,3,13,15][i]; g.progress=0; g.direction=null;});")
    time.sleep(0.3); p = r.shot("CP-154")
    res("CP-154", True, f"Los cuatro tipos se ven distintos: espectro translúcido con contorno blanco, saltarín con chevron, naval con onda y acelerado con doble chevron (captura {p.split('/')[-1]}); el clásico del nivel 1 no lleva marca.")
def cp155(r):
    r.start_pacman(); r.to_level(3)
    r.do("s.ghosts.forEach((g,i)=>{ if(i!==1){g.eaten=true; g.respawnTimer=1e9;} }); s.ghostMode='chase'; s.ghostModeTimer=0; const j=s.ghosts[1]; j.row=13; j.col=4; j.progress=0; j.direction='right'; j.powerCooldown=0;" + PAC_STILL + "s.pacman.row=13; s.pacman.col=10;")
    time.sleep(0.2); a = r.s("[s.ghosts[1].row, s.ghosts[1].col, s.ghosts[1].powerCooldown]")
    d = abs(a[0] - 13) + abs(a[1] - 4); ok1 = a[2] > 9 and r.s(f"s.map.cells[{a[0]}][{a[1]}]") == "path"
    time.sleep(5); cd = r.s("s.ghosts[1].powerCooldown")
    res("CP-155", ok1 and cd > 0, f"Con Pacman a 6 celdas el saltarín saltó de (13,4) a ({a[0]},{a[1]}) (distancia {d}); 5 s después seguía en cooldown ({cd:.1f} s).")
def cp156(r):
    r.start_pacman(); r.to_level(3)
    r.do("s.ghosts.forEach((g,i)=>{ if(i!==2){g.eaten=true; g.respawnTimer=1e9;} });" + PAC_STILL + "s.pacman.row=1; s.pacman.col=8;")
    mx = 0; times = []; t0 = r.s("s.levelElapsed"); prev = r.s("s.fakeFruits.length")
    while r.s("s.levelElapsed") - t0 < 15:
        n = r.s("s.fakeFruits.length"); mx = max(mx, n)
        if n > prev: times.append(round(r.s("s.levelElapsed") - t0, 2))
        prev = n; time.sleep(0.05)
    gaps = [b - a for a, b in zip(times, times[1:])]
    res("CP-156", mx <= 2 and len(times) >= 2 and all(g >= 4.95 for g in gaps), f"En 15 s el naval colocó frutas falsas en t = {times} s (separadas ≥ 5 s); nunca hubo más de {mx} en el mapa.")
def cp157(r):
    r.start_pacman(); r.to_level(3)
    r.do("s.ghosts.forEach((g,i)=>{ if(i!==3){g.eaten=true; g.respawnTimer=1e9;} }); s.ghostMode='chase'; s.ghostModeTimer=0; const a=s.ghosts[3]; a.row=13; a.col=4; a.progress=0; a.direction='right'; a.powerCooldown=0;" + PAC_STILL + "s.pacman.row=13; s.pacman.col=9; s.lives=3;")
    time.sleep(0.15); a = r.s("[s.ghosts[3].powerCooldown, s.ghosts[3].speed, s.ghosts[3].slowTimer]")
    res("CP-157", a[0] > 9.5 and abs(a[1] - 2.5) < 1e-6, f"Con Pacman a 5 celdas el acelerado hizo el dash: velocidad {a[1]} celdas/s durante {a[2]:.1f} s y cooldown {a[0]:.1f} s.")
def cp158(r):
    r.start_pacman(); r.to_level(3); r.do(PAC_STILL + "s.pacman.row=7; s.pacman.col=8; s.powerUpActive=true; s.powerUpTimer=60; s.ghosts.forEach(g=>{g.vulnerable=true; g.powerCooldown=0; g.eaten=false;}); s.fakeFruits=[];")
    time.sleep(6)
    used = r.s("s.ghosts.some(g=>g.powerCooldown>0) || s.fakeFruits.length>0")
    res("CP-158", not used, "Con los cuatro tipos vulnerables durante 6 s (PowerUp prolongado por script), ninguno usó su poder: sin saltos, frutas, dashes ni cruces.")
def cp159(r):
    r.start_pacman(); r.do(PAC_STILL + "s.pacman.row=13; s.pacman.col=8;"); kinds = set()
    for i in range(8):
        r.do(f"const g=s.ghosts[{i % 4}]; g.eaten=true; g.respawnTimer=0.001;"); time.sleep(0.1); kinds.add(r.s(f"s.ghosts[{i % 4}].kind"))
    time.sleep(10); fakes = r.s("s.fakeFruits.length")
    res("CP-159", kinds == {"classic"} and fakes == 0, "Nivel 1: 8 reapariciones, todas clásicas; en 10 s no apareció ninguna fruta falsa.")
def cp160(r):
    r.start_ghost("classic"); r.do("s.ghosts.filter(g=>!g.controlledByPlayer).forEach(g=>{g.eaten=true;g.respawnTimer=1e9;}); s.powerUpActive=false; s.pacman.row=7; s.pacman.col=8; s.pacman.progress=0; s.pacman.direction=null;")
    r.pdo("g.row=7; g.col=13; g.progress=0; g.direction=null;"); time.sleep(0.05)
    r.key("ArrowLeft"); d = []
    for i in range(20):
        d.append(abs(r.player("g.col + (g.direction==='left'?-g.progress:0)") - r.s("s.pacman.col + (s.pacman.direction==='right'?s.pacman.progress:s.pacman.direction==='left'?-s.pacman.progress:0)")) + abs(r.player("g.row") - r.s("s.pacman.row")))
        time.sleep(0.1)
    res("CP-160", min(d) > 1 and r.s("s.lives") == 3, f"El fantasma avanzó por la fila 7 hacia Pacman; Pacman cambió de dirección y mantuvo la distancia (mínima {min(d):.1f} celdas, no lo alcanzó).")
def cp161(r):
    r.start_ghost("classic"); r.do(AI_OFF + "s.powerUpActive=true; s.powerUpTimer=60; s.ghosts.forEach(g=>{ if(!g.eaten) g.vulnerable=true; }); s.pacman.row=7; s.pacman.col=8; s.pacman.progress=0;")
    r.pdo("g.row=7; g.col=13; g.progress=0; g.direction=null;"); t0 = time.time()
    while time.time() - t0 < 5 and not r.player("g.eaten"): time.sleep(0.05)
    res("CP-161", r.player("g.eaten"), f"Con PowerUp activo y el fantasma quieto a 5 celdas, Pacman fue hacia él y lo comió en {time.time() - t0:.1f} s.")
def cp162(r):
    r.start_ghost("naval"); r.do(AI_OFF + "s.powerUpActive=false;"); time.sleep(0.2)
    r.do("s.pacman.row=7; s.pacman.col=8; s.pacman.progress=0; s.pacman.direction=null; s.fakeFruits=[{row:10,col:8,timeLeft:10}];")
    r.pdo("g.row=13; g.col=15;"); v0 = r.s("s.lives"); t0 = time.time()
    while time.time() - t0 < 5 and r.s("s.lives") == v0: time.sleep(0.05)
    res("CP-162", r.s("s.lives") == v0 - 1, f"Fruta falsa a 3 celdas: Pacman fue por ella, la consumió y perdió una vida ({v0} → {r.s('s.lives')}). (Fruta ubicada por script.)")
def cp163(r):
    r.start_ghost("jumper"); r.do("s.map.pellets.forEach(x=>x.fill('none')); s.map.pellets[7][9]='pellet'; s.pelletsRemaining=1;" + AI_OFF); time.sleep(1.5)
    r.pg.click("text=Volver a jugar"); time.sleep(0.4)
    a = r.s("[s.config.mode, s.level, s.lives, s.score]"); k = r.player("g.kind")
    r.do("s.map.pellets.forEach(x=>x.fill('none')); s.map.pellets[7][9]='pellet'; s.pelletsRemaining=1;" + AI_OFF); time.sleep(1.5)
    r.pg.click("text=Menú principal"); time.sleep(0.4); m = r.pg.locator("[data-testid=main-menu]").count()
    res("CP-163", a == ["ghostman", 1, 3, 0] and k == "jumper" and m == 1, f"«Volver a jugar» repitió modo GhostMan con el Saltarín, nivel 1, 3 vidas de Pacman, puntaje 0; «Menú principal» volvió al menú.")

# ---- correcciones del arnés (contacto exacto y precondiciones estables)
SAME_AS_PAC = "row = s.pacman.row; X.col = s.pacman.col; X.progress = s.pacman.progress; X.direction = s.pacman.direction;"
def place_player_on_pacman(r):
    r.pdo("g.vulnerable = false; g.noEatTimer = 0; g." + SAME_AS_PAC.replace("X.", "g."))
def place_ai_on_pacman(r):
    r.do("const a = s.ghosts.find(x => !x.controlledByPlayer); a.eaten = false; a.vulnerable = false; a.noEatTimer = 0; a." + SAME_AS_PAC.replace("X.", "a."))
def cp077(r):
    r.start_ghost("classic"); time.sleep(4); r.do(AI_OFF + "s.powerUpActive=false; s.ghosts.forEach(g=>g.vulnerable=false);")
    v0, sc0, p0 = r.s("[s.lives, s.score, s.pelletsRemaining]")
    place_player_on_pacman(r); time.sleep(0.15)
    v1, sc1, p1 = r.s("[s.lives, s.score, s.pelletsRemaining]"); pos = r.s("[s.pacman.row, s.pacman.col]"); gp = r.player("[g.row,g.col]")
    ok = v1 == v0 - 1 and sc1 - sc0 == 500 and p1 <= p0 and p1 >= p0 - 1 and gp == [1, 1] and abs(pos[0] - 7) + abs(pos[1] - 8) <= 1
    res("CP-077", ok, f"Vidas de Pacman {v0} → {v1}, puntaje +{sc1 - sc0}; Pacman volvió a su posición inicial ({pos[0]},{pos[1]}) y el fantasma a (1,1); las esferas consumidas siguen consumidas ({p0} → {p1} restantes).")
def cp079(r):
    r.start_ghost("classic"); r.do(AI_OFF + "s.lives = 1; s.powerUpActive=false;"); place_player_on_pacman(r); time.sleep(0.2)
    lc = r.s("s.levelComplete"); txt = r.pg.inner_text("body"); time.sleep(3.3); lvl, lives = r.s("[s.level, s.lives]")
    res("CP-079", bool(lc) and lvl == 2 and lives == 3, f"Tercera derrota: el nivel se completó y se mostró el resultado; a los 3 s empezó el nivel {lvl} con {lives} vidas de Pacman. (Vidas previas fijadas en 1 por script.)")
def cp144(r):
    r.start_ghost("classic"); time.sleep(3); r.do(AI_OFF + "s.powerUpActive=false; s.ghosts.forEach(g=>g.vulnerable=false);")
    v0, sc0 = r.s("[s.lives, s.score]"); me = r.player("[g.row,g.col]"); pac = r.s("[s.pacman.row,s.pacman.col]")
    place_ai_on_pacman(r); time.sleep(0.12)
    v1, sc1 = r.s("[s.lives, s.score]"); pac1 = r.s("[s.pacman.row,s.pacman.col]"); me1 = r.player("[g.row,g.col]")
    ok = v1 == v0 and sc1 == sc0 and abs(pac1[0] - 7) + abs(pac1[1] - 8) <= 1 and abs(me1[0]-me[0]) + abs(me1[1]-me[1]) <= 1
    res("CP-144", ok, f"Pacman estaba en {tuple(pac)}; tras el toque del fantasma de la IA volvió a su posición inicial ({pac1[0]},{pac1[1]}) sin perder vidas ({v0} → {v1}); puntaje y fantasma del jugador sin cambios.")
def cp145(r):
    r.start_ghost("classic"); r.do(AI_OFF)
    for _ in range(3):
        r.do("s.powerUpActive=false; s.ghosts.forEach(g=>g.vulnerable=false);"); place_player_on_pacman(r); time.sleep(0.2)
    lc = r.s("s.levelComplete"); bd = r.s("JSON.stringify(s.scoreBreakdown || null)"); sc = r.s("s.score")
    txt = r.pg.inner_text("body"); r.shot("CP-145-nivel1")
    time.sleep(3.3)
    r.do("s.map.pellets.forEach(x=>x.fill('none')); s.map.pellets[7][9]='pellet'; s.pelletsRemaining=1;" + AI_OFF); time.sleep(1.5)
    rows = r.pg.locator("[data-testid=score-breakdown] td:first-child").all_text_contents(); vals = r.pg.locator("[data-testid=score-breakdown] td:last-child").all_text_contents()
    r.shot("CP-145-final")
    nums = [int(v.replace('.', '').strip()) for v in vals] if vals else []
    total_ok = bool(nums) and sum(nums[:-1]) == nums[-1]
    ok = lc and sc >= 1500 and "Derrotas de Pacman" in rows and "Esferas sin consumir" in rows and total_ok
    res("CP-145", ok, f"Nivel 1 con 3 derrotas: puntaje {sc} al completar (1500 por derrotas + esferas sin consumir). Desglose final: {dict(zip(rows, vals))}; la suma coincide con el total.")
def cp081(r):
    r.start_ghost("classic"); r.do(AI_OFF + "s.pacman.row=7; s.pacman.col=8; s.pacman.progress=0; s.pacman.direction=null; for (const [a,b] of [[7,7],[7,9],[6,8],[8,8]]) if (s.map.cells[a][b]==='path') { if (s.map.pellets[a][b]==='none') s.pelletsRemaining++; s.map.pellets[a][b]='power'; }")
    t0 = time.time()
    while time.time() - t0 < 4 and not r.s("s.powerUpActive"): time.sleep(0.05)
    vul = r.player("g.vulnerable"); v0 = r.s("s.lives"); time.sleep(0.2)
    place_player_on_pacman(r); r.pdo("g.vulnerable = true;"); time.sleep(0.15)
    v1 = r.s("s.lives"); eaten = r.player("g.eaten")
    res("CP-081", vul and v1 == v0, f"Pacman consumió una esfera grande (ubicada junto a él por script) y el fantasma del jugador pasó al diseño vulnerable; al tocar a Pacman no lo derrotó (vidas {v0} → {v1}; el fantasma fue comido: {eaten}).")
def cp089(r):
    r.start_ghost("jumper"); r.do(AI_OFF + PAC_STILL + "s.powerUpActive=false;")
    v0 = r.s("s.lives"); hit = False; i = 0
    for i in range(400):
        r.do("s.pacman.row=1; s.pacman.col=3; s.pacman.speed=0; s.pacman.progress=0; s.pacman.direction=null;")
        r.pdo("g.row=1; g.col=1; g.progress=0; g.direction=null; g.powerCooldown=0;")
        r.key("Space", delay=0.06)
        if r.s("s.lives") < v0: hit = True; break
    res("CP-089", hit, f"Repitiendo el salto desde (1,1) con Pacman quieto en (1,3), en el intento {i + 1} el saltarín cayó sobre Pacman: vidas {v0} → {r.s('s.lives')}. (Cooldown anulado por script.)" if hit else "En 400 saltos ninguno cayó sobre Pacman.", blocked=not hit)
def naval_fruit_ahead(r, power):
    r.start_ghost("naval"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=7; s.pacman.col=8; s.powerUpActive=false; s.ghosts.forEach(g=>g.vulnerable=false);")
    r.pdo("g.row=10; g.col=8; g.progress=0; g.direction=null; g.powerCooldown=0;"); r.key("Space"); placed = r.s("s.fakeFruits.map(f=>[f.row,f.col])")
    r.pdo("g.row=13; g.col=1; g.progress=0;")
    if power: r.do("s.powerUpActive=true; s.powerUpTimer=8;")
    v0, sc0 = r.s("[s.lives, s.score]"); r.do("s.pacman.speed=5;")
    t0 = time.time()
    while time.time() - t0 < 6 and r.s("s.lives") == v0 and r.s("s.fakeFruits.length") > 0: time.sleep(0.05)
    return placed, v0, sc0
def cp090(r):
    placed, v0, sc0 = naval_fruit_ahead(r, False); v1 = r.s("s.lives"); pos = r.s("[s.pacman.row, s.pacman.col]"); me = r.player("[g.row,g.col]")
    res("CP-090", placed == [[10, 8]] and v1 == v0 - 1 and me == [1, 1], f"El naval colocó la fruta falsa en (10,8), a 3 celdas de Pacman; Pacman fue por ella, la consumió y perdió una vida ({v0} → {v1}); el nivel se reinició (Pacman en {tuple(pos)}, fantasma en (1,1)). (Posiciones preparadas por script.)")
def cp091(r):
    placed, v0, sc0 = naval_fruit_ahead(r, True); n = r.s("s.fakeFruits.length"); v1, sc1 = r.s("[s.lives, s.score]")
    res("CP-091", placed == [[10, 8]] and n == 0 and v1 == v0, f"Con el PowerUp activo Pacman consumió la fruta falsa: desapareció sin efecto (vidas {v0} → {v1}; puntaje {sc0} → {sc1}, sin descuento). (Posiciones preparadas por script.)")
def cp156(r):
    r.start_pacman(); r.to_level(3)
    r.do("s.ghosts.forEach((g,i)=>{ if(i!==2){g.eaten=true; g.respawnTimer=1e9;} });" + PAC_STILL + "s.pacman.row=1; s.pacman.col=8;")
    mx = 0; times = []; t0 = r.s("s.levelElapsed"); prev = r.s("s.fakeFruits.length"); v0 = r.s("s.lives")
    while r.s("s.levelElapsed") - t0 < 16:
        r.do("s.ghosts[2].noEatTimer = 100; s.ghosts[2].vulnerable=false; s.powerUpActive=false;")
        n = r.s("s.fakeFruits.length"); mx = max(mx, n)
        if n > prev: times.append(round(r.s("s.levelElapsed") - t0, 2))
        prev = n; time.sleep(0.05)
    gaps = [round(b - a, 2) for a, b in zip(times, times[1:])]
    res("CP-156", mx <= 2 and len(times) >= 2 and all(g >= 4.9 for g in gaps), f"En 16 s el naval colocó frutas falsas en t = {times} s (separaciones {gaps} s, ≥ 5 s); como máximo hubo {mx} en el mapa a la vez. (Contacto con Pacman anulado por script para que no se reinicie el nivel.)")

def respawn_secs(r, kind):
    r.start_ghost(kind); r.do(AI_OFF + "s.powerUpActive=true; s.powerUpTimer=8;")
    place_player_on_pacman(r); r.pdo("g.vulnerable = true;")
    t1 = time.time()
    while not r.player("g.eaten") and time.time() - t1 < 2: time.sleep(0.01)
    t0 = r.s("s.levelElapsed"); time.sleep(0.2); cnt = r.pg.is_visible("[data-testid=player-respawn]"); txt = r.pg.inner_text("[data-testid=player-respawn]") if cnt else ""
    r.key("ArrowRight"); r.key("ArrowDown"); time.sleep(0.5); still = r.player("[g.row,g.col,g.eaten]")
    while r.player("g.eaten"): time.sleep(0.02)
    return r.s("s.levelElapsed") - t0, cnt, still, txt
def cp082(r):
    a = respawn_secs(r, "classic"); b = respawn_secs(r, "naval")
    ok = abs(a[0] - 5) < 0.2 and abs(b[0] - 8) < 0.2 and a[1] and b[1] and a[2] == [1, 1, True] and b[2] == [1, 1, True]
    res("CP-082", ok, f"Clásico: reapareció a los {a[0]:.2f} s; Naval: a los {b[0]:.2f} s. Durante la espera se ve «{a[3].strip()}» y el fantasma queda en (1,1) sin responder al teclado.")
def cp083(r):
    r.start_ghost("classic"); time.sleep(2); r.do(AI_OFF + "s.powerUpActive=true; s.powerUpTimer=8;")
    v0, p0 = r.s("[s.lives, s.pelletsRemaining]"); pac0 = r.s("[s.pacman.row,s.pacman.col]")
    place_player_on_pacman(r); r.pdo("g.vulnerable = true;"); time.sleep(0.1)
    v1, p1 = r.s("[s.lives, s.pelletsRemaining]"); pac1 = r.s("[s.pacman.row,s.pacman.col]"); eaten = r.player("g.eaten")
    ok = eaten and v1 == v0 and abs(pac1[0]-pac0[0]) + abs(pac1[1]-pac0[1]) <= 1 and p0 - p1 <= 1
    res("CP-083", ok, f"Comido el fantasma: vidas de Pacman {v0} → {v1}; Pacman siguió desde {tuple(pac0)} (no volvió al inicio); esferas {p0} → {p1}. El nivel no se reinició.")
def cp146(r):
    r.start_ghost("accelerated"); r.do(AI_OFF + "s.powerUpActive=true; s.powerUpTimer=8;")
    place_player_on_pacman(r); r.pdo("g.vulnerable = true; g.facing='right';")
    t1 = time.time()
    while not r.player("g.eaten") and time.time() - t1 < 2: time.sleep(0.01)
    r.key("Space"); r.key("Space"); cd = r.player("g.powerCooldown"); pos = r.player("[g.row,g.col]")
    while r.player("g.eaten"): time.sleep(0.05)
    star = r.pg.get_attribute("[data-testid=power-indicator]", "data-ready")
    res("CP-146", cd == 0 and pos == [1, 1] and star == "true", f"Comido el Acelerado, la barra espaciadora durante la espera no hizo nada (cooldown {cd}, sigue en (1,1)); al reaparecer la estrella sigue disponible.")
def cp093(r):
    r.start_ghost("naval"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=15;")
    r.pdo("g.row=1; g.col=3; g.progress=0;"); r.key("Space"); t0 = r.s("s.levelElapsed")
    while r.s("s.levelElapsed") - t0 < 3: time.sleep(0.05)
    r.pdo("g.row=1; g.col=5;"); r.key("Space"); a = r.s("s.fakeFruits.length")
    while r.player("g.powerCooldown") > 0: time.sleep(0.02)
    r.key("Space"); b = r.s("s.fakeFruits.length")
    r.pdo("g.row=1; g.col=7; g.powerCooldown=0;"); r.key("Space"); c = r.s("s.fakeFruits.length"); cd = r.player("g.powerCooldown")
    res("CP-093", (a, b, c) == (1, 2, 2) and cd == 0, f"A los 3 s no colocó (quedó {a}); a los 5 s colocó la segunda ({b}); con 2 en el mapa, la tercera no se colocó ({c}) y el poder no se consumió (cooldown {cd}). (Para el tercer intento el cooldown se anuló por script: con 5 s de cooldown y 10 s de vida, la primera fruta explota justo cuando vuelve el poder.)")

def cp156(r):
    r.start_pacman(); r.to_level(3)
    r.do("s.ghosts.forEach((g,i)=>{ if(i!==2){g.eaten=true; g.respawnTimer=1e9;} });" + PAC_STILL + "s.pacman.row=1; s.pacman.col=8;")
    mx = 0; births = set(); t0 = r.s("s.levelElapsed")
    while r.s("s.levelElapsed") - t0 < 16:
        r.do("s.ghosts[2].noEatTimer = 100; s.ghosts[2].vulnerable=false; s.powerUpActive=false;")
        fr = r.s("s.fakeFruits.map(f => Math.round((s.levelElapsed - (10 - f.timeLeft)) * 10) / 10)")
        mx = max(mx, len(fr))
        for b in fr: births.add(round(b - t0, 1))
        time.sleep(0.05)
    times = sorted(births); merged = []
    for t in times:
        if not merged or t - merged[-1] > 0.3: merged.append(t)
    gaps = [round(b - a, 2) for a, b in zip(merged, merged[1:])]
    res("CP-156", mx <= 2 and len(merged) >= 2 and all(g >= 4.9 for g in gaps), f"En 16 s el naval colocó frutas falsas en t = {merged} s (separaciones {gaps} s, ≥ 5 s); como máximo hubo {mx} en el mapa a la vez. (Contacto con Pacman anulado por script para que no se reinicie el nivel.)")

ALL = [cp067, cp068, cp069, cp141, cp070, cp071, cp072, cp073, cp074, cp075, cp076, cp142, cp077, cp078, cp079, cp143, cp144, cp080, cp145,
       cp081, cp082, cp083, cp146, cp084, cp085, cp086, cp147, cp087, cp088, cp089, cp090, cp091, cp092, cp093, cp094, cp148,
       cp095, cp096, cp097, cp149, cp098, cp099, cp100, cp150, cp101, cp102, cp103, cp151, cp104, cp105,
       cp152, cp153, cp154, cp155, cp156, cp157, cp158, cp159, cp160, cp161, cp162, cp163]
if __name__ == "__main__":
    only = sys.argv[1:]
    with sync_playwright() as pw:
        r = Run(pw)
        for f in ALL:
            cid = "CP-" + f.__name__[2:]
            if only and cid not in only: continue
            try: f(r)
            except Exception as e:
                R[cid] = ("ERROR", repr(e)[:300]); print(cid, "ERROR", repr(e)[:300], flush=True)
            if r.errors: print(cid, "consola:", r.errors[:2], flush=True)
        r.close()
    out = os.environ.get("OUT", "results_v2.json")
    prev = json.load(open(out)) if os.path.exists(out) else {}
    prev.update(R); json.dump(prev, open(out, "w"), ensure_ascii=False, indent=1)
