# Règles

> Source de vérité des règles. Le code de `src/core/` doit les refléter exactement.
> **Statut : principes validés. Les valeurs chiffrées ne sont pas décidées.**

## Principes validés
1. **Tour par tour, proche d'un TCG classique.**
2. **Points de vie** : le joueur est le **Roi** et a ses propres PV ; on perd quand ils tombent à 0 (sauf effet de Général).
3. **Général libre** : chaque joueur choisit sa carte maîtresse.
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

## Hiérarchie
Voir [05-hierarchy.md](05-hierarchy.md). Le **Roi = le joueur**, avec son total de PV (100 à 250). Les gradés (Général, 2 Colonels, 4 Lieutenants) occupent les 7 cases et sont des cartes normales hors effets spéciaux.

## Budget de stats (cible d'équilibrage de départ)
- **≈ 20 points de stats par énergie de coût : environ 10 Attaque + 10 PV.**
- Une carte à 5 énergie ≈ 50-60 Attaque / 50-60 PV, et tue vite.
- PV du Roi : 100 à 250.
*Valeurs de départ, à tester par simulation.*

## Deck, main, énergie
- **Deck : 30 cartes. Main de départ : 7** (on jette des cartes, via l'offrande). **Pioche : 1 par tour.**
- **Offrande :** sacrifier 1 carte = de l'énergie, **1 offrande par tour** par défaut. Des **cartes exceptionnelles** (ex. Colonel : 2 énergie) donnent plus. Une exception rare peut autoriser une 2e offrande, avec contrainte forte.

## Déploiement
- Une carte posée **agit au tour suivant** (temps de déploiement), **sauf si elle a un effet passif** qui s'applique tout de suite.

## Cartes : attributs annexes
Au-delà de PV / Attaque / Coût : race, type, élément, pouvoir, effets spéciaux (voir [02-cards.md](02-cards.md)).

## À définir
- **Persistance de l'énergie** (question clé, voir OPEN-QUESTIONS)
- Règle de ciblage par défaut (les cartes peuvent-elles frapper le Roi directement ?)
- Effets de case (à concevoir)
- Cas limites des personnalités (voir OPEN-QUESTIONS)
- Contre-attaque ou non, fin de partie, limite de tours
- Les gradés sont-ils dans les 30 cartes du deck ?
- Exemple de tour commenté
