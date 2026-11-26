# Déploiement (100 % gratuit)

Le jeu est un site statique : `npm run build` produit `dist/` (chemins relatifs, donc compatible avec tous les hébergeurs).

## Option A — GitHub Pages (automatique, **choix principal pour les tests entre amis**)
Repo : https://github.com/ravaille/Himiko-s-Garden
1. Repo public (Pages gratuit).
2. Repo → Settings → Pages → Source : **GitHub Actions** (à faire une seule fois).
3. Chaque push sur `main` lance [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) : tests → build → publication en ~1 min.
4. **Lien à partager aux amis (toujours à jour) :** https://ravaille.github.io/Himiko-s-Garden/
   Les amis rechargent la page pour avoir la dernière version, sans aucune manip de ta part.

## Option B — itch.io (recommandé pour la découverte et le partage)
Gratuit : itch.io ne prend de commission que si tu mets un prix (et tu peux la régler à 0 %).
1. `npm run build && npm run package:itch` → crée `himikos-garden-web.zip`.
2. itch.io → *Create new project* → Kind of project : **HTML** → uploader le zip → cocher *This file will be played in the browser*.
3. Régler la taille de l'iframe (ex. 1280×720) et activer le plein écran.
4. (Plus tard) automatiser avec [butler](https://itch.io/docs/butler/) : `butler push dist <user>/himikos-garden:html5`.

## Notes
- Garder le build léger (< 100 Mo, idéalement quelques Mo) pour un chargement rapide.
- Les assets doivent être référencés en chemin relatif.
