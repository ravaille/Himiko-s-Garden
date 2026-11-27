import { describe, expect, it } from "vitest";
import { DECK_MAX, DECK_MIN, canAdd, validateDeck } from "./deckrules";
import type { CardDef } from "./types";

const card = (id: string, extra: Partial<CardDef> = {}): CardDef => ({
  id,
  name: id,
  cost: 1,
  attack: 10,
  hp: 10,
  personality: "brave",
  ...extra,
});
/** n distinct normal cards, 1 copy each. */
const distinct = (n: number, extra: Partial<CardDef> = {}) => Array.from({ length: n }, (_, i) => card(`n${i}`, extra));
const codes = (deck: CardDef[]) => validateDeck(deck).map((i) => i.code);

describe("validateDeck", () => {
  it("accepts 40 distinct cards, with no officer at all", () => {
    expect(validateDeck(distinct(DECK_MIN))).toEqual([]);
  });
  it("refuses fewer than 40 or more than 50 cards", () => {
    expect(codes(distinct(39))).toContain("too-few");
    expect(codes(distinct(DECK_MAX + 1))).toContain("too-many");
    expect(validateDeck(distinct(DECK_MAX))).toEqual([]);
  });
  it("limits copies: 3 normal, 2 officer, 1 general", () => {
    const x = card("x");
    expect(codes([...distinct(36), x, x, x])).not.toContain("copies");
    expect(codes([...distinct(35), x, x, x, x])).toContain("copies");
    const lt = card("lt", { rank: "lieutenant" });
    expect(codes([...distinct(38), lt, lt])).not.toContain("copies");
    expect(codes([...distinct(37), lt, lt, lt])).toContain("copies");
    const gen = card("gen", { rank: "general" });
    expect(codes([...distinct(38), gen, gen])).toContain("copies");
  });
  it("limits officers per deck: 1 general, 2 colonels, 4 lieutenants", () => {
    const col = (i: number) => card(`col${i}`, { rank: "colonel" });
    const lt = (i: number) => card(`lt${i}`, { rank: "lieutenant" });
    expect(codes([...distinct(37), col(1), col(2), col(3)])).toContain("rank-limit");
    expect(validateDeck([...distinct(36), lt(1), lt(2), lt(3), lt(4)])).toEqual([]);
    expect(codes([...distinct(35), lt(1), lt(2), lt(3), lt(4), lt(5)])).toContain("rank-limit");
    expect(codes([...distinct(38), card("g1", { rank: "general" }), card("g2", { rank: "general" })])).toContain("rank-limit");
  });
  it("enforces a General's deck rule", () => {
    const gen = card("oni-gen", { rank: "general", race: "oni", deckRule: { races: ["oni"] } });
    expect(validateDeck([gen, ...distinct(39, { race: "oni" })])).toEqual([]);
    expect(codes([gen, ...distinct(38, { race: "oni" }), card("h", { race: "human" })])).toContain("constraint");
  });
  it("supports type-based rules", () => {
    const gen = card("g", { rank: "general", deckRule: { types: ["samurai"] } });
    expect(validateDeck([gen, ...distinct(39, { types: ["samurai"] })])).toEqual([]);
    expect(codes([gen, ...distinct(39, { types: ["ninja"] })])).toContain("constraint");
  });
});

describe("canAdd", () => {
  it("blocks the 4th copy, a 2nd general, and a full deck", () => {
    const c = card("c");
    expect(canAdd([c, c], c).ok).toBe(true);
    expect(canAdd([c, c, c], c).ok).toBe(false);
    expect(canAdd([card("g", { rank: "general" })], card("g2", { rank: "general" })).ok).toBe(false);
    expect(canAdd(distinct(DECK_MAX), card("new")).ok).toBe(false);
  });
  it("blocks cards that break the General's rule, and a General that breaks the deck", () => {
    const gen = card("g", { rank: "general", deckRule: { races: ["oni"] } });
    expect(canAdd([gen], card("h", { race: "human" })).ok).toBe(false);
    expect(canAdd([gen], card("o", { race: "oni" })).ok).toBe(true);
    expect(canAdd([card("h", { race: "human" })], gen).ok).toBe(false);
  });
});
