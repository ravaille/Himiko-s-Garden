import { BOARD_SIZE, canTarget, drawCard, healUnit, hurtKing, hurtUnit, summonUnit } from "./engine";
import { onEvent } from "./events";
import { nextRandom } from "./rng";
import type { Action, CardDef, Choice, Effect, GameEvent, GameState, Selector, Unit } from "./types";

/**
 * Card effects (docs/design/08-effects-format.md): trigger -> action(s), resolved synchronously on the event bus.
 * Resolution order when several cards react to the same event: the active player's cards left to right,
 * then the opponent's. Effects of cards cannot target ghostly enemy cards; spells can.
 */

/** Where an action comes from: a card on the board (`unit`), or a spell (`unit` null). */
interface Ctx {
  side: 0 | 1;
  slot: number;
  unit: Unit | null;
  /** The target the player picked when casting a spell. */
  chosen: Choice | null;
}

type Ref = { kind: "unit"; side: 0 | 1; unit: Unit } | { kind: "king"; side: 0 | 1 };

function matches(e: Effect, c: Ctx & { unit: Unit }, ev: GameEvent): boolean {
  switch (e.on) {
    case "play":
      return ev.type === "played" && ev.uid === c.unit.uid;
    case "turnStart":
      return ev.type === "turnStart" && ev.side === c.side;
    case "attack":
      return ev.type === "attack" && ev.uid === c.unit.uid;
    case "damaged":
      return ev.type === "damaged" && ev.uid === c.unit.uid;
    case "death":
      return ev.type === "died" && ev.uid === c.unit.uid;
    case "allyDeath":
      return ev.type === "died" && ev.side === c.side && ev.uid !== c.unit.uid;
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
  }
}

const units = (state: GameState, side: 0 | 1): Unit[] => state.players[side].board.filter((u): u is Unit => u !== null);

function findByUid(state: GameState, uid: number): Ref | null {
  for (const side of [0, 1] as const) {
    const unit = units(state, side).find((u) => u.uid === uid);
    if (unit) return { kind: "unit", side, unit };
  }
  return null;
}

function resolve(state: GameState, c: Ctx, sel: Selector, ev: GameEvent | null): Ref[] {
  const foe = c.side === 0 ? 1 : 0;
  const mine = state.players[c.side];
  // Ghostly enemies are out of reach of card effects, but not of spells.
  const targetable = () => units(state, foe).filter((u) => !c.unit || canTarget(c.unit, u));
  const asRefs = (side: 0 | 1, list: Unit[]): Ref[] => list.map((unit) => ({ kind: "unit", side, unit }));
  switch (sel) {
    case "self":
      return c.unit ? [{ kind: "unit", side: c.side, unit: c.unit }] : [];
    case "chosen": {
      const ch = c.chosen;
      if (!ch) return [];
      if (ch.kind === "king") return [{ kind: "king", side: ch.side }];
      const u = state.players[ch.side].board[ch.slot];
      return u ? [{ kind: "unit", side: ch.side, unit: u }] : [];
    }
    case "facing": {
      const u = c.unit ? state.players[foe].board[c.slot] : null;
      return u && canTarget(c.unit!, u) ? asRefs(foe, [u]) : [];
    }
    case "enemies":
      return asRefs(foe, targetable());
    case "allies":
      return asRefs(c.side, units(state, c.side).filter((u) => u !== c.unit));
    case "adjacent":
      return c.unit ? asRefs(c.side, [c.slot - 1, c.slot + 1].map((s) => mine.board[s]).filter((u): u is Unit => !!u)) : [];
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
      if (!ev || ev.type !== "damaged" || ev.sourceUid === null) return [];
      const r = findByUid(state, ev.sourceUid);
      return r ? [r] : [];
    }
  }
}

function apply(state: GameState, c: Ctx, action: Action, ev: GameEvent | null): void {
  switch (action.kind) {
    case "damage":
      for (const r of resolve(state, c, action.to, ev)) {
        if (state.winner !== null) return;
        if (r.kind === "king") hurtKing(state, r.side, action.amount);
        else hurtUnit(state, r.side, r.unit, action.amount, c.unit);
      }
      return;
    case "destroy":
      for (const r of resolve(state, c, action.to, ev)) {
        if (r.kind === "unit") hurtUnit(state, r.side, r.unit, Math.max(1, r.unit.hp), c.unit);
      }
      return;
    case "heal":
      for (const r of resolve(state, c, action.to, ev)) {
        if (r.kind === "king") state.players[r.side].kingHp += action.amount;
        else healUnit(state, r.side, r.unit, action.amount);
      }
      return;
    case "buff":
      for (const r of resolve(state, c, action.to, ev)) {
        if (r.kind !== "unit") continue;
        r.unit.attack += action.attack ?? 0;
        r.unit.maxHp += action.hp ?? 0;
        r.unit.hp += action.hp ?? 0;
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
  const ctx: Ctx = { side, slot: -1, unit: null, chosen };
  for (const action of def.spell?.do ?? []) {
    if (state.winner !== null) return;
    apply(state, ctx, action, null);
  }
}

/** The event-bus handler: lets every card react to `ev`. */
function runEffects(state: GameState, ev: GameEvent): void {
  const carriers: (Ctx & { unit: Unit })[] = [];
  const order: (0 | 1)[] = state.current === 0 ? [0, 1] : [1, 0];
  for (const side of order) {
    for (let slot = 0; slot < BOARD_SIZE; slot++) {
      const unit = state.players[side].board[slot];
      if (unit) carriers.push({ side, slot, unit, chosen: null });
      // A card that just died is already off the board but must still resolve its own "death" effects.
      else if (ev.type === "died" && ev.side === side && ev.slot === slot) carriers.push({ side, slot, unit: ev.unit, chosen: null });
    }
  }
  for (const c of carriers) {
    const effects = c.unit.def.effects;
    if (!effects) continue;
    for (const e of effects) {
      if (state.winner !== null) return;
      const alive = state.players[c.side].board[c.slot] === c.unit;
      if (!alive && e.on !== "death") continue;
      if (matches(e, c, ev)) for (const action of e.do) apply(state, c, action, ev);
    }
  }
}

onEvent(runEffects);
