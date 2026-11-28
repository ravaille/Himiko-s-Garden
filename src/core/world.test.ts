import { describe, expect, it } from "vitest";
import { MAPS, START, STARTER_GENERALS, seededDeck, starterDeck } from "../data/world";
import { validateDeck } from "./deckrules";
import { challenge, interact, isWalkable, move, spotter, validateMaps, type Maps, type WorldState } from "./world";

const mini: Maps = {
  a: {
    id: "a",
    name: "A",
    rows: ["TTTTTT", "T..f.T", "T.~..T", "T....T", "TTTTTT"],
    npcs: [
      { id: "bob", name: "Bob", x: 3, y: 3, dir: "left", kind: "trainer", icon: "🧑", lines: ["Fight!"], sight: 3, defeatedLines: ["gg"] },
      { id: "pc", name: "PC", x: 1, y: 1, dir: "down", kind: "pc", icon: "💻", lines: ["boot"] },
    ],
    warps: [{ x: 4, y: 1, to: "b", tx: 1, ty: 1, dir: "down" }],
  },
  b: { id: "b", name: "B", rows: ["###", "#f#", "###"], npcs: [], warps: [] },
};
const fresh = (x: number, y: number, dir: WorldState["dir"] = "down"): WorldState => ({ map: "a", x, y, dir, defeated: [] });

describe("walking", () => {
  it("moves one tile and turns; walls, water, characters and map edges stop the player", () => {
    const s = fresh(2, 1);
    expect(move(mini, s, "right")).toEqual({ moved: true, warped: false });
    expect(s).toMatchObject({ x: 3, y: 1, dir: "right" });
    expect(move(mini, s, "up").moved).toBe(false); // tree
    expect(s.dir).toBe("up"); // still turns
    const t = fresh(2, 1);
    expect(move(mini, t, "down").moved).toBe(false); // water
    const u = fresh(1, 2);
    expect(move(mini, u, "up").moved).toBe(false); // the PC
    const v = fresh(2, 3);
    expect(move(mini, v, "right").moved).toBe(false); // Bob stands at 3,3
    expect(isWalkable(mini.a, -1, 0)).toBe(false);
  });
  it("a warp tile changes map and facing", () => {
    const s = fresh(3, 1);
    expect(move(mini, s, "right")).toEqual({ moved: true, warped: true });
    expect(s).toMatchObject({ map: "b", x: 1, y: 1, dir: "down" });
  });
});

describe("interaction", () => {
  it("talks to who is in front; nothing in front = nothing", () => {
    expect(interact(mini, fresh(1, 2, "up"))).toEqual({ type: "dialog", lines: ["boot"], then: { type: "openDeck" } });
    expect(interact(mini, fresh(2, 1, "down"))).toBeNull();
  });
  it("a trainer challenges, then says something else once beaten", () => {
    const s = fresh(2, 3, "right");
    expect(interact(mini, s)).toEqual(challenge(mini.a.npcs[0]));
    expect(challenge(mini.a.npcs[0])).toMatchObject({ then: { type: "duel", npcId: "bob" } });
    s.defeated.push("bob");
    expect(interact(mini, s)).toEqual({ type: "dialog", speaker: "Bob", lines: ["gg"] });
  });
});

describe("trainers' line of sight", () => {
  it("spots the player in the line they face, within their sight", () => {
    expect(spotter(mini, fresh(1, 3))?.id).toBe("bob"); // 2 tiles to his left
    expect(spotter(mini, fresh(2, 3))?.id).toBe("bob");
    expect(spotter(mini, fresh(2, 1))).toBeNull(); // not in line
  });
  it("does not see beyond obstacles, beyond his sight, or once beaten", () => {
    const wall: Maps = { ...mini, a: { ...mini.a, rows: ["TTTTTT", "T..f.T", "T.~..T", "T.#..T", "TTTTTT"] } };
    expect(spotter(wall, fresh(1, 3))).toBeNull();
    const far: Maps = { ...mini, a: { ...mini.a, npcs: [{ ...mini.a.npcs[0], sight: 1 }] } };
    expect(spotter(far, fresh(1, 3))).toBeNull();
    const beaten = fresh(2, 3);
    beaten.defeated.push("bob");
    expect(spotter(mini, beaten)).toBeNull();
  });
});

describe("the placeholder world", () => {
  it("has valid maps: rectangular, known tiles, characters on free tiles, warps that land well and never loop", () => {
    expect(validateMaps(MAPS, START)).toEqual([]);
  });
  it("catches bad data", () => {
    const bad: Maps = { a: { id: "a", name: "a", rows: ["...", ".."], npcs: [], warps: [{ x: 0, y: 0, to: "zzz", tx: 0, ty: 0 }] } };
    expect(validateMaps(bad, { map: "a", x: 0, y: 0, dir: "down", defeated: [] }).length).toBeGreaterThanOrEqual(2);
  });
  it("can walk from the hamlet to route 1 and back", () => {
    const s: WorldState = { ...START, defeated: [] };
    for (let i = 0; i < 7; i++) move(MAPS, s, "up");
    expect(s.map).toBe("route1");
    for (let i = 0; i < 11; i++) move(MAPS, s, "down");
    expect(s.map).toBe("hamlet");
  });
  it("trainers on route 1 spot the player on the road", () => {
    const s: WorldState = { map: "route1", x: 10, y: 8, dir: "up", defeated: [] };
    expect(spotter(MAPS, s)?.id).toBe("hiker");
  });
  it("every trainer gets a legal 40-card deck, always the same one", () => {
    for (const id of ["hiker", "student", "guard"]) {
      const deck = seededDeck(id);
      expect(validateDeck(deck)).toEqual([]);
      expect(seededDeck(id).map((c) => c.id)).toEqual(deck.map((c) => c.id));
    }
    expect(seededDeck("hiker").map((c) => c.id)).not.toEqual(seededDeck("guard").map((c) => c.id));
  });
});

describe("the introduction", () => {
  it("every starter card gives a legal deck with its General", () => {
    for (const id of STARTER_GENERALS) {
      const deck = starterDeck(id);
      expect(validateDeck(deck)).toEqual([]);
      expect(deck.some((c) => c.id === id)).toBe(true);
    }
  });
  it("Olga's house is reachable from the hamlet and the way back is free", () => {
    const s: WorldState = { map: "hamlet", x: 15, y: 11, dir: "up", defeated: [], flags: {} };
    expect(move(MAPS, s, "up")).toEqual({ moved: true, warped: true });
    expect(s.map).toBe("olga");
    expect(move(MAPS, s, "down").warped).toBe(true); // the door is right below the arrival point
    expect(s).toMatchObject({ map: "hamlet", x: 15, y: 11 });
  });
  it("characters appear and disappear with the story flags", () => {
    const before: WorldState = { map: "hamlet", x: 16, y: 12, dir: "up", defeated: [], flags: {} };
    expect(interact(MAPS, before)).toEqual({ type: "script", id: "olgaOutside" });
    const after: WorldState = { ...before, flags: { olgaMet: true } };
    expect(interact(MAPS, after)).toBeNull();
    const inside: WorldState = { map: "olga", x: 4, y: 4, dir: "up", defeated: [], flags: { olgaMet: true } };
    expect(interact(MAPS, inside)).toEqual({ type: "script", id: "olgaInside" });
    expect(interact(MAPS, { ...inside, flags: {} })).toBeNull();
  });
});
