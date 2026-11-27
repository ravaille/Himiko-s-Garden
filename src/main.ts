import "./ui/style.css";
import { TEST_POOL } from "./data/cards";
import { cardHtml } from "./ui/card";
import { startGame } from "./ui/app";

const app = document.querySelector<HTMLDivElement>("#app")!;

if (location.hash === "#gallery") {
  // Card gallery: all test cards, for checking the generic card layout.
  app.innerHTML = `<h1>Galerie des cartes (test)</h1><div class="gallery">${TEST_POOL.map(
    (c) => `<div class="handcard">${cardHtml(c)}</div>`,
  ).join("")}</div>`;
} else {
  startGame(app);
}
