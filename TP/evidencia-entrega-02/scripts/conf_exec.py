import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import Run, BASE
from reg_exec import GOFF, put, ghost_on_pacman, wait_until
from playwright.sync_api import sync_playwright
R = {}
def res(cid, ok, obs):
    R[cid] = ("Aprobado" if ok else "Fallido", obs); print(cid, R[cid][0], "|", obs, flush=True)
with sync_playwright() as pw:
    r = Run(pw)
    # DEF-001 vía CP-034
    r.start_pacman(); bar = r.pg.locator("[data-testid=pacman-status]").bounding_box(); cv = r.pg.locator("canvas").bounding_box()
    icons = r.pg.locator("[data-testid=life-icon]"); n = icons.count(); kind = icons.first.get_attribute("data-icon"); svg = r.pg.locator("[data-testid=life-icon] svg").count()
    txt = r.pg.text_content("[data-testid=pacman-status]"); r.shot("CONF-DEF-001")
    r.do(GOFF); put(r, 4, 8); ghost_on_pacman(r); wait_until(r, "s.lives < 3", 1); time.sleep(0.2); n2 = r.pg.locator("[data-testid=life-icon]").count()
    low_left = bar["y"] >= cv["y"] + cv["height"] - 1 and bar["x"] <= cv["x"] + 5
    res("DEF-001", low_left and n == 3 and kind == "pacman" and svg == 3 and not any(ch.isdigit() for ch in txt) and n2 == 2,
        f"Las vidas se muestran abajo a la izquierda, debajo del mapa, como {n} íconos de Pacman (sin número); al perder una vida quedan {n2}. CP-034: Fallido en Entrega 1 → Aprobado.")
    # DEF-002
    r.menu(); el = r.pg.locator("[data-testid=menu-ghostman]"); b = el.bounding_box(); r.pg.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2); r.pg.mouse.click(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)
    r.pg.wait_for_selector("[data-testid=ghost-carousel]"); r.pg.reload(); r.pg.wait_for_selector("[data-testid=main-menu]"); time.sleep(1.0)
    sel = r.pg.get_attribute("[data-testid=menu-pacman]", "aria-current"); r.key("Enter"); time.sleep(0.6)
    car = r.pg.locator("[data-testid=ghost-carousel]").count(); mode = r.s("s && s.config.mode") if car == 0 else None
    res("DEF-002", sel == "true" and car == 0 and mode == "pacman", f"Tras elegir «Modo GhostMan» con un clic y recargar con el puntero quieto sobre esa opción, la seleccionada es «Modo PacMan» y Enter inició el modo Pacman (sin carrusel).")
    # CP-032 (Bloqueado en la Entrega 1): reintento
    r.start_pacman(); r.do(GOFF + "s.powerUpActive=true; s.powerUpTimer=8; s.ghosts[1].eaten=false; s.ghosts[1].vulnerable=true; s.ghosts[1].row=1; s.ghosts[1].col=15;"); put(r, 4, 8); time.sleep(0.2)
    ghost_on_pacman(r, 0, False); wait_until(r, "s.lives < 3", 1); time.sleep(0.2)
    a = r.s("[s.lives, s.powerUpActive, s.ghosts.filter(g=>!g.eaten).some(g=>g.vulnerable)]")
    res("CP-032", a == [2, False, False], f"Con el PowerUp activo, un fantasma recién reaparecido (no vulnerable) alcanzó a Pacman: vidas 3 → {a[0]}; al reanudarse el nivel el PowerUp quedó cancelado y los fantasmas con su diseño normal. (Reaparición y contacto preparados por script; en la Entrega 1 quedó Bloqueado por no poder provocar la condición.)")
    r.close()
json.dump(R, open("results_conf.json", "w"), ensure_ascii=False, indent=1)
