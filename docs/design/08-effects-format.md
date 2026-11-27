# Format des effets (brouillon à valider)

> Objectif : une carte = une **donnée** lisible ; un effet = **Déclencheur → Condition → Cible → Action(s) → Durée**.
> Statut : **brouillon de Claude**, fiches d'exemple à relire par Romain. Rien n'est codé.

## Sélecteurs de cible (proposition)
- **Cartes** : l'ennemi en face · tous les ennemis · tous les alliés · alliés adjacents · une carte au hasard · la plus forte / la plus faible · celle qui m'a touché · celle qui a été jouée · cible choisie à la pose (sorts).
- **Autres** : le Roi (allié / ennemi) · une case vide · un bâtiment · une carte du cimetière · une carte du deck / de la main.
- **Filtres** : par race, type, grade, coût (≤ / ≥), personnalité, mot-clé, présence d'équipement.

## Durées
Permanent (par défaut) · jusqu'à la fin du tour · tant que la source vit · N tours.

## Décisions de Romain (2026-11-27)
- Sélecteurs, durées et conditions ci-dessus : **suffisants pour l'instant**, on ajoute à la volée. Durée supplémentaire utile : « jusqu'à la prochaine attaque ».
- **Effets à échelle (scaling)** : oui (ex. +1 ATK par carte au cimetière, dégâts = nombre de bâtiments).
- **Choix du joueur** : uniquement pendant la **phase de pose** (hors combat), jamais en pleine résolution de combat. Pour **nerfer** un effet trop fort, la carte invoquée peut être tirée **au hasard** plutôt que choisie.

## Garde-fous
Résolution en chaîne sans limite de conception ; coupure technique à ≈ 200 effets par résolution.

## Fiches d'exemple
| Carte | Déclencheur | Condition | Cible | Action | Durée |
|---|---|---|---|---|---|
| **Démolisseur** (personnalité) | à chaque attaque | bâtiment ennemi ? | bâtiment (case vide) sinon unité sur le bâtiment ; sinon revanchard | attaque normale | : |
| **Général Démon** (instant, rare) | quand je pioche à vide | : (actif dès le deck) | : | je gagne la partie | : |
| **Général Démon** (dégâts) | quand je pioche à vide | : | Roi ennemi | −10 PV au lieu de moi | : |
| **Général Professeur** | début de mon tour | sur mon terrain | une carte de ma main, coût ≤ 3 | la poser gratuitement sur une case vide | : |
| **Général Samourai** | passif | : | mes cartes | comptent comme [samourai]/[oni] | tant que source vit |
| (idem) | quand j'ai été attaqué | je suis [oni]/[samourai] | l'attaquant | lui renvoie 10 % des dégâts | : |
| **Sort : Exécution** | à la pose du sort | : | 1 créature (choisie) | détruire | instantané |
| **Sort : Tempête** (zone) | à la pose | : | tous les ennemis + bâtiments | 3 dégâts | instantané |
| **Équipement : Lame bénie** (sort) | à la pose | : | 1 unité alliée (choisie) | +5 ATK permanent ; carte au cimetière | permanent |
| **Bâtiment : Autel** | début de mon tour | : | unité sur cette case | +2 PV | tant que le bâtiment vit |
| **Sort : Sceau** (invocation) | à la pose | une case libre existe | case libre | poser un bâtiment-jeton « Torii » (effet de case) ; échoue si plein | : |
| **Multihit perforant** | quand elle attaque | : | cible 1 puis cible suivante | frappe 2 fois ; excédent au-delà | : |
