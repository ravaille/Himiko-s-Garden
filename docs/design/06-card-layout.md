# Carte générique : anatomie (v0)

Implémentation : [src/ui/card.ts](../../src/ui/card.ts) · aperçu : ajouter `#gallery` à l'URL du jeu.

```
┌─────────────────┐
│ ③  Nom de carte │  ← coût en énergie (pastille), nom
│                 │
│      [ART]      │  ← illustration (icône de personnalité en attendant l'art libre de droits)
│                 │
│   Personnalité  │  ← comportement autonome
│ ⚔ ATK     ♥ PV  │  ← stats (les PV baissent sur le terrain)
└─────────────────┘
```

| Élément | Donnée | Notes |
|---|---|---|
| Coût | `cost` | pastille bleue, en haut à gauche |
| Nom | `name` | |
| Art | (à venir) | emoji de personnalité pour le prototype |
| Personnalité | `personality` | survol = description du comportement |
| ATK / PV | `attack`, `hp` | PV en rouge si la carte est blessée |
| Grade | `rank` | bordure : doré = Général, violet = Colonel, bronze = Lieutenant |

## À ajouter quand les détails seront décidés
Rareté (indicateur), race / type / élément (pictos), texte d'effet, texte d'ambiance, marqueur d'offrande spéciale (ex. « ×2 »).
