import { describe, expect, it } from "vitest";
import { poseAI } from "./ai";
import { refreshAuras } from "./effects";
import { actionPhase, beginTurn, endTurn, newGame, playCard, playFree } from "./engine";
import type { CardDef, Effect, GameState, Personality } from "./types";

const unitDef = (id: string, attack: number, hp: number, effects: Effect[] = [], extra: Partial<CardDef> = {}, personality: Personality = "brave"): CardDef => ({
  id, name: id, cost: 1, attack, hp, personality, effects, ...extra,
});
const filler = Array.from({ length: 40 }, (_, i) => ({ id: `f${i}`, name: `f${i}`, cost: 9, attack: 1, hp: 1, personality: "brave" as const }));

function game(mine: Record<number, CardDef> = {}, theirs: Record<number, CardDef> = {}): GameState {
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

describe("allyDamaged with a subject filter (Samurai General reflect)", () => {
  const reflect: Effect = { on: "allyDamaged", subject: { type: "oni" }, do: [{ kind: "damage", to: "source", amount: { pct: 10, of: "eventDamage" } }] };
  const grant: Effect = { on: "passive", do: [{ kind: "grantType", to: "allies", type: "oni" }] };

  it("sends 10 % of the damage back to the attacker, only for cards of the type", () => {
    const s = game({ 0: unitDef("gen", 1, 100, [reflect, grant]), 3: unitDef("plain", 1, 200, [], {}), 4: unitDef("oni", 1, 200, [], { types: ["oni"] }) }, { 3: unitDef("atk", 50, 100) });
    // attacker (side 1) hits our card at slot 3: a plain card, but the General grants every ally [oni]
    s.current = 1;
    s.players[1].turnsPlayed = 5;
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(95); // 10 % of 50
  });

  it("does nothing for a card that does not match the subject", () => {
    const s = game({ 0: unitDef("gen", 1, 100, [reflect]), 3: unitDef("plain", 1, 200) }, { 3: unitDef("atk", 50, 100) });
    s.current = 1;
    s.players[1].turnsPlayed = 5;
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(100);
  });
});

describe("equipment counted (Ronin)", () => {
  const ronin = unitDef("ronin", 10, 20, [{ on: "passive", do: [{ kind: "aura", to: "self", attack: { per: 10, of: { of: "selfEquipment" } } }] }]);
  const blade: CardDef = {
    id: "blade", name: "blade", cost: 1, attack: 0, hp: 0, personality: "none", kind: "spell", equipment: true,
    spell: { target: "allyUnit", do: [{ kind: "buff", to: "chosen", attack: 5 }] },
  };
  it("each equipment adds its own buff and counts for the Ronin's scaling", () => {
    const s = game({ 3: ronin });
    s.players[0].hand = [blade, blade];
    playCard(s, 0, 0, { kind: "unit", side: 0, slot: 3 });
    playCard(s, 0, 0, { kind: "unit", side: 0, slot: 3 });
    expect(s.players[0].board[3]!.equipped).toBe(2);
    expect(s.players[0].board[3]!.attack).toBe(10 + 5 + 5 + 20); // base + 2 blades + 10 per equipment
  });
  it("a spell that is not marked as equipment is not counted", () => {
    const buff = { ...blade, equipment: undefined };
    const s = game({ 3: ronin });
    s.players[0].hand = [buff];
    playCard(s, 0, 0, { kind: "unit", side: 0, slot: 3 });
    expect(s.players[0].board[3]!.equipped).toBeUndefined();
    expect(s.players[0].board[3]!.attack).toBe(15);
  });
});

describe("free placement (Professor General)", () => {
  const teacher = unitDef("teacher", 1, 90, [{ on: "turnStart", do: [{ kind: "freePlay", filter: { maxCost: 3 } }] }], { cost: 7 }, "passive");
  const cheap = (id: string, cost: number) => unitDef(id, 5, 5, [], { cost });

  it("grants a free placement each turn; the player picks a matching card and a slot", () => {
    const s = game({ 0: teacher });
    s.players[0].hand = [cheap("small", 2), cheap("big", 5)];
    s.players[0].energy = 0;
    beginTurn(s); // start of our turn: the General's effect fires
    expect(s.players[0].freePlays).toHaveLength(1);
    expect(() => playFree(s, 1, 3)).toThrow("No free placement for this card"); // cost 5: not eligible
    playFree(s, 0, 3);
    expect(s.players[0].board[3]!.def.id).toBe("small");
    expect(s.players[0].energy).toBe(s.players[0].maxEnergy); // nothing was paid
    expect(s.players[0].freePlays).toHaveLength(0);
    expect(() => playFree(s, 0, 4)).toThrow("No free placement for this card"); // used up
  });

  it("expires at the end of the turn", () => {
    const s = game({ 0: teacher });
    s.players[0].hand = [cheap("small", 2)];
    beginTurn(s);
    expect(s.players[0].freePlays).toHaveLength(1);
    endTurn(s);
    s.current = 0;
    s.players[0].board[0] = null; // the General is gone: no new placement
    beginTurn(s);
    expect(s.players[0].freePlays).toHaveLength(0);
  });

  it("random mode places a matching creature at once (the nerfed version)", () => {
    const rnd = unitDef("rnd", 1, 90, [{ on: "turnStart", do: [{ kind: "freePlay", filter: { maxCost: 3 }, random: true }] }], { cost: 7 }, "passive");
    const s = game({ 0: rnd });
    s.players[0].hand = [cheap("a", 1), cheap("b", 2), cheap("big", 6)];
    beginTurn(s);
    const placed = s.players[0].board.filter((u) => u && u.def.id !== "rnd").map((u) => u!.def.id);
    expect(placed).toHaveLength(1);
    expect(["a", "b"]).toContain(placed[0]);
    expect(s.players[0].hand.map((c) => c.id)).toContain("big");
    expect(s.players[0].freePlays).toHaveLength(0);
  });

  it("works for buildings too, and a spell cannot be placed", () => {
    const s = game({ 0: teacher });
    const tower: CardDef = { id: "tower", name: "tower", cost: 2, attack: 0, hp: 10, personality: "none", kind: "building" };
    const spell: CardDef = { id: "sp", name: "sp", cost: 1, attack: 0, hp: 0, personality: "none", kind: "spell", spell: { do: [] } };
    s.players[0].hand = [tower, spell];
    beginTurn(s);
    expect(() => playFree(s, 1, 3)).toThrow("Cannot place this card");
    playFree(s, 0, 2);
    expect(s.players[0].buildings[2]!.def.id).toBe("tower");
  });

  it("the AI uses its free placements on the strongest matching creature", () => {
    const s = game({ 0: teacher });
    s.players[0].hand = [cheap("weak", 1), { ...cheap("strong", 3), attack: 30, hp: 30 }];
    s.players[0].offered = true;
    s.players[0].energy = 0;
    beginTurn(s);
    s.players[0].energy = 0;
    s.players[0].offered = true;
    poseAI(s);
    expect(s.players[0].board.some((u) => u?.def.id === "strong")).toBe(true);
  });
});
