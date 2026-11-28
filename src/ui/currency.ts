/**
 * The H-euro (Himiko's euro): an H whose two tilted crossbars echo the euro sign, so it is never mistaken for a real currency.
 * Inline SVG so it follows the text colour and size.
 */
export const H_EURO = `<svg class="heuro" viewBox="0 0 12 14" aria-label="H-euro" role="img"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 1.5V12.5M9 1.5V12.5"/><path d="M1 5.6L11 4.6M1 9.4L11 8.4"/></g></svg>`;

/** "250 <H>" as HTML. */
export const money = (n: number): string => `<span class="money">${n}${H_EURO}</span>`;
