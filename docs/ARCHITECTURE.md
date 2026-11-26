# Architecture

## Stack
- **TypeScript + Vite** : build rapide, sortie 100 % statique (HTML/JS/CSS) → hébergeable gratuitement partout.
- **Vitest** : tests de la logique de jeu.
- Pas de framework de rendu pour l'instant. Le choix (DOM/CSS, canvas, Phaser, Svelte…) sera fait après les specs UI, via un ADR dans `decisions/`.
- Pas de backend : aucun coût d'hébergement. Si du multijoueur en ligne est voulu plus tard, à étudier (ADR).

## Structure
```
src/
  core/   Logique de jeu pure (règles, état, tours, IA). Aucun accès DOM. Déterministe (RNG à graine). Testée.
  data/   Définitions de cartes et constantes d'équilibrage (données, pas du code).
  ui/     Affichage et entrées utilisateur. Ne contient aucune règle.
  main.ts Point d'entrée.
public/   Assets statiques (images, sons) copiés tels quels.
docs/     Specs et décisions.
scripts/  Outils de build/packaging.
```

## Principes
1. `core` ← `data` ; `ui` → `core`. Jamais l'inverse.
2. L'état de jeu est sérialisable (JSON) : sauvegarde, replays et tests faciles.
3. Les actions du joueur sont des commandes explicites appliquées au `core` (pas de mutation depuis l'UI).
