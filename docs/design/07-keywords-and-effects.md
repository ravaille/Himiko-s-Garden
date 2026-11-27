# Mots-clés et effets de cartes

> Principe (Romain) : **tout ce qui fait qu'une carte fait plus que ses stats** est possible. On s'inspire des mots-clés de Magic.
> Légende : ✅ cité par Romain · 💡 proposition de Claude (à valider ou jeter).
> **Aucun de ces effets n'est encore codé.** Le moteur doit être extensible : un effet = une donnée + un déclencheur.

## Mots-clés (comportements récurrents)
| Mot-clé | Effet | Origine |
|---|---|---|
| **Haste (Célérité)** | Peut attaquer dès le tour où elle est posée (ignore le délai de déploiement). Exemple : un Assassin. | ✅ |
| **Bushido** | Ne frappe qu'en ligne (la carte en face), mais plus fort et plus résistant. | ✅ |
| **Ghostly (Spectral)** | Ne peut être ciblée que par d'autres Ghostly et par les sorts. Contrepartie : très peu de PV et d'ATK. | ✅ |
| **Multihit** | Frappe une fois de plus. | ✅ |
| Croissance | Devient plus forte à chaque tour. | ✅ (exemple d'effet) |
| Dernières paroles | À la mort : inflige des dégâts aux ennemis en face. | ✅ (exemple d'effet) |
| Vampirisme | Se soigne de sa force de frappe après chaque combat. | ✅ (exemple d'effet) |
| Perforant | Les dégâts en trop passent au Roi / à la carte derrière. | ✅ validé |
| Régénération | Récupère des PV chaque tour. | ✅ validé |
| ~~Provocation~~ | Écartée pour la v1 (peut revenir). | ❌ |
| Vol de vie du Roi / Soin du Roi | Soigne les PV du Roi. | ✅ validé |
| Offrande ×N | Donne N énergie quand sacrifiée (déjà en jeu). | ✅ |

## Déclencheurs d'effets (vocabulaire de design)
- À la pose · À chaque tour · Quand elle attaque · Quand elle est attaquée · À la mort · Quand une autre carte meurt / est posée · Quand une carte est sacrifiée · Passif permanent · **Quand le Roi est touché** · **Quand on pioche** · **Quand on attaque une case précise**.

## Portée selon le grade
Voir [05-hierarchy.md](05-hierarchy.md) : le Général touche aux règles fondamentales, les Colonels au terrain et aux groupes, les Lieutenants au local.

## Effets de case
**Créés par les Colonels et les Généraux** (pas fixes sur le plateau).
Exemple de Romain : **+10/+10 pour toute unité posée sur la case centrale, mais son coût augmente de 1.**

## Questions ouvertes
- Ghostly : qui peut quand même la cibler ?
- Plafond du nombre de mots-clés par carte ?
- Les effets sont-ils écrits dans un langage de données commun (pour que Claude puisse créer des centaines de cartes sans coder à chaque fois) ? *Je recommande oui.*

## Décisions (session du 2026-11-27)
- **Complexité des cartes : libre, façon Magic** → moteur d'effets en données (déclencheur + condition + cible + action).
- **Types de carte** : créature, **sort instantané**, **bâtiment/structure**, **équipement/aura**. (Pas de piège pour l'instant.)
- **Tout est automatique** pendant le duel (le joueur pose puis regarde). Seule exception à gérer : les **consignes du Stratège**.
- **Ressources manipulables par les effets** : énergie, jetons (invocations), pioche/main/deck, cimetière.
- **Puissance liée au grade** : un effet très fort est réservé à un haut gradé, ou conditionné à l'être.
- Priorités de design : 1) collection/progression, 2) combos/synergies, 3) spectacle. Le deck-building (1+2) est le cœur ; le placement en découle.
- **Équipement/aura** : s'attache à **une carte**.
- **Bâtiment** : s'attache à **une case** (« équipement de la case »). Il occupe la case **sans empêcher** d'y poser une unité. Peu de PV, mais difficile à cibler en premier ; ne peut être détruit que par des cartes/sorts **dédiés**.
- **Sorts** : joués depuis la main, ne vont jamais sur le plateau. Exemples : tuer une créature, piocher, renforcer les troupes.
- **Stratège** : pendant son tour, le joueur clique sur la carte Stratège puis choisit la **cible** (tout est ciblable : Roi, carte, bâtiment). Seuls les **Gardiens** dévient ensuite l'attaque de cette cible.
- **Plafond de mots-clés** : aucun a priori ; l'équilibre vient des contreparties, à régler au cas par cas.

## Décisions (suite, 2026-11-27)
- **Modifications de stats : permanentes par défaut.** La liste d'actions reste **ouverte** (dégâts/soin, ATK/PV/coût, énergie, pioche/défausse/recherche, jeton, détruire/bannir/renvoyer, réanimer, déplacer/échanger, changer la personnalité, donner/retirer un mot-clé, et tout ce qui viendra).
- **Sorts** : coûtent de l'énergie, **pas de limite par tour**.
- **Bâtiments** : posés **chez soi uniquement**, coûtent de l'énergie. Jamais ciblés par l'automatique, sauf Démolisseur (si la case est vide) et Berzerk. Seuls des cartes/sorts dédiés peuvent aussi les détruire.
- **Équipements** : sont des **sorts de buff** sur une unité ; vont au cimetière dès l'utilisation ; une unité peut en cumuler plusieurs.
- **Jetons** : occupent une case libre ; si le terrain est plein l'invocation échoue (et rien ne va au cimetière) ; un jeton qui meurt va au cimetière.

## Échelle de puissance des Généraux (exemples de Romain)
1. **Général Démon** *(changement de règle du duel)* : si votre pioche est vide, vous **gagnez** au lieu de perdre 10 PV (ou l'adversaire perd 10 PV à votre place).
2. **Général Samourai** *(change tout le deck)* : toutes vos cartes comptent comme [samourai] ou [oni] ; les [oni] et [samourai] renvoient 10 % de leurs dégâts aux attaquants.
3. **Général Professeur** *(excessivement fort à la pose, rien d'autre)* : tant qu'il est sur votre terrain, à chaque tour, choisissez une carte coûtant ≤ 3 et posez-la gratuitement sur une case vide.

## Décisions (suite 2, 2026-11-27) : bâtiments, ciblage, sorts
- **Démolisseur** : s'il y a un bâtiment ennemi, il le cible ; sinon il est **revanchard** (n'attaque que s'il a été agressé en premier). *À clarifier : le texte de Romain parlait de « la personne sur le bâtiment », voir OPEN-QUESTIONS.*
- Un bâtiment sur une case **occupée** est intouchable tant que l'unité vit ; il redevient ciblable à sa mort.
- **Gardien** : protège aussi les bâtiments adjacents. **Stratège** : peut viser un bâtiment, même sur case occupée.
- **Perforant** : l'excédent passe aussi au-delà d'un bâtiment. **Multihit** : frappe la même cible les 2 fois ; si elle meurt au 1er coup, le 2e va à la cible suivante de la liste ; liste vide → le Roi.
- **Un seul bâtiment par case.** Les **sorts de zone touchent les bâtiments.** Un bâtiment peut mourir **avant** le Lâche.
- **Sorts ciblés** : le joueur choisit la cible **à la pose**, la résolution est **instantanée**, puis la cible n'est plus liée au sort.
- **Général Démon** : actif **dès qu'il est dans le deck** (pas besoin d'être sur le terrain). Si les deux en ont un : le premier qui vide son deck gagne, ou inflige les dégâts à l'autre *(à trancher)*.
- **Bâtiments et sorts comptent dans le deck** ; le total passera peut-être de 30 à **40** (à tester).
- **Bâtiment posé : actif immédiatement.**
- **Effets de case = bâtiments** posés par un effet, qui agissent comme des **jetons** (invocation, hors deck).

## Décisions (suite 3, 2026-11-27)
- **Démolisseur (précisé)** : bâtiment sur case vide → il le détruit ; bâtiment sur case occupée → il attaque **l'unité dessus** pour vider la case ; sans bâtiment ennemi → revanchard.
- **Deux Démons** : deux versions à deux raretés : *instantanée* (le premier qui vide son deck **gagne**) et *dégâts* (inflige des PV à l'autre). La version instantanée est tenable car les parties sont rapides (deck de 30 ou 40).
- **Pioche vide avec Démon** : s'applique à **chaque pioche ratée**.
- **Chaînes d'effets** : pas de limite de conception ; **garde-fou technique ≈ 200 effets** par résolution (au-delà = boucle infinie, on coupe).
