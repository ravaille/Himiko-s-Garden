import { describe, expect, it } from "vitest";
import { advance, choose, fill, newStory, start, type Output, type Step } from "./story";

const run = (steps: Step[], pick = 0) => {
  const s = newStory();
  const r = start(steps);
  const seen: Output[] = [];
  for (let o = advance(r, s); o; o = advance(r, s)) {
    seen.push(o);
    if (o.t === "choice") choose(r, o, pick);
  }
  return { s, seen };
};

describe("scenes", () => {
  it("plays lines in order and applies silent steps (flags, money, objective)", () => {
    const { s, seen } = run([
      { t: "say", who: "Maman", text: "Salut" },
      { t: "gold", amount: 200 },
      { t: "set", flag: "met" },
      { t: "objective", text: "Aller voir Olga" },
      { t: "say", text: "Fin" },
    ]);
    expect(seen.map((o) => o.t)).toEqual(["say", "say"]);
    expect(s).toMatchObject({ money: 250, objective: "Aller voir Olga", flags: { met: true } });
  });
  it("a choice runs only the picked branch, then the scene goes on", () => {
    const steps: Step[] = [
      { t: "choice", options: [{ label: "ok", then: [] }, { label: "pourquoi ?", then: [{ t: "say", text: "Parce que." }] }] },
      { t: "say", text: "Après" },
    ];
    expect(run(steps, 0).seen.map((o) => (o.t === "say" ? o.text : o.t))).toEqual(["choice", "Après"]);
    expect(run(steps, 1).seen.map((o) => (o.t === "say" ? o.text : o.t))).toEqual(["choice", "Parce que.", "Après"]);
  });
  it("conditions read flags and counters", () => {
    const steps: Step[] = [
      { t: "add", flag: "duels", by: 1 },
      { t: "add", flag: "duels", by: 1 },
      { t: "if", flag: "duels", min: 2, then: [{ t: "say", text: "refuse" }], else: [{ t: "say", text: "accepte" }] },
    ];
    expect(run(steps).seen).toEqual([{ t: "say", text: "refuse" }]);
  });
  it("prompts and cuts are handed to the UI; money never goes below 0; {name} is filled", () => {
    const { s, seen } = run([{ t: "cut", text: "…" }, { t: "prompt", kind: "name" }, { t: "gold", amount: -999 }]);
    expect(seen.map((o) => o.t)).toEqual(["cut", "prompt"]);
    expect(s.money).toBe(0);
    expect(fill("Salut {name}", { ...s, name: "Aki" })).toBe("Salut Aki");
  });
});
