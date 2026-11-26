# Déploiement (100 % gratuit)

Le jeu est un site statique : `npm run build` produit `dist/` (chemins relatifs, donc compatible avec tous les hébergeurs).

## Option A — GitHub Pages (automatique)
1. Pousser le repo sur GitHub (public = Pages gratuit).
2. Repo → Settings → Pages → Source : **GitHub Actions**.
3. Chaque push sur `main` lance [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) : tests → build → publication.
4. URL : `https://<utilisateur>.github.io/<repo>/`

## Option B — itch.io (recommandé pour la découverte et le partage)
Gratuit : itch.io ne prend de commission que si tu mets un prix (et tu peux la régler à 0 %).
1. `npm run build && npm run package:itch` → crée `himikos-garden-web.zip`.
2. itch.io → *Create new project* → Kind of project : **HTML** → uploader le zip → cocher *This file will be played in the browser*.
3. Régler la taille de l'iframe (ex. 1280×720) et activer le plein écran.
4. (Plus tard) automatiser avec [butler](https://itch.io/docs/butler/) : `butler push dist <user>/himikos-garden:html5`.

## Notes
- Garder le build léger (< 100 Mo, idéalement quelques Mo) pour un chargement rapide.
- Les assets doivent être référencés en chemin relatif.
