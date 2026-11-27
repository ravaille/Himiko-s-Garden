# Cartes

> Brouillon. Statut : principes validés, catalogue vide.

## Principes validés
- Cartes = **personnages** du monde d'Himiko, chacun avec une **personnalité** (voir [01-rules.md](01-rules.md)) qui pilote son comportement autonome.
- Toute carte peut être **sacrifiée** en offrande ; certaines, exceptionnelles, donnent plus d'énergie.
- Histoire annexe optionnelle par carte (lore).

## Stats de base
**PV, Attaque, Coût (énergie).** Budget de départ : ≈ 10 Attaque + 10 PV par énergie (voir [01-rules.md](01-rules.md)).

## Types de cartes
- **Créatures (personnages)** : ce qu'on a codé jusqu'ici.
- **Sorts** : effet ponctuel. *(règles de jeu à définir)*
- **Bâtiments** (pièges ?) : effet persistant ou déclenché. *(règles à définir)*

## Attributs annexes (par carte, optionnels)
- **Race** (liste v1, 2026-11-27) : **Humain · Henge · Yurei · Tsukumogami · Oni · Beast · Demon · Robot**. *(Remplace la liste de départ : Obake/Yokai ne sont plus listés ; Henge couvre les transformeurs.)*
- **Type / archétype** (remplace « élément ») : famille thématique pour bâtir des decks typés avec des **synergies** (bonus spéciaux aux types). Exemples : [Guerrier], [Chats], [Z-bots], [Viking], [Bêtes]. *Listes à compléter ensemble.* Pour l'instant : **uniquement des synergies**, pas de forces/faiblesses.
  - **Types de départ** : Samourai · Ninja · Daimyo · Elemental · … (liste ouverte). Les types sont **transversaux aux races** et liés aux **archétypes de deck** : prévoir **≈ 3 à 5 archétypes pour Humain et Demon**, **≈ 2 pour les autres races** (plus si idées). On ajoute un type quand une synergie l'exige. Exemple : le type **Élève** (toutes races, stats moyennes, coût 3, bonus quand ils sont ensemble ; synergie du Général Professeur).
- **Mots-clés et effets** : voir [07-keywords-and-effects.md](07-keywords-and-effects.md).
- **Texte de carte** : les cartes doivent avoir de la place pour décrire leur effet (zone de texte prévue dans le layout).

## Grade (Général / Colonel / Lieutenant)
- Voir [05-hierarchy.md](05-hierarchy.md). **Temporaire : toute carte peut avoir tout grade** (option 1) ; l'option 2 (catégorie à part) reste ouverte.
- Le grade est une donnée **distincte de la rareté**.

## Rareté
Commune, Rare, Épique, Légendaire, **Mythique** (niveau ultime). **Indépendante du grade.**

## Boosters
- 5 cartes par booster, **au moins 1 gradé garanti** (Général, Colonel ou Lieutenant).
- **Plusieurs types de booster** à concevoir : avec garantie de gradé, 100 % aléatoire, autres.
- Taux, pitié, prix en monnaie de jeu à définir.
- Aucun argent réel.

## Progression des cartes
Boosters (certain) ; fusion et/ou XP (possible) ; idle (optionnel, plus tard).

## Catalogue
| id | Nom | Grade | Rareté | Coût | ATK | PV | Personnalité | Effet |
|---|---|---|---|---|---|---|---|---|
