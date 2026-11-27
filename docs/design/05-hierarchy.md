# Hiérarchie : Roi, Général, Colonels, Lieutenants

> Statut : principes validés, effets à concevoir carte par carte.

## Le Roi = le joueur
- Le joueur est le **Roi**, avec son **propre total de PV** (ordre de grandeur : **100 à 250**). Les gradés sont ceux qui le protègent.
- Le Roi n'est **pas une carte** et n'occupe pas de case.

## L'état-major sur le terrain
- Le terrain a **7 cases = 1 Général + 2 Colonels + 4 Lieutenants** si le joueur pose tout son état-major.
- **Hors effets spéciaux, ce sont des cartes « normales »** (PV, Attaque, Coût, personnalité).
- Poser tout son état-major peut donner un avantage via des **effets dédiés** (synergies d'état-major).

## Portée des effets par grade
| Grade | Portée typique | Exemples (non fixés) |
|---|---|---|
| **Général** | Fondamentaux du jeu | Changer les conditions de victoire ; occuper plusieurs cases ; modifier les personnalités ; effet central sur le terrain |
| **Colonel** | Terrain et groupes | Cases à bonus ; auras locales à la pose ; affecter plusieurs catégories de cartes ; **offrande à 2 énergie** ; les plus rares : conditions de victoire cumulables |
| **Lieutenant** | Local, catégorie | Plus fort qu'une carte de base ; effet sur une catégorie (race / élément…) ; **ordres** : change la personnalité des seules cartes du terrain voisines/présentes avec lui (pas de tout le deck) |

## Si le grade n'est pas fixé sur la carte
Alternative explorée : le **passif** d'une carte s'étend selon son grade du moment :
- **Général** → s'étend au **deck**
- **Colonel** → s'étend à la **main et au terrain**
- **Lieutenant** → s'étend aux **cartes adjacentes**

## Désignation des gradés = deck-building
Le grade d'une carte est **désigné avant le duel**, pendant la construction du deck (7 gradés sur 30 cartes). Le prototype actuel ne peut pas le simuler : il faudra un écran de deck-building.
Effets de case : créés par les Colonels et Généraux (voir [07-keywords-and-effects.md](07-keywords-and-effects.md)).

## Décision en suspens : grade fixe ou libre ?
Pour l'instant : **toute carte peut avoir tout grade** (temporaire). Option 2 : gradés = catégorie de cartes à part. Le code doit rester agnostique : un champ « grades autorisés » par carte (par défaut : tous).

## Offrande
- **1 offrande par tour** par défaut.
- Exception : un Général dont l'effet unique est d'en autoriser une 2e, avec une **contrainte forte** (ex. aucune carte à coût élevé dans le deck).
- Un Colonel peut donner 2 énergie au lieu de 1 en offrande.
