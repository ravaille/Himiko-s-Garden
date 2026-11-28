import { advance, choose, fill, start as startScene, type Output, type PromptKind, type Runner } from "../core/story";
import { DIRS, TILES, challenge, height, interact, move, spotter, visibleNpcs, width, type Dir, type Npc, type WorldEvent, type WorldState } from "../core/world";
import { SCENES } from "../data/scenes";
import { MAPS, START } from "../data/world";
import { sfx } from "./audio";
import { H_EURO } from "./currency";
import { saveStory, story } from "./storystore";

/**
 * Overworld screen: a character walking on tile maps, Pokémon style (docs/design/12-world-and-campaign.md).
 * Placeholder graphics (coloured tiles + emoji). Rules live in core/world.ts; this file draws and handles input.
 */

const TILE = 32;
const VIEW_W = 15;
const VIEW_H = 11;
const STEP_MS = 150;
const SAVE_KEY = "himiko.world.v1";

export interface WorldHooks {
  /** A trainer's duel starts. Returns an error message when it cannot (e.g. the deck is not valid). */
  duel(npcId: string): string | null;
  openDeck(): void;
  /** True while a menu covers the world: input is ignored. */
  paused(): boolean;
  /** A scene needs the game to do something (card choice, scripted duel...). Call `resume` when it is over; for a duel, the world is left and the scene resumes when it is mounted again. Returns an error message when it cannot. */
  prompt(kind: PromptKind, arg: string | undefined, resume: () => void): string | null;
}

// ------------------------------------------------------------------ saved state

function loadState(): WorldState {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null") as WorldState | null;
    if (s && MAPS[s.map] && Array.isArray(s.defeated) && s.dir in DIRS) {
      const m = MAPS[s.map];
      const ok = m.rows[s.y]?.[s.x] !== undefined && !!TILES[m.rows[s.y][s.x]]?.walkable;
      if (ok) return { ...s, flags: story.flags };
    }
  } catch {
    /* corrupt save: start over */
  }
  return { ...START, defeated: [], flags: story.flags };
}

let state: WorldState = loadState();

/** Puts the player somewhere (new game, scripted teleport). */
export function placeAt(map: string, x: number, y: number, dir: Dir): void {
  state = { ...state, map, x, y, dir, flags: story.flags };
  save();
}

function save(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, flags: undefined }));
  } catch {
    /* storage unavailable: progress is simply not kept */
  }
}

/** The player beat this trainer: they will not challenge again. */
export function markDefeated(npcId: string): void {
  if (!state.defeated.includes(npcId)) state.defeated.push(npcId);
  save();
}

export const worldState = (): WorldState => state;

// ------------------------------------------------------------------ runtime (only while mounted)

interface Dialog {
  speaker?: string;
  lines: string[];
  i: number;
  then?: WorldEvent;
  /** Scripted choice: the options shown instead of "next", and which one is highlighted. */
  choice?: { out: Extract<Output, { t: "choice" }>; sel: number };
  /** Scripted line: when it is over, the scene goes on. */
  scripted?: boolean;
}

/** The scene being played (it survives leaving the world for a duel). */
let script: { runner: Runner; waitingDuel: boolean } | null = null;
/** The line shown above the options of a choice: the last thing said. */
let lastSaid = "";

let hooks: WorldHooks;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let dialogEl: HTMLElement;
let titleEl: HTMLElement;
let raf = 0;
let mounted = false;
let cleanup: (() => void)[] = [];

let dialog: Dialog | null = null;
let anim: { fx: number; fy: number; start: number } | null = null;
let alert: { npc: Npc; until: number } | null = null;
let fadeStart = 0;
let titleUntil = 0;
let lastHud = "";
let hudEl: HTMLElement;
const held: Dir[] = [];

const KEYS: Record<string, Dir> = {
  ArrowUp: "up", z: "up", w: "up",
  ArrowDown: "down", s: "down",
  ArrowLeft: "left", q: "left", a: "left",
  ArrowRight: "right", d: "right",
};

const busy = () => !!dialog || !!alert || !!anim || !!script || hooks.paused();

export function mountWorld(stage: HTMLElement, h: WorldHooks): void {
  unmountWorld();
  hooks = h;
  stage.innerHTML = `<div class="world">
    <canvas width="${VIEW_W * TILE}" height="${VIEW_H * TILE}"></canvas>
    <div class="maptitle"></div>
    <div class="hud"></div>
    <div class="cut hidden"></div>
    <div class="dlg hidden"></div>
    <div class="pad">
      <div class="dpad">
        <button data-dir="up">▲</button><button data-dir="left">◀</button><button data-dir="right">▶</button><button data-dir="down">▼</button>
      </div>
      <button class="abtn" data-do="action">A</button>
    </div>
    <p class="muted hint">Flèches / ZQSD : marcher · Entrée / Espace / E : parler ou lire · Échap : menu</p>
  </div>`;
  canvas = stage.querySelector("canvas")!;
  ctx = canvas.getContext("2d")!;
  dialogEl = stage.querySelector(".dlg")!;
  titleEl = stage.querySelector(".maptitle")!;
  hudEl = stage.querySelector(".hud")!;
  lastHud = "";
  held.length = 0;
  dialog = null;
  anim = null;
  alert = null;
  titleUntil = performance.now() + 2200;
  fadeStart = performance.now();

  const down = (e: KeyboardEvent) => {
    if (hooks.paused()) return;
    const d = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
    if (dialog?.choice) {
      const c = dialog.choice;
      if (d === "up" || d === "down") {
        e.preventDefault();
        c.sel = (c.sel + (d === "down" ? 1 : c.out.options.length - 1)) % c.out.options.length;
        showDialog();
      } else if (e.key >= "1" && e.key <= "9" && Number(e.key) <= c.out.options.length) pickOption(Number(e.key) - 1);
      if (d) return; // arrows move the highlight, not the character
    }
    if (d) {
      e.preventDefault();
      if (!held.includes(d)) held.push(d);
    } else if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "e") {
      e.preventDefault();
      if (!e.repeat) action();
    }
  };
  const up = (e: KeyboardEvent) => {
    const d = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
    if (d) held.splice(0, held.length, ...held.filter((x) => x !== d));
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  cleanup.push(() => window.removeEventListener("keydown", down), () => window.removeEventListener("keyup", up));

  // touch / mouse pad
  stage.querySelectorAll<HTMLButtonElement>("[data-dir]").forEach((b) => {
    const dir = b.dataset.dir as Dir;
    const press = (e: Event) => {
      e.preventDefault();
      if (!held.includes(dir)) held.push(dir);
    };
    const release = () => held.splice(0, held.length, ...held.filter((x) => x !== dir));
    b.addEventListener("pointerdown", press);
    b.addEventListener("pointerup", release);
    b.addEventListener("pointerleave", release);
    b.addEventListener("pointercancel", release);
  });
  stage.querySelector<HTMLButtonElement>("[data-do=action]")!.addEventListener("click", () => {
    if (!hooks.paused()) action();
  });
  dialogEl.addEventListener("click", (e) => {
    const k = (e.target as HTMLElement).closest<HTMLElement>("[data-opt]")?.dataset.opt;
    if (k !== undefined) pickOption(Number(k));
    else action();
  });

  mounted = true;
  if (script?.waitingDuel) {
    script.waitingDuel = false; // back from the duel: the scene goes on
    stepScript();
  }
  raf = requestAnimationFrame(frame);
}

export function unmountWorld(): void {
  mounted = false;
  cancelAnimationFrame(raf);
  for (const fn of cleanup) fn();
  cleanup = [];
  held.length = 0;
}

// ------------------------------------------------------------------ logic glue

function action(): void {
  if (dialog?.choice) return pickOption(dialog.choice.sel);
  if (dialog) return advanceDialog();
  if (busy()) return;
  const ev = interact(MAPS, state);
  if (ev) runEvent(ev);
}

function runEvent(ev: WorldEvent): void {
  switch (ev.type) {
    case "dialog":
      dialog = { speaker: ev.speaker, lines: ev.lines, i: 0, then: ev.then };
      showDialog();
      return;
    case "script":
      playScene(ev.id);
      return;
    case "duel": {
      const err = hooks.duel(ev.npcId);
      if (err) runEvent({ type: "dialog", lines: [err] });
      return;
    }
    case "openDeck":
      hooks.openDeck();
      return;
    case "shop":
      runEvent({ type: "dialog", lines: ["(La boutique n'est pas encore implémentée.)"] });
      return;
    case "vending":
      runEvent({ type: "dialog", lines: ["(Le distributeur de boosters n'est pas encore implémenté.)"] });
      return;
  }
}

function showDialog(): void {
  if (!dialog) {
    dialogEl.classList.add("hidden");
    return;
  }
  dialogEl.classList.remove("hidden");
  if (dialog.choice) {
    const c = dialog.choice;
    dialogEl.innerHTML = `<p>${dialog.lines[0]}</p><div class="opts">${c.out.options
      .map((o, k) => `<button data-opt="${k}" class="${k === c.sel ? "sel" : ""}">${k + 1}. ${o.label}</button>`)
      .join("")}</div>`;
    return;
  }
  const last = dialog.i === dialog.lines.length - 1;
  dialogEl.innerHTML = `${dialog.speaker ? `<b>${dialog.speaker}</b>` : ""}<p>${dialog.lines[dialog.i]}</p><i>${last && !dialog.then && !dialog.scripted ? "■" : "▶"}</i>`;
}

function advanceDialog(): void {
  if (!dialog) return;
  sfx("blip");
  if (dialog.i < dialog.lines.length - 1) {
    dialog.i++;
    return showDialog();
  }
  const next = dialog.then;
  const scripted = dialog.scripted;
  dialog = null;
  showDialog();
  if (scripted) stepScript();
  else if (next) runEvent(next);
}

// ------------------------------------------------------------------ scripted scenes

function playScene(id: string): void {
  const steps = SCENES[id];
  if (!steps) return runEvent({ type: "dialog", lines: ["..."] });
  script = { runner: startScene(steps), waitingDuel: false };
  stepScript();
}

function endScene(): void {
  script = null;
  dialog = null;
  showDialog();
  saveStory();
  save();
}

function stepScript(): void {
  if (!script) return;
  const before = story.money;
  const out = advance(script.runner, story);
  if (story.money > before) sfx("coin");
  saveStory();
  if (!out) return endScene();
  switch (out.t) {
    case "say":
      lastSaid = fill(out.text, story);
      dialog = { speaker: out.who, lines: [lastSaid], i: 0, scripted: true };
      return showDialog();
    case "choice":
      dialog = { speaker: undefined, lines: [lastSaid], i: 0, choice: { out, sel: 0 } };
      return showDialog();
    case "cut":
      return runCut(out.text);
    case "prompt":
      return runPrompt(out);
  }
}

function pickOption(k: number): void {
  if (!script || !dialog?.choice) return;
  const out = dialog.choice.out;
  dialog = null;
  showDialog();
  sfx("choose");
  choose(script.runner, out, k);
  stepScript();
}

function runCut(text?: string): void {
  const el = canvas.parentElement!.querySelector<HTMLElement>(".cut")!;
  el.textContent = text ?? "";
  el.classList.remove("hidden");
  setTimeout(() => {
    el.classList.add("hidden");
    fadeStart = performance.now();
    stepScript();
  }, 1300);
}

function runPrompt(out: Extract<Output, { t: "prompt" }>): void {
  if (out.kind === "teleport") {
    const [map, x, y, dir] = (out.arg ?? "").split(":");
    placeAt(map, Number(x), Number(y), dir as Dir);
    fadeStart = performance.now();
    titleUntil = fadeStart + 2200;
    return stepScript();
  }
  if (out.kind === "duel") {
    if (script) script.waitingDuel = true;
    const err = hooks.prompt("duel", out.arg, () => {});
    if (err && script) {
      script.waitingDuel = false;
      story.flags.lastDuelWon = false;
      stepScript();
    }
    return;
  }
  hooks.prompt(out.kind, out.arg, () => stepScript());
}

/** A duel linked to a scene is over: record the result for the scene that resumes. */
export function sceneDuelResult(won: boolean): void {
  story.flags.lastDuelWon = won;
  saveStory();
}

function step(dir: Dir, now: number): void {
  const before = { x: state.x, y: state.y };
  const r = move(MAPS, state, dir);
  if (!r.moved) return;
  if (r.warped) {
    fadeStart = now;
    titleUntil = now + 2200;
    onArrive(now);
  } else anim = { fx: before.x, fy: before.y, start: now };
}

function onArrive(now: number): void {
  save();
  const npc = spotter(MAPS, state);
  if (npc) alert = { npc, until: now + 700 };
}

// ------------------------------------------------------------------ drawing

function frame(now: number): void {
  if (!mounted) return;
  if (anim && now - anim.start >= STEP_MS) {
    anim = null;
    onArrive(now);
  }
  if (alert && now >= alert.until) {
    const npc = alert.npc;
    alert = null;
    runEvent(challenge(npc));
  }
  if (!mounted) return; // an event (a duel starting...) may have left the world
  if (!busy() && held.length) step(held[held.length - 1], now);
  draw(now);
  if (mounted) raf = requestAnimationFrame(frame);
}

function draw(now: number): void {
  const m = MAPS[state.map];
  const w = width(m);
  const h = height(m);
  // visual position of the player (smooth walking)
  let px = state.x;
  let py = state.y;
  if (anim) {
    const t = Math.min(1, (now - anim.start) / STEP_MS);
    px = anim.fx + (state.x - anim.fx) * t;
    py = anim.fy + (state.y - anim.fy) * t;
  }
  const cam = (p: number, view: number, size: number) => (size <= view ? (size - view) / 2 : Math.max(0, Math.min(size - view, p + 0.5 - view / 2)));
  const cx = cam(px, VIEW_W, w);
  const cy = cam(py, VIEW_H, h);
  const sx = (x: number) => Math.round((x - cx) * TILE);
  const sy = (y: number) => Math.round((y - cy) * TILE);

  ctx.fillStyle = "#0d0b14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(TILE * 0.72)}px system-ui, "Segoe UI Emoji", sans-serif`;

  for (let y = Math.max(0, Math.floor(cy)); y < Math.min(h, Math.ceil(cy + VIEW_H)); y++) {
    for (let x = Math.max(0, Math.floor(cx)); x < Math.min(w, Math.ceil(cx + VIEW_W)); x++) {
      const t = TILES[m.rows[y][x]];
      ctx.fillStyle = t.color;
      ctx.fillRect(sx(x), sy(y), TILE, TILE);
      ctx.strokeStyle = "rgba(0,0,0,.08)";
      ctx.strokeRect(sx(x) + 0.5, sy(y) + 0.5, TILE - 1, TILE - 1);
      if (t.icon) ctx.fillText(t.icon, sx(x) + TILE / 2, sy(y) + TILE / 2 + 1);
    }
  }
  for (const n of visibleNpcs(m, story.flags)) {
    ctx.fillText(n.icon, sx(n.x) + TILE / 2, sy(n.y) + TILE / 2 + 1);
    if (alert?.npc === n) {
      ctx.fillStyle = "#ffd24a";
      ctx.font = `bold ${TILE * 0.8}px system-ui, sans-serif`;
      ctx.fillText("!", sx(n.x) + TILE / 2, sy(n.y) - 4);
      ctx.font = `${Math.round(TILE * 0.72)}px system-ui, "Segoe UI Emoji", sans-serif`;
    }
  }
  // player: emoji + a small arrow showing where they look
  const ox = sx(px);
  const oy = sy(py);
  ctx.fillText("🧑", ox + TILE / 2, oy + TILE / 2 + 1);
  const d = DIRS[state.dir];
  ctx.fillStyle = "#e8587a";
  ctx.beginPath();
  const ax = ox + TILE / 2 + d.dx * (TILE * 0.42);
  const ay = oy + TILE / 2 + d.dy * (TILE * 0.42);
  ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
  ctx.fill();

  const fade = 1 - Math.min(1, (now - fadeStart) / 260);
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const hud = `${story.objective ? `🎯 ${story.objective}` : ""}<span>${story.money}${H_EURO}</span>`;
  if (hud !== lastHud) {
    lastHud = hud;
    hudEl.innerHTML = hud;
  }
  titleEl.textContent = m.name;
  titleEl.classList.toggle("show", now < titleUntil);
}
