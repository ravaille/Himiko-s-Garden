import { describe, expect, it } from "vitest";
import { actionPhase, beginTurn, newGame, playCard } from "./engine";
import type { CardDef, GameState, Keywords, Personality } from "./types";

const card = (id: string, attack: number, hp: number, keywords: Keywords = {}, personality: Personality = "brave"): CardDef => ({
  id, name: id, cost: 1, attack, hp, personality, keywords,
});
const filler = Array.from({ length: 30 }, (_, i) => ({ id: `f${i}`, name: `f${i}`, cost: 1, attack: 1, hp: 1, personality: "brave" as const }));

/** Player 0 is active and past deployment; boards filled by hand. */
function setup(mine: Record<number, CardDef>, theirs: Record<number, CardDef>): GameState {
  const s = newGame([filler, filler], 1);
  beginTurn(s);
  s.players[0].turnsPlayed = 5;
  const put = (side: 0 | 1, slot: number, def: CardDef) => {
    s.players[side].board[slot] = { uid: s.nextUid++, def, attack: def.attack, maxHp: def.hp, hp: def.hp, deployedOn: 1, lastAttackerUid: null };
  };
  for (const [slot, def] of Object.entries(mine)) put(0, +slot, def);
  for (const [slot, def] of Object.entries(theirs)) put(1, +slot, def);
  return s;
}

describe("Haste", () => {
  it("acts the turn it is placed; others wait", () => {
    const s = newGame([filler, filler], 1);
    beginTurn(s);
    s.players[0].hand = [card("fast", 10, 10, { haste: true }), card("slow", 10, 10)];
    s.players[0].energy = 5;
    playCard(s, 0, 2);
    playCard(s, 0, 4);
    actionPhase(s);
    expect(s.players[1].kingHp).toBe(150 - 10);
  });
});

describe("Ghostly", () => {
  it("cannot be targeted by normal attackers, who go for the next target or the king", () => {
    const s = setup({ 3: card("a", 10, 10) }, { 3: card("ghost", 1, 5, { ghostly: true }) });
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(5);
    expect(s.players[1].kingHp).toBe(140);
  });
  it("can be targeted by another ghostly card", () => {
    const s = setup({ 3: card("g1", 10, 10, { ghostly: true }) }, { 3: card("g2", 1, 5, { ghostly: true }) });
    actionPhase(s);
    expect(s.players[1].board[3]).toBeNull();
  });
});

describe("Multihit", () => {
  it("strikes the same target twice", () => {
    const s = setup({ 3: card("a", 10, 100, { multihit: 2 }) }, { 3: card("t", 1, 100) });
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(80);
  });
  it("sends the second blow to the next target when the first dies, then to the king", () => {
    const s = setup({ 3: card("a", 10, 100, { multihit: 2 }, "none") }, { 3: card("t1", 1, 5), 2: card("t2", 1, 100) });
    actionPhase(s);
    expect(s.players[1].board[3]).toBeNull();
    expect(s.players[1].board[2]!.hp).toBe(90);
    const s2 = setup({ 3: card("a", 10, 100, { multihit: 2 }) }, { 3: card("t1", 1, 5) });
    actionPhase(s2);
    expect(s2.players[1].kingHp).toBe(140);
  });
});

describe("Piercing", () => {
  it("carries excess damage to the next card, then the king", () => {
    const s = setup({ 3: card("a", 30, 100, { piercing: true }, "none") }, { 3: card("t1", 1, 10), 2: card("t2", 1, 100) });
    actionPhase(s);
    expect(s.players[1].board[3]).toBeNull();
    expect(s.players[1].board[2]!.hp).toBe(80);
    const s2 = setup({ 3: card("a", 30, 100, { piercing: true }) }, { 3: card("t1", 1, 10) });
    actionPhase(s2);
    expect(s2.players[1].kingHp).toBe(150 - 20);
  });
  it("does nothing special without excess", () => {
    const s = setup({ 3: card("a", 5, 100, { piercing: true }) }, { 3: card("t1", 1, 10) });
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(5);
    expect(s.players[1].kingHp).toBe(150);
  });
});

describe("Lifesteal", () => {
  it("heals half the damage dealt, capped at max HP", () => {
    const s = setup({ 3: card("v", 20, 100, { lifesteal: true }) }, { 3: card("t", 1, 100) });
    s.players[0].board[3]!.hp = 50;
    actionPhase(s);
    expect(s.players[0].board[3]!.hp).toBe(60);
    s.players[0].board[3]!.hp = 99;
    s.players[0].turnsPlayed = 5;
    actionPhase(s);
    expect(s.players[0].board[3]!.hp).toBe(100);
  });
  it("counts only the damage actually dealt to a card", () => {
    const s = setup({ 3: card("v", 40, 100, { lifesteal: true }) }, { 3: card("t", 1, 10) });
    s.players[0].board[3]!.hp = 50;
    actionPhase(s);
    expect(s.players[0].board[3]!.hp).toBe(55);
  });
});

describe("Regeneration", () => {
  it("heals N at the start of the owner's turn, up to max", () => {
    const s = setup({ 3: card("r", 1, 100, { regen: 20 }) }, {});
    s.players[0].board[3]!.hp = 70;
    s.players[0].turnsPlayed = 5;
    beginTurn(s);
    expect(s.players[0].board[3]!.hp).toBe(90);
    beginTurn(s);
    expect(s.players[0].board[3]!.hp).toBe(100);
  });
  it("does not heal on the opponent's turn", () => {
    const s = setup({}, { 3: card("r", 1, 100, { regen: 20 }) });
    s.players[1].board[3]!.hp = 50;
    beginTurn(s); // player 0 again
    expect(s.players[1].board[3]!.hp).toBe(50);
  });
});

describe("Bushido", () => {
  it("only hits the facing card, else the king (centre cards are ignored)", () => {
    const s = setup({ 1: card("b", 10, 100, { bushido: true }) }, { 3: card("c", 1, 100) });
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(100);
    expect(s.players[1].kingHp).toBe(140);
  });
  it("heals fully after killing a target nobody else touched", () => {
    const s = setup({ 3: card("b", 30, 100, { bushido: true }) }, { 3: card("t", 1, 20) });
    s.players[0].board[3]!.hp = 40;
    actionPhase(s);
    expect(s.players[1].board[3]).toBeNull();
    expect(s.players[0].board[3]!.hp).toBe(100);
  });
  it("does not heal if another card had touched the target", () => {
    const s = setup({ 3: card("b", 30, 100, { bushido: true }) }, { 3: card("t", 1, 20) });
    s.players[0].board[3]!.hp = 40;
    s.players[1].board[3]!.touchedBy = [999];
    actionPhase(s);
    expect(s.players[1].board[3]).toBeNull();
    expect(s.players[0].board[3]!.hp).toBe(40);
  });
});
