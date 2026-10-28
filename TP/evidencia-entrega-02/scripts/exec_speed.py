"""Re-ejecución de los casos afectados por las decisiones 39 (velocidad −25 %) y 40 (fantasmas del modo Pacman −15 %), ciclo 3."""
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import Run
import exec29 as X, reg_exec as RG
from playwright.sync_api import sync_playwright
R = {}
def res(cid, ok, obs): R[cid] = ("Aprobado" if ok else "Fallido", obs); print(cid, R[cid][0], "|", obs, flush=True)
X.res = res; RG.res = res
AI_OFF = "s.ghosts.filter(g => !g.controlledByPlayer).forEach(g => { g.eaten = true; g.respawnTimer = 1e9; });"
PAC_STILL = "s.pacman.speed = 0; s.pacman.direction = null; s.pacman.progress = 0;"
def speed_of(r, n=1.5):
    t0 = r.s("s.levelElapsed"); c0 = r.player("g.col + g.progress"); time.sleep(n); t1 = r.s("s.levelElapsed"); c1 = r.player("g.col + g.progress"); return (c1 - c0) / (t1 - t0)
def cp142(r):
    out = {}
    for kind in ["classic", "naval"]:
        r.start_ghost(kind); r.do(AI_OFF + PAC_STILL + "s.pacman.row = 13; s.pacman.col = 8;"); r.key("ArrowRight"); time.sleep(0.1); out[kind] = speed_of(r)
    res("CP-142", abs(out["classic"] - 3.75) < 0.2 and abs(out["naval"] - 3) < 0.2, f"Velocidad medida: Clásico {out['classic']:.2f} celdas/s, Naval {out['naval']:.2f} celdas/s (−20 %). Valores de la decisión 39 (3,75 y 3 celdas/s). Precondición preparada por script.")
def cp072(r):
    r.start_ghost("naval"); k = r.player("g.kind"); spd = r.player("g.speed")
    res("CP-072", k == "naval" and abs(spd - 3) < 1e-9, f"Enter con el Naval en el centro inicia el modo GhostMan con el Naval (velocidad {spd} celdas/s, decisión 39).")
def cp096(r):
    r.start_ghost("accelerated"); r.do(AI_OFF + PAC_STILL + "s.pacman.row=13; s.pacman.col=8;")
    r.pdo("g.row=7; g.col=1; g.progress=0; g.direction=null; g.facing='right';"); r.key("ArrowRight"); time.sleep(0.05); r.key("Space")
    slow = speed_of(r, 1.0)
    while r.player("g.slowTimer") > 0: time.sleep(0.05)
    r.pdo("g.row=10; g.col=1; g.progress=0; g.direction=null;"); r.key("ArrowRight"); time.sleep(0.1); fast = speed_of(r, 1.0)
    res("CP-096", abs(slow - 1.875) < 0.2 and abs(fast - 3.75) < 0.2, f"Después del dash: {slow:.2f} celdas/s; pasados los 5 s: {fast:.2f} celdas/s (50 % y 100 % de 3,75, decisión 39).")
def cp157(r):
    r.start_pacman(); r.to_level(3)
    r.do("s.ghosts.forEach((g,i)=>{ if(i!==3){g.eaten=true; g.respawnTimer=1e9;} }); s.ghostMode='chase'; s.ghostModeTimer=0; const a=s.ghosts[3]; a.row=13; a.col=4; a.progress=0; a.direction='right'; a.powerCooldown=0;" + PAC_STILL + "s.pacman.row=13; s.pacman.col=9; s.lives=3;")
    time.sleep(0.15); a = r.s("[s.ghosts[3].powerCooldown, s.ghosts[3].speed, s.ghosts[3].slowTimer]")
    res("CP-157", a[0] > 9.5 and abs(a[1] - 1.59375) < 1e-6, f"Con Pacman a 5 celdas el acelerado hizo el dash: velocidad {a[1]} celdas/s (50 % de 3,1875, decisión 40) durante {a[2]:.1f} s y cooldown {a[0]:.1f} s.")
with sync_playwright() as pw:
    r = Run(pw)
    only = sys.argv[1:]
    for f in [cp142, cp072, cp096, cp157, RG.r049, X.c054]:
        if only and f.__name__[-3:] not in only: continue
        try: f(r)
        except Exception as e: print(f.__name__, "ERROR", repr(e)[:200])
    r.close()
prev = json.load(open("results_speed.json")) if os.path.exists("results_speed.json") else {}
prev.update(R); json.dump(prev, open("results_speed.json", "w"), ensure_ascii=False, indent=1)
