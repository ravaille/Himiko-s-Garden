import type { CardDef } from "../core/types";
import { PERSONALITY, effectLines, keywordLabels } from "./labels";

/** Rules text shown on the card. Effects will plug in here; for now: the special offering value. */
function cardText(def: CardDef): string {
  const lines: string[] = [];
  const kws = keywordLabels(def.keywords);
  if (kws.length) lines.push(`<b>${kws.join(" · ")}</b>`);
  lines.push(...effectLines(def));
  if (def.text) lines.push(def.text);
  if ((def.offering ?? 1) > 1) lines.push(`Offrande : +${def.offering}⚡`);
  return lines.join(" ");
}

function spellHtml(def: CardDef): string {
  const text = cardText(def);
  const isEquip = def.spell?.target === "allyUnit" && def.spell.do.some((a) => a.kind === "buff");
  const label = isEquip ? "Équipement" : "Sort";
  return `<div class="card kind-spell has-text" title="${label} : se joue depuis la main, puis va au cimetière.">
    <div class="cost">${def.cost}</div>
    <div class="name">${def.name}</div>
    <div class="art">${isEquip ? "🗡️" : "✨"}</div>
    <div class="text">${text}</div>
    <div class="pers">${label}</div>
    <div class="stats"><span class="atk">${def.spell?.target ? "🎯 cible" : "🌀 libre"}</span></div>
  </div>`;
}

/**
 * Generic card layout (see docs/design/06-card-layout.md).
 * `hp` overrides the printed HP (damaged unit on the board).
 */
export function cardHtml(def: CardDef, hp: number = def.hp, attack: number = def.attack, maxHp: number = def.hp): string {
  if (def.kind === "spell") return spellHtml(def);
  const p = PERSONALITY[def.personality];
  const damaged = hp < maxHp ? " damaged" : "";
  const buffedAtk = attack > def.attack ? " buffed" : attack < def.attack ? " damaged" : "";
  const buffedHp = maxHp > def.hp && hp >= maxHp ? " buffed" : "";
  const rank = def.rank ? ` rank-${def.rank}` : "";
  const text = cardText(def);
  return `<div class="card pers-${def.personality}${rank}${text ? " has-text" : ""}" title="${p.label} : ${p.help}">
    <div class="cost">${def.cost}</div>
    <div class="name">${def.name}</div>
    <div class="art">${p.icon}</div>
    <div class="text">${text}</div>
    <div class="pers">${p.label}</div>
    <div class="stats"><span class="atk${buffedAtk}">⚔ ${attack}</span><span class="hp${damaged}${buffedHp}">♥ ${hp}</span></div>
  </div>`;
}
