import type { CardDef, Effect, Keywords, Personality, Race, Rank, Spell } from "../core/types";
import { TEST_POOL } from "./cards";

/**
 * Playable collection for deck-building tests (debug mode: everything is unlocked, docs/design/10-deckbuilding.md).
 * Built on the placeholder TEST_POOL (stats only) plus race/type tags, officers and Oni cards.
 * Generals use passive effects; the `fx-` cards use triggered effects, conditions and scaling.
 */

const TAGS: Record<string, { race: Race; types?: string[]; rank?: Rank }> = {
  "c1-recruit": { race: "human", types: ["samurai"] },
  "c1-scout": { race: "human", types: ["ninja"] },
  "c1-gatekeeper": { race: "human", types: ["guard"] },
  "c1-novice": { race: "human", types: ["student"] },
  "c2-samurai": { race: "human", types: ["samurai"] },
  "c2-ashigaru": { race: "human", types: ["samurai"] },
  "c2-avenger": { race: "human", types: ["ronin"] },
  "c2-kunoichi": { race: "human", types: ["ninja"] },
  "c3-oni": { race: "oni", types: ["shaman"] },
  "c3-temple": { race: "human", types: ["guard"], rank: "lieutenant" },
  "c3-companion": { race: "beast" },
  "c3-archer": { race: "human" },
  "c4-captain": { race: "human", types: ["samurai"] },
  "c4-ronin": { race: "human", types: ["ronin"] },
  "c4-tactician": { race: "human", types: ["tutor"], rank: "lieutenant" },
  "c4-sentinel": { race: "robot", types: ["guard"], rank: "lieutenant" },
  "c5-daimyo": { race: "human", types: ["daimyo"] },
  "c5-shadow": { race: "human", types: ["ninja"] },
  "c5-guardian": { race: "oni", types: ["guard"] },
  "c5-hunter": { race: "human", types: ["samurai"], rank: "lieutenant" },
  "c6-dragon": { race: "beast" },
  "c6-demon": { race: "demon", types: ["demon"] },
  "c6-tengu": { race: "henge" },
  "c6-colossus": { race: "robot" },
};

/** Keywords given to a few test cards so the engine can be tried in real duels. */
const KEYWORDS: Record<string, Keywords> = {
  "c1-scout": { haste: true },
  "c2-kunoichi": { haste: true },
  "c2-samurai": { bushido: true },
  "c3-oni": { multihit: 2 },
  "c4-ronin": { piercing: true },
  "c6-demon": { lifesteal: true },
  "c6-tengu": { regen: 10 },
  "c5-shadow": { haste: true },
};

function tagged(): CardDef[] {
  return TEST_POOL.map((c) => ({ ...c, ...TAGS[c.id], ...(KEYWORDS[c.id] ? { keywords: KEYWORDS[c.id] } : {}) }));
}

function oni(id: string, name: string, cost: number, share: number, personality: Personality, types: string[]): CardDef {
  const total = 20 * cost;
  const attack = Math.round(total * share);
  return { id: `oni-${id}`, name, cost, attack, hp: total - attack, personality, race: "oni", types };
}

const ONI_CARDS: CardDef[] = [
  oni("minor", "Petit oni", 1, 0.5, "brave", ["shaman"]),
  oni("scout", "Oni éclaireur", 1, 0.6, "assassin", ["samurai"]),
  oni("lancer", "Oni lancier", 2, 0.55, "brave", ["samurai"]),
  oni("drummer", "Oni tambour", 2, 0.4, "passive", ["shaman"]),
  oni("avenger", "Oni vengeur", 2, 0.5, "vengeful", ["samurai"]),
  oni("red", "Oni rouge", 3, 0.6, "berserk", ["samurai"]),
  oni("blue", "Oni bleu", 3, 0.35, "guardian", ["guard"]),
  oni("masked", "Oni masqué", 3, 0.6, "assassin", ["ninja"]),
  oni("archer", "Oni archer", 3, 0.55, "coward", ["samurai"]),
  oni("shaman", "Oni chaman", 4, 0.45, "strategist", ["shaman"]),
  oni("smith", "Oni forgeron", 4, 0.4, "defensive", ["guard"]),
  oni("elder", "Oni ancien", 5, 0.35, "guardian", ["guard"]),
  oni("warlord", "Seigneur de guerre oni", 5, 0.55, "brave", ["samurai"]),
  oni("giant", "Oni géant", 6, 0.5, "brave", ["samurai"]),
];

const DEMON_GENERALS: CardDef[] = [
  {
    id: "gen-asmodeus",
    name: "Asmodée, le vide",
    cost: 7,
    attack: 60,
    hp: 80,
    personality: "passive",
    rank: "general",
    race: "demon",
    types: ["demon"],
    text: "Actif dès qu'il est dans ton deck.",
    effects: [{ on: "drawFailed", zone: "deck", replaces: "fatigue", do: [{ kind: "win" }] }],
  },
  {
    id: "gen-belphegor",
    name: "Belphégor, la faim",
    cost: 7,
    attack: 60,
    hp: 80,
    personality: "passive",
    rank: "general",
    race: "demon",
    types: ["demon"],
    text: "Actif dès qu'il est dans ton deck.",
    effects: [{ on: "drawFailed", zone: "deck", replaces: "fatigue", do: [{ kind: "damage", to: "enemyKing", amount: 10 }] }],
  },
];

const PROFESSOR: CardDef = {
  id: "gen-professor",
  name: "Professeur Tanaka",
  cost: 7,
  attack: 30,
  hp: 90,
  personality: "passive",
  rank: "general",
  race: "human",
  types: ["tutor"],
  effects: [{ on: "turnStart", do: [{ kind: "freePlay", filter: { maxCost: 3 } }] }],
};

const GENERALS: CardDef[] = [
  {
    id: "gen-shuten",
    name: "Shuten, roi des oni",
    cost: 7,
    attack: 70,
    hp: 70,
    personality: "brave",
    rank: "general",
    race: "oni",
    types: ["samurai"],
    deckRule: { races: ["oni"] },
    text: "Deck 100 % Oni.",
    effects: [{ on: "passive", do: [{ kind: "aura", to: "allies", where: { race: "oni" }, attack: 20, hp: 10 }] }],
  },
  {
    id: "gen-shogun",
    name: "Shogun Ashikaga",
    cost: 7,
    attack: 60,
    hp: 80,
    personality: "defensive",
    rank: "general",
    race: "human",
    types: ["samurai", "daimyo"],
    effects: [
      { on: "passive", do: [{ kind: "grantType", to: "allies", type: "samurai" }, { kind: "grantType", to: "self", type: "oni" }, { kind: "grantType", to: "allies", type: "oni" }] },
      { on: "passive", do: [{ kind: "aura", to: "allies", where: { type: "samurai" }, attack: 5 }] },
      // Every card counts as [samurai] and [oni]: each one sends 10 % of the damage it takes back to its attacker.
      { on: "allyDamaged", subject: { type: "oni" }, do: [{ kind: "damage", to: "source", amount: { pct: 10, of: "eventDamage" } }] },
    ],
  },
];

const SPIRITS: CardDef[] = [
  { id: "yurei-wisp", name: "Feu follet", cost: 1, attack: 8, hp: 6, personality: "brave", race: "yurei", types: ["spectral"], keywords: { ghostly: true } },
  { id: "yurei-lantern", name: "Lanterne hantée", cost: 2, attack: 14, hp: 10, personality: "passive", race: "yurei", types: ["spectral"], keywords: { ghostly: true, regen: 10 } },
  { id: "yurei-widow", name: "Veuve spectrale", cost: 3, attack: 24, hp: 16, personality: "assassin", race: "yurei", types: ["spectral"], keywords: { ghostly: true } },
  { id: "beast-fox", name: "Renard à deux queues", cost: 2, attack: 24, hp: 16, personality: "brave", race: "beast", keywords: { multihit: 2 } },
];

/** Cards using the effects engine (stats are below the 20/energy budget: effects cost points). */
function fx(
  id: string,
  name: string,
  cost: number,
  attack: number,
  hp: number,
  personality: Personality,
  race: Race,
  effects: Effect[],
  extra: Partial<CardDef> = {},
): CardDef {
  return { id: `fx-${id}`, name, cost, attack, hp, personality, race, effects, ...extra };
}

const EFFECT_CARDS: CardDef[] = [
  fx("imp", "Imp", 1, 8, 8, "brave", "demon", [{ on: "death", do: [{ kind: "draw", count: 1 }] }], { types: ["demon"] }),
  fx("familiar", "Familier", 1, 6, 10, "passive", "demon", [{ on: "sacrifice", do: [{ kind: "buff", to: "self", attack: 10 }] }], { types: ["demon"] }),
  fx("scribe", "Scribe", 2, 10, 16, "passive", "human", [{ on: "play", do: [{ kind: "draw", count: 1 }] }], { types: ["student"] }),
  fx("priestess", "Prêtresse", 2, 12, 18, "brave", "human", [{ on: "play", do: [{ kind: "heal", to: "ownKing", amount: 20 }] }]),
  fx("monk", "Moine soigneur", 2, 8, 22, "passive", "human", [{ on: "turnStart", do: [{ kind: "heal", to: "allies", amount: 5 }] }]),
  fx("sprout", "Jeune pousse", 2, 12, 14, "brave", "beast", [{ on: "turnStart", do: [{ kind: "buff", to: "self", attack: 5, hp: 5 }] }]),
  fx("kamikaze", "Oni kamikaze", 2, 26, 8, "berserk", "oni", [{ on: "death", do: [{ kind: "damage", to: "enemies", amount: 10 }] }], { types: ["samurai"] }),
  fx("bomber", "Artificier", 3, 20, 24, "brave", "human", [{ on: "play", do: [{ kind: "damage", to: "facing", amount: 20 }] }], { types: ["ninja"] }),
  fx("watcher", "Veilleur", 3, 18, 28, "defensive", "human", [{ on: "allyDeath", do: [{ kind: "buff", to: "self", attack: 10 }] }], { types: ["samurai"] }),
  fx("thorn", "Oni épineux", 4, 18, 52, "guardian", "oni", [{ on: "damaged", do: [{ kind: "damage", to: "source", amount: 5 }] }], { types: ["guard"] }),
  fx("bloodblade", "Sabre vampirique", 4, 34, 36, "brave", "demon", [{ on: "attack", do: [{ kind: "heal", to: "ownKing", amount: 5 }] }], { types: ["vampire"] }),
  fx("warlord", "Seigneur démon", 6, 64, 46, "berserk", "demon", [{ on: "kingHit", do: [{ kind: "buff", to: "self", attack: 10 }] }], { types: ["demon"] }),
];

/** Token summoned by spells (never in the collection). */
export const SKELETON: CardDef = {
  id: "token-skeleton",
  name: "Squelette",
  cost: 0,
  attack: 10,
  hp: 10,
  personality: "brave",
  race: "demon",
  types: ["skeleton"],
  token: true,
};

function sp(id: string, name: string, cost: number, spell: Spell, extra: Partial<CardDef> = {}): CardDef {
  return { id: `sp-${id}`, name, cost, attack: 0, hp: 0, personality: "none", kind: "spell", spell, ...extra };
}

const SPELLS: CardDef[] = [
  sp("fireball", "Boule de feu", 2, { target: "enemyAny", do: [{ kind: "damage", to: "chosen", amount: 20 }] }, { types: ["mage"] }),
  sp("chain", "Éclair en chaîne", 3, { do: [{ kind: "damage", to: "enemies", amount: 10 }] }, { types: ["mage"] }),
  sp("study", "Étude", 1, { do: [{ kind: "draw", count: 2 }] }, { types: ["mage"] }),
  sp("blade", "Katana béni", 1, { target: "allyUnit", do: [{ kind: "buff", to: "chosen", attack: 10 }] }, { equipment: true }),
  sp("execution", "Exécution", 3, { target: "enemyUnit", do: [{ kind: "destroy", to: "chosen" }] }),
  sp("onsen", "Source chaude", 2, { do: [{ kind: "heal", to: "allies", amount: 15 }] }),
  sp("pact", "Pacte de sang", 1, { do: [{ kind: "damage", to: "ownKing", amount: 20 }, { kind: "summon", card: SKELETON, count: 2 }] }, { race: "demon" }),
];

function bld(id: string, name: string, cost: number, hp: number, effects: Effect[], extra: Partial<CardDef> = {}): CardDef {
  return { id: `bld-${id}`, name, cost, attack: 0, hp, personality: "none", kind: "building", effects, ...extra };
}

const BUILDINGS: CardDef[] = [
  bld("mage-tower", "Tour du mage", 2, 15, [{ on: "spell", do: [{ kind: "buff", to: "slotUnit", attack: 5 }] }], { types: ["mage"] }),
  bld("crypt", "Crypte", 3, 20, [{ on: "turnStart", do: [{ kind: "summon", card: SKELETON }] }], { race: "demon" }),
  bld("torii", "Torii", 2, 20, [{ on: "slotAttacked", do: [{ kind: "damage", to: "source", amount: 10 }] }]),
  bld("altar", "Autel", 2, 15, [{ on: "turnStart", do: [{ kind: "heal", to: "slotUnit", amount: 5 }] }]),
];

const DEMOLISHERS: CardDef[] = [
  fx("demolisher", "Démolisseur", 3, 24, 36, "demolisher", "human", [], { types: ["ronin"] }),
  sp("demolition", "Démolition", 2, { target: "enemyBuilding", do: [{ kind: "destroy", to: "chosen" }] }),
];

const SCALING: CardDef[] = [
  fx("ronin", "Ronin solitaire", 2, 14, 14, "vengeful", "human", [
    { on: "passive", if: [{ of: { of: "allyUnits" }, op: "<=", value: 3 }], do: [{ kind: "aura", to: "self", hp: 10 }] },
    { on: "passive", do: [{ kind: "aura", to: "self", attack: { per: 10, of: { of: "selfEquipment" } } }] },
  ], { types: ["ronin"] }),
  fx("student", "Élève", 3, 18, 24, "brave", "human", [{ on: "passive", do: [{ kind: "aura", to: "self", attack: { per: 10, of: { of: "allyUnits", filter: { type: "student" }, others: true } } }] }], { types: ["student"] }),
  fx("monitor", "Délégué", 2, 10, 16, "brave", "human", [{ on: "passive", do: [{ kind: "aura", to: "self", attack: { per: 5, of: { of: "allyUnits", filter: { type: "student" }, others: true } } }] }], { types: ["student"] }),
  fx("ghoul", "Goule", 2, 10, 14, "brave", "demon", [{ on: "passive", do: [{ kind: "aura", to: "self", attack: { per: 3, of: { of: "ownGraveyard" } } }] }], { types: ["ghoul"] }),
  fx("avenger-king", "Vengeur du Roi", 3, 20, 24, "brave", "human", [{ on: "passive", if: [{ of: { of: "ownKingPct" }, op: "<=", value: 50 }], do: [{ kind: "aura", to: "self", attack: 20 }] }]),
  fx("mirror", "Oni miroir", 3, 14, 44, "guardian", "oni", [{ on: "damaged", do: [{ kind: "damage", to: "source", amount: { pct: 25, of: "eventDamage" } }] }], { types: ["guard"] }),
];

const MAGES: CardDef[] = [
  fx("apprentice", "Apprentie mage", 1, 8, 12, "passive", "human", [{ on: "spell", do: [{ kind: "damage", to: "enemyKing", amount: 5 }] }], { types: ["mage"] }),
  fx("archmage", "Archimage", 4, 20, 60, "passive", "human", [{ on: "spell", do: [{ kind: "draw", count: 1 }] }], { types: ["mage"], rank: "lieutenant" }),
];

export const COLLECTION: CardDef[] = [...GENERALS, PROFESSOR, ...DEMON_GENERALS, ...tagged(), ...ONI_CARDS, ...SPIRITS, ...EFFECT_CARDS, ...MAGES, ...SPELLS, ...BUILDINGS, ...DEMOLISHERS, ...SCALING];

export function cardById(id: string): CardDef | undefined {
  return COLLECTION.find((c) => c.id === id);
}
