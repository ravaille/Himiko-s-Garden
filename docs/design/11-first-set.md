# Premier set de test (brouillon)

> Objectif : alimenter le deck-building ET couvrir **tous les déclencheurs** du moteur d'effets. Romain a laissé carte blanche.
> Stats sur le budget ≈ 20 points/énergie (les effets rogneront les stats à l'équilibrage). Statut : **brouillon de Claude**, rien n'est codé.
> Format de fiche : voir [08-effects-format.md](08-effects-format.md).

## Cartes (26)
| Carte | Type de carte | Race / types | Coût | ATK/PV | Perso. | Effet | Déclencheur couvert |
|---|---|---|---|---|---|---|---|
| Ashigaru | créature | Humain [samurai] | 1 | 10/10 | Brave | : | : |
| Familier | créature | Demon [demon] | 1 | 8/12 | Passif | Quand une carte est sacrifiée : +10 ATK permanent | sacrifice |
| Imp | créature | Demon [demon] | 1 | 10/10 | Brave | À la mort : piocher 1 | à la mort |
| Apprentie mage | créature | Humain [mage] | 1 | 8/12 | Passif | À chaque sort lancé : 5 dégâts au Roi ennemi | sort lancé |
| Ronin errant | créature | Humain [ronin] | 2 | 22/18 | Rancunier | +10 ATK par équipement porté ; +10 PV si ≤ 3 unités alliées | passif / scaling |
| Samouraï d'élite | créature | Humain [samurai] | 3 | 35/25 | Brave | Bushido (frappe en face seulement, +stats) | mot-clé |
| Oni éclair | créature | Oni [samurai] | 3 | 40/20 | Brave | Haste | mot-clé |
| Vampire | créature | Demon [vampire] | 4 | 35/45 | Brave | Vol de vie. Quand elle tue : jeton Chauve-souris | à l'attaque / tue |
| Garde oni (Lieutenant) | créature | Oni [guard] | 4 | 20/60 | Gardien | Quand attaquée : renvoie 10 % des dégâts | quand attaquée |
| Archimage (Lieutenant) | créature | Humain [mage] | 4 | 20/60 | Passif | À chaque sort lancé : piocher 1 | sort lancé |
| Daimyo (Colonel) | créature | Humain [daimyo] | 5 | 50/50 | Brave | Offrande ×2. À chaque tour : +5 ATK à tous vos [samurai] | à chaque tour |
| Seigneur démon (Colonel) | créature | Demon [demon] | 6 | 70/50 | Berserk | Quand votre Roi est touché : +10 ATK | Roi touché |
| Général Samouraï | créature | Humain [samurai] | 7 | 70/70 | Brave | Vos cartes comptent comme [samurai]/[oni] ; ils renvoient 10 % aux attaquants | passif deck |
| Général Démon (Général) | créature | Demon [demon] | 7 | 60/80 | Passif | Dans le deck : pioche vide → vous gagnez la partie | pioche à vide |
| Général Professeur | créature | Humain [tutor] | 7 | 30/90 | Passif | Début de tour : poser gratuitement une carte ≤ 3 (choix) | à la pose / choix |
| Élève | créature | Humain [student] | 3 | 30/30 | Brave | +10 ATK par autre [student] sur le terrain | scaling |
| Squelette (jeton) | jeton | Demon [skeleton] | : | 10/10 | Brave | : | jeton |
| Boule de feu | sort | : | 2 | : | : | 20 dégâts à la cible choisie | sort ciblé |
| Éclair en chaîne | sort | [mage] | 3 | : | : | 10 dégâts à tous les ennemis et bâtiments | sort de zone |
| Étude | sort | [mage] | 1 | : | : | Piocher 2 cartes | pioche |
| Katana béni | sort (équipement) | : | 1 | : | : | +10 ATK permanent à une unité alliée | équipement |
| Pacte de sang | sort | Demon | 1 | : | : | −20 PV à votre Roi : invoquer 2 Squelettes | pacte / jeton |
| Tour du mage | bâtiment | [mage] | 2 | 0/15 | : | À chaque sort lancé : +5 ATK à l'unité sur cette case | bâtiment / sort lancé |
| Crypte | bâtiment | Demon | 3 | 0/20 | : | Début de tour : invoque un Squelette sur une case libre | bâtiment-jeton |
| Torii | bâtiment | : | 2 | 0/20 | : | Quand cette case est attaquée : l'attaquant subit 10 | case attaquée |
| Boîte à thé | bâtiment | Tsukumogami | 2 | 0/10 | : | Si la case est vide au début du tour : devient une unité 20/20 | transformation |
| Lanterne hantée | créature | Yurei [spectral] | 2 | 10/10 | Passif | Ghostly. Quand le Roi allié est touché : +5 PV | Ghostly / Roi touché |

## Couverture des déclencheurs
À la pose (Professeur) · à chaque tour (Daimyo, Crypte) · à l'attaque (Vampire) · quand attaquée (Garde oni) · à la mort (Imp) · autre carte posée/morte *(à ajouter)* · sacrifice (Familier) · passif (Samouraï général) · Roi touché (Seigneur démon) · pioche (Étude, Général Démon) · case attaquée (Torii) · sort lancé (Apprentie, Archimage, Tour).

## Équilibrage
Les stats suivent le budget brut ; les effets les rogneront. Les gradés listés (1 Général x3 en test, 2 Colonels, 2 Lieutenants) ne forment pas un deck : ce sont des candidats.
