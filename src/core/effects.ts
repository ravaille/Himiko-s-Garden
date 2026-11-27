import { BOARD_SIZE, canTarget, drawCard, healUnit, hurtBuilding, hurtKing, hurtUnit, kw, summonUnit } from "./engine";
import { onEvent } from "./events";
import { nextRandom } from "./rng";
import type { Action, Building, CardDef, Choice, Effect, GameEvent, GameState, Selector, Unit } from "./types";

/**
 * Card effects (docs/design/08-effects-format.md): trigger -> action(s), resolved synchronously on the event bus.
 * Resolution order when several cards react to the same event: the active player's cards left to right
 * (a card, then the building on its slot), then the opponent's. Effects of cards and buildings cannot target
 * ghostly enemy cards; spells can.
 */

/** Where an action comes from: a card or a building on the board, or a spell. */
interface Ctx {
  side: 0 | 1;
  slot: number;
  unit: Unit | null;
  building: Building | null;
  spell: boolean;
  /** The target the player picked when casting a spell. */
  chosen: Choice | null;
}

type Ref =
  | { kind: "unit"; side: 0 | 1; unit: Unit }
  | { kind: "building"; side: 0 | 1; slot: number; building: Building }
  | { kind: "king"; side: 0 | 1 };

function matches(e: Effect, c: Ctx, ev: GameEvent): boolean {
  const uid = c.unit?.uid ?? c.building?.uid;
  switch (e.on) {
    case "play":
      return (ev.type === "played" || ev.type === "buildingPlaced") && ev.uid === uid;
    case "turnStart":
      return ev.type === "turnStart" && ev.side === c.side;
    case "attack":
      return ev.type === "attack" && ev.uid === uid;
    case "damaged":
      return ev.type === "damaged" && ev.uid === uid;
    case "death":
      return (ev.type === "died" || ev.type === "buildingDestroyed") && ev.uid === uid;
    case "allyDeath":
      return ev.type === "died" && ev.side === c.side && ev.uid !== uid;
    case "enemyDeath":
      return ev.type === "died" && ev.side !== c.side;
    case "kingHit":
      return ev.type === "kingHit" && ev.side === c.side;
    case "draw":
      return ev.type === "draw" && !ev.failed && ev.side === c.side;
    case "sacrifice":
      return ev.type === "sacrificed" && ev.side === c.side;
    case "spell":
      return ev.type === "spell" && ev.side === c.side;
    case "anySpell":
      return ev.type === "spell";
    case "slotAttacked":
      return !!c.building && ev.type === "attack" && ev.side !== c.side && ev.target === c.slot;
  }
}

const units = (state: GameState, side: 0 | 1): Unit[] => state.players[side].board.filter((u): u is Unit => u !== null);
const buildings = (state: GameState, side: 0 | 1): Ref[] =>
  state.players[side].buildings.flatMap((b, slot) => (b ? [{ kind: "building" as const, side, slot, building: b }] : []));

function findByUid(state: GameState, uid: number): Ref | null {
  for (const side of [0, 1] as const) {
    const unit = units(state, side).find((u) => u.uid === uid);
    if (unit) return { kind: "unit", side, unit };
  }
  return null;
}

/** `withBuildings`: "all enemies" selectors also reach buildings when damaging or destroying (area spells hit them). */
function resolve(state: GameState, c: Ctx, sel: Selector, ev: GameEvent | null, withBuildings = false): Ref[] {
  const foe = c.side === 0 ? 1 : 0;
  const mine = state.players[c.side];
  // Ghostly enemies are out of reach of card and building effects, but not of spells.
  const reach = (u: Unit) => c.spell || (c.unit ? canTarget(c.unit, u) : !kw(u).ghostly);
  const targetable = () => units(state, foe).filter(reach);
  const asRefs = (side: 0 | 1, list: Unit[]): Ref[] => list.map((unit) => ({ kind: "unit", side, unit }));
  switch (sel) {
    case "self":
      if (c.unit) return [{ kind: "unit", side: c.side, unit: c.unit }];
      return c.building ? [{ kind: "building", side: c.side, slot: c.slot, building: c.building }] : [];
    case "slotUnit": {
      const u = c.unit ?? (c.slot >= 0 ? mine.board[c.slot] : null);
      return u ? asRefs(c.side, [u]) : [];
    }
    case "chosen": {
      const ch = c.chosen;
      if (!ch) return [];
      if (ch.kind === "king") return [{ kind: "king", side: ch.side }];
      if (ch.kind === "building") {
        const b = state.players[ch.side].buildings[ch.slot];
        return b ? [{ kind: "building", side: ch.side, slot: ch.slot, building: b }] : [];
      }
      const u = state.players[ch.side].board[ch.slot];
      return u ? [{ kind: "unit", side: ch.side, unit: u }] : [];
    }
    case "facing": {
      const u = c.slot >= 0 ? state.players[foe].board[c.slot] : null;
      return u && reach(u) ? asRefs(foe, [u]) : [];
    }
    case "enemies":
      return [...asRefs(foe, targetable()), ...(withBuildings ? buildings(state, foe) : [])];
    case "allies":
      return asRefs(c.side, units(state, c.side).filter((u) => u !== c.unit));
    case "adjacent":
      return c.slot >= 0 ? asRefs(c.side, [c.slot - 1, c.slot + 1].map((s) => mine.board[s]).filter((u): u is Unit => !!u)) : [];
    case "randomEnemy": {
      const list = targetable();
      return list.length ? asRefs(foe, [list[Math.floor(nextRandom(state) * list.length)]]) : [];
    }
    case "strongestEnemy": {
      const best = targetable().sort((a, b) => b.hp - a.hp || b.attack - a.attack)[0];
      return best ? asRefs(foe, [best]) : [];
    }
    case "enemyKing":
      return [{ kind: "king", side: foe }];
    case "ownKing":
      return [{ kind: "king", side: c.side }];
    case "source": {
      const uid = ev?.type === "damaged" ? ev.sourceUid : ev?.type === "attack" ? ev.uid : null;
      const r = uid === null || uid === undefined ? null : findByUid(state, uid);
      return r ? [r] : [];
    }
  }
}

function apply(state: GameState, c: Ctx, action: Action, ev: GameEvent | null): void {
  switch (action.kind) {
    case "damage":
      for (const r of resolve(state, c, action.to, ev, action.to === "enemies")) {
        if (state.winner !== null) return;
        if (r.kind === "king") hurtKing(state, r.side, action.amount);
        else if (r.kind === "building") hurtBuilding(state, r.side, r.building, action.amount);
        else hurtUnit(state, r.side, r.unit, action.amount, c.unit);
      }
      return;
    case "destroy":
      for (const r of resolve(state, c, action.to, ev, action.to === "enemies")) {
        if (r.kind === "unit") hurtUnit(state, r.side, r.unit, Math.max(1, r.unit.hp), c.unit);
        else if (r.kind === "building") hurtBuilding(state, r.side, r.building, Math.max(1, r.building.hp));
      }
      return;
    case "heal":
      for (const r of resolve(state, c, action.to, ev)) {
        if (r.kind === "king") state.players[r.side].kingHp += action.amount;
        else if (r.kind === "building") r.building.hp = Math.min(r.building.maxHp, r.building.hp + action.amount);
        else healUnit(state, r.side, r.unit, action.amount);
      }
      return;
    case "buff":
      for (const r of resolve(state, c, action.to, ev)) {
        if (r.kind === "unit") {
          r.unit.attack += action.attack ?? 0;
          r.unit.maxHp += action.hp ?? 0;
          r.unit.hp += action.hp ?? 0;
        } else if (r.kind === "building") {
          r.building.maxHp += action.hp ?? 0;
          r.building.hp += action.hp ?? 0;
        }
      }
      return;
    case "draw":
      for (let i = 0; i < action.count && state.winner === null; i++) drawCard(state, c.side);
      return;
    case "energy":
      state.players[c.side].energy += action.amount;
      return;
    case "summon":
      for (let i = 0; i < (action.count ?? 1); i++) summonUnit(state, c.side, action.card);
      return;
  }
}

/** Resolves a spell's actions for `side` (the engine moves the card and emits the `spell` event). */
export function castSpell(state: GameState, side: 0 | 1, def: CardDef, chosen: Choice | null): void {
  const ctx: Ctx = { side, slot: -1, unit: null, building: null, spell: true, chosen };
  for (const action of def.spell?.do ?? []) {
    if (state.winner !== null) return;
    apply(state, ctx, action, null);
  }
}

/** The event-bus handler: lets every card and building react to `ev`. */
function runEffects(state: GameState, ev: GameEvent): void {
  const carriers: Ctx[] = [];
  const order: (0 | 1)[] = state.current === 0 ? [0, 1] : [1, 0];
  const base = (side: 0 | 1, slot: number) => ({ side, slot, spell: false, chosen: null });
  for (const side of order) {
    const p = state.players[side];
    for (let slot = 0; slot < BOARD_SIZE; slot++) {
      const unit = p.board[slot];
      if (unit) carriers.push({ ...base(side, slot), unit, building: null });
      // A card that just died is already off the board but must still resolve its own "death" effects.
      else if (ev.type === "died" && ev.side === side && ev.slot === slot) carriers.push({ ...base(side, slot), unit: ev.unit, building: null });
      const building = p.buildings[slot];
      if (building) carriers.push({ ...base(side, slot), unit: null, building });
      else if (ev.type === "buildingDestroyed" && ev.side === side && ev.slot === slot) carriers.push({ ...base(side, slot), unit: null, building: ev.building });
    }
  }
  for (const c of carriers) {
    const effects = (c.unit ?? c.building)!.def.effects;
    if (!effects) continue;
    for (const e of effects) {
      if (state.winner !== null) return;
      const p = state.players[c.side];
      const alive = c.unit ? p.board[c.slot] === c.unit : p.buildings[c.slot] === c.building;
      if (!alive && e.on !== "death") continue;
      if (matches(e, c, ev)) for (const action of e.do) apply(state, c, action, ev);
    }
  }
}

onEvent(runEffects);
