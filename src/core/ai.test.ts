import { describe, expect, it } from "vitest";
import { playDuel, poseAI } from "./ai";
import { beginTurn, newGame } from "./engine";
import type { CardDef, GameState, Personality, Spell } from "./types";

const base = { attack: 0, personality: "none" as Personality };
const spell = (id: string, cost: number, s: Spell): CardDef => ({ id, name: id, cost, ...base, hp: 0, kind: "spell", spell: s });
const building = (id: string, cost: number, hp: number): CardDef => ({ id, name: id, cost, ...base, hp, kind: "building" });
const unitDef = (id: string, cost: number, attack: number, hp: number): CardDef => ({ id, name: id, cost, attack, hp, personality: "brave" });
const filler = Array.from({ length: 40 }, (_, i) => unitDef(`f${i}`, 9, 1, 1));

/** The AI plays as player 0 with a given hand and energy; the enemy board is filled by hand. */
function setup(hand: CardDef[], enemy: Record<number, CardDef> = {}, energy = 6): GameState {
  const s = newGame([filler, filler], 1);
  beginTurn(s);
  const p = s.players[0];
  p.hand = hand;
  p.offered = true; // no sacrifice in these scenarios
  p.maxEnergy = 6;
  p.energy = energy;
  for (const [slot, def] of Object.entries(enemy)) {
    s.players[1].board[+slot] = { uid: s.nextUid++, def, attack: def.attack, maxHp: def.hp, hp: def.hp, deployedOn: 1, lastAttackerUid: null };
  }
  return s;
}

describe("AI and spells", () => {
  it("kills a dangerous card with a targeted spell", () => {
    const exec = spell("exec", 3, { target: "enemyUnit", do: [{ kind: "destroy", to: "chosen" }] });
    const s = setup([exec], { 2: unitDef("boss", 6, 60, 80) });
    poseAI(s);
    expect(s.players[1].board[2]).toBeNull();
    expect(s.players[0].graveyard.map((c) => c.id)).toContain("exec");
  });

  it("picks the best target for a damage spell (the one it can kill)", () => {
    const bolt = spell("bolt", 2, { target: "enemyUnit", do: [{ kind: "damage", to: "chosen", amount: 20 }] });
    const s = setup([bolt], { 1: unitDef("small", 2, 10, 15), 4: unitDef("huge", 6, 50, 100) });
    poseAI(s);
    expect(s.players[1].board[1]).toBeNull();
    expect(s.players[1].board[4]!.hp).toBe(100);
  });

  it("does not cast a spell that only hurts itself", () => {
    const suicide = spell("suicide", 1, { do: [{ kind: "damage", to: "ownKing", amount: 40 }] });
    const s = setup([suicide]);
    poseAI(s);
    expect(s.players[0].kingHp).toBe(150);
    expect(s.players[0].hand).toHaveLength(1);
  });

  it("does not cast a spell with nothing to gain (damage with no enemy card)", () => {
    const zone = spell("zone", 3, { do: [{ kind: "damage", to: "enemies", amount: 10 }] });
    const s = setup([zone]);
    poseAI(s);
    expect(s.players[0].hand).toHaveLength(1);
  });

  it("casts an area spell when it hits several cards", () => {
    const zone = spell("zone", 3, { do: [{ kind: "damage", to: "enemies", amount: 12 }] });
    const s = setup([zone], { 1: unitDef("a", 2, 10, 10), 3: unitDef("b", 2, 10, 10), 5: unitDef("c", 2, 10, 10) });
    poseAI(s);
    expect([1, 3, 5].every((i) => s.players[1].board[i] === null)).toBe(true);
  });

  it("uses a card-draw spell when it has energy to spare", () => {
    const study = spell("study", 1, { do: [{ kind: "draw", count: 2 }] });
    const s = setup([study]);
    poseAI(s);
    expect(s.players[0].hand.length).toBe(2);
  });

  it("buffs its own card with an equipment", () => {
    const blade = spell("blade", 1, { target: "allyUnit", do: [{ kind: "buff", to: "chosen", attack: 20 }] });
    const s = setup([blade, unitDef("hero", 2, 20, 20)]);
    poseAI(s);
    const hero = s.players[0].board.find((u) => u?.def.id === "hero");
    expect(hero!.attack).toBe(40);
  });

  it("develops creatures before spending leftovers, and never exceeds its energy", () => {
    const study = spell("study", 1, { do: [{ kind: "draw", count: 2 }] });
    const s = setup([unitDef("big", 5, 50, 50), study], {}, 5);
    poseAI(s);
    expect(s.players[0].board.some((u) => u?.def.id === "big")).toBe(true);
    expect(s.players[0].energy).toBeGreaterThanOrEqual(0);
  });
});

describe("AI and buildings", () => {
  it("places a building with leftover energy, under one of its cards", () => {
    const tower = building("tower", 2, 20);
    const s = setup([unitDef("u", 2, 20, 20), tower], {}, 4);
    poseAI(s);
    const slot = s.players[0].buildings.findIndex((b) => b !== null);
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(s.players[0].board[slot]).not.toBeNull();
  });

  it("does not place two buildings on the same slot", () => {
    const s = setup([building("a", 1, 10), building("b", 1, 10), building("c", 1, 10)], {}, 6);
    poseAI(s);
    expect(s.players[0].buildings.filter(Boolean)).toHaveLength(3);
  });

  it("keeps its spells and buildings when it sacrifices for energy (sacrifices the weakest card)", () => {
    const s = newGame([filler, filler], 1);
    beginTurn(s);
    const p = s.players[0];
    p.hand = [spell("good", 3, { target: "enemyAny", do: [{ kind: "damage", to: "chosen", amount: 30 }] }), unitDef("weak", 1, 2, 2)];
    p.offered = false;
    p.maxEnergy = 1;
    p.energy = 1;
    poseAI(s);
    expect(p.graveyard.map((c) => c.id)).toContain("weak");
  });
});

describe("full duels with spells and buildings", () => {
  it("finish without errors with spell-and-building-heavy decks", () => {
    const zone = spell("zone", 3, { do: [{ kind: "damage", to: "enemies", amount: 10 }] });
    const bolt = spell("bolt", 2, { target: "enemyAny", do: [{ kind: "damage", to: "chosen", amount: 20 }] });
    const study = spell("study", 1, { do: [{ kind: "draw", count: 2 }] });
    const tower = building("tower", 2, 20);
    const deck = (): CardDef[] => {
      const cards: CardDef[] = [];
      for (let i = 0; i < 40; i++) cards.push([unitDef(`u${i}`, 1 + (i % 6), 10 + (i % 6) * 6, 10 + (i % 6) * 6), zone, bolt, study, tower][i % 5]);
      return cards;
    };
    for (let seed = 1; seed <= 50; seed++) {
      const r = playDuel(newGame([deck(), deck()], seed));
      expect(["0", "1", "draw"]).toContain(String(r.winner));
    }
  });
});
