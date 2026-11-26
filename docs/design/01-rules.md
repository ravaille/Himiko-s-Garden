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
| **Lâche** | Est le **dernier survivant de sa propre équipe** (les ennemis le ciblent en dernier). |
| **Gardien** | Protège l'allié le plus faible. |
| **Assassin** | Vise directement le général adverse. |
| **Rancunier** | Frappe celui qui l'a touché en dernier. |
| **Berzerk** | Frappe un ennemi au hasard. |
| **Fidèle** | Attaque la même cible qu'un allié. |
| **Stratège** | Peut recevoir un ordre du joueur (exception à l'autonomie). |
| **Défensif** | N'attaque que s'il est sûr de tuer sa cible ; sinon reste passif. |
| **Passif** | N'attaque pas (sauf effet d'une autre carte). |

*Pas de « Traître » (ne colle pas) ni de fuite (notion inexistante).*

## Terrain
- **Une seule ligne de 7 cases** par joueur. L'ordre d'action est de gauche à droite.
- Des **effets de case** sont possibles (ex. les 3 centrales pour les tanks, les extérieures moins ciblées). *Exemple seulement, rien de fixé.*

## Hiérarchie : Général, Colonels, Lieutenants
- Le joueur est un « shogun / roi ». Sa **carte maîtresse = le Général**. Elle a souvent un effet central sur le gameplay ou le terrain (sinon c'est une carte comme une autre).
- **1 Général, 2 Colonels** (effets forts), **4 Lieutenants** (effets marginaux).
- **TEMPORAIRE : n'importe quelle carte peut avoir n'importe quel grade.** On garde deux options ouvertes : (1) tout le monde peut être gradé, (2) les gradés sont une catégorie de cartes à part (plus simple à équilibrer). Décision plus tard, après tests.
- Hautement personnalisable : le système doit rester souple.

## Deck, main, énergie
- **Deck : 30 cartes. Main de départ : 7** (on jette des cartes, via l'offrande). **Pioche : 1 par tour.**
- **Offrande :** sacrifier 1 carte = de l'énergie. Des **cartes exceptionnelles** peuvent donner plus.

## Déploiement
- Une carte posée **agit au tour suivant** (temps de déploiement), **sauf si elle a un effet passif** qui s'applique tout de suite.

## Cartes : attributs annexes
Au-delà de PV / Attaque / Coût : race, type, élément, pouvoir, effets spéciaux (voir [02-cards.md](02-cards.md)).

## À définir
- Condition de victoire précise : PV du Général ? du joueur ? Le Général est-il sur le terrain (occupe-t-il une case) ou à part ?
- Où sont Colonels et Lieutenants : sur les 7 cases, ou dans des emplacements de commandement séparés ? Sont-ils dans les 30 cartes du deck ?
- Limite d'offrandes par tour, valeur de base d'une offrande
- Effets de case (à concevoir)
- Résolution des conflits de ciblage : Fidèle sans allié, Rancunier sans attaquant, deux Fidèles qui se suivent…
- Fin de partie, égalité, limite de tours
- Exemple de tour commenté
