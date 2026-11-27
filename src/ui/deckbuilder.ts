import { DECK_MAX, DECK_MIN, RANK_LIMIT, activeRule, autoFill, canAdd, maxCopies, validateDeck } from "../core/deckrules";
import type { CardDef, Rank } from "../core/types";
import { COLLECTION, cardById } from "../data/collection";
import { cardHtml } from "./card";
import { RACE, RANK } from "./labels";

/**
 * Deck-building screen (docs/design/10-deckbuilding.md). One deck for now (3-5 later).
 * Left: collection with filters, officers registry on top. Right: current deck + validation.
 */

const STORAGE_KEY = "himiko.deck.v1";

let deck: CardDef[] = loadDeck();
const filters = { race: "", type: "", cost: "", text: "" };
let notice = "";

function loadDeck(): CardDef[] {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return ids.map(cardById).filter((c): c is CardDef => !!c);
  } catch {
    return [];
  }
}

function saveDeck(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deck.map((c) => c.id)));
  } catch {
    /* storage unavailable: the deck simply won't persist */
  }
}

/** Replaces the deck (used to hand the player a ready-made deck at the very start). */
export function setDeck(cards: CardDef[]): void {
  deck = cards.slice();
  saveDeck();
}

/** The current deck (a copy). */
export function currentDeck(): CardDef[] {
  return deck.slice();
}

/** Problems that forbid starting a duel (empty = ready). No officer is fine; too few cards is not. */
export function duelBlockers(): string[] {
  return validateDeck(deck).map((i) => i.message);
}

const sortCards = (a: CardDef, b: CardDef) => a.cost - b.cost || a.name.localeCompare(b.name);

function matches(c: CardDef): boolean {
  if (filters.race && c.race !== filters.race) return false;
  if (filters.type && !c.types?.includes(filters.type)) return false;
  if (filters.cost && (filters.cost === "6" ? c.cost < 6 : c.cost !== Number(filters.cost))) return false;
  if (filters.text && !c.name.toLowerCase().includes(filters.text.toLowerCase())) return false;
  return true;
}

function count(id: string): number {
  return deck.filter((c) => c.id === id).length;
}

function collectionCard(c: CardDef): string {
  const check = canAdd(deck, c);
  const title = check.ok ? "Ajouter au deck" : check.reason;
  return `<div class="handcard dbcard${check.ok ? "" : " dim"}" data-add="${c.id}" title="${title}">${cardHtml(c)}<span class="copies">${count(c.id)}/${maxCopies(c.rank)}</span></div>`;
}

function section(title: string, cards: CardDef[]): string {
  if (!cards.length) return "";
  return `<h3>${title} <small>(${cards.length})</small></h3><div class="gallery dbgrid">${cards.map(collectionCard).join("")}</div>`;
}

function select(id: string, value: string, opts: [string, string][]): string {
  const options = opts.map(([v, l]) => `<option value="${v}"${v === value ? " selected" : ""}>${l}</option>`).join("");
  return `<select data-filter="${id}">${options}</select>`;
}

function collectionHtml(): string {
  const all = COLLECTION.filter(matches).sort(sortCards);
  const generals = all.filter((c) => c.rank === "general");
  const officers = all.filter((c) => c.rank === "colonel" || c.rank === "lieutenant");
  const normal = all.filter((c) => !c.rank);
  const races = [...new Set(COLLECTION.map((c) => c.race).filter(Boolean))] as (keyof typeof RACE)[];
  const types = [...new Set(COLLECTION.flatMap((c) => c.types ?? []))].sort();
  return `<div class="filters">
      <input data-filter="text" placeholder="Nom…" value="${filters.text}">
      ${select("race", filters.race, [["", "Toutes races"], ...races.map((r): [string, string] => [r, RACE[r]])])}
      ${select("type", filters.type, [["", "Tous types"], ...types.map((t): [string, string] => [t, `[${t}]`])])}
      ${select("cost", filters.cost, [["", "Tout coût"], ...[1, 2, 3, 4, 5].map((n): [string, string] => [String(n), `Coût ${n}`]), ["6", "Coût 6+"]])}
    </div>
    ${section("Registre des gradés : Généraux (1 par deck, contrainte possible)", generals)}
    ${section("Registre des gradés : Colonels et Lieutenants", officers)}
    ${section("Cartes", normal)}
    ${all.length ? "" : '<p class="muted">Aucune carte ne correspond.</p>'}`;
}

function deckRow(c: CardDef): string {
  const rk = c.rank ? ` <i class="rk rk-${c.rank}">${RANK[c.rank]}</i>` : "";
  return `<li data-remove="${c.id}" title="Retirer un exemplaire"><b class="c">${c.cost}</b> ${c.name}${rk}<span class="n">×${count(c.id)}</span></li>`;
}

function deckPanelHtml(): string {
  const issues = validateDeck(deck);
  const rule = activeRule(deck);
  const groups: Record<string, CardDef[]> = {};
  for (const c of deck) (groups[c.rank ?? "normal"] ??= []).push(c);
  const rows = (cards: CardDef[] | undefined) =>
    [...new Map((cards ?? []).map((c) => [c.id, c])).values()].sort(sortCards).map(deckRow).join("");
  const curve = [1, 2, 3, 4, 5, 6].map((n) => deck.filter((c) => (n === 6 ? c.cost >= 6 : c.cost === n)).length);
  const peak = Math.max(1, ...curve);
  const officerCount = (r: Rank) => `${deck.filter((c) => c.rank === r).length}/${RANK_LIMIT[r]}`;
  const ok = issues.length === 0;
  const officers = rows(groups.colonel) + rows(groups.lieutenant);
  return `<h2>Ton deck <small class="${ok ? "ok" : "bad"}">${deck.length} (${DECK_MIN}-${DECK_MAX})</small></h2>
    ${rule ? '<p class="rule">⚠️ Contrainte du Général active : seules les cartes compatibles peuvent être ajoutées.</p>' : ""}
    <div class="curve">${curve.map((n, i) => `<div><span style="height:${(40 * n) / peak}px"></span><em>${i + 1}${i === 5 ? "+" : ""}</em><u>${n}</u></div>`).join("")}</div>
    <p class="muted">Gradés : Général ${officerCount("general")} · Colonels ${officerCount("colonel")} · Lieutenants ${officerCount("lieutenant")}</p>
    <ul class="decklist">
      ${groups.general ? `<li class="head">Général</li>${rows(groups.general)}` : ""}
      ${officers ? `<li class="head">Gradés</li>${officers}` : ""}
      <li class="head">Cartes</li>${rows(groups.normal) || '<li class="muted">Clique sur des cartes pour les ajouter.</li>'}
    </ul>
    ${ok ? "" : `<ul class="issues">${issues.map((i) => `<li>${i.message}</li>`).join("")}</ul>`}
    ${notice ? `<p class="notice">${notice}</p>` : ""}
    <div class="actions">
      <button class="primary" data-act="duel" ${ok ? "" : "disabled"}>⚔ Lancer le duel</button>
      <button data-act="fill" title="Mode debug : complète avec des cartes légales au hasard">🎲 Compléter</button>
      <button data-act="clear">🗑 Vider</button>
    </div>`;
}

export function deckbuilderHtml(): string {
  return `<header><h1>Himiko's Garden <small>deck-building</small></h1><span><button data-act="menu-world">🗺️ Retour au monde</button> <span class="muted">Échap : menu</span></span></header>
    <div class="deckbuilder"><section class="collection">${collectionHtml()}</section><aside class="deckpanel">${deckPanelHtml()}</aside></div>`;
}

/** Handles a click inside the builder. Returns "duel" to start a duel, "render" when the view changed. */
export function deckbuilderClick(t: HTMLElement): "duel" | "render" | null {
  const add = t.closest<HTMLElement>("[data-add]")?.dataset.add;
  if (add) {
    const card = cardById(add)!;
    const check = canAdd(deck, card);
    notice = check.ok ? "" : check.reason;
    if (check.ok) deck.push(card);
    saveDeck();
    return "render";
  }
  const rem = t.closest<HTMLElement>("[data-remove]")?.dataset.remove;
  if (rem) {
    const i = deck.map((c) => c.id).lastIndexOf(rem);
    if (i >= 0) deck.splice(i, 1);
    notice = "";
    saveDeck();
    return "render";
  }
  const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
  if (act === "clear") {
    deck = [];
    notice = "";
    saveDeck();
    return "render";
  }
  if (act === "fill") {
    deck = autoFill(deck, COLLECTION, Math.random);
    notice = deck.length < DECK_MIN ? "Pas assez de cartes compatibles pour compléter." : "";
    saveDeck();
    return "render";
  }
  if (act === "duel") return duelBlockers().length === 0 ? "duel" : "render";
  return null;
}

/** Filter inputs. Returns true when the view must be re-rendered. */
export function deckbuilderFilter(el: HTMLInputElement | HTMLSelectElement): boolean {
  const key = el.dataset.filter as keyof typeof filters | undefined;
  if (!key) return false;
  filters[key] = el.value;
  return true;
}
