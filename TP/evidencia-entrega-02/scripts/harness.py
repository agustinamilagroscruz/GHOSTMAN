import time, json, os
from playwright.sync_api import sync_playwright
BASE = "http://localhost:3000"
SHOTS = "capturas"; os.makedirs(SHOTS, exist_ok=True)

class Run:
    def __init__(self, pw):
        self.b = pw.chromium.launch()
        self.pg = None
    def new(self):
        if self.pg: self.pg.close()
        self.pg = self.b.new_page(viewport={"width": 560, "height": 600})
        self.errors = []
        self.pg.on("pageerror", lambda e: self.errors.append(str(e)))
        return self.pg
    def ev(self, js, arg=None):
        return self.pg.evaluate(js, arg) if arg is not None else self.pg.evaluate(js)
    def s(self, expr):  # expresión sobre el estado: s => ...
        return self.pg.evaluate(f"() => {{ const s = window.__gm; return ({expr}); }}")
    def do(self, code):
        return self.pg.evaluate(f"() => {{ const s = window.__gm; {code} }}")
    def key(self, k, n=1, delay=0.08):
        for _ in range(n): self.pg.keyboard.press(k); time.sleep(delay)
    def wait(self, sec): time.sleep(sec)
    def menu(self):
        self.new(); self.pg.goto(BASE); self.pg.wait_for_selector("[data-testid=main-menu]"); self.pg.wait_for_load_state("networkidle"); time.sleep(0.3)
    def start_pacman(self):
        self.menu(); self.key("Enter"); self.pg.wait_for_selector("canvas"); time.sleep(0.4)
    KINDS = ["classic", "specter", "jumper", "naval", "accelerated"]
    def start_ghost(self, kind="classic"):
        self.menu(); self.key("ArrowDown"); self.key("Enter"); self.pg.wait_for_selector("[data-testid=ghost-carousel]")
        self.key("ArrowRight", self.KINDS.index(kind)); self.key("Enter"); self.pg.wait_for_selector("canvas"); time.sleep(0.4)
    def pause(self): self.key("Escape"); time.sleep(0.15)
    def to_level(self, n):
        for _ in range(10):
            if self.s("s.level") >= n and not self.s("s.levelComplete"): break
            self.do("s.levelComplete = true; s.levelTransitionTimer = 0.01;"); time.sleep(0.25)
        time.sleep(0.2)
    def shot(self, name):
        p = f"{SHOTS}/{name}.png"; self.pg.screenshot(path=p); return p
    def player(self, expr):
        return self.pg.evaluate(f"() => {{ const s = window.__gm; const g = s.ghosts.find(x => x.controlledByPlayer); return ({expr}); }}")
    def pdo(self, code):
        return self.pg.evaluate(f"() => {{ const s = window.__gm; const g = s.ghosts.find(x => x.controlledByPlayer); {code} }}")
    def close(self): self.b.close()
