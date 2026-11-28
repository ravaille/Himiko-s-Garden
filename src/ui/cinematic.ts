/**
 * Intro cinematic (docs/design/13-intro-story.md): Himiko vs the Demon, then a world-championship arena, then the same arena on a TV.
 * Pixel art drawn by code on a small canvas (192x108) scaled up, until real art exists. Skippable (Esc / Space / button).
 * TEXTS ARE A PROVISIONAL DRAFT of the narrator; the commentator's line is Romain's.
 */

const W = 192;
const H = 108;

type Scene = "legend" | "arena" | "tv";
interface Beat {
  scene: Scene;
  who: "narrator" | "commentator";
  text: string;
}

export const BEATS: Beat[] = [
  { scene: "legend", who: "narrator", text: "Autrefois, Himiko affrontait le Démon à coups de cartes." },
  { scene: "legend", who: "narrator", text: "Une légende. Un jeu. Puis le monde entier s'y est mis." },
  { scene: "arena", who: "narrator", text: "Aujourd'hui, chaque année, les meilleurs joueurs se retrouvent pour un seul titre." },
  { scene: "arena", who: "commentator", text: "ET C'EST AGLOOOOM ! POUR SON 3E TITRE !" },
  { scene: "tv", who: "commentator", text: "Dix titres dans une longue carrière… et le seul à en avoir trois consécutifs…" },
  { scene: "tv", who: "commentator", text: "Du jamais vu !" },
];

// ------------------------------------------------------------------ pixel drawing
type C = CanvasRenderingContext2D;
const px = (c: C, col: string, x: number, y: number, w = 1, h = 1) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
/** Deterministic pseudo-random in [0,1) from an integer. */
const rnd = (n: number) => ((Math.sin(n * 127.1) * 43758.5453) % 1 + 1) % 1;

function stars(c: C, t: number): void {
  for (let i = 0; i < 40; i++) {
    const tw = 0.5 + 0.5 * Math.sin(t / 400 + i);
    px(c, tw > 0.6 ? "#ffffff" : "#8a82c8", rnd(i) * W, rnd(i + 99) * 50);
  }
}

/** Himiko (left, pink robe) facing the Demon (right, horns): silhouettes in front of a big moon. */
function legend(c: C, t: number): void {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a1038");
  g.addColorStop(1, "#4a1d4a");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  stars(c, t);
  c.fillStyle = "#f4e8c8"; // moon
  c.beginPath();
  c.arc(96, 42, 22, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#e0cfa4";
  for (const [dx, dy, r] of [[-8, -6, 5], [6, 4, 7], [-4, 10, 3]]) {
    c.beginPath();
    c.arc(96 + dx, 42 + dy, r, 0, Math.PI * 2);
    c.fill();
  }
  px(c, "#10081c", 0, 86, W, 22); // ground
  for (let x = 0; x < W; x += 4) px(c, "#1c0e2c", x, 84 + (rnd(x) > 0.5 ? 1 : 0), 4, 3);
  // Himiko
  px(c, "#e8587a", 30, 52, 14, 34); // robe
  px(c, "#c43c5e", 30, 70, 14, 16);
  px(c, "#f6d9c4", 34, 40, 7, 8); // face
  px(c, "#1a0f24", 32, 36, 11, 6); // hair
  px(c, "#1a0f24", 31, 40, 2, 20);
  px(c, "#ffd24a", 36, 33, 3, 3); // ornament
  px(c, "#f6d9c4", 44, 58, 12, 3); // arm holding a card
  px(c, "#ffffff", 56, 52, 7, 11);
  px(c, "#8a78d6", 57, 53, 5, 9);
  // Demon
  px(c, "#5a1030", 150, 46, 18, 40);
  px(c, "#3c0a20", 150, 66, 18, 20);
  px(c, "#a8203c", 154, 36, 10, 10); // head
  px(c, "#ffd24a", 156, 39, 2, 2);
  px(c, "#ffd24a", 161, 39, 2, 2);
  px(c, "#e8e0d0", 152, 28, 3, 9); // horns
  px(c, "#e8e0d0", 163, 28, 3, 9);
  px(c, "#a8203c", 134, 56, 16, 3); // arm
  px(c, "#ffffff", 128, 50, 7, 11);
  px(c, "#e03a3a", 129, 51, 5, 9);
  // clash between the two cards
  const s = 0.5 + 0.5 * Math.sin(t / 120);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + t / 600;
    px(c, i % 2 ? "#ffd24a" : "#ffffff", 96 + Math.cos(a) * (10 + 8 * s), 58 + Math.sin(a) * (7 + 5 * s), 2, 2);
  }
}

/** World-championship arena: a big screen above, two players at the centre, crowd all around, stage lights. */
function arena(c: C, t: number): void {
  px(c, "#0c0a18", 0, 0, W, H);
  // lights
  for (let i = 0; i < 5; i++) {
    const x = 20 + i * 38;
    const a = 0.12 + 0.08 * Math.sin(t / 500 + i);
    c.fillStyle = `rgba(255,${i % 2 ? 120 : 210},${i % 2 ? 180 : 90},${a})`;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x - 24, 70);
    c.lineTo(x + 24, 70);
    c.closePath();
    c.fill();
  }
  // giant screen
  px(c, "#2a2548", 54, 6, 84, 38);
  px(c, "#0e0c1c", 56, 8, 80, 34);
  px(c, "#e8587a", 62, 14, 10, 24); // the two generals on the screen
  px(c, "#a8203c", 120, 14, 10, 24);
  const f = (Math.floor(t / 300) % 2) * 2;
  px(c, "#ffd24a", 94 + f, 22, 4, 4);
  px(c, "#ffffff", 90, 30, 12, 2);
  // stage + table + players
  px(c, "#3a3358", 58, 66, 76, 5);
  px(c, "#1d1936", 58, 71, 76, 4);
  px(c, "#8a78d6", 78, 62, 36, 4); // table
  px(c, "#e8587a", 70, 54, 6, 12);
  px(c, "#f6d9c4", 71, 50, 4, 4);
  px(c, "#5a8ad6", 116, 54, 6, 12);
  px(c, "#f6d9c4", 117, 50, 4, 4);
  // crowd (rows of heads, bobbing)
  for (let row = 0; row < 4; row++) {
    const y = 78 + row * 8;
    px(c, "#14102a", 0, y + 5, W, 4);
    for (let x = row * 3; x < W; x += 7) {
      const bob = Math.sin(t / 250 + x * 0.7 + row) > 0.5 ? -1 : 0;
      const hue = rnd(x * 13 + row * 7);
      px(c, hue > 0.66 ? "#4a3a6a" : hue > 0.33 ? "#3a2f58" : "#5a4472", x, y + bob, 5, 6);
      if (rnd(x + row * 31) > 0.9) px(c, "#ffd24a", x + 1, y - 3 + bob, 1, 3); // a raised glow stick
    }
  }
}

/** The arena seen on a TV set in a dark room. */
function tv(c: C, t: number): void {
  px(c, "#120e1e", 0, 0, W, H);
  px(c, "#1c1630", 0, 82, W, 26); // floor
  px(c, "#2a2140", 30, 14, 132, 72); // TV body
  px(c, "#0a0812", 38, 20, 116, 58);
  c.save();
  c.beginPath();
  c.rect(38, 20, 116, 58);
  c.clip();
  c.translate(38, 20);
  c.scale(116 / W, 58 / H);
  arena(c, t);
  c.restore();
  for (let y = 20; y < 78; y += 2) px(c, "rgba(0,0,0,.18)", 38, y, 116, 1); // scanlines (rgba via fillStyle string works)
  px(c, "#3a3358", 80, 86, 32, 4);
  c.fillStyle = "rgba(180,170,255,.07)"; // glow on the room
  c.fillRect(0, 0, W, H);
}

const DRAW: Record<Scene, (c: C, t: number) => void> = { legend, arena, tv };

// ------------------------------------------------------------------ player
/** Plays the cinematic inside `host`; calls `done` once (end or skip). Returns a function that stops it. */
export function playCinematic(host: HTMLElement, done: () => void): () => void {
  host.innerHTML = `<div class="cine">
    <canvas width="${W}" height="${H}"></canvas>
    <div class="cine-text"><b></b><p></p></div>
    <button class="cine-skip" type="button">Passer ▸▸ <small>(Échap / Espace)</small></button>
    <div class="cine-fade"></div>
  </div>`;
  const canvas = host.querySelector("canvas")!;
  const c = canvas.getContext("2d")!;
  const who = host.querySelector<HTMLElement>(".cine-text b")!;
  const line = host.querySelector<HTMLElement>(".cine-text p")!;
  const box = host.querySelector<HTMLElement>(".cine-text")!;
  const fade = host.querySelector<HTMLElement>(".cine-fade")!;

  let finished = false;
  let raf = 0;
  let i = 0;
  let beatStart = 0;
  let scene: Scene = BEATS[0].scene;
  let sceneStart = 0;
  let ending = 0;

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey, true);
    done();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation(); // Esc must skip, not open the game menu
      finish();
    } else if (e.key === "Enter") {
      e.preventDefault();
      next(performance.now());
    }
  };
  window.addEventListener("keydown", onKey, true);
  host.querySelector(".cine-skip")!.addEventListener("click", finish);
  host.querySelector(".cine")!.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest(".cine-skip")) next(performance.now());
  });

  const typed = (b: Beat, now: number) => Math.min(b.text.length, Math.floor((now - beatStart) / 32));
  const hold = (b: Beat) => b.text.length * 32 + 1600;

  function next(now: number): void {
    const b = BEATS[i];
    if (now - beatStart < b.text.length * 32) {
      beatStart = now - b.text.length * 32 - 1; // first click finishes the typing
      return;
    }
    i++;
    beatStart = now;
    if (i >= BEATS.length) ending = now;
    else if (BEATS[i].scene !== scene) {
      scene = BEATS[i].scene;
      sceneStart = now;
    }
  }

  function frame(now: number): void {
    if (finished) return;
    if (!beatStart) beatStart = sceneStart = now;
    if (ending) {
      fade.style.opacity = String(Math.min(1, (now - ending) / 900));
      box.style.opacity = String(1 - Math.min(1, (now - ending) / 400));
      if (now - ending > 1100) return finish();
    } else {
      const b = BEATS[i];
      who.textContent = b.who === "narrator" ? "" : "COMMENTATEUR";
      box.classList.toggle("shout", b.who === "commentator");
      line.textContent = b.text.slice(0, typed(b, now));
      if (now - beatStart > hold(b)) next(now);
      // a short black dip at each scene change
      const dip = Math.max(0, 1 - (now - sceneStart) / 500);
      fade.style.opacity = String(i === 0 && sceneStart === beatStart ? Math.max(dip, 0) : dip);
    }
    DRAW[scene](c, now);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return finish;
}
