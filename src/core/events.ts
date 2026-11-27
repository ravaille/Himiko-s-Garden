import type { GameEvent, GameState } from "./types";

/**
 * Event bus (docs/design/07-keywords-and-effects.md, "Déclencheurs").
 * The engine emits an event for everything that matters; card effects (step 3) subscribe through `onEvent`.
 * Handlers run synchronously, so chains (a death triggering another death...) resolve immediately.
 */
export type EventHandler = (state: GameState, ev: GameEvent) => void;

/** Safety net against infinite loops: max handled events per outermost emit (≈ 200, see 08-effects-format.md). */
export const MAX_CHAIN = 200;

const handlers: EventHandler[] = [];
const settledHandlers: ((state: GameState) => void)[] = [];
let chain = 0; // events handled in the current outermost emit
let depth = 0;

/** Registers a handler; returns an unsubscribe function. */
export function onEvent(handler: EventHandler): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}

/** Registers a function run once the whole chain of an outermost emit is over (used to recompute passive auras). */
export function onSettled(fn: (state: GameState) => void): void {
  settledHandlers.push(fn);
}

/** Records the event in `state.trace`, then lets every handler react (unless the chain is too long). */
export function emit(state: GameState, ev: GameEvent): void {
  state.trace.push(ev);
  if (depth === 0) chain = 0;
  if (chain >= MAX_CHAIN) return;
  chain++;
  depth++;
  try {
    for (const h of handlers.slice()) h(state, ev);
  } finally {
    depth--;
  }
  if (depth === 0) for (const fn of settledHandlers) fn(state);
}
