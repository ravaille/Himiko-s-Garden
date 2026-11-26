# Himiko's Garden — guide pour Claude

Jeu de cartes web, créé par Romain (qui définit le design, Claude gère le gros de l'implémentation et de l'infra).
Langue de travail avec Romain : **français**. Code, identifiants et commits : **anglais**.

## Où trouver quoi
- `docs/README.md` — index de toute la documentation. **Lis-le en premier.**
- `docs/design/` — specs du jeu (source de vérité des règles). Voir `docs/design/00-vision.md`.
- `docs/ARCHITECTURE.md` — structure du code et choix techniques.
- `docs/DEPLOYMENT.md` — publication GitHub Pages / itch.io.
- `docs/decisions/` — ADR : une décision structurante = un fichier court daté.
- `docs/ROADMAP.md` — état d'avancement et prochaines étapes.

## Règles de travail
1. **Les specs priment.** Ne jamais inventer une règle de jeu : si `docs/design/` est muet, demander à Romain, puis documenter la réponse.
2. **Toute décision de design ou technique est écrite** (design/ ou decisions/) dans le même commit que le code concerné.
3. **Logique de jeu séparée de l'affichage** : `src/core/` ne touche jamais au DOM, est déterministe (RNG avec graine) et testée avec vitest. `src/ui/` ne contient aucune règle.
4. Les cartes sont des **données** (`src/data/`), pas du code.
5. Garder la doc à jour : si le code contredit un .md, corriger l'un des deux immédiatement.
6. Commits petits, messages en anglais (`feat:`, `fix:`, `docs:`, `chore:`).
7. Avant de conclure une tâche : `npm test` et `npm run build` doivent passer.

## Commandes
`npm run dev` · `npm test` · `npm run build` · `npm run package:itch`
