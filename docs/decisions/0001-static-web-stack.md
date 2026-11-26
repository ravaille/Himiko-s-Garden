# 0001 — Stack web statique TypeScript + Vite

- **Date :** 2026-11-26
- **Statut :** accepté

## Contexte
Jeu de cartes à partager sur le web sans frais d'hébergement.

## Décision
TypeScript + Vite + Vitest, sortie statique, aucun backend. Publication sur GitHub Pages (CI) et itch.io (zip HTML5).

## Conséquences
- Coût d'hébergement nul, déploiement simple.
- Pas de comptes/serveur : multijoueur en ligne et classements demanderaient une décision ultérieure.
- Moteur de rendu laissé ouvert jusqu'aux specs UI.
