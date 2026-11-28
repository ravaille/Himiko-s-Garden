# Standard graphique (décidé par Romain)

Référence : **Katana ZERO** — pixel art détaillé, éclairage marqué, formes toujours lisibles. On vise ce niveau de définition **dès maintenant** pour ne pas tout refaire plus tard. Sans copier sa patte.

## Règles
- **Résolution native des scènes : 384×216**, affichée agrandie **sans lissage** (`image-rendering: pixelated`).
- Contours sombres de 1 px, ombrage par **tramage** (dither) et aplats en bandes, lumières colorées (lune, lanternes, télé).
- Vues **de côté** pour les scènes narratives et cinématiques.
- Un décor/une scène peut être remplacé par une **image PNG 384×216** déposée dans `public/art/<scene>.png` (scènes de la cinématique : `legend`, `arena`, `tv`, `room`) : elle prend la place du dessin généré par le code.

## Honnêteté technique
Le pixel art actuel est **dessiné par le code** (formes, contours, tramage) : il suit le standard (résolution, style) mais n'atteint pas la finesse d'un artiste. Pour la qualité finale : images faites à la main/outil (Aseprite…) à ce format, déposées dans `public/art/`.

## À définir plus tard
Sprites de personnages (taille, animations de marche) pour l'overworld, portraits de dialogue, style des cartes et du plateau de duel.
