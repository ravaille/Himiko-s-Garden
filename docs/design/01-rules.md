# Règles

> Source de vérité des règles. Le code de `src/core/` doit les refléter exactement.
> **Statut : principes validés. Les valeurs chiffrées ne sont pas décidées.**

## Principes validés
1. **Tour par tour, proche d'un TCG classique.**
2. **Points de vie** pour chaque joueur.
3. **Général libre :** chaque joueur choisit la carte qui fait office de « roi » / chef.
4. **Cartes autonomes :** une fois posée, une carte joue seule son tour selon sa **personnalité** (sauf indication contraire sur la carte). Le joueur **pose ses cartes puis regarde le combat** (aucune intervention directe).
5. **Cycle d'un tour :** phase de pose → les cartes agissent → fin du tour → nouvelle phase de pose → etc.
6. **Ordre d'action :** de gauche à droite, avec animation par action pour la lisibilité (sauf indication contraire).
7. **Énergie à la Magic, sans terrains :** on **sacrifie une carte en offrande** pour obtenir de l'énergie. Chaque carte = jouer ou sacrifier.
8. **Duel court :** 2 à 5 minutes.
9. **Aucune notion de camp** dans les règles : le deck de l'adversaire peut contenir n'importe quoi.

## Personnalités (comportement autonome)
Liste de départ validée. Une carte a une personnalité ; l'IA de combat de la carte en découle.

| Personnalité | Comportement |
|---|---|
| **Brave** | Attaque l'ennemi le plus fort. |
| **Lâche** | Est le **dernier à être attaqué** (les ennemis le ciblent en dernier). *(formulation à confirmer)* |
| **Gardien** | Protège l'allié le plus faible. |
| **Assassin** | Vise directement le général adverse. |
| **Rancunier** | Frappe celui qui l'a touché en dernier. |
| **Berzerk** | Frappe un ennemi au hasard. |
| **Fidèle** | Attaque la même cible qu'un allié. |
| **Stratège** | Peut recevoir un ordre du joueur (exception à l'autonomie). |
| **Défensif** | N'attaque que s'il est sûr de tuer sa cible ; sinon reste passif. |
| **Passif** | N'attaque pas (sauf effet d'une autre carte). |

*Pas de « Traître » (ne colle pas) ni de fuite (notion inexistante).*

## À définir
- Condition de victoire précise (PV du général ? PV séparés ?)
- Taille du deck, main de départ, pioche
- Valeur d'énergie d'une offrande (fixe ? selon la carte ? limite par tour ?)
- Emplacements de pose (nombre de cases, notion de lignes avant/arrière ?)
- Stats d'une carte (attaque, PV, autre ?)
- Mal d'invocation (une carte agit-elle dès le tour de pose ?)
- Résolution des conflits de ciblage, ex. Fidèle sans allié, Rancunier sans attaquant
- Fin de partie, égalité, limite de tours
- Exemple de tour commenté
