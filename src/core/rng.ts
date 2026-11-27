/** Seeded RNG (mulberry32). Mutates `holder.rngState`; keeps game state serializable. */
export function nextRandom(holder: { rngState: number }): number {
  holder.rngState = (holder.rngState + 0x6d2b79f5) >>> 0;
  let t = holder.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function shuffle<T>(items: T[], holder: { rngState: number }): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(holder) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
