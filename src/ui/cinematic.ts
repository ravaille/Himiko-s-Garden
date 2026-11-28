/**
 * Intro cinematic (docs/design/13-intro-story.md, art standard in docs/design/14-art-standard.md).
 * Himiko vs the Demon -> world-championship arena -> the arena on a TV -> the camera pulls back into the living room, Mum speaks.
 * Native resolution 384x216, upscaled without smoothing. Pixel art is DRAWN BY CODE for now; a PNG dropped in public/art/<scene>.png
 * (384x216) replaces the drawn version of that scene. Pacing is manual: Enter / Space / click = next, Esc = skip everything.
 */

const W = 384;
const H = 216;

type Scene = "legend" | "arena" | "tv" | "room";
type Who = "narrator" | "commentator" | "Maman";
interface Beat {
  scene: Scene;
  who: Who;
  text: string;
  /** Beats of this kind end with the player's choice. */
  choice?: { label: string; reply?: string[] }[];
}

export const BEATS: Beat[] = [
  { scene: "legend", who: "narrator", text: "Autrefois, Himiko affrontait le Démon à coups de cartes." },
  { scene: "legend", who: "narrator", text: "Une légende. Un jeu. Puis le monde entier s'y est mis." },
  { scene: "arena", who: "narrator", text: "Aujourd'hui, chaque année, les meilleurs joueurs se retrouvent pour un seul titre." },
  { scene: "arena", who: "commentator", text: "ET C'EST AGLOOOOM ! POUR SON 3E TITRE !" },
  { scene: "tv", who: "commentator", text: "Dix titres dans une longue carrière… et le seul à en avoir trois consécutifs…" },
  { scene: "tv", who: "commentator", text: "Du jamais vu !" },
  { scene: "room", who: "Maman", text: "Hé ! Justement, je voulais te voir." },
  { scene: "room", who: "Maman", text: "Tu as sûrement remarqué le nouveau voisin ? Le vieil homme qui vient de s'installer dans la maison au bout du chemin." },
  { scene: "room", who: "Maman", text: "Il a l'air d'avoir pas mal de difficultés à s'installer. Il y a encore des cartons partout et quelques meubles à déplacer." },
  {
    scene: "room",
    who: "Maman",
    text: "Tu pourrais aller lui donner un coup de main ? Ça ne devrait pas te prendre bien longtemps.",
    choice: [
      { label: "Ok" },
      { label: "Pourquoi moi ?", reply: ["Parce que tu as beaucoup à apprendre d'un homme de cet âge ! Et puis, ça te fera sortir un peu."] },
    ],
  },
];

const ZOOM_MS = 2600;
const TYPE_MS = 30;

// ------------------------------------------------------------------ pixel toolkit
type C = CanvasRenderingContext2D;
const rect = (c: C, col: string, x: number, y: number, w = 1, h = 1) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
/** Filled rectangle with a 1px dark outline. */
const box = (c: C, x: number, y: number, w: number, h: number, fill: string, line = "#0a0612") => {
  rect(c, line, x - 1, y - 1, w + 2, h + 2);
  rect(c, fill, x, y, w, h);
};
/** Checkerboard dither of `col` over an area (cheap 2-tone shading). */
const dither = (c: C, col: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = col;
  for (let j = 0; j < h; j++) for (let i = (j & 1); i < w; i += 2) c.fillRect(x + i, y + j, 1, 1);
};
/** Vertical bands with dithered seams: a pixel-art gradient. */
const bands = (c: C, x: number, y: number, w: number, h: number, cols: string[]) => {
  const bh = h / cols.length;
  cols.forEach((col, i) => {
    rect(c, col, x, y + i * bh, w, Math.ceil(bh));
    if (i > 0) dither(c, col, x, Math.round(y + i * bh) - 2, w, 2);
  });
};
const disc = (c: C, col: string, cx: number, cy: number, r: number) => {
  c.fillStyle = col;
  for (let j = -r; j <= r; j++) {
    const half = Math.floor(Math.sqrt(r * r - j * j));
    c.fillRect(Math.round(cx - half), Math.round(cy + j), half * 2 + 1, 1);
  }
};
/** Deterministic pseudo-random in [0,1). */
const rnd = (n: number) => (((Math.sin(n * 127.1) * 43758.5453) % 1) + 1) % 1;

// ------------------------------------------------------------------ scenes
/** Shrine courtyard at night: Himiko (left) and the Demon (right), cards raised, a big moon between them. */
function legend(c: C, t: number): void {
  bands(c, 0, 0, W, 130, ["#120a2c", "#1b1040", "#2a1452", "#3d1a60", "#5a2468", "#7a2f6c"]);
  for (let i = 0; i < 70; i++) {
    const tw = Math.sin(t / 500 + i) > 0.2;
    rect(c, tw ? "#ffffff" : "#8a82c8", rnd(i) * W, rnd(i + 99) * 80, 1, 1);
  }
  // moon with craters and halo
  disc(c, "#3a2260", 192, 74, 54);
  disc(c, "#f4e8c8", 192, 74, 44);
  disc(c, "#f4e8c8", 189, 71, 41);
  for (const [dx, dy, r] of [[-14, -10, 8], [12, 8, 11], [-8, 20, 5], [20, -16, 4]] as const) {
    disc(c, "#d8c498", 192 + dx, 74 + dy, r);
    disc(c, "#ecdcb4", 191 + dx, 73 + dy, r - 2);
  }
  // far mountains and a pagoda silhouette
  for (let x = 0; x < W; x += 2) rect(c, "#2b1648", x, 112 - 18 * Math.abs(Math.sin(x / 47 + 1)) - 6 * Math.sin(x / 13), 2, 40);
  for (let k = 0; k < 4; k++) {
    rect(c, "#1a0d30", 296 - k * 4, 96 - k * 12, 40 + k * 8, 3);
    rect(c, "#1a0d30", 304 - k * 0, 99 - k * 12, 24, 9);
  }
  rect(c, "#1a0d30", 314, 48, 4, 12);
  // torii gate
  rect(c, "#a8203c", 40, 82, 6, 58);
  rect(c, "#a8203c", 100, 82, 6, 58);
  rect(c, "#d03a54", 30, 76, 86, 7);
  rect(c, "#8a1a30", 30, 83, 86, 2);
  rect(c, "#a8203c", 46, 90, 54, 4);
  // stone courtyard with perspective seams
  bands(c, 0, 138, W, 78, ["#2a2038", "#241a30", "#1e1628", "#18101f"]);
  rect(c, "#3a2e4c", 0, 137, W, 2);
  for (let i = -6; i < 16; i++) rect(c, "#14101c", 192 + i * 46, 140, 1, 76);
  for (let y = 146; y < 216; y += 16) rect(c, "#14101c", 0, y, W, 1);
  // lanterns (flicker)
  for (const x of [20, 364]) {
    rect(c, "#14101c", x - 1, 108, 3, 40);
    box(c, x - 7, 96, 15, 17, "#e8a43a");
    const f = 0.55 + 0.45 * Math.sin(t / 130 + x);
    c.fillStyle = `rgba(255,190,80,${0.1 * f})`;
    c.fillRect(x - 40, 70, 80, 90);
    rect(c, "#fff2b0", x - 3, 100, 7, 9);
  }
  himiko(c, 108, 207, t);
  demon(c, 276, 207, t);
  // clash of the two cards
  const s = 0.5 + 0.5 * Math.sin(t / 110);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + t / 500;
    rect(c, i % 2 ? "#ffd24a" : "#ffffff", 192 + Math.cos(a) * (14 + 12 * s), 118 + Math.sin(a) * (9 + 8 * s), 2, 2);
  }
}

/** Himiko: long dark hair, ribbon, pink kimono, a card held out. (x = centre, y = feet) */
function himiko(c: C, x: number, y: number, t: number): void {
  const sway = Math.round(Math.sin(t / 700));
  rect(c, "#0a0612", x - 15, y - 2, 30, 3); // shadow
  box(c, x - 11, y - 38, 22, 36, "#d9486c"); // kimono
  rect(c, "#b03056", x - 11, y - 20, 22, 18);
  dither(c, "#e8587a", x - 11, y - 38, 22, 12);
  rect(c, "#ffd24a", x - 11, y - 28, 22, 3); // obi
  rect(c, "#fff0f0", x - 3, y - 38, 6, 12); // collar
  box(c, x - 6, y - 54, 12, 13, "#f6d9c4"); // face
  rect(c, "#1a0f24", x - 6, y - 52, 12, 2);
  rect(c, "#2a2038", x + 1, y - 48, 2, 2); // eye
  box(c, x - 9, y - 58 + sway, 18, 8, "#1a0f24"); // hair top
  rect(c, "#1a0f24", x - 10, y - 52, 5, 34 + sway); // long hair
  rect(c, "#3a2c50", x - 9, y - 56 + sway, 5, 1);
  rect(c, "#ffd24a", x + 4, y - 62, 4, 4); // ornament
  rect(c, "#e8587a", x - 12, y - 56, 3, 3); // ribbon
  box(c, x + 10, y - 33, 20, 5, "#f6d9c4"); // arm
  box(c, x + 28, y - 44, 13, 19, "#ffffff"); // card
  rect(c, "#8a78d6", x + 30, y - 42, 9, 15);
  rect(c, "#ffd24a", x + 33, y - 37, 3, 5);
}

/** The Demon: horns, red skin, glowing eyes, dark cape. */
function demon(c: C, x: number, y: number, t: number): void {
  rect(c, "#0a0612", x - 20, y - 2, 40, 3);
  box(c, x - 16, y - 62, 32, 60, "#4a0f2c"); // cape / body
  rect(c, "#2e0a1c", x - 16, y - 34, 32, 32);
  dither(c, "#6a1838", x - 16, y - 62, 32, 20);
  box(c, x - 8, y - 78, 17, 17, "#b8283f"); // head
  rect(c, "#8a1a30", x - 8, y - 66, 17, 4);
  const glow = Math.sin(t / 200) > 0 ? "#ffe066" : "#ffb020";
  rect(c, glow, x - 6, y - 73, 4, 3);
  rect(c, glow, x + 2, y - 73, 4, 3);
  rect(c, "#1a0610", x - 4, y - 66, 9, 2); // mouth
  rect(c, "#fff", x - 3, y - 66, 1, 2);
  rect(c, "#fff", x + 2, y - 66, 1, 2);
  for (const d of [-1, 1]) { // horns
    box(c, x + d * 8 - 2, y - 88, 4, 12, "#efe6d4");
    box(c, x + d * 11 - 2, y - 92, 3, 6, "#efe6d4");
  }
  box(c, x - 40, y - 46, 26, 6, "#b8283f"); // arm
  box(c, x - 52, y - 58, 13, 19, "#ffffff"); // card
  rect(c, "#e03a3a", x - 50, y - 56, 9, 15);
  rect(c, "#ffd24a", x - 47, y - 51, 3, 5);
}

/** Championship arena: giant screen above, two players at the centre, crowd around, stage lights. */
function arena(c: C, t: number): void {
  rect(c, "#0b0916", 0, 0, W, H);
  bands(c, 0, 0, W, 100, ["#0b0916", "#120e26", "#1a1436"]);
  // light beams
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 64;
    const a = 0.1 + 0.07 * Math.sin(t / 500 + i * 1.3);
    c.fillStyle = `rgba(${i % 2 ? "255,120,190" : "255,220,110"},${a})`;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x - 46, 140);
    c.lineTo(x + 46, 140);
    c.closePath();
    c.fill();
  }
  // truss
  rect(c, "#2a2548", 0, 0, W, 5);
  for (let x = 0; x < W; x += 12) rect(c, "#3a3358", x, 5, 2, 4);
  // giant screen
  box(c, 106, 14, 172, 82, "#0e0c1c", "#3a3358");
  rect(c, "#1a1436", 110, 18, 164, 74);
  const ph = Math.floor(t / 600) % 2;
  box(c, 124, 30, 26, 50, "#d9486c"); // Himiko on the screen
  rect(c, "#f6d9c4", 132, 22, 10, 10);
  box(c, 234, 28, 28, 52, "#a8203c"); // Demon on the screen
  rect(c, "#efe6d4", 237, 20, 3, 8);
  rect(c, "#efe6d4", 256, 20, 3, 8);
  rect(c, "#ffd24a", 168, 36, 48, 6);
  rect(c, "#ffffff", 172 + ph * 4, 38, 40 - ph * 8, 2);
  rect(c, "#8a78d6", 160, 60, 64, 4);
  rect(c, "#8a78d6", 160, 68, 40, 4);
  // stage
  box(c, 92, 120, 200, 10, "#3a3358");
  rect(c, "#1d1936", 92, 130, 200, 8);
  dither(c, "#2a2548", 92, 130, 200, 8);
  box(c, 150, 108, 84, 8, "#8a78d6"); // table
  rect(c, "#5a4aa0", 150, 116, 84, 3);
  box(c, 132, 82, 12, 28, "#e8587a"); // players
  rect(c, "#f6d9c4", 133, 74, 10, 9);
  rect(c, "#1a0f24", 133, 73, 10, 3);
  box(c, 240, 82, 12, 28, "#5a8ad6");
  rect(c, "#f6d9c4", 241, 74, 10, 9);
  rect(c, "#2a2038", 241, 73, 10, 3);
  // crowd rows, bobbing, with glow sticks
  for (let row = 0; row < 5; row++) {
    const y = 140 + row * 15;
    rect(c, row % 2 ? "#0f0c1e" : "#14102a", 0, y + 7, W, 9);
    for (let x = (row * 5) % 11; x < W; x += 11) {
      const bob = Math.sin(t / 260 + x * 0.6 + row) > 0.45 ? -2 : 0;
      const k = rnd(x * 13 + row * 7);
      rect(c, "#0a0612", x - 1, y + bob - 1, 10, 12);
      rect(c, k > 0.66 ? "#4a3a6a" : k > 0.33 ? "#3a2f58" : "#5a4472", x, y + 4 + bob, 8, 8);
      rect(c, k > 0.5 ? "#c89a78" : "#e8c8a8", x + 1, y + bob, 6, 5);
      if (rnd(x + row * 31) > 0.86) {
        rect(c, rnd(x) > 0.5 ? "#ffd24a" : "#ff7ab8", x + 7, y - 7 + bob, 2, 8);
      }
    }
  }
  c.fillStyle = "rgba(255,255,255,.04)";
  c.fillRect(0, 0, W, H);
}

// The arena is drawn once per frame on a separate canvas so the TV can show it.
const arenaCanvas = document.createElement("canvas");
arenaCanvas.width = W;
arenaCanvas.height = H;
const arenaCtx = arenaCanvas.getContext("2d")!;

/** The living room: a TV showing the arena, a sofa with the player from behind, Mum standing at the right. `p` = camera pull-back 0..1. */
const TV = { x: 128, y: 62, w: 128, h: 72 };
function room(c: C, t: number, p: number): void {
  arena(arenaCtx, t);
  const s = 3 - 2 * p; // from "screen fills the view" (x3) to the whole room (x1)
  const cx = TV.x + TV.w / 2;
  const cy = TV.y + TV.h / 2;
  const k = 1 - p;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  rect(c, "#100c1c", 0, 0, W, H);
  c.translate(k * (W / 2 - s * cx) + (1 - k) * 0, k * (H / 2 - s * cy));
  c.scale(s, s);
  // wall and floor
  bands(c, 0, 0, W, 150, ["#2a2040", "#2e2446", "#322849", "#372c4e"]);
  for (let x = 0; x < W; x += 24) rect(c, "#261c3a", x, 0, 1, 150); // wallpaper stripes
  rect(c, "#1a1228", 0, 148, W, 3);
  bands(c, 0, 151, W, 65, ["#3a2a2e", "#33252a", "#2c1f26"]);
  for (let x = 0; x < W; x += 32) rect(c, "#241820", x, 151, 1, 65);
  // window with moonlight
  box(c, 10, 40, 52, 62, "#1a1844", "#4a3e6a");
  rect(c, "#4a3e6a", 35, 40, 2, 62);
  rect(c, "#4a3e6a", 10, 70, 52, 2);
  disc(c, "#f4e8c8", 24, 56, 6);
  // framed card on the wall
  box(c, 300, 44, 22, 30, "#6a4a30", "#2a1a10");
  rect(c, "#d9486c", 303, 47, 16, 24);
  rect(c, "#ffd24a", 308, 54, 6, 8);
  // TV set + stand
  box(c, TV.x - 8, TV.y - 8, TV.w + 16, TV.h + 16, "#241c3a", "#0a0612");
  box(c, 156, 142, 72, 8, "#4a3a2e", "#1a0f0a");
  rect(c, "#1a0f0a", 160, 150, 4, 10);
  rect(c, "#1a0f0a", 220, 150, 4, 10);
  c.imageSmoothingEnabled = false;
  c.drawImage(arenaCanvas, TV.x, TV.y, TV.w, TV.h);
  for (let y = TV.y; y < TV.y + TV.h; y += 2) {
    c.fillStyle = "rgba(0,0,0,.16)";
    c.fillRect(TV.x, y, TV.w, 1);
  }
  c.fillStyle = "rgba(190,180,255,.08)";
  c.fillRect(0, 0, W, 150); // TV glow
  // ticker under the picture: the champion's record comes from the TV
  c.font = "8px monospace";
  c.textBaseline = "middle";
  rect(c, "#d9486c", TV.x, TV.y + TV.h - 12, TV.w, 12);
  c.fillStyle = "#fff";
  const msg = "  AGLOM · 3 TITRES CONSÉCUTIFS · 10 TITRES AU PALMARÈS · ";
  const off = (t / 40) % (msg.length * 5);
  c.save();
  c.beginPath();
  c.rect(TV.x, TV.y + TV.h - 12, TV.w, 12);
  c.clip();
  c.fillText(msg + msg + msg, TV.x - off, TV.y + TV.h - 5);
  c.restore();
  // sofa with the player seen from behind (the protagonist, a hooded silhouette)
  box(c, 120, 164, 144, 36, "#5a2e44", "#1a0a12");
  box(c, 114, 158, 156, 20, "#6e3a54", "#1a0a12");
  dither(c, "#8a4a68", 114, 158, 156, 6);
  box(c, 176, 140, 32, 30, "#2a2a58", "#0a0a1c"); // body
  box(c, 182, 126, 20, 18, "#e8c8a8", "#0a0a1c"); // head
  rect(c, "#1a1030", 182, 126, 20, 8);
  // Mum: standing at the right, hair bun, apron
  box(c, 300, 106, 26, 50, "#c8704a", "#1a0a0a");
  rect(c, "#f2e6d0", 304, 122, 18, 32);
  box(c, 304, 88, 18, 18, "#f6d9c4", "#1a0a0a");
  rect(c, "#4a2a1a", 303, 86, 20, 6);
  box(c, 307, 80, 12, 8, "#4a2a1a", "#1a0a0a");
  rect(c, "#2a2038", 311, 97, 2, 2);
  rect(c, "#2a2038", 317, 97, 2, 2);
  rect(c, "#1a0a0a", 304, 156, 8, 12);
  rect(c, "#1a0a0a", 316, 156, 8, 12);
  c.restore();
}

const DRAW: Record<Exclude<Scene, "room">, (c: C, t: number) => void> = { legend, arena, tv: (c, t) => room(c, t, 0) };

// ------------------------------------------------------------------ optional hand-made art
const artCache: Partial<Record<Scene, HTMLImageElement | null>> = {};
function art(scene: Scene): HTMLImageElement | null {
  if (!(scene in artCache)) {
    artCache[scene] = null;
    const img = new Image();
    img.onload = () => (artCache[scene] = img);
    img.src = `${import.meta.env.BASE_URL}art/${scene}.png`;
  }
  return artCache[scene] ?? null;
}

// ------------------------------------------------------------------ player
/** Plays the cinematic inside `host`; calls `done` once (end or skip). Returns a function that stops it. */
export function playCinematic(host: HTMLElement, done: () => void): () => void {
  host.innerHTML = `<div class="cine">
    <canvas width="${W}" height="${H}"></canvas>
    <div class="cine-text"><b></b><p></p><i>▶</i></div>
    <div class="cine-choice hidden"></div>
    <button class="cine-skip" type="button">Tout passer ▸▸ <small>(Échap)</small></button>
    <div class="cine-hint">Entrée / clic : suite</div>
    <div class="cine-fade"></div>
  </div>`;
  const q = <T extends HTMLElement>(s: string) => host.querySelector<T>(s)!;
  const c = q<HTMLCanvasElement>("canvas").getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const who = q("b");
  const line = q(".cine-text p");
  const arrow = q(".cine-text i");
  const box_ = q(".cine-text");
  const fade = q(".cine-fade");
  const choiceEl = q(".cine-choice");

  let finished = false;
  let raf = 0;
  let i = 0;
  let text = BEATS[0].text;
  let speaker: Who = BEATS[0].who;
  let beatStart = 0;
  let scene: Scene = BEATS[0].scene;
  let sceneStart = 0;
  let zoomStart = 0;
  let choosing: Beat["choice"] | null = null;
  let afterReply = false;
  let ending = 0;

  const typedAll = (now: number) => now - beatStart >= text.length * TYPE_MS;

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey, true);
    done();
  };

  function setBeat(now: number): void {
    const b = BEATS[i];
    if (b.scene !== scene) {
      const fromTv = scene === "tv" && b.scene === "room";
      scene = b.scene;
      sceneStart = now;
      if (fromTv) zoomStart = now;
    }
    text = b.text;
    speaker = b.who;
    beatStart = fromZoomWait(now) ? now + ZOOM_MS : now;
  }
  /** The first line of the room waits for the camera to finish pulling back. */
  const fromZoomWait = (now: number) => scene === "room" && zoomStart === now;

  function next(now: number): void {
    if (choosing || ending) return;
    if (now < beatStart) return; // the camera is still moving
    if (!typedAll(now)) {
      beatStart = now - text.length * TYPE_MS - 1; // first press completes the line
      return;
    }
    if (afterReply) {
      ending = now;
      return;
    }
    const b = BEATS[i];
    if (b.choice) {
      choosing = b.choice;
      choiceEl.classList.remove("hidden");
      choiceEl.innerHTML = b.choice.map((o, k) => `<button data-k="${k}">${o.label}</button>`).join("");
      return;
    }
    i++;
    if (i >= BEATS.length) ending = now;
    else setBeat(now);
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation(); // Esc skips, it does not open the game menu
      finish();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      next(performance.now());
    }
  };
  window.addEventListener("keydown", onKey, true);
  q(".cine-skip").addEventListener("click", (e) => {
    e.stopPropagation();
    finish();
  });
  choiceEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const k = (e.target as HTMLElement).closest<HTMLElement>("[data-k]")?.dataset.k;
    if (k === undefined || !choosing) return;
    const reply = choosing[Number(k)].reply;
    choosing = null;
    choiceEl.classList.add("hidden");
    if (reply) {
      text = reply[0];
      beatStart = performance.now();
      afterReply = true;
    } else ending = performance.now();
  });
  q(".cine").addEventListener("click", () => next(performance.now()));

  function frame(now: number): void {
    if (finished) return;
    if (!beatStart) beatStart = sceneStart = now;
    const zooming = zoomStart > 0 && now - zoomStart < ZOOM_MS;
    const typed = Math.max(0, Math.min(text.length, Math.floor((now - beatStart) / TYPE_MS)));
    who.textContent = speaker === "narrator" ? "" : speaker === "commentator" ? "COMMENTATEUR" : speaker.toUpperCase();
    box_.classList.toggle("shout", speaker === "commentator");
    box_.style.display = zooming ? "none" : "";
    line.textContent = text.slice(0, typed);
    arrow.style.visibility = typed >= text.length && !choosing && !ending ? "visible" : "hidden";
    if (ending) {
      fade.style.opacity = String(Math.min(1, (now - ending) / 700));
      if (now - ending > 800) return finish();
    } else {
      // a short dip to black at each scene change, except the pull-back which is a camera move
      const dip = scene === "room" ? 0 : Math.max(0, 1 - (now - sceneStart) / 450);
      fade.style.opacity = String(dip);
    }
    const hand = art(scene);
    if (hand) c.drawImage(hand, 0, 0, W, H);
    else if (scene === "room") room(c, now, zooming ? 1 - Math.pow(1 - (now - zoomStart) / ZOOM_MS, 3) : zoomStart ? 1 : 0);
    else DRAW[scene](c, now);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return finish;
}
