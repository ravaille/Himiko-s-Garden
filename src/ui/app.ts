import { poseAI } from "../core/ai";
import { buildRandomDeck } from "../core/deck";
import { BOARD_SIZE, actionPhase, beginTurn, endTurn, giveOrder, isDeploying, newGame, offer, orderTargets, playCard, previewTargets, spellTargets } from "../core/engine";
import type { CardDef, Choice, GameState } from "../core/types";
import { TEST_POOL } from "../data/cards";
import { cardHtml } from "./card";
import { currentDeck, deckbuilderClick, deckbuilderFilter, deckbuilderHtml, duelBlockers } from "./deckbuilder";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let root: HTMLElement;
let game: GameState;
let selected: number | null = null;
/** Slot of the Strategist the player is giving an order to (waiting for a target click), if any. */
let ordering: number | null = null;
let busy = false;
let message = "";
let speed = 1; // 1 = normal, 2 = fast
let modal: { title: string; cards: CardDef[] } | null = null;
let screen: "deck" | "duel" = "deck";
let menuOpen = false;

/** Fixed opponent deck for now (docs/design/10-deckbuilding.md: the enemy keeps a base deck). */
const ENEMY_DECK = buildRandomDeck(TEST_POOL, { rngState: 20260101 });

const HUMAN = 0;

export function startGame(el: HTMLElement): void {
  root = el;
  root.onclick = onClick;
  root.onmouseover = onHover;
  root.onmouseleave = clearPreview;
  root.oninput = onFilter;
  root.onchange = onFilter;
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      menuOpen = !menuOpen;
      render();
    }
  });
  render(); // opens on the deck-building screen
}

function onFilter(e: Event): void {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  if (screen !== "deck" || !deckbuilderFilter(el)) return;
  const key = el.dataset.filter;
  const caret = el instanceof HTMLInputElement ? el.selectionStart : null;
  render();
  const again = root.querySelector<HTMLInputElement>(`[data-filter="${key}"]`);
  if (again && key === "text") {
    again.focus();
    if (caret !== null) again.setSelectionRange(caret, caret);
  }
}

function menuHtml(): string {
  if (!menuOpen) return "";
  const blockers = duelBlockers();
  return `<div class="overlay" data-act="menu-bg"><div class="menu">
    <h2>Menu</h2>
    <button data-act="menu-resume">Reprendre</button>
    <button data-act="menu-deck">🃏 Deck-building</button>
    <button data-act="menu-duel" ${blockers.length ? "disabled" : ""} title="${blockers.join(" ")}">⚔ Nouveau duel</button>
  </div></div>`;
}

function newDuel(): void {
  const h = { rngState: (Date.now() & 0xffffffff) >>> 0 };
  game = newGame([currentDeck(), ENEMY_DECK.slice()], h.rngState + 1);
  screen = "duel";
  menuOpen = false;
  selected = null;
  ordering = null;
  modal = null;
  busy = false;
  beginTurn(game); // the human plays first
  message = "À toi : pose des cartes, ou sacrifie-en une pour gagner de l'énergie.";
  render();
}

// ------------------------------------------------------------------ rendering

/** Highlighted targets: for a selected targeted spell, or for the Strategist being ordered. */
function validTargets(): Choice[] {
  if (ordering !== null) {
    const u = game.players[HUMAN].board[ordering];
    return u ? orderTargets(game, HUMAN, u) : [];
  }
  const c = selected !== null ? game.players[HUMAN].hand[selected] : undefined;
  return c && c.kind === "spell" ? spellTargets(game, HUMAN, c) : [];
}

/** Enemy slots / king currently marked by one of the player's Strategist orders. */
function orderMarks(): { slots: Set<number>; king: boolean } {
  const slots = new Set<number>();
  let king = false;
  const foe = game.players[1];
  for (const u of game.players[HUMAN].board) {
    const o = u?.order;
    if (!o) continue;
    if (o.kind === "king") king = true;
    else {
      const uids = o.kind === "unit" ? foe.board.map((x) => x?.uid) : foe.buildings.map((b) => b?.uid);
      const i = uids.indexOf(o.uid);
      if (i >= 0) slots.add(i);
    }
  }
  return { slots, king };
}

/** Which target a click means. On a slot with both a card and a building, the legal one wins (the banner forces the building). */
function pickChoice(t: HTMLElement, legal: Choice[]): Choice | undefined {
  const anySlot = t.closest<HTMLElement>(".slot");
  const kingEl = t.closest<HTMLElement>(".king");
  if (!anySlot && !kingEl) return undefined;
  const side = Number((anySlot ?? kingEl)!.dataset.side) as 0 | 1;
  const slotNo = Number(anySlot?.dataset.slot);
  const candidates: Choice[] = kingEl
    ? [{ kind: "king", side }]
    : t.closest(".bld")
      ? [{ kind: "building", side, slot: slotNo }]
      : [{ kind: "unit", side, slot: slotNo }, { kind: "building", side, slot: slotNo }];
  const same = (a: Choice, b: Choice) => a.kind === b.kind && a.side === b.side && (a.kind === "king" || (b.kind !== "king" && a.slot === b.slot));
  return candidates.find((c) => legal.some((l) => same(l, c))) ?? candidates[0];
}

function boardHtml(side: 0 | 1): string {
  const p = game.players[side];
  const valid = validTargets();
  const marks = side === 1 ? orderMarks() : null;
  let cells = "";
  for (let i = 0; i < BOARD_SIZE; i++) {
    const u = p.board[i];
    const centre = i >= 2 && i <= 4 ? " centre" : "";
    const wait = u && isDeploying(p, u) ? " deploying" : "";
    const ok = valid.some((t) => t.kind === "unit" && t.side === side && t.slot === i) ? " valid" : "";
    const b = p.buildings[i];
    const bOk = valid.some((t) => t.kind === "building" && t.side === side && t.slot === i) ? " valid" : "";
    const bld = b ? `<div class="bld${bOk}" data-bld="1" title="${b.def.name} : ${b.def.text ?? ""}">🏯 ${b.def.name} ♥${b.hp}</div>` : "";
    const marked = marks?.slots.has(i) ? " ordered" : "";
    const ordersNow = side === HUMAN && ordering === i ? " ordering" : "";
    cells += `<div class="slot${centre}${wait}${ok}${marked}${ordersNow}" data-side="${side}" data-slot="${i}">${u ? cardHtml(u.def, u.hp, u.attack, u.maxHp) : ""}${bld}${wait ? '<span class="zzz">💤</span>' : ""}</div>`;
  }
  return `<div class="board">${cells}</div>`;
}

function kingHtml(side: 0 | 1): string {
  const p = game.players[side];
  const pct = Math.min(100, Math.max(0, Math.round((100 * p.kingHp) / 150)));
  const who = side === HUMAN ? "👑 Toi" : "👹 Adversaire";
  const ok = validTargets().some((t) => t.kind === "king" && t.side === side) ? " valid" : "";
  const marked = side === 1 && orderMarks().king ? " ordered" : "";
  return `<div class="king${ok}${marked}" data-side="${side}" data-king="1">
    <b>${who}</b>
    <div class="bar"><div style="width:${pct}%"></div></div>
    <span>♥ ${Math.max(0, p.kingHp)}</span>
    <span>⚡ ${p.energy}/${p.maxEnergy}</span>
    <span>🃏 ${p.hand.length}</span>
    <span class="chip">📚 ${p.deck.length}</span>
    <span class="chip link" data-pile="grave${side}">⚰️ ${p.graveyard.length}</span>
  </div>`;
}

function render(): void {
  if (screen === "deck") {
    root.innerHTML = deckbuilderHtml() + menuHtml();
    return;
  }
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
    <div class="hint" id="hint"></div>
    <div class="bottom">
      <div class="pile grave" data-pile="grave0" title="Cimetière (clique pour voir)">
        <div class="pilecard">⚰️</div><span>Cimetière · ${me.graveyard.length}</span></div>
      <div class="hand">${hand}</div>
      <div class="pile deck" data-pile="deck0" title="Ta pioche (clique pour voir le contenu)">
        <div class="pilecard back">📚</div><span>Pioche · ${me.deck.length}</span></div>
    </div>
    ${modal ? modalHtml() : ""}
    ${over ? `<div class="overlay"><div><h2>${result}</h2><button data-act="again" class="primary">Rejouer</button> <button data-act="menu-deck">🃏 Deck-building</button></div></div>` : ""}
    ${menuHtml()}`;
}

function modalHtml(): string {
  const body = modal!.cards.length
    ? modal!.cards.map((c) => `<div class="handcard">${cardHtml(c)}</div>`).join("")
    : '<p class="muted">Vide.</p>';
  return `<div class="overlay modal" data-act="close"><div class="modalbox">
    <h3>${modal!.title} <small>(${modal!.cards.length})</small></h3><div class="gallery">${body}</div>
    <p class="muted">Clique n'importe où pour fermer.</p></div></div>`;
}

function openPile(pile: string): void {
  const side = Number(pile.slice(-1)) as 0 | 1;
  const p = game.players[side];
  if (pile.startsWith("grave")) {
    modal = {
      title: side === HUMAN ? "Ton cimetière" : "Cimetière adverse",
      cards: p.graveyard.slice().reverse(),
    };
  } else {
    // Contents only, sorted: the draw order stays hidden.
    modal = {
      title: "Ta pioche (ordre caché)",
      cards: p.deck.slice().sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
    };
  }
  render();
}

function clearPreview(): void {
  root.querySelectorAll(".target").forEach((el) => el.classList.remove("target"));
  const hint = root.querySelector<HTMLElement>("#hint");
  if (hint) hint.textContent = "";
}

/** Hovering an empty slot with a card selected shows who it would attack. */
function onHover(e: MouseEvent): void {
  clearPreview();
  if (selected === null || busy || game.current !== HUMAN || game.winner !== null) return;
  const slotEl = (e.target as HTMLElement).closest<HTMLElement>('.slot[data-side="0"]');
  if (!slotEl || slotEl.querySelector(".card")) return;
  const slot = Number(slotEl.dataset.slot);
  const def = game.players[HUMAN].hand[selected];
  if (!def || (def.kind && def.kind !== "creature")) return;
  const { targets, note } = previewTargets(game, HUMAN, slot, def);
  for (const t of targets) {
    const el =
      t.kind === "king"
        ? root.querySelector('.king[data-side="1"]')
        : root.querySelector(`.slot[data-side="1"][data-slot="${t.slot}"]`);
    el?.classList.add("target");
  }
  let who = "";
  if (targets.length === 1) {
    const t0 = targets[0];
    who = t0.kind === "king" ? "frappera le Roi adverse" : `frappera ${t0.kind === "building" ? t0.building.def.name : t0.unit.def.name}`;
  }
  const hint = root.querySelector<HTMLElement>("#hint");
  if (hint) hint.textContent = `🎯 ${def.name} : ${note ?? (who || "n'attaquera pas")} · ${def.keywords?.haste ? "agira dès ce tour" : "agira au prochain tour"}`;
}

// ---------------------------------------------------------------- interaction

function onClick(e: MouseEvent): void {
  const t = e.target as HTMLElement;
  const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
  if (act === "menu-bg" && t.classList.contains("overlay")) {
    menuOpen = false;
    return render();
  }
  if (act === "menu-resume") {
    menuOpen = false;
    return render();
  }
  if (act === "menu-deck") {
    screen = "deck";
    menuOpen = false;
    modal = null;
    return render();
  }
  if (act === "menu-duel") return duelBlockers().length ? undefined : newDuel();
  if (menuOpen) return;
  if (screen === "deck") {
    const r = deckbuilderClick(t);
    if (r === "duel") return newDuel();
    if (r === "render") {
      const keep = root.querySelector(".collection")?.scrollTop ?? 0;
      render();
      const col = root.querySelector(".collection");
      if (col) col.scrollTop = keep;
    }
    return;
  }
  if (act === "again") return newDuel();
  if (modal) {
    modal = null;
    return render();
  }
  const pile = t.closest<HTMLElement>("[data-pile]")?.dataset.pile;
  if (pile) return openPile(pile);
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
    ordering = null;
    return render();
  }
  if (ordering !== null) {
    // The player picked a Strategist and now clicks its target (any enemy card, building or the king); a click elsewhere cancels.
    const strat = me.board[ordering];
    const choice = strat ? pickChoice(t, orderTargets(game, HUMAN, strat)) : undefined;
    try {
      if (!strat || !choice || choice.side !== 1) throw new Error("cancel");
      giveOrder(game, ordering, choice);
      message = `🎯 ${strat.def.name} suivra cet ordre jusqu'à ce que la cible disparaisse.`;
    } catch {
      message = "Ordre annulé.";
    }
    ordering = null;
    return render();
  }
  const anySlot = t.closest<HTMLElement>(".slot");
  const kingEl = t.closest<HTMLElement>(".king");
  const picked = selected !== null ? me.hand[selected] : undefined;
  if (picked && picked.kind === "spell" && (anySlot || kingEl)) {
    // Spells are played on the board: on their target, or anywhere when they need none (avoids mis-clicks).
    const choice = pickChoice(t, spellTargets(game, HUMAN, picked));
    try {
      playCard(game, selected!, 0, choice);
      message = `${picked.name} est lancé${picked.spell?.target ? "" : " (effet immédiat)"}.`;
      selected = null;
    } catch (err) {
      const m = (err as Error).message;
      message = `⚠️ ${m === "Not enough energy" ? "Pas assez d'énergie." : "Cible invalide : clique sur une cible en surbrillance."}`;
    }
    return render();
  }
  const slotEl = t.closest<HTMLElement>('.slot[data-side="0"]');
  if (slotEl && selected === null) {
    // No card selected: clicking one of our Strategists lets the player choose its target.
    const strat = me.board[Number(slotEl.dataset.slot)];
    if (strat && strat.def.personality === "strategist") {
      ordering = Number(slotEl.dataset.slot);
      message = `🧠 Choisis la cible de ${strat.def.name} : une carte, un bâtiment ou le Roi adverse (surbrillance bleue).`;
      return render();
    }
  }
  if (slotEl && selected !== null) {
    try {
      const c = me.hand[selected];
      playCard(game, selected, Number(slotEl.dataset.slot));
      message = c.kind === "building" ? `${c.name} est posé : actif tout de suite.` : `${c.name} est posée. ${c.keywords?.haste ? "Elle agit dès ce tour (Célérité)." : "Elle agira au prochain tour."}`;
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
  ordering = null;
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
    message = game.players[HUMAN].fatigued ? "Pioche vide : −10 PV pour ton Roi ! À toi de jouer." : "À toi de jouer.";
  }
  busy = false;
  render();
}
