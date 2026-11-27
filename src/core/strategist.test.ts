import { describe, expect, it } from "vitest";
import { actionPhase, beginTurn, giveOrder, newGame, orderTargets } from "./engine";
import type { Building, CardDef, GameState, Keywords, Personality } from "./types";

const unitDef = (id: string, attack: number, hp: number, personality: Personality = "brave", keywords: Keywords = {}): CardDef => ({
  id, name: id, cost: 1, attack, hp, personality, keywords,
});
const bldDef = (id: string, hp: number): CardDef => ({ id, name: id, cost: 1, attack: 0, hp, personality: "none", kind: "building" });
const filler = Array.from({ length: 30 }, (_, i) => ({ id: `f${i}`, name: `f${i}`, cost: 1, attack: 1, hp: 1, personality: "brave" as const }));

function game(mine: Record<number, CardDef>, theirs: Record<number, CardDef>, theirBuildings: Record<number, CardDef> = {}): GameState {
  const s = newGame([filler, filler], 1);
  beginTurn(s);
  s.players[0].turnsPlayed = 5;
  const put = (side: 0 | 1, slot: number, def: CardDef) => {
    s.players[side].board[slot] = { uid: s.nextUid++, def, attack: def.attack, maxHp: def.hp, hp: def.hp, deployedOn: 1, lastAttackerUid: null };
  };
  for (const [slot, def] of Object.entries(mine)) put(0, +slot, def);
  for (const [slot, def] of Object.entries(theirs)) put(1, +slot, def);
  for (const [slot, def] of Object.entries(theirBuildings)) {
    const b: Building = { uid: s.nextUid++, def, hp: def.hp, maxHp: def.hp };
    s.players[1].buildings[+slot] = b;
  }
  return s;
}

describe("Strategist orders", () => {
  it("attacks the ordered card, not the strongest one", () => {
    const s = game({ 3: unitDef("strat", 10, 50, "strategist") }, { 3: unitDef("big", 1, 100), 1: unitDef("small", 1, 20) });
    giveOrder(s, 3, { kind: "unit", side: 1, slot: 1 });
    actionPhase(s);
    expect(s.players[1].board[1]!.hp).toBe(10);
    expect(s.players[1].board[3]!.hp).toBe(100);
  });
  it("can be ordered at the king or at a building", () => {
    const s = game({ 3: unitDef("strat", 10, 50, "strategist") }, { 3: unitDef("big", 1, 100) }, { 5: bldDef("b", 30) });
    giveOrder(s, 3, { kind: "king", side: 1 });
    actionPhase(s);
    expect(s.players[1].kingHp).toBe(140);
    giveOrder(s, 3, { kind: "building", side: 1, slot: 5 });
    actionPhase(s);
    expect(s.players[1].buildings[5]!.hp).toBe(20);
  });
  it("keeps the order across turns, and fights as a Brave once the target is gone", () => {
    const s = game({ 3: unitDef("strat", 10, 50, "strategist") }, { 3: unitDef("big", 1, 100), 1: unitDef("small", 1, 15) });
    giveOrder(s, 3, { kind: "unit", side: 1, slot: 1 });
    actionPhase(s);
    expect(s.players[1].board[1]!.hp).toBe(5);
    actionPhase(s); // still follows the order
    expect(s.players[1].board[1]).toBeNull();
    actionPhase(s); // target dead: Brave behaviour, hits the strongest
    expect(s.players[1].board[3]!.hp).toBe(90);
    expect(s.players[0].board[3]!.order).toBeUndefined();
  });
  it("without any order it fights as a Brave", () => {
    const s = game({ 3: unitDef("strat", 10, 50, "strategist") }, { 3: unitDef("big", 1, 100), 1: unitDef("small", 1, 20) });
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(90);
  });
  it("a Guardian still deflects the ordered attack", () => {
    const s = game({ 3: unitDef("strat", 10, 50, "strategist") }, { 1: unitDef("small", 1, 20), 2: unitDef("guard", 1, 100, "guardian") });
    giveOrder(s, 3, { kind: "unit", side: 1, slot: 1 });
    actionPhase(s);
    expect(s.players[1].board[1]!.hp).toBe(20);
    expect(s.players[1].board[2]!.hp).toBe(90);
  });
  it("rejects bad orders: not a strategist, own cards, ghostly targets; null clears", () => {
    const s = game({ 3: unitDef("strat", 10, 50, "strategist"), 1: unitDef("brave", 1, 5) }, { 2: unitDef("ghost", 1, 5, "brave", { ghostly: true }), 4: unitDef("x", 1, 5) });
    expect(() => giveOrder(s, 1, { kind: "king", side: 1 })).toThrow("Not a strategist");
    expect(() => giveOrder(s, 3, { kind: "unit", side: 0, slot: 1 })).toThrow("Invalid target");
    expect(() => giveOrder(s, 3, { kind: "unit", side: 1, slot: 2 })).toThrow("Invalid target");
    giveOrder(s, 3, { kind: "unit", side: 1, slot: 4 });
    expect(s.players[0].board[3]!.order).toBeDefined();
    giveOrder(s, 3, null);
    expect(s.players[0].board[3]!.order).toBeUndefined();
  });
  it("lists every legal target: enemy cards (not ghostly), buildings, the king", () => {
    const s = game({ 3: unitDef("strat", 10, 50, "strategist") }, { 2: unitDef("ghost", 1, 5, "brave", { ghostly: true }), 4: unitDef("x", 1, 5) }, { 0: bldDef("b", 5) });
    const t = orderTargets(s, 0, s.players[0].board[3]!);
    expect(t).toEqual([
      { kind: "unit", side: 1, slot: 4 },
      { kind: "building", side: 1, slot: 0 },
      { kind: "king", side: 1 },
    ]);
  });
});
