import { describe, expect, it } from "vitest";
import { actionPhase, beginTurn, newGame, playCard, spellTargets } from "./engine";
import type { Building, CardDef, Effect, GameState, Keywords, Personality, Spell } from "./types";

const base = { attack: 0, personality: "none" as Personality };
const building = (id: string, hp: number, effects: Effect[] = []): CardDef => ({ id, name: id, cost: 2, ...base, hp, kind: "building", effects });
const unitDef = (id: string, attack: number, hp: number, personality: Personality = "brave", keywords: Keywords = {}, effects: Effect[] = []): CardDef => ({
  id, name: id, cost: 1, attack, hp, personality, keywords, effects,
});
const spell = (id: string, s: Spell): CardDef => ({ id, name: id, cost: 1, ...base, hp: 0, kind: "spell", spell: s });
const filler = Array.from({ length: 30 }, (_, i) => ({ id: `f${i}`, name: `f${i}`, cost: 1, attack: 1, hp: 1, personality: "brave" as const }));

/** Player 0 is active and past deployment. */
function game(mine: Record<number, CardDef> = {}, theirs: Record<number, CardDef> = {}, theirBuildings: Record<number, CardDef> = {}): GameState {
  const s = newGame([filler, filler], 1);
  beginTurn(s);
  s.players[0].turnsPlayed = 5;
  s.players[0].energy = 10;
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

describe("placing buildings", () => {
  it("goes on one of our slots, even under a card; one per slot; costs energy", () => {
    const s = game({ 3: unitDef("u", 1, 10) });
    s.players[0].hand = [building("b1", 15), building("b2", 15)];
    playCard(s, 0, 3);
    expect(s.players[0].buildings[3]!.def.id).toBe("b1");
    expect(s.players[0].board[3]!.def.id).toBe("u"); // the card is still there
    expect(s.players[0].energy).toBe(8);
    expect(() => playCard(s, 0, 3)).toThrow("Slot unavailable");
    expect(s.players[0].hand).toHaveLength(1);
    playCard(s, 0, 4);
    expect(s.players[0].buildings[4]).not.toBeNull();
  });
  it("is active immediately (its effect fires on placement)", () => {
    const s = game();
    s.players[0].hand = [building("b", 15, [{ on: "play", do: [{ kind: "damage", to: "enemyKing", amount: 9 }] }])];
    playCard(s, 0, 0);
    expect(s.players[1].kingHp).toBe(141);
  });
});

describe("targeting buildings", () => {
  it("automatic targeting ignores buildings", () => {
    const s = game({ 3: unitDef("brave", 10, 10) }, {}, { 3: building("b", 20) });
    actionPhase(s);
    expect(s.players[1].buildings[3]!.hp).toBe(20);
    expect(s.players[1].kingHp).toBe(140);
  });
  it("Demolisher hits a building on an empty slot first", () => {
    const s = game({ 3: unitDef("d", 10, 10, "demolisher") }, { 1: unitDef("blocker", 1, 100) }, { 5: building("b", 25), 1: building("under", 25) });
    actionPhase(s);
    expect(s.players[1].buildings[5]!.hp).toBe(15);
    expect(s.players[1].buildings[1]!.hp).toBe(25);
  });
  it("Demolisher hits the card standing on a building when no building is bare", () => {
    const s = game({ 3: unitDef("d", 10, 100, "demolisher") }, { 1: unitDef("tenant", 1, 50), 4: unitDef("other", 1, 50) }, { 1: building("b", 25) });
    actionPhase(s);
    expect(s.players[1].board[1]!.hp).toBe(40);
    expect(s.players[1].board[4]!.hp).toBe(50);
  });
  it("Demolisher with no building only retaliates", () => {
    const s = game({ 3: unitDef("d", 10, 100, "demolisher") }, { 3: unitDef("foe", 1, 50) });
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(50);
    expect(s.players[1].kingHp).toBe(150);
    s.players[0].board[3]!.lastAttackerUid = s.players[1].board[3]!.uid;
    actionPhase(s);
    expect(s.players[1].board[3]!.hp).toBe(40);
  });
  it("Berserk can pick buildings too", () => {
    let hitBuilding = false;
    for (let seed = 1; seed < 40 && !hitBuilding; seed++) {
      const s = game({ 3: unitDef("b", 5, 10, "berserk") }, { 0: unitDef("foe", 1, 50) }, { 6: building("bld", 20) });
      s.rngState = seed;
      actionPhase(s);
      hitBuilding = s.players[1].buildings[6]!.hp < 20;
    }
    expect(hitBuilding).toBe(true);
  });
  it("a Guardian protects the building next to it", () => {
    const s = game({ 3: unitDef("d", 10, 10, "demolisher") }, { 4: unitDef("guard", 1, 100, "guardian") }, { 3: building("b", 25) });
    s.players[1].board[3] = null;
    actionPhase(s);
    expect(s.players[1].buildings[3]!.hp).toBe(25);
    expect(s.players[1].board[4]!.hp).toBe(90);
  });
  it("a destroyed building goes to the graveyard; excess damage pierces to the king", () => {
    const s = game({ 3: unitDef("d", 40, 10, "demolisher", { piercing: true }) }, {}, { 5: building("b", 15) });
    actionPhase(s);
    expect(s.players[1].buildings[5]).toBeNull();
    expect(s.players[1].graveyard.map((c) => c.id)).toEqual(["b"]);
    expect(s.players[1].kingHp).toBe(150 - 25);
  });
});

describe("spells and buildings", () => {
  it("enemyAny can target a building; enemyUnit cannot; enemyBuilding only buildings", () => {
    const s = game({}, { 2: unitDef("u", 1, 10) }, { 5: building("b", 20) });
    const any = spell("any", { target: "enemyAny", do: [{ kind: "damage", to: "chosen", amount: 5 }] });
    const unitOnly = spell("u", { target: "enemyUnit", do: [] });
    const bldOnly = spell("bo", { target: "enemyBuilding", do: [{ kind: "destroy", to: "chosen" }] });
    expect(spellTargets(s, 0, any)).toContainEqual({ kind: "building", side: 1, slot: 5 });
    expect(spellTargets(s, 0, unitOnly)).toEqual([{ kind: "unit", side: 1, slot: 2 }]);
    expect(spellTargets(s, 0, bldOnly)).toEqual([{ kind: "building", side: 1, slot: 5 }]);
    s.players[0].hand = [any, bldOnly];
    playCard(s, 0, 0, { kind: "building", side: 1, slot: 5 });
    expect(s.players[1].buildings[5]!.hp).toBe(15);
    playCard(s, 0, 0, { kind: "building", side: 1, slot: 5 });
    expect(s.players[1].buildings[5]).toBeNull();
  });
  it("area spells hit buildings too", () => {
    const s = game({}, { 2: unitDef("u", 1, 10) }, { 5: building("b", 20) });
    s.players[0].hand = [spell("zone", { do: [{ kind: "damage", to: "enemies", amount: 6 }] })];
    playCard(s, 0, 0);
    expect(s.players[1].board[2]!.hp).toBe(4);
    expect(s.players[1].buildings[5]!.hp).toBe(14);
  });
});

describe("building effects", () => {
  it("turnStart: heals the card on its slot; only on its owner's turn", () => {
    const altar = building("altar", 20, [{ on: "turnStart", do: [{ kind: "heal", to: "slotUnit", amount: 5 }] }]);
    const s = game({ 3: unitDef("u", 1, 20) });
    s.players[0].board[3]!.hp = 10;
    s.players[0].buildings[3] = { uid: 99, def: altar, hp: 20, maxHp: 20 };
    beginTurn(s);
    expect(s.players[0].board[3]!.hp).toBe(15);
  });
  it("slotAttacked: punishes whoever attacks the slot (even an empty one)", () => {
    const torii = building("torii", 100, [{ on: "slotAttacked", do: [{ kind: "damage", to: "source", amount: 7 }] }]);
    const s = game({ 3: unitDef("atk", 1, 50) }, { 3: unitDef("tgt", 1, 50) }, { 3: torii });
    actionPhase(s);
    expect(s.players[0].board[3]!.hp).toBe(43);
  });
  it("turnStart summon: a crypt raises a token each turn on a free slot", () => {
    const token: CardDef = { ...unitDef("skel", 10, 10), token: true };
    const crypt = building("crypt", 20, [{ on: "turnStart", do: [{ kind: "summon", card: token }] }]);
    const s = game();
    s.players[0].buildings[0] = { uid: 98, def: crypt, hp: 20, maxHp: 20 };
    beginTurn(s);
    expect(s.players[0].board[3]!.def.id).toBe("skel");
  });
  it("death: a destroyed building resolves its own last words", () => {
    const boom = building("boom", 5, [{ on: "death", do: [{ kind: "damage", to: "enemyKing", amount: 11 }] }]);
    const s = game({ 3: unitDef("d", 10, 10, "demolisher") }, {}, { 2: boom });
    s.current = 0;
    actionPhase(s);
    expect(s.players[1].buildings[2]).toBeNull();
    expect(s.players[0].kingHp).toBe(139); // the building belongs to side 1: its "enemy king" is ours
  });
});
