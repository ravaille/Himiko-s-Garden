import { autoFill } from "../core/deckrules";
import { nextRandom } from "../core/rng";
import type { CardDef } from "../core/types";
import type { Dir, Maps, Npc, Warp, WorldMap, WorldState } from "../core/world";
import { COLLECTION, cardById } from "./collection";

/**
 * PLACEHOLDER WORLD: a hamlet, a house, a shop and a route, only to test walking, talking, warps and trainer duels.
 * Names, dialogues and layout are provisional: the real world, story and characters are being written by Romain
 * (docs/design/12-world-and-campaign.md).
 */

type Grid = string[][];
const grid = (w: number, h: number, fill: string): Grid => Array.from({ length: h }, () => Array<string>(w).fill(fill));
const rect = (g: Grid, x: number, y: number, w: number, h: number, ch: string) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = ch;
};
const put = (g: Grid, x: number, y: number, ch: string) => {
  g[y][x] = ch;
};
const border = (g: Grid, ch: string) => {
  const h = g.length;
  const w = g[0].length;
  rect(g, 0, 0, w, 1, ch);
  rect(g, 0, h - 1, w, 1, ch);
  rect(g, 0, 0, 1, h, ch);
  rect(g, w - 1, 0, 1, h, ch);
};
const rows = (g: Grid): string[] => g.map((r) => r.join(""));

const npc = (id: string, name: string, x: number, y: number, dir: Dir, kind: Npc["kind"], icon: string, lines: string[], extra: Partial<Npc> = {}): Npc => ({
  id, name, x, y, dir, kind, icon, lines, ...extra,
});

// ------------------------------------------------------------------ hamlet
function hamlet(): WorldMap {
  const g = grid(20, 14, ".");
  border(g, "T");
  rect(g, 10, 0, 2, 13, ","); // main road, north exit
  rect(g, 10, 12, 8, 1, ","); // lane to the end of the path
  rect(g, 1, 6, 18, 1, ","); // cross road
  rect(g, 2, 2, 4, 3, "H");
  put(g, 3, 4, "D");
  put(g, 3, 5, ",");
  rect(g, 14, 2, 4, 3, "H");
  put(g, 16, 4, "D");
  put(g, 16, 5, ",");
  rect(g, 3, 9, 4, 3, "~");
  for (const [x, y] of [[8, 9], [9, 10], [7, 12]]) put(g, x, y, "F");
  rect(g, 14, 8, 4, 3, "H"); // the new neighbour's house, at the end of the path
  put(g, 15, 10, "D");
  rect(g, 15, 11, 1, 1, ",");
  rect(g, 15, 12, 1, 1, ",");
  const warps: Warp[] = [
    { x: 10, y: 0, to: "route1", tx: 10, ty: 10, dir: "up" },
    { x: 11, y: 0, to: "route1", tx: 11, ty: 10, dir: "up" },
    { x: 3, y: 4, to: "home", tx: 4, ty: 5, dir: "up" },
    { x: 16, y: 4, to: "shop", tx: 3, ty: 4, dir: "up" },
    { x: 15, y: 10, to: "olga", tx: 4, ty: 5, dir: "up" },
  ];
  return {
    id: "hamlet",
    name: "Hameau (provisoire)",
    rows: rows(g),
    warps,
    npcs: [
      npc("sign-hamlet", "Panneau", 9, 2, "down", "sign", "🪧", ["Hameau (nom provisoire).", "Route 1 : vers le nord ↑"]),
      npc("villager", "Habitant", 6, 7, "right", "talk", "🧑‍🌾", ["Bienvenue ! Ce village est un décor provisoire.", "Le vrai monde arrivera quand l'histoire sera écrite."]),
      npc("vending", "Distributeur", 13, 8, "up", "vending", "🎰", ["Un distributeur de boosters."]),
      npc("olga-out", "Olga", 16, 11, "left", "script", "👴", [], { script: "olgaOutside", unless: "olgaMet" }),
      npc("box1", "Carton", 14, 11, "down", "sign", "📦", ["Un carton. Il est lourd."], { unless: "olgaMet" }),
      npc("box2", "Carton", 17, 11, "down", "sign", "📦", ["Encore un carton. Qu'est-ce qu'il y a dedans ?"], { unless: "olgaMet" }),
    ],
  };
}

function home(): WorldMap {
  const g = grid(9, 7, "#");
  rect(g, 1, 1, 7, 5, "f");
  rect(g, 3, 3, 3, 2, "c");
  put(g, 4, 6, "D");
  return {
    id: "home",
    name: "Maison (provisoire)",
    rows: rows(g),
    warps: [{ x: 4, y: 6, to: "hamlet", tx: 3, ty: 5, dir: "down" }],
    npcs: [
      npc("pc", "PC", 6, 1, "down", "pc", "💻", ["Tu allumes le PC : c'est ici que tu gères tes decks."]),
      npc("mom", "Maman", 2, 3, "right", "script", "👩", [], { script: "mom" }),
    ],
  };
}

function shop(): WorldMap {
  const g = grid(8, 6, "#");
  rect(g, 1, 1, 6, 4, "f");
  put(g, 3, 5, "D");
  return {
    id: "shop",
    name: "Boutique (provisoire)",
    rows: rows(g),
    warps: [{ x: 3, y: 5, to: "hamlet", tx: 16, ty: 5, dir: "down" }],
    npcs: [npc("shopkeeper", "Vendeur", 3, 2, "down", "shop", "🧑‍💼", ["Bienvenue ! La boutique ouvrira bientôt."])],
  };
}

function olga(): WorldMap {
  const g = grid(9, 7, "#");
  rect(g, 1, 1, 7, 5, "f");
  rect(g, 3, 3, 3, 2, "c");
  put(g, 4, 6, "D");
  return {
    id: "olga",
    name: "Chez Olga",
    rows: rows(g),
    warps: [{ x: 4, y: 6, to: "hamlet", tx: 15, ty: 11, dir: "down" }],
    npcs: [npc("olga-in", "Olga", 4, 3, "down", "script", "👴", [], { script: "olgaInside", when: "olgaMet" })],
  };
}

// ------------------------------------------------------------------ route 1
function route1(): WorldMap {
  const g = grid(20, 12, ".");
  border(g, "T");
  rect(g, 10, 1, 2, 11, ",");
  rect(g, 2, 2, 3, 3, "~");
  for (const [x, y] of [[6, 3], [7, 10], [14, 8], [16, 2], [3, 8], [13, 3]]) put(g, x, y, "F");
  return {
    id: "route1",
    name: "Route 1 (provisoire)",
    rows: rows(g),
    warps: [
      { x: 10, y: 11, to: "hamlet", tx: 10, ty: 1, dir: "down" },
      { x: 11, y: 11, to: "hamlet", tx: 11, ty: 1, dir: "down" },
    ],
    npcs: [
      npc("sign-route1", "Panneau", 9, 1, "down", "sign", "🪧", ["Route 1.", "La suite du chemin arrive bientôt."]),
      npc("hiker", "Randonneur", 6, 8, "right", "trainer", "🥾", ["Hé, toi ! On se bat ?"], { sight: 4, defeatedLines: ["Belle partie ! Je m'entraîne encore."] }),
      npc("student", "Étudiante", 16, 5, "left", "trainer", "🧑‍🎓", ["Je t'ai vu ! En garde !"], { sight: 5, defeatedLines: ["J'ai encore beaucoup à apprendre..."] }),
      npc("guard", "Garde", 9, 3, "right", "trainer", "💂", ["Halte ! Prouve ta valeur."], { sight: 2, defeatedLines: ["Tu peux passer."] }),
    ],
  };
}

export const MAPS: Maps = Object.fromEntries([hamlet(), home(), shop(), olga(), route1()].map((m) => [m.id, m]));

export const START: WorldState = { map: "hamlet", x: 10, y: 7, dir: "down", defeated: [] };

// ------------------------------------------------------------------ decks
/** The five cards in Olga's casket (placeholder: five times the same General until the real starter Generals are designed). */
export const STARTER_GENERALS = ["gen-shogun", "gen-shogun", "gen-shogun", "gen-shogun", "gen-shogun"];

/** The player's starting deck: the chosen General plus common cards that fit its rule, always the same for a given General. */
export function starterDeck(generalId: string): CardDef[] {
  const general = cardById(generalId);
  if (!general) return [];
  const holder = { rngState: 7919 };
  return autoFill([general], COLLECTION.filter((c) => !c.rank), () => nextRandom(holder));
}

/** A deck drawn once from the collection with a fixed seed: the same key always gives the same 40 cards (no officers). */
export function seededDeck(key: string): CardDef[] {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const holder = { rngState: h >>> 0 };
  return autoFill([], COLLECTION.filter((c) => !c.rank), () => nextRandom(holder));
}
