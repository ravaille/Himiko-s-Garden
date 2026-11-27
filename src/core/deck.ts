import { nextRandom } from "./rng";
import type { CardDef } from "./types";

/** Cost curve for a 30-card deck: number of cards at cost 1..6. */
export const DEFAULT_CURVE = [6, 6, 6, 5, 4, 3];

/** Random deck following a cost curve, max 3 copies per card. */
export function buildRandomDeck(
  pool: CardDef[],
  holder: { rngState: number },
  curve: number[] = DEFAULT_CURVE,
): CardDef[] {
  const deck: CardDef[] = [];
  curve.forEach((count, i) => {
    const options = pool.filter((c) => c.cost === i + 1);
    const copies = new Map<string, number>();
    while (options.length > 0 && deck.filter((c) => c.cost === i + 1).length < count) {
      const card = options[Math.floor(nextRandom(holder) * options.length)];
      const n = copies.get(card.id) ?? 0;
      if (n < 3) {
        copies.set(card.id, n + 1);
        deck.push(card);
      }
    }
  });
  return deck;
}
