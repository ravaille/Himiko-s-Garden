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

## Ciblage par défaut
Un attaquant frappe, dans l'ordre : **1) la carte en face de lui** (même case), **2) une carte des 3 cases centrales** (centre d'abord, puis gauche, puis droite), **3) le Roi**.
Conséquence : les **4 cases extérieures** ne sont pas atteignables par défaut ; on peut y garder des cartes précieuses, au prix des PV du Roi (exposé si le centre et la case en face sont vides).
Exceptions : l'Assassin et certains effets.

**« Le plus fort » (le plus « beefy »)** : PV, puis Attaque, puis en face, puis centre, puis gauche → droite.

## Personnalités (comportement autonome)
Les personnalités qui « choisissent » une cible la prennent parmi les cibles atteignables (ci-dessus), sauf mention contraire.

| Personnalité | Comportement |
|---|---|
| **Brave** | Attaque la cible atteignable la plus forte (critère « beefy »). |
| **Lâche** | **Dernier survivant de son équipe** : ciblé en dernier par les ennemis (sur les bords, le Roi peut être ciblé avant lui). |
| **Gardien** | Tant qu'il est vivant, il est **prioritaire** sur les alliés des **cases adjacentes** (les attaques visant ces alliés le visent lui). |
| **Assassin** | Vise directement le Roi adverse. |
| **Rancunier** | Frappe celui qui l'a touché en dernier ; sinon se comporte comme **Défensif**. |
| **Berzerk** | Frappe un ennemi au hasard (tirage à graine). |
| **Fidèle** | Attaque la même cible qu'un allié ; sans allié ayant agi, il agit en **Rancunier** (passif/vengeur, il attend et se défend). |
| **Stratège** | Reçoit une consigne de cible du joueur en phase de pose, puis l'exécute seul. |
| **Défensif** | N'attaque que s'il est **sûr de tuer** sa cible ; sinon reste passif. |
| **Passif** | N'attaque pas (sauf effet d'une autre carte). |
| **Démolisseur** | Détruit les **bâtiments ennemis** : sur case vide d'abord, sinon la carte qui est dessus ; sans bâtiment, il riposte seulement. Les bâtiments ne sont jamais ciblés par l'automatique, sauf par lui et par le Berzerk (hasard sur tout). |

Pas de « Traître », pas de fuite, **pas de contre-attaque** pour l'instant.

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
- **Deck : 30 cartes (≈ 23 normales + 7 gradés, gradés compris dans le deck).** **Main de départ : 7** (on jette des cartes, via l'offrande). **Pioche : 1 par tour.**
- **L'énergie persiste** (mode « terrain ») : chaque offrande augmente l'énergie maximale de façon permanente ; elle se remplit à chaque tour.
- **Offrande :** sacrifier 1 carte = de l'énergie, **1 offrande par tour** par défaut. Des **cartes exceptionnelles** (ex. Colonel : 2 énergie) donnent plus. Une exception rare peut autoriser une 2e offrande, avec contrainte forte.

## Déploiement
- Une carte posée **agit au tour suivant** (temps de déploiement), **sauf si elle a un effet passif** qui s'applique tout de suite.

## Cartes : attributs annexes
Au-delà de PV / Attaque / Coût : race, type, élément, pouvoir, effets spéciaux (voir [02-cards.md](02-cards.md)).

## Structure d'un tour (validé)
- **Tours alternés** : pioche → phase de pose/offrande → les cartes du joueur actif agissent → fin de tour.
- **Plateau : 14 cases** (7 par joueur, face à face).
- Le **second joueur** a **+1 énergie temporaire** à son premier tour (équivaut à -1 sur le coût de la première carte). Simulation : 51 % / 49 % entre premier et second joueur.
- PVE : le joueur commence ; l'IA, sans besoin d'équité, est le second joueur.

## Pioche vide (validé)
Si un joueur doit piocher et ne le peut pas, **son Roi perd 10 PV** (pas de blocage sans vainqueur). Sauf contre-indication d'une carte.
**Aucune autre condition de victoire** de base (seuls les effets de Général peuvent en ajouter).

## À définir
- Règles des sorts et des bâtiments (quand, où, coût)
- La pioche du premier joueur au tout premier tour (provisoire : aucune)
- Effets de case (à concevoir)
- Fin de partie, égalité, limite de tours
- Exemple de tour commenté
