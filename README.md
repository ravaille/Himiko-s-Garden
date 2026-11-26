# Himiko's Garden 🌸

Jeu de cartes (TCG solo contre IA) jouable dans le navigateur. *(Concept, règles et univers : voir [docs/](docs/README.md).)*

## ▶️ Jouer

**👉 https://ravaille.github.io/Himiko-s-Garden/**

Ce lien est permanent et toujours à jour : à chaque mise à jour du jeu, il suffit de recharger la page.

## Démarrer

```bash
npm install
npm run dev        # serveur local avec rechargement à chaud
npm test           # tests de la logique de jeu
npm run build      # build de production dans dist/
```

## Publier (gratuit)

| Cible | Comment |
|---|---|
| **GitHub Pages** | Automatique à chaque push sur `main` (voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)) |
| **itch.io** | `npm run build && npm run package:itch`, puis upload du zip (type « HTML ») |

## Documentation

Tout est indexé dans [docs/README.md](docs/README.md). Les conventions de travail (pour humains et pour Claude) sont dans [CLAUDE.md](CLAUDE.md).
