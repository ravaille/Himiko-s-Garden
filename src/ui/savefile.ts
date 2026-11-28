/**
 * Save file: everything the game keeps in the browser ("himiko.*" keys) can be downloaded as one JSON file and loaded back,
 * to move to another browser or keep a backup.
 */

const PREFIX = "himiko.";
/** Set right before a reload to start a new game (survives clearing). */
export const NEW_GAME_FLAG = "himikoNewGame";

const keys = (): string[] => Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));

/** Is there any progress to lose? (story, world, decks) */
export const hasSave = (): boolean => localStorage.getItem("himiko.story.v1") !== null;

export function exportSave(): void {
  const data: Record<string, string> = {};
  for (const k of keys()) data[k] = localStorage.getItem(k) ?? "";
  const blob = new Blob([JSON.stringify({ game: "himikos-garden", version: 1, data }, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "himikos-garden-save.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Replaces the current save by the file's. Returns an error message, or null when done (the page then reloads). */
export async function importSave(file: File): Promise<string | null> {
  try {
    const json = JSON.parse(await file.text()) as { game?: string; data?: Record<string, string> };
    if (json.game !== "himikos-garden" || !json.data) return "Ce fichier n'est pas une sauvegarde de Himiko's Garden.";
    for (const k of keys()) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(json.data)) if (k.startsWith(PREFIX) && typeof v === "string") localStorage.setItem(k, v);
    location.reload();
    return null;
  } catch {
    return "Fichier illisible.";
  }
}

/** Erases the game save (options are kept) and reloads into a new game (intro included). */
export function startNewGame(): void {
  for (const k of keys()) if (k !== "himiko.options.v1") localStorage.removeItem(k);
  sessionStorage.setItem(NEW_GAME_FLAG, "1");
  history.replaceState(null, "", location.pathname + location.search);
  location.reload();
}
