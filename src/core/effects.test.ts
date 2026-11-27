import { describe, expect, it } from "vitest";
import { actionPhase, beginTurn, endTurn, newGame, offer, playCard } from "./engine";
import type { CardDef, Effect, GameState, Keywords, Personality } from "./types";

const card = (
  id: string,
  attack: number,
  hp: number,
  effects: Effect[] = [],
  personality: Personality = "brave",
  keywords: Keywords = {},
): CardDef => ({ id, name: id, cost: 1, attack, hp, personality, effects, keywords });
const filler = Array.from({ length: 30 }, (_, i) => ({ id: `f${i}`, name: `f${i}`, cost: 1, attack: 1, hp: 1, personality: "brave" as const }));

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

describe("triggers", () => {
  it("play: fires when the card is placed", () => {
    const s = newGame([filler, filler], 1);
    beginTurn(s);
    s.players[0].energy = 9;
    s.players[0].hand = [card("priest", 1, 1, [{ on: "play", do: [{ kind: "damage", to: "enemyKing", amount: 12 }] }])];
    playCard(s, 0, 3);
    expect(s.players[1].kingHp).toBe(138);
  });

  it("turnStart: only on its owner's turn", () => {
    const grow: Effect = { on: "turnStart", do: [{ kind: "buff", to: "self", attack: 5, hp: 5 }] };
    const s = setup({ 3: card("grow", 10, 10, [grow]) }, { 3: card("grow2", 10, 10, [grow]) });
    beginTurn(s); // player 0's turn again in this harness
    expect(s.players[0].board[3]).toMatchObject({ attack: 15, hp: 15, maxHp: 15 });
    expect(s.players[1].board[3]).toMatchObject({ attack: 10, hp: 10 });
  });

  it("death: resolves immediately, before the next card acts (Last Words)", () => {
    const boom: Effect = { on: "death", do: [{ kind: "damage", to: "enemies", amount: 100 }] };
    const s = setup({ 2: card("victim-killer", 100, 500), 3: card("second", 10, 500) }, { 3: card("bomber", 1, 5, [boom]) });
    s.players[0].board[2]!.hp = 500;
    actionPhase(s);
    // slot 2 kills the bomber, whose death deals 100 to our cards (both survive: 500 hp), before slot 3 acts
    expect(s.players[0].board[2]!.hp).toBe(400);
    expect(s.players[0].board[3]!.hp).toBe(400);
  });

  it("damaged + source: retaliates against the attacker", () => {
    const thorns: Effect = { on: "damaged", do: [{ kind: "damage", to: "source", amount: 7 }] };
    const s = setup({ 3: card("a", 5, 50) }, { 3: card("thorny", 1, 50, [thorns]) });
    actionPhase(s);
    expect(s.players[0].board[3]!.hp).toBe(43);
  });

  it("kingHit, allyDeath, sacrifice, draw: react to their events", () => {
    const rage: Effect = { on: "kingHit", do: [{ kind: "buff", to: "self", attack: 10 }] };
    const s = setup({ 3: card("rager", 5, 50, [rage]) }, { 3: card("a", 1, 50, [], "assassin") });
    s.players[1].turnsPlayed = 5;
    s.current = 1;
    actionPhase(s); // the assassin hits our king
    expect(s.players[0].board[3]!.attack).toBe(15);

    const fam = card("fam", 1, 10, [{ on: "sacrifice", do: [{ kind: "buff", to: "self", attack: 10 }] }, { on: "draw", do: [{ kind: "energy", amount: 1 }] }]);
    const t = setup({ 0: fam }, {});
    t.players[0].energy = 0;
    offer(t, 0);
    expect(t.players[0].board[0]!.attack).toBe(11);
    const handBefore = t.players[0].hand.length;
    endTurn(t);
    endTurn(t);
    beginTurn(t);
    expect(t.players[0].hand.length).toBe(handBefore + 1);
    expect(t.players[0].energy).toBe(t.players[0].maxEnergy + 1);
  });
});

describe("actions and selectors", () => {
  it("heal is capped at max HP, king heal at the starting HP", () => {
    const heal: Effect = { on: "play", do: [{ kind: "heal", to: "ownKing", amount: 50 }, { kind: "heal", to: "adjacent", amount: 50 }] };
    const s = newGame([filler, filler], 1);
    beginTurn(s);
    s.players[0].energy = 9;
    const def = card("ally", 1, 20);
    s.players[0].board[2] = { uid: 99, def, attack: 1, maxHp: 20, hp: 5, deployedOn: 1, lastAttackerUid: null };
    s.players[0].kingHp = 130;
    s.players[0].hand = [card("monk", 1, 1, [heal])];
    playCard(s, 0, 3);
    expect(s.players[0].kingHp).toBe(150);
    expect(s.players[0].board[2]!.hp).toBe(20);
  });

  it("effects cannot target ghostly enemy cards", () => {
    const zap: Effect = { on: "play", do: [{ kind: "damage", to: "enemies", amount: 5 }] };
    const s = newGame([filler, filler], 1);
    beginTurn(s);
    s.players[0].energy = 9;
    const mk = (def: CardDef) => ({ uid: s.nextUid++, def, attack: def.attack, maxHp: def.hp, hp: def.hp, deployedOn: 1, lastAttackerUid: null });
    s.players[1].board[1] = mk(card("ghost", 1, 10, [], "brave", { ghostly: true }));
    s.players[1].board[2] = mk(card("solid", 1, 10));
    s.players[0].hand = [card("zapper", 1, 1, [zap])];
    playCard(s, 0, 3);
    expect(s.players[1].board[1]!.hp).toBe(10);
    expect(s.players[1].board[2]!.hp).toBe(5);
  });

  it("draw: empty deck costs 10 HP per failed draw", () => {
    const s = newGame([filler, filler], 1);
    beginTurn(s);
    s.players[0].deck = [];
    s.players[0].energy = 9;
    s.players[0].hand = [card("scribe", 1, 1, [{ on: "play", do: [{ kind: "draw", count: 2 }] }])];
    playCard(s, 0, 3);
    expect(s.players[0].kingHp).toBe(130);
  });

  it("an infinite effect loop is cut instead of freezing the game", () => {
    const loop: Effect = { on: "damaged", do: [{ kind: "damage", to: "self", amount: 0 }] };
    const s = setup({ 3: card("a", 1, 50) }, { 3: card("loopy", 1, 100000, [loop]) });
    expect(() => actionPhase(s)).not.toThrow();
  });
});

describe("keyword tweaks", () => {
  it("multihit (3) strikes three times", () => {
    const s = setup({ 3: card("a", 10, 100, [], "brave", { multihit: 3 }) }, { 3: card("t", 1, 100) });
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(70);
  });
  it("a guardian still redirects to a ghostly guardian", () => {
    const s = setup(
      { 3: card("a", 10, 100, [], "none") },
      { 3: card("front", 1, 100), 4: card("g", 1, 100, [], "guardian", { ghostly: true }) },
    );
    actionPhase(s);
    expect(s.players[1].board[4]!.hp).toBe(90);
    expect(s.players[1].board[3]!.hp).toBe(100);
  });
});
