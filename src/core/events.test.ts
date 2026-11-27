import { afterEach, describe, expect, it } from "vitest";
import { actionPhase, beginTurn, newGame, offer, playCard } from "./engine";
import { MAX_CHAIN, emit, onEvent } from "./events";
import type { CardDef, GameEvent, GameState } from "./types";

const card = (id: string, cost: number, attack: number, hp: number, personality: CardDef["personality"] = "brave"): CardDef => ({
  id, name: id, cost, attack, hp, personality,
});
const filler = Array.from({ length: 30 }, (_, i) => card(`f${i}`, 1, 1, 1));
const fresh = (): GameState => newGame([filler, filler], 1);

const unsubs: (() => void)[] = [];
afterEach(() => {
  while (unsubs.length) unsubs.pop()!();
});

describe("event bus", () => {
  it("traces turn start, draw, offering and play in order", () => {
    const s = fresh();
    beginTurn(s);
    expect(s.trace.map((e) => e.type)).toEqual(["turnStart"]); // the very first turn draws nothing
    offer(s, 0);
    s.players[0].energy = 5;
    s.players[0].hand[0] = card("x", 1, 10, 10);
    playCard(s, 0, 3);
    expect(s.trace.map((e) => e.type)).toEqual(["turnStart", "sacrificed", "played"]);
    expect(s.players[0].board[3]).toMatchObject({ attack: 10, maxHp: 10, hp: 10 });
  });

  it("emits attack, damaged, died and kingHit during the action phase", () => {
    const s = fresh();
    beginTurn(s);
    s.players[0].turnsPlayed = 5;
    const mk = (def: CardDef) => ({ uid: s.nextUid++, def, attack: def.attack, maxHp: def.hp, hp: def.hp, deployedOn: 1, lastAttackerUid: null });
    s.players[0].board[3] = mk(card("a", 1, 10, 10));
    s.players[1].board[3] = mk(card("b", 1, 1, 5));
    s.trace = [];
    actionPhase(s);
    expect(s.trace.map((e) => e.type)).toEqual(["attack", "damaged", "died"]);
    s.trace = [];
    actionPhase(s); // no more enemy card: the king is hit
    expect(s.trace.map((e) => e.type)).toEqual(["attack", "kingHit"]);
  });

  it("uses runtime stats, not printed ones, for damage", () => {
    const s = fresh();
    beginTurn(s);
    s.players[0].turnsPlayed = 5;
    const def = card("a", 1, 10, 10);
    s.players[0].board[3] = { uid: s.nextUid++, def, attack: 25, maxHp: 10, hp: 10, deployedOn: 1, lastAttackerUid: null };
    actionPhase(s);
    expect(s.players[1].kingHp).toBe(150 - 25);
  });

  it("lets handlers react immediately, and cuts infinite chains", () => {
    const s = fresh();
    const seen: GameEvent["type"][] = [];
    unsubs.push(
      onEvent((st, ev) => {
        seen.push(ev.type);
        if (ev.type === "kingHit") emit(st, { type: "kingHit", side: 0, amount: 1 }); // re-triggers itself forever
      }),
    );
    emit(s, { type: "kingHit", side: 0, amount: 1 });
    expect(seen.length).toBe(MAX_CHAIN);
    seen.length = 0;
    emit(s, { type: "turnStart", side: 0 }); // the budget is restored for the next outermost emit
    expect(seen).toEqual(["turnStart"]);
  });
});
