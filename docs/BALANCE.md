# Équilibrage : résultats de simulation

Outil : `npm run sim -- <nb de duels>` (IA de base des deux côtés, decks aléatoires tirés du pool de test `src/data/cards.ts`).
**Les cartes du pool sont des placeholders**, et l'IA est volontairement simple : ce sont des tendances, pas des vérités.

## Simulation n°1 (2026-11-27, 3000 duels, Roi 150 PV)
| Mesure | Résultat | Lecture |
|---|---|---|
| Premier joueur | **65,8 %** de victoires | Avantage trop fort → compensation du second joueur à prévoir |
| Durée | moy. **7,7 manches**, médiane 7, p90 10 | ≈ 1,5 min estimées, **plus court** que la cible 2-5 min |
| Attaques par duel | ≈ 18 | Démarrage lent (énergie + délai de déploiement) |
| Nuls (limite de tours) | 0,1 % | Pas de blocage |
| Cartes | Les 2 Colonels (offrande x2) en tête : 54-55 % | L'offrande à 2 énergie est très forte |
| Cartes | Assassins chers (coût 5) en bas : 47,7 % | Frapper le Roi (150 PV) est lent face à des cartes qui tuent |

## Pistes (à décider avec Romain)
- Second joueur : pioche supplémentaire, 1ère offrande à 2, ou énergie +1.
- Durée : augmenter les PV du Roi (200-250) si l'on veut des duels plus longs.
- Offrande à 2 énergie : coût contrepartie (carte plus faible, etc.).
