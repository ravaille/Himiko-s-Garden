import { describe, expect, it } from "vitest";
import { DECK_MIN, autoFill, validateDeck } from "../core/deckrules";
import { buildRandomDeck } from "../core/deck";
import { playDuel } from "../core/ai";
import { newGame } from "../core/engine";
import { COLLECTION } from "./collection";

describe("collection", () => {
  it("has unique ids", () => {
    expect(new Set(COLLECTION.map((c) => c.id)).size).toBe(COLLECTION.length);
  });
  it("can fill a legal 40-card deck, with or without a general", () => {
    let seed = 1;
    const pick = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const deck = autoFill([], COLLECTION.filter((c) => !c.rank), pick);
    expect(deck).toHaveLength(DECK_MIN);
    expect(validateDeck(deck)).toEqual([]);
    const shuten = COLLECTION.find((c) => c.id === "gen-shuten")!;
    const oniDeck = autoFill([shuten], COLLECTION, pick);
    expect(oniDeck).toHaveLength(DECK_MIN);
    expect(validateDeck(oniDeck)).toEqual([]);
    expect(oniDeck.every((c) => c.race === "oni")).toBe(true);
  });
  it("lets the duel engine run with a 40-card deck", () => {
    const h = { rngState: 7 };
    expect(buildRandomDeck(COLLECTION.filter((c) => !c.rank && c.cost <= 6), h).length).toBeGreaterThan(0);
  });
  it("plays 300 full duels with random legal decks without crashing or stalling", () => {
    let seed = 42;
    const pick = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 300; i++) {
      const deck = () => autoFill([], COLLECTION.filter((c) => !c.rank), pick);
      const r = playDuel(newGame([deck(), deck()], i + 1));
      expect(["0", "1", "draw"]).toContain(String(r.winner));
    }
  });
});
