// Headless balance simulation: random decks from the test pool, baseline AI on both sides.
// Usage: npm run sim [-- <duels>]
import { playDuel } from "../src/core/ai";
import { buildRandomDeck } from "../src/core/deck";
import { newGame } from "../src/core/engine";
import { TEST_POOL } from "../src/data/cards";

const N = Number(process.argv[2] ?? 2000);
const holder = { rngState: 12345 };

let firstWins = 0;
let secondWins = 0;
let draws = 0;
let rounds: number[] = [];
let attacks: number[] = [];
const perCard = new Map<string, { games: number; wins: number }>();

for (let i = 0; i < N; i++) {
  const decks: [typeof TEST_POOL, typeof TEST_POOL] = [
    buildRandomDeck(TEST_POOL, holder),
    buildRandomDeck(TEST_POOL, holder),
  ];
  const r = playDuel(newGame(decks, i + 1));
  if (r.winner === 0) firstWins++;
  else if (r.winner === 1) secondWins++;
  else draws++;
  rounds.push(r.rounds);
  attacks.push(r.attacks);
  decks.forEach((deck, side) => {
    for (const id of new Set(deck.map((c) => c.id))) {
      const e = perCard.get(id) ?? { games: 0, wins: 0 };
      e.games++;
      if (r.winner === side) e.wins++;
      perCard.set(id, e);
    }
  });
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (n: number) => `${((100 * n) / N).toFixed(1)}%`;
rounds = rounds.sort((a, b) => a - b);
const median = rounds[Math.floor(rounds.length / 2)];
const p90 = rounds[Math.floor(rounds.length * 0.9)];
const estSeconds = avg(attacks) * 0.8 + avg(rounds) * 2 * 5; // 0.8s/attack animation + ~5s pose per turn

console.log(`\n=== ${N} duels ===`);
console.log(`Premier joueur : ${pct(firstWins)} | Second : ${pct(secondWins)} | Nuls : ${pct(draws)}`);
console.log(`Manches (1 manche = 1 tour chacun) : moy ${avg(rounds).toFixed(1)}, médiane ${median}, p90 ${p90}, max ${rounds[rounds.length - 1]}`);
console.log(`Attaques par duel : moy ${avg(attacks).toFixed(0)}`);
console.log(`Durée estimée (grossière) : ~${(estSeconds / 60).toFixed(1)} min\n`);

console.log("Taux de victoire par carte (decks la contenant) :");
const rows = [...perCard.entries()]
  .map(([id, e]) => ({ id, rate: (100 * e.wins) / e.games, games: e.games }))
  .sort((a, b) => b.rate - a.rate);
const name = (id: string) => TEST_POOL.find((c) => c.id === id)!;
for (const r of rows) {
  const c = name(r.id);
  console.log(`${r.rate.toFixed(1).padStart(5)}%  ${c.name.padEnd(20)} cost ${c.cost} ${c.personality.padEnd(10)} ${c.attack}/${c.hp}`);
}
