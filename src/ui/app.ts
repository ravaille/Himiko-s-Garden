import { poseAI } from "../core/ai";
import { buildRandomDeck } from "../core/deck";
import { BOARD_SIZE, actionPhase, beginTurn, endTurn, newGame, offer, playCard } from "../core/engine";
import type { GameState } from "../core/types";
import { TEST_POOL } from "../data/cards";
import { cardHtml } from "./card";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let root: HTMLElement;
let game: GameState;
let selected: number | null = null;
let busy = false;
let message = "";
let speed = 1; // 1 = normal, 2 = fast

const HUMAN = 0;

export function startGame(el: HTMLElement): void {
  root = el;
  root.onclick = onClick;
  newDuel();
}

function newDuel(): void {
  const h = { rngState: (Date.now() & 0xffffffff) >>> 0 };
  game = newGame([buildRandomDeck(TEST_POOL, h), buildRandomDeck(TEST_POOL, h)], h.rngState + 1);
  selected = null;
  busy = false;
  beginTurn(game); // the human plays first
  message = "À toi : pose des cartes, ou sacrifie-en une pour gagner de l'énergie.";
  render();
}

// ------------------------------------------------------------------ rendering

function boardHtml(side: 0 | 1): string {
  const p = game.players[side];
  let cells = "";
  for (let i = 0; i < BOARD_SIZE; i++) {
    const u = p.board[i];
    const centre = i >= 2 && i <= 4 ? " centre" : "";
    const wait = u && u.deployedOn >= p.turnsPlayed ? " deploying" : "";
    cells += `<div class="slot${centre}${wait}" data-side="${side}" data-slot="${i}">${u ? cardHtml(u.def, u.hp) : ""}${wait ? '<span class="zzz">💤</span>' : ""}</div>`;
  }
  return `<div class="board">${cells}</div>`;
}

function kingHtml(side: 0 | 1): string {
  const p = game.players[side];
  const pct = Math.max(0, Math.round((100 * p.kingHp) / 150));
  const who = side === HUMAN ? "👑 Toi" : "👹 Adversaire";
  return `<div class="king" data-side="${side}" data-king="1">
    <b>${who}</b>
    <div class="bar"><div style="width:${pct}%"></div></div>
    <span>♥ ${Math.max(0, p.kingHp)}</span>
    <span>⚡ ${p.energy}/${p.maxEnergy}</span>
    <span>🃏 ${p.hand.length}</span><span>📚 ${p.deck.length}</span>
  </div>`;
}

function render(): void {
  const me = game.players[HUMAN];
  const myTurn = game.current === HUMAN && !busy && game.winner === null;
  const hand = me.hand
    .map((c, i) => {
      const dim = c.cost > me.energy ? " dim" : "";
      const sel = selected === i ? " selected" : "";
      return `<div class="handcard${dim}${sel}" data-hand="${i}">${cardHtml(c)}</div>`;
    })
    .join("");
  const canOffer = myTurn && selected !== null && !me.offered;
  const over = game.winner !== null;
  const result = game.winner === HUMAN ? "🏆 Victoire !" : game.winner === "draw" ? "🤝 Égalité" : "💀 Défaite";

  root.innerHTML = `
    <header><h1>Himiko's Garden <small>prototype</small></h1>
      <button data-act="speed">Vitesse ×${speed}</button></header>
    ${kingHtml(1)}
    ${boardHtml(1)}
    <div class="vs">⚔ VS ⚔</div>
    ${boardHtml(0)}
    ${kingHtml(0)}
    <div class="msg">${message}</div>
    <div class="actions">
      <button data-act="offer" ${canOffer ? "" : "disabled"}>🔥 Sacrifier la carte (+1⚡)${me.offered ? " — déjà fait ce tour" : ""}</button>
      <button data-act="end" class="primary" ${myTurn ? "" : "disabled"}>Fin du tour ▶</button>
    </div>
    <div class="hand">${hand}</div>
    ${over ? `<div class="overlay"><div><h2>${result}</h2><button data-act="again" class="primary">Rejouer</button></div></div>` : ""}`;
}

// ---------------------------------------------------------------- interaction

function onClick(e: MouseEvent): void {
  const t = e.target as HTMLElement;
  const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
  if (act === "again") return newDuel();
  if (act === "speed") {
    speed = speed === 1 ? 2 : 1;
    return render();
  }
  if (busy || game.current !== HUMAN || game.winner !== null) return;
  const me = game.players[HUMAN];

  if (act === "offer" && selected !== null && !me.offered) {
    const c = me.hand[selected];
    offer(game, selected);
    message = `Offrande : ${c.name} est sacrifiée (+${c.offering ?? 1}⚡ permanent).`;
    selected = null;
    return render();
  }
  if (act === "end") return void endPlayerTurn();

  const handEl = t.closest<HTMLElement>("[data-hand]");
  if (handEl) {
    const i = Number(handEl.dataset.hand);
    selected = selected === i ? null : i;
    return render();
  }
  const slotEl = t.closest<HTMLElement>('.slot[data-side="0"]');
  if (slotEl && selected !== null) {
    try {
      const c = me.hand[selected];
      playCard(game, selected, Number(slotEl.dataset.slot));
      message = `${c.name} est posée. Elle agira au prochain tour.`;
      selected = null;
    } catch (err) {
      message = `⚠️ ${(err as Error).message === "Not enough energy" ? "Pas assez d'énergie." : "Case indisponible."}`;
    }
    render();
  }
}

async function animateAttacks(): Promise<void> {
  const events = game.events;
  for (const ev of events) {
    const fromEl = root.querySelector(`.slot[data-side="${ev.side}"][data-slot="${ev.from}"]`);
    const toEl =
      ev.to === "king"
        ? root.querySelector(`.king[data-side="${ev.side === 0 ? 1 : 0}"]`)
        : root.querySelector(`.slot[data-side="${ev.side === 0 ? 1 : 0}"][data-slot="${ev.to}"]`);
    fromEl?.classList.add("attacking");
    toEl?.classList.add("hit");
    if (toEl) {
      const f = document.createElement("span");
      f.className = "float";
      f.textContent = `-${ev.damage}${ev.killed ? " ☠" : ""}`;
      toEl.appendChild(f);
    }
    await sleep(520 / speed);
    fromEl?.classList.remove("attacking");
    toEl?.classList.remove("hit");
    toEl?.querySelector(".float")?.remove();
  }
}

async function endPlayerTurn(): Promise<void> {
  busy = true;
  selected = null;
  message = "Tes cartes passent à l'attaque…";
  render();
  actionPhase(game);
  await animateAttacks();
  if (game.winner === null) endTurn(game);
  if (game.winner === null) {
    // Opponent turn
    beginTurn(game);
    poseAI(game);
    message = "L'adversaire pose ses cartes…";
    render();
    await sleep(900 / speed);
    actionPhase(game);
    message = "L'adversaire attaque !";
    render();
    await animateAttacks();
    if (game.winner === null) endTurn(game);
  }
  if (game.winner === null) {
    beginTurn(game);
    message = "À toi de jouer.";
  }
  busy = false;
  render();
}
