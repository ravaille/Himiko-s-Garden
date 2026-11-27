# Deck-building (spec v0)

> Le deck-building est le **cœur du jeu** (piliers : collection > synergies > spectacle). Statut : spec validée par Romain le 2026-11-27 ; **v0 codée** (écran `src/ui/deckbuilder.ts`, menu Échap, un deck en localStorage, bouton debug « Compléter »).

## Cycle de jeu
Lancement ou fin de duel → **menu / deck-building** → duel avec le deck construit → retour. L'adversaire garde un **deck de base fixe** (peu importe pour l'instant).

## Collection
- **Mode debug / premier jet : toute la collection est débloquée.**
- Plus tard (avec l'histoire) : mini-deck de départ, puis boosters.
- **Limite : 3 exemplaires par carte.**

## Règles de construction (validées 2026-11-27, codées dans `src/core/deckrules.ts`)
- Deck de **40 à 50 cartes**.
- **Copies** : 3 par carte normale, **2** par Colonel/Lieutenant, **1** pour un Général.
- **Gradés par deck** : 1 Général, 2 Colonels, 4 Lieutenants (maximum). Ils ne sont **pas obligatoires** (on peut jouer 40 pions). **Un seul Général par deck**, comme Commander.
- **Totalement libre** (races, types, archétypes), sauf **contrainte d'un Général** (ex. « que des Oni » : `deckRule` sur la carte, par races et/ou types).
- Les **gradés** sont des cartes avec leur grade de base, rangés dans un **registre à part en haut** de la collection.
- Lancer un duel exige un deck **légal** : assez de cartes (40 min), pas de dépassement. L'absence de gradé est autorisée.
- Les jetons ne sont pas dans la collection.

## Interface
- **Page simple** (pas de scène décorée pour l'instant). Accessible **à tout moment** par le menu **Échap** (« Deck-building »).
- Inspirée du deck-building de **Magic** ; les gradés ont une **catégorie / registre à part tout en haut** (style Commander) pour les retrouver facilement.
- Proposition : collection à gauche avec filtres (race, type, coût, rareté), deck à droite avec courbe d'énergie et décompte, bouton « Duel ».
- **Un seul deck** pour le premier jet ; prévoir **3 à 5 decks** nommés plus tard.
