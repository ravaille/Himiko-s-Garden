import { describe, expect, it } from "vitest";
import { poseAI, playDuel } from "./ai";
import { buildRandomDeck } from "./deck";
import { actionPhase, beginTurn, newGame, offer, playCard, previewTargets } from "./engine";
import type { CardDef, GameState, Personality } from "./types";
import { TEST_POOL } from "../data/cards";

const card = (id: string, attack: number, hp: number, personality: Personality = "none", cost = 1): CardDef => ({
  id,
  name: id,
  cost,
  attack,
  hp,
  personality,
});

/** Game with empty decks; boards are filled by hand. Player 0 is active and past deployment. */
function setup(mine: Record<number, CardDef>, theirs: Record<number, CardDef>): GameState {
  const filler = Array.from({ length: 30 }, (_, i) => card(`f${i}`, 1, 1));
  const s = newGame([filler, filler], 1);
  s.players[0].turnsPlayed = 5;
  for (const [slot, def] of Object.entries(mine))
    s.players[0].board[+slot] = { uid: s.nextUid++, def, hp: def.hp, deployedOn: 1, lastAttackerUid: null };
  for (const [slot, def] of Object.entries(theirs))
    s.players[1].board[+slot] = { uid: s.nextUid++, def, hp: def.hp, deployedOn: 1, lastAttackerUid: null };
  return s;
}

describe("targeting", () => {
  it("hits the facing card first", () => {
    const s = setup({ 0: card("a", 10, 10) }, { 0: card("face", 1, 100), 3: card("mid", 1, 100) });
    actionPhase(s);
    expect(s.players[1].board[0]!.hp).toBe(90);
    expect(s.players[1].board[3]!.hp).toBe(100);
  });

  it("falls back to the centre, then to the king", () => {
    const s = setup({ 0: card("a", 10, 10) }, { 3: card("mid", 1, 100) });
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(90);
    const k = setup({ 0: card("a", 10, 10) }, { 1: card("outer", 1, 100) });
    actionPhase(k);
    expect(k.players[1].board[1]!.hp).toBe(100);
    expect(k.players[1].kingHp).toBe(140);
  });

  it("assassin goes straight for the king", () => {
    const s = setup({ 0: card("a", 10, 10, "assassin") }, { 0: card("face", 1, 100) });
    actionPhase(s);
    expect(s.players[1].kingHp).toBe(140);
  });

  it("brave picks the beefiest reachable card", () => {
    const s = setup({ 0: card("a", 10, 10, "brave") }, { 0: card("weak", 1, 20), 3: card("tank", 1, 80) });
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(70);
  });

  it("guardian shields adjacent allies", () => {
    const s = setup({ 0: card("a", 10, 10) }, { 0: card("ally", 1, 50), 1: card("g", 1, 50, "guardian") });
    actionPhase(s);
    expect(s.players[1].board[0]!.hp).toBe(50);
    expect(s.players[1].board[1]!.hp).toBe(40);
  });

  it("coward is targeted last", () => {
    const s = setup({ 0: card("a", 10, 10) }, { 0: card("coward", 1, 100, "coward"), 3: card("mid", 1, 100) });
    actionPhase(s);
    expect(s.players[1].board[0]!.hp).toBe(100);
    expect(s.players[1].board[3]!.hp).toBe(90);
  });

  it("defensive only attacks when it can kill", () => {
    const s = setup({ 0: card("a", 10, 10, "defensive") }, { 0: card("big", 1, 50) });
    actionPhase(s);
    expect(s.players[1].board[0]!.hp).toBe(50);
    const k = setup({ 0: card("a", 10, 10, "defensive") }, { 0: card("small", 1, 10) });
    actionPhase(k);
    expect(k.players[1].board[0]).toBeNull();
  });

  it("passive never attacks", () => {
    const s = setup({ 0: card("a", 10, 10, "passive") }, {});
    actionPhase(s);
    expect(s.players[1].kingHp).toBe(150);
  });
});

describe("turn rules", () => {
  it("a newly placed card does not act on its first turn", () => {
    const s = newGame([[card("a", 10, 10)], [card("b", 1, 1)]], 7);
    s.players[0].hand = [card("a", 10, 10)];
    beginTurn(s);
    s.players[0].energy = 1;
    playCard(s, 0, 3);
    actionPhase(s);
    expect(s.players[1].kingHp).toBe(150);
  });

  it("allows one offering per turn and energy persists", () => {
    const s = newGame([Array.from({ length: 30 }, () => card("x", 1, 1)), []], 3);
    beginTurn(s);
    offer(s, 0);
    expect(s.players[0].maxEnergy).toBe(1);
    expect(() => offer(s, 0)).toThrow();
  });
});

describe("graveyard and fatigue", () => {
  it("sends dead and sacrificed cards to the graveyard", () => {
    const s = setup({ 0: card("a", 10, 10) }, { 0: card("weak", 1, 5) });
    actionPhase(s);
    expect(s.players[1].graveyard.map((c) => c.id)).toEqual(["weak"]);
    s.players[0].hand = [card("x", 1, 1)];
    offer(s, 0);
    expect(s.players[0].graveyard.map((c) => c.id)).toEqual(["x"]);
  });

  it("costs 10 king HP to draw from an empty deck", () => {
    const s = setup({}, {});
    s.turn = 2;
    s.players[0].deck = [];
    beginTurn(s);
    expect(s.players[0].kingHp).toBe(140);
    expect(s.players[0].fatigued).toBe(true);
  });
});

describe("preview", () => {
  it("previews the facing target without consuming randomness", () => {
    const s = setup({}, { 2: card("t", 1, 50) });
    const before = s.rngState;
    const r = previewTargets(s, 0, 2, card("b", 5, 5, "berserk"));
    expect(r.targets).toHaveLength(1);
    expect(s.rngState).toBe(before);
    expect(previewTargets(s, 0, 2, card("b", 5, 5, "brave")).targets[0]).toMatchObject({ kind: "unit", slot: 2 });
  });
});

describe("simulation", () => {
  it("is deterministic for a given seed", () => {
    const run = () => {
      const h = { rngState: 99 };
      const decks: [CardDef[], CardDef[]] = [buildRandomDeck(TEST_POOL, h), buildRandomDeck(TEST_POOL, h)];
      return playDuel(newGame(decks, 5));
    };
    expect(run()).toEqual(run());
  });

  it("terminates and builds 30-card decks", () => {
    const h = { rngState: 1 };
    const deck = buildRandomDeck(TEST_POOL, h);
    expect(deck).toHaveLength(30);
    const s = newGame([deck, buildRandomDeck(TEST_POOL, h)], 2);
    poseAI(s);
    expect(playDuel(newGame([deck, deck], 2)).winner).not.toBeNull();
  });
});
