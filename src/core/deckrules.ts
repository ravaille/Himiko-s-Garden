import type { CardDef, DeckRule, Rank } from "./types";

/** Deck-building rules (docs/design/10-deckbuilding.md). Pure: no DOM, no storage. */
export const DECK_MIN = 40;
export const DECK_MAX = 50;

/** Max copies of the same card, by rank (undefined rank = normal card). */
export function maxCopies(rank?: Rank): number {
  if (rank === "general") return 1;
  if (rank) return 2;
  return 3;
}

/** Max number of cards of each rank in a deck (1 General, 2 Colonels, 4 Lieutenants). */
export const RANK_LIMIT: Record<Rank, number> = { general: 1, colonel: 2, lieutenant: 4 };

export type DeckIssueCode = "too-few" | "too-many" | "copies" | "rank-limit" | "constraint";
export interface DeckIssue {
  code: DeckIssueCode;
  message: string;
}

/** Whether a card satisfies a General's deck rule. */
export function matchesRule(card: CardDef, rule: DeckRule): boolean {
  if (rule.races && !(card.race && rule.races.includes(card.race))) return false;
  if (rule.types && !card.types?.some((t) => rule.types!.includes(t))) return false;
  return true;
}

/** The rule currently constraining the deck (from its General, if any). */
export function activeRule(deck: CardDef[]): DeckRule | undefined {
  return deck.find((c) => c.rank === "general")?.deckRule;
}

/** Checks a deck; returns every problem (empty = legal). */
export function validateDeck(deck: CardDef[]): DeckIssue[] {
  const issues: DeckIssue[] = [];
  if (deck.length < DECK_MIN) issues.push({ code: "too-few", message: `Il manque ${DECK_MIN - deck.length} carte(s) (minimum ${DECK_MIN}).` });
  if (deck.length > DECK_MAX) issues.push({ code: "too-many", message: `${deck.length - DECK_MAX} carte(s) en trop (maximum ${DECK_MAX}).` });

  const counts = new Map<string, { card: CardDef; n: number }>();
  for (const c of deck) {
    const e = counts.get(c.id) ?? { card: c, n: 0 };
    e.n++;
    counts.set(c.id, e);
  }
  for (const { card, n } of counts.values()) {
    if (n > maxCopies(card.rank)) {
      issues.push({ code: "copies", message: `${card.name} : ${n} exemplaires (maximum ${maxCopies(card.rank)}).` });
    }
  }
  for (const rank of Object.keys(RANK_LIMIT) as Rank[]) {
    const n = deck.filter((c) => c.rank === rank).length;
    if (n > RANK_LIMIT[rank]) issues.push({ code: "rank-limit", message: `${n} cartes de grade ${rank} (maximum ${RANK_LIMIT[rank]}).` });
  }
  const rule = activeRule(deck);
  if (rule) {
    for (const c of deck) {
      if (c.rank !== "general" && !matchesRule(c, rule)) {
        issues.push({ code: "constraint", message: `${c.name} ne respecte pas la contrainte du Général.` });
      }
    }
  }
  return issues;
}

/** Can one more copy of `card` be added to `deck`? Returns a reason when it cannot. */
export function canAdd(deck: CardDef[], card: CardDef): { ok: true } | { ok: false; reason: string } {
  if (deck.length >= DECK_MAX) return { ok: false, reason: `Deck plein (${DECK_MAX} cartes).` };
  const copies = deck.filter((c) => c.id === card.id).length;
  if (copies >= maxCopies(card.rank)) return { ok: false, reason: `Maximum ${maxCopies(card.rank)} exemplaire(s).` };
  if (card.rank && deck.filter((c) => c.rank === card.rank).length >= RANK_LIMIT[card.rank]) {
    return { ok: false, reason: `Maximum ${RANK_LIMIT[card.rank]} carte(s) de grade ${card.rank} par deck.` };
  }
  const rule = activeRule(deck);
  if (rule && card.rank !== "general" && !matchesRule(card, rule)) return { ok: false, reason: "Contrainte du Général non respectée." };
  if (card.rank === "general" && card.deckRule) {
    const bad = deck.find((c) => !matchesRule(c, card.deckRule!));
    if (bad) return { ok: false, reason: `${bad.name} ne respecte pas la contrainte de ce Général.` };
  }
  return { ok: true };
}

/**
 * Debug helper: fills `deck` with random legal cards from `pool` up to `size` (default DECK_MIN).
 * Deterministic given the `pick` function (returns a float in [0,1)).
 */
export function autoFill(deck: CardDef[], pool: CardDef[], pick: () => number, size = DECK_MIN): CardDef[] {
  const result = deck.slice();
  let candidates = pool.filter((c) => canAdd(result, c).ok);
  while (result.length < size && candidates.length > 0) {
    const card = candidates[Math.floor(pick() * candidates.length)];
    result.push(card);
    candidates = candidates.filter((c) => canAdd(result, c).ok);
  }
  return result;
}
