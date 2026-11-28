/** Player options, saved apart from the game save (a new game keeps them). */

const KEY = "himiko.options.v1";

export interface Options {
  /** Master volume, 0..100. */
  volume: number;
  music: boolean;
  sfx: boolean;
  /** Duel animation speed: 1 normal, 2 fast. */
  speed: 1 | 2;
}

const DEFAULTS: Options = { volume: 60, music: true, sfx: true, speed: 1 };

function load(): Options {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Options>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export const options: Options = load();

export function saveOptions(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(options));
  } catch {
    /* storage unavailable */
  }
}

const listeners: (() => void)[] = [];
/** Called after an option changed (the audio follows the volume live). */
export const onOptionsChange = (fn: () => void): void => {
  listeners.push(fn);
};

export function optionsHtml(): string {
  return `<div class="overlay" data-act="options-bg"><div class="menu options">
    <h2>Options</h2>
    <label>Volume général <input type="range" min="0" max="100" value="${options.volume}" data-opt="volume"> <b>${options.volume}</b></label>
    <label><input type="checkbox" data-opt="music" ${options.music ? "checked" : ""}> Musique</label>
    <label><input type="checkbox" data-opt="sfx" ${options.sfx ? "checked" : ""}> Effets sonores</label>
    <label><input type="checkbox" data-opt="speed" ${options.speed === 2 ? "checked" : ""}> Duels rapides (animations ×2)</label>
    <div class="savebox"><b>Sauvegarde</b>
      <button data-act="save-export">⬇ Exporter</button>
      <button data-act="save-import">⬆ Importer</button>
      <input type="file" id="importfile" accept=".json,application/json" hidden>
    </div>
    <button data-act="options-close" class="primary">Fermer</button>
  </div></div>`;
}

/** An input of the options panel changed. Returns true when the panel must be redrawn. */
export function optionsInput(el: HTMLInputElement): boolean {
  const k = el.dataset.opt;
  if (!k) return false;
  if (k === "volume") options.volume = Number(el.value);
  else if (k === "music") options.music = el.checked;
  else if (k === "sfx") options.sfx = el.checked;
  else if (k === "speed") options.speed = el.checked ? 2 : 1;
  else return false;
  saveOptions();
  for (const fn of listeners) fn();
  return el.type === "range"; // only the slider's number needs redrawing
}
