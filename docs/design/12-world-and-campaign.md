# Monde et campagne (cadrage)

> Modèle de référence (Romain, 2026-11-27) : **Pokémon**. Ce qui est fait = (1) le **stockage** (collection + deck-building) et (2) les **duels**.
> Ce qui manque = **l'univers** : le monde, qui on affronte, où, pourquoi, et ce qu'on y gagne.
> Statut : **cadrage + overworld v0 codé (graphismes provisoires).** Les questions sont posées une par une avec Romain ; l'histoire et le monde sont **en cours de rédaction par Romain**.

## Ce que Pokémon nous apprend (grille de lecture)
| Pokémon | Himiko's Garden (à décider) |
|---|---|
| Écran titre, nouvelle partie, sauvegarde | À prévoir (sauvegarde locale ; plusieurs fichiers ?) |
| Carte du monde, villes, routes | Le monde réel moderne (cadre de la campagne) : quels lieux, quelle navigation ? |
| Dresseurs sur la route | Adversaires humains avec leurs decks (70 à 100 duels au total) |
| Arènes / champions / badges | Boss, grades, Généraux adverses ? |
| Rival | Rival récurrent |
| Capturer des Pokémon | Obtenir des cartes : récompenses, boutique, boosters |
| Argent | Monnaie de jeu (aucun argent réel) |
| Équipe de départ, PC de stockage | Mini-deck de départ, collection, 3 à 5 decks |
| Histoire / ligue / méchants | Histoire du monde réel + lien avec le monde d'Himiko (lore) |
| Niveaux et progression | Difficulté croissante des adversaires |

## Fonctionnalités à couvrir (liste de travail)
1. Écran titre, nouvelle partie / continuer, sauvegarde.
2. Monde explorable (forme à décider) et déplacement entre lieux.
3. Adversaires : decks, personnalités d'IA, difficulté croissante, dialogues.
4. Récompenses de victoire (cartes, monnaie) et progression de la collection.
5. Boutique / boosters.
6. Début de partie : mini-deck de départ (le mode « tout débloqué » reste pour le debug).
7. Multi-decks (3 à 5).
8. Narration : histoire principale, personnages, rival.
9. Tutoriel / première partie guidée.
10. Options (vitesse, son), mobile.

## Décisions de Romain (2026-11-27)
- **Monde** : un **personnage qu'on déplace**, comme dans Pokémon (case par case).
- **Obtenir des cartes** : **récompenses de victoire**, **boutique** payée uniquement avec l'**argent de l'univers fictif** (équivalent du « pokédollar »), **échanges**, **distributeur de boosters**. **Aucune carte cachée** dans le monde.
- **Début de partie** : le joueur **choisit un archétype parmi 5** et reçoit des cartes **faibles et communes**, avec **un Général** comme seul point fort. **Pour la démo** (avant les sets) : un deck aléatoire, celui de l'IA.
- **À rédiger par Romain** (en attente) : lieu de départ et premier compagnon/point de départ, but de l'histoire et place du monde d'Himiko, nature des adversaires (dresseurs, boss, rival).
- **Rythme** : pas pressé ; le travail d'écriture passe avant.

## Overworld v0 (placeholder, codé)
- **Déplacement** : flèches ou **ZQSD/WASD** (clavier français inclus) ; boutons à l'écran sur mobile. Marche case par case, animée ; arbres, eau, murs, personnages bloquent ; la caméra suit le joueur.
- **Parler / lire / utiliser** : Entrée, Espace ou E devant un personnage, un panneau, le PC… (bouton A sur mobile). Dialogues page par page.
- **Passages** : portes et sorties de carte changent de lieu (fondu rapide, nom du lieu affiché).
- **Dresseurs** : un dresseur non battu **voit** le joueur dans sa ligne de vue (distance propre à chaque dresseur, bloquée par les obstacles) : « ! », dialogue, puis **duel**. Battu, il ne défie plus et change de réplique. Perdre permet de le défier de nouveau. (Pas encore : le dresseur ne marche pas jusqu'au joueur.)
- **PC (à la maison)** : ouvre le **deck-building**, comme le PC de stockage de Pokémon. Échap ouvre un menu à tout moment (monde, deck-building, duel d'essai).
- **Boutique** et **distributeur de boosters** : présents mais **pas encore fonctionnels** (message d'attente).
- **Sauvegarde** locale automatique (lieu, position, dresseurs battus). Le deck est sauvegardé à part.
- **Decks des dresseurs** : 40 cartes tirées de la collection avec une graine propre à chaque dresseur (toujours le même deck).
- **Monde de test** : Hameau (maison, boutique, distributeur, panneau, habitant) + Route 1 (3 dresseurs). Noms, dialogues et plan sont **provisoires**.
- Données dans `src/data/world.ts`, règles dans `src/core/world.ts` (testées), affichage dans `src/ui/overworld.ts`.
