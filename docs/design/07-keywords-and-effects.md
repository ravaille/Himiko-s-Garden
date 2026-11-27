# Mots-clés et effets de cartes

> Principe (Romain) : **tout ce qui fait qu'une carte fait plus que ses stats** est possible. On s'inspire des mots-clés de Magic.
> Légende : ✅ cité par Romain · 💡 proposition de Claude (à valider ou jeter).
> **Aucun de ces effets n'est encore codé.** Le moteur doit être extensible : un effet = une donnée + un déclencheur.

## Mots-clés (comportements récurrents)
| Mot-clé | Effet | Origine |
|---|---|---|
| **Haste (Célérité)** | Peut attaquer dès le tour où elle est posée (ignore le délai de déploiement). Exemple : un Assassin. | ✅ |
| **Bushido** | Ne frappe qu'en ligne (la carte en face), mais plus fort et plus résistant. | ✅ |
| **Ghostly (Spectral)** | Ne peut pas être ciblée par tout le monde (conditions à définir : ex. seulement par certains types/effets). | ✅ |
| **Multihit** | Frappe une fois de plus. | ✅ |
| Croissance | Devient plus forte à chaque tour. | ✅ (exemple d'effet) |
| Dernières paroles | À la mort : inflige des dégâts aux ennemis en face. | ✅ (exemple d'effet) |
| Vampirisme | Se soigne de sa force de frappe après chaque combat. | ✅ (exemple d'effet) |
| Perforant | Les dégâts en trop passent au Roi / à la carte derrière. | 💡 |
| Régénération | Récupère des PV chaque tour. | 💡 |
| Provocation | Doit être ciblée en premier (sauf Lâche / Assassin). | 💡 |
| Vol de vie du Roi / Soin du Roi | Soigne les PV du Roi. | 💡 |
| Offrande ×N | Donne N énergie quand sacrifiée (déjà en jeu). | ✅ |

## Déclencheurs d'effets (vocabulaire de design)
- À la pose · À chaque tour · Quand elle attaque · Quand elle est attaquée · À la mort · Quand une autre carte meurt / est posée · Quand une carte est sacrifiée · Passif permanent.

## Portée selon le grade
Voir [05-hierarchy.md](05-hierarchy.md) : le Général touche aux règles fondamentales, les Colonels au terrain et aux groupes, les Lieutenants au local.

## Effets de case
**Créés par les Colonels et les Généraux** (pas fixes sur le plateau).
Exemple de Romain : **+10/+10 pour toute unité posée sur la case centrale, mais son coût augmente de 1.**

## Questions ouvertes
- Ghostly : qui peut quand même la cibler ?
- Plafond du nombre de mots-clés par carte ?
- Les effets sont-ils écrits dans un langage de données commun (pour que Claude puisse créer des centaines de cartes sans coder à chaque fois) ? *Je recommande oui.*
