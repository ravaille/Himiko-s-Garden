import { describe, expect, it } from "vitest";
import { beginTurn, newGame, playCard, spellTargets, summonUnit } from "./engine";
import type { CardDef, Effect, GameState, Personality, Spell } from "./types";

const base = { attack: 0, hp: 0, personality: "none" as Personality };
const spell = (id: string, cost: number, s: Spell): CardDef => ({ id, name: id, cost, ...base, kind: "spell", spell: s });
const unitDef = (id: string, attack: number, hp: number, effects: Effect[] = []): CardDef => ({ id, name: id, cost: 1, attack, hp, personality: "brave", effects });
const filler = Array.from({ length: 30 }, (_, i) => ({ id: `f${i}`, name: `f${i}`, cost: 1, attack: 1, hp: 1, personality: "brave" as const }));

function game(hand: CardDef[], mine: Record<number, CardDef> = {}, theirs: Record<number, CardDef> = {}): GameState {
  const s = newGame([filler, filler], 1);
  beginTurn(s);
  s.players[0].energy = 10;
  s.players[0].hand = hand;
  const put = (side: 0 | 1, slot: number, def: CardDef) => {
    s.players[side].board[slot] = { uid: s.nextUid++, def, attack: def.attack, maxHp: def.hp, hp: def.hp, deployedOn: 1, lastAttackerUid: null };
  };
  for (const [slot, def] of Object.entries(mine)) put(0, +slot, def);
  for (const [slot, def] of Object.entries(theirs)) put(1, +slot, def);
  return s;
}

const fireball = spell("fireball", 2, { target: "enemyAny", do: [{ kind: "damage", to: "chosen", amount: 20 }] });

describe("targeted spells", () => {
  it("hits the chosen enemy card, costs energy, and goes to the graveyard", () => {
    const s = game([fireball], {}, { 2: unitDef("t", 1, 50) });
    playCard(s, 0, 0, { kind: "unit", side: 1, slot: 2 });
    expect(s.players[1].board[2]!.hp).toBe(30);
    expect(s.players[0].energy).toBe(8);
    expect(s.players[0].graveyard.map((c) => c.id)).toEqual(["fireball"]);
    expect(s.players[0].hand).toHaveLength(0);
  });
  it("can hit the enemy king", () => {
    const s = game([fireball]);
    playCard(s, 0, 0, { kind: "king", side: 1 });
    expect(s.players[1].kingHp).toBe(130);
  });
  it("refuses an invalid target without consuming the card or the energy", () => {
    const s = game([fireball], { 1: unitDef("mine", 1, 10) }, { 2: unitDef("t", 1, 50) });
    expect(() => playCard(s, 0, 0, { kind: "unit", side: 0, slot: 1 })).toThrow("Invalid target");
    expect(() => playCard(s, 0, 0)).toThrow("Invalid target");
    expect(() => playCard(s, 0, 0, { kind: "unit", side: 1, slot: 5 })).toThrow("Invalid target");
    expect(s.players[0].hand).toHaveLength(1);
    expect(s.players[0].energy).toBe(10);
  });
  it("refuses a spell the player cannot pay", () => {
    const s = game([fireball]);
    s.players[0].energy = 1;
    expect(() => playCard(s, 0, 0, { kind: "king", side: 1 })).toThrow("Not enough energy");
  });
  it("can target ghostly cards, unlike card effects", () => {
    const ghost: CardDef = { ...unitDef("g", 1, 50), keywords: { ghostly: true } };
    const s = game([fireball], {}, { 2: ghost });
    expect(spellTargets(s, 0, fireball)).toContainEqual({ kind: "unit", side: 1, slot: 2 });
    playCard(s, 0, 0, { kind: "unit", side: 1, slot: 2 });
    expect(s.players[1].board[2]!.hp).toBe(30);
  });
  it("execution destroys a card outright; equipment stacks permanent buffs", () => {
    const exec = spell("exec", 3, { target: "enemyUnit", do: [{ kind: "destroy", to: "chosen" }] });
    const blade = spell("blade", 1, { target: "allyUnit", do: [{ kind: "buff", to: "chosen", attack: 10 }] });
    const s = game([exec, blade, blade], { 3: unitDef("hero", 10, 10) }, { 2: unitDef("boss", 99, 9999) });
    playCard(s, 0, 0, { kind: "unit", side: 1, slot: 2 });
    expect(s.players[1].board[2]).toBeNull();
    playCard(s, 0, 0, { kind: "unit", side: 0, slot: 3 });
    playCard(s, 0, 0, { kind: "unit", side: 0, slot: 3 });
    expect(s.players[0].board[3]!.attack).toBe(30);
  });
});

describe("untargeted spells", () => {
  it("need no target: any slot argument works", () => {
    const study = spell("study", 1, { do: [{ kind: "draw", count: 2 }] });
    const s = game([study]);
    playCard(s, 0, 6);
    expect(s.players[0].hand).toHaveLength(2);
  });
  it("area spells hit all enemy cards", () => {
    const chain = spell("chain", 3, { do: [{ kind: "damage", to: "enemies", amount: 10 }] });
    const s = game([chain], {}, { 1: unitDef("a", 1, 30), 5: unitDef("b", 1, 30) });
    playCard(s, 0, 0);
    expect(s.players[1].board[1]!.hp).toBe(20);
    expect(s.players[1].board[5]!.hp).toBe(20);
  });
});

describe("spell triggers", () => {
  const zap: Effect = { on: "spell", do: [{ kind: "damage", to: "enemyKing", amount: 5 }] };
  const watch: Effect = { on: "anySpell", do: [{ kind: "buff", to: "self", attack: 1 }] };
  it("'spell' reacts to its owner's spells only; 'anySpell' to every spell", () => {
    const study = spell("study", 1, { do: [{ kind: "draw", count: 1 }] });
    const s = game([study, study], { 0: unitDef("mage", 1, 5, [zap, watch]) }, { 0: unitDef("foe-mage", 1, 5, [zap, watch]) });
    playCard(s, 0, 0);
    expect(s.players[1].kingHp).toBe(150 - 5);
    expect(s.players[0].kingHp).toBe(150); // the opponent's mage did not react (own spells only)
    expect(s.players[0].board[0]!.attack).toBe(2);
    expect(s.players[1].board[0]!.attack).toBe(2);
  });
});

describe("summon (tokens)", () => {
  const token: CardDef = { ...unitDef("skeleton", 10, 10), token: true };
  it("fills free slots centre first, and silently fails when the side is full", () => {
    const pact = spell("pact", 1, { do: [{ kind: "damage", to: "ownKing", amount: 20 }, { kind: "summon", card: token, count: 2 }] });
    const s = game([pact]);
    playCard(s, 0, 0);
    expect(s.players[0].kingHp).toBe(130);
    expect(s.players[0].board[3]!.def.id).toBe("skeleton");
    expect(s.players[0].board[2]!.def.id).toBe("skeleton");
    for (let i = 0; i < 7; i++) s.players[0].board[i] ??= s.players[0].board[3];
    const before = s.players[0].graveyard.length;
    expect(summonUnit(s, 0, token)).toBeNull();
    expect(s.players[0].graveyard.length).toBe(before); // a failed summon does not touch the graveyard
  });
  it("summoned cards wait one turn like any placed card", () => {
    const s = game([], {}, {});
    const u = summonUnit(s, 0, token)!;
    expect(u.deployedOn).toBe(s.players[0].turnsPlayed);
  });
});
