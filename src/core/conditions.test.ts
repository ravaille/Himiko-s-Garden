import { describe, expect, it } from "vitest";
import { refreshAuras } from "./effects";
import { actionPhase, beginTurn, newGame, playCard } from "./engine";
import type { CardDef, Effect, GameState, Personality } from "./types";

const unitDef = (id: string, attack: number, hp: number, effects: Effect[] = [], extra: Partial<CardDef> = {}, personality: Personality = "brave"): CardDef => ({
  id, name: id, cost: 1, attack, hp, personality, effects, ...extra,
});
const filler = Array.from({ length: 30 }, (_, i) => ({ id: `f${i}`, name: `f${i}`, cost: 1, attack: 1, hp: 1, personality: "brave" as const }));

function game(mine: Record<number, CardDef>, theirs: Record<number, CardDef> = {}): GameState {
  const s = newGame([filler, filler], 1);
  beginTurn(s);
  s.players[0].turnsPlayed = 5;
  s.players[0].energy = 10;
  const put = (side: 0 | 1, slot: number, def: CardDef) => {
    s.players[side].board[slot] = { uid: s.nextUid++, def, attack: def.attack, maxHp: def.hp, hp: def.hp, deployedOn: 1, lastAttackerUid: null };
  };
  for (const [slot, def] of Object.entries(mine)) put(0, +slot, def);
  for (const [slot, def] of Object.entries(theirs)) put(1, +slot, def);
  refreshAuras(s);
  return s;
}

describe("conditions", () => {
  const rage: Effect = { on: "kingHit", if: [{ of: { of: "ownKingPct" }, op: "<=", value: 50 }], do: [{ kind: "buff", to: "self", attack: 10 }] };
  it("an effect only fires while its conditions hold", () => {
    const s = game({ 3: unitDef("r", 5, 50, [rage]) }, { 3: unitDef("a", 1, 50, [], {}, "assassin") });
    s.current = 1;
    s.players[1].turnsPlayed = 5;
    actionPhase(s); // king 150 -> 149: above 50 %
    expect(s.players[0].board[3]!.attack).toBe(5);
    s.players[0].kingHp = 70; // 47 % after the next hit
    actionPhase(s);
    expect(s.players[0].board[3]!.attack).toBe(15);
  });
  it("all conditions are required; filters and comparisons work", () => {
    const e: Effect = {
      on: "play",
      if: [
        { of: { of: "allyUnits", filter: { type: "samurai" }, others: true }, op: ">=", value: 2 },
        { of: { of: "enemyUnits" }, op: "==", value: 0 },
      ],
      do: [{ kind: "damage", to: "enemyKing", amount: 10 }],
    };
    const sam = unitDef("sam", 1, 5, [], { types: ["samurai"] });
    const s = game({ 0: sam, 1: sam });
    s.players[0].hand = [unitDef("hero", 1, 5, [e], { types: ["samurai"] })];
    playCard(s, 0, 3);
    expect(s.players[1].kingHp).toBe(140);
    const t = game({ 0: sam });
    t.players[0].hand = [unitDef("hero", 1, 5, [e], { types: ["samurai"] })];
    playCard(t, 0, 3); // only one other samurai
    expect(t.players[1].kingHp).toBe(150);
  });
});

describe("scaling amounts", () => {
  it("damage = base + per x count", () => {
    const e: Effect = { on: "play", do: [{ kind: "damage", to: "enemyKing", amount: { base: 3, per: 2, of: { of: "allyUnits", others: true } } }] };
    const s = game({ 0: unitDef("a", 1, 5), 1: unitDef("b", 1, 5) });
    s.players[0].hand = [unitDef("boom", 1, 5, [e])];
    playCard(s, 0, 3);
    expect(s.players[1].kingHp).toBe(150 - 7);
  });
  it("counts the graveyard and the hand", () => {
    const e: Effect = { on: "turnStart", do: [{ kind: "buff", to: "self", attack: { per: 5, of: { of: "ownGraveyard" } } }] };
    const s = game({ 3: unitDef("ghoul", 1, 5, [e]) });
    s.players[0].graveyard = [filler[0], filler[1], filler[2]];
    beginTurn(s);
    expect(s.players[0].board[3]!.attack).toBe(16);
  });
  it("a percentage of the damage that triggered it (reflect)", () => {
    const thorns: Effect = { on: "damaged", do: [{ kind: "damage", to: "source", amount: { pct: 50, of: "eventDamage" } }] };
    const s = game({ 3: unitDef("a", 40, 100) }, { 3: unitDef("t", 1, 100, [thorns]) });
    actionPhase(s);
    expect(s.players[0].board[3]!.hp).toBe(80);
  });
  it("draw and energy accept amounts", () => {
    const e: Effect = { on: "play", do: [{ kind: "draw", count: { per: 1, of: { of: "enemyUnits" } } }, { kind: "energy", amount: { per: 2, of: { of: "enemyUnits" } } }] };
    const s = game({}, { 0: unitDef("x", 1, 5), 1: unitDef("y", 1, 5) });
    s.players[0].hand = [unitDef("scribe", 1, 5, [e])];
    s.players[0].energy = 5;
    const handBefore = s.players[0].hand.length;
    playCard(s, 0, 3);
    expect(s.players[0].hand.length).toBe(handBefore - 1 + 2);
    expect(s.players[0].energy).toBe(5 - 1 + 4);
  });
});

describe("passive auras", () => {
  const classmate: Effect = { on: "passive", do: [{ kind: "aura", to: "self", attack: { per: 10, of: { of: "allyUnits", filter: { type: "student" }, others: true } } }] };
  const student = (id: string) => unitDef(id, 20, 30, [classmate], { types: ["student"] });

  it("scales with the board, and follows it: more students, more attack; fewer, less", () => {
    const s = game({ 0: student("a"), 1: student("b") });
    expect(s.players[0].board[0]!.attack).toBe(30);
    s.players[0].hand = [student("c")];
    playCard(s, 0, 2);
    expect(s.players[0].board[0]!.attack).toBe(40); // refreshed after the placement chain
    expect(s.players[0].board[2]!.attack).toBe(40);
    s.players[0].board[1] = null;
    s.players[0].hand = [unitDef("filler", 1, 1)];
    playCard(s, 0, 4); // any event settles the board
    expect(s.players[0].board[0]!.attack).toBe(30);
  });
  it("is used by combat (the bonus is real damage)", () => {
    const s = game({ 0: student("a"), 1: student("b") }, { 0: unitDef("t", 1, 500) });
    actionPhase(s);
    expect(s.players[1].board[0]!.hp).toBe(500 - 30);
  });
  it("applies while its conditions hold and stops after", () => {
    const solo: Effect = { on: "passive", if: [{ of: { of: "allyUnits" }, op: "<=", value: 2 }], do: [{ kind: "aura", to: "self", attack: 15, hp: 10 }] };
    const s = game({ 0: unitDef("ronin", 10, 20, [solo]) });
    expect(s.players[0].board[0]).toMatchObject({ attack: 25, hp: 30, maxHp: 30 });
    s.players[0].hand = [unitDef("x", 1, 1), unitDef("y", 1, 1)];
    playCard(s, 0, 2);
    playCard(s, 0, 3);
    expect(s.players[0].board[0]).toMatchObject({ attack: 10, hp: 20, maxHp: 20 });
  });
  it("can buff other cards with a filter, and debuff enemies", () => {
    const banner: Effect = { on: "passive", do: [{ kind: "aura", to: "allies", where: { type: "samurai" }, attack: 5 }, { kind: "aura", to: "enemies", attack: -3 }] };
    const s = game({ 0: unitDef("flag", 1, 5, [banner]), 1: unitDef("sam", 10, 5, [], { types: ["samurai"] }), 2: unitDef("monk", 10, 5) }, { 0: unitDef("foe", 10, 5) });
    expect(s.players[0].board[1]!.attack).toBe(15);
    expect(s.players[0].board[2]!.attack).toBe(10);
    expect(s.players[1].board[0]!.attack).toBe(7);
  });
  it("grantType makes cards count as a type, for filters and counting", () => {
    const general: Effect = { on: "passive", do: [{ kind: "grantType", to: "allies", type: "samurai" }, { kind: "aura", to: "allies", where: { type: "samurai" }, attack: 5 }] };
    const s = game({ 0: unitDef("gen", 1, 5, [general]), 1: unitDef("peasant", 10, 5) });
    expect(s.players[0].board[1]!.auraTypes).toEqual(["samurai"]);
    expect(s.players[0].board[1]!.attack).toBe(15); // the type was granted before the filter ran
  });
  it("an aura disappears with its source", () => {
    const banner: Effect = { on: "passive", do: [{ kind: "aura", to: "allies", attack: 5, hp: 5 }] };
    const s = game({ 0: unitDef("flag", 1, 5, [banner]), 1: unitDef("a", 10, 10) });
    expect(s.players[0].board[1]).toMatchObject({ attack: 15, hp: 15, maxHp: 15 });
    s.players[0].board[0] = null;
    s.players[0].hand = [unitDef("x", 1, 1)];
    playCard(s, 0, 4);
    expect(s.players[0].board[1]).toMatchObject({ attack: 10, hp: 10, maxHp: 10 });
  });
});
