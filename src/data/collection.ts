import type { CardDef, Personality, Race, Rank } from "../core/types";
import { TEST_POOL } from "./cards";

/**
 * Playable collection for deck-building tests (debug mode: everything is unlocked, docs/design/10-deckbuilding.md).
 * Built on the placeholder TEST_POOL (stats only) plus race/type tags, officers and Oni cards.
 * Effects are NOT implemented yet: texts that mention them are marked "(effet à venir)".
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

function tagged(): CardDef[] {
  return TEST_POOL.map((c) => ({ ...c, ...TAGS[c.id] }));
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
    text: "Deck 100 % Oni. Oni +20⚔/+10♥ (effet à venir).",
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
    text: "Aucune contrainte de deck (effet à venir).",
  },
];

export const COLLECTION: CardDef[] = [...GENERALS, ...tagged(), ...ONI_CARDS];

export function cardById(id: string): CardDef | undefined {
  return COLLECTION.find((c) => c.id === id);
}
