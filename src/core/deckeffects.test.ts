import { describe, expect, it } from "vitest";
import { drawCard, newGame, playCard } from "./engine";
import type { CardDef, Effect } from "./types";

const filler = (n: number): CardDef[] => Array.from({ length: n }, (_, i) => ({ id: `f${i}`, name: `f${i}`, cost: 1, attack: 1, hp: 1, personality: "brave" as const }));

const instant: Effect = { on: "drawFailed", zone: "deck", replaces: "fatigue", do: [{ kind: "win" }] };
const burn: Effect = { on: "drawFailed", zone: "deck", replaces: "fatigue", do: [{ kind: "damage", to: "enemyKing", amount: 10 }] };
const demon = (e: Effect): CardDef => ({ id: "demon", name: "demon", cost: 7, attack: 1, hp: 1, personality: "passive", rank: "general", effects: [e] });

describe("effects working from the deck (Demon General)", () => {
  it("without one, an empty-deck draw still costs the king 10 HP", () => {
    const s = newGame([filler(40), filler(40)], 1);
    s.players[0].deck = [];
    drawCard(s, 0);
    expect(s.players[0].kingHp).toBe(140);
    expect(s.winner).toBeNull();
  });

  it("instant version: you win instead of losing 10 HP", () => {
    const s = newGame([[demon(instant), ...filler(39)], filler(40)], 1);
    s.players[0].deck = [];
    drawCard(s, 0);
    expect(s.winner).toBe(0);
    expect(s.players[0].kingHp).toBe(150);
  });

  it("damage version: the opponent loses 10 HP instead of you, on every failed draw", () => {
    const s = newGame([[demon(burn), ...filler(39)], filler(40)], 1);
    s.players[0].deck = [];
    drawCard(s, 0);
    drawCard(s, 0);
    expect(s.players[0].kingHp).toBe(150);
    expect(s.players[1].kingHp).toBe(130);
    expect(s.winner).toBeNull();
  });

  it("is active wherever the card is: in the deck, in the hand, on the board, or in the graveyard", () => {
    for (const where of ["deck", "hand", "board", "graveyard"] as const) {
      const d = demon(instant);
      const s = newGame([[d, ...filler(39)], filler(40)], 1);
      const p = s.players[0];
      // move the card to `where`, whatever the shuffle did
      for (const zone of [p.deck, p.hand, p.graveyard]) {
        const i = zone.indexOf(d);
        if (i >= 0) zone.splice(i, 1);
      }
      if (where === "board") p.board[3] = { uid: 99, def: d, attack: 1, maxHp: 1, hp: 1, deployedOn: 1, lastAttackerUid: null };
      else p[where].push(d);
      p.deck = [];
      drawCard(s, 0);
      expect(s.winner).toBe(0);
    }
  });

  it("works for its owner only, and if both have one, the first to run dry wins", () => {
    const s = newGame([[demon(instant), ...filler(39)], [demon(instant), ...filler(39)]], 1);
    s.players[1].deck = [];
    drawCard(s, 1);
    expect(s.winner).toBe(1);
    const t = newGame([[demon(instant), ...filler(39)], filler(40)], 1);
    t.players[1].deck = [];
    drawCard(t, 1); // the opponent has no Demon: he simply pays the 10 HP
    expect(t.winner).toBeNull();
    expect(t.players[1].kingHp).toBe(140);
  });

  it("a normal draw does not trigger it", () => {
    const s = newGame([[demon(instant), ...filler(39)], filler(40)], 1);
    drawCard(s, 0);
    expect(s.winner).toBeNull();
  });

  it("a deck effect does not fire from the board, and a board effect does not fire from the deck list", () => {
    const boardOnly: Effect = { on: "drawFailed", do: [{ kind: "win" }] }; // zone defaults to "board"
    const d: CardDef = { id: "b", name: "b", cost: 1, attack: 1, hp: 1, personality: "brave", effects: [boardOnly] };
    const s = newGame([[d, ...filler(39)], filler(40)], 1);
    s.players[0].deck = [];
    drawCard(s, 0);
    expect(s.winner).toBeNull(); // the card is not on the board
    expect(s.players[0].kingHp).toBe(140);
    s.players[0].hand = [d];
    s.players[0].energy = 9;
    playCard(s, 0, 3);
    drawCard(s, 0); // now it stands on the board
    expect(s.winner).toBe(0);
  });
});
